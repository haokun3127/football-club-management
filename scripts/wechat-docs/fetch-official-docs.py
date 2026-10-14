#!/usr/bin/env python3
"""抓取微信开放文档（腾讯官方）正文并落盘。

用法:
    python3 scripts/wechat-docs/fetch-official-docs.py            # 全部抓取
    python3 scripts/wechat-docs/fetch-official-docs.py --only slug1,slug2

行为:
    - 读 scripts/wechat-docs/sources.json
    - 以浏览器 UA + Referer 抓取（行为协议模块 1：真实 UA、随机间隔、Session 复用、指数退避）
    - 从 HTML 中提取 <div id="docContent"> （服务端已渲染正文），转 Markdown 落盘
    - 原始 HTML 落到 _raw-html/<slug>.html（本地留证，git 忽略）
    - 生成 manifest.json：url / http / bytes / sha256 / title / 抓取时间，可核对可溯源

输出目录: docs/reference/wechat-miniprogram/
"""

from __future__ import annotations

import argparse
import hashlib
import html as html_mod
import json
import random
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "scripts" / "wechat-docs" / "sources.json"
OUT_DIR = ROOT / "docs" / "reference" / "wechat-miniprogram"
RAW_DIR = OUT_DIR / "_raw-html"
DOC_DIR = OUT_DIR / "pages"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extract_doc_content(html: str) -> str:
    """提取 <div id="docContent"> 的完整内部 HTML（按 div 配平）。"""
    start = html.find('<div id="docContent"')
    if start == -1:
        return ""
    body_start = html.find(">", start) + 1
    depth = 1
    i = body_start
    open_re = re.compile(r"<div\b", re.I)
    close_re = re.compile(r"</div>", re.I)
    while depth > 0 and i < len(html):
        nxt_open = open_re.search(html, i)
        nxt_close = close_re.search(html, i)
        if nxt_close is None:
            break
        if nxt_open is not None and nxt_open.start() < nxt_close.start():
            depth += 1
            i = nxt_open.end()
        else:
            depth -= 1
            if depth == 0:
                return html[body_start : nxt_close.start()]
            i = nxt_close.end()
    return ""


def normalize_url(value: str, page_url: str) -> str:
    value = html_mod.unescape(value)
    if value.startswith(("http://", "https://", "mailto:", "#", "javascript:")):
        return value
    return urljoin(page_url, value)


def clean_fragment(fragment: str, page_url: str) -> str:
    """去掉页面壳子（面包屑/翻译提示/锚点#）、规范化表格、把相对链接补成绝对链接。

    规范化表格的目的：官方 API 文档的表格带 class/colgroup/style，pandoc 遇到这些会
    放弃转换、原样输出 HTML；去掉这些属性后可以还原成 GFM 管道表格（渲染更稳）。
    """
    fragment = re.sub(r'<div class="Breadcrumb">[\s\S]*?</div>', "", fragment)
    fragment = re.sub(r'<div class="fixed-translate"[\s\S]*$', "", fragment)
    fragment = re.sub(
        r'<a\s+[^>]*href="#[^"]*"[^>]*>\s*(?:<[^>]+>)*\s*#\s*(?:<[^>]+>)*\s*</a>\s*', "", fragment
    )
    fragment = re.sub(r"<colgroup[\s\S]*?</colgroup>", "", fragment, flags=re.I)
    # <br> 会让 GFM 无法表达单元格内的换行，pandoc 就会整体退回裸 HTML 表格 → 提前换成换行
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    fragment = re.sub(
        r"<(/?)(table|tr|td|th|thead|tbody|caption)(\s[^>]*)?>",
        r"<\1\2>",
        fragment,
        flags=re.I,
    )
    fragment = re.sub(
        r'(href|src)="([^"]+)"',
        lambda m: f'{m.group(1)}="{normalize_url(m.group(2), page_url)}"',
        fragment,
    )
    return fragment


INLINE_ANCHOR = re.compile(r'<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', re.I)
STRIP_TAGS = re.compile(
    r"</?(?:span|view|button|col|colgroup|center|font|div|o:p)\b[^>]*>", re.I
)


def _demote_anchors(seg: str) -> str:
    """把没被 pandoc 转掉的裸 <a> 变成 Markdown 链接；站内锚点只留文字。"""

    def repl(m):
        url = m.group(1).strip()
        text = re.sub(r"<[^>]+>", "", m.group(2))
        text = html_mod.unescape(text).strip()
        if not text:
            return ""
        if url.startswith("#") or not url:
            return text
        return f"[{text}]({url})"

    prev = None
    while prev != seg:  # 嵌套 <a> 逐层收敛
        prev = seg
        seg = INLINE_ANCHOR.sub(repl, seg)
    return seg


def demote_html(md: str) -> str:
    """pandoc 有时会把带 data-v 属性/内联样式的节点原样输出成 HTML：转链接、去壳标签。

    代码块内的内容与裸 <table> 块（Obsidian 能直接渲染）保持原样，避免破坏表格结构。
    """
    parts = re.split(r"(^```[\s\S]*?^```\s*$)", md, flags=re.M)
    out = []
    for part in parts:
        if part.startswith("```"):
            out.append(part)
            continue
        for seg in re.split(r"(<table[\s\S]*?</table>)", part, flags=re.I):
            if seg.lower().startswith("<table"):
                out.append(seg)
                continue
            seg = _demote_anchors(seg)
            seg = re.sub(r"<br\s*/?>", "\n", seg, flags=re.I)
            seg = STRIP_TAGS.sub("", seg)
            out.append(seg)
    return "".join(out)


