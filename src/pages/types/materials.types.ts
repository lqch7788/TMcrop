/**
 * 仓库物料数据类型定义
 * 用于 Materials.tsx 页面组件的类型声明
 */

// 物料项
export interface Material {
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

// 入库记录
export interface InboundRecord {
  id: number;
  code: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string;
  inboundDate: string;
  operator: string;
  status: string;
}

// 大类配置
export interface BigCategory {
  code: string;
  name: string;
}

// 中类配置
export interface MidCategory {
  code: string;
  name: string;
}

// 小类配置
export interface SubCategory {
  code: string;
  name: string;
  prefix: string;
}

// 编码规则配置
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

// 新增入库表单数据
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

// 编码生成器状态
export interface CodeGenState {
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  generatedCode: string;
}

// 标签页类型
export type MaterialsTab = 'overview' | 'inbound';

// 筛选器Props
export interface MaterialsFiltersProps {
  code: string;
  name: string;
  category: string;
  supplier: string;
  location: string;
  searchBigCategory: string;
  searchMidCategory: string;
  searchSubCategory: string;
  showLowStock: boolean;
  exportMode: boolean;
  selectedRows: number[];
  filteredMaterials: Material[];
  canExport: boolean;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSearchBigCategoryChange: (value: string) => void;
  onSearchMidCategoryChange: (value: string) => void;
  onSearchSubCategoryChange: (value: string) => void;
  onShowLowStockChange: (value: boolean) => void;
  onReset: () => void;
  onExportClick: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
  onSelectAll: () => void;
}

// 物料表格Props
export interface MaterialsTableProps {
  filteredMaterials: Material[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  exportMode: boolean;
  selectedRows: number[];
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
}

// 入库表格Props
export interface InboundTableProps {
  records: InboundRecord[];
  currentPage: number;
  pageSize: number;
  canCreate: boolean;
  canEdit: boolean;
  can: () => boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onAddClick: () => void;
}

// 新增入库弹窗Props
export interface AddInboundModalProps {
  show: boolean;
  newInbound: NewInboundForm;
  codeError: string;
  nameError: string;
  inboundRecords: InboundRecord[];
  onClose: () => void;
  onSave: () => void;
  onNewInboundChange: (field: string, value: string) => void;
  onGenerateOrderCode: () => void;
  onCheckCodeDuplicate: (code: string) => void;
  onCheckNameDuplicate: (name: string) => void;
}

// 编码生成器Props
export interface MaterialsCodeGeneratorProps {
  codeGen: CodeGenState;
  collapsed: boolean;
  error: string;
  success: string;
  copySuccess: boolean;
  warehouseMaterials: Material[];
  categoryConfig: CategoryConfig;
  onCodeGenChange: (field: string, value: string) => void;
  onGenerate: () => void;
  onVerify: () => void;
  onCopy: () => void;
  onToggleCollapse: () => void;
}

// 导出格式弹窗Props
export interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportFormat: string;
  selectedRowsCount: number;
  onExportFormatChange: (format: string) => void;
  onDoExport: () => void;
}
