import { getVenues } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, VenueInfo } from "../../../utils/types";

interface VenueView extends VenueInfo {
  canNavigate: boolean;
  hasFacilities: boolean;
  hasTags: boolean;
  usageLabel: string;
  heroImage: string;
}

interface PageData {
  state: LoadState;
  message: string;
  filters: Array<{ label: string; value: string }>;
  activeFilter: string;
  venues: VenueView[];
  visibleVenues: VenueView[];
  hasVisibleVenues: boolean;
  emptyMessage: string;
}

const FILTERS = [
  { label: "全部场地", value: "all" },
  { label: "室外", value: "outdoor" },
  { label: "室内", value: "indoor" },
  { label: "人工草", value: "artificial" },
  { label: "天然草", value: "natural" },
];

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading",
    message: "正在加载场地",
    filters: FILTERS,
    activeFilter: "all",
    venues: [],
    visibleVenues: [],
    hasVisibleVenues: false,
    emptyMessage: "暂无可展示的场地",
  },
  goBack() {
    wx.navigateBack();
  },
  onLoad() {
    requireRole("parent");
    this.loadVenues();
  },
  async loadVenues() {
    this.setData({ state: "loading", message: "正在加载场地" });
    try {
      const venues = presentVenues(await getVenues());
      const visibleVenues = filterVenues(venues, this.data.activeFilter);
      const hasVenues = venues.length > 0;
      this.setData({
        state: hasVenues ? "ready" : "empty",
        message: hasVenues ? "" : "暂无可展示的场地",
        venues,
        visibleVenues,
        hasVisibleVenues: visibleVenues.length > 0,
        emptyMessage: hasVenues ? "当前分类暂无场地" : "暂无可展示的场地",
      });
    } catch {
      this.setData({
        state: "error",
        message: "场地加载失败，请点击重试",
        venues: [],
        visibleVenues: [],
        hasVisibleVenues: false,
        emptyMessage: "",
      });
    }
  },
  selectFilter(event: { currentTarget: { dataset: { value: string } } }) {
    const activeFilter = FILTERS.some((filter) => filter.value === event.currentTarget.dataset.value)
      ? event.currentTarget.dataset.value
      : "all";
    const visibleVenues = filterVenues(this.data.venues, activeFilter);
    this.setData({
      activeFilter,
      visibleVenues,
      hasVisibleVenues: visibleVenues.length > 0,
      emptyMessage: this.data.venues.length > 0 ? "当前分类暂无场地" : "暂无可展示的场地",
    });
  },
  navigate(event: { currentTarget: { dataset: { id: string } } }) {
    const venue = this.data.venues.find((item: VenueView) => item.id === event.currentTarget.dataset.id);
    if (!venue?.canNavigate) return;
    const openLocation = (wx as unknown as { openLocation?: (options: { latitude: number; longitude: number; name: string; address: string }) => void }).openLocation;
    if (openLocation) {
      openLocation({ latitude: venue.latitude, longitude: venue.longitude, name: venue.name, address: venue.address });
      return;
    }
    wx.showToast({ title: "当前环境不支持地图导航", icon: "none" });
  },
});

function presentVenues(venues: VenueInfo[]): VenueView[] {
  return venues.map(({ id, name, type, address, tags, facilities, latitude, longitude, monthlyCount }, index) => ({
    id,
    name,
    type,
    address,
    tags,
    facilities,
    latitude,
    longitude,
    monthlyCount,
    canNavigate: hasRealCoordinates(latitude, longitude),
    hasFacilities: facilities.length > 0,
    hasTags: tags.length > 0,
    usageLabel: `本月训练 ${monthlyCount}次`,
    heroImage: `/assets/venues/venue-${(index % 3) + 1}.jpg`,
  }));
}

function filterVenues(venues: VenueView[], filter: string): VenueView[] {
  return filter === "all" ? venues : venues.filter((venue) => venue.tags.includes(filter));
}

function hasRealCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude !== 0
    && longitude !== 0
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}
