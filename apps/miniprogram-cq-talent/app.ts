import { restoreAppState } from "./utils/store";

App({
  onLaunch() {
    restoreAppState();
  },
  globalData: {},
});
