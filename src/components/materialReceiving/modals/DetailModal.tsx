import React from 'react';
import { UnifiedModal } from '@/components/ui';
import { Label } from '@/components/ui';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Printer } from 'lucide-react';
import type { MaterialReceivingRecord, MaterialItem } from '../../../types/materialReceiving';

interface DetailModalProps {
  isOpen: boolean;
  record: MaterialReceivingRecord;
  onClose: () => void;
  /** 2026-09-26 批次二：审批进度（approvers/records）与操作历史 */
  approval?: Record<string, unknown> | null;
  logs?: Record<string, unknown>[];
  /** 2026-09-27 P0-1：出库执行情况（records/summary/totals） */
  executions?: Record<string, unknown> | null;
}

/** 打印领料单（2026-09-26 批次三：新窗口打印视图；2026-09-26 用户要求操作列与详情弹窗两处可用，故导出复用） */
export function printVoucher(record: MaterialReceivingRecord) {
  const w = window.open('', '_blank', 'width=860,height=640');
  if (!w) return;
  const rows = record.materials.map((m) => `
    <tr>
      <td>${m.materialCode}</td><td>${m.materialName}</td><td>${m.spec || '-'}</td><td>${m.unit}</td>
      <td>${m.requestedQuantity}</td><td>${m.unitPrice.toFixed(2)}</td><td>${((m.requestedQuantity || 0) * (m.unitPrice || 0)).toFixed(2)}</td>
      <td>${m.warehousePosition || '-'}</td>
    </tr>`).join('');
  w.document.write(`<html><head><title>领料单 ${record.code}</title>
    <style>
      body{font-family:'Microsoft YaHei',sans-serif;padding:32px;color:#111}
      h1{font-size:18px;margin:0 0 4px} .meta{color:#555;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border:1px solid #333;padding:6px 8px;text-align:left}
      th{background:#eef2ff} .sign{margin-top:48px;display:flex;justify-content:space-between;font-size:13px}
      .sign div{width:180px;border-top:1px solid #333;padding-top:6px;text-align:center;color:#555}
      @media print{body{padding:12px}}
    </style></head><body>
    <h1>领料单 ${record.code}</h1>
    <div class="meta">申请人：${record.applicant}｜部门：${record.department}｜日期：${record.date}｜仓库：${record.warehouseLocation}｜批次：${(record as any).productionBatchCode || '-'}</div>
    <table><thead><tr><th>物料编码</th><th>物料名称</th><th>规格</th><th>单位</th><th>申领数量</th><th>单价</th><th>小计</th><th>货位</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="sign"><div>领料人签字</div><div>审核人签字</div><div>仓库发放签字</div></div>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

export const DetailModal: React.FC<DetailModalProps> = ({ isOpen, record, onClose, approval, logs, executions }) => {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="领料单详情"
      size="xxl"
      showFooter={false}
      // 2026-09-26 用户要求：打印按钮放弹窗标题栏右上角（headerAction 插槽）
      headerAction={
        <Button variant="secondary" size="sm" onClick={() => printVoucher(record)}>
          <Printer className="w-4 h-4" /> 打印领料单
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-sm text-gray-500">领料单号</Label>
          <p className="font-mono font-semibold text-gray-900">{record.code}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">申请日期</Label>
          <p className="font-semibold text-gray-900">{record.date}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">申请人</Label>
          <p className="font-semibold text-gray-900">{record.applicant}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">部门</Label>
          <p className="font-semibold text-gray-900">{record.department}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">物料种类</Label>
          <p className="font-semibold text-gray-900">{record.materials.length > 0 ? `${record.materials.length}种` : '-'}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">种植区域/用途</Label>
          {/* 2026-08-10：plantArea (JSON 字符串) → plantAreas 数组，chip 展示多选区域 */}
          {record.plantAreas && record.plantAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {record.plantAreas.map((a) => (
                <span
                  key={a.id}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 border rounded-full text-xs ${
                    a.type === 'custom'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                  title={a.type === 'custom' ? a.cropName : `${a.cropName} · ${a.area} · ${a.code}`}
                >
                  {a.type === 'planting' ? '🌱' : a.type === 'seedling' ? '🌿' : '📝'} {a.cropName}{a.type !== 'custom' ? ` · ${a.area}` : ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">-</p>
          )}
        </div>
        <div>
          <Label className="text-sm text-gray-500">审核人</Label>
          <p className="font-semibold text-gray-900">{record.reviewer}</p>
        </div>
        {/* 2026-09-26 批次四：恢复"生产计划批次号"展示 */}
        <div>
          <Label className="text-sm text-gray-500">生产计划批次号</Label>
          <p className="font-semibold text-gray-900">{(record as any).productionBatchCode || '-'}</p>
        </div>
        {/* 2026-09-26 批次四：预计领用日期 + 优先级 */}
        <div>
          <Label className="text-sm text-gray-500">预计领用日期</Label>
          <p className="font-semibold text-gray-900">{(record as any).expectedDate || '-'}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">优先级</Label>
          <p className="font-semibold text-gray-900">{(record as any).priority === 'high' ? '加急' : '普通'}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">状态</Label>
          <p className="font-semibold">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              record.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
              record.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
              record.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
              record.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
              record.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
              'bg-gray-100 text-blue-700'
            }`}>
              {record.status}
            </span>
          </p>
          {record.statusClass === 'rejected' && record.rejectReason && (
            <p className="text-xs text-red-600 mt-1">拒绝原因：{record.rejectReason}</p>
          )}
        </div>
      </div>
      {record.materials.length > 0 && (
        <div className="mt-6">
          <Label className="text-sm text-gray-500 block mb-2">物料明细</Label>
          <Table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <TableHeader className="bg-blue-600">
              <TableRow>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">规格</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">单位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">申领数量</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">当前库存</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">单价(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">小计(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">仓库货位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {record.materials.map((material: MaterialItem, idx: number) => {
                const subtotal = material.requestedQuantity * material.unitPrice;
                const isStockWarning = material.requestedQuantity > material.stockQuantity;
                return (
                  <TableRow key={idx} className="hover:bg-emerald-100">
                    <TableCell className="px-3 py-2 text-sm text-blue-700 font-mono">{material.materialCode}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.materialName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.spec}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.unit}</TableCell>
                    <TableCell className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-700'}`}>{material.requestedQuantity}{isStockWarning && ' (!)'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.stockQuantity}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{subtotal.toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.warehousePosition || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.remark || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 2026-09-27 P0-1：出库执行情况（领了多少/还剩多少） */}
      {executions && Array.isArray((executions as any).summary) && (executions as any).summary.length > 0 && (
        <div className="mt-6">
          <Label className="text-sm text-gray-500 block mb-2">出库执行情况</Label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* 汇总条 */}
            <div className={`px-4 py-2 text-sm flex items-center justify-between ${(executions as any).isFulfilled ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <span className={(executions as any).isFulfilled ? 'text-emerald-800' : 'text-amber-800'}>
                {(executions as any).isFulfilled ? '✓ 已全部出库' : '⚠ 部分出库，尚有剩余未领'}
              </span>
              <span className="text-gray-700">
                已领 <strong>{(executions as any).totals?.dispatched ?? 0}</strong> / 申请 <strong>{(executions as any).totals?.requested ?? 0}</strong>，剩余 <strong className={(executions as any).totals?.remaining > 0 ? 'text-amber-700' : ''}>{(executions as any).totals?.remaining ?? 0}</strong>
                {/* 2026-09-27 审计修复：待发料单量单列（已建单未确认发料，不占用"已领"口径） */}
                {(() => {
                  const pend = ((executions as any).summary as any[]).reduce((s: number, x: any) => s + (Number(x.pendingQuantity) || 0), 0);
                  return pend > 0 ? <span className="ml-2 text-blue-700">（待发料 <strong>{pend}</strong>）</span> : null;
                })()}
              </span>
            </div>
            {/* 逐物料汇总 */}
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">申请量</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">已领量</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">待发料</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">剩余</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {((executions as any).summary as any[]).map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-800">{s.materialName} <span className="text-xs text-gray-400 font-mono">{s.materialCode}</span></td>
                    <td className="px-3 py-2 text-right">{s.requestedQuantity}{s.unit}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{s.dispatchedQuantity}{s.unit}</td>
                    <td className={`px-3 py-2 text-right ${(Number(s.pendingQuantity) || 0) > 0 ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>{(Number(s.pendingQuantity) || 0) > 0 ? `${s.pendingQuantity}${s.unit}` : '-'}</td>
                    <td className={`px-3 py-2 text-right ${s.remainingQuantity > 0 ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>{s.remainingQuantity}{s.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* 出库单明细 */}
            {Array.isArray((executions as any).executions) && (executions as any).executions.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">关联出库单（{(executions as any).executions.length} 张）</p>
                <ul className="space-y-1">
                  {((executions as any).executions as any[]).map((e, i) => (
                    <li key={i} className="text-sm flex items-center gap-3">
                      <span className="w-28 text-gray-500">{e.date}</span>
                      <span className="font-mono text-blue-700">{e.code}</span>
                      <span className="text-gray-600">{e.executeStatus}</span>
                      <span className="text-gray-500">操作人：{e.operator || '-'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2026-09-26 批次二：审批进度 */}
      {approval && (
        <div className="mt-6">
          <Label className="text-sm text-gray-500 block mb-2">审批进度</Label>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm mb-2">
              审批单状态：
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                approval.status === 'approved' ? 'bg-green-100 text-green-700' :
                approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
                approval.status === 'cancelled' ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'
              }`}>
                {approval.status === 'approved' ? '已通过' : approval.status === 'rejected' ? '已拒绝' : approval.status === 'cancelled' ? '已撤回/取消' : '待审批'}
              </span>
            </p>
            {Array.isArray(approval.records) && (approval.records as any[]).length > 0 && (
              <ul className="space-y-2">
                {(approval.records as any[]).map((r, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="w-20 text-gray-500">{String(r.actionTime || '').replace('T', ' ').slice(0, 16)}</span>
                    <span className="font-medium">{r.approverName || '系统'}</span>
                    <span className={r.action === 'approve' ? 'text-green-700' : r.action === 'reject' ? 'text-red-600' : 'text-gray-600'}>
                      {r.action === 'approve' ? '通过' : r.action === 'reject' ? '拒绝' : String(r.action || '')}
                    </span>
                    {r.comment && <span className="text-gray-500">「{r.comment}」</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 2026-09-26 批次二：操作历史（operation_logs 审计） */}
      {Array.isArray(logs) && logs.length > 0 && (
        <div className="mt-6">
          <Label className="text-sm text-gray-500 block mb-2">操作历史</Label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="px-4 py-2 text-sm flex items-center gap-2">
                <span className="w-36 text-gray-400 shrink-0">{String(log.created_at || log.createdAt || '').replace('T', ' ').slice(0, 16)}</span>
                <span className="font-medium shrink-0">{String(log.username || log.userName || '系统')}</span>
                <span className="text-gray-700 truncate" title={String(log.description || '')}>{String(log.description || log.action || '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </UnifiedModal>
  );
};

export default DetailModal;
