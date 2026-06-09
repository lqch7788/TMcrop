/**
 * 育苗标签打印弹窗（完全参照种源管理实现）
 * 支持单标签打印、多标签打印、批量生成、导出Excel
 */
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Seedling } from '../../../../types/crop';
import { useUserStore } from '../../../../stores';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

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
  const [printLabels, setPrintLabels] = useState<string[]>([]);

  // 获取当前操作员
  const storeUsers = useUserStore((s) => s.users);
  const currentOperator = storeUsers.length > 0 ? storeUsers[0]?.name : (localStorage.getItem('username') || '系统管理员');

  // 初始化标签编号列表（直接从record字段生成，不依赖API或Store）
  useEffect(() => {
    if (!isOpen || !record?.id) return;
    const seedlingCode = record.seedlingCode || '';
    // 使用成活数量作为标签数量上限
    const count = record.survivalCount || record.initialCount || 0;
    if (seedlingCode && count > 0) {
      const nums: string[] = [];
      const maxLabels = Math.min(count, 200);
      for (let i = 0; i < maxLabels; i++) {
        nums.push(`${seedlingCode}-${String(i + 1).padStart(4, '0')}`);
      }
      setAllLabelNumbers(nums);
      setPreviewLabel(nums[0]);
    }
  }, [isOpen, record?.id, record?.seedlingCode, record?.survivalCount, record?.initialCount]);

  // printLabels更新后触发打印
  useEffect(() => {
    if (printLabels.length > 0) {
      const timer = setTimeout(() => {
        window.print();
        setPrintLabels([]);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [printLabels]);

  // 剩余可用数量
  const remainingCount = record?.survivalCount || record?.initialCount || 0;

  // 处理打印
  const handlePrint = () => {
    setLoading(true);
    try {
      let labelsToPrint: string[] = [];

      if (printMode === 'single') {
        if (!previewLabel) { showAlert('请选择要打印的标签'); return; }
        labelsToPrint = [previewLabel];
      } else if (printMode === 'multi') {
        if (selectedLabels.length === 0) { showAlert('请选择要打印的标签'); return; }
        labelsToPrint = [...selectedLabels];
      } else {
        // 批量生成
        const startIdx = allLabelNumbers.length;
        for (let i = 0; i < printCount; i++) {
          labelsToPrint.push(`${record.seedlingCode}-${String(startIdx + i + 1).padStart(4, '0')}`);
        }
        // 刷新标签列表
        const totalCount = allLabelNumbers.length + printCount;
        const refreshed: string[] = [];
        const maxShow = Math.min(totalCount, 200);
        for (let i = 0; i < maxShow; i++) {
          refreshed.push(`${record.seedlingCode}-${String(i + 1).padStart(4, '0')}`);
        }
        setAllLabelNumbers(refreshed);
      }

      setPrintLabels(labelsToPrint);
    } finally {
      setLoading(false);
    }
  };

  // 导出Excel
  const handleExportExcel = () => {
    setLoading(true);
    try {
      let labelsToExport: string[] = [];

      if (printMode === 'single' && previewLabel) {
        labelsToExport = [previewLabel];
      } else if (printMode === 'multi' && selectedLabels.length > 0) {
        labelsToExport = selectedLabels;
      } else {
        const startIdx = allLabelNumbers.length;
        for (let i = 0; i < printCount; i++) {
          labelsToExport.push(`${record.seedlingCode}-${String(startIdx + i + 1).padStart(4, '0')}`);
        }
      }

      if (labelsToExport.length === 0) { showAlert('没有可导出的标签'); return; }

      const baseUrl = 'https://tm-crop.com/ResumeTimeline';
      const rows = labelsToExport.map((label, i) => ({
        index: i + 1,
        label,
        url: `${baseUrl}?labelID=${encodeURIComponent(label)}`,
      }));

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>育苗标签打印</title>
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
      <th>场地</th>
      <th>扫描功能码</th>
      <th>育苗批号</th>
      <th>育苗日期</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.index}</td>
      <td>${record.cropName}</td>
      <td>${record.siteName || '-'}</td>
      <td><a href="${r.url}" target="_blank">${r.url}</a></td>
      <td style="font-family:monospace;font-size:11px;">${r.label}</td>
      <td>${record.startDate || '-'}</td>
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
  };

  // 切换选择标签
  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const toggleSelectAll = () => {
    setSelectedLabels(prev =>
      prev.length === allLabelNumbers.length ? [] : [...allLabelNumbers]
    );
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
              <Download className="w-4 h-4" />
              导出Excel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              disabled={loading}
            >
              <Printer className="w-4 h-4" />
              {loading ? '处理中...' : '打印'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 打印模式选择 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex gap-4 mb-4">
            {(['single', 'multi', 'batch'] as const).map(mode => (
              <Label key={mode} className="flex items-center gap-2">
                <Input type="radio" name="printMode" value={mode}
                  checked={printMode === mode}
                  onChange={() => { setPrintMode(mode); setSelectedLabels([]); }}
                  className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium">
                  {mode === 'single' ? '单标签打印' : mode === 'multi' ? '多标签打印' : '批量生成'}
                </span>
              </Label>
            ))}
          </div>

          {/* 单标签模式 */}
          {printMode === 'single' && (
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-gray-600 text-xs">选择标签编号</Label>
                <Select value={previewLabel} onValueChange={(val) => setPreviewLabel(val)}>
                  <SelectTrigger className="w-48 px-3 py-1 border border-gray-400 rounded text-sm">
                    <SelectValue placeholder="选择标签" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLabelNumbers.map(label => <SelectItem key={label} value={label}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-gray-500">共 {allLabelNumbers.length} 个标签</div>
            </div>
          )}

          {/* 多标签模式 */}
          {printMode === 'multi' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-600 text-xs">选择标签（已选 {selectedLabels.length} 个）</Label>
                <Button variant="link" size="sm" onClick={toggleSelectAll}>
                  {selectedLabels.length === allLabelNumbers.length ? '取消全选' : '全选'}
                </Button>
              </div>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                <div className="grid grid-cols-4 gap-1">
                  {allLabelNumbers.slice(0, 100).map(label => (
                    <Label key={label} className={`flex items-center gap-1 p-1 rounded cursor-pointer text-xs ${
                      selectedLabels.includes(label) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                      <Input type="checkbox" checked={selectedLabels.includes(label)}
                        onChange={() => toggleLabel(label)} className="w-3 h-3" />
                      <span className="truncate">{label}</span>
                    </Label>
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
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-gray-600 text-xs">生成数量</Label>
                <Input type="number" min="1" max={remainingCount}
                  value={printCount}
                  onChange={(e) => setPrintCount(Math.max(1, Math.min(remainingCount, Number(e.target.value))))}
                  className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
              </div>
              <div className="text-xs text-gray-500">
                将生成 {printCount} 个标签（可用库存：{remainingCount}，已生成：{allLabelNumbers.length}）
              </div>
            </div>
          )}
        </div>

        {/* 模板选择 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">操作人员</Label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">{currentOperator}</div>
          </div>
          <div>
            <Label className="text-gray-700">模板选择</Label>
            <Select value={template} onValueChange={(val) => setTemplate(val as 'small' | 'large' | 'detail')}>
              <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm">
                <SelectValue placeholder="详情标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">小标签</SelectItem>
                <SelectItem value="large">大标签</SelectItem>
                <SelectItem value="detail">详情标签</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 标签预览 */}
        <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 bg-gray-50">
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
                    <div className="text-gray-500">育苗批号：</div><div className="text-gray-900 font-mono text-xs">{record.seedlingCode}</div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">初始数量：</div><div className="text-gray-900">{record.initialCount?.toLocaleString()}</div>
                    <div className="text-gray-500">成活数量：</div><div className="text-emerald-600 font-bold">{record.survivalCount?.toLocaleString()}</div>
                    <div className="text-gray-500">成活率：</div><div className="text-emerald-600">{record.survivalRate}%</div>
                    <div className="text-gray-500">育苗日期：</div><div className="text-gray-900">{record.startDate}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 打印容器 */}
      <div className="hidden print-container">
        {printLabels.map((label) => (
          <div key={label} className="print-label-card">
            <div className="bg-white p-3 border border-gray-400 rounded-lg">
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
