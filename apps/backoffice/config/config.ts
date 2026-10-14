// Adapted from ant-design/ant-design-pro at 4ee65150b7318af933e56267d257bd9fe644fbd4.
import { defineConfig } from '@umijs/max';
export default defineConfig({
  hash: true,
  publicPath: '/__backoffice_assets__/',
  runtimePublicPath: {},
  history: { type: 'hash' },
  routes: [{ path: '/', component: '@/pages/Workspace' }, { path: '/:section/:resource', component: '@/pages/Workspace' }],
  title: '足球俱乐部 · 登录工作台',
  mock: false,
  npmClient: 'pnpm',
  antd: false,
  conventionRoutes: { exclude: [/./] },
  favicons: ['/__backoffice_assets__/favicon.svg'],
  jsMinifier: 'terser',
});
