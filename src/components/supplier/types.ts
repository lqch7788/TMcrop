export interface SupplierMidCategory {
  code: string;
  name: string;
}

export interface SupplierBigCategory {
  code: string;
  name: string;
  nameEn?: string;
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
  lastEditBy?: string;
  lastEditTime?: string;
}

export interface SupplierFiltersState {
  code: string;
  name: string;
  contact: string;
  type: string;
  status: string;
}

export interface SupplierCodeGenState {
  bigCategory: string;
  midCategory: string;
  generatedCode: string;
}

export interface NewSupplierForm {
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

export interface EditSupplierForm {
  code: string;
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