export {};
declare global {
  interface Window {
    __FCM_CONFIG__: { environment: 'develop' | 'trial' | 'release'; path: string; nonce: string; clubs: Array<{ id: string; name: string }>; build?: import('./services/version').BuildIdentity | null };
    publicPath: string;
    __webpack_nonce__: string;
  }
}
