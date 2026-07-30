import { requireRole } from "../../../utils/auth";

interface Venue {
  id: string;
  name: string;
  type: string;
  typeColor: string;
  address: string;
  tags: string[];
  facilities: string[];
  monthlyCount: number;
  gradient: string;
}

interface PageData {
  filters: Array<{ label: string; value: string }>;
  activeFilter: string;
  venues: Venue[];
  visibleVenues: Venue[];
}

// Figma Venues - Premium 设计内容（静态，待后端场地服务接入）
const VENUES: Venue[] = [
  {
    id: "v1",
    name: "九龙坡足球公园",
    type: "11人制场地",
    typeColor: "#3b82f6",
    address: "九龙坡区科园四路",
    tags: ["outdoor", "natural"],
    facilities: ["照明设施", "更衣室", "停车场"],
    monthlyCount: 4,
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
  },
  {
    id: "v2",
    name: "重庆体育学院训练馆",
    type: "5人制场地",
    typeColor: "#8b5cf6",
    address: "沙坪坝区大学城",
    tags: ["indoor", "artificial"],
    facilities: ["恒温室内", "淋浴间", "储物柜"],
    monthlyCount: 2,
    gradient: "linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)",
  },
  {
    id: "v3",
    name: "南岸足球公园",
    type: "7人制场地",
    typeColor: "#059669",
    address: "南岸区茶园路",
    tags: ["outdoor", "artificial"],
    facilities: ["照明设施", "停车场"],
    monthlyCount: 6,
    gradient: "linear-gradient(135deg, #047857 0%, #34d399 100%)",
  },
];

const FILTERS = [
  { label: "全部场地", value: "all" },
  { label: "室外", value: "outdoor" },
  { label: "室内", value: "indoor" },
  { label: "人工草", value: "artificial" },
  { label: "天然草", value: "natural" },
];

Page<PageData>({
  data: {
    filters: FILTERS,
    activeFilter: "all",
    venues: VENUES,
    visibleVenues: VENUES,
  },
  onLoad() {
    requireRole("parent");
  },
  selectFilter(event: { currentTarget: { dataset: { value: string } } }) {
    const value = event.currentTarget.dataset.value;
    this.setData({
      activeFilter: value,
      visibleVenues: value === "all"
        ? this.data.venues
        : this.data.venues.filter((venue: Venue) => venue.tags.includes(value)),
    });
  },
  openSearch() {
    wx.showToast({ title: "场地搜索即将上线", icon: "none" });
  },
  navigate(event: { currentTarget: { dataset: { name: string } } }) {
    wx.showToast({ title: `导航到${event.currentTarget.dataset.name}`, icon: "none" });
  },
});
