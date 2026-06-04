import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { MaterialFilters, MaterialFiltersState, filterMaterials, Material } from './MaterialFilters';
import { MaterialsTable } from './MaterialsTable';
import { MaterialDetailModal } from './MaterialDetailModal';
import { MaterialEditModal, MaterialDeleteConfirmModal } from './MaterialEditModal';
import { InboundDetailModal, InboundEditModal, InboundAddModal, InboundDeleteConfirmModal, InboundBatchEditModal } from './InboundModals';
import { MaterialInboundTab, InboundRecord } from './MaterialInboundTab';
import { MaterialBatchEditModal } from './MaterialBatchEditModal';
import { DeleteWarningDialog } from './DeleteWarningDialog';
import { BatchDeleteConfirmDialog } from './BatchDeleteConfirmDialog';
import { MaterialExportModal } from './MaterialExportModal';
import PageHeader from './PageHeader';
import TabSwitch from './TabSwitch';
import ActionToolbar from './ActionToolbar';
import { useAuthPermission } from '../../hooks/usePermission';
import { apiClient, USE_API } from '../../services/apiClient';
import { showAlert } from '@/lib/dialogService';
import { categoryConfig, bigCategoriesList } from '../../types/warehouseInbound.types';

// 仓库物料模块权限代码
const PROC_WAREHOUSE = 'PROC_WAREHOUSE';

// TODO [P2-1]: 移除硬编码Mock数据 - 后端API /materials 完善后替换为API调用
// 当前使用硬编码的13种物料数据，等待后端实现物料管理API
const warehouseMaterials: Material[] = [
  { id: 1, code: 'SP0101001', name: '水稻种子', category: '种质资源-粮食作物种子', unit: '袋', quantity: 200, minStock: 50, maxStock: 500, price: '30元', supplier: '金种子业公司', location: 'A区-01', specification: '25kg/袋', barcode: '6932456789012', batchNo: 'PC20260301', productionDate: '2026-01-15', expiryDate: '2027-01-15', lastUpdateTime: '2026-03-20 10:30:00', dataStatus: '启用' },
  { id: 2, code: 'SP0102001', name: '棉花种子', category: '种质资源-经济作物种子', unit: '袋', quantity: 80, minStock: 30, maxStock: 200, price: '25元', supplier: '丰收种业', location: 'A区-02', specification: '20kg/袋', barcode: '6932456789013', batchNo: 'PC20260220', productionDate: '2026-02-01', expiryDate: '2027-02-01', lastUpdateTime: '2026-03-19 14:20:00', dataStatus: '启用' },
  { id: 3, code: 'SP0103001', name: '番茄种子', category: '种质资源-蔬菜种子', unit: '袋', quantity: 100, minStock: 50, maxStock: 300, price: '25元', supplier: '鑫源农资公司', location: 'A区-03', specification: '10g/袋', barcode: '6932456789014', batchNo: 'PC20260305', productionDate: '2026-02-20', expiryDate: '2026-08-20', lastUpdateTime: '2026-03-18 09:15:00', dataStatus: '启用' },
  { id: 4, code: 'SP0201001', name: '商品有机肥', category: '肥料与土壤改良剂-有机肥', unit: '袋', quantity: 50, minStock: 100, maxStock: 400, price: '45元', supplier: '丰达化肥厂', location: 'B区-01', specification: '40kg/袋', barcode: '6932456789015', batchNo: 'PC20260110', productionDate: '2026-01-10', expiryDate: '2026-07-10', lastUpdateTime: '2026-03-20 08:00:00', dataStatus: '启用' },
  { id: 5, code: 'SP0202001', name: '尿素', category: '肥料与土壤改良剂-化学肥料', unit: '袋', quantity: 150, minStock: 50, maxStock: 500, price: '80元', supplier: '丰达化肥厂', location: 'B区-02', specification: '50kg/袋', barcode: '6932456789016', batchNo: 'PC20260228', productionDate: '2026-02-28', expiryDate: '2028-02-28', lastUpdateTime: '2026-03-17 16:45:00', dataStatus: '启用' },
  { id: 6, code: 'SP0301001', name: '吡虫啉', category: '农药与植保产品-杀虫剂', unit: '箱', quantity: 30, minStock: 20, maxStock: 100, price: '120元', supplier: '绿叶农业用品店', location: 'C区-01', specification: '100g/瓶', barcode: '6932456789017', batchNo: 'PC20251215', productionDate: '2025-12-15', expiryDate: '2027-12-15', lastUpdateTime: '2026-03-16 11:30:00', dataStatus: '启用' },
  { id: 7, code: 'SP0302001', name: '多菌灵', category: '农药与植保产品-杀菌剂', unit: '箱', quantity: 20, minStock: 20, maxStock: 80, price: '150元', supplier: '绿叶农业用品店', location: 'C区-02', specification: '200g/瓶', barcode: '6932456789018', batchNo: 'PC20251120', productionDate: '2025-11-20', expiryDate: '2027-11-20', lastUpdateTime: '2026-03-15 13:20:00', dataStatus: '停用' },
  { id: 8, code: 'EQ0103001', name: '电动喷雾机', category: '农业机械-植保机械', unit: '台', quantity: 10, minStock: 5, maxStock: 30, price: '280元', supplier: '农机设备公司', location: 'D区-01', specification: '3W-16L', barcode: '6932456789019', batchNo: 'EQ20260301', productionDate: '2026-02-15', expiryDate: '2031-02-15', lastUpdateTime: '2026-03-14 10:00:00', dataStatus: '启用' },
  { id: 9, code: 'EQ0306001', name: '滴灌带', category: '灌溉与水肥系统-灌溉终端', unit: '卷', quantity: 500, minStock: 200, maxStock: 1000, price: '25元', supplier: '节水灌溉设备厂', location: 'E区-01', specification: 'D16-2.0L/h', barcode: '6932456789020', batchNo: 'EQ20260125', productionDate: '2026-01-25', expiryDate: '2031-01-25', lastUpdateTime: '2026-03-13 15:30:00', dataStatus: '启用' },
  { id: 10, code: 'OP0102001', name: '劳保胶靴', category: '劳保与防护用品-足部防护', unit: '双', quantity: 40, minStock: 20, maxStock: 100, price: '35元', supplier: '劳保用品商店', location: 'F区-01', specification: '39-43码', barcode: '6932456789021', batchNo: 'OP20260201', productionDate: '2026-02-01', expiryDate: '2028-02-01', lastUpdateTime: '2026-03-12 09:45:00', dataStatus: '启用' },
  { id: 11, code: 'OP0201001', name: '锄头', category: '日常劳动工具-手动农具', unit: '把', quantity: 25, minStock: 10, maxStock: 80, price: '18元', supplier: '五金工具店', location: 'F区-02', specification: '1.2kg', barcode: '6932456789022', batchNo: 'OP20260115', productionDate: '2026-01-15', expiryDate: '2031-01-15', lastUpdateTime: '2026-03-11 14:00:00', dataStatus: '启用' },
  { id: 12, code: 'PH0104001', name: '塑料袋', category: '采收容器-包装材料', unit: '卷', quantity: 200, minStock: 100, maxStock: 500, price: '15元', supplier: '包装材料公司', location: 'G区-01', specification: '50cm*80cm', barcode: '6932456789023', batchNo: 'PH20260210', productionDate: '2026-02-10', expiryDate: '2027-02-10', lastUpdateTime: '2026-03-10 16:20:00', dataStatus: '启用' },
  { id: 13, code: 'IT0101001', name: '土壤温湿度传感器', category: '监测设备-传感器', unit: '个', quantity: 20, minStock: 10, maxStock: 50, price: '150元', supplier: '智慧农业设备商', location: 'H区-01', specification: 'RS485 Modbus', barcode: '6932456789024', batchNo: 'IT20260308', productionDate: '2026-03-08', expiryDate: '2031-03-08', lastUpdateTime: '2026-03-20 17:00:00', dataStatus: '启用' },
];

