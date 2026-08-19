/**
 * 补印标签预览 + 打印内联面板（非弹窗 — 渲染在主弹窗底部，避免弹窗嵌套重叠/联动拖动）
 *
 * 2026-08-19：用户反馈"补印预览再弹一个 Modal 会与主弹窗重叠、拖动时一起动"。
 *   改造为内联面板：主弹窗内 `{reprintDetail && <ReprintLabelInline .../>}` 直接展开，
 *   不再嵌套 UnifiedModal。
 *
 * 视觉：与 PrintLabelModal 对齐（QR Code + 完整作物信息 + 3 模板 + 份数控制 + 打印）
 */
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { enhancedApiClient } from '@/lib/apiClient';
import { todayLocal } from '@/lib/dateUtils';

export interface ReprintLabelDetail {
  labelId: number;
  labelNumber: string;
  quantity: number;
  cropName?: string | null;
  cropVariety?: string | null;
  recordCode?: string | null;
  areaName?: string | null;
  plantingDate?: string | null;
  plantingCount?: number;
  currentSurviving?: number;
  supplementCount?: number;
  lossCount?: number;
  sourceModule?: 'planting' | 'seedling' | 'seed_source' | null;
  qrUrl?: string;
  moveInAreaName?: string | null;
  moveOutAreaName?: string | null;
}

export interface ReprintLabelInlineProps {
  /** 源标签详情（父组件传入，可能不完整 → 组件内部兜底请求） */
  sourceDetail: ReprintLabelDetail | null;
  /** 源标签 ID（用于内部兜底请求） */
  sourceLabelId?: number;
  /** 关闭面板（父组件 setReprintDetail(null)） */
  onClose: () => void;
  operatorName?: string;
}

