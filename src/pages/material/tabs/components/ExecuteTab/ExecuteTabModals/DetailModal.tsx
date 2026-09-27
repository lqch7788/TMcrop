// ExecuteTabDetailModal 组件
// 领料出库详情弹窗
import { useEffect, useState } from 'react';
import { X, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { enhancedApiClient } from '@/lib/apiClient';

/**
 * 打印出库单（2026-09-27：用户反馈操作列缺打印功能）
 * 仓库发料凭证：单号 + 基本信息 + 物料明细 + 三方签字区
 */
export function printExecuteVoucher(record: any) {
  const w = window.open('', '_blank', 'width=860,height=640');
  if (!w) return;
  const mats = (record.materials || []) as any[];
  const rows = mats.map((m) => {
    const subtotal = ((Number(m.actualQuantity) || 0) * (Number(m.unitPrice) || 0)).toFixed(2);
    return `<tr>
      <td>${m.materialCode || ''}</td><td>${m.materialName || ''}</td><td>${m.spec || '-'}</td>
      <td>${m.batchNo || '-'}</td><td>${m.unit || ''}</td>
      <td style="text-align:right">${m.requestedQuantity ?? ''}</td>
      <td style="text-align:right">${m.actualQuantity ?? ''}</td>
      <td style="text-align:right">${(Number(m.unitPrice) || 0).toFixed(2)}</td>
      <td style="text-align:right">${subtotal}</td>
      <td>${m.remark || ''}</td>
    </tr>`;
  }).join('');
  const sourceCodes = Array.isArray(record.sourceApplicationCodes) ? record.sourceApplicationCodes.join('、') : '-';
  w.document.write(`<html><head><title>出库单 ${record.code || ''}</title>
    <style>
      body{font-family:'Microsoft YaHei',sans-serif;padding:32px;color:#111}
      h1{font-size:18px;margin:0 0 4px} .meta{color:#555;font-size:13px;margin-bottom:16px;line-height:1.8}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border:1px solid #333;padding:6px 8px;text-align:left}
      th{background:#eef2ff} .sign{margin-top:48px;display:flex;justify-content:space-between;font-size:13px}
      .sign div{width:180px;border-top:1px solid #333;padding-top:6px;text-align:center;color:#555}
      @media print{body{padding:12px}}
    </style></head><body>
    <h1>领料出库单 ${record.code || ''}</h1>
    <div class="meta">
      出库日期：${record.date || '-'}｜申领人：${record.applicant || '-'}｜库存地点：${record.warehouseLocation || '-'}<br/>
      审核人：${record.reviewer || '-'}｜操作人（发料）：${record.operator || '-'}｜来源申请单：${sourceCodes}<br/>
      执行状态：${record.executeStatus || '-'}
    </div>
    <table><thead><tr>
      <th>物料编码</th><th>物料名称</th><th>规格</th><th>批次号</th><th>单位</th>
      <th style="text-align:right">申请数量</th><th style="text-align:right">实发数量</th>
      <th style="text-align:right">单价</th><th style="text-align:right">小计</th><th>备注</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="sign"><div>发料人签字</div><div>领料人签字</div><div>仓管员签字</div></div>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

interface ExecuteDetailModalProps {
  // 弹窗状态
  isOpen: boolean;
  record: any;
  /** 2026-09-27 能力对齐：来源申请单的出库执行情况（已领/申请/剩余） */
  sourceExecutions?: Record<string, unknown>[] | null;

  // 回调函数
  onClose: () => void;
}

export function ExecuteDetailModal({
  isOpen,
  record,
  onClose,
  sourceExecutions,
}: ExecuteDetailModalProps) {
  // 2026-09-27 审计修复：操作历史（此前出库单无操作轨迹入口）
  const [execLogs, setExecLogs] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    if (!isOpen || !record?.id) { setExecLogs([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await enhancedApiClient.get<Array<Record<string, unknown>>>(`/material-executes/${record.id}/logs`);
        if (!cancelled) setExecLogs(Array.isArray(res) ? res : []);
      } catch {
        if (!cancelled) setExecLogs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, record?.id]);

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* 头部（2026-09-27：标题栏加打印按钮） */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">出库单详情</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => printExecuteVoucher(record)}
            >
              <Printer className="w-4 h-4" /> 打印出库单
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/20 text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* 基本信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-sm text-gray-500 mb-0">出库单号</Label>
              <p className="font-mono font-semibold text-gray-900">{record.code}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">申请日期</Label>
              <p className="font-semibold text-gray-900">{record.date}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">执行状态</Label>
              <p className="font-semibold">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  record.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                  record.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {record.executeStatus}
                </span>
              </p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">申请人</Label>
              <p className="font-semibold text-gray-900">{record.applicant}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">库存地点</Label>
              <p className="font-semibold text-gray-900">{record.warehouseLocation}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">审核人</Label>
              <p className="font-semibold text-gray-900">{record.reviewer}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">操作人</Label>
              <p className="font-semibold text-gray-900">{record.operator || '-'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">来源申请单</Label>
              <p className="font-semibold text-gray-900">
                {record.sourceApplicationCodes?.length > 0
                  ? record.sourceApplicationCodes.join(', ')
                  : '-'}
              </p>
            </div>
          </div>

          {/* 物料明细 */}
          <div className="mb-6">
            <Label className="text-sm text-gray-500 block mb-2">物料明细</Label>
            {record.materials && record.materials.length > 0 ? (
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-emerald-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">批次号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实际库存</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {record.materials.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-emerald-50">
                      <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.applicationCode}</td>
                      <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.materialCode}</td>
                      <td className="px-3 py-2 text-sm text-blue-700">{m.materialName}</td>
                      <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.batchNo || ''}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.spec || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.unit}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.requestedQuantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.stockQuantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.actualQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">暂无物料明细</div>
            )}
          </div>

          {/* 2026-09-27 能力对齐：来源申请单执行情况（这张出库单对应的申请单还剩多少没领） */}
          {Array.isArray(sourceExecutions) && sourceExecutions.length > 0 && (
            <div className="mb-6">
              <Label className="text-sm text-gray-500 block mb-2">来源申请单执行情况</Label>
              {sourceExecutions.map((src: any, si: number) => (
                <div key={si} className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
                  <div className={`px-4 py-2 text-sm flex items-center justify-between ${src.isFulfilled ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    <span className="font-mono text-blue-700">{src.requestCode || src.id || '-'}</span>
                    <span className={src.isFulfilled ? 'text-emerald-800' : 'text-amber-800'}>
                      已领 <strong>{src.totals?.dispatched ?? 0}</strong> / 申请 <strong>{src.totals?.requested ?? 0}</strong>
                      {!src.isFulfilled && <>，尚余 <strong>{src.totals?.remaining ?? 0}</strong> 未领</>}
                      {src.isFulfilled && ' ✓ 已领齐'}
                      {/* 2026-09-27 审计修复：待发料量单列（已建单未确认发料） */}
                      {(() => {
                        const pend = (src.summary as any[] || []).reduce((acc: number, x: any) => acc + (Number(x.pendingQuantity) || 0), 0);
                        return pend > 0 ? <span className="ml-2 text-blue-700">（待发料 <strong>{pend}</strong>）</span> : null;
                      })()}
                    </span>
                  </div>
                  {Array.isArray(src.summary) && src.summary.length > 0 && (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600">物料</th>
                          <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600">申请量</th>
                          <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600">已领量</th>
                          <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600">剩余</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {src.summary.map((s: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-gray-800">{s.materialName} <span className="text-xs text-gray-400 font-mono">{s.materialCode}</span></td>
                            <td className="px-3 py-1.5 text-right">{s.requestedQuantity}{s.unit}</td>
                            <td className="px-3 py-1.5 text-right text-emerald-700">{s.dispatchedQuantity}{s.unit}</td>
                            <td className={`px-3 py-1.5 text-right ${s.remainingQuantity > 0 ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>{s.remainingQuantity}{s.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 2026-09-27 审计修复：操作历史（谁建的/谁确认发料/谁改过） */}
          <div className="mb-6">
            <Label className="text-sm text-gray-500 block mb-2">操作历史</Label>
            {execLogs.length > 0 ? (
              <ul className="space-y-1 border border-gray-200 rounded-lg p-3 bg-gray-50">
                {execLogs.map((l, i) => (
                  <li key={i} className="text-sm flex items-center gap-3">
                    <span className="w-40 text-gray-500 shrink-0">{String(l.createdAt || l.created_at || '').slice(0, 19).replace('T', ' ')}</span>
                    <span className="w-24 text-gray-700 shrink-0">{String(l.username || '-')}</span>
                    <span className="text-gray-600 truncate" title={String(l.description || '')}>{String(l.description || '')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-gray-200">暂无操作记录</div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={onClose}>
              <X className="w-4 h-4" /> 关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
