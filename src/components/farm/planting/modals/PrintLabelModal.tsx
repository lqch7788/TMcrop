/**
 * 种植标签打印弹窗
 * 支持单标签打印、多标签打印、批量生成、导出Excel
 * 导出用URL链接替代QR码图片，避免文件过大导致系统卡死
 */
import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Planting } from '../../../../types/crop';
import { usePlantLabelStore } from '../../../../stores';
import { useUserStore } from '../../../../stores';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Planting;
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
  const [printLabels, setPrintLabels] = useState<string[]>([]);

  // 操作员
  const storeUsers = useUserStore((s) => s.users);
  const currentOperator = storeUsers.length > 0 ? storeUsers[0]?.name : (localStorage.getItem('username') || '系统管理员');

  // 标签Store
  const generateBatchLabels = usePlantLabelStore((s) => s.generateBatchLabels);
  const loadLabels = usePlantLabelStore((s) => s.loadLabels);
  const labels = usePlantLabelStore((s) => s.labels);

  // 加载已有标签编号
  useEffect(() => {
    if (isOpen && record.id) {
      setLoading(true);
      (async () => {
        try {
          await loadLabels(record.id);
          const latestLabels = usePlantLabelStore.getState().labels;
          const nums = latestLabels.map(l => l.label_number);
          if (nums.length > 0) {
            setAllLabelNumbers(nums);
            setPreviewLabel(nums[0]);
          } else {
            // 降级：从种植批号生成
            const fallback: string[] = [];
            for (let i = 0; i < record.plantingCount; i++) {
              fallback.push(`${record.plantCode}-${String(i + 1).padStart(4, '0')}`);
            }
            setAllLabelNumbers(fallback);
            setPreviewLabel(fallback[0] || '');
          }
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen, record.id, record.plantCode, record.plantingCount, loadLabels]);

  // printLabels更新后触发打印（等待DOM渲染完成）
  useEffect(() => {
    if (printLabels.length > 0) {
      const timer = setTimeout(() => {
        window.print();
        setPrintLabels([]);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [printLabels]);

  // 处理打印
  const handlePrint = async () => {
    setLoading(true);
    try {
      let labelsToPrint: string[] = [];

      if (printMode === 'single') {
        if (!previewLabel) { alert('请选择要打印的标签'); return; }
        labelsToPrint = [previewLabel];
        await generateBatchLabels({
          planting_id: record.id,
          count: 1,
          crop_name: record.cropName,
          area_name: record.areaName,
          start_date: record.plantingDate,
        });
      } else if (printMode === 'multi') {
        if (selectedLabels.length === 0) { alert('请选择要打印的标签'); return; }
        labelsToPrint = [...selectedLabels];
        await generateBatchLabels({
          planting_id: record.id,
          count: selectedLabels.length,
          crop_name: record.cropName,
          area_name: record.areaName,
          start_date: record.plantingDate,
        });
      } else {
        const result = await generateBatchLabels({
          planting_id: record.id,
          count: printCount,
          crop_name: record.cropName,
          area_name: record.areaName,
          start_date: record.plantingDate,
        });
        if (result) {
          labelsToPrint = result.labels.map((l: any) => l.labelNumber);
          setGeneratedLabels(result.labels);
          await loadLabels(record.id);
          const freshLabels = usePlantLabelStore.getState().labels;
          setAllLabelNumbers(freshLabels.map(l => l.label_number));
        }
      }
      setPrintLabels(labelsToPrint);
    } finally {
      setLoading(false);
    }
  };

  // 导出Excel（扫描功能码列为URL链接，不嵌入QR码图片）
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
          planting_id: record.id,
          count: printCount,
          crop_name: record.cropName,
          area_name: record.areaName,
          start_date: record.plantingDate,
        });
        if (result) {
          labelsToExport = result.labels.map((l: any) => l.labelNumber);
          setGeneratedLabels(result.labels);
          await loadLabels(record.id);
          const freshLabels = usePlantLabelStore.getState().labels;
          setAllLabelNumbers(freshLabels.map(l => l.label_number));
        } else {
          // 降级：本地生成编号
          for (let i = 0; i < printCount; i++) {
            labelsToExport.push(`${record.plantCode}-${String(i + 1).padStart(4, '0')}`);
          }
        }
      }

      if (labelsToExport.length === 0) { alert('没有可导出的标签'); return; }

      // 构建标签URL（扫描功能码 = URL链接）
      const baseUrl = 'https://tm-crop.com/ResumeTimeline';
      const rows = labelsToExport.map((label, i) => ({
        index: i + 1,
        label,
        url: `${baseUrl}?labelID=${encodeURIComponent(label)}`,
      }));

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>种植标签打印</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'Microsoft YaHei', sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: 8px 10px; text-align: center; vertical-align: middle; }
  th { background-color: #059669; color: #fff; font-weight: bold; }
  td a { color: #2563eb; text-decoration: underline; }
  tr:nth-child(even) { background-color: #f9fafb; }
  .print-btn { display: inline-block; margin: 10px; padding: 8px 16px; background: #059669; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <div class="no-print" style="text-align:center;padding:10px;">
    <button class="print-btn" onclick="window.print()">打印此页</button>
    <span style="color:#666;font-size:12px;">共 ${rows.length} 个标签 | 扫描功能码为URL链接，可用在线工具生成QR码</span>
  </div>
  <table>
    <thead><tr>
      <th>序号</th>
      <th>作物名称</th>
      <th>种植区域</th>
      <th>扫描功能码</th>
      <th>种植批号</th>
      <th>种植日期</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.index}</td>
      <td>${record.cropName}</td>
      <td>${record.areaName}</td>
      <td><a href="${r.url}" target="_blank">${r.url}</a></td>
      <td style="font-family:monospace;font-size:11px;">${r.label}</td>
      <td>${record.plantingDate}</td>
    </tr>`).join('')}</tbody>
  </table>
</body></html>`;

      const blob = new Blob(['﻿' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `种植标签_${record.cropName}_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }, [printMode, previewLabel, selectedLabels, printCount, record, generateBatchLabels, loadLabels]);

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
    type: 'planting', code: label, sourceCode: record.sourceCode,
    cropCode: record.cropCode, cropName: record.cropName,
    variety: record.cropVariety, quantity: record.plantingCount,
    site: record.areaName, date: record.plantingDate
  });

  const currentQrCodeValue = previewLabel ? getQrCodeValue(previewLabel) : '';
  const remainingCount = record.plantingCount;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="标签打印与导出"
      size="lg"
      height={650}
      showFooter={true}
      footer={
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div></div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              variant="blue"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              导出Excel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              disabled={loading}
            >
              {loading ? '处理中...' : '打印'}
            </Button>
          </div>
        </div>
      }
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
                <Button variant="link" size="sm" onClick={toggleSelectAll}>
                  {selectedLabels.length === allLabelNumbers.length ? '取消全选' : '全选'}
                </Button>
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
          </div>
          <div className="flex justify-center">
            {template === 'small' ? (
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={80} />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{previewLabel || record.plantCode}</div>
                  <div className="text-xs text-gray-600">{record.cropName}</div>
                </div>
              </div>
            ) : template === 'large' ? (
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="mt-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{previewLabel || record.plantCode}</div>
                  <div className="text-sm text-gray-600 mt-1">{record.cropName} - {record.cropVariety}</div>
                </div>
              </div>
            ) : (
              <div className="flex print-label bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex-shrink-0">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="ml-4 flex flex-col justify-center">
                  <div className="text-lg font-bold text-gray-900 mb-2">{previewLabel || record.plantCode}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">作物名称：</div><div className="text-gray-900 font-medium">{record.cropName}</div>
                    <div className="text-gray-500">作物品种：</div><div className="text-gray-900">{record.cropVariety}</div>
                    <div className="text-gray-500">种植区域：</div><div className="text-gray-900">{record.areaName}</div>
                    <div className="text-gray-500">种源批号：</div><div className="text-gray-900 font-mono text-xs">{record.sourceCode}</div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">种植数量：</div><div className="text-gray-900">{record.plantingCount.toLocaleString()}</div>
                    <div className="text-gray-500">种植日期：</div><div className="text-gray-900">{record.plantingDate}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 打印容器：正常隐藏，打印时显示所有选中标签 */}
      <div className="hidden print-container">
        {printLabels.map((label, index) => (
          <div key={label} className="print-label-card">
            <div className="bg-white p-3 border border-gray-300 rounded-lg">
              <QRCodeSVG value={getQrCodeValue(label)} size={80} />
            </div>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' }}>{label}</div>
              <div style={{ fontSize: 9, color: '#666' }}>{record.cropName}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container {
            display: flex !important;
            flex-wrap: wrap;
            justify-content: center;
            align-items: flex-start;
            align-content: flex-start;
            gap: 16px;
            padding: 20px;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-label-card {
            break-inside: avoid;
            page-break-inside: avoid;
            text-align: center;
          }
        }
      `}</style>
    </UnifiedModal>
  );
}
