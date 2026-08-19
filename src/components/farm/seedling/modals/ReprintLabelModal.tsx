/**
 * 补印标签预览 + 打印弹窗（共享组件）
 *
 * 2026-08-19 重写：完全对齐 PrintLabelModal 的视觉风格
 *   - 同样的 3 模板：小标签 / 大标签 / 详情标签
 *   - 同样的 QR + 完整作物信息布局
 *   - 同样的打印容器 + @media print 样式
 *   - 新增：份数控制（补印独有，1-50 份相同标签号）
 *
 * 业务场景（与 PrintLabelModal 区分）：
 *   - PrintLabelModal：批量生成新标签号 + 同步入库 + 打印（首次生成场景）
 *   - ReprintLabelModal：基于已有标签重打 N 份相同副本（丢失/污损补救场景，DB 不入库新行）
 */
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';
import { UnifiedModal, Button } from '@/components/ui';
import { enhancedApiClient } from '@/lib/apiClient';

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

export interface ReprintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDetail: ReprintLabelDetail | null;
  /** 2026-08-19：源标签 ID — 用于 modal 内部兜底请求（不依赖 props 链） */
  sourceLabelId?: number;
  operatorName?: string;
}

export function ReprintLabelModal({
  isOpen,
  onClose,
  sourceDetail,
  sourceLabelId,
  operatorName,
}: ReprintLabelModalProps) {
  // 模板选择（与 PrintLabelModal 对齐）
  const [template, setTemplate] = useState<'small' | 'large' | 'detail'>('detail');
  // 打印份数（1-50）
  const [copies, setCopies] = useState(1);
  // 待打印列表（用相同标签号重复 N 次）
  const [printLabels, setPrintLabels] = useState<string[]>([]);
  // 触发浏览器打印
  const [triggerPrint, setTriggerPrint] = useState(false);
  // 2026-08-19：modal 内部自取的 detail（不依赖 props 链）
  const [internalDetail, setInternalDetail] = useState<ReprintLabelDetail | null>(null);

  // 重置份数（每次打开弹窗）
  useEffect(() => {
    if (isOpen) setCopies(1);
  }, [isOpen]);

  // 2026-08-19：modal 内部自取 detail（终极兜底 — 不依赖任何 props 链）
  //   优先级：
  //     ① sourceDetail 完整（有 cropName）→ 用父组件传
  //     ② sourceDetail 不完整（无 cropName）→ modal 内部 GET /:id/detail 取
  //     ③ 失败 → placeholder
  //   ⚠️ 关键：用 cropName 判定完整性，不要用 labelNumber！
  //   父组件传的 placeholder 也有 labelNumber='(加载失败)'，用 labelNumber.length 会误判
  useEffect(() => {
    const hasCropInfo = sourceDetail && sourceDetail.cropName && sourceDetail.cropName.length > 0;
    if (!isOpen) return;
    if (hasCropInfo) {
      setInternalDetail(null); // 父组件数据完整（含 cropName），清空内部状态
      return;
    }
    // 父组件数据不完整（兜底路径）
    const id = sourceLabelId ?? sourceDetail?.labelId ?? 0;
    if (!id) {
      console.warn('[reprint] modal 内部无法取 detail：sourceLabelId 缺失');
      return;
    }
    console.log('[reprint] modal 内部触发兜底请求, id=' + id);
    (async () => {
      try {
        const res: any = await enhancedApiClient.get(`/plant-labels/${id}/detail`);
        // ⚠️ enhancedApiClient 自动解包 .data，res 直接就是 detail 对象！
        //   不要用 res?.data（那是 undefined）
        if (res && res.labelNumber) {
          setInternalDetail(res);
          console.log('[reprint] modal 内部取 detail 成功:', res);
        } else {
          console.warn('[reprint] modal 内部取 detail 响应无 labelNumber:', res);
        }
      } catch (e) {
        console.error('[reprint] modal 内部取 detail 失败:', e);
      }
    })();
  }, [isOpen, sourceDetail, sourceLabelId]);

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

  // 2026-08-19：使用兜底数据（内部自取 > 父组件传 > placeholder）
  //   placeholder 文本动态显示当前状态（加载中 / 加载失败）
  const detail: ReprintLabelDetail = internalDetail || sourceDetail || {
    labelId: sourceLabelId || 0,
    labelNumber: internalDetail === null ? '(加载中...)' : '(加载失败，请重试)',
    quantity: 1,
  } as ReprintLabelDetail;

  // QR Code 值（每次打印用对应的标签号）
  const buildQrValue = (labelNumber: string) => {
    const baseUrl = (detail.qrUrl || window.location.origin).split('?')[0];
    return baseUrl + '?labelNumber=' + encodeURIComponent(labelNumber);
  };

  // 当前预览的标签号（同一标签号，QR 一致）
  const currentQrCodeValue = buildQrValue(detail.labelNumber);

  // 操作员
  const operator = operatorName || localStorage.getItem('username') || '系统管理员';

  // 处理打印：构建 N 份相同标签号列表
  const handlePrint = () => {
    const n = Math.max(1, Math.min(50, copies));
    const labels = Array.from({ length: n }, () => detail.labelNumber);
    setPrintLabels(labels);
    setTriggerPrint(true);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`补印标签预览与打印${sourceLabelId ? ` · #${sourceLabelId}` : sourceDetail?.labelId ? ` · #${sourceDetail.labelId}` : ''}`}
      size="xl"
      height={680}
      showFooter={true}
      footer={
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            标签号 <span className="font-mono font-semibold text-amber-700">{detail.labelNumber}</span>
            ，将打印 <span className="font-semibold text-amber-700">{copies}</span> 份
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              <X className="w-4 h-4" /> 关闭
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} disabled={copies < 1} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Printer className="w-4 h-4" /> 打印 {copies} 份
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 2026-08-19：调试信息（帮助排查数据流问题） */}
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 text-xs">
          <div className="font-semibold text-blue-900 mb-1">🔍 数据状态（调试）</div>
          <div className="text-blue-800 grid grid-cols-2 gap-x-4 gap-y-0.5">
            <div>sourceLabelId: <span className="font-mono">{sourceLabelId ?? '无'}</span></div>
            <div>sourceDetail.labelId: <span className="font-mono">{sourceDetail?.labelId ?? '无'}</span></div>
            <div>父组件 detail: <span className="font-mono">{sourceDetail ? (sourceDetail.cropName ? `✅ 完整 (${sourceDetail.cropName})` : '⚠️ 无字段') : '❌ 未传'}</span></div>
            <div>modal 内部 detail: <span className="font-mono">{internalDetail ? (internalDetail.cropName ? `✅ 已加载 (${internalDetail.cropName})` : '⚠️ 无字段') : '⏳ 未加载'}</span></div>
            <div>最终使用: <span className="font-mono">{detail.cropName ? `✅ ${detail.cropName}` : '⚠️ placeholder'}</span></div>
          </div>
        </div>

        {/* 补印说明 */}
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-xs">
          <div className="font-semibold text-amber-900 mb-1">📋 补印说明</div>
          <div className="text-amber-800">
            补印 = 重打 N 份<strong className="font-semibold">同一标签号 {detail.labelNumber}</strong> 的实物副本（标签丢失/污损/需要多份时使用）。
            DB 不创建新标签记录，只记录打印历史。
          </div>
        </div>

        {/* 份数选择 + 模板选择（与 PrintLabelModal 对齐） */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-amber-900 mb-1">打印份数（1-50）</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCopies((c) => Math.max(1, c - 1))} disabled={copies <= 1}>-</Button>
              <input
                type="number"
                min={1}
                max={50}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                className="w-16 px-2 py-1 border border-amber-300 rounded text-center text-sm font-semibold text-amber-800"
              />
              <Button variant="outline" size="sm" onClick={() => setCopies((c) => Math.min(50, c + 1))} disabled={copies >= 50}>+</Button>
              <div className="flex gap-1 ml-2">
                {[1, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCopies(n)}
                    className="px-2 py-0.5 text-xs rounded border border-amber-300 bg-white hover:bg-amber-100 transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-amber-900 mb-1">模板选择</div>
            <div className="flex gap-1">
              {(['small', 'large', 'detail'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemplate(t)}
                  className={`px-3 py-1 text-xs rounded border ${
                    template === t
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {t === 'small' ? '小标签' : t === 'large' ? '大标签' : '详情标签'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 操作人员 + 来源信息 */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-600">操作人员</div>
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">{operator}</div>
          </div>
          <div>
            <div className="text-gray-600">补印来源</div>
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 space-y-0.5">
              <div>标签号：<span className="font-mono">{detail.labelNumber}</span></div>
              <div>补印份数：<span className="font-semibold text-amber-700">{copies} 个</span></div>
            </div>
          </div>
        </div>

        {/* 标签预览 — 3 模板（与 PrintLabelModal 样式完全一致） */}
        <div className="border-2 border-dashed border-amber-400 rounded-lg p-4 bg-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-900">标签预览 - {detail.labelNumber}</span>
            <span className="text-xs text-amber-700">将打印 {copies} 份相同标签</span>
          </div>
          <div className="flex justify-center">
            {/* 小标签模板 */}
            {template === 'small' && (
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={80} />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{detail.labelNumber}</div>
                  <div className="text-xs text-gray-600">{detail.cropName || '-'}</div>
                </div>
              </div>
            )}
            {/* 大标签模板 */}
            {template === 'large' && (
              <div className="flex flex-col items-center print-label">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <QRCodeSVG value={currentQrCodeValue} size={100} />
                </div>
                <div className="mt-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{detail.labelNumber}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {detail.cropName || '-'} - {detail.cropVariety || '-'}
                  </div>
                </div>
              </div>
            )}
            {/* 详情标签模板 — 与 PrintLabelModal 的详情模板完全一致 */}
            {template === 'detail' && (
              <div className="flex print-label bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
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
      </div>

      {/* 打印容器（隐藏，仅打印时显示）— N 份相同标签（与 PrintLabelModal 风格一致） */}
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
    </UnifiedModal>
  );
}

export default ReprintLabelModal;
