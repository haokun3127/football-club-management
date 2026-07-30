import { getVenues } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { VenueInfo } from "../../../utils/types";

interface Venue extends VenueInfo {
  typeColor: string;
  gradient: string;
}

interface PageData {
  filters: Array<{ label: string; value: string }>;
  activeFilter: string;
  venues: Venue[];
  visibleVenues: Venue[];
}

const FILTERS = [
  { label: "全部场地", value: "all" },
  { label: "室外", value: "outdoor" },
  { label: "室内", value: "indoor" },
  { label: "人工草", value: "artificial" },
  { label: "天然草", value: "natural" },
];

const TYPE_COLORS: Record<string, string> = {
  "11人制场地": "#3b82f6",
  "7人制场地": "#059669",
  "5人制场地": "#8b5cf6",
};

const GRADIENTS = [
  "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
  "linear-gradient(135deg, #047857 0%, #34d399 100%)",
  "linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)",
];

Page<PageData>({
  data: {
    filters: FILTERS,
    activeFilter: "all",
    venues: [],
    visibleVenues: [],
  },
  onLoad() {
    requireRole("parent");
    this.loadVenues();
  },
  async loadVenues() {
    try {
      const venues = (await getVenues()).map((venue, index) => ({
        ...venue,
        typeColor: TYPE_COLORS[venue.type] ?? "#3b82f6",
        gradient: GRADIENTS[index % GRADIENTS.length],
      }));
      this.setData({ venues, visibleVenues: this.data.activeFilter === "all" ? venues : venues.filter((venue) => venue.tags.includes(this.data.activeFilter)) });
    } catch {
      wx.showToast({ title: "场地加载失败，请稍后重试", icon: "none" });
    }
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
  navigate(event: { currentTarget: { dataset: { id: string } } }) {
    const venue = this.data.venues.find((item: Venue) => item.id === event.currentTarget.dataset.id);
    if (!venue) return;
    const openLocation = (wx as unknown as { openLocation?: (options: { latitude: number; longitude: number; name: string; address: string }) => void }).openLocation;
    if (openLocation) {
      openLocation({ latitude: venue.latitude, longitude: venue.longitude, name: venue.name, address: venue.address });
      return;
    }
    wx.showToast({ title: `导航到${venue.name}`, icon: "none" });
  },
});
