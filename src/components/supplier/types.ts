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
  id: number;
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

export interface SupplierFiltersState {
  code: string;
  name: string;
  contact: string;
  type: string;
  status: string;
  supplierAttribute: string;
  organization: string;
  /** 区域级联筛选（方案6.1） */
  province?: string;
  city?: string;
  district?: string;
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
