/* 监听模拟器 console 输出：reLaunch 目标页并打印 15s 内所有 console 消息（定位 TS 未生效原因） */
const path = require('path');
const automator = require(path.resolve(__dirname, '../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator'));

async function main() {
  const mp = await automator.connect({ wsEndpoint: `ws://localhost:${process.env.MP_AUTO_PORT || 9432}` });
  mp.on('console', (msg) => {
    const items = (msg.args || []).map((a) => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    console.log(`[${msg.type}]`, items.slice(0, 300));
  });
  await mp.callWxMethod('reLaunch', { url: '/pages/parent/private/index' });
  console.log('relaunched, listening 15s...');
  await new Promise((r) => setTimeout(r, 15000));
  await mp.disconnect();
}

main().then(() => process.exit(0)).catch((e) => { console.log('FAIL', e.message || e); process.exit(1); });
