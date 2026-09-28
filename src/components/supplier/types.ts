// 供应商管理类型定义

export interface SupplierMidCategory {
  code: string;
  name: string;
}

export interface SupplierBigCategory {
  code: string;
  name: string;
  midCategories: SupplierMidCategory[];
}

export interface Supplier {
  // 2026-09-28 审计修复：DB 主键是 TEXT（SUP001 / SU_SP03014），原声明 number 是类型谎言——
  // 批量编辑据此做 Number(id) 得到 NaN，UPDATE 命中 0 行仍返回成功
  id: string;
  code: string;
  name: string;
  supplierType: string;
  supplierAttribute: string;
  contact: string;
  mobilePhone: string;
  workPhone?: string;
  fax?: string;
  status: string;
  country: string;
  province: string;
  city: string;
  address: string;
  bankName?: string;
  bankCardNumber?: string;
  organization: string;
  createDate: string;
  remarks?: string;
  // 2026-09-28 批次B 合规风控：三类强制资质证照（证号 + 有效期至 YYYY-MM-DD）
  // 适用品类见 qualification.ts 的 REQUIRED_QUALIFICATION_BY_TYPE
  pesticideLicenseNo?: string;
  pesticideLicenseExpiry?: string;
  seedFilingNo?: string;
  seedFilingExpiry?: string;
  fertilizerRegNo?: string;
  fertilizerRegExpiry?: string;
  // 2026-09-28 批次C 经营决策
  /** 内部自产/外部采购（取值来自字典 supplier_is_internal） */
  isInternal?: string;
  /** 结算方式 */
  settlementType?: string;
  /** 账期天数（结算方式为月结/季结时生效） */
  creditDays?: number;
  /** 评级 0-5（0 = 未评级） */
  rating?: number;
  // 兼容字段（useSupplierStore 使用 — 2026-06-30 tsc 兼容）
  createBy?: string;
  updateBy?: string;
  createTime?: string;
  updateTime?: string;
  level?: string;
  scope?: string;
  qualification?: string;
  cooperationYears?: number;
  supplyCategories?: string;
  [key: string]: any;
}

/**
 * 2026-09-28 审计修复：状态/组织选项集中到此处（此前在筛选器与 3 个弹窗里各写一遍）
 * 注意：状态值与 useSupplierStore 的 STATUS_TO_BACKEND 映射一一对应；
 * DB 字典 dictionaries(supplier_status) 亦定义同三态（active/paused/terminated）。
 */
export const SUPPLIER_STATUS_OPTIONS = ['合作中', '暂停', '终止'] as const;

/** 所属组织选项（当前两套主体；接入 organizations 表后可从字典派生） */
export const SUPPLIER_ORGANIZATION_OPTIONS = ['宁波帮帮忙公司', '成都帮帮您公司'] as const;

/**
 * 2026-09-28 批次C：结算方式选项
 * 值直接落库（suppliers.settlement_type），后端为自由文本白名单列，不做值域校验
 */
export const SUPPLIER_SETTLEMENT_OPTIONS = ['现结', '货到付款', '月结', '季结', '其他'] as const;

/**
 * 2026-09-28 批次C：内部自产标记选项
 * 值与字典 dictionaries(supplier_is_internal) 一致：internal/external
 */
export const SUPPLIER_INTERNAL_OPTIONS = [
  { value: 'external', label: '外部采购' },
  { value: 'internal', label: '内部自产' },
] as const;

/**
 * 2026-09-28 批次C：供应商评级（suppliers.rating，整数 0-5）
 * 5 = 最高级（最优），1 = 最低，0 = 未评级。表单标签/提示统一取这两个常量，避免各处口径漂移。
 */
export const SUPPLIER_RATING_LABEL = '评级（0-5，5 最高）';
export const SUPPLIER_RATING_HINT = '0 = 未评级';

export interface SupplierFiltersState {
  code: string;
  name: string;
  contact: string;
  type: string;
  status: string;
  supplierAttribute: string;
  organization: string;
  /** 区域级联筛选（方案6.1）——2026-09-28：仅省/市两级（region_data 无区县层级，
   *  且 suppliers 表无 district 列，原"四级级联"的区县分支恒筛空，已移除） */
  province?: string;
  city?: string;
  /** 2026-09-28 批次B：资质合规状态筛选（留空=全部；'attention'=仅需关注：未登记/已过期/即将到期） */
  qualification?: string;
  /** 2026-09-28 批次C：内部自产标记筛选（''=全部；'internal'/'external'） */
  isInternal?: string;
}

export interface EditFormData {
  name: string;
  supplierType: string;
  supplierAttribute: string;
  contact: string;
  mobilePhone: string;
  workPhone: string;
  fax: string;
  status: string;
  country: string;
  province: string;
  city: string;
  address: string;
  bankName: string;
  bankCardNumber: string;
  organization: string;
  // 2026-09-28：createDate 不在表单里（建档日期由新增流程记当天，编辑不修改）
  remarks: string;
  lastEditBy: string;
  lastEditTime: string;
  // 2026-09-28 批次B/C：资质证照 + 经营决策字段（均为可空文本，空串表示未登记）
  pesticideLicenseNo: string;
  pesticideLicenseExpiry: string;
  seedFilingNo: string;
  seedFilingExpiry: string;
  fertilizerRegNo: string;
  fertilizerRegExpiry: string;
  isInternal: string;
  settlementType: string;
  creditDays: string;
  rating: string;
}

export interface NewSupplierData {
  organization: string;
  code: string;
  name: string;
  supplierType: string;
  supplierAttribute: string;
  contact: string;
  mobilePhone: string;
  workPhone: string;
  fax: string;
  country: string;
  province: string;
  city: string;
  address: string;
  status: string;
  bankName: string;
  bankCardNumber: string;
  // 2026-09-28：createDate 不在表单里（提交时自动记当天，见 SupplierAddModal.handleSubmit）
  remarks: string;
  // 2026-09-28 批次B/C：资质证照 + 经营决策
  pesticideLicenseNo: string;
  pesticideLicenseExpiry: string;
  seedFilingNo: string;
  seedFilingExpiry: string;
  fertilizerRegNo: string;
  fertilizerRegExpiry: string;
  isInternal: string;
  settlementType: string;
  creditDays: string;
  rating: string;
}
