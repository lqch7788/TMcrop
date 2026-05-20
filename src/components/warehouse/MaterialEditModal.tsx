import { useState, useEffect } from 'react';
import { Barcode, Package } from 'lucide-react';
import { Material } from './MaterialFilters';
import { UnifiedModal } from '../ui/UnifiedModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';

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
          <Input
            type="number"
            value={form.quantity}
            onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 单位 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">单位</Label>
          <Input
            type="text"
            value={form.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 规格型号 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">规格型号</Label>
          <Input
            type="text"
            value={form.specification}
            onChange={(e) => handleChange('specification', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 最低库存 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">最低库存限值</Label>
          <Input
            type="number"
            value={form.minStock}
            onChange={(e) => handleChange('minStock', parseFloat(e.target.value) || 0)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 最高库存 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">最高库存限值</Label>
          <Input
            type="number"
            value={form.maxStock}
            onChange={(e) => handleChange('maxStock', parseFloat(e.target.value) || 0)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 单价 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">单价</Label>
          <Input
            type="text"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 供应商 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">供应商</Label>
          <Input
            type="text"
            value={form.supplier}
            onChange={(e) => handleChange('supplier', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 存放位置 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">存放位置</Label>
          <Input
            type="text"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 批次号 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">批次号</Label>
          <Input
            type="text"
            value={form.batchNo}
            onChange={(e) => handleChange('batchNo', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 生产日期 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">生产日期</Label>
          <Input
            type="date"
            value={form.productionDate}
            onChange={(e) => handleChange('productionDate', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 过期日期 */}
        <div>
          <Label className="block text-xs font-medium text-gray-700 mb-1">过期日期</Label>
          <Input
            type="date"
            value={form.expiryDate}
            onChange={(e) => handleChange('expiryDate', e.target.value)}
            className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
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
