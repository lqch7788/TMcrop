import type { SourceType } from '../../../types/inventoryInbound';

/**
 * 字段类型枚举
 * - text: 文本输入
 * - number: 数字输入
 * - date: 日期选择
 * - select: 通用下拉
 * - select-dict-unit: 单位字典下拉（来自 getDictItems('unit')，12 项）
 * - select-dict-crop-form: 作物形态字典下拉（来自 getDictItems('crop_form')，6 项）
 * - select-enum-quality: 品质等级下拉
 * - supplier-select: 供应商下拉（来自 useSupplierStore）
 * - base-select: 基地下拉（来自 useBaseStore）
 * - crop-selector: 作物选择（CropCodeSelector 组件）
 * - textarea: 多行文本
 * - derived: 派生字段（自动计算，不接受用户输入）
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'select-dict-unit'
  | 'select-dict-crop-form'
  | 'select-warehouse-name'
  | 'select-enum-quality'
  | 'supplier-select'
  | 'base-select'
  | 'crop-selector'
  | 'select-source-id'
  | 'supplementary-reason'
  | 'textarea'
  | 'derived';

export interface FieldConfig {
  /** 字段 key，与 formData / InventoryInboundInput 字段对应 */
  key: string;
  /** 字段显示标签（中文） */
  label: string;
  /** 是否必填 */
  required: boolean;
  /** 字段类型（决定渲染哪个 UI 组件） */
  type: FieldType;
  /** 提示信息（可选） */
  hint?: string;
  /** 派生公式（仅 type=derived 时使用） */
  derive?: 'quantity * unitPrice';
}

/**
 * 6 来源通用字段（所有入库来源都需填）
 * 顺序：基础信息 → 业务信息 → 备注
 */
export const COMMON_FIELDS: FieldConfig[] = [
  { key: 'recordDate', label: '入库日期', required: true, type: 'date' },
  { key: 'cropSelector', label: '作物选择', required: true, type: 'crop-selector' },
  { key: 'warehouseId', label: '入库仓库', required: true, type: 'select' },
  { key: 'quantity', label: '数量', required: true, type: 'number' },
  { key: 'unit', label: '单位', required: true, type: 'select-dict-unit' },
  { key: 'qualityGrade', label: '品质等级', required: false, type: 'select-enum-quality' },
  { key: 'notes', label: '备注', required: false, type: 'textarea' },
];

/**
 * 6 来源专属字段
 * 设计原则：消除“选外购入库还显示种植模式”的不合理组合
 * - 外购入库：供应商 + 单价 + 采购日期 + 财务三件套
 * - 赠送：赠方名称（选填，溯源痕迹）
 * - 委托：委托方（必填，核心审计信息）
 * - 调拨：调出仓库（选填，溯源）
 * - 手动：盘点单号（选填，区分盘点 vs 期初）
 * - 自产：所属基地（必填）+ 种植模式 + 采收区域
 */
