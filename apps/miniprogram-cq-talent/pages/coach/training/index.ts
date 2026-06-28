import { mockRadar } from "../../../utils/mock";
import { openPage } from "../../../utils/navigation";

Page({
  data: {
    radar: mockRadar,
  },
  goSchedule() {
    openPage("/pages/coach/schedule/index");
  },
  goMe() {
    openPage("/pages/coach/me/index");
  },
});
