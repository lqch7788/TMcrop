// 物料明细类型 - 与领料出库单保持一致
export interface MaterialItem {
  sourceApplicationCode: string;  // 来源领料单号
  materialCode: string;           // 物料编码
  category: string;               // 物料分类（格式："中类-小类"）
  materialName: string;           // 物料名称
  spec: string;                   // 规格
  unit: string;                   // 单位
  quantity?: number;              // 领料数量（原单据数量，选填）
  returnQuantity: number;         // 本次退料数量
  batchNo?: string;               // 2026-09-27：原出库批次号（后端退料入库按批次还原批次账）
  unitPrice: number;              // 单价(元)
  warehousePosition: string;       // 仓库货位
  reason: string;                 // 退料原因
  remark: string;                // 备注
}

/**
 * 记录 ID 类型（2026-09-28 审核修复）
 * 后端 material_returns.id 是 `TEXT PRIMARY KEY`，实际值为 `TL{timestamp}-{random}` 字符串。
 * 此前前端声明为 number，导致 `selectedRows.includes(item.id)` 恒为 false
 * （表格勾选/展开全部失效）。统一为 RecordId 兼容字符串与历史数字 id。
 */
export type RecordId = string | number;

// 退料状态联合类型（与后端 statusClass 英文枚举一一对应）
// 2026-09-28 新增 'draft'：撤回审批后的可编辑态
export type ReturnStatusClass = 'draft' | 'approved' | 'pending' | 'rejected' | 'completed' | 'voided' | '';

// 退料记录类型
export interface ReturnRecord {
  id: RecordId;
  code: string;
  date: string;
  type: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  status: string;
  statusClass: ReturnStatusClass;
  remark: string;
  operator: string;        // 操作人
  reviewer: string;        // 审核人
  reviewDate: string;      // 审核日期
  rejectReason: string;    // 驳回原因
  materials: MaterialItem[];
}

// 搜索表单类型
export interface SearchForm {
  code: string;
  material: string;
  warehouse: string;
  applicant: string;
  status: string;
  department: string;
  dateFrom: string;   // 2026-09-28：退料日期范围起（本地时区 YYYY-MM-DD，空串=不限）
  dateTo: string;     // 2026-09-28：退料日期范围止（本地时区 YYYY-MM-DD，空串=不限）
}

// 编辑表单类型
export interface EditFormData {
  date: string;
  type: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  status: string;
  remark: string;
  operator: string;
  reviewer: string;
  reviewDate: string;
  rejectReason: string;
  materials: MaterialItem[];
}

// 新增表单类型
export interface AddFormData {
  code: string;
  date: string;
  type: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  remark: string;
  operator: string;
  reviewer: string;
  reviewDate: string;
  rejectReason: string;
  materials: MaterialItem[];
}

// 状态过滤器选项
export const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: '草稿', label: '草稿' },
  { value: '待审批', label: '待审批' },
  { value: '已审批', label: '已审批' },
  { value: '已驳回', label: '已驳回' },
  { value: '已完成', label: '已完成' },
  { value: '已作废', label: '已作废' },
] as const;

// 退料原因选项
export const RETURN_REASONS = [
  '生产剩余',
  '产品质量问题',
  '领错物料',
  '规格不符',
  '过期产品',
  '运输损坏',
  '库存积压',
  '其他',
] as const;

// 状态样式映射
export const STATUS_STYLE_MAP: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  voided: { bg: 'bg-gray-200', text: 'text-gray-500' },
  '': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

// 2026-09-28 审核修复：删除手写的 File System Access API 全局声明。
// TypeScript 5.6 的 DOM lib 已内置 `showSaveFilePicker`，此处重复声明会产生
// TS2300 Duplicate identifier 错误；且导出场景已改用内联类型断言，不依赖此声明。
