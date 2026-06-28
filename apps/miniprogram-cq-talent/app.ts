import { setAppContext } from "./utils/store";
import { mockContext } from "./utils/mock";

App({
  onLaunch() {
    setAppContext(mockContext);
  },
  globalData: {},
});
