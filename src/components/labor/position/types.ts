/**
 * 职位管理类型定义
 */

/**
 * 职位 UI 视图模型
 *
 * 2026-10-11 类型清理：此前 PersonnelManagementPage 与 position/modals 各定义一份同形类型
 * （页面版 id 为 string、弹窗版 id 为 number，导致两侧类型互不兼容）。现统一为一份。
 * 该形状由 apiBasicDataService.Position 经页面 adaptPositionToPage 适配而来（level/status 已中文化）。
 */
export interface PositionItem {
  id: string;
  code: string;
  name: string;
  dept: string;
  level: string;
  salary: number;
  staffCount: number;
  description: string;
  status: string;
  statusClass: string;
}
