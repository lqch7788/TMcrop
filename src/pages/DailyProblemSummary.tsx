import { useState } from 'react';
import { AlertTriangle, Search, Download, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';

const dailyProblems = [
  { id: 1, date: '2024-03-14', greenhouse: '1号棚', crop: '番茄', worker: '张伟民', problemType: '病害', description: '叶片出现黄斑', severity: '中等', status: '已处理', handler: '李建国' },
  { id: 2, date: '2024-03-14', greenhouse: '2号棚', crop: '黄瓜', worker: '李明轩', problemType: '虫害', description: '发现蚜虫', severity: '严重', status: '处理中', handler: '王建华' },
  { id: 3, date: '2024-03-14', greenhouse: '3号棚', crop: '草莓', worker: '王建国', problemType: '环境', description: '温度过高', severity: '轻微', status: '已处理', handler: '李建国' },
  { id: 4, date: '2024-03-13', greenhouse: '1号棚', crop: '番茄', worker: '赵俊杰', problemType: '病害', description: '灰霉病初期', severity: '严重', status: '处理中', handler: '王建华' },
  { id: 5, date: '2024-03-13', greenhouse: '2号棚', crop: '黄瓜', worker: '钱文涛', problemType: '水肥', description: '缺水干旱', severity: '中等', status: '已处理', handler: '李建国' },
];

export default function DailyProblemSummary() {
  const [date, setDate] = useState('');
  const [greenhouse, setGreenhouse] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const pageSize = 5;
  const totalPages = Math.ceil(dailyProblems.length / pageSize);
  const paginatedData = dailyProblems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === dailyProblems.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(dailyProblems.map(p => p.id));
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
    const selectedData = dailyProblems.filter(p => selectedRows.includes(p.id));
    const headers = ['日期', '温室', '作物', '上报人', '问题类型', '问题描述', '严重程度', '状态', '处理人'];
    const exportData = selectedData.map(row => ({
      '日期': row.date,
      '温室': row.greenhouse,
      '作物': row.crop,
      '上报人': row.worker,
      '问题类型': row.problemType,
      '问题描述': row.description,
      '严重程度': row.severity,
      '状态': row.status,
      '处理人': row.handler
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

    const fileName = `每日问题汇总_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">每日问题汇总表</h1>
            <p className="text-gray-500">每日生产问题记录与处理情况</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dailyProblems.length}</p>
              <p className="text-xs text-gray-500">问题总数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dailyProblems.filter(p => p.status === '处理中').length}</p>
              <p className="text-xs text-gray-500">处理中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dailyProblems.filter(p => p.status === '已处理').length}</p>
              <p className="text-xs text-gray-500">已处理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">大棚</label>
            <select
              value={greenhouse}
              onChange={(e) => setGreenhouse(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>1号棚</option>
              <option>2号棚</option>
              <option>3号棚</option>
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
          <h3 className="text-lg font-semibold text-gray-900">问题列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === dailyProblems.length && dailyProblems.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">大棚</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">问题类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">问题描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">严重程度</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">处理人</th>
                {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((problem) => (
                <tr key={problem.id} className="hover:bg-gray-50">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(problem.id)}
                        onChange={() => handleSelectRow(problem.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600">{problem.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{problem.greenhouse}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{problem.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{problem.worker}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{problem.problemType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{problem.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      problem.severity === '严重' ? 'bg-red-100 text-red-700' :
                      problem.severity === '中等' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {problem.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      problem.status === '已处理' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {problem.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{problem.handler}</td>
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
                  {selectedRows.length === dailyProblems.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {dailyProblems.length} 条记录，第 {currentPage}/{totalPages} 页
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
