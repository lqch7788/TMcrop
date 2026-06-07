// DetailModal 组件
// 物料审批详情弹窗
import { Approval, ApprovalStatus } from '@/types/approval';
import { CheckCircle, XCircle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

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
  const canApprove = item?.status === ApprovalStatus.PENDING;

  return (
    <UnifiedModal
      isOpen={show && !!item}
      onClose={onClose}
      title={`${activeTab === 'return' ? '退料' : activeTab === 'purchase' ? '采购' : '领料'}单详情`}
      size="xl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          {canApprove && (
            <>
              <Button
                variant="default"
                onClick={() => item && onApprove(item)}
              >
                通过
              </Button>
              <Button
                variant="destructive"
                onClick={() => item && onRejectClick(item)}
              >
                拒绝
              </Button>
            </>
          )}
        </div>
      }
    >
      {item && (
      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <Label className="text-gray-500">单号</Label>
            <p className="font-mono font-semibold text-gray-900">{item.code}</p>
          </div>
          <div>
            <Label className="text-gray-500">申请日期</Label>
            <p className="font-semibold text-gray-900">{item.applyDate}</p>
          </div>
          <div>
            <Label className="text-gray-500">状态</Label>
            <p className="font-semibold">{getStatusBadge(item.status)}</p>
            {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
              <p className="text-xs text-red-600 mt-1">
                拒绝原因：{item.records[item.records.length - 1]?.comment || '-'}
              </p>
            )}
          </div>
          <div>
            <Label className="text-gray-500">申请人</Label>
            <p className="font-semibold text-gray-900">{item.applicantName}</p>
          </div>
          <div>
            <Label className="text-gray-500">部门</Label>
            <p className="font-semibold text-gray-900">{item.applicantDepartment}</p>
          </div>
          <div>
            <Label className="text-gray-500">审核人</Label>
            <p className="font-semibold text-gray-900">{item.approvers?.[0]?.userName || '-'}</p>
          </div>
          {activeTab === 'material' && item.businessLink && (
            <>
              <div>
                <Label className="text-gray-500">库存地点</Label>
                <p className="font-semibold text-gray-900">{item.businessLink.warehouseLocation || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500">生产计划批次号</Label>
                <p className="font-semibold text-gray-900">{item.businessLink.batchCode || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500">物料种类</Label>
                <p className="font-semibold text-gray-900">
                  {item.materials?.length > 0 ? `${item.materials.length}种` : '-'}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">种植区域/用途</Label>
                <p className="font-semibold text-gray-900">{item.businessLink?.plantArea || '-'}</p>
              </div>
            </>
          )}
        </div>

        {/* 描述/说明 */}
        {item.description && (
          <div className="mb-6">
            <Label className="text-gray-500 block mb-1">申请说明</Label>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{item.description}</p>
          </div>
        )}

        {/* 物料明细 */}
        <div className="mb-6">
          <Label className="text-gray-500 block mb-2">
            {activeTab === 'return' ? '退料' : activeTab === 'purchase' ? '采购' : '领料'}物料明细
          </Label>
          {item.materials && item.materials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物料编码</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>物料分类</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>已批数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.materials.map((m: any, idx: number) => (
                  <TableRow key={idx} className="hover:bg-emerald-50">
                    <TableCell className="text-blue-700 font-mono">{m.materialCode}</TableCell>
                    <TableCell className="text-blue-700">{m.materialName}</TableCell>
                    <TableCell className="text-gray-600">{getCategoryByCode(m.materialCode)}</TableCell>
                    <TableCell className="text-gray-600">{m.spec || '-'}</TableCell>
                    <TableCell className="text-gray-600">{m.unit}</TableCell>
                    <TableCell className="text-gray-600">{m.requestedQuantity || m.returnQuantity}</TableCell>
                    <TableCell className="text-gray-600">{m.approvedQuantity || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">暂无物料明细</div>
          )}
        </div>

        {/* 审批记录 */}
        {item.records && item.records.length > 0 && (
          <div className="mb-6">
            <Label className="text-gray-500 block mb-2">审批记录</Label>
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
      </div>
      )}
    </UnifiedModal>
  );
}
