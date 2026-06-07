import { ReturnRecord, STATUS_STYLE_MAP } from '../types';
import { UnifiedModal } from '@/components/ui';

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
