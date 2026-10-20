/**
 * 微信小程序全局类型的「收缩策略」适配层。
 *
 * 全局声明主体已切换到官方 `miniprogram-api-typings`（经 tsconfig `types` 字段
 * 引入）：`wx` 全量 API、`App`、`getApp`、`getCurrentPages`、`Component`、
 * `Behavior`、`console`、`require`/`module` 与 `WechatMiniprogram` 命名空间
 * （含 CustomEvent / TouchEvent / RequestTask 等事件与任务类型）均来自官方包。
 *
 * 本文件仅保留两类无法随包整体启用而直接删除的过渡内容：
 *
 * 1. `Page` 双重载适配层
 *    官方 `Page.Constructor` 泛型无默认值，直接启用会迫使全部 43 个显式传参页面
 *    一次性迁移（TS2558 + `this`/excess property 级联错误，实测 >150 行业务改动）。
 *    - 宽松重载（先匹配）：存量页面继续用 `Page<PageData>(options)` 或
 *      `Page(options)` 调用。`data` 负例（`Page<{count:number}>({data:{count:"x"}})`）
 *      自本重载起可检出；`this` 与其余 options 字段保持旧 shim 的宽松语义，
 *      未迁移页面无需任何改动。
 *    - 严格重载（显式双参时匹配）：`Page<TData, TCustom>(options)` 与官方
 *      `WechatMiniprogram.Page.Options<TData, TCustom>` 完全一致，生命周期、
 *      自定义方法、`this`、`setData`、事件全部受官方类型约束。试点页面
 *      （pages/parent/day）已迁移；后续批次逐页迁移完成后，应删除本适配层、
 *      直接采用官方全局 `Page` 声明。
 *
 * 2. `WechatPageOptions` 过渡别名
 *    仅剩 utils/student-results-page.ts 引用；该文件迁移到官方泛型后删除。
 *
 * 注意：官方包同样声明了全局 `Page`（lib.wx.page.d.ts 尾部 `declare let Page`）。
 * 本文件的 `Page` 声明与之重复，因 `skipLibCheck` 不报冲突，且本文件声明优先生效
 * （由 tests/types-negative-guard.test.mjs 在 CI 中断言该行为：宽松重载的 data
 * 约束必须持续可检出）。若未来升级官方包后声明优先级翻转，负例守卫与全量
 * typecheck 会立即失败，不会静默回退。
 */

type WechatPageOptions<TData extends Record<string, any> = Record<string, any>> = {
  /**
   * data 字面量必须满足 TData（与官方一致）。启用即暴露 9 处存量声明漂移
   * （data 实际字段与本地 PageData 接口不一致），已逐文件补齐接口；见
   * 迁移报告「逐文件小修清单」。
   */
  data?: TData;
  [key: string]: any;
};

declare function Page<TData extends Record<string, any> = Record<string, any>>(
  options: WechatPageOptions<TData> & ThisType<any>
): void;

declare function Page<
  TData extends WechatMiniprogram.Page.DataOption,
  TCustom extends WechatMiniprogram.Page.CustomOption
>(options: WechatMiniprogram.Page.Options<TData, TCustom>): void;
