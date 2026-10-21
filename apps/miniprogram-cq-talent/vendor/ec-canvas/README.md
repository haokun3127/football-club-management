# Radar runtime provenance

Official ecomfe/echarts-for-weixin bridge, pinned commit82e6cdfe5347265c04cced222bd6398dcb6eb279: https://github.com/ecomfe/echarts-for-weixin/tree/82e6cdfe5347265c04cced222bd6398dcb6eb279 . Bridge LICENSE is preserved (BSD3).

Local bridge changes replace getSystemInfoSync SDKVersion/pixelRatio reads with getAppBaseInfo/getWindowInfo. echarts.js is generated from exact echarts6.1.0 with esbuild0.28.2 by scripts/build-radar.mjs; it contains RadarChart, RadarComponent, CanvasRenderer and legal notices. Keep dependencies as devDependencies so official npm building does not ship the whole ECharts package. Rebuild with the package build:radar command; do not hand-edit the generated bundle. echarts.d.ts describes the bridge surface used by the app.
