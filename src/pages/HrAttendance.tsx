import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Search, Download, Clock, CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { logger } from '../lib/logger';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';

const attendanceData = [
  { id: 1, workerId: 'A001', name: '张伟民', dept: '生产部', date: '2024-03-15', checkIn: '08:05', checkOut: '17:30', status: '正常', statusClass: 'normal', hours: 9.4 },
  { id: 2, workerId: 'A002', name: '李明轩', dept: '技术部', date: '2024-03-15', checkIn: '08:00', checkOut: '17:45', status: '正常', statusClass: 'normal', hours: 9.75 },
  { id: 3, workerId: 'A003', name: '王建国', dept: '生产部', date: '2024-03-15', checkIn: '08:15', checkOut: '17:20', status: '迟到', statusClass: 'warning', hours: 9.1 },
  { id: 4, workerId: 'A004', name: '赵俊杰', dept: '技术部', date: '2024-03-15', checkIn: '08:00', checkOut: '18:00', status: '正常', statusClass: 'normal', hours: 10.0 },
  { id: 5, workerId: 'A005', name: '钱文涛', dept: '生产部', date: '2024-03-15', checkIn: '08:10', checkOut: '17:30', status: '正常', statusClass: 'normal', hours: 9.3 },
  { id: 6, workerId: 'A006', name: '孙晓峰', dept: '后勤部', date: '2024-03-15', checkIn: '-', checkOut: '-', status: '请假', statusClass: 'info', hours: 0 },
];

export default function HrAttendance() {
  const { toast } = useToast();
  const [deptFilter, setDeptFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const pageSize = 5;
  const totalPages = Math.ceil(attendanceData.length / pageSize);
  const paginatedData = attendanceData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === attendanceData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(attendanceData.map(a => a.id));
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
      toast.warning('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    const selectedData = attendanceData.filter(a => selectedRows.includes(a.id));
    const headers = ['工号', '姓名', '部门', '日期', '签到时间', '签退时间', '状态', '工时'];
    const exportData = selectedData.map(row => ({
      '工号': row.workerId,
      '姓名': row.name,
      '部门': row.dept,
      '日期': row.date,
      '签到时间': row.checkIn,
      '签退时间': row.checkOut,
      '状态': row.status,
      '工时': row.hours
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

    const fileName = `员工考勤_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      logger.error('Export failed', err);
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
          <Link to="/settings/personnel" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">员工考勤</h1>
            <p className="text-gray-500">正式员工考勤记录与统计</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{attendanceData.filter(a => a.status === '正常').length}</p>
              <p className="text-xs text-gray-500">出勤人数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{attendanceData.filter(a => a.status === '迟到').length}</p>
              <p className="text-xs text-gray-500">迟到人数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{attendanceData.filter(a => a.status === '请假').length}</p>
              <p className="text-xs text-gray-500">请假人数</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
            <input
              type="date"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>生产部</option>
              <option>技术部</option>
              <option>后勤部</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="default">
              <Search className="w-4 h-4" />
              搜索
            </Button>
            {exportMode ? (
              <>
                <Button variant="default" onClick={() => setShowExportModal(true)}>
                  <Download className="w-4 h-4" />
                  确认导出
                </Button>
                <Button variant="secondary" onClick={handleCancelExport}>
                  取消
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={handleExportClick}>
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">考勤记录</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === attendanceData.length && attendanceData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">签到时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">签退时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作时长</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(record.id)}
                        onChange={() => handleSelectRow(record.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.workerId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.checkIn}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.checkOut}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.hours}小时</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      record.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      record.statusClass === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
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
                  {selectedRows.length === attendanceData.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {attendanceData.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
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
                <Button size="icon" variant="ghost" onClick={() => setShowExportModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
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
                <Button variant="secondary" onClick={() => setShowExportModal(false)}>取消</Button>
                <Button variant="default" onClick={handleConfirmExport}>导出</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
