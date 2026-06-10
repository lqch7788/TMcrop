/**
 * 仓库物料数据管理 Hook
 * 封装 Materials.tsx 的状态管理和业务逻辑
 */
import { useState, useMemo, useCallback } from 'react';
import { useAuthPermission } from '../../hooks/usePermission';
import { todayLocal } from '@/lib/dateUtils';
import type {
  Material,
  InboundRecord,
  CategoryConfig,
  NewInboundForm,
  CodeGenState,
  MaterialsTab
} from '../types/materials.types';

// 初始物料数据
const INITIAL_MATERIALS: Material[] = [
  { id: 1, code: 'SP0101001', name: '水稻种子', category: '种质资源-粮食作物种子', unit: '袋', quantity: 200, minStock: 50, price: '30元', supplier: '金种子业公司', location: 'A区-01' },
  { id: 2, code: 'SP0102001', name: '棉花种子', category: '种质资源-经济作物种子', unit: '袋', quantity: 80, minStock: 30, price: '25元', supplier: '丰收种业', location: 'A区-02' },
  { id: 3, code: 'SP0103001', name: '番茄种子', category: '种质资源-蔬菜种子', unit: '袋', quantity: 100, minStock: 50, price: '25元', supplier: '鑫源农资公司', location: 'A区-03' },
  { id: 4, code: 'SP0201001', name: '商品有机肥', category: '肥料与土壤改良剂-有机肥', unit: '袋', quantity: 50, minStock: 100, price: '45元', supplier: '丰达化肥厂', location: 'B区-01' },
  { id: 5, code: 'SP0202001', name: '尿素', category: '肥料与土壤改良剂-化学肥料', unit: '袋', quantity: 150, minStock: 50, price: '80元', supplier: '丰达化肥厂', location: 'B区-02' },
  { id: 6, code: 'SP0301001', name: '吡虫啉', category: '农药与植保产品-杀虫剂', unit: '箱', quantity: 30, minStock: 20, price: '120元', supplier: '绿叶农业用品店', location: 'C区-01' },
  { id: 7, code: 'SP0302001', name: '多菌灵', category: '农药与植保产品-杀菌剂', unit: '箱', quantity: 20, minStock: 20, price: '150元', supplier: '绿叶农业用品店', location: 'C区-02' },
  { id: 8, code: 'EQ0103001', name: '电动喷雾机', category: '农业机械-植保机械', unit: '台', quantity: 10, minStock: 5, price: '280元', supplier: '农机设备公司', location: 'D区-01' },
  { id: 9, code: 'EQ0306001', name: '滴灌带', category: '灌溉与水肥系统-灌溉终端', unit: '卷', quantity: 500, minStock: 200, price: '25元', supplier: '节水灌溉设备厂', location: 'E区-01' },
  { id: 10, code: 'OP0102001', name: '劳保胶靴', category: '劳保与防护用品-足部防护', unit: '双', quantity: 40, minStock: 20, price: '35元', supplier: '劳保用品商店', location: 'F区-01' },
  { id: 11, code: 'OP0201001', name: '锄头', category: '日常劳动工具-手动农具', unit: '把', quantity: 25, minStock: 10, price: '18元', supplier: '五金工具店', location: 'F区-02' },
  { id: 12, code: 'PH0104001', name: '塑料袋', category: '采收容器-包装材料', unit: '卷', quantity: 200, minStock: 100, price: '15元', supplier: '包装材料公司', location: 'G区-01' },
  { id: 13, code: 'IT0101001', name: '土壤温湿度传感器', category: '监测设备-传感器', unit: '个', quantity: 20, minStock: 10, price: '150元', supplier: '智慧农业设备商', location: 'H区-01' },
];

