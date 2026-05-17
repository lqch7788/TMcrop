/**
 * 育苗标签打印弹窗
 * 支持单标签打印、多标签打印、批量生成、导出Excel(含QR码)
 * V10.1: 切换至API服务+Zustand Store，增强QR码Excel导出
 */
import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { Download, Printer, Loader2 } from 'lucide-react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling } from '../../../../types/crop';
import * as apiService from '../../../../services/apiSeedlingService';
import { usePlantLabelStore } from '../../../../stores';
import { useUserStore } from '../../../../stores';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  const [template, setTemplate] = useState<'small' | 'large' | 'detail'>('detail');
  const [printMode, setPrintMode] = useState<'single' | 'multi' | 'batch'>('single');
  const [printCount, setPrintCount] = useState(1);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [previewLabel, setPreviewLabel] = useState('');
  const [allLabelNumbers, setAllLabelNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedLabels, setGeneratedLabels] = useState<any[]>([]);

  // 操作员
  const storeUsers = useUserStore((s) => s.users);
  const currentOperator = storeUsers.length > 0 ? storeUsers[0]?.name : (localStorage.getItem('username') || '系统管理员');

  // 标签Store
  const generateBatchLabels = usePlantLabelStore((s) => s.generateBatchLabels);

  // 加载已有标签编号
  useEffect(() => {
    if (isOpen && record.id) {
      setLoading(true);
      apiService.generateAllLabelNumbers(record.id).then((nums) => {
        if (nums.length > 0) {
          setAllLabelNumbers(nums);
          setPreviewLabel(nums[0]);
        } else {
          // 降级：从育苗编号生成
          const fallback: string[] = [];
          for (let i = 0; i < record.survivalCount; i++) {
            fallback.push(`${record.seedlingCode}-${String(i + 1).padStart(4, '0')}`);
          }
          setAllLabelNumbers(fallback);
          setPreviewLabel(fallback[0] || '');
        }
      }).finally(() => setLoading(false));
    }
  }, [isOpen, record.id, record.seedlingCode, record.survivalCount]);

  // 剩余数量
  const remainingCount = record.initialCount - record.lossCount;

  // 生成QR码数据URI（用于Excel导出）
  const generateQrDataUri = useCallback(async (content: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(content, { width: 120, margin: 1 });
    } catch {
      return '';
    }
  }, []);

  // 处理打印
  const handlePrint = useCallback(async () => {
    setLoading(true);
    try {
      if (printMode === 'single') {
        if (!previewLabel) { alert('请选择要打印的标签'); return; }
        await apiService.printLabel(record.id, 'new', 1, currentOperator, [previewLabel]);
      } else if (printMode === 'multi') {
        if (selectedLabels.length === 0) { alert('请选择要打印的标签'); return; }
        await apiService.printLabel(record.id, 'batch', selectedLabels.length, currentOperator, selectedLabels);
      } else {
        // 批量模式：通过Store生成标签
        const result = await generateBatchLabels({
          seedling_id: record.id,
          count: printCount,
          crop_name: record.cropName,
          area_name: record.siteName,
          start_date: record.startDate,
        });
        if (result) {
          setGeneratedLabels(result.labels);
          // 刷新标签列表
          const nums = await apiService.generateAllLabelNumbers(record.id);
          setAllLabelNumbers(nums);
        }
        await apiService.printLabel(record.id, 'new', printCount, currentOperator);
      }
      window.print();
    } finally {
      setLoading(false);
    }
  }, [printMode, previewLabel, selectedLabels, printCount, record, currentOperator, generateBatchLabels]);

  // 导出Excel（含QR码图片）
  const handleExportExcel = useCallback(async () => {
    setLoading(true);
    try {
      let labelsToExport: string[] = [];

      if (printMode === 'single' && previewLabel) {
        labelsToExport = [previewLabel];
      } else if (printMode === 'multi' && selectedLabels.length > 0) {
        labelsToExport = selectedLabels;
      } else {
        // 批量模式：先生成标签再导出
        const result = await generateBatchLabels({
          seedling_id: record.id,
          count: printCount,
          crop_name: record.cropName,
          area_name: record.siteName,
          start_date: record.startDate,
        });
        if (result) {
          labelsToExport = result.labels.map((l: any) => l.labelNumber);
          setGeneratedLabels(result.labels);
          const nums = await apiService.generateAllLabelNumbers(record.id);
          setAllLabelNumbers(nums);
        } else {
          // 降级：本地生成编号
          for (let i = 0; i < printCount; i++) {
            labelsToExport.push(`${record.seedlingCode}-${String(i + 1).padStart(4, '0')}`);
          }
        }
      }

      if (labelsToExport.length === 0) { alert('没有可导出的标签'); return; }

      // 生成QR码data URI并构建HTML
      const qrPromises = labelsToExport.map(async (label, i) => {
        const qrValue = JSON.stringify({
          type: 'seedling', code: label, cropName: record.cropName,
          variety: record.cropVariety, site: record.siteName, date: record.startDate
        });
        const qrDataUri = await generateQrDataUri(qrValue);
        return { label, qrDataUri, index: i + 1 };
      });
      const qrRows = await Promise.all(qrPromises);

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>育苗标签打印</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'Microsoft YaHei', sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: 8px 10px; text-align: center; vertical-align: middle; }
  th { background-color: #059669; color: #fff; font-weight: bold; }
  td img { display: block; margin: 0 auto; }
  tr:nth-child(even) { background-color: #f9fafb; }
  .print-btn { display: inline-block; margin: 10px; padding: 8px 16px; background: #059669; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <div class="no-print" style="text-align:center;padding:10px;">
    <button class="print-btn" onclick="window.print()">打印此页</button>
    <span style="color:#666;font-size:12px;">共 ${qrRows.length} 个标签</span>
  </div>
  <table>
    <thead><tr><th>序号</th><th>QR码</th><th>标签编号</th><th>作物名称</th><th>品种</th><th>场地</th><th>育苗日期</th></tr></thead>
    <tbody>${qrRows.map(r => `<tr>
      <td>${r.index}</td>
      <td><img src="${r.qrDataUri}" width="100" height="100" alt="QR" /></td>
      <td style="font-family:monospace;font-size:11px;">${r.label}</td>
      <td>${record.cropName}</td>
      <td>${record.cropVariety || ''}</td>
      <td>${record.siteName}</td>
      <td>${record.startDate}</td>
    </tr>`).join('')}</tbody>
  </table>
</body></html>`;

      const blob = new Blob(['﻿' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `育苗标签_${record.cropName}_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }, [printMode, previewLabel, selectedLabels, printCount, record, generateQrDataUri, generateBatchLabels]);

  // 切换选择标签
  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const toggleSelectAll = () => {
    if (selectedLabels.length === allLabelNumbers.length) {
      setSelectedLabels([]);
    } else {
      setSelectedLabels([...allLabelNumbers]);
    }
  };

  // 二维码内容
  const getQrCodeValue = (label: string) => JSON.stringify({
    type: 'seedling', code: label, sourceCode: record.sourceCode,
    cropCode: record.cropCode, cropName: record.cropName,
    variety: record.cropVariety, quantity: record.survivalCount,
    site: record.siteName, date: record.startDate
  });

  const currentQrCodeValue = previewLabel ? getQrCodeValue(previewLabel) : '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="标签打印与导出"
      size="lg"
      showFooter={true}
      onSubmit={handlePrint}
      submitText={loading ? '处理中...' : '打印'}
      cancelText="取消"
      submitDisabled={loading}
    >
      <div className="space-y-4">
        {/* 打印模式选择 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex gap-4 mb-4">
            {(['single', 'multi', 'batch'] as const).map(mode => (
              <label key={mode} className="flex items-center gap-2">
                <input type="radio" name="printMode" value={mode}
                  checked={printMode === mode}
                  onChange={() => { setPrintMode(mode); setSelectedLabels([]); }}
                  className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium">
                  {mode === 'single' ? '单标签打印' : mode === 'multi' ? '多标签打印' : '批量生成'}
                </span>
              </label>
            ))}
          </div>

          {/* 单标签模式 */}
          {printMode === 'single' && (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">选择标签编号</label>
                <select value={previewLabel} onChange={(e) => setPreviewLabel(e.target.value)}
                  className="w-48 px-3 py-1 border border-gray-300 rounded text-sm">
                  {allLabelNumbers.map(label => <option key={label} value={label}>{label}</option>)}
                </select>
              </div>
              <div className="text-xs text-gray-500">共 {allLabelNumbers.length} 个标签</div>
            </div>
          )}

          {/* 多标签模式 */}
          {printMode === 'multi' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-600">选择标签（已选 {selectedLabels.length} 个）</label>
                <button onClick={toggleSelectAll} className="text-xs text-blue-600 hover:text-blue-700">
                  {selectedLabels.length === allLabelNumbers.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                <div className="grid grid-cols-4 gap-1">
                  {allLabelNumbers.slice(0, 100).map(label => (
                    <label key={label} className={`flex items-center gap-1 p-1 rounded cursor-pointer text-xs ${
                      selectedLabels.includes(label) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={selectedLabels.includes(label)}
                        onChange={() => toggleLabel(label)} className="w-3 h-3" />
                      <span className="truncate">{label}</span>
                    </label>
                  ))}
                </div>
                {allLabelNumbers.length > 100 && (
                  <div className="text-xs text-gray-500 mt-2">共 {allLabelNumbers.length} 个标签，已显示前100个</div>
                )}
              </div>
            </div>
          )}

          {/* 批量生成模式 */}
          {printMode === 'batch' && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">生成数量</label>
                  <input type="number" min="1" max={remainingCount}
                    value={printCount}
                    onChange={(e) => setPrintCount(Math.max(1, Math.min(remainingCount, Number(e.target.value))))}
                    className="w-24 px-3 py-1 border border-gray-300 rounded text-sm" />
                </div>
                <div className="text-xs text-gray-500">
                  将生成 {printCount} 个标签（剩余：{remainingCount}，已打印：{allLabelNumbers.length}）
                </div>
              </div>
              {generatedLabels.length > 0 && (
                <div className="text-xs text-emerald-600">
                  已生成 {generatedLabels.length} 个标签（编号：{generatedLabels[0]?.labelNumber} ~ {generatedLabels[generatedLabels.length - 1]?.labelNumber}）
                </div>
              )}
            </div>
          )}
        </div>

        {/* 模板选择 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">{currentOperator}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模板选择</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value as 'small' | 'large' | 'detail')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
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
            <button onClick={handleExportExcel} disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              导出Excel(含QR码)
            </button>
          </div>
          <div className="flex justify-center">
            {template === 'small' ? (
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={80} />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{previewLabel || record.seedlingCode}</div>
                  <div className="text-xs text-gray-600">{record.cropName}</div>
                </div>
              </div>
            ) : template === 'large' ? (
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="mt-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{previewLabel || record.seedlingCode}</div>
                  <div className="text-sm text-gray-600 mt-1">{record.cropName} - {record.cropVariety}</div>
                </div>
              </div>
            ) : (
              <div className="flex print-label bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex-shrink-0">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="ml-4 flex flex-col justify-center">
                  <div className="text-lg font-bold text-gray-900 mb-2">{previewLabel || record.seedlingCode}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">作物名称：</div><div className="text-gray-900 font-medium">{record.cropName}</div>
                    <div className="text-gray-500">作物品种：</div><div className="text-gray-900">{record.cropVariety}</div>
                    <div className="text-gray-500">场地：</div><div className="text-gray-900">{record.siteName}</div>
                    <div className="text-gray-500">种源批号：</div><div className="text-gray-900 font-mono text-xs">{record.sourceCode}</div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">初始数量：</div><div className="text-gray-900">{record.initialCount.toLocaleString()}</div>
                    <div className="text-gray-500">剩余数量：</div><div className="text-emerald-600 font-bold">{remainingCount.toLocaleString()}</div>
                    <div className="text-gray-500">成活率：</div><div className="text-emerald-600">{record.survivalRate}%</div>
                    <div className="text-gray-500">育苗日期：</div><div className="text-gray-900">{record.startDate}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">点击"打印"按钮使用浏览器打印功能</div>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              导出Excel(含QR码)
            </button>
            <button onClick={handlePrint} disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              打印
            </button>
          </div>
        </div>
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
