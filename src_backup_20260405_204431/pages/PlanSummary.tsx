import { useState } from 'react';
import { FileText, Search, Download, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';

const planSummary = [
  { id: 1, code: 'P202401', crop: '番茄', variety: '红果番茄', greenhouse: '1号棚', area: 5, targetYield: 50, actualYield: 48, completionRate: '96%', status: '已完成', statusClass: 'normal' },
  { id: 2, code: 'P202402', crop: '黄瓜', variety: '水果黄瓜', greenhouse: '2号棚', area: 3, targetYield: 30, actualYield: 28, completionRate: '93%', status: '已完成', statusClass: 'normal' },
  { id: 3, code: 'P202403', crop: '草莓', variety: '红颜', greenhouse: '3号棚', area: 2, targetYield: 5, actualYield: 4.5, completionRate: '90%', status: '进行中', statusClass: 'pending' },
  { id: 4, code: 'P202404', crop: '辣椒', variety: '线椒', greenhouse: '4号棚', area: 4, targetYield: 20, actualYield: 0, completionRate: '0%', status: '待开始', statusClass: 'draft' },
  { id: 5, code: 'P202405', crop: '番茄', variety: '樱桃番茄', greenhouse: '5号棚', area: 2, targetYield: 15, actualYield: 0, completionRate: '0%', status: '待开始', statusClass: 'draft' },
];

export default function PlanSummary() {
  const [crop, setCrop] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const pageSize = 5;
  const totalPages = Math.ceil(planSummary.length / pageSize);
  const paginatedData = planSummary.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === planSummary.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(planSummary.map(p => p.id));
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
    const selectedData = planSummary.filter(p => selectedRows.includes(p.id));
    const headers = ['计划编号', '作物', '品种', '温室', '面积(亩)', '目标产量', '实际产量', '完成率', '状态'];
    const exportData = selectedData.map(row => ({
      '计划编号': row.code,
      '作物': row.crop,
      '品种': row.variety,
      '温室': row.greenhouse,
      '面积(亩)': row.area,
      '目标产量': row.targetYield,
      '实际产量': row.actualYield,
      '完成率': row.completionRate,
      '状态': row.status
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `计划汇总_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      console.error('Export failed:', err);
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

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产计划汇总表</h1>
            <p className="text-gray-500">所有生产计划执行情况汇总</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{planSummary.length}</p>
              <p className="text-xs text-gray-500">计划总数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{planSummary.filter(p => p.status === '已完成').length}</p>
              <p className="text-xs text-gray-500">已完成</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">⟳</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{planSummary.filter(p => p.status === '进行中').length}</p>
              <p className="text-xs text-gray-500">进行中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{planSummary.filter(p => p.status === '待开始').length}</p>
              <p className="text-xs text-gray-500">待开始</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
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
              <option>待开始</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            {exportMode ? (
              <>
                <button onClick={() => setShowExportModal(true)} className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  确认导出
                </button>
                <button onClick={handleCancelExport} className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  取消
                </button>
              </>
            ) : (
              <button onClick={handleExportClick} className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2">
                <Download className="w-4 h-4" />
                导出
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">生产计划列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === planSummary.length && planSummary.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">计划编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">棚号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">种植面积(亩)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">目标产量(吨)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">实际产量(吨)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">完成率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((plan) => (
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
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.variety}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.greenhouse}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.area}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.targetYield}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plan.actualYield}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-medium ${
                      plan.completionRate === '100%' || parseInt(plan.completionRate) >= 90 ? 'text-green-600' :
                      parseInt(plan.completionRate) >= 50 ? 'text-amber-600' : 'text-gray-600'
                    }`}>
                      {plan.completionRate}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      plan.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      plan.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  {!exportMode && (
                    <td className="px-4 py-3">
                      <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
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
                  {selectedRows.length === planSummary.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {planSummary.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === i + 1
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
