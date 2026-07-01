/**
 * 种源标签打印弹窗（2026-07-01 升级 — 对标育苗管理）
 * 支持单标签打印、多标签打印、批量生成、导出Excel
 * 标签数据持久化到 plant_labels 表（通过 usePlantLabelStore）
 */
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { SeedSource } from '../../../../types/crop';
import { useUserStore, useAuthStore, usePlantLabelStore } from '../../../../stores';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

// 2026-07-01 P1-4 修复：HTML 转义防止 XSS + 表格结构破坏
function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 2026-07-01 P2-9：标签列表最大显示数（超过时只显示前 N 个 + 提示）
const MAX_LABEL_DISPLAY = 200;

// 打印模式字典（卡片按钮显示）
const PRINT_MODE_MAP: Record<'single' | 'multi' | 'batch', { label: string; sublabel: string; desc: string; icon: string }> = {
  single: {
    label: '单标签打印',
    sublabel: '重打 1 个已存在',
    desc: '从已有标签中选择 1 个重新打印（适合标签褪色/丢失后补打）',
    icon: '🏷️',
  },
  multi: {
    label: '多标签打印',
    sublabel: '批量勾选已存在',
    desc: '从已有标签列表中勾选多个一并打印（适合整批补打）',
    icon: '📋',
  },
  batch: {
    label: '批量生成',
    sublabel: '生成新标签',
    desc: '系统生成新的标签编号 + 同步入库 + 打印（适合首次打标签）',
    icon: '✨',
  },
};

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  const [template, setTemplate] = useState<'small' | 'large' | 'detail'>('detail');
  const [printMode, setPrintMode] = useState<'single' | 'multi' | 'batch'>('single');
  const [printCount, setPrintCount] = useState(1);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [previewLabel, setPreviewLabel] = useState('');
  const [allLabelNumbers, setAllLabelNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [printLabels, setPrintLabels] = useState<string[]>([]);

  // Store 操作
  const batchCreateLabels = usePlantLabelStore((s) => s.batchCreateLabels);
  const loadLabels = usePlantLabelStore((s) => s.loadLabels);

  // 获取当前操作员
  const authCurrentUser = useAuthStore((s) => s.currentUser);
  const storeUsers = useUserStore((s) => s.users);
  const currentOperator = authCurrentUser?.name
    || authCurrentUser?.username
    || (storeUsers.length > 0 ? storeUsers[0]?.name : '系统管理员');

  // 打开弹窗时从后端加载已入库标签
  useEffect(() => {
    if (!isOpen || !record?.id) return;
    let cancelled = false;

    (async () => {
      await loadLabels({ seedSourceId: record.id });
      if (cancelled) return;

      const storeLabels = usePlantLabelStore.getState().labels;
      const labelNumbers = storeLabels
        .filter((l) => String(l.seedSourceId) === String(record.id))
        .map((l) => l.labelNumber);

      if (labelNumbers.length > 0) {
        // 2026-07-01 P2-9：硬编码 200 抽常量 + 截断提示
        setAllLabelNumbers(labelNumbers);
        setPreviewLabel(labelNumbers[0]);
      } else {
        // 兜底：无已入库标签时前端拼接
        const seedCode = record.seedCode || '';
        const count = record.availableCount || 0;
        if (seedCode && count > 0) {
          const nums: string[] = [];
          const maxLabels = Math.min(count, MAX_LABEL_DISPLAY);
          for (let i = 0; i < maxLabels; i++) {
            nums.push(`${seedCode}-${String(i + 1).padStart(4, '0')}`);
          }
          setAllLabelNumbers(nums);
          setPreviewLabel(nums[0]);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, record?.id, record?.seedCode, record?.availableCount, loadLabels]);

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

  const remainingCount = record?.availableCount || 0;
  // 标签单位（从种源记录取，兜底"粒"）
  const labelUnit = record?.unit || '粒';

  // 处理打印
  const handlePrint = async () => {
    setLoading(true);
    try {
      let labelsToPrint: string[] = [];

      if (printMode === 'single') {
        if (!previewLabel) { showAlert('请选择要打印的标签'); setLoading(false); return; }
        labelsToPrint = [previewLabel];
      } else if (printMode === 'multi') {
        if (selectedLabels.length === 0) { showAlert('请选择要打印的标签'); setLoading(false); return; }
        labelsToPrint = [...selectedLabels];
      } else {
        // 批量生成：入库到 plant_labels 表
        const newLabels: Array<{
          labelNumber: string;
          seedSourceId?: string | null;
          moveInAreaName?: string | null;
          moveInDate?: string | null;
          quantity?: number;
        }> = [];

        // 2026-07-01 P1-3 修复：先 await loadLabels 确保 store 是最新状态
        // 避免多用户/快速点击时序号跳号
        await loadLabels({ seedSourceId: record.id });
        const existingLabels = usePlantLabelStore.getState().labels.filter(
          (l) => String(l.seedSourceId) === String(record.id)
        );
        const startIdx = existingLabels.length;

        for (let i = 0; i < printCount; i++) {
          const labelNumber = `${record.seedCode}-${String(startIdx + i + 1).padStart(4, '0')}`;
          labelsToPrint.push(labelNumber);
          newLabels.push({
            labelNumber,
            seedSourceId: record.id,
            moveInAreaName: record.supplierName || null,
            moveInDate: record.purchaseDate || null,
            quantity: 1,
          });
        }

        // 同步入库
        if (newLabels.length > 0) {
          const result: any = await batchCreateLabels(newLabels);
          if (!result) {
            showAlert('标签入库失败，打印已中止');
            setLoading(false);
            return;
          }
          if (result.skipped > 0 && result.skippedLabelNumbers?.length > 0) {
            showAlert(
              `已跳过 ${result.skipped} 个已存在标签：${result.skippedLabelNumbers.slice(0, 5).join('、')}` +
              (result.skipped > 5 ? ` 等` : '')
            );
          }
        }

        // 刷新标签列表
        const refreshedStoreLabels = usePlantLabelStore.getState().labels;
        const refreshedNumbers = refreshedStoreLabels
          .filter((l) => String(l.seedSourceId) === String(record.id))
          .map((l) => l.labelNumber);
        if (refreshedNumbers.length > 0) {
          setAllLabelNumbers(refreshedNumbers.slice(0, MAX_LABEL_DISPLAY));
        }
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
          labelsToExport.push(`${record.seedCode}-${String(startIdx + i + 1).padStart(4, '0')}`);
        }
      }

      if (labelsToExport.length === 0) { showAlert('没有可导出的标签'); return; }

      const baseUrl = `${window.location.origin}/crop/seed-sources`;
      const rows = labelsToExport.map((label, i) => ({
        index: i + 1,
        label,
        url: `${baseUrl}?labelNumber=${encodeURIComponent(label)}`,
      }));

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>种源标签打印</title>
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
      <th>供应商</th>
      <th>扫描功能码</th>
      <th>种源批号</th>
      <th>采购日期</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.index}</td>
      <td>${escapeHtml(record.cropName)}</td>
      <td>${escapeHtml(record.supplierName || '-')}</td>
      <td><a href="${escapeHtml(r.url)}" target="_blank">${escapeHtml(r.url)}</a></td>
      <td style="font-family:monospace;font-size:11px;">${escapeHtml(r.label)}</td>
      <td>${escapeHtml(record.purchaseDate || '-')}</td>
    </tr>`).join('')}</tbody>
  </table>
</body></html>`;

      const blob = new Blob(['﻿' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `种源标签_${record.cropName}_${todayLocal()}.xls`;
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

  // 二维码内容（含 URL 字段，扫码跳转种源页 + 自动开标签管理弹窗）
  const getQrCodeValue = (label: string) => {
    const baseUrl = window.location.origin;
    return JSON.stringify({
      type: 'seed-source', code: label, seedCode: record.seedCode,
      cropCode: record.cropCode, cropName: record.cropName,
      variety: record.cropVariety, quantity: `${record.availableCount} ${labelUnit}`,
      supplier: record.supplierName, date: record.purchaseDate,
      url: `${baseUrl}/crop/seed-sources?labelNumber=${encodeURIComponent(label)}`
    });
  };

  const currentQrCodeValue = previewLabel ? getQrCodeValue(previewLabel) : '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="标签打印与导出"
      size="xl"
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
              <X className="w-4 h-4" /> 取消
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
        {/* 打印模式选择 — 卡片按钮风格（对标育苗） */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['single', 'multi', 'batch'] as const).map(mode => {
              const info = PRINT_MODE_MAP[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setPrintMode(mode); setSelectedLabels([]); }}
                  className={`px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    printMode === mode
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                  title={info.desc}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{info.icon}</span>
                    <span className={`text-sm ${printMode === mode ? 'font-semibold text-emerald-800' : 'font-medium text-gray-700'}`}>
                      {info.label}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 ${printMode === mode ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {info.sublabel}
                  </div>
                </button>
              );
            })}
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

          {/* 批量生成模式 — 种源简化版（不需要标签粒度选择器） */}
          {printMode === 'batch' && (
            <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded border border-emerald-200">
              <div>
                <Label className="text-gray-700 text-xs font-semibold">生成数量</Label>
                <Input type="number" min="1" max={remainingCount}
                  value={printCount}
                  onChange={(e) => setPrintCount(Math.max(1, Math.min(remainingCount, Number(e.target.value))))}
                  className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
              </div>
              <div className="text-xs text-emerald-800">
                → <span className="font-semibold">生成 {printCount} 个标签</span>，每个标签代表 1 {labelUnit}（可用库存：{remainingCount} {labelUnit}，已生成：{allLabelNumbers.length}）
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
                  <div className="text-sm font-bold text-gray-900">{previewLabel || record.seedCode}</div>
                  <div className="text-xs text-gray-600">{record.cropName}</div>
                </div>
              </div>
            ) : template === 'large' ? (
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
              <div className="flex print-label bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex-shrink-0">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="ml-4 flex flex-col justify-center">
                  <div className="text-lg font-bold text-gray-900 mb-2">{previewLabel || record.seedCode}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">作物名称：</div><div className="text-gray-900 font-medium">{record.cropName}</div>
                    <div className="text-gray-500">作物品种：</div><div className="text-gray-900">{record.cropVariety}</div>
                    <div className="text-gray-500">供应商：</div><div className="text-gray-900">{record.supplierName}</div>
                    <div className="text-gray-500">种源批号：</div><div className="text-gray-900 font-mono text-xs">{record.seedCode}</div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">可用数量：</div><div className="text-emerald-600 font-bold">{record.availableCount.toLocaleString()} {labelUnit}</div>
                    <div className="text-gray-500">入库数量：</div><div className="text-gray-900">{(record.quantity ?? record.initialCount)?.toLocaleString()} {labelUnit}</div>
                    <div className="text-gray-500">采购日期：</div><div className="text-gray-900">{record.purchaseDate}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 打印容器：正常隐藏，打印时显示所有选中标签 */}
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
