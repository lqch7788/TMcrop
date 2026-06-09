// 删除确认对话框组件
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface DeleteWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export function DeleteWarningDialog({ isOpen, onClose, onConfirm, title = '确认删除' }: DeleteWarningDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
        <div className="p-4">
          <p className="text-gray-600 mb-4">确定要删除选中的供应商吗？此操作不可撤销。</p>
          <ul className="list-disc list-inside text-sm text-gray-500 mb-4">
            <li>删除后将无法恢复数据</li>
            <li>相关联的业务记录可能会受到影响</li>
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              <X className="w-4 h-4" /> 取消
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              <Trash2 className="w-4 h-4" /> 确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[460px] shadow-xl">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">批量删除确认</h3>
        </div>

        {/* 删除内容详情 */}
        <div className="text-sm text-gray-600 space-y-3 mb-6">
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

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={onConfirm}>
            <Trash2 className="w-4 h-4" /> 已知晓风险，确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
