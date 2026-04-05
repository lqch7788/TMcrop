import { useState } from 'react';
import { FileCode, Plus, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, X } from 'lucide-react';

const techSolutions = [
  { id: 1, code: 'T202401', title: '番茄春季高产栽培技术方案', crop: '番茄', plantingMode: '水培', stage: '生长全周期', author: '李建国', createDate: '2024-01-10', status: '已发布', statusClass: 'normal', version: 'V2.1', approveStatus: '已审批', content: '本方案针对春季番茄栽培，从品种选择、育苗、定植、田间管理、病虫害防治等方面进行详细介绍，旨在提高番茄产量和品质。', approvalDate: '2024-01-12', approver: '张志远' },
  { id: 2, code: 'T202402', title: '黄瓜设施栽培技术方案', crop: '黄瓜', plantingMode: '土培', stage: '设施栽培', author: '王建华', createDate: '2024-01-15', status: '已发布', statusClass: 'normal', version: 'V1.5', approveStatus: '已审批', content: '本方案介绍黄瓜设施栽培的关键技术，包括温室环境调控、水肥管理、植株调整等内容，适用于温室大棚种植。', approvalDate: '2024-01-18', approver: '张志远' },
  { id: 3, code: 'T202403', title: '草莓冬季促成栽培技术方案', crop: '草莓', plantingMode: '基质培', stage: '冬季促成', author: '李建国', createDate: '2024-02-01', status: '审核中', statusClass: 'pending', version: 'V1.0', approveStatus: '审核中', content: '本方案针对草莓冬季促成栽培技术，包括保温措施、光照调控、肥水管理等进行详细说明。', approvalDate: '-', approver: '-' },
  { id: 4, code: 'T202404', title: '辣椒越夏栽培技术方案', crop: '辣椒', plantingMode: '土培', stage: '越夏管理', author: '王建华', createDate: '2024-02-20', status: '已发布', statusClass: 'normal', version: 'V1.2', approveStatus: '已审批', content: '本方案介绍辣椒越夏栽培技术，重点解决夏季高温对辣椒生长的影响，确保高产稳产。', approvalDate: '2024-02-25', approver: '张志远' },
  { id: 5, code: 'T202405', title: '番茄灰霉病防治方案', crop: '番茄', plantingMode: '水培', stage: '病虫害防治', author: '张技术', createDate: '2024-03-01', status: '草稿', statusClass: 'draft', version: 'V1.0', approveStatus: '未提交', content: '本方案针对番茄灰霉病的预防和治理措施，包括农业防治、化学防治等技术要点。', approvalDate: '-', approver: '-' },
];

const plantingModes = ['水培', '土培', '基质培', '雾培'];

