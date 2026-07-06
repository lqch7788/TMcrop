/**
 * 仓库物料数据管理 Hook（V2.1 架构重写）
 *
 * 数据流：组件 → useMaterials → useWarehouseMaterialStore/useInboundStore/useMaterialCodeRuleStore
 *        → enhancedApiClient → 后端 API（无缓存层）
 *
 * V2.1 铁律：
 * - 禁止 localStorage/IndexedDB 业务缓存
 * - 禁止 mock 数据兜底
 * - 禁止 API 失败静默回退 mock
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuthPermission } from '../../hooks/usePermission';
import { todayLocal } from '@/lib/dateUtils';
import { useWarehouseMaterialStore } from '@/stores/useWarehouseMaterialStore';
import { useInboundStore } from '@/stores/useInboundStore';
import { useMaterialCodeRuleStore } from '@/stores/useMaterialCodeRuleStore';
import type {
  Material,
  InboundRecord,
  CategoryConfig,
  NewInboundForm,
  CodeGenState,
  MaterialsTab,
} from '../types/materials.types';

// 把 useMaterialCodeRuleStore 的 BigCategory[] 转换成原页面依赖的 CategoryConfig 树
function bigCategoriesToConfig(
  tree: ReturnType<typeof useMaterialCodeRuleStore.getState>['categories']
): CategoryConfig {
  const result: CategoryConfig = {};
  for (const big of tree) {
    const categories: CategoryConfig[string]['categories'] = {};
    for (const mid of big.midCategories) {
      const subCategories: Record<string, { name: string; prefix: string }> = {};
      for (const sub of mid.subCategories) {
        // 前缀 = 大类 + 中类 + 小类，例如 SP + 01 + 01 = SP0101
        subCategories[sub.code] = { name: sub.name, prefix: `${big.code}${mid.code}${sub.code}` };
      }
      categories[mid.code] = { name: mid.name, subCategories };
    }
    result[big.code] = { name: big.name, categories };
  }
  return result;
}

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

  // 权限
  const { can } = useAuthPermission();
  const canCreate = can('materials:warehouse:create', 'create');
  const canEdit = can('materials:warehouse:edit', 'edit');
  const canDelete = can('materials:warehouse:delete', 'delete');
  const canExport = can('materials:warehouse:export', 'export');

  // ==================== 数据来源：全部走 Store（V2.1 铁律）====================

  // 物料主数据
  const warehouseMaterials = useWarehouseMaterialStore((s) => s.items);
  const loadMaterials = useWarehouseMaterialStore((s) => s.loadItems);
  const materialLoading = useWarehouseMaterialStore((s) => s.isLoading);
  const materialError = useWarehouseMaterialStore((s) => s.error);

  // 入库记录
  const inboundRecords = useInboundStore((s) => s.records);
  const loadInbound = useInboundStore((s) => s.loadRecords);
  const inboundLoading = useInboundStore((s) => s.isLoading);
  const inboundError = useInboundStore((s) => s.error);
  const createInbound = useInboundStore((s) => s.createRecord);

  // 物料编码分类树
  const bigCategoriesTree = useMaterialCodeRuleStore((s) => s.categories);
  const loadCategories = useMaterialCodeRuleStore((s) => s.loadCategories);

  // 初始化加载（按 tab 切换按需加载）
  useEffect(() => {
    if (activeTab === 'overview') {
      loadMaterials();
    } else if (activeTab === 'inbound') {
      loadInbound();
      loadCategories();
    }
  }, [activeTab, loadMaterials, loadInbound, loadCategories]);

  // 把分类树转成旧页面依赖的 CategoryConfig 结构（保留兼容性）
  const categoryConfig: CategoryConfig = useMemo(
    () => bigCategoriesToConfig(bigCategoriesTree),
    [bigCategoriesTree]
  );
  const bigCategories = useMemo(
    () => bigCategoriesTree.map((b) => ({ code: b.code, name: b.name })),
    [bigCategoriesTree]
  );

  // 从分类树派生"简单分类"下拉：保留'全部' + 大类名（兼容老页面的简单分类过滤）
  const simpleCategories = useMemo(() => {
    return ['全部', ...bigCategoriesTree.map((b) => b.name)];
  }, [bigCategoriesTree]);

  // ==================== 筛选逻辑 ====================

  const filteredMaterials = useMemo(() => {
    return warehouseMaterials.filter((m: Material) => {
      if (code && !m.code.includes(code)) return false;
      if (name && !m.name.includes(name)) return false;
      if (supplier && m.supplier !== supplier) return false;
      if (location && m.location !== location) return false;
      if (category !== '全部') {
        const categoryMap: Record<string, string> = {
          种子种苗: '种质资源',
          肥料: '肥料与土壤改良剂',
          农药: '农药与植保产品',
          农膜: '设施农业系统',
        };
        if (!m.category.includes(categoryMap[category] || category)) return false;
      }
      if (searchBigCategory && !m.code.startsWith(searchBigCategory)) return false;
      if (searchMidCategory && !m.code.slice(2, 4).startsWith(searchMidCategory)) return false;
      if (searchSubCategory && !m.code.slice(4, 6).startsWith(searchSubCategory)) return false;
      if (showLowStock && m.quantity >= m.minStock) return false;
      return true;
    });
  }, [
    warehouseMaterials,
    code,
    name,
    category,
    supplier,
    location,
    searchBigCategory,
    searchMidCategory,
    searchSubCategory,
    showLowStock,
  ]);

  const lowStockCount = useMemo(
    () => warehouseMaterials.filter((m) => m.quantity < m.minStock).length,
    [warehouseMaterials]
  );

  // ==================== 重置筛选 ====================

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

  // ==================== 编码生成器 ====================

  const handleCodeGenCategoryChange = useCallback((field: string, value: string) => {
    setCodeGen((prev) => {
      if (field === 'bigCategory') {
        return { ...prev, bigCategory: value, midCategory: '', subCategory: '', generatedCode: '' };
      }
      if (field === 'midCategory') {
        return { ...prev, midCategory: value, subCategory: '', generatedCode: '' };
      }
      if (field === 'subCategory') {
        return { ...prev, subCategory: value, generatedCode: '' };
      }
      return prev;
    });
    setCodeGenError('');
    setCodeGenSuccess('');
  }, []);

  const getCodeGenMidCategories = useCallback(() => {
    if (!codeGen.bigCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  }, [codeGen.bigCategory, categoryConfig]);

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

  // 生成编码（基于现有物料最大序列 +1，遵循 code-generation-contract-rule：禁止 Math.random）
  const handleCodeGen = useCallback(() => {
    if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
      setCodeGenError('请先选择大类、中类、小类');
      return;
    }
    const subCat = getCodeGenSubCategories().find((s) => s.code === codeGen.subCategory);
    if (!subCat) return;
    const prefix = subCat.prefix;
    const existingSeqs = warehouseMaterials
      .filter((m) => m.code.startsWith(prefix))
      .map((m) => parseInt(m.code.slice(-3), 10))
      .filter((n) => !isNaN(n));
    const maxSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) : 0;
    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const fullCode = prefix + newSeq;
    setCodeGen((prev) => ({ ...prev, generatedCode: fullCode }));
    setCodeGenError('');
    setCodeGenSuccess('编码已生成！');
  }, [codeGen, getCodeGenSubCategories, warehouseMaterials]);

  const handleVerifyCode = useCallback(() => {
    if (!codeGen.generatedCode) {
      setCodeGenError('请先生成编码');
      return;
    }
    const exists = warehouseMaterials.some((m) => m.code === codeGen.generatedCode);
    if (exists) {
      setCodeGenError('警告：该编码已在库存中存在！');
      setCodeGenSuccess('');
    } else {
      setCodeGenError('');
      setCodeGenSuccess('验证通过：该编码可以使用！');
    }
  }, [codeGen.generatedCode, warehouseMaterials]);

  const handleCopyCode = useCallback(() => {
    if (!codeGen.generatedCode) return;
    navigator.clipboard.writeText(codeGen.generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [codeGen.generatedCode]);

  // ==================== 导出 ====================

  const handleExportClick = useCallback(() => {
    setExportMode(true);
    setSelectedRows([]);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === filteredMaterials.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredMaterials.map((m) => m.id));
    }
  }, [selectedRows.length, filteredMaterials]);

  const handleSelectRow = useCallback((id: number) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]));
  }, []);

  const handleConfirmExport = useCallback(() => setShowExportModal(true), []);
  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  const handleDoExport = useCallback(async () => {
    const selectedData = filteredMaterials.filter((m) => selectedRows.includes(m.id));
    const exportData = selectedData.map((m) => ({
      物料编号: m.code,
      物料名称: m.name,
      分类: m.category,
      单位: m.unit,
      库存数量: m.quantity,
      最低库存: m.minStock,
      单价: m.price,
      供应商: m.supplier,
      存放位置: m.location,
    }));

    const headers = ['物料编号', '物料名称', '分类', '单位', '库存数量', '最低库存', '单价', '供应商', '存放位置'];
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) => headers.map((h) => `"${row[h as keyof typeof row]}"`).join(',')),
      ].join('\n');
      content = '﻿' + csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${exportData.map((row) => `<tr>${headers.map((h) => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>物料库存</title></head><body><table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse"><tr style="background-color:#f0f0f0">${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${exportData.map((row) => `<tr>${headers.map((h) => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `物料库存_${todayLocal()}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: exportFormat.toUpperCase() + ' Files', accept: { [mimeType]: ['.' + extension] } }],
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

  // ==================== 新增入库 ====================

  const handleCategoryChange = useCallback((field: string, value: string) => {
    setNewInbound((prev) => {
      if (field === 'bigCategory') {
        return { ...prev, bigCategory: value, midCategory: '', subCategory: '', materialCode: '' };
      }
      if (field === 'midCategory') {
        return { ...prev, midCategory: value, subCategory: '', materialCode: '' };
      }
      if (field === 'subCategory') {
        return { ...prev, subCategory: value, materialCode: '' };
      }
      return prev;
    });
    setCodeError('');
  }, []);

  // 生成入库单号（基于今日 + 当日最大序号 +1）
  const generateOrderCode = useCallback(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;
    const prefix = `RK${dateStr}-`;
    const todayRecords = inboundRecords.filter((r) => r.code?.startsWith(prefix));
    const seqs = todayRecords
      .map((r) => parseInt(r.code.split('-')[1] || '0', 10))
      .filter((n) => !isNaN(n));
    const maxSeq = seqs.length > 0 ? Math.max(...seqs) : 0;
    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const orderCode = `${prefix}${newSeq}`;
    setNewInbound((prev) => ({ ...prev, orderCode }));
  }, [inboundRecords]);

  const checkCodeDuplicate = useCallback(
    (code: string) => {
      if (!code) return;
      const exists = warehouseMaterials.some((m) => m.code === code);
      if (exists) setCodeError('该物料编码已存在，请重新选择分类');
      else setCodeError('');
    },
    [warehouseMaterials]
  );

  const checkNameDuplicate = useCallback(
    (name: string) => {
      if (!name) return;
      const exists = warehouseMaterials.some((m) => m.name === name);
      if (exists) setNameError('该物料名称已存在');
      else setNameError('');
    },
    [warehouseMaterials]
  );

  // 保存入库：走 API（不再 console.log 假装保存）
  const handleSaveInbound = useCallback(async () => {
    if (codeError || nameError) return;
    if (!newInbound.materialCode || !newInbound.materialName || !newInbound.quantity) return;
    const qty = Number(newInbound.quantity);
    if (isNaN(qty) || qty <= 0) return;

    const payload: Omit<InboundRecord, 'id'> = {
      code: newInbound.orderCode,
      inboundDate: newInbound.inboundDate || todayLocal(),
      supplier: newInbound.supplier,
      operator: newInbound.operator,
      status: 'completed',
      materials: [
        {
          id: 0,
          code: newInbound.materialCode,
          name: newInbound.materialName,
          category: `${newInbound.bigCategory}-${newInbound.midCategory}-${newInbound.subCategory}`,
          bigCategory: newInbound.bigCategory,
          midCategory: newInbound.midCategory,
          subCategory: newInbound.subCategory,
          specification: '',
          barcode: '',
          unit: newInbound.unit,
          quantity: qty,
          price: '',
          location: '',
          batchNo: '',
          productionDate: '',
          expiryDate: '',
          remarks: newInbound.remarks,
        },
      ],
    };

    const result = await createInbound(payload);
    if (result) {
      setShowAddModal(false);
      setNewInbound(INITIAL_NEW_INBOUND);
      setCodeError('');
      setNameError('');
    }
  }, [codeError, nameError, newInbound, createInbound]);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setNewInbound(INITIAL_NEW_INBOUND);
    setCodeError('');
    setNameError('');
  }, []);

  // ==================== 返回值 ====================

  return {
    // 数据（来自 Store，API 直连）
    warehouseMaterials,
    inboundRecords,
    categoryConfig,
    bigCategories,
    simpleCategories,

    // 加载状态
    materialLoading,
    materialError,
    inboundLoading,
    inboundError,

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

    // 分页
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    inboundPage,
    inboundPageSize,
    setInboundPage,
    setInboundPageSize,

    // 弹窗
    showAddModal,
    setShowAddModal,

    // 导出
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

    // 新增入库
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

    // 计算
    filteredMaterials,
    lowStockCount,
  };
}