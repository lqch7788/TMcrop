import { useState } from 'react';
import { BarChart3, Search, Plus, Eye, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';

const monthlyReports = [
  { id: 1, code: 'MR202403', month: '2024年3月', dept: '生产部', totalWorkdays: 624, totalWorkhours: 4992, avgDailyWorkers: 20, completedTasks: 156, pendingTasks: 12, totalHarvest: '45.8吨', qualityRate: '97.5%', laborCost: '8.5万元', materialCost: '6.2万元', issuesCount: 5, resolvedIssues: 4, attendanceRate: '98.2%', publisher: '张建华', publishDate: '2024-04-01', status: '已发布', statusClass: 'normal' },
  { id: 2, code: 'MR202402', month: '2024年2月', dept: '生产部', totalWorkdays: 560, totalWorkhours: 4480, avgDailyWorkers: 20, completedTasks: 142, pendingTasks: 8, totalHarvest: '38.2吨', qualityRate: '96.8%', laborCost: '7.8万元', materialCost: '5.8万元', issuesCount: 3, resolvedIssues: 3, attendanceRate: '97.5%', publisher: '张建华', publishDate: '2024-03-01', status: '已发布', statusClass: 'normal' },
  { id: 3, code: 'MR202401', month: '2024年1月', dept: '生产部', totalWorkdays: 620, totalWorkhours: 4960, avgDailyWorkers: 20, completedTasks: 138, pendingTasks: 15, totalHarvest: '32.5吨', qualityRate: '95.5%', laborCost: '8.2万元', materialCost: '5.2万元', issuesCount: 8, resolvedIssues: 6, attendanceRate: '96.8%', publisher: '张建华', publishDate: '2024-02-01', status: '已发布', statusClass: 'normal' },
];

export default function MonthlyReport() {
  const [month, setMonth] = useState('2024年3月');
  const [dept, setDept] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === monthlyReports.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(monthlyReports.map(m => m.id));
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
    const selectedData = monthlyReports.filter(r => selectedRows.includes(r.id));
    const headers = ['报表编号', '月份', '部门', '总工日', '总工时', '日均人数', '已完成任务', '待处理任务', '总产量', '品质率', '人工成本', '物料成本', '问题数', '已解决问题', '考勤率', '发布人', '发布日期', '状态'];
    const exportData = selectedData.map(row => ({
      '报表编号': row.code,
      '月份': row.month,
      '部门': row.dept,
      '总工日': row.totalWorkdays,
      '总工时': row.totalWorkhours,
      '日均人数': row.avgDailyWorkers,
      '已完成任务': row.completedTasks,
      '待处理任务': row.pendingTasks,
      '总产量': row.totalHarvest,
      '品质率': row.qualityRate,
      '人工成本': row.laborCost,
      '物料成本': row.materialCost,
      '问题数': row.issuesCount,
      '已解决问题': row.resolvedIssues,
      '考勤率': row.attendanceRate,
      '发布人': row.publisher,
      '发布日期': row.publishDate,
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

    const fileName = `月度报表_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工作月报</h1>
            <p className="text-gray-500">月度生产工作汇总与分析</p>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>2024年3月</option>
              <option>2024年2月</option>
              <option>2024年1月</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>生产部</option>
              <option>技术部</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              生成月报
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 text-lg">📅</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">624</p>
              <p className="text-xs text-gray-500">总工日数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">👥</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">98.2%</p>
              <p className="text-xs text-gray-500">出勤率</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-xs text-gray-500">已完成任务</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <span className="text-purple-600 text-lg">📦</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">45.8吨</p>
              <p className="text-xs text-gray-500">总产量</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">月度工作报告</h3>
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
                    checked={selectedRows.length === monthlyReports.length && monthlyReports.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">报表编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">月份</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">总工日数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">总工时</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">平均人数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">完成任务</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">待办任务</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">总产量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">质量率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">人工成本</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料成本</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">考勤率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyReports.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(report.id)}
                        onChange={() => handleSelectRow(report.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{report.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.month}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.totalWorkdays}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.totalWorkhours}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.avgDailyWorkers}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.completedTasks}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.pendingTasks}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.totalHarvest}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.qualityRate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.laborCost}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.materialCost}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{report.attendanceRate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      report.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  {!exportMode && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                          <Eye className="w-4 h-4" />
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
                  {selectedRows.length === monthlyReports.length ? '全不选' : '全选'}
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
              <span className="text-sm text-gray-500">共 {monthlyReports.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(monthlyReports.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(monthlyReports.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(monthlyReports.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