def to_markdown(fragment: str) -> str:
    proc = subprocess.run(
        ["pandoc", "-f", "html", "-t", "gfm", "--wrap=none"],
        input=fragment,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"pandoc failed: {proc.stderr[:400]}")
    md = demote_html(proc.stdout)
    md = "\n".join(
        line for line in md.splitlines() if not re.fullmatch(r"\s*</?div[^>]*>\s*", line)
    )
    md = re.sub(r"\n{4,}", "\n\n\n", md)
    md = re.sub(r"[ \t]+\n", "\n", md)
    return md.strip() + "\n"


def page_title(html: str) -> str:
    m = re.search(r"<title>(.*?)</title>", html, re.S)
    return html_mod.unescape(m.group(1)).strip() if m else ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="逗号分隔的 slug 白名单")
    ap.add_argument("--reuse-raw", action="store_true", help="复用 _raw-html/<slug>.html，不重新联网")
    ap.add_argument("--min-delay", type=float, default=1.0)
    ap.add_argument("--max-delay", type=float, default=2.5)
    args = ap.parse_args()

    spec = json.loads(SOURCES.read_text(encoding="utf-8"))
    only = {s for s in args.only.split(",") if s}
    sources = [s for s in spec["sources"] if not only or s["slug"] in only]

    DOC_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    sess = requests.Session()
    sess.headers.update(
        {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Connection": "keep-alive",
        }
    )

    manifest: dict = {
        "retrievedOn": time.strftime("%Y-%m-%d"),
        "retrievedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source": "微信开放文档 developers.weixin.qq.com（腾讯官方）",
        "method": "只读 HTTP GET；浏览器 UA；正文取自服务端渲染的 #docContent；HTML→GFM 由 pandoc 转换",
        "entries": [],
    }

    failures = []
    for src in sources:
        slug, url = src["slug"], src["url"]
        entry = {"slug": slug, "topic": src["topic"], "url": url}
        cached = RAW_DIR / f"{slug}.html"
        try:
            resp = None
            if args.reuse_raw and cached.exists():
                raw = cached.read_bytes()
                text = raw.decode("utf-8", errors="replace")
                entry.update(
                    {
                        "http": 200,
                        "bytes": len(raw),
                        "sha256": sha256(raw),
                        "title": page_title(text),
                        "finalUrl": url,
                        "source": "reused-local-raw-html",
                    }
                )
            else:
                for attempt in range(4):
                    try:
                        resp = sess.get(url, timeout=30, headers={"Referer": "https://developers.weixin.qq.com/doc/"})
                        if resp.status_code == 200:
                            break
                    except requests.RequestException as exc:  # 指数退避
                        entry.setdefault("retries", []).append(f"attempt{attempt + 1}: {type(exc).__name__}")
                    time.sleep(min(2 ** attempt, 60) * 0.5)
                if resp is None or resp.status_code != 200:
                    failures.append((slug, url, getattr(resp, "status_code", "ERR")))
                    entry["error"] = f"http={getattr(resp, 'status_code', 'ERR')}"
                    manifest["entries"].append(entry)
                    continue

                raw = resp.content
                text = resp.text
                entry.update(
                    {
                        "http": resp.status_code,
                        "bytes": len(raw),
                        "sha256": sha256(raw),
                        "title": page_title(text),
                        "finalUrl": str(resp.url),
                    }
                )
                (RAW_DIR / f"{slug}.html").write_bytes(raw)

            fragment = extract_doc_content(text)
            if not fragment:
                entry["error"] = "docContent 未找到（页面结构可能变化）"
                failures.append((slug, url, "no-docContent"))
            else:
                md = to_markdown(clean_fragment(fragment, url))
                header = (
                    f"<!-- 来源: {url}\n"
                    f"     抓取: {manifest['retrievedAt']}  字节: {len(raw)}  sha256(html): {entry['sha256']}\n"
                    f"     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->\n\n"
                )
                (DOC_DIR / f"{slug}.md").write_text(header + md, encoding="utf-8")
                entry["mdBytes"] = len(md.encode("utf-8"))
                entry["mdSha256"] = sha256(md.encode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            entry["error"] = f"{type(exc).__name__}: {exc}"
            failures.append((slug, url, type(exc).__name__))
        manifest["entries"].append(entry)
        print(f"[{'ok' if 'error' not in entry else 'ERR'}] {slug:26s} {entry.get('mdBytes', 0):>7} md  {entry.get('error', '')}")

        if src is not sources[-1]:
            time.sleep(random.uniform(args.min_delay, args.max_delay))

    manifest["failureCount"] = len(failures)
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\n落盘: {DOC_DIR}  ({len(manifest['entries']) - len(failures)}/{len(manifest['entries'])} 成功)")
    print(f"清单: {OUT_DIR / 'manifest.json'}")
    if failures:
        print("失败项:")
        for slug, url, code in failures:
            print(f"  - {slug} ({code}) {url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
