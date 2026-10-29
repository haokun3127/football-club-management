import { getClientVersion, getServiceVersion, type BuildIdentity } from "../../utils/version";

interface VersionRow { label: string; value: string }
const environments: Record<string, string> = { develop: "开发版", trial: "体验版", release: "正式版" };
const pending = "版本待确认";
function present(environment: string | null, build: BuildIdentity | null, version?: string | null): VersionRow[] {
  return [
    { label: "运行环境", value: environments[environment ?? ""] ?? "环境待确认" },
    ...(version === undefined ? [] : [{ label: "微信版本", value: version ?? pending }]),
    { label: "构建标识", value: build?.buildId ?? pending },
    { label: "源码版本", value: build?.sourceRevision ?? pending },
    { label: "构建时间（UTC）", value: build?.builtAt ?? pending },
  ];
}
const reads = new WeakMap<object, { generation: number }>();
Component({
  data: { expanded: false, loading: false, failed: false, clientRows: [] as VersionRow[], serverRows: [] as VersionRow[] },
  lifetimes: {
    attached() { reads.set(this, { generation: 0 }); },
    detached() { reads.delete(this); },
  },
  methods: {
    handleToggle() {
      const expanded = !this.data.expanded;
      this.setData({ expanded });
      if (expanded) void this.handleRefresh();
      else {
        const state = reads.get(this);
        if (state) state.generation += 1;
        this.setData({ loading: false, failed: false, serverRows: [] });
      }
    },
    async handleRefresh() {
      if (!this.data.expanded || this.data.loading) return;
      const state = reads.get(this);
      if (!state) return;
      const generation = ++state.generation;
      const client = getClientVersion();
      this.setData({ loading: true, failed: false, clientRows: present(client.environment, client.build, client.version), serverRows: [] });
      try {
        const server = await getServiceVersion();
        if (reads.get(this) !== state || state.generation !== generation || !this.data.expanded) return;
        this.setData({ loading: false, serverRows: present(server.environment, server.build) });
      } catch {
        if (reads.get(this) !== state || state.generation !== generation || !this.data.expanded) return;
        this.setData({ loading: false, failed: true });
      }
    },
  },
});
