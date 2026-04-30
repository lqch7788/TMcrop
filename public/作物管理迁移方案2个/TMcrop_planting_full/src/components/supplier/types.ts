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
}

export interface SupplierFiltersState {
  code: string;
  name: string;
  contact: string;
  type: string;
  status: string;
  supplierAttribute: string;
  organization: string;
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
