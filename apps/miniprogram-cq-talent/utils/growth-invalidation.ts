// 成长数据失效标记（F-06）：训练记录更正等相关事实写入成功后置脏，
// 成长页 onShow 消费标记后定向重拉，避免每次返回无差别全量加载。
let growthStale = false;

export function markGrowthStale(): void {
  growthStale = true;
}

export function consumeGrowthStale(): boolean {
  const stale = growthStale;
  growthStale = false;
  return stale;
}