// TODO [P2-1]: 移除硬编码Mock数据 - 后端API /materials/inbound 完善后替换为API调用
// 当前使用硬编码的12条入库记录，等待后端实现入库记录管理API
const initialInboundRecords: InboundRecord[] = [
  {
    id: 1,
    code: 'RK20260401-001',
    inboundDate: '2026-04-01',
    supplier: '鑫源农资公司',
    operator: '张伟',
    status: 'pending',
    materials: [
      { id: 1, materialCode: 'SP0103001', materialName: '番茄种子', category: '种质资源-蔬菜种子', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种子', specification: '10g/袋', barcode: '6932456789014', unit: '袋', quantity: 100, price: '25', supplier: '鑫源农资公司', location: 'A-03', batchNo: 'PC20260305', productionDate: '2026-02-20', expiryDate: '2026-08-20', remarks: '' },
      { id: 2, materialCode: 'SP0101001', materialName: '水稻种子', category: '种质资源-粮食作物种子', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '粮食作物种子', specification: '25kg/袋', barcode: '6932456789012', unit: '袋', quantity: 200, price: '30', supplier: '鑫源农资公司', location: 'A-01', batchNo: 'PC20260301', productionDate: '2026-01-15', expiryDate: '2027-01-15', remarks: '' },
    ]
  },
  {
    id: 2,
    code: 'RK20260328-002',
    inboundDate: '2026-03-28',
    supplier: '丰达化肥厂',
    operator: '李明',
    status: 'pending',
    materials: [
      { id: 3, materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂-有机肥', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '有机肥', specification: '40kg/袋', barcode: '6932456789015', unit: '袋', quantity: 50, price: '45', supplier: '丰达化肥厂', location: 'B-01', batchNo: 'PC20260110', productionDate: '2026-01-10', expiryDate: '2026-07-10', remarks: '' },
      { id: 4, materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂-化学肥料', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '化学肥料', specification: '50kg/袋', barcode: '6932456789016', unit: '袋', quantity: 150, price: '80', supplier: '丰达化肥厂', location: 'B-02', batchNo: 'PC20260228', productionDate: '2026-02-28', expiryDate: '2028-02-28', remarks: '' },
    ]
  },
  {
    id: 3,
    code: 'RK20260325-003',
    inboundDate: '2026-03-25',
    supplier: '绿叶农业用品店',
    operator: '王建',
    status: 'pending',
    materials: [
      { id: 5, materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品-杀菌剂', bigCategory: '生产投入类', midCategory: '农药与植保产品', subCategory: '杀菌剂', specification: '200g/瓶', barcode: '6932456789018', unit: '瓶', quantity: 20, price: '150', supplier: '绿叶农业用品店', location: 'C-02', batchNo: 'PC20251120', productionDate: '2025-11-20', expiryDate: '2027-11-20', remarks: '' },
      { id: 6, materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品-杀虫剂', bigCategory: '生产投入类', midCategory: '农药与植保产品', subCategory: '杀虫剂', specification: '100g/瓶', barcode: '6932456789017', unit: '瓶', quantity: 30, price: '120', supplier: '绿叶农业用品店', location: 'C-01', batchNo: 'PC20251215', productionDate: '2025-12-15', expiryDate: '2027-12-15', remarks: '' },
    ]
  },
  {
    id: 4,
    code: 'RK20260311-004',
    inboundDate: '2026-03-11',
    supplier: '劳保用品商店',
    operator: '李明',
    status: 'pending',
    materials: [
      { id: 7, materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品-足部防护', bigCategory: '作业支持类', midCategory: '劳保与防护用品', subCategory: '足部防护', specification: '39-43码', barcode: '6932456789021', unit: '双', quantity: 40, price: '35', supplier: '劳保用品商店', location: 'F-01', batchNo: 'OP20260201', productionDate: '2026-02-01', expiryDate: '2028-02-01', remarks: '' },
      { id: 8, materialCode: 'OP0201001', materialName: '锄头', category: '日常劳动工具-手动农具', bigCategory: '作业支持类', midCategory: '日常劳动工具', subCategory: '手动农具', specification: '1.2kg', barcode: '6932456789022', unit: '把', quantity: 25, price: '18', supplier: '劳保用品商店', location: 'F-02', batchNo: 'OP20260115', productionDate: '2026-01-15', expiryDate: '2031-01-15', remarks: '' },
    ]
  },
  {
    id: 5,
    code: 'RK20260402-005',
    inboundDate: '2026-04-02',
    supplier: '华东农机销售中心',
    operator: '张伟',
    status: 'pending',
    materials: [
      { id: 9, materialCode: 'EQ0101001', materialName: '微耕机', category: '农业机械-耕作机械', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '耕作机械', specification: '1WG-4.0', barcode: '6932456789030', unit: '台', quantity: 5, price: '3200', supplier: '华东农机销售中心', location: 'D-01', batchNo: 'EQ20260401', productionDate: '2026-03-15', expiryDate: '2031-03-15', remarks: '' },
      { id: 10, materialCode: 'EQ0102001', materialName: '播种机', category: '农业机械-播种/移栽设备', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '播种/移栽设备', specification: '2BX-6', barcode: '6932456789031', unit: '台', quantity: 3, price: '5600', supplier: '华东农机销售中心', location: 'D-02', batchNo: 'EQ20260402', productionDate: '2026-03-20', expiryDate: '2031-03-20', remarks: '' },
    ]
  },
  {
    id: 6,
    code: 'RK20260403-006',
    inboundDate: '2026-04-03',
    supplier: '蔬菜种苗培育基地',
    operator: '赵敏',
    status: 'pending',
    materials: [
      { id: 11, materialCode: 'SP0104001', materialName: '辣椒种苗', category: '种质资源-蔬菜种苗', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种苗', specification: '100株/箱', barcode: '6932456789040', unit: '箱', quantity: 50, price: '80', supplier: '蔬菜种苗培育基地', location: 'A-04', batchNo: 'SP20260401', productionDate: '2026-03-25', expiryDate: '2026-05-25', remarks: '' },
      { id: 12, materialCode: 'SP0104002', materialName: '茄子种苗', category: '种质资源-蔬菜种苗', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种苗', specification: '100株/箱', barcode: '6932456789041', unit: '箱', quantity: 40, price: '75', supplier: '蔬菜种苗培育基地', location: 'A-05', batchNo: 'SP20260402', productionDate: '2026-03-26', expiryDate: '2026-05-26', remarks: '' },
    ]
  },
  {
    id: 7,
    code: 'RK20260320-007',
    inboundDate: '2026-03-20',
    supplier: '农机设备公司',
    operator: '张伟',
    status: 'completed',
    materials: [
      { id: 13, materialCode: 'EQ0103001', materialName: '电动喷雾器', category: '农业机械-植保机械', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '植保机械', specification: '3W-16L', barcode: '6932456789019', unit: '台', quantity: 10, price: '280', supplier: '农机设备公司', location: 'D-01', batchNo: 'EQ20260301', productionDate: '2026-02-15', expiryDate: '2031-02-15', remarks: '' },
      { id: 14, materialCode: 'EQ0306001', materialName: '滴灌带', category: '灌溉与水肥系统-灌溉终端', bigCategory: '设施与装备类', midCategory: '灌溉与水肥系统', subCategory: '灌溉终端', specification: 'D16-2.0L/h', barcode: '6932456789020', unit: '卷', quantity: 500, price: '25', supplier: '农机设备公司', location: 'E-01', batchNo: 'EQ20260125', productionDate: '2026-01-25', expiryDate: '2031-01-25', remarks: '' },
    ]
  },
  {
    id: 8,
    code: 'RK20260315-008',
    inboundDate: '2026-03-15',
    supplier: '包装材料公司',
    operator: '王建',
    status: 'completed',
    materials: [
      { id: 15, materialCode: 'PH0104001', materialName: '塑料袋', category: '采收容器-包装材料', bigCategory: '采后处理与流通类', midCategory: '包装材料', subCategory: '包装材料', specification: '50cm*80cm', barcode: '6932456789023', unit: '个', quantity: 200, price: '15', supplier: '包装材料公司', location: 'G-01', batchNo: 'PH20260210', productionDate: '2026-02-10', expiryDate: '2027-02-10', remarks: '' },
      { id: 16, materialCode: 'PH0105001', materialName: '纸箱', category: '采收容器-纸箱', bigCategory: '采后处理与流通类', midCategory: '包装材料', subCategory: '纸箱', specification: '40cm*30cm*20cm', barcode: '6932456789027', unit: '个', quantity: 150, price: '12', supplier: '包装材料公司', location: 'G-02', batchNo: 'PH20260301', productionDate: '2026-03-01', expiryDate: '2027-03-01', remarks: '' },
    ]
  },
  {
    id: 9,
    code: 'RK20260312-009',
    inboundDate: '2026-03-12',
    supplier: '丰和复合肥厂',
    operator: '李明',
    status: 'completed',
    materials: [
      { id: 17, materialCode: 'SP0203001', materialName: '水溶肥', category: '肥料与土壤改良剂-水溶肥', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '水溶肥', specification: '5kg/袋', barcode: '6932456789028', unit: '袋', quantity: 100, price: '65', supplier: '丰和复合肥厂', location: 'B-03', batchNo: 'SP020301', productionDate: '2026-03-01', expiryDate: '2028-03-01', remarks: '' },
    ]
  },
  {
    id: 10,
    code: 'RK20260309-010',
    inboundDate: '2026-03-09',
    supplier: '智慧农业设备厂',
    operator: '张伟',
    status: 'voided',
    voidedDate: '2026-03-10',
    materials: [
      { id: 18, materialCode: 'IT0101001', materialName: '土壤温湿度传感器', category: '监测设备-传感器', bigCategory: '数字化与管理类', midCategory: '监测设备', subCategory: '传感器', specification: 'RS485 Modbus', barcode: '6932456789024', unit: '个', quantity: 20, price: '150', supplier: '智慧农业设备厂', location: 'H-01', batchNo: 'IT20260308', productionDate: '2026-03-08', expiryDate: '2031-03-08', remarks: '' },
    ]
  },
  {
    id: 11,
    code: 'RK20260308-011',
    inboundDate: '2026-03-08',
    supplier: '塑料制品厂',
    operator: '李明',
    status: 'voided',
    voidedDate: '2026-03-10',
    materials: [
      { id: 19, materialCode: 'PH0201001', materialName: '塑料筐', category: '采收容器-周转箱', bigCategory: '采后处理与流通类', midCategory: '周转箱', subCategory: '周转箱', specification: '60cm*40cm*30cm', barcode: '6932456789025', unit: '个', quantity: 100, price: '22', supplier: '塑料制品厂', location: 'G-02', batchNo: 'PH20260301', productionDate: '2026-03-01', expiryDate: '2027-03-01', remarks: '' },
    ]
  },
  {
    id: 12,
    code: 'RK20260307-012',
    inboundDate: '2026-03-07',
    supplier: '金属制品厂',
    operator: '王建',
    status: 'voided',
    voidedDate: '2026-03-09',
    materials: [
      { id: 20, materialCode: 'TK0101001', materialName: '塑料托盘', category: '仓储设备-托盘', bigCategory: '仓储设备', midCategory: '托盘', subCategory: '托盘', specification: '1200mm*1000mm', barcode: '6932456789026', unit: '个', quantity: 50, price: '180', supplier: '金属制品厂', location: 'H-02', batchNo: 'TK20260220', productionDate: '2026-02-20', expiryDate: '2031-02-20', remarks: '' },
    ]
  },
];

const initialFilters: MaterialFiltersState = {
  code: '',
  name: '',
  category: '全部',
  supplier: '',
  location: '',
  searchBigCategory: '',
  searchMidCategory: '',
  searchSubCategory: '',
  showLowStock: false,
};

export default function WarehouseMaterialsPage() {
  const navigate = useNavigate();

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  const [activeTab, setActiveTab] = useState<'overview' | 'inbound'>('inbound');
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
  const [codeGen, setCodeGen] = useState({ bigCategory: '', midCategory: '', subCategory: '', generatedCode: '' });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [filters, setFilters] = useState<MaterialFiltersState>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [batchEditedMaterials, setBatchEditedMaterials] = useState<Record<number, any>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);
  const [showInboundDetailModal, setShowInboundDetailModal] = useState(false);
  const [showInboundEditModal, setShowInboundEditModal] = useState(false);
  const [showInboundAddModal, setShowInboundAddModal] = useState(false);
  const [showInboundDeleteModal, setShowInboundDeleteModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedInboundRecord, setSelectedInboundRecord] = useState<InboundRecord | null>(null);
  const [selectedInboundRecords, setSelectedInboundRecords] = useState<InboundRecord[]>([]);
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);
  const [warehouseData, setWarehouseData] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 从 API 加载物料数据
  // TODO [P2-1]: 静默降级逻辑 - 后端API完善后应移除降级到Mock的逻辑，统一使用API
  useEffect(() => {
    const loadMaterialData = async () => {
      setIsLoading(true);
      try {
        if (USE_API) {
          // 尝试从 API 获取物料数据
          const materialsData = await apiClient.get<Material[]>('/materials');
          if (materialsData && materialsData.length > 0) {
            setWarehouseData(materialsData);
          } else {
            // TODO [P2-1]: 后端API /materials 已上线但返回空数据，需确认API是否正确实现
            setWarehouseData(warehouseMaterials);
          }
        } else {
          // 非 API 模式，检查是否后端已实现
          try {
            const materialsData = await apiClient.get<Material[]>('/materials');
            if (materialsData && materialsData.length > 0) {
              setWarehouseData(materialsData);
            } else {
              // TODO [P2-1]: 后端API /materials 已上线但返回空数据，需确认API是否正确实现
              setWarehouseData(warehouseMaterials);
            }
          } catch {
            // API 不可用，使用 mock 数据
            // TODO [P2-1]: 后端API /materials 未实现或不可访问，等待后端实现
            setWarehouseData(warehouseMaterials);
          }
        }

        // 同样加载入库记录
        try {
          if (USE_API) {
            const inboundData = await apiClient.get<InboundRecord[]>('/materials/inbound');
            if (inboundData && inboundData.length > 0) {
              setInboundRecords(inboundData);
            } else {
              // TODO [P2-1]: 后端API /materials/inbound 已上线但返回空数据，需确认API是否正确实现
              setInboundRecords(initialInboundRecords);
            }
          } else {
            // TODO [P2-1]: 非API模式下使用Mock数据，后端API完善后可切换到API模式
            setInboundRecords(initialInboundRecords);
          }
        } catch {
          // TODO [P2-1]: 后端API /materials/inbound 未实现或不可访问，等待后端实现
          setInboundRecords(initialInboundRecords);
        }
      } catch (error) {
        // logger.error('加载物料数据失败，使用 mock 数据:', error);
        setWarehouseData(warehouseMaterials);
        setInboundRecords(initialInboundRecords);
      } finally {
        setIsLoading(false);
      }
    };

    loadMaterialData();
  }, []);

  const lowStockCount = warehouseData.filter(m => m.quantity < m.minStock).length;
  const filteredMaterials = filterMaterials(warehouseData, filters);

  const handleFiltersChange = (newFilters: MaterialFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleCodeGen = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
      setCodeGenError('请选择完整的分类');
      setCodeGenSuccess('');
      return;
    }
    const baseCode = `${codeGen.bigCategory}${codeGen.midCategory}${codeGen.subCategory}`;
    const seq = Math.floor(Math.random() * 999) + 1;
    const generatedCode = `${baseCode}${String(seq).padStart(3, '0')}`;
    setCodeGen(prev => ({ ...prev, generatedCode }));
    setCodeGenSuccess(`生成成功: ${generatedCode}`);
    setCodeGenError('');
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredMaterials.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredMaterials.map(m => m.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelSelection = () => {
    setExportMode(false);
    setBatchEditMode(false);
    setDeleteMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    setShowExportModal(true);
  };

  const handleDoExport = async () => {
    const selectedData = filteredMaterials.filter(m => selectedRows.includes(m.id));
    const exportData = selectedData.map(m => ({
      '物料编号': m.code,
      '物料名称': m.name,
      '分类': m.category,
      '规格型号': m.specification,
      '条形码': m.barcode,
      '单位': m.unit,
      '库存数量': m.quantity,
      '最低库存': m.minStock,
      '最高库存': m.maxStock,
      '单价': m.price,
      '供应商': m.supplier,
      '存放位置': m.location,
      '批次号': m.batchNo,
      '生产日期': m.productionDate,
      '有效期至': m.expiryDate,
      '最后更新时间': m.lastUpdateTime,
      '数据状态': m.dataStatus,
    }));

    if (exportFormat === 'csv') {
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row => Object.values(row).join(','));
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `物料导出_${new Date().toLocaleDateString()}.csv`;
      link.click();
    } else {
      await showAlert(`已选择导出为 ${exportFormat.toUpperCase()} 格式，共 ${selectedData.length} 条数据`);
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleView = (material: Material) => {
    setSelectedMaterial(material);
    setShowDetailModal(true);
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setShowEditModal(true);
  };

  const handleDelete = (material: Material) => {
    setSelectedMaterial(material);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    // 删除物料：从仓库数据中移除选中的物料
    setWarehouseData(prev => prev.filter(m => m.id !== selectedMaterial?.id));
    setShowDeleteModal(false);
    setSelectedMaterial(null);
  };

  const handleSaveEdit = (material: Material) => {
    // 保存编辑后的物料数据
    setWarehouseData(prev => prev.map(m => m.id === material.id ? material : m));
    setShowEditModal(false);
    setSelectedMaterial(null);
  };

  const handleViewRecord = (record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundDetailModal(true);
  };

  const handleEditRecord = (record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundEditModal(true);
  };

  const handleDeleteRecord = (record: InboundRecord) => {
    setSelectedInboundRecords([record]);
    setShowInboundDeleteModal(true);
  };

  const handleBatchDeleteRecords = (records: InboundRecord[]) => {
    setSelectedInboundRecords(records);
    setShowInboundDeleteModal(true);
  };

  const handleConfirmInboundDelete = () => {
    if (selectedInboundRecords.length > 0) {
      const idsToDelete = selectedInboundRecords.map(r => r.id);
      setInboundRecords(prev => prev.filter(r => !idsToDelete.includes(r.id)));
    }
    setShowInboundDeleteModal(false);
    setSelectedInboundRecords([]);
  };

  const handleSaveInboundEdit = (record: InboundRecord) => {
    // 保存编辑后的入库记录
    setInboundRecords(prev => prev.map(r => r.id === record.id ? record : r));
    setShowInboundEditModal(false);
    setSelectedInboundRecord(null);
  };

  const handleBatchSaveRecord = (records: InboundRecord[]) => {
    setInboundRecords(prev => {
      const idsToUpdate = records.map(r => r.id);
      const otherRecords = prev.filter(r => !idsToUpdate.includes(r.id));
      return [...otherRecords, ...records];
    });
    setShowInboundEditModal(false);
  };

  const handleAddRecord = () => {
    // 打开新增入库记录弹窗
    setShowInboundAddModal(true);
  };

  const generateSequentialOrderCode = (): string => {
    const today = new Date().toISOString().split('T')[0];
    const todayPrefix = `RK${today.replace(/-/g, '')}-`;
    const todayRecords = inboundRecords.filter(r => r.code.startsWith(todayPrefix));
    
    let maxSeq = 0;
    todayRecords.forEach(r => {
      const seqStr = r.code.replace(todayPrefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });
    
    const newSeq = maxSeq + 1;
    if (newSeq > 9999) {
      // 序号超过上限，返回错误提示
      return `${todayPrefix}9999-WARN`;
    }
    
    return `${todayPrefix}${String(newSeq).padStart(4, '0')}`;
  };

  const handleSaveNewInbound = async (record: Omit<InboundRecord, 'id'>) => {
    try {
      // 调用后端API持久化入库记录
      const newId = await apiClient.post<number>('/materials/inbound', record);
      const newRecord: InboundRecord = {
        ...record,
        id: newId,
      };
      setInboundRecords(prev => [newRecord, ...prev]);
      setShowInboundAddModal(false);
    } catch (error) {
      // logger.error('保存入库记录失败:', error);
      await showAlert('保存入库记录失败，请重试');
    }
  };

  // ActionToolbar callbacks
  const handleLowStockToggle = () => setFilters(prev => ({ ...prev, showLowStock: !prev.showLowStock }));
  const handleBatchEditClick = () => setBatchEditMode(true);
  const handleDeleteWarning = () => setShowDeleteWarning(true);
  const handleExport = () => handleExportClick();
  const handleConfirmBatchEdit = () => {
    if (selectedRows.length === 1) {
      const material = filteredMaterials.find(m => m.id === selectedRows[0]);
      if (material) {
        setSelectedMaterial(material);
        setShowEditModal(true);
        setBatchEditMode(false);
        setSelectedRows([]);
      }
    } else {
      setShowBatchEditModal(true);
    }
  };
  const handleCancelBatchEdit = () => { setBatchEditMode(false); setSelectedRows([]); };
  const handleConfirmBatchDelete = () => {
    setShowBatchDeleteConfirm(true);
  };
  const handleCancelDelete = () => { setDeleteMode(false); setSelectedRows([]); };
  const handleConfirmExportClick = () => handleConfirmExport();
  const handleCancelExport = () => { setExportMode(false); setSelectedRows([]); };

  return (
    <div className="space-y-6">
      <PageHeader title="仓库物料" subtitle="仓库物料库存管理" />

      <TabSwitch
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showCodeGen={activeTab === 'inbound'}
        codeGenExpanded={codeGenExpanded}
        onCodeGenToggle={() => setCodeGenExpanded(!codeGenExpanded)}
        onCodeRuleClick={() => navigate('/code-rule')}
      />

      {activeTab === 'overview' && (
        <>
          <MaterialFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            lowStockCount={lowStockCount}
            onLowStockClick={() => setFilters(prev => ({ ...prev, showLowStock: !prev.showLowStock }))}
            categoryConfig={categoryConfig}
          />

          {/* 表头行：标题 + 操作按钮 */}
          <ActionToolbar
            title="物料库存"
            batchEditMode={batchEditMode}
            deleteMode={deleteMode}
            exportMode={exportMode}
            selectedRows={selectedRows}
            lowStockCount={lowStockCount}
            filters={filters}
            onLowStockToggle={handleLowStockToggle}
            onBatchEdit={handleBatchEditClick}
            onDelete={handleDeleteWarning}
            onExport={handleExport}
            onConfirmBatchEdit={handleConfirmBatchEdit}
            onCancelBatchEdit={handleCancelBatchEdit}
            onConfirmDelete={handleConfirmBatchDelete}
            onCancelDelete={handleCancelDelete}
            onConfirmExport={handleConfirmExportClick}
            onCancelExport={handleCancelExport}
            canEdit={canEdit}
            canDelete={canDelete}
            canExport={canExport}
          />

          <MaterialsTable
            materials={filteredMaterials}
            currentPage={currentPage}
            pageSize={pageSize}
            selectedRows={selectedRows}
            exportMode={exportMode}
            batchEditMode={batchEditMode}
            deleteMode={deleteMode}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCancelSelection={handleCancelSelection}
            onConfirmExport={handleConfirmExport}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            canExport={canExport}
          />
        </>
      )}

      {/* 编码规则生成器 */}
      {activeTab === 'inbound' && codeGenExpanded && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-1">
              <Label className="block text-sm font-medium text-gray-700 mb-1">大类</Label>
              <Select
                value={codeGen.bigCategory}
                onValueChange={(val) => setCodeGen(prev => ({ ...prev, bigCategory: val, midCategory: '', subCategory: '', generatedCode: '' }))}
              >
                <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {bigCategoriesList.map((cat) => (
                    <SelectItem key={cat.code} value={cat.code}>{cat.code}-{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="block text-sm font-medium text-gray-700 mb-1">中类</Label>
              <Select
                value={codeGen.midCategory}
                onValueChange={(val) => setCodeGen(prev => ({ ...prev, midCategory: val, subCategory: '', generatedCode: '' }))}
                disabled={!codeGen.bigCategory}
              >
                <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {categoryConfig[codeGen.bigCategory]?.categories && Object.entries(categoryConfig[codeGen.bigCategory].categories).map(([code, cat]) => (
                    <SelectItem key={code} value={code}>{code}-{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="block text-sm font-medium text-gray-700 mb-1">小类</Label>
              <Select
                value={codeGen.subCategory}
                onValueChange={(val) => setCodeGen(prev => ({ ...prev, subCategory: val, generatedCode: '' }))}
                disabled={!codeGen.midCategory}
              >
                <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {codeGen.bigCategory && codeGen.midCategory && categoryConfig[codeGen.bigCategory]?.categories[codeGen.midCategory]?.subCategories && Object.entries(categoryConfig[codeGen.bigCategory].categories[codeGen.midCategory].subCategories).map(([code, sub]) => (
                    <SelectItem key={code} value={code}>{code}-{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                生成编码
                {codeGenSuccess && !codeGenError && (
                  <span className="ml-2 text-sm text-green-600 font-normal">{codeGenSuccess}</span>
                )}
                {codeGenError && (
                  <span className="ml-2 text-sm text-red-600 font-normal">{codeGenError}</span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={codeGen.generatedCode}
                  placeholder="点击生成"
                  className="w-40 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
                  readOnly
                />
                <Button
                  size="sm"
                  onClick={handleCodeGen}
                  disabled={!codeGen.subCategory}
                >
                  生成
                </Button>
                <Button
                  size="sm"
                  variant="blue"
                  onClick={() => {
                    if (codeGen.generatedCode) {
                      navigator.clipboard.writeText(codeGen.generatedCode);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }
                  }}
                  disabled={!codeGen.generatedCode}
                >
                  {copySuccess ? '已复制!' : '复制'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCodeGen({ bigCategory: '', midCategory: '', subCategory: '', generatedCode: '' })}
                >
                  重置
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inbound' && (
        <MaterialInboundTab
          records={inboundRecords}
          categoryConfig={categoryConfig}
          page={inboundPage}
          pageSize={inboundPageSize}
          onPageChange={setInboundPage}
          onPageSizeChange={setInboundPageSize}
          onViewRecord={handleViewRecord}
          onEditRecord={handleEditRecord}
          onDeleteRecord={handleDeleteRecord}
          onBatchDeleteRecords={handleBatchDeleteRecords}
          onBatchSaveRecord={handleBatchSaveRecord}
          onAddRecord={handleAddRecord}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          canExport={canExport}
        />
      )}

      <MaterialDetailModal
        material={selectedMaterial}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

      <MaterialEditModal
        material={selectedMaterial}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />

      <MaterialDeleteConfirmModal
        material={selectedMaterial}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />

      <InboundDetailModal
        record={selectedInboundRecord}
        isOpen={showInboundDetailModal}
        onClose={() => setShowInboundDetailModal(false)}
      />

      <InboundEditModal
        record={selectedInboundRecord}
        isOpen={showInboundEditModal}
        onClose={() => setShowInboundEditModal(false)}
        onSave={handleSaveInboundEdit}
      />

      <InboundAddModal
        isOpen={showInboundAddModal}
        onClose={() => setShowInboundAddModal(false)}
        onSave={handleSaveNewInbound}
        onGenerateCode={generateSequentialOrderCode}
      />

      <InboundDeleteConfirmModal
        records={selectedInboundRecords}
        isOpen={showInboundDeleteModal}
        onClose={() => setShowInboundDeleteModal(false)}
        onConfirm={handleConfirmInboundDelete}
      />

      <DeleteWarningDialog
        isOpen={showDeleteWarning}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={() => {
          setShowDeleteWarning(false);
          setDeleteMode(true);
        }}
      />

      <BatchDeleteConfirmDialog
        isOpen={showBatchDeleteConfirm}
        selectedMaterials={filteredMaterials.filter(m => selectedRows.includes(m.id))}
        onClose={() => { setShowBatchDeleteConfirm(false); setDeleteMode(false); setSelectedRows([]); }}
        onConfirm={() => {
          setWarehouseData(prev => prev.filter(m => !selectedRows.includes(m.id)));
          setShowBatchDeleteConfirm(false);
          setDeleteMode(false);
          setSelectedRows([]);
        }}
      />

      <MaterialBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        filteredMaterials={filteredMaterials}
        batchEditedMaterials={batchEditedMaterials}
        currentBatchEditIndex={currentBatchEditIndex}
        onClose={() => { setShowBatchEditModal(false); setBatchEditedMaterials({}); setCurrentBatchEditIndex(0); }}
        onMaterialSelect={(idx) => setCurrentBatchEditIndex(idx)}
        onFieldChange={(materialId, field, value) => {
          const currentMaterial = filteredMaterials.find(m => m.id === materialId);
          const currentData = batchEditedMaterials[materialId] || currentMaterial || {};
          setBatchEditedMaterials({
            ...batchEditedMaterials,
            [materialId]: { ...currentData, [field]: value }
          });
        }}
        onSaveAll={() => {
          // 批量保存所有编辑的物料数据
          setWarehouseData(prev => {
            const editedIds = Object.keys(batchEditedMaterials).map(id => parseInt(id));
            return prev.map(m => {
              const edited = batchEditedMaterials[m.id];
              return edited ? { ...m, ...edited } : m;
            });
          });
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
          setBatchEditedMaterials({});
          setCurrentBatchEditIndex(0);
        }}
        onNext={() => {
          const nextIndex = currentBatchEditIndex + 1;
          if (nextIndex < selectedRows.length) {
            setCurrentBatchEditIndex(nextIndex);
          } else {
            setCurrentBatchEditIndex(0);
          }
        }}
      />

      <MaterialExportModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onClose={() => setShowExportModal(false)}
        onFormatChange={setExportFormat}
        onExport={handleDoExport}
      />
    </div>
  );
}
