/**
 * 采收弹窗 — 共享类型/常量/标签映射
 * 2026-10-18：从 HarvestRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */

export const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"

// 2026-07-01 P2-10 修复：补全 Warehouse / User 接口，减少 6 处 `any`
export interface WarehouseLite {
  id?: string
  oid?: string
  name?: string
  warehouseName?: string
  status?: string
}
export interface UserLite {
  oid?: string
  id?: string
  realName?: string
  real_name?: string
  username?: string
}

// 2026-06-29: 种植自留种 — 采收形态选项（替代 circulate/self_seed 的 subType 三选一）
// 与 harvest 模式共享 sourceForm state，但语义不同：
// - harvest 模式：果实/种子/种苗... 用于入库产物分类（inventory_stock.product_form）
// - planting_self_kept 模式：同样 12 选，用于回流到 seed_sources.seed_form
export const SEED_FORM_OPTIONS = [
  '果实', '种子', '种苗', '穗条', '枝条',
  '块根', '块茎', '鳞茎', '叶片', '花朵', '整株', '其他',
] as const

export type SubType = 'cutting' | 'seed_saving' | 'quantity_refill' | 'quantity_inbound'

/** destination 中文标签映射（前端展示用） */
export function getDestinationLabel(dest: string): string {
  const map: Record<string, string> = {
    harvest: '采收入库',
    // 2026-06-29: 合并种植自留种（替代旧 circulate / self_seed 双选项）
    planting_self_kept: '种植自留种',
    // 老值保留兼容历史记录展示
    circulate: '残株回种源',
    self_seed: '自交种子入种源',
    // 2026-07-09：dispose 功能已下线（与每日记录"损耗"语义重叠）。
    // 此处仅保留标签映射，供历史 planting_harvest_records 记录展示用，新建/编辑入口已移除。
    dispose: '直接废弃（已下线）',
  }
  return map[dest] || dest
}

/** subType 中文标签映射 */
export function getSubTypeLabel(sub: string | undefined): string {
  if (!sub) return '-'
  const map: Record<string, string> = {
    cutting: '扦插繁殖',
    seed_saving: '留种',
    quantity_refill: '数量回填',
    quantity_inbound: '数量入库存',
  }
  return map[sub] || sub
}