// 初始入库记录
const INITIAL_INBOUND_RECORDS: InboundRecord[] = [
  { id: 1, code: 'RK20260315-001', materialCode: 'SP0103001', materialName: '番茄种子', quantity: 100, unit: '袋', supplier: '鑫源农资公司', inboundDate: '2026-03-15', operator: '张伟民', status: 'completed' },
  { id: 2, code: 'RK20260314-002', materialCode: 'SP0201001', materialName: '商品有机肥', quantity: 50, unit: '袋', supplier: '丰达化肥厂', inboundDate: '2026-03-14', operator: '李明轩', status: 'completed' },
  { id: 3, code: 'RK20260313-003', materialCode: 'SP0302001', materialName: '多菌灵', quantity: 20, unit: '箱', supplier: '绿叶农业用品店', inboundDate: '2026-03-13', operator: '王建国', status: 'completed' },
  { id: 4, code: 'RK20260312-004', materialCode: 'SP0101001', materialName: '水稻种子', quantity: 200, unit: '袋', supplier: '金种子业公司', inboundDate: '2026-03-12', operator: '张伟民', status: 'completed' },
  { id: 5, code: 'RK20260311-005', materialCode: 'SP0102001', materialName: '棉花种子', quantity: 80, unit: '袋', supplier: '丰收种业', inboundDate: '2026-03-11', operator: '李明轩', status: 'completed' },
  { id: 6, code: 'RK20260310-006', materialCode: 'SP0202001', materialName: '尿素', quantity: 150, unit: '袋', supplier: '丰达化肥厂', inboundDate: '2026-03-10', operator: '王建国', status: 'completed' },
  { id: 7, code: 'RK20260309-007', materialCode: 'SP0301001', materialName: '吡虫啉', quantity: 30, unit: '箱', supplier: '绿叶农业用品店', inboundDate: '2026-03-09', operator: '张伟民', status: 'completed' },
  { id: 8, code: 'RK20260308-008', materialCode: 'EQ0103001', materialName: '电动喷雾机', quantity: 10, unit: '台', supplier: '农机设备公司', inboundDate: '2026-03-08', operator: '李明轩', status: 'completed' },
  { id: 9, code: 'RK20260307-009', materialCode: 'EQ0306001', materialName: '滴灌带', quantity: 500, unit: '卷', supplier: '节水灌溉设备厂', inboundDate: '2026-03-07', operator: '王建国', status: 'completed' },
  { id: 10, code: 'RK20260306-010', materialCode: 'OP0102001', materialName: '劳保胶靴', quantity: 40, unit: '双', supplier: '劳保用品商店', inboundDate: '2026-03-06', operator: '张伟民', status: 'completed' },
  { id: 11, code: 'RK20260305-011', materialCode: 'OP0201001', materialName: '锄头', quantity: 25, unit: '把', supplier: '五金工具店', inboundDate: '2026-03-05', operator: '李明轩', status: 'completed' },
  { id: 12, code: 'RK20260304-012', materialCode: 'PH0104001', materialName: '塑料袋', quantity: 200, unit: '卷', supplier: '包装材料公司', inboundDate: '2026-03-04', operator: '王建国', status: 'completed' },
  { id: 13, code: 'RK20260303-013', materialCode: 'IT0101001', materialName: '土壤温湿度传感器', quantity: 20, unit: '个', supplier: '智慧农业设备商', inboundDate: '2026-03-03', operator: '张伟民', status: 'completed' },
];

// 大类选项
const BIG_CATEGORIES = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

// 编码规则配置
const CATEGORY_CONFIG: CategoryConfig = {
  'SP': {
    name: '生产投入类',
    categories: {
      '01': { name: '种质资源', subCategories: { '01': { name: '粮食作物种子', prefix: 'SP0101' }, '02': { name: '经济作物种子', prefix: 'SP0102' }, '03': { name: '蔬菜种子', prefix: 'SP0103' } } },
      '02': { name: '肥料与土壤改良剂', subCategories: { '01': { name: '有机肥', prefix: 'SP0201' }, '02': { name: '化学肥料', prefix: 'SP0202' } } },
      '03': { name: '农药与植保产品', subCategories: { '01': { name: '杀虫剂', prefix: 'SP0301' }, '02': { name: '杀菌剂', prefix: 'SP0302' } } },
    },
  },
  'EQ': {
    name: '设施与装备类',
    categories: {
      '01': { name: '农业机械', subCategories: { '03': { name: '植保机械', prefix: 'EQ0103' } } },
      '03': { name: '灌溉与水肥系统', subCategories: { '06': { name: '灌溉终端', prefix: 'EQ0306' } } },
    },
  },
  'OP': {
    name: '作业支持类',
    categories: {
      '01': { name: '劳保与防护用品', subCategories: { '02': { name: '足部防护', prefix: 'OP0102' } } },
      '02': { name: '日常劳动工具', subCategories: { '01': { name: '手动农具', prefix: 'OP0201' } } },
    },
  },
  'PH': {
    name: '采后处理与流通类',
    categories: {
      '01': { name: '采收容器', subCategories: { '04': { name: '包装材料', prefix: 'PH0104' } } },
    },
  },
  'IT': {
    name: '数字化与管理类',
    categories: {
      '01': { name: '监测设备', subCategories: { '01': { name: '传感器', prefix: 'IT0101' } } },
    },
  },
};

