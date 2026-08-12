# 微信开发者工具截图工具链（Figma 视觉验收用）

在 Windows 本机对微信开发者工具模拟器做「路由跳转 + 375×812 截图」，与设计稿 PNG 合成对比图。
本目录脚本已提交进仓库，直接可用。

## 前提

1. 微信开发者工具 Stable（本机 v2.01.2510290）已安装，CLI 在 `D:\微信web开发者工具\cli.bat`
2. 模拟器里用户已手动点过一次「微信手机号授权并继续」（自动化点不动授权弹窗，这是唯一人工步骤）
3. 已注册自动化端口（会话失效/换端口时重跑一次）：

```bash
"/d/微信web开发者工具/cli.bat" auto \
  --project "C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02\apps\miniprogram-cq-talent" \
  --auto-port 9429
```

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
- 端口默认 9429，`MP_AUTO_PORT=9430 node ...` 覆盖；换端口后要用上面的 `cli auto` 重新注册

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
3. 端口会莫名失效（`Failed connecting to ws://...`）——换个新端口重新 `cli auto` 注册即可，别在死端口上重试
4. **不要用 `DEV_AUTO_SESSION=true` 验生产页面**：生产 API 硬关 x-user-id 头鉴权，假会话只会 403，且残留 wx storage 造成持续 403（补救：`mp.callWxMethod("clearStorage")` + 干净重启）
5. 授权弹窗/身份选择自动化点不动，必须用户手动点
6. 强杀 DevTools 进程会白屏（`Ctrl+Win+Shift+B` 恢复），用 `cli.bat quit`
7. 截图前留 8-15s 给编译；脚本内已含等待与轮询

## 完整逐页验收循环

```bash
# 1. 设计稿已在仓库：docs/design/reference/figma/<页面>.png（README.md 有对照表）
# 2. 截当前实现
node scripts/devtools/mp-route-shot.cjs "<路由>" "<tmp 输出.png>" force
# 3. 合成
python scripts/devtools/sidebyside.py docs/design/reference/figma/<页面>.png <tmp 输出.png> <tmp 对比.png>
# 4. 视觉比对 → 修代码 → typecheck + vitest → 重截复验 → 路径限定提交
```
