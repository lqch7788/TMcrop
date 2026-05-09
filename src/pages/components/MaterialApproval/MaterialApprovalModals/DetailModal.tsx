// DetailModal 组件
// 物料审批详情弹窗
import { X } from 'lucide-react';
import { Approval, ApprovalStatus } from '@/types/approval';
import { CheckCircle, XCircle } from 'lucide-react';

interface DetailModalProps {
  // 弹窗状态
  show: boolean;
  item: Approval | null;

  // Tab类型
  activeTab: 'material' | 'return' | 'purchase';

  // 回调函数
  onClose: () => void;
  onApprove: (item: Approval) => void;
  onRejectClick: (item: Approval) => void;

  // 辅助函数
  getStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getCategoryByCode: (code: string) => string;
}

export function DetailModal({
  show,
  item,
  activeTab,
  onClose,
  onApprove,
  onRejectClick,
  getStatusBadge,
  getCategoryByCode,
}: DetailModalProps) {
  if (!show || !item) return null;

  const canApprove = item.status === ApprovalStatus.PENDING;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600">
          <h3 className="text-lg font-semibold text-white">
            {activeTab === 'return' ? '退料' : activeTab === 'purchase' ? '采购' : '领料'}单详情
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* 基本信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-500">单号</label>
              <p className="font-mono font-semibold text-gray-900">{item.code}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">申请日期</label>
              <p className="font-semibold text-gray-900">{item.applyDate}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">状态</label>
              <p className="font-semibold">{getStatusBadge(item.status)}</p>
              {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  拒绝原因：{item.records[item.records.length - 1]?.comment || '-'}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">申请人</label>
              <p className="font-semibold text-gray-900">{item.applicantName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">部门</label>
              <p className="font-semibold text-gray-900">{item.applicantDepartment}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">审核人</label>
              <p className="font-semibold text-gray-900">{item.approvers?.[0]?.userName || '-'}</p>
            </div>
            {activeTab === 'material' && item.businessLink && (
              <>
                <div>
                  <label className="text-sm text-gray-500">库存地点</label>
                  <p className="font-semibold text-gray-900">{item.businessLink.warehouseLocation || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">生产计划批次号</label>
                  <p className="font-semibold text-gray-900">{item.businessLink.batchCode || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">物料种类</label>
                  <p className="font-semibold text-gray-900">
                    {item.materials?.length > 0 ? `${item.materials.length}种` : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">种植区域/用途</label>
                  <p className="font-semibold text-gray-900">{item.businessLink?.plantArea || '-'}</p>
                </div>
              </>
            )}
          </div>

          {/* 描述/说明 */}
          {item.description && (
            <div className="mb-6">
              <label className="text-sm text-gray-500 block mb-1">申请说明</label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{item.description}</p>
            </div>
          )}

          {/* 物料明细 */}
          <div className="mb-6">
            <label className="text-sm text-gray-500 block mb-2">
              {activeTab === 'return' ? '退料' : activeTab === 'purchase' ? '采购' : '领料'}物料明细
            </label>
            {item.materials && item.materials.length > 0 ? (
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-emerald-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料分类</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">数量</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">已批数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {item.materials.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-emerald-50">
                      <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.materialCode}</td>
                      <td className="px-3 py-2 text-sm text-blue-700">{m.materialName}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{getCategoryByCode(m.materialCode)}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.spec || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.unit}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.requestedQuantity || m.returnQuantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.approvedQuantity || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">暂无物料明细</div>
            )}
          </div>

          {/* 审批记录 */}
          {item.records && item.records.length > 0 && (
            <div className="mb-6">
              <label className="text-sm text-gray-500 block mb-2">审批记录</label>
              <div className="space-y-2">
                {item.records.map((r: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">{r.approverName}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        r.action === 'approve' ? 'bg-emerald-100 text-emerald-700' :
                        r.action === 'reject' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {r.action === 'approve' ? '通过' : r.action === 'reject' ? '拒绝' : '部分通过'}
                      </span>
                    </div>
                    {r.comment && <p className="text-gray-600 mt-1">原因：{r.comment}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.actionTime).toLocaleString('zh-CN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
            {canApprove && (
              <>
                <button
                  onClick={() => onApprove(item)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  通过
                </button>
                <button
                  onClick={() => onRejectClick(item)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  拒绝
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
