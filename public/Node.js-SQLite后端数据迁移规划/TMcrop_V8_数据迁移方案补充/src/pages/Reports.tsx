/**
 * 生产报表页面
 */

import { useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import {
  PageHeader,
  ReportTabs,
  ReportCharts,
  ExportModal,
  StatCards,
  useExport,
  ExportFormat,
} from '../components/summary';
import { useProductionReports } from '../hooks';

const REPORT_TABS = [
  { value: 'yield', label: '产量统计' },
  { value: 'cost', label: '成本分析' },
  { value: 'labor', label: '人工统计' },
];

export default function Reports() {
  // 获取生产报表数据
  const { loading, yieldStats, costAnalysis, monthlyLabor, statCards } = useProductionReports();

  const [reportType, setReportType] = useState('yield');
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
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
      setSelectedRows(selectedRows.filter((row) => row !== type));
    } else {
      setSelectedRows([...selectedRows, type]);
    }
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的报表');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = async () => {
    let exportData: { headers: string[]; data: Record<string, string>[] } | null = null;

    if (selectedRows.includes('yield') && yieldStats && yieldStats.length > 0) {
      exportData = {
        headers: ['月份', '产量'],
        data: yieldStats.map((row) => ({
          '月份': row.month,
          '产量': row.yield,
        })),
      };
    }

    if (selectedRows.includes('cost') && costAnalysis && costAnalysis.length > 0) {
      const costData = {
        headers: ['成本项', '金额'],
        data: costAnalysis.map((row) => ({
          '成本项': row.name,
          '金额': row.value,
        })),
      };
      if (exportData) {
        exportData.headers = [...exportData.headers, ...costData.headers.slice(1)];
        exportData.data = exportData.data.map((row, i) => ({
          ...row,
          ...(costData.data[i] || {}),
        }));
      } else {
        exportData = costData;
      }
    }

    if (selectedRows.includes('labor') && monthlyLabor && monthlyLabor.length > 0) {
      const laborData = {
        headers: ['月份', '工时'],
        data: monthlyLabor.map((row) => ({
          '月份': row.month,
          '工时': row.hours,
        })),
      };
      if (exportData) {
        exportData.headers = [...exportData.headers, ...laborData.headers.slice(1)];
        exportData.data = exportData.data.map((row, i) => ({
          ...row,
          ...(laborData.data[i] || {}),
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
      content =
        headers.join(',') +
        '\n' +
        data
          .map((row) =>
            headers.map((h) => `"${(row[h] as string) || ''}"`).join(',')
          )
          .join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers
        .map((h) => `<th>${h}</th>`)
        .join('')}</tr>${data
        .map((row) => `<tr>${headers.map((h) => `<td>${(row[h] as string) || ''}</td>`).join('')}</tr>`)
        .join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers
        .map((h) => `<th>${h}</th>`)
        .join('')}${data
        .map((row) => `<tr>${headers.map((h) => `<td>${(row[h] as string) || ''}</td>`).join('')}</tr>`)
        .join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `报表统计_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: exportFormat.toUpperCase() + ' Files',
              accept: { [mimeType]: ['.' + extension] },
            },
          ],
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

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="w-6 h-6 text-white" />}
        title="生产报表"
        description="数据统计和分析报告"
      />

      {/* 统计卡片 - 使用 Hook 返回的动态数据 */}
      {!loading && <StatCards cards={statCards} />}

      <div className="flex justify-end">
        {exportMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Download className="w-4 h-4" /> 确认导出
            </button>
            <button
              onClick={handleCancelExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={handleExportClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> 导出报表
          </button>
        )}
      </div>

      {/* 报表选择 */}
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
            {REPORT_TABS.map((type) => (
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
          <div className="mt-4 text-sm text-gray-500">已选择 {selectedRows.length} 个报表</div>
        </div>
      )}

      <ReportTabs tabs={REPORT_TABS} activeTab={reportType} onTabChange={setReportType} />

      <ReportCharts
        reportType={reportType as 'yield' | 'cost' | 'labor'}
        yieldStats={yieldStats}
        costAnalysis={costAnalysis}
        monthlyLabor={monthlyLabor}
      />

      <ExportModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />
    </div>
  );
}
