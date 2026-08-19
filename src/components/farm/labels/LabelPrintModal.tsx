/**
 * 标签打印弹窗 — 共享组件（内部种源 / 育苗管理 / 种植管理 三模块共用）
 *
 * 2026-08-19 抽取：三个模块的 PrintLabelModal（各 500-680 行）90% 重复，
 *   仅字段名/数量口径/详情预览/QR/导出列不同。抽成 config 驱动，三处改动只需改此文件。
 *
 * 模块差异通过 LabelPrintConfig 注入（见各模块薄包装里的 PLANTING_CONFIG 等）：
 *   - 字段名映射：codeField/areaField/dateField/linkField
 *   - 数量口径：count() / quickButtons
 *   - 详情预览右侧字段：previewRight()
 *   - QR 内容：qrType / qrExtra() / qrQuantity()
 *   - 导出列：exportCols
 *
 * 三模块薄包装保留原文件路径和导出名（调用方零改动）：
 *   - src/components/farm/planting/modals/PrintLabelModal.tsx
 *   - src/components/farm/seedling/modals/PrintLabelModal.tsx
 *   - src/components/farm/seed-source/modals/PrintLabelModal.tsx
 */
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, X } from 'lucide-react';
import { UnifiedModal, Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { LabelTypeSelector } from '@/components/ui';
import type { LabelType } from '@/components/ui';
import { useUserStore, usePlantLabelStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

/** 详情预览右侧字段（高亮样式可选） */
export interface PreviewField {
  label: string;
  value: string;
  cls?: 'emerald-bold' | 'amber-bold' | 'default';
}

/** 模块差异配置 */
export interface LabelPrintConfig {
  module: 'planting' | 'seedling' | 'seed_source';
  /** 标签前缀字段名（plantCode / seedlingCode / seedCode） */
  codeField: string;
  /** 区域字段名（areaName / siteName / supplierName）— 用于 moveInAreaName */
  areaField: string;
  /** 日期字段名（plantingDate / startDate / purchaseDate）— 用于 moveInDate */
  dateField: string;
  /** 入库关联字段名（plantingId / seedlingId / seedSourceId） */
  linkField: string;
  /** 扫码跳转路由（/crop/planting 等） */
  route: string;
  /** Excel 文件名前缀（种植标签 / 育苗标签 / 种源标签） */
  exportTitle: string;
  /** QR type 字段值 */
  qrType: string;
  /** 单位（seed-source 用，如"粒"；其他模块无） */
  unit?: string;
  /** 是否显示标签粒度三态选择器（planting/seedling 有，seed-source 简化） */
  showLabelType: boolean;
  /** 计算"应有标签数"（下拉补齐上限） */
  count: (record: any) => number;
  /** 计算"当前存活/剩余"（QR quantity + 详情预览用；各模块口径不同） */
  surviving: (record: any) => number;
  /** 快捷口径按钮（batch 整批共享模式），如 初始/剩余/新增 */
  quickButtons?: { label: string; value: number }[];
  /** 详情预览模板右侧字段 */
  previewRight: (record: any, currentSurviving: number) => PreviewField[];
  /** QR 额外字段（sourceCode/site/date 等） */
  qrExtra: (record: any) => Record<string, any>;
  /** QR quantity 值（seed-source 用 `${availableCount} ${unit}` 字符串） */
  qrQuantity: (record: any, currentSurviving: number) => string | number;
  /** 导出 Excel 通用列头（作物名称列之后的 3 列） */
  exportCols: { areaHeader: string; codeHeader: string; dateHeader: string };
}

interface LabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any; // Planting | Seedling | SeedSource（运行时 camelCase）
  config: LabelPrintConfig;
}

export function LabelPrintModal({ isOpen, onClose, record, config }: LabelPrintModalProps) {
  const [template, setTemplate] = useState<'small' | 'large' | 'detail'>('detail');
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('single');
  const [printCount, setPrintCount] = useState(1);
  const [previewLabel, setPreviewLabel] = useState('');
  const [allLabelNumbers, setAllLabelNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [printLabels, setPrintLabels] = useState<string[]>([]);
  // 2026-08-19：该模块已有标签数量（batch UI 显示"已生成 N 个"用；不依赖 allLabelNumbers）
  const [existingCount, setExistingCount] = useState(0);

  // 标签粒度三态（batch 模式，showLabelType=true 时）
  const [labelType, setLabelType] = useState<LabelType>('batch');
  const [labelQuantity, setLabelQuantity] = useState(1);
  const [mixedQuantities, setMixedQuantities] = useState<Record<number, number>>({});

  const batchCreateLabels = usePlantLabelStore((s) => s.batchCreateLabels);
  const loadLabels = usePlantLabelStore((s) => s.loadLabels);

  // 当前操作员
  const storeUsers = useUserStore((s) => s.users);
  const currentOperator = storeUsers.length > 0 ? storeUsers[0]?.name : (localStorage.getItem('username') || '系统管理员');

  // 标签前缀 + 快捷口径（surviving/count 由各模块 config 提供，口径精确）
  const code = record?.[config.codeField] || '';
  const currentSurviving = config.surviving(record);
  const remainingCount = config.count(record);

  // 2026-08-19：初始化标签编号列表 — 单标签模式只显示"下一个未打印的标签"
  //   - 读取标签管理已有标签数量 N → 待打印下一个 = code-000N+1
  //   - 标签管理为空 → 从 code-0001 开始
  //   - 不再列出全部/200 个（用户要求：只显示需要打印的下一个）
  useEffect(() => {
    if (!isOpen || !record?.id) return;
    let cancelled = false;

    (async () => {
      await loadLabels({ [config.linkField]: record.id });
      if (cancelled) return;

      const storeLabels = usePlantLabelStore.getState().labels;
      const existing = storeLabels
        .filter((l: any) => String(l[config.linkField]) === String(record.id))
        .length;
      setExistingCount(existing);

      if (code) {
        // 下一个未打印标签 = 已有数量 + 1
        const nextLabel = `${code}-${String(existing + 1).padStart(4, '0')}`;
        setAllLabelNumbers([nextLabel]);
        setPreviewLabel(nextLabel);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, record?.id, code, config.linkField, loadLabels]);

  // record 切换时重置 labelQuantity（batch 整批共享默认 = 剩余数量）
  useEffect(() => {
    if (record?.id) setLabelQuantity(remainingCount || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  // printLabels 更新后触发打印
  useEffect(() => {
    if (printLabels.length === 0) return undefined;
    const timer = setTimeout(() => {
      window.print();
      setPrintLabels([]);
    }, 150);
    return () => clearTimeout(timer);
  }, [printLabels]);

  // 处理打印
  const handlePrint = async () => {
    setLoading(true);
    try {
      let labelsToPrint: string[] = [];

      if (printMode === 'single') {
        if (!previewLabel) { showAlert('请选择要打印的标签'); setLoading(false); return; }
        labelsToPrint = [previewLabel];
        // 打印即入库（后端去重，已存在跳过）— 让打印的标签自动出现在标签管理左侧列表
        const result: any = await batchCreateLabels([{
          labelNumber: previewLabel,
          [config.linkField]: record.id,
          moveInAreaName: record[config.areaField] || null,
          moveInDate: record[config.dateField] || null,
          quantity: 1,
        }]);
        if (!result) {
          showAlert('标签入库失败，打印已中止');
          setLoading(false);
          return;
        }
        if (result.skipped > 0 && result.skippedLabelNumbers?.length > 0) {
          console.log('[print] 已存在跳过入库:', result.skippedLabelNumbers);
        }
        // 打印后刷新为"下一个未打印"（已有数量 +1）
        const refreshedStoreLabels = usePlantLabelStore.getState().labels;
        const refreshedCount = refreshedStoreLabels
          .filter((l: any) => String(l[config.linkField]) === String(record.id))
          .length;
        if (code) {
          const nextLabel = `${code}-${String(refreshedCount + 1).padStart(4, '0')}`;
          setAllLabelNumbers([nextLabel]);
          setPreviewLabel(nextLabel);
        }
      } else {
        // 批量生成（showLabelType=true 时三态；false 时简化 — 每标签 1 单位）
        const existingLabels = usePlantLabelStore.getState().labels.filter(
          (l: any) => String(l[config.linkField]) === String(record.id)
        );
        const startIdx = existingLabels.length;
        // 与 batchCreateLabels 签名对齐（labelNumber + 各模块关联字段 + 位置/日期/数量）
        const newLabels: Array<{
          labelNumber: string;
          plantingId?: string | null;
          seedlingId?: string | null;
          seedSourceId?: string | null;
          moveInAreaName?: string | null;
          moveInDate?: string | null;
          quantity?: number;
        }> = [];

        const genCount = config.showLabelType ? (labelType === 'batch' ? 1 : printCount) : printCount;
        for (let i = 0; i < genCount; i++) {
          const labelNumber = `${code}-${String(startIdx + i + 1).padStart(4, '0')}`;
          labelsToPrint.push(labelNumber);
          const qty = config.showLabelType
            ? (labelType === 'batch' ? labelQuantity : labelType === 'mixed' ? (mixedQuantities[i] ?? 1) : 1)
            : 1;
          newLabels.push({
            labelNumber,
            [config.linkField]: record.id,
            moveInAreaName: record[config.areaField] || null,
            moveInDate: record[config.dateField] || null,
            quantity: qty,
          });
        }

        // 同步入库（让标签管理弹窗能看到这些标签）
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

        // 刷新本地 allLabelNumbers 用后端最新数据
        const refreshedStoreLabels = usePlantLabelStore.getState().labels;
        const refreshedNumbers = refreshedStoreLabels
          .filter((l: any) => String(l[config.linkField]) === String(record.id))
          .map((l: any) => l.labelNumber);
        if (refreshedNumbers.length > 0) setAllLabelNumbers(refreshedNumbers.slice(0, 200));
      }

      setPrintLabels(labelsToPrint);
    } finally {
      setLoading(false);
    }
  };

  // 导出 Excel（导出即入库）
  const handleExportExcel = async () => {
    setLoading(true);
    try {
      let labelsToExport: string[] = [];

      if (printMode === 'single' && previewLabel) {
        labelsToExport = [previewLabel];
      } else {
        // 批量导出从"下一个未打印"开始（读 store 已有数量，不依赖 allLabelNumbers）
        const existingCount = usePlantLabelStore.getState().labels
          .filter((l: any) => String(l[config.linkField]) === String(record.id))
          .length;
        for (let i = 0; i < printCount; i++) {
          labelsToExport.push(`${code}-${String(existingCount + i + 1).padStart(4, '0')}`);
        }
      }

      if (labelsToExport.length === 0) { showAlert('没有可导出的标签'); return; }

      // 导出前同步入库（后端去重，已存在跳过）
      await batchCreateLabels(labelsToExport.map((labelNumber) => ({
        labelNumber,
        [config.linkField]: record.id,
        moveInAreaName: record[config.areaField] || null,
        moveInDate: record[config.dateField] || null,
        quantity: 1,
      })));

      const baseUrl = `${window.location.origin}${config.route}`;
      const rows = labelsToExport.map((label, i) => ({
        index: i + 1,
        label,
        url: `${baseUrl}?labelNumber=${encodeURIComponent(label)}`,
      }));

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${config.exportTitle}</title>
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
      <th>序号</th><th>作物名称</th><th>${config.exportCols.areaHeader}</th>
      <th>扫描功能码</th><th>${config.exportCols.codeHeader}</th><th>${config.exportCols.dateHeader}</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.index}</td>
      <td>${escapeHtml(record.cropName || '-')}</td>
      <td>${escapeHtml(record[config.areaField] || '-')}</td>
      <td><a href="${escapeHtml(r.url)}" target="_blank">${escapeHtml(r.url)}</a></td>
      <td style="font-family:monospace;font-size:11px;">${escapeHtml(r.label)}</td>
      <td>${escapeHtml(record[config.dateField] || '-')}</td>
    </tr>`).join('')}</tbody>
  </table>
</body></html>`;

      const blob = new Blob(['﻿' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.exportTitle}_${record.cropName}_${todayLocal()}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  // QR 内容（config 驱动）
  const getQrCodeValue = (label: string) => {
    const baseUrl = window.location.origin;
    return JSON.stringify({
      type: config.qrType, code: label,
      ...config.qrExtra(record),
      quantity: config.qrQuantity(record, currentSurviving),
      url: `${baseUrl}${config.route}?labelNumber=${encodeURIComponent(label)}`
    });
  };

  const currentQrCodeValue = previewLabel ? getQrCodeValue(previewLabel) : '';
  // 详情预览右侧字段
  const previewFields = config.previewRight(record, currentSurviving);

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
            <Button variant="secondary" size="sm" onClick={onClose}>
              <X className="w-4 h-4" /> 取消
            </Button>
            <Button variant="blue" size="sm" onClick={handleExportExcel} disabled={loading}>
              <Download className="w-4 h-4" /> 导出Excel
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} disabled={loading}>
              <Printer className="w-4 h-4" /> {loading ? '处理中...' : '打印'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 打印模式选择 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(['single', 'batch'] as const).map((mode) => {
              const info = PRINT_MODE_MAP[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPrintMode(mode)}
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

          {/* 单标签模式（2026-08-19：只显示下一个未打印的标签，只读文本无需选择） */}
          {printMode === 'single' && (
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-gray-600 text-xs">待打印标签</Label>
                <div className="w-48 px-3 py-1 border border-gray-300 rounded text-sm bg-gray-50 font-mono text-gray-800">
                  {previewLabel || '加载中...'}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                按标签管理已有序号自动递增（打印后自动切换下一个）
              </div>
            </div>
          )}

          {/* 批量生成模式 */}
          {printMode === 'batch' && (
            <div className="space-y-3">
              {config.showLabelType ? (
                <>
                  {/* 标签粒度三态 */}
                  <div>
                    <Label className="text-gray-600 text-xs mb-1 block">标签类型</Label>
                    <LabelTypeSelector value={labelType} onChange={setLabelType} hidden={['mixed'] as LabelType[]} />
                  </div>

                  {/* 整批共享模式：1 个标签承载 N 株 */}
                  {labelType === 'batch' && (
                    <div className="p-3 bg-emerald-50 rounded border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div>
                          <Label className="text-gray-700 text-xs font-semibold">每标签承载株数</Label>
                          <Input type="number" min="1" max={remainingCount}
                            value={labelQuantity}
                            onChange={(e) => setLabelQuantity(Math.max(1, Number(e.target.value)))}
                            className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
                        </div>
                        {config.quickButtons && config.quickButtons.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">快捷口径：</span>
                            {config.quickButtons.map((btn) => (
                              <button key={btn.label} type="button"
                                onClick={() => setLabelQuantity(btn.value)}
                                className="px-2 py-0.5 text-xs rounded border border-emerald-300 bg-white hover:bg-emerald-100 transition-colors"
                                title={`快捷设置每标签承载数量为 ${btn.value}`}>
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-emerald-800">
                        → <span className="font-semibold">生成 1 个标签</span>，该标签代表 <span className="font-semibold">{labelQuantity} 株</span>（共用一个二维码）
                      </div>
                    </div>
                  )}

                  {/* 每株独立模式 */}
                  {labelType === 'single' && (
                    <div className="flex items-center gap-4 p-3 bg-cyan-50 rounded border border-cyan-200">
                      <div>
                        <Label className="text-gray-700 text-xs font-semibold">生成标签数（= 株数）</Label>
                        <Input type="number" min="1" max={remainingCount}
                          value={printCount}
                          onChange={(e) => setPrintCount(Math.max(1, Math.min(remainingCount, Number(e.target.value))))}
                          className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
                      </div>
                      <div className="text-xs text-cyan-800">
                        → <span className="font-semibold">生成 {printCount} 个标签</span>，每株 1 个独立二维码（可用：{remainingCount}，已生成：{existingCount}）
                      </div>
                    </div>
                  )}

                  {/* 混合模式 */}
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
                              const mq: Record<number, number> = {};
                              for (let i = 0; i < n; i++) mq[i] = 1;
                              setMixedQuantities(mq);
                            }}
                            className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
                        </div>
                        <div className="text-xs text-gray-500">将生成 {printCount} 个标签，每行可单独指定株数</div>
                      </div>
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
                                  {code}-{String(existingCount + i + 1).padStart(4, '0')}
                                </td>
                                <td className="px-2 py-1">
                                  <Input type="number" min="1" value={mixedQuantities[i] ?? 1}
                                    onChange={(e) => setMixedQuantities((prev) => ({ ...prev, [i]: Math.max(1, Number(e.target.value)) }))}
                                    className="w-16 px-1 py-0 border border-gray-300 rounded text-xs h-6" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // 简化模式（seed-source）：生成数量 + 每标签 1 单位
                <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded border border-emerald-200">
                  <div>
                    <Label className="text-gray-700 text-xs font-semibold">生成数量</Label>
                    <Input type="number" min="1" max={remainingCount}
                      value={printCount}
                      onChange={(e) => setPrintCount(Math.max(1, Math.min(remainingCount, Number(e.target.value))))}
                      className="w-24 px-3 py-1 border border-gray-400 rounded text-sm" />
                  </div>
                  <div className="text-xs text-emerald-800">
                    → <span className="font-semibold">生成 {printCount} 个标签</span>，每个标签代表 1 {config.unit || '单位'}（可用库存：{remainingCount} {config.unit || ''}，已生成：{existingCount}）
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作人员 + 模板选择 */}
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

        {/* 标签预览（3 模板） */}
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
                  <div className="text-sm font-bold text-gray-900">{previewLabel || code}</div>
                  <div className="text-xs text-gray-600">{record.cropName}</div>
                </div>
              </div>
            ) : template === 'large' ? (
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="mt-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{previewLabel || code}</div>
                  <div className="text-sm text-gray-600 mt-1">{record.cropName} - {record.cropVariety}</div>
                </div>
              </div>
            ) : (
              <div className="flex print-label bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex-shrink-0">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="ml-4 flex flex-col justify-center">
                  <div className="text-lg font-bold text-gray-900 mb-2">{previewLabel || code}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">作物名称：</div><div className="text-gray-900 font-medium">{record.cropName}</div>
                    <div className="text-gray-500">作物品种：</div><div className="text-gray-900">{record.cropVariety}</div>
                    <div className="text-gray-500">区域/场地：</div><div className="text-gray-900">{record[config.areaField] || '-'}</div>
                    <div className="text-gray-500">批号：</div><div className="text-gray-900 font-mono text-xs">{code}</div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {previewFields.map((f) => (
                      <React.Fragment key={f.label}>
                        <div className="text-gray-500">{f.label}：</div>
                        <div className={
                          f.cls === 'emerald-bold' ? 'text-emerald-600 font-bold'
                          : f.cls === 'amber-bold' ? 'text-amber-600 font-bold'
                          : 'text-gray-900'
                        }>{f.value}</div>
                      </React.Fragment>
                    ))}
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

/** HTML 转义（导出 Excel 用） */
function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 打印模式字典
const PRINT_MODE_MAP: Record<'single' | 'batch', { label: string; sublabel: string; desc: string; icon: string }> = {
  single: {
    label: '单标签打印',
    sublabel: '打印下一个新标签',
    desc: '按标签管理已有序号自动递增，打印下一个新标签（打印后自动切换下一个）',
    icon: '🏷️',
  },
  batch: {
    label: '批量生成',
    sublabel: '生成新标签',
    desc: '系统生成新的标签编号 + 同步入库 + 打印（适合首次打标签）',
    icon: '✨',
  },
};

export default LabelPrintModal;