export function ReprintLabelInline({
  sourceDetail,
  sourceLabelId,
  onClose,
  operatorName,
}: ReprintLabelInlineProps) {
  // 模板选择（与 PrintLabelModal 对齐）
  const [template, setTemplate] = useState<'small' | 'large' | 'detail'>('detail');
  // 打印份数（1-50）
  const [copies, setCopies] = useState(1);
  // 待打印列表（用相同标签号重复 N 次）
  const [printLabels, setPrintLabels] = useState<string[]>([]);
  // 触发浏览器打印
  const [triggerPrint, setTriggerPrint] = useState(false);
  // 组件内部自取的 detail（不依赖 props 链）
  const [internalDetail, setInternalDetail] = useState<ReprintLabelDetail | null>(null);

  // 2026-08-19：内部自取 detail（兜底 — 不依赖任何 props 链）
  //   优先级：① sourceDetail 完整（有 cropName）→ 用父组件传
  //           ② sourceDetail 不完整 → 内部 GET /:id/detail 取
  //           ③ 失败 → placeholder
  useEffect(() => {
    const hasCropInfo = sourceDetail && sourceDetail.cropName && sourceDetail.cropName.length > 0;
    if (hasCropInfo) {
      setInternalDetail(null); // 父组件数据完整，清空内部状态
      return;
    }
    const id = sourceLabelId ?? sourceDetail?.labelId ?? 0;
    if (!id) {
      console.warn('[reprint] 内部无法取 detail：sourceLabelId 缺失');
      return;
    }
    (async () => {
      try {
        const res: any = await enhancedApiClient.get(`/plant-labels/${id}/detail`);
        // ⚠️ enhancedApiClient 自动解包 .data，res 直接就是 detail 对象！
        if (res && res.labelNumber) {
          setInternalDetail(res);
          console.log('[reprint] 内部取 detail 成功:', res);
        }
      } catch (e) {
        console.error('[reprint] 内部取 detail 失败:', e);
      }
    })();
  }, [sourceDetail, sourceLabelId]);

  // 触发打印
  useEffect(() => {
    if (!triggerPrint || printLabels.length === 0) return undefined;
    const timer = setTimeout(() => {
      window.print();
      setTriggerPrint(false);
      setPrintLabels([]);
    }, 150);
    return () => clearTimeout(timer);
  }, [triggerPrint, printLabels]);

  // 最终数据（内部自取 > 父组件传 > placeholder）
  const detail: ReprintLabelDetail = internalDetail || sourceDetail || {
    labelId: sourceLabelId || 0,
    labelNumber: '(加载中...)',
    quantity: 1,
  } as ReprintLabelDetail;

  // QR Code 值
  const buildQrValue = (labelNumber: string) => {
    const baseUrl = (detail.qrUrl || window.location.origin).split('?')[0];
    return baseUrl + '?labelNumber=' + encodeURIComponent(labelNumber);
  };
  const currentQrCodeValue = buildQrValue(detail.labelNumber);

  // 操作员
  const operator = operatorName || localStorage.getItem('username') || '系统管理员';

  // 打印：构建 N 份相同标签号列表
  const handlePrint = () => {
    const n = Math.max(1, Math.min(50, copies));
    setPrintLabels(Array.from({ length: n }, () => detail.labelNumber));
    setTriggerPrint(true);
  };

  // 2026-08-19：导出 Excel（格式与标签打印导出一致，用于打印补印标签）
  //   导出内容 = 需要重复打印的标签（copies 份同一标签号，每行一份）
  const handleExportExcel = () => {
    const n = Math.max(1, Math.min(50, copies));
    const baseUrl = (detail.qrUrl || window.location.origin).split('?')[0];
    const rows = Array.from({ length: n }, (_, i) => ({
      index: i + 1,
      label: detail.labelNumber,
      url: `${baseUrl}?labelNumber=${encodeURIComponent(detail.labelNumber)}`,
    }));
    const areaName = detail.areaName || detail.moveOutAreaName || '-';

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>补印标签</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'Microsoft YaHei', sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: 8px 10px; text-align: center; vertical-align: middle; }
  th { background-color: #d97706; color: #fff; font-weight: bold; }
  td a { color: #2563eb; text-decoration: underline; }
  tr:nth-child(even) { background-color: #fffbeb; }
  .print-btn { display: inline-block; margin: 10px; padding: 8px 16px; background: #d97706; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <div class="no-print" style="text-align:center;padding:10px;">
    <button class="print-btn" onclick="window.print()">打印此页</button>
    <span style="color:#666;font-size:12px;">共 ${rows.length} 个标签 | 扫描功能码为URL链接，可用在线工具生成QR码</span>
  </div>
  <table>
    <thead><tr>
      <th>序号</th><th>作物名称</th><th>区域/场地</th>
      <th>扫描功能码</th><th>标签号</th><th>日期</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.index}</td>
      <td>${escapeHtml(detail.cropName || '-')}</td>
      <td>${escapeHtml(areaName)}</td>
      <td><a href="${escapeHtml(r.url)}" target="_blank">${escapeHtml(r.url)}</a></td>
      <td style="font-family:monospace;font-size:11px;">${escapeHtml(r.label)}</td>
      <td>${escapeHtml(detail.plantingDate || '-')}</td>
    </tr>`).join('')}</tbody>
  </table>
</body></html>`;

    const blob = new Blob(['﻿' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `补印标签_${detail.cropName || '标签'}_${todayLocal()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-3 border-t border-amber-200 bg-amber-50/60 flex-shrink-0">
      {/* 顶部控制行 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-900">🖨 补印标签预览</span>
          <span className="text-xs text-gray-600">
            标签号 <span className="font-mono font-semibold text-amber-700">{detail.labelNumber}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 份数 */}
          <span className="text-xs text-gray-600">份数</span>
          <Button variant="outline" size="sm" className="h-6 px-1" onClick={() => setCopies((c) => Math.max(1, c - 1))} disabled={copies <= 1}>-</Button>
          <input
            type="number" min={1} max={50}
            value={copies}
            onChange={(e) => setCopies(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="w-12 px-1 py-0.5 border border-amber-300 rounded text-center text-xs font-semibold text-amber-800"
          />
          <Button variant="outline" size="sm" className="h-6 px-1" onClick={() => setCopies((c) => Math.min(50, c + 1))} disabled={copies >= 50}>+</Button>
          {/* 模板 */}
          {(['small', 'large', 'detail'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTemplate(t)}
              className={`px-2 py-0.5 text-xs rounded border ${
                template === t ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
            >
              {t === 'small' ? '小标签' : t === 'large' ? '大标签' : '详情标签'}
            </button>
          ))}
          <Button variant="default" size="sm" className="h-6 bg-amber-600 hover:bg-amber-700 text-white" onClick={handlePrint} disabled={copies < 1}>
            <Printer className="w-3 h-3" /> 打印 {copies} 份
          </Button>
          {/* 2026-08-19：导出按钮（格式与标签打印导出一致，导出需重复打印的标签数据） */}
          <Button variant="blue" size="sm" className="h-6" onClick={handleExportExcel} disabled={copies < 1}>
            <Download className="w-3 h-3" /> 导出
          </Button>
          <Button variant="secondary" size="sm" className="h-6" onClick={onClose}>
            <X className="w-3 h-3" /> 收起
          </Button>
        </div>
      </div>

      {/* 预览主体（QR + 完整作物信息，与 PrintLabelModal 对齐） */}
      <div className="border-2 border-dashed border-amber-300 rounded-lg p-3 bg-white">
        <div className="flex justify-center">
          {template === 'small' ? (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                <QRCodeSVG value={currentQrCodeValue} size={80} />
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-bold text-gray-900">{detail.labelNumber}</div>
                <div className="text-xs text-gray-600">{detail.cropName || '-'}</div>
              </div>
            </div>
          ) : template === 'large' ? (
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <QRCodeSVG value={currentQrCodeValue} size={100} />
              </div>
              <div className="mt-3 text-center">
                <div className="text-lg font-bold text-gray-900">{detail.labelNumber}</div>
                <div className="text-sm text-gray-600 mt-1">{detail.cropName || '-'} - {detail.cropVariety || '-'}</div>
              </div>
            </div>
          ) : (
            <div className="flex bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
              <div className="flex-shrink-0">
                <QRCodeSVG value={currentQrCodeValue} size={100} />
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-lg font-bold text-gray-900 mb-2">{detail.labelNumber}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-gray-500">作物名称：</div>
                  <div className="text-gray-900 font-medium">{detail.cropName || '-'}</div>
                  <div className="text-gray-500">作物品种：</div>
                  <div className="text-gray-900">{detail.cropVariety || '-'}</div>
                  <div className="text-gray-500">种植区域：</div>
                  <div className="text-gray-900">{detail.areaName || '-'}</div>
                  <div className="text-gray-500">种植批号：</div>
                  <div className="text-gray-900 font-mono text-xs">{detail.recordCode || '-'}</div>
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-gray-500">本标签数量：</div>
                  <div className="text-amber-700 font-bold">{(detail.quantity || 1).toLocaleString()}</div>
                  <div className="text-gray-500">当前存活：</div>
                  <div className="text-emerald-600 font-bold">{(detail.currentSurviving ?? 0).toLocaleString()}</div>
                  <div className="text-gray-500">种植日期：</div>
                  <div className="text-gray-900">{detail.plantingDate || '-'}</div>
                  {detail.moveOutAreaName && (
                    <>
                      <div className="text-gray-500">当前位置：</div>
                      <div className="text-gray-900">{detail.moveOutAreaName}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 打印容器（隐藏，仅打印时显示）— N 份相同标签 */}
      <div className="hidden print-container">
        {printLabels.map((label, i) => (
          <div key={`${label}-${i}`} className="print-label-card">
            <div className="bg-white p-3 border border-gray-400 rounded-lg">
              <QRCodeSVG value={buildQrValue(label)} size={80} />
            </div>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' }}>{label}</div>
              <div style={{ fontSize: 9, color: '#666' }}>{detail.cropName || '-'}</div>
              <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>
                第 {i + 1} / {printLabels.length} 份（共 {printLabels.length} 份）· 补印自 {detail.labelNumber}
              </div>
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
    </div>
  );
}

/** HTML 转义（导出 Excel 用，与标签打印一致） */
function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default ReprintLabelInline;
