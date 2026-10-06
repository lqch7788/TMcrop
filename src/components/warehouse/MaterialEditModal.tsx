import { useState, useEffect } from 'react';
import { Barcode, Package, Trash2, X } from 'lucide-react';
import { Material } from './MaterialFilters';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { SupplierSearchInput } from '@/components/common/settings/SupplierSearchInput';

interface MaterialEditModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void;
}

export function MaterialEditModal({ material, isOpen, onClose, onSave }: MaterialEditModalProps) {
  // 本地编辑表单状态
  const [form, setForm] = useState<Material | null>(null);

  // 每次打开时从 material 重新拷贝（组件常挂载，避免保留上次未保存的修改）
  useEffect(() => {
    if (isOpen && material) setForm({ ...material });
  }, [isOpen, material]);

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
            <Label className="block text-xs font-medium text-blue-600 mb-1">条形码</Label>
            <span className="text-2xl font-mono font-bold text-blue-700">{material.barcode}</span>
          </div>
          <Barcode className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      {/* 只读信息 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-xs font-medium text-gray-500 mb-1">物料编码</Label>
            <span className="text-sm font-medium text-gray-900">{material.code}</span>
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-500 mb-1">物料名称</Label>
            <span className="text-sm font-medium text-gray-900">{material.name}</span>
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-500 mb-1">物料分类</Label>
            <span className="text-sm font-medium text-gray-900">{material.category}</span>
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-500 mb-1">最后更新</Label>
            <span className="text-sm font-medium text-gray-900">{material.lastUpdateTime || '-'}</span>
          </div>
        </div>
      </div>

      {/* 2026-10-06 P1 修复：数据状态原为只读列表展示，弹窗加编辑入口（与列表数据状态列同步） */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">数据状态</Label>
          <Select value={form.dataStatus || '启用'} onValueChange={(v) => handleChange('dataStatus', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="启用">启用</SelectItem>
              <SelectItem value="停用">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 可编辑字段 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 当前库存 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">当前库存</Label>
          <NumberInput
            value={form.quantity}
            onChange={(val) => handleChange('quantity', parseFloat(val) || 0)}
            decimals={2}
            className="h-8 px-2"
          />
        </div>

        {/* 单位 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">单位</Label>
          <Input
            type="text"
            value={form.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 规格型号 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">规格型号</Label>
          <Input
            type="text"
            value={form.specification}
            onChange={(e) => handleChange('specification', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 最低库存 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">最低库存限值</Label>
          <NumberInput
            value={form.minStock}
            onChange={(val) => handleChange('minStock', parseFloat(val) || 0)}
            decimals={2}
            className="h-8 px-2"
          />
        </div>

        {/* 最高库存 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">最高库存限值</Label>
          <NumberInput
            value={form.maxStock}
            onChange={(val) => handleChange('maxStock', parseFloat(val) || 0)}
            decimals={2}
            className="h-8 px-2"
          />
        </div>

        {/* 单价 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">单价</Label>
          <Input
            type="text"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 供应商 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">供应商</Label>
          {/* 2026-09-27：接入供应商管理数据，支持搜索自动定位已有供应商名称 */}
          <SupplierSearchInput
            value={form.supplier}
            onChange={(name) => handleChange('supplier', name)}
            // 2026-09-29：同步供应商主数据 ID（此前只改名称不改 ID → 改完供应商后关联仍指向旧档案）
            onSupplierResolved={(s) => handleChange('supplierId', s ? String(s.id) : '')}
            placeholder="搜索或输入供应商名称"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 存放位置 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">存放位置</Label>
          <Input
            type="text"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 2026-09-27 字段补齐：条码 / 批次 / 生产日期 / 有效期 / 备注（此前编辑弹窗只能改 8 个字段） */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">条码</Label>
          <Input
            type="text"
            value={form.barcode}
            onChange={(e) => handleChange('barcode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">批次号</Label>
          <Input
            type="text"
            value={form.batchNo}
            onChange={(e) => handleChange('batchNo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">生产日期</Label>
          <DatePicker
            className="w-full"
            selected={form.productionDate ? new Date(form.productionDate) : undefined}
            onChange={(date) => handleChange('productionDate', todayLocal(date))}
            placeholder="选择生产日期"
          />
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">有效期至</Label>
          <DatePicker
            className="w-full"
            selected={form.expiryDate ? new Date(form.expiryDate) : undefined}
            onChange={(date) => handleChange('expiryDate', todayLocal(date))}
            placeholder="选择有效期"
          />
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
          <Input
            type="text"
            value={form.remarks || ''}
            onChange={(e) => handleChange('remarks', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
      // 2026-08-10 修复：按钮固定在弹窗底部（Modal 自带 footer slot，border-t + bg-gray-50 + flex-shrink-0）
      showFooter={true}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            <Trash2 className="w-4 h-4" /> 确认删除
          </Button>
        </div>
      }
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
    </UnifiedModal>
  );
}
