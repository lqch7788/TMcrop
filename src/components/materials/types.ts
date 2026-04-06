// 物料管理类型定义

export interface WarehouseMaterial {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  price: string;
  supplier: string;
  location: string;
}

export interface InboundRecord {
  id: number;
  code: string;
  materialCode: string;
  materialName: string;
  quantity: string;
  unit: string;
  supplier: string;
  inboundDate: string;
  operator: string;
  status: 'completed' | 'pending';
}

export interface NewInboundForm {
  orderCode: string;
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  materialCode: string;
  materialName: string;
  quantity: string;
  unit: string;
  supplier: string;
  inboundDate: string;
  operator: string;
  remarks: string;
}

export interface CodeGeneratorForm {
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