export default function TechSolution() {
  const [code, setCode] = useState('');
  const [crop, setCrop] = useState('全部');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('全部');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTech, setSelectedTech] = useState<typeof techSolutions[0] | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    crop: '',
    plantingMode: '',
    stage: '',
    version: '',
    content: '',
  });
  const [newPlanForm, setNewPlanForm] = useState({
    code: '',
    title: '',
    crop: '番茄',
    plantingMode: '水培',
    stage: '',
    version: 'V1.0',
    content: '',
  });

  const generateCode = () => {
    return `T${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const handleTitleClick = (tech: typeof techSolutions[0]) => {
    setSelectedTech(tech);
    setViewModalOpen(true);
  };

  const handleViewClick = (tech: typeof techSolutions[0]) => {
    setSelectedTech(tech);
    setViewModalOpen(true);
  };

  const handleEditClick = (tech: typeof techSolutions[0]) => {
    setSelectedTech(tech);
    setEditForm({
      title: tech.title,
      crop: tech.crop,
      plantingMode: tech.plantingMode,
      stage: tech.stage,
      version: tech.version,
      content: tech.content,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    // Handle edit submission here
    setEditModalOpen(false);
  };

  const handleCreateSubmit = () => {
    // Handle create submission here
    setCreateModalOpen(false);
    setNewPlanForm({
      code: '',
      title: '',
      crop: '番茄',
      plantingMode: '水培',
      stage: '',
      version: 'V1.0',
      content: '',
    });
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === techSolutions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(techSolutions.map(t => t.id));
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
    const selectedData = techSolutions.filter(t => selectedRows.includes(t.id));
    const headers = ['方案编号', '方案标题', '作物种类', '种植模式', '生长阶段', '版本', '编制人', '创建日期', '审批状态', '状态'];
    const exportData = selectedData.map(row => ({
      '方案编号': row.code,
      '方案标题': row.title,
      '作物种类': row.crop,
      '种植模式': row.plantingMode,
      '生长阶段': row.stage,
      '版本': row.version,
      '编制人': row.author,
      '创建日期': row.createDate,
      '审批状态': row.approveStatus,
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
    const fileName = `技术方案_${new Date().toISOString().slice(0, 10)}.${extension}`;

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

  const handleOpenCreateModal = () => {
    setNewPlanForm({
      code: generateCode(),
      title: '',
      crop: '番茄',
      plantingMode: '水培',
      stage: '',
      version: 'V1.0',
      content: '',
    });
    setCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <FileCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">技术方案列表</h1>
            <p className="text-gray-500">种植技术方案的管理与发布</p>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">方案编号</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入方案编号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">作物</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>番茄</option>
              <option>黄瓜</option>
              <option>草莓</option>
              <option>辣椒</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">编制人</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入编制人"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>已发布</option>
              <option>草稿</option>
              <option>审核中</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              重置
            </button>
            <button onClick={handleOpenCreateModal} className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新增方案
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">技术方案列表</h3>
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
                    checked={selectedRows.length === techSolutions.length && techSolutions.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">方案编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">方案标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物种类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">种植模式</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生长阶段</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">版本</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">编制人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">创建日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {techSolutions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((tech) => (
                <tr key={tech.id} className="hover:bg-gray-50">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(tech.id)}
                        onChange={() => handleSelectRow(tech.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{tech.code}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-700 hover:text-green-900 cursor-pointer" onClick={() => handleTitleClick(tech)}>{tech.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tech.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tech.plantingMode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tech.stage}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tech.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tech.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tech.createDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tech.approveStatus === '已审批' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {tech.approveStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tech.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      tech.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tech.status}
                    </span>
                  </td>
                  {!exportMode && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleViewClick(tech)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEditClick(tech)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
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
                  {selectedRows.length === techSolutions.length ? '全不选' : '全选'}
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
              <span className="text-sm text-gray-500">共 {techSolutions.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(techSolutions.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(techSolutions.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(techSolutions.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedTech && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewModalOpen(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">方案详情</h2>
                <button onClick={() => setViewModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">方案编号</label>
                      <p className="text-gray-900 font-medium">{selectedTech.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">版本</label>
                      <p className="text-gray-900">{selectedTech.version}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">方案标题</label>
                    <p className="text-gray-900 font-medium">{selectedTech.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">作物种类</label>
                      <p className="text-gray-900">{selectedTech.crop}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">种植模式</label>
                      <p className="text-gray-900">{selectedTech.plantingMode}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">生长阶段</label>
                      <p className="text-gray-900">{selectedTech.stage}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">编制人</label>
                      <p className="text-gray-900">{selectedTech.author}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">创建日期</label>
                      <p className="text-gray-900">{selectedTech.createDate}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">审批状态</label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        selectedTech.approveStatus === '已审批' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedTech.approveStatus}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">状态</label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        selectedTech.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                        selectedTech.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedTech.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">审批人</label>
                      <p className="text-gray-900">{selectedTech.approver}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">审批日期</label>
                      <p className="text-gray-900">{selectedTech.approvalDate}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">方案内容</label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg text-gray-700 text-sm leading-relaxed">
                      {selectedTech.content}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setViewModalOpen(false)} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedTech && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditModalOpen(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">编辑方案</h2>
                <button onClick={() => setEditModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">方案编号</label>
                      <input
                        type="text"
                        value={selectedTech.code}
                        disabled
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                      <input
                        type="text"
                        value={editForm.version}
                        onChange={(e) => setEditForm({...editForm, version: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">方案标题</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物种类</label>
                      <select
                        value={editForm.crop}
                        onChange={(e) => setEditForm({...editForm, crop: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option>番茄</option>
                        <option>黄瓜</option>
                        <option>草莓</option>
                        <option>辣椒</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种植模式</label>
                      <select
                        value={editForm.plantingMode}
                        onChange={(e) => setEditForm({...editForm, plantingMode: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {plantingModes.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">生长阶段</label>
                      <input
                        type="text"
                        value={editForm.stage}
                        onChange={(e) => setEditForm({...editForm, stage: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编制人</label>
                      <input
                        type="text"
                        value={selectedTech.author}
                        disabled
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">创建日期</label>
                      <input
                        type="text"
                        value={selectedTech.createDate}
                        disabled
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">方案内容</label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setEditModalOpen(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  取消
                </button>
                <button onClick={handleEditSubmit} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCreateModalOpen(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">新增方案</h2>
                <button onClick={() => setCreateModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">方案编号</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newPlanForm.code}
                          onChange={(e) => setNewPlanForm({...newPlanForm, code: e.target.value})}
                          placeholder="请输入方案编号"
                          className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPlanForm({...newPlanForm, code: generateCode()})}
                          className="h-10 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                        >
                          生成
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                      <input
                        type="text"
                        value={newPlanForm.version}
                        onChange={(e) => setNewPlanForm({...newPlanForm, version: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">方案标题 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={newPlanForm.title}
                      onChange={(e) => setNewPlanForm({...newPlanForm, title: e.target.value})}
                      placeholder="请输入方案标题"
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物种类</label>
                      <select
                        value={newPlanForm.crop}
                        onChange={(e) => setNewPlanForm({...newPlanForm, crop: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option>番茄</option>
                        <option>黄瓜</option>
                        <option>草莓</option>
                        <option>辣椒</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种植模式</label>
                      <select
                        value={newPlanForm.plantingMode}
                        onChange={(e) => setNewPlanForm({...newPlanForm, plantingMode: e.target.value})}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {plantingModes.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">生长阶段</label>
                      <input
                        type="text"
                        value={newPlanForm.stage}
                        onChange={(e) => setNewPlanForm({...newPlanForm, stage: e.target.value})}
                        placeholder="请输入生长阶段"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编制人</label>
                      <input
                        type="text"
                        placeholder="请输入编制人"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">创建日期</label>
                      <input
                        type="text"
                        value={new Date().toISOString().split('T')[0]}
                        disabled
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">方案内容</label>
                    <textarea
                      value={newPlanForm.content}
                      onChange={(e) => setNewPlanForm({...newPlanForm, content: e.target.value})}
                      placeholder="请输入方案内容"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setCreateModalOpen(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
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
