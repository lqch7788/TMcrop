import { useState } from 'react';
import { ShoppingCart, Plus, Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { DeleteWarningModal } from './DeleteWarningModal';

const purchasePlans = [
  { id: 1, code: 'PP202401', name: '春季生产物资采购计划', type: '生产物资', applicant: '李建国', applyDate: '2024-01-05', totalAmount: '12.5万元', status: '已完成', statusClass: 'normal', supplier: '鑫源农资公司', deliveryDate: '2024-02-15', priority: '高', items: 8 },
  { id: 2, code: 'PP202402', name: '春季肥料采购计划', type: '肥料', applicant: '李建国', applyDate: '2024-02-10', totalAmount: '8.3万元', status: '进行中', statusClass: 'pending', supplier: '丰达化肥厂', deliveryDate: '2024-03-20', priority: '高', items: 5 },
  { id: 3, code: 'PP202403', name: '夏季种植用肥采购计划', type: '肥料', applicant: '李建国', applyDate: '2024-03-01', totalAmount: '15.8万元', status: '待审批', statusClass: 'pending', supplier: '待确定', deliveryDate: '2024-05-01', priority: '高', items: 12 },
  { id: 4, code: 'PP202404', name: '病虫害防治药剂采购', type: '农药', applicant: '王建华', applyDate: '2024-03-10', totalAmount: '5.6万元', status: '待审批', statusClass: 'pending', supplier: '待确定', deliveryDate: '2024-04-15', priority: '中', items: 6 },
  { id: 5, code: 'PP202405', name: '大棚保温材料采购', type: '物资', applicant: '张建华', applyDate: '2024-03-12', totalAmount: '3.2万元', status: '已完成', statusClass: 'normal', supplier: '建材市场A店', deliveryDate: '2024-03-25', priority: '低', items: 3 },
];

export function PurchasePlanPage() {
  const [code, setCode] = useState('');
  const [type, setType] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [applicant, setApplicant] = useState('');
  const [supplier, setSupplier] = useState('');
  const [deliveryStartDate, setDeliveryStartDate] = useState('');
  const [deliveryEndDate, setDeliveryEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    type: '生产物资',
    applicant: '',
    applyDate: new Date().toISOString().split('T')[0],
    totalAmount: '',
    supplier: '',
    deliveryDate: '',
    priority: '中',
    status: '待审批',
  });
  // 批量编辑相关状态
  const [editedPlanCodes, setEditedPlanCodes] = useState<string[]>([]);
  const [editedPlans, setEditedPlans] = useState<Record<string, Partial<typeof purchasePlans[0]>>>({});
  const [selectedPlanCode, setSelectedPlanCode] = useState('');

  const generateCode = () => {
    return `PP${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      code: generateCode(),
      name: '',
      type: '生产物资',
      applicant: '',
      applyDate: new Date().toISOString().split('T')[0],
      totalAmount: '',
      supplier: '',
      deliveryDate: '',
      priority: '中',
      status: '待审批',
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = () => {
    setShowCreateModal(false);
  };

  const handleReset = () => {
    setCode('');
    setType('全部');
    setStatus('全部');
    setApplicant('');
    setSupplier('');
    setDeliveryStartDate('');
    setDeliveryEndDate('');
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === purchasePlans.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(purchasePlans.map(p => p.id));
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
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    // Get selected data
    const selectedData = purchasePlans.filter(p => selectedRows.includes(p.id));
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
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">计划编号</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入计划编号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>生产物资</option>
              <option>肥料</option>
              <option>农药</option>
              <option>物资</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>已完成</option>
              <option>进行中</option>
              <option>待审批</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
            <input
              type="text"
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              placeholder="请输入申请人"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="请输入供应商"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">交货开始日期</label>
            <input
              type="date"
              value={deliveryStartDate}
              onChange={(e) => setDeliveryStartDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">交货结束日期</label>
            <input
              type="date"
              value={deliveryEndDate}
              onChange={(e) => setDeliveryEndDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              重置
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button onClick={handleOpenCreateModal} className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">采购计划</h3>
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
                      // 初始化批量编辑状态
                      const selectedPlansData = purchasePlans.filter(p => selectedRows.includes(p.id));
                      if (selectedPlansData.length > 0) {
                        setSelectedPlanCode(selectedPlansData[0].code);
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
                {(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === purchasePlans.length && purchasePlans.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总金额</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">交货日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                {!(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {purchasePlans.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((plan) => (
                <tr key={plan.id} className="hover:bg-blue-100 transition-colors">
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(plan.id)}
                        onChange={() => handleSelectRow(plan.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{plan.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applyDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.totalAmount}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.deliveryDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      plan.priority === '高' ? 'bg-red-100 text-red-700' :
                      plan.priority === '中' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {plan.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      plan.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  {!(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelectedRows([plan.id]); setShowDeleteModal(true); }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
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
                  {selectedRows.length === purchasePlans.length ? '全不选' : '全选'}
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
              <span className="text-sm text-gray-500">共 {purchasePlans.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(purchasePlans.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(purchasePlans.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(purchasePlans.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
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
        title="新增采购计划"
        size="lg"
        onSubmit={handleCreateSubmit}
        submitText="提交"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="计划编号">
              <div className="flex gap-2">
                <Input
                  value={createForm.code}
                  onChange={(e) => setCreateForm({...createForm, code: e.target.value})}
                  placeholder="请输入计划编号"
                />
                <button
                  type="button"
                  onClick={() => setCreateForm({...createForm, code: generateCode()})}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 whitespace-nowrap"
                >
                  生成
                </button>
              </div>
            </FormField>
            <FormField label="计划名称">
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                placeholder="请输入计划名称"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="类型">
              <Select
                value={createForm.type}
                onChange={(e) => setCreateForm({...createForm, type: e.target.value})}
                options={[
                  { value: '生产物资', label: '生产物资' },
                  { value: '肥料', label: '肥料' },
                  { value: '农药', label: '农药' },
                  { value: '物资', label: '物资' },
                ]}
              />
            </FormField>
            <FormField label="申请人">
              <Input
                value={createForm.applicant}
                onChange={(e) => setCreateForm({...createForm, applicant: e.target.value})}
                placeholder="请输入申请人"
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
            <FormField label="总金额">
              <Input
                value={createForm.totalAmount}
                onChange={(e) => setCreateForm({...createForm, totalAmount: e.target.value})}
                placeholder="例如：10.5万元"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="供应商">
              <Input
                value={createForm.supplier}
                onChange={(e) => setCreateForm({...createForm, supplier: e.target.value})}
                placeholder="请输入供应商"
              />
            </FormField>
            <FormField label="交货日期">
              <Input
                type="date"
                value={createForm.deliveryDate}
                onChange={(e) => setCreateForm({...createForm, deliveryDate: e.target.value})}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="优先级">
              <Select
                value={createForm.priority}
                onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                options={[
                  { value: '高', label: '高' },
                  { value: '中', label: '中' },
                  { value: '低', label: '低' },
                ]}
              />
            </FormField>
            <FormField label="状态">
              <Select
                value={createForm.status}
                onChange={(e) => setCreateForm({...createForm, status: e.target.value})}
                options={[
                  { value: '待审批', label: '待审批' },
                  { value: '进行中', label: '进行中' },
                  { value: '已完成', label: '已完成' },
                ]}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Batch Edit Modal */}
      <Modal
        isOpen={showBatchEditModal}
        onClose={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
        }}
        title="批量编辑采购计划"
        size="xxl"
        showFooter={false}
      >
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 个采购计划进行批量编辑，
              已编辑 <strong>{editedPlanCodes.length}</strong> 个
            </p>
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择采购计划编号</label>
              <select
                value={selectedPlanCode}
                onChange={(e) => setSelectedPlanCode(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择计划编号</option>
                {purchasePlans.filter(p => selectedRows.includes(p.id)).map(plan => (
                  <option key={plan.id} value={plan.code}>
                    {plan.code} - {plan.name}{' '}
                    {editedPlanCodes.includes(plan.code) && (
                      <span className="bg-green-100 text-green-700">✅ 已编辑</span>
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Edit Form */}
          {selectedPlanCode && (() => {
            const currentPlan = purchasePlans.find(p => p.code === selectedPlanCode);
            if (!currentPlan) return null;
            const editedData = editedPlans[selectedPlanCode] || {};
            return (
              <div className="grid grid-cols-4 gap-3">
                {/* 计划编号 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">计划编号</div>
                  <div className="text-sm font-medium text-gray-900">{currentPlan.code}</div>
                </div>

                {/* 计划名称 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                  <div className="text-xs text-gray-500 mb-1">计划名称</div>
                  <input
                    type="text"
                    value={editedData.name ?? currentPlan.name}
                    onChange={(e) => {
                      const updated = {
                        ...editedPlans,
                        [selectedPlanCode]: { ...editedPlans[selectedPlanCode], name: e.target.value },
                      };
                      setEditedPlans(updated);
                      if (!editedPlanCodes.includes(selectedPlanCode)) {
                        setEditedPlanCodes([...editedPlanCodes, selectedPlanCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 类型 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">类型</div>
                  <select
                    value={editedData.type ?? currentPlan.type}
                    onChange={(e) => {
                      const updated = {
                        ...editedPlans,
                        [selectedPlanCode]: { ...editedPlans[selectedPlanCode], type: e.target.value },
                      };
                      setEditedPlans(updated);
                      if (!editedPlanCodes.includes(selectedPlanCode)) {
                        setEditedPlanCodes([...editedPlanCodes, selectedPlanCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option>生产物资</option>
                    <option>肥料</option>
                    <option>农药</option>
                    <option>物资</option>
                  </select>
                </div>

                {/* 申请人 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">申请人</div>
                  <div className="text-sm text-gray-700">{currentPlan.applicant}</div>
                </div>

                {/* 申请日期 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">申请日期</div>
                  <div className="text-sm text-gray-700">{currentPlan.applyDate}</div>
                </div>

                {/* 总金额 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">总金额</div>
                  <input
                    type="text"
                    value={editedData.totalAmount ?? currentPlan.totalAmount}
                    onChange={(e) => {
                      const updated = {
                        ...editedPlans,
                        [selectedPlanCode]: { ...editedPlans[selectedPlanCode], totalAmount: e.target.value },
                      };
                      setEditedPlans(updated);
                      if (!editedPlanCodes.includes(selectedPlanCode)) {
                        setEditedPlanCodes([...editedPlanCodes, selectedPlanCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 供应商 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">供应商</div>
                  <input
                    type="text"
                    value={editedData.supplier ?? currentPlan.supplier}
                    onChange={(e) => {
                      const updated = {
                        ...editedPlans,
                        [selectedPlanCode]: { ...editedPlans[selectedPlanCode], supplier: e.target.value },
                      };
                      setEditedPlans(updated);
                      if (!editedPlanCodes.includes(selectedPlanCode)) {
                        setEditedPlanCodes([...editedPlanCodes, selectedPlanCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 交货日期 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">交货日期</div>
                  <input
                    type="date"
                    value={editedData.deliveryDate ?? currentPlan.deliveryDate}
                    onChange={(e) => {
                      const updated = {
                        ...editedPlans,
                        [selectedPlanCode]: { ...editedPlans[selectedPlanCode], deliveryDate: e.target.value },
                      };
                      setEditedPlans(updated);
                      if (!editedPlanCodes.includes(selectedPlanCode)) {
                        setEditedPlanCodes([...editedPlanCodes, selectedPlanCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 优先级 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">优先级</div>
                  <select
                    value={editedData.priority ?? currentPlan.priority}
                    onChange={(e) => {
                      const updated = {
                        ...editedPlans,
                        [selectedPlanCode]: { ...editedPlans[selectedPlanCode], priority: e.target.value },
                      };
                      setEditedPlans(updated);
                      if (!editedPlanCodes.includes(selectedPlanCode)) {
                        setEditedPlanCodes([...editedPlanCodes, selectedPlanCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option>高</option>
                    <option>中</option>
                    <option>低</option>
                  </select>
                </div>

                {/* 状态 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">状态</div>
                  <select
                    value={editedData.status ?? currentPlan.status}
                    onChange={(e) => {
                      const updated = {
                        ...editedPlans,
                        [selectedPlanCode]: { ...editedPlans[selectedPlanCode], status: e.target.value },
                      };
                      setEditedPlans(updated);
                      if (!editedPlanCodes.includes(selectedPlanCode)) {
                        setEditedPlanCodes([...editedPlanCodes, selectedPlanCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option>待审批</option>
                    <option>进行中</option>
                    <option>已完成</option>
                  </select>
                </div>
              </div>
            );
          })()}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowBatchEditModal(false);
                setBatchEditMode(false);
                setSelectedRows([]);
                setEditedPlanCodes([]);
                setEditedPlans({});
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={() => {
                console.log('保存编辑:', editedPlans);
                setShowBatchEditModal(false);
                setBatchEditMode(false);
                setSelectedRows([]);
                setEditedPlanCodes([]);
                setEditedPlans({});
                alert(`已保存 ${editedPlanCodes.length} 个采购计划的修改`);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>

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
