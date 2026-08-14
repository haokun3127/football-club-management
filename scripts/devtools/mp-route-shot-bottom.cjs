/* 滚动到页面底部后截图：验证被首屏截断的下半部分 */
const path = require('path');
const automator = require(path.resolve(__dirname, '../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator'));

const [route, out] = process.argv.slice(2);
if (!route || !out) { console.log('usage: node mp-route-shot-bottom.cjs <route> <out.png>'); process.exit(1); }

async function main() {
  const mp = await automator.connect({ wsEndpoint: `ws://localhost:${process.env.MP_AUTO_PORT || 9432}` });
  await mp.callWxMethod('reLaunch', { url: `/${route}` });
  await new Promise((r) => setTimeout(r, 8000));
  await mp.callWxMethod('pageScrollTo', { scrollTop: 9999, duration: 0 });
  await new Promise((r) => setTimeout(r, 1500));
  const page = await mp.currentPage();
  await mp.screenshot({ path: out });
  console.log('shot ok', out);
  await mp.disconnect();
}

main().then(() => process.exit(0)).catch((e) => { console.log('FAIL', e.message || e); process.exit(1); });
