/**
 * 育苗标签打印弹窗（完全参照种源管理实现）
 * 支持单标签打印、多标签打印、批量生成、导出Excel
 */
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Seedling } from '../../../../types/crop';
import { useUserStore, usePlantLabelStore } from '../../../../stores';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { LabelTypeSelector } from '@/components/ui';
import type { LabelType } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

// 2026-06-28：打印模式字典（卡片按钮显示：图标 + 主标题 + 副标题 + tooltip 描述）
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

  // 2026-06-23: 标签粒度 — 批次/单株/混合 三态 + 数量
  const [labelType, setLabelType] = useState<LabelType>('batch');
  // 2026-06-28：整批共享模式默认值改为"初始数量"（不再硬编码 1）— 前端 Store 归一化后字段是 initialCount
  const [labelQuantity, setLabelQuantity] = useState(record?.initialCount || 1);
  // 混合模式：每行 quantity 可编辑（以行索引为 key）
  const [mixedQuantities, setMixedQuantities] = useState<Record<number, number>>({});

  // 2026-06-28：record 切换时（如关闭再打开另一批）重置 labelQuantity 默认值
  useEffect(() => {
    if (record?.id && record.initialCount != null) {
      setLabelQuantity(record.initialCount);
    }
  }, [record?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // 2026-06-28：整批共享模式快捷口径计算
  // 关键修正（用户报告 YM20260623-001 母株存活 1220 株，标签弹窗却显示 0）：
  // 之前误用 record.survivalCount（= 后端 survival_quantity = 从未正确写入 = 永远是 0）。
  // 实际正确的"当前存活"应该按模式区分：
  //   - 1:多：母株存活数 motherPlantCount（用户核心关切）
  //   - 1:1：成活数量 = initialCount - seedlingLossCount
  const initialQuantity = record?.initialCount || 1;
  const propagationMode = record?.propagationMode || 'one_to_one';
  const currentSurviving = (() => {
    if (propagationMode === 'one_to_many') {
      // 1:多：母株存活数（用户最关心的数字，对应表格"母株存活数 1220"列）
      return record?.motherPlantCount || 0;
    }
    // 1:1：初始播种数 - 累计损耗
    return Math.max(0, (record?.initialCount || 0) - (record?.seedlingLossCount || 0));
  })();
  // 本次新增：小苗池累计产出（仅 1:多 模式有意义；1:1 模式用累计补苗作为本次新增）
  const recentNew = propagationMode === 'one_to_many'
    ? (record?.expandedPlantCount || 0)
    : (record?.replantCount || 0);

  // P0: 标签 Store（用于 batch 模式打印时同步入库）
  const batchCreateLabels = usePlantLabelStore((s) => s.batchCreateLabels);
  // P2: 标签 Store 的 loadLabels 和 labels（用于从后端读取已入库标签填充列表）
  const loadLabels = usePlantLabelStore((s) => s.loadLabels);

  // 获取当前操作员
  const storeUsers = useUserStore((s) => s.users);
  const currentOperator = storeUsers.length > 0 ? storeUsers[0]?.name : (localStorage.getItem('username') || '系统管理员');

  // 初始化标签编号列表（P2: 优先从后端读取已入库标签，后端无数据时前端拼接兜底）
  useEffect(() => {
    if (!isOpen || !record?.id) return;
    let cancelled = false;

    (async () => {
      // 从后端按 seedlingId 加载已入库的标签
      await loadLabels({ seedlingId: record.id });
      if (cancelled) return;

      const storeLabels = usePlantLabelStore.getState().labels;
      const labelNumbers = storeLabels
        .filter((l) => String(l.seedlingId) === String(record.id))
        .map((l) => l.labelNumber);

      if (labelNumbers.length > 0) {
        // 后端有数据：用真实标签列表
        setAllLabelNumbers(labelNumbers);
        setPreviewLabel(labelNumbers[0]);
      } else {
        // 兜底：首次生成场景（后端无任何标签），前端拼接初始列表
        const seedlingCode = record.seedlingCode || '';
        // 2026-06-28 修正：用 motherPlantCount（1:多模式）或 initialCount（1:1模式）作为兜底，不再用永远=0 的 survivalCount
        const count = propagationMode === 'one_to_many'
          ? (record.motherPlantCount || record.initialCount || 0)
          : (record.initialCount || 0);
        if (seedlingCode && count > 0) {
          const nums: string[] = [];
          const maxLabels = Math.min(count, 200);
          for (let i = 0; i < maxLabels; i++) {
            nums.push(`${seedlingCode}-${String(i + 1).padStart(4, '0')}`);
          }
          setAllLabelNumbers(nums);
          setPreviewLabel(nums[0]);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, record?.id, record?.seedlingCode, record?.motherPlantCount, record?.initialCount, loadLabels]);

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

  // 剩余可用数量 — 按模式区分（1:多=母株存活；1:1=初始数量）
  // 2026-06-28 修正：不再用永远=0 的 survivalCount
  const remainingCount = propagationMode === 'one_to_many'
    ? (record?.motherPlantCount || record?.initialCount || 0)
    : (record?.initialCount || 0);

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
        // 批量生成（2026-06-23: 标签粒度三态）
        const existingLabels = usePlantLabelStore.getState().labels.filter(
          (l) => String(l.seedlingId) === String(record.id)
        );
        const startIdx = existingLabels.length;
        const newLabels: Array<{
          labelNumber: string;
          seedlingId?: string | null;
          moveInAreaName?: string | null;
          moveInDate?: string | null;
          quantity?: number;
        }> = [];

        // 确定生成数量和每标签株数
        const genCount = labelType === 'batch' ? 1 : printCount;
        for (let i = 0; i < genCount; i++) {
          const labelNumber = `${record.seedlingCode}-${String(startIdx + i + 1).padStart(4, '0')}`;
          labelsToPrint.push(labelNumber);
          const qty = labelType === 'batch'
            ? labelQuantity
            : labelType === 'mixed'
              ? (mixedQuantities[i] ?? 1)
              : 1; // single 模式每标签 1 株
          newLabels.push({
            labelNumber,
            seedlingId: record.id,
            moveInAreaName: record.siteName || null,
            moveInDate: record.startDate || null,
            quantity: qty,
          });
        }

        // P0: 同步入库（让标签管理弹窗能看到这些标签）
        if (newLabels.length > 0) {
          const result: any = await batchCreateLabels(newLabels);
          if (!result) {
            showAlert('标签入库失败，打印已中止');
            setLoading(false);
            return;
          }
          // 2026-06-28：后端去重 — 如果有标签已存在，会被跳过，告知用户
          if (result.skipped > 0 && result.skippedLabelNumbers?.length > 0) {
            showAlert(
              `已跳过 ${result.skipped} 个已存在标签：${result.skippedLabelNumbers.slice(0, 5).join('、')}` +
              (result.skipped > 5 ? ` 等` : '')
            );
          }
        }

        // P2: 刷新本地 allLabelNumbers 用后端最新数据（来源真实）
        const refreshedStoreLabels = usePlantLabelStore.getState().labels;
        const refreshedNumbers = refreshedStoreLabels
          .filter((l) => String(l.seedlingId) === String(record.id))
          .map((l) => l.labelNumber);
        if (refreshedNumbers.length > 0) {
          setAllLabelNumbers(refreshedNumbers.slice(0, 200));
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
          labelsToExport.push(`${record.seedlingCode}-${String(startIdx + i + 1).padStart(4, '0')}`);
        }
      }

      if (labelsToExport.length === 0) { showAlert('没有可导出的标签'); return; }

      const baseUrl = `${window.location.origin}/crop/seedlings`;
      const rows = labelsToExport.map((label, i) => ({
        index: i + 1,
        label,
        url: `${baseUrl}?labelNumber=${encodeURIComponent(label)}`,
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
      a.download = `育苗标签_${record.cropName}_${todayLocal()}.xls`;
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

  // 二维码内容（2026-06-23: 新增 url 字段，扫码跳转育苗页+自动开标签管理弹窗）
  const getQrCodeValue = (label: string) => {
    const baseUrl = window.location.origin;
    return JSON.stringify({
      type: 'seedling', code: label, sourceCode: record.sourceCode,
      cropCode: record.cropCode, cropName: record.cropName,
      variety: record.cropVariety, quantity: currentSurviving,
      site: record.siteName, date: record.startDate,
      url: `${baseUrl}/crop/seedlings?labelNumber=${encodeURIComponent(label)}`
    });
  };

  const currentQrCodeValue = previewLabel ? getQrCodeValue(previewLabel) : '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="标签打印与导出"
      // 2026-06-28：弹窗大小从 lg 升级到 xl（默认 900×600，比 lg 大约 30%，更宽松布局）
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
        {/* 打印模式选择 */}
        <div className="bg-blue-50 rounded-lg p-4">
          {/* 2026-06-28：打印模式选择器改为卡片按钮（参照 LabelTypeSelector 风格）— 一眼看出 3 种模式的区别 */}
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

          {/* 批量生成模式 — 2026-06-23 标签粒度三态 */}
          {printMode === 'batch' && (
            <div className="space-y-3">
              {/* 标签类型选择器 */}
              <div>
                <Label className="text-gray-600 text-xs mb-1 block">标签类型</Label>
                <LabelTypeSelector value={labelType} onChange={setLabelType} hidden={['mixed'] as LabelType[]} />
              </div>

              {/* 整批共享模式：1 个标签承载 N 株苗（共享粒度）— 2026-06-28 强化文案 + 快捷口径按钮 */}
              {labelType === 'batch' && (
                <div className="p-3 bg-emerald-50 rounded border border-emerald-200 space-y-2">
                  {/* 第 1 行：输入框 + 快捷口径按钮 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <Label className="text-gray-700 text-xs font-semibold">每标签承载苗数</Label>
                      <Input type="number" min="1" max={remainingCount}
                        value={labelQuantity}
                        onChange={(e) => setLabelQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-600">快捷口径：</span>
                      <button type="button" onClick={() => setLabelQuantity(initialQuantity)}
                        className="px-2 py-0.5 text-xs rounded border border-emerald-300 bg-white hover:bg-emerald-100 transition-colors"
                        title={`初始数量 ${initialQuantity} 株`}>
                        初始 {initialQuantity}
                      </button>
                      <button type="button" onClick={() => setLabelQuantity(currentSurviving)}
                        className="px-2 py-0.5 text-xs rounded border border-emerald-300 bg-white hover:bg-emerald-100 transition-colors"
                        title={`当前存活 ${currentSurviving} 株（初始 - 损耗）`}>
                        存活 {currentSurviving}
                      </button>
                      <button type="button" onClick={() => setLabelQuantity(recentNew)}
                        className="px-2 py-0.5 text-xs rounded border border-emerald-300 bg-white hover:bg-emerald-100 transition-colors"
                        title={`本次新增 ${recentNew} 株`}>
                        新增 {recentNew}
                      </button>
                    </div>
                  </div>
                  {/* 第 2 行：结果预览 */}
                  <div className="text-xs text-emerald-800">
                    → <span className="font-semibold">生成 1 个标签</span>，该标签代表 <span className="font-semibold">{labelQuantity} 株苗</span>（共用一个二维码）
                  </div>
                </div>
              )}

              {/* 每株独立模式：N 个标签，每标签 1 株（独立粒度）— 2026-06-28 强化文案，让"每株=独立标签"语义清晰 */}
              {labelType === 'single' && (
                <div className="flex items-center gap-4 p-3 bg-cyan-50 rounded border border-cyan-200">
                  <div>
                    <Label className="text-gray-700 text-xs font-semibold">生成标签数（= 苗数）</Label>
                    <Input type="number" min="1" max={remainingCount}
                      value={printCount}
                      onChange={(e) => setPrintCount(Math.max(1, Math.min(remainingCount, Number(e.target.value))))}
                      className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
                    </div>
                  <div className="text-xs text-cyan-800">
                    → <span className="font-semibold">生成 {printCount} 个标签</span>，每株苗 1 个独立二维码（可用库存：{remainingCount}，已生成：{allLabelNumbers.length}）
                  </div>
                </div>
              )}

              {/* 混合模式：N 个标签，逐行可编辑株数 */}
              {labelType === 'mixed' && (
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div>
                      <Label className="text-gray-600 text-xs">生成数量</Label>
                      <Input type="number" min="1" max={Math.min(remainingCount, 50)}
                        value={printCount}
                        onChange={(e) => {
                          const n = Math.max(1, Math.min(50, Number(e.target.value)));
                          setPrintCount(n);
                          // 重置混合数量表（新行默认 qty=1）
                          const mq: Record<number, number> = {};
                          for (let i = 0; i < n; i++) mq[i] = 1;
                          setMixedQuantities(mq);
                        }}
                        className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
                    </div>
                    <div className="text-xs text-gray-500">
                      将生成 {printCount} 个标签，每行可单独指定株数
                    </div>
                  </div>
                  {/* 混合模式预览表格 */}
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left text-gray-500">序号</th>
                          <th className="px-2 py-1 text-left text-gray-500">标签编号（预览）</th>
                          <th className="px-2 py-1 text-left text-gray-500">株数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Array.from({ length: printCount }, (_, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 text-gray-600">{i + 1}</td>
                            <td className="px-2 py-1 font-mono text-gray-700">
                              {record.seedlingCode}-{String(allLabelNumbers.length + i + 1).padStart(4, '0')}
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                min="1"
                                value={mixedQuantities[i] ?? 1}
                                onChange={(e) => setMixedQuantities((prev) => ({
                                  ...prev,
                                  [i]: Math.max(1, Number(e.target.value)),
                                }))}
                                className="w-16 px-1 py-0 border border-gray-300 rounded text-xs h-6"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                    {/* 2026-06-28：成活数量按模式实时计算（不依赖后端 survival_quantity 同步 — 旧字段已停止维护） */}
                    <div className="text-gray-500">成活数量：</div>
                    <div className="text-emerald-600 font-bold">{currentSurviving.toLocaleString()}</div>
                    {/* 成活率 = currentSurviving / initialCount × 100% — 同样前端实时算 */}
                    <div className="text-gray-500">成活率：</div>
                    <div className="text-emerald-600">
                      {initialQuantity > 0
                        ? `${Math.round((currentSurviving / initialQuantity) * 100)}%`
                        : '0%'}
                    </div>
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
