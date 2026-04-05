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
  unitPrice: number;              // 单价(元)
  warehousePosition: string;       // 仓库货位
  reason: string;                 // 退料原因
  remark: string;                // 备注
}

// 退料记录类型
export interface ReturnRecord {
  id: number;
  code: string;
  date: string;
  type: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  status: string;
  statusClass: 'approved' | 'pending' | 'rejected' | 'completed' | 'voided' | '';
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
  { value: '待审批', label: '待审批' },
  { value: '已审批', label: '已审批' },
  { value: '已驳回', label: '已驳回' },
  { value: '已完成', label: '已完成' },
  { value: '已作废', label: '已作废' },
] as const;

// 退料原因选项
export const RETURN_REASONS = [
  '质量问题',
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

// File System Access API 类型声明
interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | WriteParams): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface WriteParams {
  type: 'write' | 'seek' | 'truncate';
  data?: BufferSource | Blob | string;
  position?: number;
  size?: number;
}

interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
}

declare global {
  interface Window {
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  }
}
