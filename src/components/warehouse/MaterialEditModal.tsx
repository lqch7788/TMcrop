import { useState, useEffect } from 'react';
import { Barcode, Package, Trash2, X } from 'lucide-react';
import { Material } from './MaterialFilters';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Label } from '@/components/ui';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface MaterialEditModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void;
}

export function MaterialEditModal({ material, isOpen, onClose, onSave }: MaterialEditModalProps) {
  // 本地编辑表单状态
  const [form, setForm] = useState<Material | null>(null);

  useEffect(() => {
    if (material) setForm({ ...material });
  }, [material]);

  if (!isOpen || !material || !form) return null;

  const handleChange = (field: keyof Material, value: string | number) => {
    setForm(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSubmit = () => {
    if (form) onSave(form);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑物料库存"
      size="xl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      {/* 条形码标识 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-600 block font-medium">条形码</span>
            <span className="text-2xl font-mono font-bold text-blue-700">{material.barcode}</span>
          </div>
          <Barcode className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      {/* 只读信息 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
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
            <span className="text-xs text-gray-500 block">最后更新</span>
            <span className="text-sm font-medium text-gray-900">{material.lastUpdateTime || '-'}</span>
          </div>
        </div>
      </div>

      {/* 可编辑字段 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* 当前库存 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">当前库存</Label>
          <NumberInput
            value={form.quantity}
            onChange={(val) => handleChange('quantity', parseFloat(val) || 0)}
            decimals={2}
            className="h-8 px-2"
          />
        </div>

        {/* 单位 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">单位</Label>
          <Input
            type="text"
            value={form.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className={deepInputClass.replace('py-3', 'py-1.5').replace('text-sm', 'text-sm')}
          />
        </div>

        {/* 规格型号 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">规格型号</Label>
          <Input
            type="text"
            value={form.specification}
            onChange={(e) => handleChange('specification', e.target.value)}
            className={deepInputClass.replace('py-3', 'py-1.5').replace('text-sm', 'text-sm')}
          />
        </div>

        {/* 最低库存 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">最低库存限值</Label>
          <NumberInput
            value={form.minStock}
            onChange={(val) => handleChange('minStock', parseFloat(val) || 0)}
            decimals={2}
            className="h-8 px-2"
          />
        </div>

        {/* 最高库存 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">最高库存限值</Label>
          <NumberInput
            value={form.maxStock}
            onChange={(val) => handleChange('maxStock', parseFloat(val) || 0)}
            decimals={2}
            className="h-8 px-2"
          />
        </div>

        {/* 单价 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">单价</Label>
          <Input
            type="text"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className={deepInputClass.replace('py-3', 'py-1.5').replace('text-sm', 'text-sm')}
          />
        </div>

        {/* 供应商 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">供应商</Label>
          <Input
            type="text"
            value={form.supplier}
            onChange={(e) => handleChange('supplier', e.target.value)}
            className={deepInputClass.replace('py-3', 'py-1.5').replace('text-sm', 'text-sm')}
          />
        </div>

        {/* 存放位置 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">存放位置</Label>
          <Input
            type="text"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className={deepInputClass.replace('py-3', 'py-1.5').replace('text-sm', 'text-sm')}
          />
        </div>

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
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="删除确认"
      size="md"
      showFooter={false}
    >
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
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button variant="destructive" onClick={onConfirm} className="flex-1">
          <Trash2 className="w-4 h-4" /> 确认删除
        </Button>
      </div>
    </UnifiedModal>
  );
}
