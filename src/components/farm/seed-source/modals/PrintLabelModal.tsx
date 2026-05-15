/**
 * 种源标签打印弹窗
 * 支持单标签打印、多标签打印、批量生成、导出Excel
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { SeedSource, LabelPrintType, PrintRecord } from '../../../../types/crop';
import { getPrintRecords, printLabel, generateAllLabelNumbers, generateLabelNumber } from '../../../../services/seedSourceService';
import { useUserStore } from '../../../../stores';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  const [template, setTemplate] = useState<'small' | 'large' | 'detail'>('detail');
  const [printMode, setPrintMode] = useState<'single' | 'multi' | 'batch'>('single');
  const [printCount, setPrintCount] = useState(1);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintRecord[]>([]);
  const [previewLabel, setPreviewLabel] = useState<string>('');

  // 获取当前操作员（从Store获取，后备从localStorage读取）
  const storeUsers = useUserStore((s) => s.users);
  const currentOperator = storeUsers.length > 0 ? storeUsers[0]?.name : (localStorage.getItem('username') || '系统管理员');

  // 单位转换函数（英文→中文）
  const unitMap: Record<string, string> = {
    'bag': '袋', 'plant': '株', 'grain': '粒', 'kg': '千克', 'g': '克', 'ton': '吨', 'mu': '亩',
    '个': '个', '袋': '袋', '株': '株', '粒': '粒', '千克': '千克', '克': '克', '吨': '吨', '亩': '亩',
  };
  const formatUnit = (unit: string) => unitMap[unit] || unit || '';

  // 加载打印记录
  useEffect(() => {
    if (isOpen) {
      const history = getPrintRecords(record.id);
      setPrintHistory(history);
      // 默认预览第一个标签
      const allLabels = generateAllLabelNumbers(record.id);
      if (allLabels.length > 0) {
        setPreviewLabel(allLabels[0]);
      }
    }
  }, [isOpen, record.id]);

  // 获取所有可打印的二维码编号
  const allLabelNumbers = generateAllLabelNumbers(record.id);

  // 生成指定数量的标签编号（批量生成）
  const getBatchLabels = (count: number): string[] => {
    const labels: string[] = [];
    for (let i = 0; i < Math.min(count, record.availableCount); i++) {
      labels.push(generateLabelNumber(record.seedCode, i + 1));
    }
    return labels;
  };

  // 处理打印
  const handlePrint = () => {
    if (printMode === 'single') {
      // 单标签打印
      if (!previewLabel) {
        alert('请选择要打印的标签');
        return;
      }
      printLabel(record.id, LabelPrintType.NEW, 1, currentOperator, [previewLabel]);
    } else if (printMode === 'multi') {
      // 多标签打印
      if (selectedLabels.length === 0) {
        alert('请选择要打印的标签');
        return;
      }
      printLabel(record.id, LabelPrintType.BATCH, selectedLabels.length, currentOperator, selectedLabels);
    } else {
      // 批量生成打印
      const labels = getBatchLabels(printCount);
      printLabel(record.id, LabelPrintType.NEW, printCount, currentOperator, labels);
    }

    // 刷新历史记录
    setPrintHistory(getPrintRecords(record.id));
    // 触发浏览器打印
    window.print();
  };

  // 导出Excel
  const handleExportExcel = () => {
    const labelsToExport = printMode === 'single' && previewLabel
      ? [previewLabel]
      : printMode === 'multi' && selectedLabels.length > 0
        ? selectedLabels
        : getBatchLabels(printCount);

    // 生成Excel内容（HTML格式）
    const headers = ['标签编号', '种源批号', '作物类别', '作物名称', '作物品种', '供应商', '可用数量', '采购日期', '溯源码'];
    const rows = labelsToExport.map(label => [
      label,
      record.seedCode,
      record.cropCategory,
      record.cropName,
      record.cropVariety,
      record.supplierName,
      record.availableCount.toString(),
      record.purchaseDate,
      record.traceabilityCode || ''
    ]);

    const htmlContent = `<html><head><meta charset="utf-8"><style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #4a90d9; color: white; }
    </style></head><body>
    <table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
    </table></body></html>`;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `种源标签_${record.seedCode}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 选择/取消选择二维码编号
  const toggleLabel = (label: string) => {
    if (selectedLabels.includes(label)) {
      setSelectedLabels(selectedLabels.filter(l => l !== label));
    } else {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedLabels.length === allLabelNumbers.length) {
      setSelectedLabels([]);
    } else {
      setSelectedLabels([...allLabelNumbers]);
    }
  };

  // 二维码内容：包含完整溯源信息
  const getQrCodeValue = (label: string) => JSON.stringify({
    type: 'seed-source',
    code: label,
    seedCode: record.seedCode,
    cropCode: record.cropCode,
    cropName: record.cropName,
    variety: record.cropVariety,
    quantity: record.availableCount,
    supplier: record.supplierName,
    date: record.purchaseDate
  });

  // 获取当前预览的二维码值
  const currentQrCodeValue = previewLabel ? getQrCodeValue(previewLabel) : '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="标签打印与导出"
      size="lg"
      showFooter={true}
      onSubmit={handlePrint}
      submitText="打印"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 打印模式选择 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="printMode"
                value="single"
                checked={printMode === 'single'}
                onChange={() => { setPrintMode('single'); setSelectedLabels([]); }}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm font-medium">单标签打印</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="printMode"
                value="multi"
                checked={printMode === 'multi'}
                onChange={() => { setPrintMode('multi'); setPreviewLabel(''); }}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm font-medium">多标签打印</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="printMode"
                value="batch"
                checked={printMode === 'batch'}
                onChange={() => { setPrintMode('batch'); setSelectedLabels([]); }}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm font-medium">批量生成</span>
            </label>
          </div>

          {/* 单标签模式 */}
          {printMode === 'single' && (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">选择标签编号</label>
                <select
                  value={previewLabel}
                  onChange={(e) => setPreviewLabel(e.target.value)}
                  className="w-48 px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  {allLabelNumbers.map(label => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-500">
                共 {allLabelNumbers.length} 个标签
              </div>
            </div>
          )}

          {/* 多标签模式 */}
          {printMode === 'multi' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-600">选择要打印的标签（已选 {selectedLabels.length} 个）</label>
                <div className="flex gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {selectedLabels.length === allLabelNumbers.length ? '取消全选' : '全选'}
                  </button>
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                <div className="grid grid-cols-4 gap-1">
                  {allLabelNumbers.slice(0, 100).map(label => (
                    <label
                      key={label}
                      className={`flex items-center gap-1 p-1 rounded cursor-pointer text-xs ${
                        selectedLabels.includes(label) ? 'bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLabels.includes(label)}
                        onChange={() => toggleLabel(label)}
                        className="w-3 h-3"
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  ))}
                </div>
                {allLabelNumbers.length > 100 && (
                  <div className="text-xs text-gray-500 mt-2">
                    共 {allLabelNumbers.length} 个标签，已显示前100个
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 批量生成模式 */}
          {printMode === 'batch' && (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">生成数量</label>
                <input
                  type="number"
                  min="1"
                  max={record.availableCount}
                  value={printCount}
                  onChange={(e) => setPrintCount(Math.max(1, Math.min(record.availableCount, Number(e.target.value))))}
                  className="w-24 px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="text-xs text-gray-500">
                将生成 {printCount} 个标签编号（可用库存：{record.availableCount}）
              </div>
            </div>
          )}
        </div>

        {/* 模板选择 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
              {currentOperator}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模板选择</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as 'small' | 'large' | 'detail')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="small">小标签</option>
              <option value="large">大标签</option>
              <option value="detail">详情标签</option>
            </select>
          </div>
        </div>

        {/* 标签预览 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">标签预览 {previewLabel && `- ${previewLabel}`}</span>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
            >
              <Download className="w-3 h-3" />
              导出Excel
            </button>
          </div>
          <div className="flex justify-center">
            {template === 'small' ? (
              /* 小标签 */
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={80} />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{previewLabel || record.seedCode}</div>
                  <div className="text-xs text-gray-600">{record.cropName}</div>
                </div>
              </div>
            ) : template === 'large' ? (
              /* 大标签 */
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="mt-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{previewLabel || record.seedCode}</div>
                  <div className="text-sm text-gray-600 mt-1">{record.cropName} - {record.cropVariety}</div>
                </div>
              </div>
            ) : (
              /* 详情标签 */
              <div className="flex print-label bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex-shrink-0">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="ml-4 flex flex-col justify-center">
                  <div className="text-lg font-bold text-gray-900 mb-2">{previewLabel || record.seedCode}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">作物名称：</div>
                    <div className="text-gray-900 font-medium">{record.cropName}</div>
                    <div className="text-gray-500">作物品种：</div>
                    <div className="text-gray-900">{record.cropVariety}</div>
                    <div className="text-gray-500">供应商：</div>
                    <div className="text-gray-900">{record.supplierName}</div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">可用数量：</div>
                    <div className="text-gray-900">{record.availableCount} {formatUnit(record.unit)}</div>
                    <div className="text-gray-500">采购日期：</div>
                    <div className="text-gray-900">{record.purchaseDate}</div>
                    <div className="text-gray-500">种源批号：</div>
                    <div className="text-gray-900 font-mono text-xs">{record.seedCode}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            点击"打印"按钮使用浏览器打印功能
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              导出Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
            >
              <Printer className="w-4 h-4" />
              打印
            </button>
          </div>
        </div>

        {/* 打印历史记录 */}
        {printHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">打印历史</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {printHistory.slice(-5).reverse().map((item) => (
                <div key={item.id} className="bg-gray-50 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded ${
                      item.printType === 'new' ? 'bg-green-100 text-green-700' :
                      item.printType === 'reprint' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.printType === 'new' ? '新建' : item.printType === 'reprint' ? '重打印' : '批量'}
                    </span>
                    <span className="text-gray-500">{item.printTime}</span>
                  </div>
                  <div className="mt-1 text-gray-600">
                    操作员: {item.operator} | 数量: {item.printCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-label, .print-label * { visibility: visible; }
          .print-label { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </UnifiedModal>
  );
}
