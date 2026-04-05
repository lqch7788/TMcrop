import { useState } from 'react';
import { BarChart3, Download, Calendar, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { yieldStats, costAnalysis } from '../data/mockData';

const monthlyLabor = [
  { month: '1月', hours: 1250 },
  { month: '2月', hours: 1380 },
  { month: '3月', hours: 1520 },
];

export default function Reports() {
  const [reportType, setReportType] = useState('yield');
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    const reportTypes = ['yield', 'cost', 'labor'];
    if (selectedRows.length === reportTypes.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...reportTypes]);
    }
  };

  const handleSelectRow = (type: string) => {
    if (selectedRows.includes(type)) {
      setSelectedRows(selectedRows.filter(row => row !== type));
    } else {
      setSelectedRows([...selectedRows, type]);
    }
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的报表');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    let exportData: { headers: string[]; data: Record<string, string>[] } | null = null;

    // Export based on selected report types
    if (selectedRows.includes('yield') && yieldStats && yieldStats.length > 0) {
      exportData = {
        headers: ['月份', '产量'],
        data: yieldStats.map(row => ({
          '月份': row.month,
          '产量': row.yield
        }))
      };
    }

    if (selectedRows.includes('cost') && costAnalysis && costAnalysis.length > 0) {
      const costData = {
        headers: ['成本项', '金额'],
        data: costAnalysis.map(row => ({
          '成本项': row.name,
          '金额': row.value
        }))
      };
      if (exportData) {
        // Merge data if multiple selected
        exportData.headers = [...exportData.headers, ...costData.headers.slice(1)];
        exportData.data = exportData.data.map((row, i) => ({
          ...row,
          ...(costData.data[i] || {})
        }));
      } else {
        exportData = costData;
      }
    }

    if (selectedRows.includes('labor') && monthlyLabor && monthlyLabor.length > 0) {
      const laborData = {
        headers: ['月份', '工时'],
        data: monthlyLabor.map(row => ({
          '月份': row.month,
          '工时': row.hours
        }))
      };
      if (exportData) {
        exportData.headers = [...exportData.headers, ...laborData.headers.slice(1)];
        exportData.data = exportData.data.map((row, i) => ({
          ...row,
          ...(laborData.data[i] || {})
        }));
      } else {
        exportData = laborData;
      }
    }

    if (!exportData) {
      alert('没有可导出的数据');
      setExportMode(false);
      setSelectedRows([]);
      setShowExportModal(false);
      return;
    }

    const { headers, data } = exportData;

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + data.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `报表统计_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产报表</h1>
            <p className="text-gray-500">数据统计和分析报告</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        {exportMode ? (
          <div className="flex gap-2">
            <button onClick={() => setShowExportModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <Download className="w-4 h-4" /> 确认导出
            </button>
            <button onClick={handleCancelExport} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">
              取消
            </button>
          </div>
        ) : (
          <button onClick={handleExportClick} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> 导出报表
          </button>
        )}
      </div>

      {/* Report Selection */}
      {exportMode && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <input
              type="checkbox"
              checked={selectedRows.length === 3 && 3 > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-900">选择要导出的报表</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'yield', label: '产量统计' },
              { value: 'cost', label: '成本分析' },
              { value: 'labor', label: '人工统计' },
            ].map((type) => (
              <label
                key={type.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedRows.includes(type.value)
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedRows.includes(type.value)}
                  onChange={() => handleSelectRow(type.value)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-500">
            已选择 {selectedRows.length} 个报表
          </div>
        </div>
      )}

      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {[
          { value: 'yield', label: '产量统计' },
          { value: 'cost', label: '成本分析' },
          { value: 'labor', label: '人工统计' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setReportType(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${reportType === tab.value ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {reportType === 'yield' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">月度产量趋势</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} name="产量(kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">作物产量占比</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: '番茄', value: 4500 },
                    { name: '黄瓜', value: 3200 },
                    { name: '草莓', value: 2100 },
                    { name: '生菜', value: 1800 },
                    { name: '其他', value: 1200 },
                  ]} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'].map((color, index) => (
                      <Cell key={index} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {reportType === 'cost' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">成本构成分析</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costAnalysis} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value">
                    {costAnalysis.map((entry, index) => (
                      <Cell key={index} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'][index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">成本明细</h3>
            <div className="space-y-3">
              {costAnalysis.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-['${['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'][index]}']`} style={{ backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'][index] }} />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">¥{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reportType === 'labor' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">月度工时统计</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyLabor}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} name="工时" />
              </LineChart>
            </ResponsiveContainer>
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
                <p className="text-sm text-gray-500 mb-4">已选择 {selectedRows.length} 个报表</p>
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
