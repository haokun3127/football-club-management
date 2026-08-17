# 微信开发者工具截图工具链（Figma 视觉验收用）

在 Windows 本机对微信开发者工具模拟器做「路由跳转 + 375×812 截图」，与设计稿 PNG 合成对比图。
本目录脚本已提交进仓库，直接可用。

## 前提

1. 微信开发者工具 Stable（本机 v2.01.2510290）已安装，CLI 在 `D:\微信web开发者工具\cli.bat`
2. 模拟器里用户已手动点过一次「微信手机号授权并继续」（自动化点不动授权弹窗，这是唯一人工步骤）
3. 在 DevTools 中手动打开本项目，并在「设置 → 安全设置」启用 CLI/HTTP 调用。随后用**唯一入口**注册 Automator 会话：

```bash
npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent devtools:automator:open
```

该命令读取当前 DevTools 的 IDE HTTP 服务端口（`.ide`），把它作为 `cli auto --port` 传入；再注册**独立的** Automator WebSocket 端口，并在握手成功后写入忽略文件 `tmp/devtools-automation-session.json`。该文件只保存端口、项目路径和时间，**不保存 token、手机号或 session**。

## 单页截图

```bash
node scripts/devtools/mp-route-shot.cjs \
  "pages/parent/event/index?id=event-cq-talent-secure-test-1-trn-0813" \
  "C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02\tmp\figma-restore\p2-current.png" \
  force
```

- 第 1 参数：页面路由（可带 query）
- 第 2 参数：输出 PNG **绝对路径**
- 第 3 参数 `force`：强制重新导航。同一路由不同 query 时必须加，否则拍到旧页
- 默认从 `tmp/devtools-automation-session.json` 读取已握手的唯一端口；仅在临时排障时用 `MP_AUTO_PORT=<port>` 覆盖。

## 合成对比图

```bash
python scripts/devtools/sidebyside.py \
  docs/design/reference/figma/p2-training-detail.png \
  tmp/figma-restore/p2-current.png \
  tmp/figma-restore/p2-cmp.png
```

输出左 DESIGN 右 CURRENT 的拼图，视觉模型一次比对。（PIL 本机已装；没有就 `uv run --with pillow`）

## 已知坑（全部踩过，别再踩）

1. **automator 的 `reLaunch`/`navigateTo` promise 会挂起或报空错 `{}`**——脚本已改用 `mp.callWxMethod("reLaunch", {url})` 通道，不要改回去
2. `mp.screenshot` 超时（60s）= 模拟器渲染面卡住。**先查 DevTools 主窗口是否失焦/最小化**——实测窗口不在前台会导致截图通道挂死，把窗口 ShowWindow 还原置前台即可恢复（无需重启）；不行再 `cli.bat quit` 后重新 `cli auto`
3. 端口拒绝连接（`Failed connecting to ws://...`）——不要猜 9421/9425/9429/9430/9432。重新执行上面的 `devtools:automator:open`；它会读取当前 IDE HTTP 端口并在真实 Automator 握手成功后更新唯一会话状态。
4. **不要用 `DEV_AUTO_SESSION=true` 验生产页面**：生产 API 硬关 x-user-id 头鉴权，假会话只会 403，且残留 wx storage 造成持续 403（补救：`mp.callWxMethod("clearStorage")` + 干净重启）
5. 授权弹窗/身份选择可用 **cua-driver 前景真点击**全自动（2026-08-14 验证）：`uv tool install cua-driver` → `cua-driver serve` → `get_window_state`（须选对 title 含「开发者工具」的窗口，wechatdevtools 还有 nw.js 外壳窗）拿元素坐标 → `click` 带 `delivery_mode:"foreground"`（Chromium 上 background/UIA Invoke 无效）→ 弹窗「允许」**只点一次**（双点复用 phone code 会 wechat-login 400）
6. 强杀 DevTools 进程会白屏；白屏或失效时由用户手动完全退出并重新打开 IDE，不要杀进程、反复 `cli auto`，也不要把问题误改到页面代码。
7. 截图前留 8-15s 给编译；脚本内已含等待与轮询
8. **不要把 CLI HTTP 端口当成 Automator 端口**：前者来自 DevTools `.ide`，后者由 `--auto-port` 独立注册。历史上的白屏多发生在未指定当前 IDE HTTP 端口、由 CLI 另起项目窗口时；现在只允许使用本 README 的唯一入口，白屏恢复仍由用户手动重启 IDE，禁止循环 `cli auto/open`。
9. **新版 DevTools 可能没有独立“××的模拟器”窗口**：`devtools-simulator-capture.py` 会先兼容旧标题；若没有，再在唯一可见的 DevTools 主窗口内以 iPhone X 的纵向和横向黑色刘海定位完整 375×812 画布。它先尝试 `PrintWindow`，找不到画布时自动改用前台屏幕像素；不要改用固定屏幕坐标裁图，也不要手填过时窗口标题。

## 完整逐页验收循环

```bash
# 1. 设计稿已在仓库：docs/design/reference/figma/<页面>.png（README.md 有对照表）
# 2. 截当前实现
node scripts/devtools/mp-route-shot.cjs "<路由>" "<tmp 输出.png>" force
# 3. 合成
python scripts/devtools/sidebyside.py docs/design/reference/figma/<页面>.png <tmp 输出.png> <tmp 对比.png>
# 4. 视觉比对 → 修代码 → typecheck + vitest → 重截复验 → 路径限定提交
```

## 可信 375×812 截图通道（automator 截图超时时的主力通道）

`page.screenshot` 在某些实例上持续超时（页面渲染正常也一样）。使用动态定位脚本，不依赖显示器分辨率或模拟器摆放位置：

```bash
# 1. 抓当前可见模拟器并自动定位 iPhone X 画布
python apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.py \
  --output tmp/figma-restore/<页面>-current.png \
  --logical-width 375 \
  --logical-height 812
# 2. 合成对比
python scripts/devtools/sidebyside.py \
  docs/design/reference/figma/<页面>.png \
  tmp/figma-restore/<页面>-current.png \
  tmp/figma-restore/<页面>-cmp.png
```

- 输出 JSON 的 `source` 为 `print_window` 或 `screen`；两者都必须生成真实的 375×812 画布，不能接受纯白、固定坐标或左偏截图。
- 整窗 `screen-shot.py` 和坐标裁剪 `crop-phone.py` 仅保留给历史排障，不作为视觉验收通道。
- 页面内容超出首屏时用 automator `mp.callWxMethod('pageScrollTo',{scrollTop:N,duration:0})` 滚动后再截第二段。
