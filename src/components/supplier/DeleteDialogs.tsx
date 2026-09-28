// 删除确认对话框组件
// 2026-09-28 样式统一：改用 UnifiedModal 容器（对齐生产领料弹窗标准），
// 底部按钮统一 <Button variant="secondary|destructive" size="sm">
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button, UnifiedModal } from '@/components/ui';

interface DeleteWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export function DeleteWarningDialog({ isOpen, onClose, onConfirm, title = '确认删除' }: DeleteWarningDialogProps) {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {title}
        </span>
      }
      size="sm"
      showFooter={true}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            <Trash2 className="w-4 h-4" /> 确认删除
          </Button>
        </div>
      }
      showMaximize={false}
    >
      <p className="text-gray-600 mb-4">确定要删除选中的供应商吗？此操作不可撤销。</p>
      <ul className="list-disc list-inside text-sm text-gray-500">
        <li>删除后将无法恢复数据</li>
        <li>相关联的业务记录可能会受到影响</li>
      </ul>
    </UnifiedModal>
  );
}

interface BatchDeleteConfirmDialogProps {
  isOpen: boolean;
  count: number;
  supplierNames: string[];
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchDeleteConfirmDialog({ isOpen, count, supplierNames, onClose, onConfirm }: BatchDeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const displayNames = supplierNames.slice(0, 5).join('、');
  const moreCount = supplierNames.length > 5 ? ` 等${count}个` : '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          批量删除确认
        </span>
      }
      size="md"
      showFooter={true}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            <Trash2 className="w-4 h-4" /> 已知晓风险，确认删除
          </Button>
        </div>
      }
      showMaximize={false}
    >
      {/* 删除内容详情 */}
      <div className="text-sm text-gray-600 space-y-3">
        <p>
          确定要删除选中的 <span className="font-bold text-red-600">{count}</span> 个供应商吗？
        </p>
        <div className="p-3 bg-gray-50 rounded-lg text-xs">
          <p className="font-medium text-gray-700 mb-1">选中供应商：</p>
          <p className="text-gray-600">{displayNames}{moreCount}</p>
        </div>

        {/* 数据完整性警告 */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-700 mb-2">⚠ 数据完整性风险提示：</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-red-600">
            <li>删除后将无法恢复供应商基础信息</li>
            <li>关联的采购计划可能缺少供应商来源</li>
            <li>物料的供应商追溯链可能出现断链</li>
            <li>入库记录的供应商字段将失去关联</li>
            <li>财务对账记录中的供应商信息可能受影响</li>
          </ul>
        </div>

        <p className="text-red-500 font-medium">此操作不可撤销！请谨慎操作。</p>
      </div>
    </UnifiedModal>
  );
}
