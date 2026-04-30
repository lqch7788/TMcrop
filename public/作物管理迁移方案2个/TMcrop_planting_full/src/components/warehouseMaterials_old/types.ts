// 仓库物料类型定义

export interface WarehouseMaterial {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  price: string;
  supplier: string;
  location: string;
  specification: string;
  barcode: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  lastUpdateTime: string;
  dataStatus: '启用' | '停用';
}

export interface InboundMaterial {
  id: number;
  materialCode: string;
  materialName: string;
  category: string;
  specification: string;
  barcode: string;
  unit: string;
  quantity: number;
  price: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
}

export interface InboundRecord {
  id: number;
  code: string;
  inboundDate: string;
  supplier: string;
  operator: string;
  status: 'completed' | 'pending';
  materials: InboundMaterial[];
}

export interface NewInboundForm {
  orderCode: string;
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  materialCode: string;
  materialName: string;
  category: string;
  specification: string;
  barcode: string;
  unit: string;
  quantity: string;
  price: string;
  supplier: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  inboundDate: string;
  operator: string;
  remarks: string;
}

export interface EditForm {
  quantity: number;
  minStock: number;
  maxStock: number;
  price: string;
  supplier: string;
  location: string;
  specification: string;
  barcode: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  lastUpdateTime: string;
  dataStatus: '启用' | '停用';
}

export interface InboundEditForm {
  supplier: string;
  operator: string;
  inboundDate: string;
  status: string;
}

export interface CodeGeneratorState {
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  generatedCode: string;
}

export interface CategoryConfig {
  [key: string]: {
    name: string;
    categories: {
      [key: string]: {
        name: string;
        subCategories: {
          [key: string]: {
            name: string;
            prefix: string;
          };
        };
      };
    };
  };
}

export interface BigCategory {
  code: string;
  name: string;
}

export type TabType = 'overview' | 'inbound';

export interface FilterState {
  code: string;
  name: string;
  category: string;
  supplier: string;
  location: string;
  searchBigCategory: string;
  searchMidCategory: string;
  searchSubCategory: string;
  showLowStock: boolean;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  inboundPage: number;
  inboundPageSize: number;
}
