import { Barcode, Package } from 'lucide-react';
import { Material } from './MaterialFilters';
import { UnifiedModal } from '../ui/UnifiedModal';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface MaterialEditModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void;
}

export function MaterialEditModal({ material, isOpen, onClose, onSave }: MaterialEditModalProps) {
  if (!isOpen || !material) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑物料库存"
      size="xl"
      showFooter={true}
      onSubmit={() => onSave(material)}
      submitText="保存"
      cancelText="取消"
    >
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-600 block font-medium">条形码</span>
            <span className="text-2xl font-mono font-bold text-blue-700">{material.barcode}</span>
          </div>
          <Barcode className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-gray-500 block">物料编码</span>
            <span className="text-sm font-medium text-gray-900">{material.code}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">物料名称</span>
            <span className="text-sm font-medium text-gray-900">{material.name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">物料分类</span>
            <span className="text-sm font-medium text-gray-900">{material.category}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">规格型号</span>
            <span className="text-sm font-medium text-gray-900">{material.specification}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">单位</span>
            <span className="text-sm font-medium text-gray-900">{material.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">当前库存</span>
            <span className="text-sm font-medium text-gray-900">{material.quantity} {material.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">单价</span>
            <span className="text-sm font-medium text-gray-900">{material.price}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">供应商</span>
            <span className="text-sm font-medium text-gray-900">{material.supplier}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 py-4">
        完整编辑功能待实现
      </div>
    </UnifiedModal>
  );
}

interface MaterialDeleteConfirmModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function MaterialDeleteConfirmModal({ material, isOpen, onClose, onConfirm }: MaterialDeleteConfirmModalProps) {
  if (!isOpen || !material) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            删除确认
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-gray-900">警告：删除此物料将造成严重后果！</h4>
              <p className="text-sm text-gray-500 mt-1">
                您正在删除物料：<strong>{material.name}</strong>（{material.code}）
              </p>
              <ul className="text-sm text-red-500 mt-2 space-y-1">
                <li>• 此操作将删除所有相关的入库记录</li>
                <li>• 历史数据将无法恢复</li>
                <li>• 可能导致库存数据错乱</li>
                <li>• 已使用的物料信息将无法追溯</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            此操作不可撤销！请确认是否继续删除？
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button variant="destructive" onClick={onConfirm} className="flex-1">
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