export const FIELD_CONFIG: Record<SourceType, FieldConfig[]> = {
  external_purchased: [
    { key: 'supplierId', label: '供应商', required: true, type: 'supplier-select' },
    // 2026-07-08 T13 Bug 3：移除 supplierPhone（供应商实体的电话号码字段已在 supplier 表维护，弹窗不重复收集）
    { key: 'unitPrice', label: '单价（元）', required: false, type: 'number' },
    { key: 'purchaseDate', label: '采购日期', required: false, type: 'date' },
    // 2026-07-08 T13 Bug 2：所有 6 个来源都强制要求作物形态
    { key: 'cropForm', label: '作物形态', required: true, type: 'select-dict-crop-form' },
    {
      key: 'totalAmount',
      label: '总金额',
      required: false,
      type: 'derived',
      derive: 'quantity * unitPrice',
    },
  ],
  gift: [
    { key: 'giftFrom', label: '赠方名称', required: false, type: 'text' },
    // 2026-07-08 T13 Bug 2
    { key: 'cropForm', label: '作物形态', required: true, type: 'select-dict-crop-form' },
  ],
  commissioned: [
    { key: 'consignor', label: '委托方', required: true, type: 'text' },
    // 2026-07-08 T13 Bug 2
    { key: 'cropForm', label: '作物形态', required: true, type: 'select-dict-crop-form' },
  ],
  transfer: [
    // 2026-07-09：调出仓库从 text 改为 select-warehouse-name（与入库仓库一致的下拉体验）
    { key: 'sourceWarehouseName', label: '调出仓库', required: false, type: 'select-warehouse-name' },
    // 2026-07-08 T13 Bug 2
    { key: 'cropForm', label: '作物形态', required: true, type: 'select-dict-crop-form' },
  ],
  manual: [
    { key: 'stocktakeNo', label: '盘点单号', required: false, type: 'text' },
    // 2026-07-08 T13 Bug 2
    { key: 'cropForm', label: '作物形态', required: true, type: 'select-dict-crop-form' },
  ],
  self_produced: [
    // 2026-07-09 v5 阶段三（路径 B）：补录入口
    // 用户从种植/育苗行 navigate 过来时，prefillSourceId 预填此字段
    // 2026-07-13 方案 B：required 改为 true（弹窗搜索 + 必填校验保持一致）
    { key: 'sourceId', label: '源种植/育苗行', required: true, type: 'select-source-id' },
    // 2026-07-13 v8：删除"所属基地"字段（基地信息已隐含在源记录中）
    // 2026-07-13 v9：删除"种植模式"字段（种植表 DB 未存 plantingMode，无数据可填）
    // 2026-07-13 v9：采收区域仍保留并自动填（从源记录读 greenhouseName）
    { key: 'greenhouseName', label: '采收区域', required: false, type: 'text' },
    // 2026-07-08 T13 Bug 2
    { key: 'cropForm', label: '作物形态', required: true, type: 'select-dict-crop-form' },
    // 2026-07-09 v5 阶段三：补录原因
    // 2026-07-13 v6：type 从 'text' 升级为 'supplementary-reason'，由 SupplementaryReasonInput 复合组件渲染
    // 2026-07-13 方案 D：required 改为 true（自产=补录，必填）
    { key: 'supplementaryReason', label: '补录原因', required: true, type: 'supplementary-reason' },
  ],
};

/**
 * 判断表单值是否为空，用于必填字段校验。
 */
function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * 按 sourceType 校验表单。
 * @returns 错误对象，key 为字段名，value 为错误信息。无错误返回空对象
 */
export function validateBySourceType(
  formData: Record<string, unknown>,
  sourceType: SourceType,
): Record<string, string> {
  const errors: Record<string, string> = {};

  // 公共必填项按 COMMON_FIELDS 声明校验，确保矩阵声明与提交校验一致。
  for (const field of COMMON_FIELDS) {
    if (field.required && isBlank(formData[field.key])) {
      errors[field.key] = '必填';
    }
  }

  // 数量是 6 种来源共用的硬性业务规则，必须显式大于 0 且不能是 Infinity/NaN。
  const quantity = Number(formData.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = '必须大于 0';
  }

  // 来源专属必填项按声明式矩阵校验，避免切换来源后出现不相关字段阻断提交。
  for (const field of FIELD_CONFIG[sourceType]) {
    if (field.required && isBlank(formData[field.key])) {
      errors[field.key] = '必填';
    }
  }

  return errors;
}

/**
 * 切换 sourceType 时需要清空的所有非公共字段 key。
 * 用于：用户先选外购填了供应商，再切到自产，需要清空供应商避免残留。
 *
 * 2026-07-08 T13 Bug 3：移除 supplierPhone
 */
export function fieldsToResetOnSourceTypeChange(): string[] {
  return [
    'supplierId',
    'supplierName',
    'unitPrice',
    'totalAmount',
    'purchaseDate',
    'giftFrom',
    'consignor',
    'sourceWarehouseName',
    'stocktakeNo',
    'baseId',
    'baseName',
    'plantingMode',
    'greenhouseName',
  ];
}