// 初始新增入库表单
const INITIAL_NEW_INBOUND: NewInboundForm = {
  orderCode: '',
  bigCategory: '',
  midCategory: '',
  subCategory: '',
  materialCode: '',
  materialName: '',
  quantity: '',
  unit: '袋',
  supplier: '',
  inboundDate: '',
  operator: '',
  remarks: '',
};

/**
 * 仓库物料数据管理 Hook
 */
export function useMaterials() {
  // 标签页状态
  const [activeTab, setActiveTab] = useState<MaterialsTab>('overview');

  // 筛选状态
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('全部');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [searchBigCategory, setSearchBigCategory] = useState('');
  const [searchMidCategory, setSearchMidCategory] = useState('');
  const [searchSubCategory, setSearchSubCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(10);

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);

  // 导出模式状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 新增入库表单状态
  const [newInbound, setNewInbound] = useState<NewInboundForm>(INITIAL_NEW_INBOUND);
  const [codeError, setCodeError] = useState('');
  const [nameError, setNameError] = useState('');

  // 编码生成器状态
  const [codeGen, setCodeGen] = useState<CodeGenState>({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [codeGenCollapsed, setCodeGenCollapsed] = useState(true);

  // 权限 - 使用 useAuthPermission hook（保持与系统权限控制一致）
  const { can } = useAuthPermission();
  const canCreate = can('materials:warehouse:create', 'create');
  const canEdit = can('materials:warehouse:edit', 'edit');
  const canDelete = can('materials:warehouse:delete', 'delete');
  const canExport = can('materials:warehouse:export', 'export');

  // 静态数据
  const warehouseMaterials = INITIAL_MATERIALS;
  const inboundRecords = INITIAL_INBOUND_RECORDS;
  const categoryConfig = CATEGORY_CONFIG;
  const bigCategories = BIG_CATEGORIES;

  // 筛选后的物料数据
  const filteredMaterials = useMemo(() => {
    return warehouseMaterials.filter(m => {
      if (code && !m.code.includes(code)) return false;
      if (name && !m.name.includes(name)) return false;
      if (supplier && m.supplier !== supplier) return false;
      if (location && m.location !== location) return false;
      if (category !== '全部') {
        const categoryMap: Record<string, string> = {
          '种子种苗': '种质资源',
          '肥料': '肥料与土壤改良剂',
          '农药': '农药与植保产品',
          '农膜': '设施农业系统',
        };
        if (!m.category.includes(categoryMap[category] || category)) return false;
      }
      if (searchBigCategory && !m.code.startsWith(searchBigCategory)) return false;
      if (searchMidCategory && !m.code.slice(2, 4).startsWith(searchMidCategory)) return false;
      if (searchSubCategory && !m.code.slice(4, 6).startsWith(searchSubCategory)) return false;
      if (showLowStock && m.quantity >= m.minStock) return false;
      return true;
    });
  }, [warehouseMaterials, code, name, category, supplier, location, searchBigCategory, searchMidCategory, searchSubCategory, showLowStock]);

  // 低库存数量
  const lowStockCount = useMemo(() => {
    return warehouseMaterials.filter(m => m.quantity < m.minStock).length;
  }, [warehouseMaterials]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setCode('');
    setName('');
    setCategory('全部');
    setSupplier('');
    setLocation('');
    setSearchBigCategory('');
    setSearchMidCategory('');
    setSearchSubCategory('');
    setShowLowStock(false);
    setCurrentPage(1);
  }, []);

  // 编码生成器 - 分类变化
  const handleCodeGenCategoryChange = useCallback((field: string, value: string) => {
    if (field === 'bigCategory') {
      setCodeGen({ ...codeGen, bigCategory: value, midCategory: '', subCategory: '', generatedCode: '' });
    } else if (field === 'midCategory') {
      setCodeGen({ ...codeGen, midCategory: value, subCategory: '', generatedCode: '' });
    } else if (field === 'subCategory') {
      setCodeGen({ ...codeGen, subCategory: value, generatedCode: '' });
    }
    setCodeGenError('');
    setCodeGenSuccess('');
  }, [codeGen]);

  // 编码生成器 - 获取中类选项
  const getCodeGenMidCategories = useCallback(() => {
    if (!codeGen.bigCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  }, [codeGen.bigCategory, categoryConfig]);

  // 编码生成器 - 获取小类选项
  const getCodeGenSubCategories = useCallback(() => {
    if (!codeGen.bigCategory || !codeGen.midCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory];
    if (!bigCat) return [];
    const midCat = bigCat.categories[codeGen.midCategory];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  }, [codeGen.bigCategory, codeGen.midCategory, categoryConfig]);

  // 编码生成器 - 生成编码
  const handleCodeGen = useCallback(() => {
    if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
      setCodeGenError('请先选择大类、中类、小类');
      return;
    }

    const subCat = getCodeGenSubCategories().find(s => s.code === codeGen.subCategory);
    if (!subCat) return;

    const prefix = subCat.prefix;
    const existingCodes = warehouseMaterials
      .filter(m => m.code.startsWith(prefix))
      .map(m => parseInt(m.code.slice(-3)));

    let maxSeq = 0;
    if (existingCodes.length > 0) {
      maxSeq = Math.max(...existingCodes);
    }

    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const fullCode = prefix + newSeq;

    setCodeGen({ ...codeGen, generatedCode: fullCode });
    setCodeGenError('');
    setCodeGenSuccess('编码已生成！');
  }, [codeGen, getCodeGenSubCategories, warehouseMaterials]);

  // 编码生成器 - 验证重复
  const handleVerifyCode = useCallback(() => {
    if (!codeGen.generatedCode) {
      setCodeGenError('请先生成编码');
      return;
    }

    const exists = warehouseMaterials.some(m => m.code === codeGen.generatedCode);
    if (exists) {
      setCodeGenError('警告：该编码已在库存中存在！');
      setCodeGenSuccess('');
    } else {
      setCodeGenError('');
      setCodeGenSuccess('验证通过：该编码可以使用！');
    }
  }, [codeGen.generatedCode, warehouseMaterials]);

  // 编码生成器 - 复制编码
  const handleCopyCode = useCallback(() => {
    if (!codeGen.generatedCode) return;
    navigator.clipboard.writeText(codeGen.generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [codeGen.generatedCode]);

  // 导出模式相关
  const handleExportClick = useCallback(() => {
    setExportMode(true);
    setSelectedRows([]);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === filteredMaterials.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredMaterials.map(m => m.id));
    }
  }, [selectedRows.length, filteredMaterials]);

  const handleSelectRow = useCallback((id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  }, [selectedRows]);

  const handleConfirmExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  // 导出
  const handleDoExport = useCallback(async () => {
    const selectedData = filteredMaterials.filter(m => selectedRows.includes(m.id));
    const exportData = selectedData.map(m => ({
      '物料编号': m.code,
      '物料名称': m.name,
      '分类': m.category,
      '单位': m.unit,
      '库存数量': m.quantity,
      '最低库存': m.minStock,
      '单价': m.price,
      '供应商': m.supplier,
      '存放位置': m.location,
    }));

    const headers = ['物料编号', '物料名称', '分类', '单位', '库存数量', '最低库存', '单价', '供应商', '存放位置'];
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
      ].join('\n');
      const BOM = '﻿';
      content = BOM + csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>物料库存</title></head><body><table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse"><tr style="background-color:#f0f0f0">${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `物料库存_${todayLocal()}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  }, [filteredMaterials, selectedRows, exportFormat]);

  // 新增入库表单处理
  const handleCategoryChange = useCallback((field: string, value: string) => {
    if (field === 'bigCategory') {
      setNewInbound({ ...newInbound, bigCategory: value, midCategory: '', subCategory: '', materialCode: '' });
    } else if (field === 'midCategory') {
      setNewInbound({ ...newInbound, midCategory: value, subCategory: '', materialCode: '' });
    } else if (field === 'subCategory') {
      setNewInbound({ ...newInbound, subCategory: value, materialCode: '' });
    }
    setCodeError('');
  }, [newInbound]);

  // 自动生成入库单号
  const generateOrderCode = useCallback(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const todayRecords = inboundRecords.filter(r => r.code.startsWith(`RK${dateStr}`));
    let maxSeq = 0;
    if (todayRecords.length > 0) {
      const sequences = todayRecords.map(r => parseInt(r.code.split('-')[1] || '0'));
      maxSeq = Math.max(...sequences);
    }
    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const orderCode = `RK${dateStr}-${newSeq}`;
    setNewInbound({ ...newInbound, orderCode });
  }, [inboundRecords, newInbound]);

  // 验证编码重复
  const checkCodeDuplicate = useCallback((code: string) => {
    if (!code) return;
    const exists = warehouseMaterials.some(m => m.code === code);
    if (exists) {
      setCodeError('该物料编码已存在，请重新选择分类');
    } else {
      setCodeError('');
    }
  }, [warehouseMaterials]);

  // 验证名称重复
  const checkNameDuplicate = useCallback((name: string) => {
    if (!name) return;
    const exists = warehouseMaterials.some(m => m.name === name);
    if (exists) {
      setNameError('该物料名称已存在');
    } else {
      setNameError('');
    }
  }, [warehouseMaterials]);

  // 保存入库
  const handleSaveInbound = useCallback(() => {
    if (codeError || nameError) return;
    if (!newInbound.materialCode || !newInbound.materialName || !newInbound.quantity) return;

    console.log('Saving inbound:', newInbound);
    setShowAddModal(false);
    setNewInbound(INITIAL_NEW_INBOUND);
    setCodeError('');
    setNameError('');
  }, [codeError, nameError, newInbound]);

  // 关闭弹窗
  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setNewInbound(INITIAL_NEW_INBOUND);
    setCodeError('');
    setNameError('');
  }, []);

  return {
    // 数据
    warehouseMaterials,
    inboundRecords,
    categoryConfig,
    bigCategories,

    // 标签页
    activeTab,
    setActiveTab,

    // 筛选状态
    code,
    name,
    category,
    supplier,
    location,
    searchBigCategory,
    searchMidCategory,
    searchSubCategory,
    showLowStock,
    setCode,
    setName,
    setCategory,
    setSupplier,
    setLocation,
    setSearchBigCategory,
    setSearchMidCategory,
    setSearchSubCategory,
    setShowLowStock,
    handleReset,

    // 分页状态
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    inboundPage,
    inboundPageSize,
    setInboundPage,
    setInboundPageSize,

    // 弹窗状态
    showAddModal,
    setShowAddModal,

    // 导出模式
    exportMode,
    selectedRows,
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExportClick,
    handleSelectAll,
    handleSelectRow,
    handleConfirmExport,
    handleCancelExport,
    handleDoExport,
    setShowExportModal,

    // 新增入库表单
    newInbound,
    codeError,
    nameError,
    handleCategoryChange,
    generateOrderCode,
    checkCodeDuplicate,
    checkNameDuplicate,
    handleSaveInbound,
    handleCloseModal,

    // 编码生成器
    codeGen,
    codeGenCollapsed,
    codeGenError,
    codeGenSuccess,
    copySuccess,
    handleCodeGenCategoryChange,
    getCodeGenMidCategories,
    getCodeGenSubCategories,
    handleCodeGen,
    handleVerifyCode,
    handleCopyCode,
    setCodeGenCollapsed,

    // 权限
    can,
    canCreate,
    canEdit,
    canDelete,
    canExport,

    // 计算属性
    filteredMaterials,
    lowStockCount,
  };
}
