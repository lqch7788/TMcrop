import { useState } from 'react';
import { ShoppingCart, Plus, Search, Eye, Edit, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

const purchasePlans = [
  { id: 1, code: 'PP202401', name: '春季生产物资采购计划', type: '生产物资', applicant: '李建国', applyDate: '2024-01-05', totalAmount: '12.5万元', status: '已完成', statusClass: 'normal', supplier: '鑫源农资公司', deliveryDate: '2024-02-15', priority: '高', items: 8 },
  { id: 2, code: 'PP202402', name: '春季肥料采购计划', type: '肥料', applicant: '李建国', applyDate: '2024-02-10', totalAmount: '8.3万元', status: '进行中', statusClass: 'pending', supplier: '丰达化肥厂', deliveryDate: '2024-03-20', priority: '高', items: 5 },
  { id: 3, code: 'PP202403', name: '夏季种植用肥采购计划', type: '肥料', applicant: '李建国', applyDate: '2024-03-01', totalAmount: '15.8万元', status: '待审批', statusClass: 'pending', supplier: '待确定', deliveryDate: '2024-05-01', priority: '高', items: 12 },
  { id: 4, code: 'PP202404', name: '病虫害防治药剂采购', type: '农药', applicant: '王建华', applyDate: '2024-03-10', totalAmount: '5.6万元', status: '待审批', statusClass: 'pending', supplier: '待确定', deliveryDate: '2024-04-15', priority: '中', items: 6 },
  { id: 5, code: 'PP202405', name: '大棚保温材料采购', type: '物资', applicant: '张建华', applyDate: '2024-03-12', totalAmount: '3.2万元', status: '已完成', statusClass: 'normal', supplier: '建材市场A店', deliveryDate: '2024-03-25', priority: '低', items: 3 },
];

export default function PurchasePlan() {
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
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">采购计划列表</h1>
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
          <h3 className="text-lg font-semibold text-gray-900">采购计划列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button onClick={() => setShowExportModal(true)} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <button onClick={handleExportClick} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
              <Download className="w-4 h-4" />
              导出
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === purchasePlans.length && purchasePlans.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">计划编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">计划名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">总金额</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">交货日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">优先级</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchasePlans.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(plan.id)}
                        onChange={() => handleSelectRow(plan.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{plan.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.applyDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.totalAmount}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.deliveryDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      plan.priority === '高' ? 'bg-red-100 text-red-700' :
                      plan.priority === '中' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {plan.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      plan.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  {!exportMode && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {exportMode && (
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">新增采购计划</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">计划编号</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={createForm.code}
                          onChange={(e) => setCreateForm({...createForm, code: e.target.value})}
                          placeholder="请输入计划编号"
                          className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCreateForm({...createForm, code: generateCode()})}
                          className="h-10 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                        >
                          生成
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">计划名称</label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                        placeholder="请输入计划名称"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <select
                        value={createForm.type}
                        onChange={(e) => setCreateForm({...createForm, type: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option>生产物资</option>
                        <option>肥料</option>
                        <option>农药</option>
                        <option>物资</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
                      <input
                        type="text"
                        value={createForm.applicant}
                        onChange={(e) => setCreateForm({...createForm, applicant: e.target.value})}
                        placeholder="请输入申请人"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">申请日期</label>
                      <input
                        type="date"
                        value={createForm.applyDate}
                        onChange={(e) => setCreateForm({...createForm, applyDate: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总金额</label>
                      <input
                        type="text"
                        value={createForm.totalAmount}
                        onChange={(e) => setCreateForm({...createForm, totalAmount: e.target.value})}
                        placeholder="例如：10.5万元"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                      <input
                        type="text"
                        value={createForm.supplier}
                        onChange={(e) => setCreateForm({...createForm, supplier: e.target.value})}
                        placeholder="请输入供应商"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">交货日期</label>
                      <input
                        type="date"
                        value={createForm.deliveryDate}
                        onChange={(e) => setCreateForm({...createForm, deliveryDate: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                      <select
                        value={createForm.priority}
                        onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option>高</option>
                        <option>中</option>
                        <option>低</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        value={createForm.status}
                        onChange={(e) => setCreateForm({...createForm, status: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option>待审批</option>
                        <option>进行中</option>
                        <option>已完成</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowCreateModal(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  取消
                </button>
                <button onClick={handleCreateSubmit} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  提交
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Format Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExportModal(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
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
                        <p className="text-sm font-medium text-gray-900">{format.label}</p>
                        <p className="text-xs text-gray-500">{format.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowExportModal(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  取消
                </button>
                <button onClick={handleConfirmExport} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  导出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
