import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Download, X, ChevronDown, ChevronRightIcon, RefreshCw, Upload } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { DeleteWarningModal } from './DeleteWarningModal';
import { getPurchasePlansWithStatus, subscribeToStatusChanges } from '../../hooks/usePurchasePlanStore';
import * as XLSX from 'xlsx';
import type { PurchasePlanItem, PurchasePlan } from '../../types/purchase';

export function PurchasePlanPage() {
  // 采购计划数据状态（支持审批联动更新）
  const [purchasePlansData, setPurchasePlansData] = useState<PurchasePlan[]>(() => getPurchasePlansWithStatus());

  // 订阅采购计划状态变化事件
  useEffect(() => {
    const unsubscribe = subscribeToStatusChanges(() => {
      // 状态更新时刷新数据
      setPurchasePlansData(getPurchasePlansWithStatus());
    });
    return unsubscribe;
  }, []);

  const [relatedBatchCode, setRelatedBatchCode] = useState('');
  const [purchaseType, setPurchaseType] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [applicant, setApplicant] = useState('');
  const [applicantDepartment, setApplicantDepartment] = useState('');
  const [priority, setPriority] = useState('全部');
  const [requiredStartDate, setRequiredStartDate] = useState('');
  const [requiredEndDate, setRequiredEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);  // 详情弹窗状态
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<PurchasePlan | null>(null);  // 选中的采购计划详情
  const [showEditModal, setShowEditModal] = useState(false);  // 编辑弹窗状态
  const [showEditItemsExpanded, setShowEditItemsExpanded] = useState(false);  // 编辑弹窗中物料明细是否展开
  const [batchSelectOpen, setBatchSelectOpen] = useState(false);  // 批次号下拉框是否展开
  const batchSelectRef = useRef<HTMLDivElement>(null);  // 批次号下拉框ref
  // 批次号下拉框外部点击关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (batchSelectRef.current && !batchSelectRef.current.contains(event.target as Node)) {
        setBatchSelectOpen(false);
      }
    };
    if (batchSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [batchSelectOpen]);

  const [editForm, setEditForm] = useState({  // 编辑表单状态
    purchaseApplicationCode: '',  // 采购申请批次号（只读）
    relatedBatchCode: '',         // 关联生产批次号
    purchaseType: 'production',   // 采购类型
    purchaseTypeName: '生产物资采购', // 类型显示名称
    applicant: '',               // 申请人
    applicantDepartment: '',      // 申请部门
    applyDate: '',                // 申请日期
    requiredDate: '',             // 需求日期
    priority: 'normal',           // 优先级
    priorityText: '中',           // 优先级显示文本
    status: 'draft',              // 状态（只读，业务流程自动生成）
    statusText: '草稿',           // 状态显示文本
    remark: '',                   // 备注
    lastEditBy: '',               // 最后编辑人
    lastEditTime: '',             // 最后编辑时间
  });
  const [editItems, setEditItems] = useState<PurchasePlanItem[]>([]);  // 编辑弹窗中的物料明细
  const [editOriginalStatus, setEditOriginalStatus] = useState('');  // 记录原始状态（用于回显）
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [createForm, setCreateForm] = useState({
    purchaseApplicationCode: '',
    relatedBatchCode: '',
    purchaseType: '生产物资采购',
    applicant: '',
    applicantDepartment: '',
    applyDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    priority: '中',
    remark: '',
    otherBatchReason: '',  // 当批次号选择"其他"时的说明
  });
  // 新增弹窗中的物料明细
  const [createItems, setCreateItems] = useState<PurchasePlanItem[]>([]);
  // 批量编辑相关状态 - 新模式：逐个选择批次编辑
  const [editedPlanCodes, setEditedPlanCodes] = useState<string[]>([]); // 已编辑的批次码列表
  const [editedPlans, setEditedPlans] = useState<Record<string, Partial<PurchasePlan>>>({}); // 已编辑的批次数据
  const [selectedPlanCode, setSelectedPlanCode] = useState(''); // 当前选中的批次号
  const [currentEditingPlan, setCurrentEditingPlan] = useState<PurchasePlan | null>(null); // 当前编辑的采购计划完整数据
  // 批量编辑数据状态 - 批次号和状态不可编辑，根据流程自动生成
  const [batchEditData, setBatchEditData] = useState({
    purchaseType: '',
    priority: '',
    requiredDate: '',
    remark: '',
  });

  // 展开/折叠行切换
  const toggleExpandRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 排序状态
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  // 排序处理
  const handleSortChange = (field: string) => {
    setSortConfig(prev => {
      if (prev?.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return null;
    });
  };

  // 排序比较函数
  const getSortIndicator = (field: string) => {
    if (sortConfig?.field !== field) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // 过滤和排序后的数据
  const filteredAndSortedData = purchasePlansData
    .filter(plan => {
      if (relatedBatchCode && !plan.relatedBatchCode.toLowerCase().includes(relatedBatchCode.toLowerCase())) return false;
      if (purchaseType !== '全部' && plan.purchaseTypeName !== purchaseType) return false;
      if (status !== '全部' && plan.statusText !== status) return false;
      if (applicant && !plan.applicant.toLowerCase().includes(applicant.toLowerCase())) return false;
      if (applicantDepartment && !plan.applicantDepartment.toLowerCase().includes(applicantDepartment.toLowerCase())) return false;
      if (priority !== '全部' && plan.priorityText !== priority) return false;
      if (requiredStartDate && plan.requiredDate < requiredStartDate) return false;
      if (requiredEndDate && plan.requiredDate > requiredEndDate) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { field, direction } = sortConfig;
      let aValue: any = a[field as keyof typeof a];
      let bValue: any = b[field as keyof typeof b];
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const generateCode = () => {
    return `PP${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      purchaseApplicationCode: `PA${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      relatedBatchCode: '',
      purchaseType: '生产物资采购',
      applicant: '',
      applicantDepartment: '',
      applyDate: new Date().toISOString().split('T')[0],
      requiredDate: '',
      priority: '中',
      remark: '',
      otherBatchReason: '',
    });
    setCreateItems([]);
    setShowCreateModal(true);
  };

  // 导入物料相关
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 解析导入的数据
        const importedItems = jsonData.map((row: any, index: number) => ({
          id: `IMPORT-${Date.now()}-${index}`,
          materialCode: row['物料编码'] || row['materialCode'] || '',
          materialName: row['物料名称'] || row['materialName'] || '',
          category: row['分类'] || row['category'] || '',
          specification: row['规格型号'] || row['specification'] || '',
          unit: row['单位'] || row['unit'] || '袋',
          quantity: Number(row['数量'] || row['quantity'] || 0),
          estimatedPrice: Number(row['预估单价'] || row['estimatedPrice'] || 0),
          estimatedTotalPrice: Number(row['数量'] || row['quantity'] || 0) * Number(row['预估单价'] || row['estimatedPrice'] || 0),
          supplier: row['供应商'] || row['supplier'] || '',
          purpose: row['用途说明'] || row['purpose'] || '',
          remark: row['备注'] || row['remark'] || '',
        })).filter((item) => item.materialCode || item.materialName);

        if (importedItems.length > 0) {
          setCreateItems([...createItems, ...importedItems]);
          alert(`成功导入 ${importedItems.length} 条物料明细`);
        } else {
          alert('导入失败：未找到有效的物料数据');
        }
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败：请确保文件格式正确');
      }
    };
    reader.readAsArrayBuffer(file);

    // 清空 input 值，以便重复选择同一文件
    e.target.value = '';
  };

  // 添加物料明细
  const handleAddCreateItem = () => {
    const newItem: PurchasePlanItem = {
      id: `NEW-${Date.now()}`,
      materialId: '',
      materialCode: '',
      materialName: '',
      barcode: '',
      category: '',
      specification: '',
      unit: '袋',
      quantity: 0,
      estimatedPrice: 0,
      estimatedTotalPrice: 0,
      supplier: '',
      location: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      purpose: '',
      remark: '',
    };
    setCreateItems([...createItems, newItem]);
  };

  // 删除物料明细
  const handleDeleteCreateItem = (id: string) => {
    setCreateItems(createItems.filter(item => item.id !== id));
  };

  // 更新物料明细字段
  const handleUpdateCreateItem = (id: string, field: keyof PurchasePlanItem, value: string | number) => {
    setCreateItems(createItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // 自动计算预估总价
        if (field === 'quantity' || field === 'estimatedPrice') {
          updated.estimatedTotalPrice = Number(updated.quantity) * Number(updated.estimatedPrice);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleCreateSubmit = () => {
    setShowCreateModal(false);
  };

  const handleReset = () => {
    setRelatedBatchCode('');
    setPurchaseType('全部');
    setStatus('全部');
    setApplicant('');
    setApplicantDepartment('');
    setPriority('全部');
    setRequiredStartDate('');
    setRequiredEndDate('');
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredAndSortedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredAndSortedData.map(p => p.purchaseApplicationCode));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    // Get selected data
    const selectedData = purchasePlansData.filter(p => selectedRows.includes(p.id));
    const headers = ['计划编号', '计划名称', '类型', '申请人', '申请日期', '总金额', '供应商', '交货日期', '优先级', '状态'];
    const exportData = selectedData.map(row => ({
      '计划编号': row.code,
      '计划名称': row.name,
      '类型': row.type,
      '申请人': row.applicant,
      '申请日期': row.applyDate,
      '总金额': row.totalAmount,
      '供应商': row.supplier,
      '交货日期': row.deliveryDate,
      '优先级': row.priority,
      '状态': row.status
    }));

    // Create content based on format
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      // CSV format
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      // Excel format (as HTML table)
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      // Word format (as HTML)
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    // Try to use showSaveFilePicker for Chrome/Edge (allows user to choose save location)
    const fileName = `采购计划_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
        // Fallback for browsers without showSaveFilePicker
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      // Fallback
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Reset states
    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleDeleteClick = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要删除的数据');
      return;
    }
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    console.log('删除选中的采购计划:', selectedRows);
    setShowDeleteModal(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
    alert(`已删除 ${selectedRows.length} 个采购计划`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">采购计划</h1>
            <p className="text-gray-500">物资采购计划的管理与审批</p>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">关联生产批次</label>
            <input
              type="text"
              value={relatedBatchCode}
              onChange={(e) => setRelatedBatchCode(e.target.value)}
              placeholder="请输入"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[100px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">采购类型</label>
            <select
              value={purchaseType}
              onChange={(e) => setPurchaseType(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>生产物资采购</option>
              <option>紧急采购</option>
              <option>常规采购</option>
              <option>通用物资</option>
              <option>设备采购</option>
              <option>其他</option>
            </select>
          </div>
          <div className="min-w-[90px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
            <input
              type="text"
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              placeholder="请输入"
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[90px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">申请部门</label>
            <input
              type="text"
              value={applicantDepartment}
              onChange={(e) => setApplicantDepartment(e.target.value)}
              placeholder="请输入"
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[70px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>紧急</option>
              <option>高</option>
              <option>中</option>
              <option>低</option>
            </select>
          </div>
          <div className="min-w-[90px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>草稿</option>
              <option>待审批</option>
              <option>已通过</option>
              <option>采购中</option>
              <option>已完成</option>
              <option>已取消</option>
            </select>
          </div>
          <div className="min-w-[110px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">需求开始日期</label>
            <input
              type="date"
              value={requiredStartDate}
              onChange={(e) => setRequiredStartDate(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[110px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">需求结束日期</label>
            <input
              type="date"
              value={requiredEndDate}
              onChange={(e) => setRequiredEndDate(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          {/* 重置和搜索按钮靠右 */}
          <div className="flex gap-2 ml-auto">
            <button onClick={handleReset} className="h-9 px-4 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600">
              重置
            </button>
            <button className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
              <Search className="w-4 h-4" />
              搜索
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">采购计划列表</h3>
          {exportMode || batchEditMode || batchDeleteMode ? (
            <div className="flex gap-2">
              {batchEditMode && (
                <>
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要编辑的数据');
                        return;
                      }
                      // 初始化批量编辑状态 - selectedRows存储的是purchaseApplicationCode
                      const selectedPlansData = purchasePlansData.filter(p => selectedRows.includes(p.purchaseApplicationCode));
                      if (selectedPlansData.length > 0) {
                        setSelectedPlanCode(selectedPlansData[0].purchaseApplicationCode);
                        setCurrentEditingPlan(selectedPlansData[0]);
                        setBatchEditData({
                          purchaseType: selectedPlansData[0].purchaseType,
                          priority: selectedPlansData[0].priority,
                          requiredDate: selectedPlansData[0].requiredDate || '',
                          remark: selectedPlansData[0].remark || '',
                        });
                      }
                      setEditedPlanCodes([]);
                      setEditedPlans({});
                      setShowBatchEditModal(true);
                    }}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => {
                      setBatchEditMode(false);
                      setSelectedRows([]);
                    }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要删除的数据');
                        return;
                      }
                      setShowDeleteModal(true);
                    }}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                  <button
                    onClick={() => {
                      setBatchDeleteMode(false);
                      setSelectedRows([]);
                    }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {exportMode && (
                <>
                  <button onClick={() => setShowExportModal(true)} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    取消
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleOpenCreateModal} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Plus className="w-4 h-4" />
                新增
              </button>
              <button
                onClick={() => {
                  setBatchEditMode(true);
                  setSelectedRows([]);
                }}
                className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => {
                  setBatchDeleteMode(true);
                  setSelectedRows([]);
                }}
                className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button onClick={handleExportClick} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {/* 展开按钮列 - 非导出模式时显示 */}
                {!(exportMode || batchEditMode || batchDeleteMode) && (
                  <th className="px-2 py-3 text-left text-sm font-semibold whitespace-nowrap w-10">
                  </th>
                )}
                {/* checkbox 列 - 导出/批量模式时显示 */}
                {(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采购申请批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">关联生产批次</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => handleSortChange('purchaseType')}>采购类型{sortConfig?.field === 'purchaseType' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => handleSortChange('applicant')}>申请人{sortConfig?.field === 'applicant' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => handleSortChange('applyDate')}>申请日期{sortConfig?.field === 'applyDate' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => handleSortChange('requiredDate')}>需求日期{sortConfig?.field === 'requiredDate' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => handleSortChange('priority')}>优先级{sortConfig?.field === 'priority' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => handleSortChange('status')}>状态{sortConfig?.field === 'status' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                {!(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredAndSortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((plan) => (
                <React.Fragment key={plan.id}>
                  <tr className="hover:bg-blue-50 transition-colors">
                    {/* 展开/折叠按钮 - 非导出模式时显示 */}
                    {!(exportMode || batchEditMode || batchDeleteMode) && (
                      <td className="px-2 py-3 w-10">
                        <button
                          onClick={() => toggleExpandRow(plan.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title={expandedRows.has(plan.id) ? '折叠' : '展开'}
                        >
                          {expandedRows.has(plan.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                    )}
                    {/* checkbox - 导出/批量模式时显示 */}
                    {(exportMode || batchEditMode || batchDeleteMode) && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(plan.purchaseApplicationCode)}
                          onChange={() => handleSelectRow(plan.purchaseApplicationCode)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedPlanDetail(plan);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                        title="点击查看详情"
                      >
                        {plan.purchaseApplicationCode}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.relatedBatchCode || '不关联批次'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.purchaseTypeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applicantDepartment}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applyDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.requiredDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        plan.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        plan.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        plan.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {plan.priorityText}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                        plan.status === 'purchasing' ? 'bg-purple-100 text-purple-700' :
                        plan.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        plan.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {plan.statusText}
                      </span>
                    </td>
                    {!(exportMode || batchEditMode || batchDeleteMode) && (
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelectedRows([plan.purchaseApplicationCode]); setShowDeleteModal(true); }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                  {/* 展开的物料明细行 - 对齐仓库物料字段结构 */}
                  {expandedRows.has(plan.id) && (
                    <tr key={`${plan.id}-expanded`} className="bg-blue-50/50">
                      <td colSpan={exportMode || batchEditMode || batchDeleteMode ? 9 : 10} className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-700 mb-3">物料明细（共 {plan.items?.length || 0} 项）</div>
                        <table className="w-full bg-white rounded-lg overflow-hidden">
                          <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <tr>
                              <th className="px-2 py-2 text-left text-xs font-semibold">物料编码</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold">物料名称</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold">分类</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold">规格型号</th>
                              <th className="px-2 py-2 text-center text-xs font-semibold">单位</th>
                              <th className="px-2 py-2 text-right text-xs font-semibold">数量</th>
                              <th className="px-2 py-2 text-right text-xs font-semibold">预估单价</th>
                              <th className="px-2 py-2 text-right text-xs font-semibold">小计</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold">供应商</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold">用途说明</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold">备注</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {plan.items?.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-2 py-2 text-xs text-gray-600 font-mono">{item.materialCode}</td>
                                <td className="px-2 py-2 text-xs text-gray-900 font-medium">{item.materialName}</td>
                                <td className="px-2 py-2 text-xs text-gray-600">{item.category || '-'}</td>
                                <td className="px-2 py-2 text-xs text-gray-600">{item.specification}</td>
                                <td className="px-2 py-2 text-xs text-gray-600 text-center">{item.unit}</td>
                                <td className="px-2 py-2 text-xs text-gray-900 text-right font-medium">{item.quantity}</td>
                                <td className="px-2 py-2 text-xs text-gray-600 text-right">¥{item.estimatedPrice.toFixed(2)}</td>
                                <td className="px-2 py-2 text-xs text-gray-900 text-right font-medium">¥{item.estimatedTotalPrice.toLocaleString()}</td>
                                <td className="px-2 py-2 text-xs text-gray-600">{item.supplier || '-'}</td>
                                <td className="px-2 py-2 text-xs text-gray-600">{item.purpose || '-'}</td>
                                <td className="px-2 py-2 text-xs text-gray-600">{item.remark || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {(exportMode || batchEditMode || batchDeleteMode) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {selectedRows.length === filteredAndSortedData.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">每页</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-200 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">共 {filteredAndSortedData.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(filteredAndSortedData.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredAndSortedData.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredAndSortedData.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新增采购申请单"
        size="xxl"
        onSubmit={handleCreateSubmit}
        submitText="提交"
        cancelText="取消"
      >
        <div className="space-y-4">
          {/* 采购申请批次号单独一行 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="采购申请批次号">
              <div className="flex gap-2">
                <Input
                  value={createForm.purchaseApplicationCode}
                  onChange={(e) => setCreateForm({...createForm, purchaseApplicationCode: e.target.value})}
                  placeholder="PA2026XXXXX"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    // 生成不重复的编号
                    let newCode = '';
                    let exists = true;
                    let attempts = 0;
                    while (exists && attempts < 100) {
                      newCode = `PA${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                      exists = purchasePlansData.some(plan => plan.purchaseApplicationCode === newCode);
                      attempts++;
                    }
                    setCreateForm({...createForm, purchaseApplicationCode: newCode});
                  }}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4" />
                  生成
                </button>
              </div>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="采购类型">
              <Select
                value={createForm.purchaseType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setCreateForm({
                    ...createForm,
                    purchaseType: newType,
                    // 生产物资采购必须关联批次，其他类型不关联
                    relatedBatchCode: newType === '生产物资采购' ? createForm.relatedBatchCode : ''
                  });
                }}
                options={[
                  { value: '生产物资采购', label: '生产物资采购' },
                  { value: '紧急采购', label: '紧急采购' },
                  { value: '常规采购', label: '常规采购' },
                  { value: '通用物资', label: '通用物资' },
                  { value: '劳保用品', label: '劳保用品' },
                  { value: '设备采购', label: '设备采购' },
                  { value: '其他', label: '其他' },
                ]}
              />
            </FormField>
            <FormField label="关联生产批次号">
              <Select
                value={createForm.relatedBatchCode || ''}
                onChange={(e) => setCreateForm({...createForm, relatedBatchCode: e.target.value || undefined})}
                options={[
                  { value: 'SC202603001', label: 'SC202603001 - 番茄种植批次' },
                  { value: 'SC202603002', label: 'SC202603002 - 黄瓜种植批次' },
                  { value: 'SC202603003', label: 'SC202603003 - 茄子种植批次' },
                  { value: 'other', label: '其他' },
                ]}
              />
            </FormField>
            {createForm.relatedBatchCode === 'other' && (
              <FormField label="其他说明">
                <Input
                  value={createForm.otherBatchReason || ''}
                  onChange={(e) => setCreateForm({...createForm, otherBatchReason: e.target.value})}
                  placeholder="请说明采购原因，如：日常用具、劳保用品等"
                />
              </FormField>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="申请人">
              <Select
                value={createForm.applicant}
                onChange={(e) => {
                  setCreateForm({...createForm, applicant: e.target.value});
                }}
                options={[
                  { value: '', label: '请选择' },
                  { value: '郭靖', label: '郭靖' },
                  { value: '黄蓉', label: '黄蓉' },
                  { value: '杨过', label: '杨过' },
                  { value: '小龙女', label: '小龙女' },
                  { value: '张无忌', label: '张无忌' },
                  { value: '赵敏', label: '赵敏' },
                  { value: '周芷若', label: '周芷若' },
                  { value: '令狐冲', label: '令狐冲' },
                  { value: '任盈盈', label: '任盈盈' },
                  { value: '萧峰', label: '萧峰' },
                  { value: '段誉', label: '段誉' },
                  { value: '虚竹', label: '虚竹' },
                  { value: '韦小宝', label: '韦小宝' },
                  { value: '陈家洛', label: '陈家洛' },
                  { value: '袁承志', label: '袁承志' },
                ]}
              />
            </FormField>
            <FormField label="申请部门">
              <Select
                value={createForm.applicantDepartment}
                onChange={(e) => setCreateForm({...createForm, applicantDepartment: e.target.value})}
                options={[
                  { value: '', label: '请选择' },
                  { value: '生产部', label: '生产部' },
                  { value: '技术部', label: '技术部' },
                  { value: '后勤部', label: '后勤部' },
                  { value: '财务部', label: '财务部' },
                  { value: '采购部', label: '采购部' },
                  { value: '仓储部', label: '仓储部' },
                  { value: '销售部', label: '销售部' },
                ]}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="申请日期">
              <Input
                type="date"
                value={createForm.applyDate}
                onChange={(e) => setCreateForm({...createForm, applyDate: e.target.value})}
              />
            </FormField>
            <FormField label="需求日期">
              <Input
                type="date"
                value={createForm.requiredDate}
                onChange={(e) => setCreateForm({...createForm, requiredDate: e.target.value})}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="优先级">
              <Select
                value={createForm.priority}
                onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                options={[
                  { value: '紧急', label: '紧急' },
                  { value: '高', label: '高' },
                  { value: '中', label: '中' },
                  { value: '低', label: '低' },
                ]}
              />
            </FormField>
            <FormField label="备注">
              <Input
                value={createForm.remark || ''}
                onChange={(e) => setCreateForm({...createForm, remark: e.target.value})}
                placeholder="请输入备注"
              />
            </FormField>
          </div>

          {/* 物料明细区域 */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">物料明细（{createItems.length}种物料）</h4>
              <button
                onClick={handleAddCreateItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
              >
                <Plus className="w-3 h-3" />
                添加物料
              </button>
              <button
                onClick={handleImportClick}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
              >
                <Upload className="w-3 h-3" />
                导入物料
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {createItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                暂无物料，请点击"添加物料"按钮添加
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">操作</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料编码</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料名称</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">分类</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">规格型号</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-600 whitespace-nowrap">单位</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">数量</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">预估单价</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">预估总价</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">供应商</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">用途说明</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {createItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteCreateItem(item.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.materialCode}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'materialCode', e.target.value)}
                            placeholder="编码"
                            className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.materialName}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'materialName', e.target.value)}
                            placeholder="名称"
                            className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'category', e.target.value)}
                            placeholder="分类"
                            className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.specification}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'specification', e.target.value)}
                            placeholder="规格"
                            className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap text-center">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'unit', e.target.value)}
                            placeholder="单位"
                            className="w-12 h-6 px-1 border border-gray-200 rounded text-xs text-center"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap text-right">
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'quantity', Number(e.target.value))}
                            placeholder="0"
                            className="w-14 h-6 px-1 border border-gray-200 rounded text-xs text-right"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap text-right">
                          <input
                            type="number"
                            value={item.estimatedPrice || ''}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'estimatedPrice', Number(e.target.value))}
                            placeholder="0"
                            className="w-14 h-6 px-1 border border-gray-200 rounded text-xs text-right"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap text-right">
                          <span className="text-xs text-gray-900 font-medium">
                            ¥{item.estimatedTotalPrice.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.supplier}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'supplier', e.target.value)}
                            placeholder="供应商"
                            className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.purpose}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'purpose', e.target.value)}
                            placeholder="用途"
                            className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.remark}
                            onChange={(e) => handleUpdateCreateItem(item.id, 'remark', e.target.value)}
                            placeholder="备注"
                            className="w-14 h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 详情弹窗 - 按照新增弹窗布局显示采购申请单所有信息 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPlanDetail(null);
        }}
        title="采购申请单详情"
        size="xxl"
        showFooter={false}
      >
        {selectedPlanDetail && (
          <div className="space-y-3">
            {/* 第一行：采购申请批次号、采购类型、关联生产批次 */}
            <div className="grid grid-cols-3 gap-3">
              <FormField label="采购申请批次号">
                <Input
                  value={selectedPlanDetail.purchaseApplicationCode}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
              <FormField label="采购类型">
                <Input
                  value={selectedPlanDetail.purchaseTypeName}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
              <FormField label="关联生产批次号">
                <Input
                  value={selectedPlanDetail.relatedBatchCode || '不关联批次'}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
            </div>
            {/* 第二行：申请人、申请部门、申请日期 */}
            <div className="grid grid-cols-3 gap-3">
              <FormField label="申请人">
                <Input
                  value={selectedPlanDetail.applicant}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
              <FormField label="申请部门">
                <Input
                  value={selectedPlanDetail.applicantDepartment}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
              <FormField label="申请日期">
                <Input
                  type="date"
                  value={selectedPlanDetail.applyDate}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
            </div>
            {/* 第三行：需求日期、优先级、状态 */}
            <div className="grid grid-cols-3 gap-3">
              <FormField label="需求日期">
                <Input
                  type="date"
                  value={selectedPlanDetail.requiredDate}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
              <FormField label="优先级">
                <div className="flex items-center h-9 px-3 border border-gray-200 rounded-lg bg-gray-100">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedPlanDetail.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    selectedPlanDetail.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    selectedPlanDetail.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedPlanDetail.priorityText}
                  </span>
                </div>
              </FormField>
              <FormField label="状态">
                <div className="flex items-center h-9 px-3 border border-gray-200 rounded-lg bg-gray-100">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedPlanDetail.status === 'completed' ? 'bg-green-100 text-green-700' :
                    selectedPlanDetail.status === 'purchasing' ? 'bg-purple-100 text-purple-700' :
                    selectedPlanDetail.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    selectedPlanDetail.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    selectedPlanDetail.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedPlanDetail.statusText}
                  </span>
                </div>
              </FormField>
            </div>
            {/* 第四行：备注（占整行） */}
            <div className="grid grid-cols-3 gap-3">
              <FormField label="备注" className="col-span-2">
                <Input
                  value={selectedPlanDetail.remark || '-'}
                  disabled
                  className="bg-gray-100"
                />
              </FormField>
            </div>

            {/* 物料明细区域 */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">物料明细（{selectedPlanDetail.items?.length || 0}种物料）</h4>
              {selectedPlanDetail.items && selectedPlanDetail.items.length > 0 ? (
                <div className="overflow-auto max-h-80 rounded-lg border border-gray-200 bg-white">
                  <table className="text-sm" style={{ minWidth: '1600px' }}>
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">物料编码</th>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">物料名称</th>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">分类</th>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">规格型号</th>
                        <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">单位</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">数量</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">预估单价</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">预估总价</th>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">供应商</th>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">用途说明</th>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedPlanDetail.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-600 font-mono whitespace-nowrap">{item.materialCode || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap">{item.materialName || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.category || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.specification || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-center whitespace-nowrap">{item.unit || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-900 text-right font-medium whitespace-nowrap">{item.quantity || 0}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-right whitespace-nowrap">¥{(item.estimatedPrice || 0).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-gray-900 text-right font-medium whitespace-nowrap">¥{(item.estimatedTotalPrice || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.supplier || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.purpose || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                  暂无物料明细
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>


      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />


      {/* Batch Edit Modal - 完全参照供应商管理编辑功能结构 */}
      {showBatchEditModal && (() => {
        const selectedPlansList = purchasePlansData.filter(p => selectedRows.includes(p.purchaseApplicationCode));

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              {/* 标题栏 - 蓝色背景 sticky */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
                <h3 className="text-lg font-semibold text-white">编辑采购申请单</h3>
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditMode(false); setSelectedRows([]); setEditedPlanCodes([]); setEditedPlans({}); setSelectedPlanCode(''); setCurrentEditingPlan(null); }} className="text-white hover:bg-blue-700 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {/* 提示信息 */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 个采购计划进行编辑</p>
                </div>

                {/* 采购申请批次号选择下拉 */}
                {/* 选择采购申请批次号 - 自定义下拉框 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择采购申请批次号</label>
                  <div className="relative" ref={batchSelectRef}>
                    <div
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg bg-white flex items-center justify-between cursor-pointer"
                      onClick={() => setBatchSelectOpen(!batchSelectOpen)}
                    >
                      <span className={selectedPlanCode ? "text-sm text-gray-900" : "text-sm text-gray-400"}>
                        {selectedPlanCode || '-- 请选择 --'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${batchSelectOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {batchSelectOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {selectedRows.length > 0 ? (
                          selectedPlansList.map((plan) => {
                            const isEdited = editedPlans[plan.purchaseApplicationCode] !== undefined;
                            return (
                              <div
                                key={plan.purchaseApplicationCode}
                                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${
                                  selectedPlanCode === plan.purchaseApplicationCode ? 'bg-blue-100' : ''
                                }`}
                                onClick={() => {
                                  setSelectedPlanCode(plan.purchaseApplicationCode);
                                  setCurrentEditingPlan(plan);
                                  setBatchEditData({
                                    purchaseType: plan.purchaseType,
                                    priority: plan.priority,
                                    requiredDate: plan.requiredDate,
                                    remark: plan.remark || '',
                                  });
                                  setBatchSelectOpen(false);
                                }}
                              >
                                <span className="text-sm flex items-center gap-1">
                                  {plan.purchaseApplicationCode}
                                  {isEdited && (
                                    <span className="text-blue-600 font-bold">✓已编辑</span>
                                  )}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-400">-- 请先选择要编辑的数据 --</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 编辑表单 - 紧凑布局 2-3列 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* 第1行：采购申请批次号（只读）+ 采购类型 + 关联生产批次号 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">采购申请批次号</div>
                    <div className="text-sm font-medium text-gray-900">{currentEditingPlan?.purchaseApplicationCode || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">采购类型</label>
                    <select
                      value={batchEditData.purchaseType}
                      onChange={(e) => {
                        setBatchEditData({...batchEditData, purchaseType: e.target.value});
                        if (selectedPlanCode) {
                          setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), purchaseType: e.target.value } }));
                        }
                      }}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="production">生产物资采购</option>
                      <option value="urgent">紧急采购</option>
                      <option value="routine">常规采购</option>
                      <option value="material">通用物资</option>
                      <option value="safety">劳保用品</option>
                      <option value="equipment">设备采购</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">关联生产批次号</label>
                    <select
                      value={currentEditingPlan?.relatedBatchCode || ''}
                      onChange={(e) => {
                        setCurrentEditingPlan({...currentEditingPlan!, relatedBatchCode: e.target.value});
                        if (selectedPlanCode) {
                          setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), relatedBatchCode: e.target.value } }));
                        }
                      }}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">不关联批次</option>
                      <option value="SC202603001">SC202603001 - 番茄种植批次</option>
                      <option value="SC202603002">SC202603002 - 黄瓜种植批次</option>
                      <option value="SC202603003">SC202603003 - 茄子种植批次</option>
                      <option value="SC202604001">SC202604001 - 辣椒种植批次</option>
                    </select>
                  </div>

                  {/* 第2行：申请人 + 申请部门 + 需求日期 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">申请人</label>
                    <select
                      value={currentEditingPlan?.applicant || ''}
                      onChange={(e) => {
                        setCurrentEditingPlan({...currentEditingPlan!, applicant: e.target.value});
                        if (selectedPlanCode) {
                          setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), applicant: e.target.value } }));
                        }
                      }}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="李建国">李建国</option>
                      <option value="王建华">王建华</option>
                      <option value="张建华">张建华</option>
                      <option value="刘小燕">刘小燕</option>
                      <option value="刘大海">刘大海</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">申请部门</label>
                    <select
                      value={currentEditingPlan?.applicantDepartment || ''}
                      onChange={(e) => {
                        setCurrentEditingPlan({...currentEditingPlan!, applicantDepartment: e.target.value});
                        if (selectedPlanCode) {
                          setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), applicantDepartment: e.target.value } }));
                        }
                      }}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="生产部">生产部</option>
                      <option value="技术部">技术部</option>
                      <option value="后勤部">后勤部</option>
                      <option value="办公室">办公室</option>
                      <option value="财务部">财务部</option>
                      <option value="采购部">采购部</option>
                      <option value="仓储部">仓储部</option>
                      <option value="销售部">销售部</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">需求日期</label>
                    <input
                      type="date"
                      value={batchEditData.requiredDate}
                      onChange={(e) => {
                        setBatchEditData({...batchEditData, requiredDate: e.target.value});
                        if (selectedPlanCode) {
                          setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), requiredDate: e.target.value } }));
                        }
                      }}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* 第3行：优先级 + 状态（只读不可编辑）+ 备注 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">优先级</label>
                    <select
                      value={batchEditData.priority}
                      onChange={(e) => {
                        setBatchEditData({...batchEditData, priority: e.target.value});
                        if (selectedPlanCode) {
                          setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), priority: e.target.value } }));
                        }
                      }}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="urgent">紧急</option>
                      <option value="high">高</option>
                      <option value="normal">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">状态</div>
                    <div className={`text-sm font-medium ${
                      currentEditingPlan?.status === 'completed' ? 'text-green-600' :
                      currentEditingPlan?.status === 'purchasing' ? 'text-purple-600' :
                      currentEditingPlan?.status === 'pending' ? 'text-amber-600' :
                      currentEditingPlan?.status === 'approved' ? 'text-blue-600' :
                      currentEditingPlan?.status === 'cancelled' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {currentEditingPlan?.statusText || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
                    <input
                      type="text"
                      value={batchEditData.remark}
                      onChange={(e) => {
                        setBatchEditData({...batchEditData, remark: e.target.value});
                        if (selectedPlanCode) {
                          setEditedPlans(prev => ({ ...prev, [selectedPlanCode]: { ...(prev[selectedPlanCode] || {}), remark: e.target.value } }));
                        }
                      }}
                      placeholder="输入备注"
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* 第4行：物料明细（展开显示） */}
                  <div className="md:col-span-3 border-t border-gray-200 pt-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowEditItemsExpanded(!showEditItemsExpanded)}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showEditItemsExpanded ? 'rotate-180' : ''}`} />
                      物料明细（{currentEditingPlan?.items?.length || 0}种物料）
                    </button>

                    {showEditItemsExpanded && currentEditingPlan?.items && currentEditingPlan.items.length > 0 && (
                      <div className="mt-3 overflow-auto rounded-lg border border-gray-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                            <tr>
                              <th className="px-2 py-2 text-left font-semibold">物料编码</th>
                              <th className="px-2 py-2 text-left font-semibold">物料名称</th>
                              <th className="px-2 py-2 text-left font-semibold">分类</th>
                              <th className="px-2 py-2 text-left font-semibold">规格型号</th>
                              <th className="px-2 py-2 text-center font-semibold">单位</th>
                              <th className="px-2 py-2 text-right font-semibold">数量</th>
                              <th className="px-2 py-2 text-right font-semibold">预估单价</th>
                              <th className="px-2 py-2 text-left font-semibold">供应商</th>
                              <th className="px-2 py-2 text-left font-semibold">用途说明</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {currentEditingPlan.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-2 py-2 font-mono">{item.materialCode}</td>
                                <td className="px-2 py-2 font-medium">{item.materialName}</td>
                                <td className="px-2 py-2">{item.category || '-'}</td>
                                <td className="px-2 py-2">{item.specification}</td>
                                <td className="px-2 py-2 text-center">{item.unit}</td>
                                <td className="px-2 py-2 text-right font-medium">{item.quantity}</td>
                                <td className="px-2 py-2 text-right">¥{item.estimatedPrice.toFixed(2)}</td>
                                <td className="px-2 py-2">{item.supplier || '-'}</td>
                                <td className="px-2 py-2">{item.purpose || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {showEditItemsExpanded && (!currentEditingPlan?.items || currentEditingPlan.items.length === 0) && (
                      <div className="mt-3 text-center py-4 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                        暂无物料明细
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部按钮 */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowBatchEditModal(false); setBatchEditMode(false); setSelectedRows([]); setEditedPlanCodes([]); setEditedPlans({}); setSelectedPlanCode(''); setCurrentEditingPlan(null); }}
                    className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentEditingPlan) return;
                      // 保存编辑内容
                      console.log('保存采购申请单编辑:', {
                        purchaseApplicationCode: currentEditingPlan.purchaseApplicationCode,
                        relatedBatchCode: currentEditingPlan.relatedBatchCode,
                        purchaseType: batchEditData.purchaseType,
                        priority: batchEditData.priority,
                        requiredDate: batchEditData.requiredDate,
                        remark: batchEditData.remark,
                        // 状态保持不变，由业务流程自动生成
                        status: currentEditingPlan.status,
                        items: currentEditingPlan.items,
                      });
                      // 更新数据
                      setPurchasePlansData(prev => prev.map(plan => {
                        if (plan.purchaseApplicationCode === currentEditingPlan.purchaseApplicationCode) {
                          return {
                            ...plan,
                            relatedBatchCode: currentEditingPlan.relatedBatchCode,
                            purchaseType: batchEditData.purchaseType,
                            purchaseTypeName: batchEditData.purchaseType === 'production' ? '生产物资采购' :
                                             batchEditData.purchaseType === 'urgent' ? '紧急采购' :
                                             batchEditData.purchaseType === 'routine' ? '常规采购' :
                                             batchEditData.purchaseType === 'material' ? '通用物资' :
                                             batchEditData.purchaseType === 'safety' ? '劳保用品' :
                                             batchEditData.purchaseType === 'equipment' ? '设备采购' : '其他',
                            applicant: currentEditingPlan.applicant,
                            applicantDepartment: currentEditingPlan.applicantDepartment,
                            requiredDate: batchEditData.requiredDate,
                            priority: batchEditData.priority,
                            priorityText: batchEditData.priority === 'urgent' ? '紧急' :
                                         batchEditData.priority === 'high' ? '高' :
                                         batchEditData.priority === 'normal' ? '中' : '低',
                            remark: batchEditData.remark,
                            items: currentEditingPlan.items,
                          };
                        }
                        return plan;
                      }));
                      setShowBatchEditModal(false);
                      setBatchEditMode(false);
                      setSelectedRows([]);
                      alert('保存成功');
                    }}
                    className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Export Format Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="选择导出格式"
        size="md"
        bodyClassName="min-h-[280px]"
        onSubmit={handleConfirmExport}
        submitText="导出"
        cancelText="取消"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">已选择 {selectedRows.length} 条数据</p>
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
                  <p className="text-sm font-medium text-gray-900">{format.label}</p>
                  <p className="text-xs text-gray-500">{format.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
