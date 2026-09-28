import { ReturnRecord, STATUS_STYLE_MAP } from '../types';
import { UnifiedModal, Button } from '@/components/ui';
import { Printer } from 'lucide-react';

/** HTML 转义（打印视图内防止物料名/备注含标记字符破坏文档结构） */
function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 打印退料单（参照生产领料 printVoucher 实现：新窗口打印视图 + 自动调起打印）
 * 2026-09-28 新增：表格操作列与详情弹窗标题栏两处均可触发
 */
export function printReturnVoucher(record: ReturnRecord) {
  const w = window.open('', '_blank', 'width=860,height=640');
  if (!w) return;
  const materials = Array.isArray(record.materials) ? record.materials : [];
  const rows = materials.map((m) => `
    <tr>
      <td>${escapeHtml(m.materialCode)}</td><td>${escapeHtml(m.materialName)}</td><td>${escapeHtml(m.spec || '-')}</td><td>${escapeHtml(m.unit)}</td>
      <td>${Number(m.returnQuantity) || 0}</td><td>${(Number(m.unitPrice) || 0).toFixed(2)}</td>
      <td>${((Number(m.returnQuantity) || 0) * (Number(m.unitPrice) || 0)).toFixed(2)}</td>
      <td>${escapeHtml(m.warehousePosition || '-')}</td>
    </tr>`).join('');
  const totalQty = materials.reduce((s, m) => s + (Number(m.returnQuantity) || 0), 0);
  const totalAmount = materials.reduce(
    (s, m) => s + (Number(m.returnQuantity) || 0) * (Number(m.unitPrice) || 0), 0
  );
  w.document.write(`<html><head><title>退料单 ${escapeHtml(record.code)}</title>
    <style>
      body{font-family:'Microsoft YaHei',sans-serif;padding:32px;color:#111}
      h1{font-size:18px;margin:0 0 4px} .meta{color:#555;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border:1px solid #333;padding:6px 8px;text-align:left}
      th{background:#eef2ff} tfoot td{font-weight:600;background:#f8fafc}
      .sign{margin-top:48px;display:flex;justify-content:space-between;font-size:13px}
      .sign div{width:180px;border-top:1px solid #333;padding-top:6px;text-align:center;color:#555}
      @media print{body{padding:12px}}
    </style></head><body>
    <h1>退料单 ${escapeHtml(record.code)}</h1>
    <div class="meta">申请人：${escapeHtml(record.applicant)}｜部门：${escapeHtml(record.department)}｜日期：${escapeHtml(record.date)}｜仓库：${escapeHtml(record.warehouseLocation)}｜退料类型：${escapeHtml(record.type)}</div>
    <table><thead><tr><th>物料编码</th><th>物料名称</th><th>规格</th><th>单位</th><th>退料数量</th><th>单价</th><th>小计</th><th>货位</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4">合计</td><td>${totalQty}</td><td></td><td>${totalAmount.toFixed(2)}</td><td></td></tr></tfoot></table>
    <div class="sign"><div>退料人签字</div><div>审核人签字</div><div>仓库接收签字</div></div>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

interface DetailModalProps {
  record: ReturnRecord | null;
  open: boolean;
  onClose: () => void;
}

export function DetailModal({ record, open, onClose }: DetailModalProps) {
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="退料单详情"
      size="lg"
      // 2026-09-28：打印入口放标题栏右上角（与领料详情弹窗一致）
      headerAction={
        <Button variant="secondary" size="sm" onClick={() => printReturnVoucher(record)}>
          <Printer className="w-4 h-4" /> 打印退料单
        </Button>
      }
    >
      {/* 基本信息 - 紧凑排布，每行3个 */}
      <div className="bg-gray-100 rounded-lg p-3">
        <div className="grid grid-cols-3 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">退料单号：</span>
            <span className="font-mono font-medium text-gray-900">{record.code}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">退料日期：</span>
            <span className="font-medium text-gray-900">{record.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">退料类型：</span>
            <span className="font-medium text-gray-900">{record.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">申请人：</span>
            <span className="font-medium text-gray-900">{record.applicant}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">退料部门：</span>
            <span className="font-medium text-gray-900">{record.department}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">仓库位置：</span>
            <span className="font-medium text-gray-900">{record.warehouseLocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">审批状态：</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE_MAP[record.statusClass]?.bg || 'bg-gray-100'} ${STATUS_STYLE_MAP[record.statusClass]?.text || 'text-gray-700'}`}>
              {record.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">操作人：</span>
            <span className="font-medium text-gray-900">{record.operator}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">审核人：</span>
            <span className="font-medium text-gray-900">{record.reviewer}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">审核日期：</span>
            <span className="font-medium text-gray-900">{record.reviewDate || '-'}</span>
          </div>
          {record.rejectReason && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20">驳回原因：</span>
              <span className="font-medium text-red-600">{record.rejectReason}</span>
            </div>
          )}
          {record.remark && (
            <div className="flex items-center gap-2 col-span-3">
              <span className="text-gray-500 w-20">备注：</span>
              <span className="font-medium text-gray-900">{record.remark}</span>
            </div>
          )}
        </div>
      </div>

      {/* 物料明细 - 重点展示 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">物料明细</label>
          <span className="text-xs text-gray-500">共 {record.materials.length} 条</span>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-auto max-h-[360px]">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-emerald-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">来源领料单号</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">物料编码</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">物料分类</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">物料名称</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">规格</th>
                  <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">单位</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">退料数量</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">单价</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">小计</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">仓库货位</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">退料原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {record.materials.map((material, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/50">
                    <td className="px-3 py-2 text-sm text-gray-700 font-mono whitespace-nowrap">{material.sourceApplicationCode}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 font-mono whitespace-nowrap">{material.materialCode}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{material.category}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{material.materialName}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{material.spec}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-center whitespace-nowrap">{material.unit}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right whitespace-nowrap">{material.returnQuantity}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right whitespace-nowrap">{material.unitPrice}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right font-medium whitespace-nowrap">{material.returnQuantity * material.unitPrice}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{material.warehousePosition}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{material.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
