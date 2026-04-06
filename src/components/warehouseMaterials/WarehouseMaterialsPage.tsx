// 仓库物料主页面组件

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, Eye, Edit, Trash2, X, Download,
  Barcode, Plus, ChevronDown, ChevronRight, RefreshCw, Hash
} from 'lucide-react';

import {
  WarehouseMaterial, InboundRecord, NewInboundForm, EditForm, InboundEditForm,
  CodeGeneratorState, FilterState, PaginationState, TabType
} from './types';

import {
  warehouseMaterials as initialWarehouseMaterials,
  inboundRecords as initialInboundRecords,
  categoryConfig,
  bigCategories,
} from './mockData';

import WarehouseMaterialsHeader from './WarehouseMaterialsHeader';
import WarehouseMaterialsFilters from './WarehouseMaterialsFilters';
import WarehouseMaterialsTable from './WarehouseMaterialsTable';
import InboundTable from './InboundTable';
import AddInboundModal from './AddInboundModal';
import CodeGenerator from './CodeGenerator';

export default function WarehouseMaterialsPage() {
  const navigate = useNavigate();

  // 状态管理
  const [materials, setMaterials] = useState<WarehouseMaterial[]>(initialWarehouseMaterials);
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>(initialInboundRecords);

  // Tab状态
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // 筛选状态
  const [filters, setFilters] = useState<FilterState>({
    code: '',
    name: '',
    category: '全部',
    supplier: '',
    location: '',
    searchBigCategory: '',
    searchMidCategory: '',
    searchSubCategory: '',
    showLowStock: false,
  });

  // 分页状态
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 10,
    inboundPage: 1,
    inboundPageSize: 10,
  });

  // 展开状态
  const [expandedInboundRows, setExpandedInboundRows] = useState<Set<number>>(new Set());

  // 导出相关状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // 详情/编辑/删除弹窗状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showMaterialDeleteConfirm, setShowMaterialDeleteConfirm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<WarehouseMaterial | null>(null);

  // 编辑表单
  const [editForm, setEditForm] = useState<EditForm>({
    quantity: 0,
    minStock: 0,
    maxStock: 0,
    price: '',
    supplier: '',
    location: '',
    specification: '',
    barcode: '',
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    lastUpdateTime: '',
    dataStatus: '启用'
  });

  // 批量编辑状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedMaterials, setBatchEditedMaterials] = useState<Record<number, Partial<WarehouseMaterial>>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 新增入库弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInbound, setNewInbound] = useState<NewInboundForm>({
    orderCode: '',
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    materialCode: '',
    materialName: '',
    category: '',
    specification: '',
    barcode: '',
    unit: '袋',
    quantity: '',
    price: '',
    supplier: '',
    location: '',
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    inboundDate: '',
    operator: '',
    remarks: '',
  });
  const [codeError, setCodeError] = useState('');
  const [nameError, setNameError] = useState('');

  // 入库记录详情/编辑/删除状态
  const [showInboundDetailModal, setShowInboundDetailModal] = useState(false);
  const [showInboundEditModal, setShowInboundEditModal] = useState(false);
  const [showInboundEditConfirm, setShowInboundEditConfirm] = useState(false);
  const [showInboundDeleteConfirm, setShowInboundDeleteConfirm] = useState(false);
  const [selectedInboundRecord, setSelectedInboundRecord] = useState<InboundRecord | null>(null);
  const [inboundEditForm, setInboundEditForm] = useState<InboundEditForm>({
    supplier: '',
    operator: '',
    inboundDate: '',
    status: ''
  });

  // 编码生成器状态
  const [codeGen, setCodeGen] = useState<CodeGeneratorState>({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 计算低库存数量
  const lowStockCount = useMemo(() => {
    return materials.filter(m => m.quantity < m.minStock).length;
  }, [materials]);

  // 筛选物料
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      if (filters.code && !m.code.includes(filters.code)) return false;
      if (filters.name && !m.name.includes(filters.name)) return false;
      if (filters.supplier && m.supplier !== filters.supplier) return false;
      if (filters.location && m.location !== filters.location) return false;
      if (filters.category !== '全部') {
        const categoryMap: Record<string, string> = {
          '种子种苗': '种质资源',
          '肥料': '肥料与土壤改良剂',
          '农药': '农药与植保产品',
          '农膜': '设施农业系统',
        };
        if (!m.category.includes(categoryMap[filters.category] || filters.category)) return false;
      }
      if (filters.searchBigCategory && !m.code.startsWith(filters.searchBigCategory)) return false;
      if (filters.searchMidCategory && !m.code.slice(2, 4).startsWith(filters.searchMidCategory)) return false;
      if (filters.searchSubCategory && !m.code.slice(4, 6).startsWith(filters.searchSubCategory)) return false;
      if (filters.showLowStock && m.quantity >= m.minStock) return false;
      return true;
    });
  }, [materials, filters]);

  // 低库存点击
  const handleLowStockClick = () => {
    setFilters(prev => ({ ...prev, showLowStock: !prev.showLowStock }));
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({
      code: '',
      name: '',
      category: '全部',
      supplier: '',
      location: '',
      searchBigCategory: '',
      searchMidCategory: '',
      searchSubCategory: '',
      showLowStock: false,
    });
  };

  // 导出相关
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
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

  const handleConfirmExport = () => {
    setShowExportModal(true);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setBatchEditMode(false);
    setSelectedRows([]);
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

    const headers = ['物料编号', '物料名称', '分类', '规格型号', '条形码', '单位', '库存数量', '最低库存', '最高库存', '单价', '供应商', '存放位置', '批次号', '生产日期', '有效期至', '最后更新时间', '数据状态'];

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
      ].join('\n');
      const BOM = '\uFEFF';
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

    const fileName = `物料库存_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
    } catch (err) {
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
  };

  // 展开/折叠入库记录行
  const toggleExpandInboundRow = (id: number) => {
    const newExpandedRows = new Set(expandedInboundRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedInboundRows(newExpandedRows);
  };

  // 物料详情
  const handleViewDetail = (material: WarehouseMaterial) => {
    setSelectedMaterial(material);
    setShowDetailModal(true);
  };

  // 物料编辑
  const handleEdit = (material: WarehouseMaterial) => {
    setSelectedMaterial(material);
    setEditForm({
      quantity: material.quantity,
      minStock: material.minStock,
      maxStock: material.maxStock,
      price: material.price,
      supplier: material.supplier,
      location: material.location,
      specification: material.specification,
      barcode: material.barcode,
      batchNo: material.batchNo,
      productionDate: material.productionDate,
      expiryDate: material.expiryDate,
      lastUpdateTime: material.lastUpdateTime,
      dataStatus: material.dataStatus
    });
    setShowEditModal(true);
  };

  // 物料删除
  const handleDelete = (material: WarehouseMaterial) => {
    setSelectedMaterial(material);
    setShowMaterialDeleteConfirm(true);
  };

  // 批量编辑确认
  const handleConfirmBatchEdit = () => {
    if (selectedRows.length === 1) {
      const material = materials.find(m => m.id === selectedRows[0]);
      if (material) {
        setSelectedMaterial(material);
        setEditForm({
          quantity: material.quantity,
          minStock: material.minStock,
          maxStock: material.maxStock,
          price: material.price,
          supplier: material.supplier,
          location: material.location,
          specification: material.specification,
          barcode: material.barcode,
          batchNo: material.batchNo,
          productionDate: material.productionDate,
          expiryDate: material.expiryDate,
          lastUpdateTime: material.lastUpdateTime,
          dataStatus: material.dataStatus
        });
        setShowEditModal(true);
        setBatchEditMode(false);
        setSelectedRows([]);
      }
    } else {
      setShowBatchEditModal(true);
    }
  };

  // 入库记录详情
  const handleViewInboundDetail = (record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundDetailModal(true);
  };

  // 入库记录编辑
  const handleEditInbound = (record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setInboundEditForm({
      supplier: record.supplier,
      operator: record.operator,
      inboundDate: record.inboundDate,
      status: record.status
    });
    setShowInboundEditModal(true);
  };

  // 入库记录删除
  const handleDeleteInbound = (record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundDeleteConfirm(true);
  };

  // 自动生成入库单号
  const generateOrderCode = () => {
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
  };

  // 检查编码重复
  const checkCodeDuplicate = (code: string) => {
    if (!code) return;
    const exists = materials.some(m => m.code === code);
    if (exists) {
      setCodeError('该物料编码已存在，请重新选择分类');
    } else {
      setCodeError('');
    }
  };

  // 检查名称重复
  const checkNameDuplicate = (name: string) => {
    if (!name) return;
    const exists = materials.some(m => m.name === name);
    if (exists) {
      setNameError('该物料名称已存在');
    } else {
      setNameError('');
    }
  };

  // 分类变化处理
  const handleCategoryChange = (field: string, value: string) => {
    if (field === 'bigCategory') {
      setNewInbound({ ...newInbound, bigCategory: value, midCategory: '', subCategory: '', materialCode: '' });
    } else if (field === 'midCategory') {
      setNewInbound({ ...newInbound, midCategory: value, subCategory: '', materialCode: '' });
    } else if (field === 'subCategory') {
      setNewInbound({ ...newInbound, subCategory: value, materialCode: '' });
    }
    setCodeError('');
  };

  // 保存入库
  const handleSaveInbound = () => {
    if (codeError || nameError) return;
    if (!newInbound.materialCode || !newInbound.materialName || !newInbound.quantity) return;
    console.log('Saving inbound:', newInbound);
    setShowAddModal(false);
    setNewInbound({
      orderCode: '',
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      materialCode: '',
      materialName: '',
      category: '',
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: '',
      price: '',
      supplier: '',
      location: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      inboundDate: '',
      operator: '',
      remarks: '',
    });
    setCodeError('');
    setNameError('');
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewInbound({
      orderCode: '',
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      materialCode: '',
      materialName: '',
      category: '',
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: '',
      price: '',
      supplier: '',
      location: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      inboundDate: '',
      operator: '',
      remarks: '',
    });
    setCodeError('');
    setNameError('');
  };

  // 编码生成器 - 分类变化
  const handleCodeGenCategoryChange = (field: string, value: string) => {
    if (field === 'bigCategory') {
      setCodeGen({ ...codeGen, bigCategory: value, midCategory: '', subCategory: '', generatedCode: '' });
    } else if (field === 'midCategory') {
      setCodeGen({ ...codeGen, midCategory: value, subCategory: '', generatedCode: '' });
    } else if (field === 'subCategory') {
      setCodeGen({ ...codeGen, subCategory: value, generatedCode: '' });
    }
    setCodeGenError('');
    setCodeGenSuccess('');
  };

  // 编码生成器 - 生成编码
  const handleCodeGen = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
      setCodeGenError('请先选择大类、中类、小类');
      return;
    }

    const subCat = getCodeGenSubCategories().find(s => s.code === codeGen.subCategory);
    if (!subCat) return;

    const prefix = subCat.prefix;
    const existingCodes = materials
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
  };

  // 编码生成器 - 验证重复
  const handleVerifyCode = () => {
    if (!codeGen.generatedCode) {
      setCodeGenError('请先生成编码');
      return;
    }

    const exists = materials.some(m => m.code === codeGen.generatedCode);
    if (exists) {
      setCodeGenError('警告：该编码已在库存中存在！');
      setCodeGenSuccess('');
    } else {
      setCodeGenError('');
      setCodeGenSuccess('验证通过：该编码可以使用！');
    }
  };

  // 编码生成器 - 复制编码
  const handleCopyCode = () => {
    if (!codeGen.generatedCode) return;
    navigator.clipboard.writeText(codeGen.generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // 获取编码生成器小类选项
  const getCodeGenSubCategories = () => {
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
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <WarehouseMaterialsHeader
        lowStockCount={lowStockCount}
        showLowStock={filters.showLowStock}
        onLowStockClick={handleLowStockClick}
      />

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('overview'); setPagination(p => ({ ...p, currentPage: 1 })); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料总览
        </button>
        <button
          onClick={() => { setActiveTab('inbound'); setPagination(p => ({ ...p, currentPage: 1 })); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inbound'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料入库
        </button>
      </div>

      {/* Material Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <WarehouseMaterialsFilters
            filters={filters}
            categoryConfig={categoryConfig}
            materials={materials}
            onFilterChange={setFilters}
            onReset={handleResetFilters}
          />

          <WarehouseMaterialsTable
            materials={filteredMaterials}
            pagination={pagination}
            selectedRows={selectedRows}
            exportMode={exportMode}
            batchEditMode={batchEditMode}
            onPaginationChange={setPagination}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
            onExportClick={handleExportClick}
            onBatchEditMode={() => setBatchEditMode(true)}
            onBatchDelete={() => setShowDeleteWarning(true)}
            onConfirmEdit={handleConfirmBatchEdit}
            onCancel={() => { setBatchEditMode(false); setSelectedRows([]); }}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}

      {/* Material Inbound Tab */}
      {activeTab === 'inbound' && (
        <>
          <CodeGenerator
            codeGen={codeGen}
            bigCategories={bigCategories}
            categoryConfig={categoryConfig}
            warehouseMaterials={materials}
            codeGenError={codeGenError}
            codeGenSuccess={codeGenSuccess}
            copySuccess={copySuccess}
            onCategoryChange={handleCodeGenCategoryChange}
            onGenerate={handleCodeGen}
            onVerify={handleVerifyCode}
            onCopy={handleCopyCode}
          />

          <InboundTable
            records={inboundRecords}
            pagination={pagination}
            expandedRows={expandedInboundRows}
            onPaginationChange={setPagination}
            onToggleExpand={toggleExpandInboundRow}
            onAddInbound={() => setShowAddModal(true)}
            onViewDetail={handleViewInboundDetail}
            onEdit={handleEditInbound}
            onDelete={handleDeleteInbound}
          />
        </>
      )}

      {/* Add Inbound Modal */}
      <AddInboundModal
        show={showAddModal}
        newInbound={newInbound}
        categoryConfig={categoryConfig}
        codeError={codeError}
        nameError={nameError}
        onClose={handleCloseModal}
        onSave={handleSaveInbound}
        onGenerateOrderCode={generateOrderCode}
        onFormChange={setNewInbound}
        onCategoryChange={handleCategoryChange}
        onMaterialNameChange={checkNameDuplicate}
        onCheckCodeDuplicate={checkCodeDuplicate}
      />

      {/* 导出格式选择弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">已选择 {selectedRows.length} 条数据</p>
              <div className="space-y-3">
                {[
                  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
                  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
                  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
                ].map((format) => (
                  <label
                    key={format.value}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      exportFormat === format.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format.value}
                      checked={exportFormat === format.value}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">{format.label}</span>
                      <span className="block text-xs text-gray-500">{format.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={handleDoExport}
                disabled={selectedRows.length === 0}
                className="w-full mt-6 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                导出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">物料详情查看</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* 基本信息 */}
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  基本信息
                </h4>
                <div className="bg-emerald-50 rounded-lg p-4 mb-4 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-emerald-600 block font-medium">条形码</span>
                      <span className="text-2xl font-mono font-bold text-emerald-700">{selectedMaterial.barcode}</span>
                    </div>
                    <Barcode className="w-12 h-12 text-emerald-600" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">物料编码</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料名称</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料分类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.category}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">规格型号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.specification}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">单位</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">当前库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.quantity} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最低库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.minStock} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最高库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.maxStock} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">单价</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.price}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.supplier}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">存放位置</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.location}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">数据状态</span>
                    <span className={`text-sm font-medium ${selectedMaterial.dataStatus === '启用' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedMaterial.dataStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* 批次信息 */}
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  批次信息
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">批次号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.batchNo}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">生产日期</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.productionDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">有效期至</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.expiryDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最后更新时间</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.lastUpdateTime}</span>
                  </div>
                </div>
              </div>

              {/* 库存状态 */}
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  库存状态
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">仓库区域</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.location.split('-')[0]}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">货架位置</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.location.split('-')[1] || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">库存状态</span>
                    <span className={`text-sm font-medium ${selectedMaterial.quantity <= selectedMaterial.minStock ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedMaterial.quantity <= selectedMaterial.minStock ? '库存不足' : '库存充足'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">库存预警</span>
                    <span className={`text-sm font-medium ${selectedMaterial.quantity <= selectedMaterial.minStock ? 'text-red-600' : 'text-gray-500'}`}>
                      {selectedMaterial.quantity <= selectedMaterial.minStock ? '需要补货' : '正常'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">编辑物料库存</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-blue-600 block font-medium">条形码</span>
                    <span className="text-2xl font-mono font-bold text-blue-700">{selectedMaterial.barcode}</span>
                  </div>
                  <Barcode className="w-12 h-12 text-blue-600" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">物料编码</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料名称</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料分类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.category}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">规格型号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.specification}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">库存数量 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低库存 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={editForm.minStock}
                    onChange={(e) => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最高库存</label>
                  <input
                    type="number"
                    value={editForm.maxStock}
                    onChange={(e) => setEditForm({ ...editForm, maxStock: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单价（元） <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                  <input
                    type="text"
                    value={editForm.supplier}
                    onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">存放位置 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数据状态</label>
                  <select
                    value={editForm.dataStatus}
                    onChange={(e) => setEditForm({ ...editForm, dataStatus: e.target.value as '启用' | '停用' })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="启用">启用</option>
                    <option value="停用">停用</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowEditConfirm(true)}
                  className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirm Modal */}
      {showEditConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-amber-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                数据一致性风险提示
              </h3>
              <button onClick={() => setShowEditConfirm(false)} className="text-white hover:bg-amber-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">修改库存信息可能造成数据错乱</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在修改库存相关信息，这些修改将影响之前已使用的历史数据，可能导致数据不一致。
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Saving material edit:', { id: selectedMaterial?.id, ...editForm });
                    setShowEditConfirm(false);
                    setShowEditModal(false);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 h-10 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  确认保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Detail Modal */}
      {showInboundDetailModal && selectedInboundRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">入库记录详情</h3>
              <button onClick={() => setShowInboundDetailModal(false)} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">入库单号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">入库日期</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.inboundDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.supplier}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">操作员</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.operator}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料种类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.materials?.length || 0} 种</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">状态</span>
                    <span className={`text-sm font-medium ${selectedInboundRecord.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                      {selectedInboundRecord.status === 'completed' ? '已完成' : '待审核'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-blue-800 mb-2">物料明细</div>
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-[#F2F6FA]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料编码</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料名称</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">分类</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">规格型号</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">单位</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">数量</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">单价（元）</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">存放位置</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInboundRecord.materials?.map((material, idx) => (
                      <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialCode}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialName}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.category}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.specification}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.unit}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.quantity}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.price}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Edit Modal */}
      {showInboundEditModal && selectedInboundRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600">
              <h3 className="text-lg font-semibold text-white">编辑入库记录</h3>
              <button onClick={() => setShowInboundEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">入库单号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料种类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.materials?.length || 0} 种</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">供应商</label>
                    <input
                      type="text"
                      value={inboundEditForm.supplier}
                      onChange={(e) => setInboundEditForm({ ...inboundEditForm, supplier: e.target.value })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">操作员</label>
                    <input
                      type="text"
                      value={inboundEditForm.operator}
                      onChange={(e) => setInboundEditForm({ ...inboundEditForm, operator: e.target.value })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={inboundEditForm.status}
                      onChange={(e) => setInboundEditForm({ ...inboundEditForm, status: e.target.value })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="pending">待审核</option>
                      <option value="completed">已完成</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowInboundEditModal(false)}
                    className="flex-1 h-9 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => setShowInboundEditConfirm(true)}
                    className="flex-1 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Edit Confirm Modal */}
      {showInboundEditConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-amber-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                数据一致性风险提示
              </h3>
              <button onClick={() => setShowInboundEditConfirm(false)} className="text-white hover:bg-amber-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">修改入库记录可能造成数据错乱</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在修改入库记录信息，这些修改将影响之前已使用的历史数据。
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInboundEditConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Saving inbound record edit:', { id: selectedInboundRecord?.id, ...inboundEditForm });
                    setShowInboundEditConfirm(false);
                    setShowInboundEditModal(false);
                    setShowInboundDetailModal(false);
                  }}
                  className="flex-1 h-10 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  确认保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Delete Confirm Modal */}
      {showMaterialDeleteConfirm && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                删除确认
              </h3>
              <button onClick={() => setShowMaterialDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：删除此物料将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除物料：<strong>{selectedMaterial.name}</strong>（{selectedMaterial.code}）
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMaterialDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Deleting material:', selectedMaterial);
                    setShowMaterialDeleteConfirm(false);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Warning Dialog */}
      {showEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量编辑警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>编辑后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>之前的历史记录将无法获取新的物料信息</li>
                <li>已生成的入库/出库单据数据可能不一致</li>
                <li>库存统计报表数据可能需要重新核算</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEditWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => setShowEditWarning(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Dialog */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量删除警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>删除后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>所有选中的物料将被永久删除</li>
                <li>相关的入库记录也将被删除</li>
                <li>历史数据将无法恢复</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Edit Modal */}
      {showBatchEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">批量编辑物料</h3>
              <button onClick={() => { setShowBatchEditModal(false); setBatchEditedMaterials({}); setCurrentBatchEditIndex(0); }} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 个物料进行批量编辑，已编辑 <strong>{Object.keys(batchEditedMaterials).length}</strong> 个</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('Saving all batch edits:', batchEditedMaterials);
                    setShowBatchEditModal(false);
                    setBatchEditMode(false);
                    setSelectedRows([]);
                    setBatchEditedMaterials({});
                    setCurrentBatchEditIndex(0);
                  }}
                  className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  保存全部 ({Object.keys(batchEditedMaterials).length} 个)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirm Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                批量删除确认
              </h3>
              <button onClick={() => setShowBatchDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：批量删除物料将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除 <strong>{selectedRows.length}</strong> 项物料
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Batch deleting materials:', selectedRows);
                    setShowBatchDeleteConfirm(false);
                    setSelectedRows([]);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Delete Confirm Modal */}
      {showInboundDeleteConfirm && selectedInboundRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                删除确认
              </h3>
              <button onClick={() => setShowInboundDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：删除此入库记录将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除入库记录：<strong>{selectedInboundRecord.code}</strong>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInboundDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Deleting inbound record:', selectedInboundRecord);
                    setShowInboundDeleteConfirm(false);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
