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
  // 兼容字段（useSupplierStore 使用 — 2026-06-30 tsc 兼容）
  createBy?: string;
  updateBy?: string;
  createTime?: string;
  updateTime?: string;
  rating?: number;
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
  createDate: string;
  remarks: string;
  lastEditBy: string;
  lastEditTime: string;
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
  createDate: string;
  remarks: string;
}
