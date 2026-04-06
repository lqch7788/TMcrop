// 供应商批量编辑弹窗组件
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Supplier } from './types';

interface SupplierBatchEditModalProps {
  isOpen: boolean;
  suppliers: Supplier[];
  selectedIds: number[];
  onClose: () => void;
  onSave: (updates: Record<number, Partial<Supplier>>) => void;
}

export default function SupplierBatchEditModal({ isOpen, suppliers, selectedIds, onClose, onSave }: SupplierBatchEditModalProps) {
  const [batchData, setBatchData] = useState<Record<string, string>>({
    status: '',
    supplierAttribute: '',
    organization: ''
  });

  const selectedSuppliers = suppliers.filter(s => selectedIds.includes(s.id));

  const handleChange = (field: string, value: string) => {
    setBatchData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const updates: Record<number, Partial<Supplier>> = {};
    selectedIds.forEach(id => {
      updates[id] = {};
      if (batchData.status) updates[id].status = batchData.status;
      if (batchData.supplierAttribute) updates[id].supplierAttribute = batchData.supplierAttribute;
      if (batchData.organization) updates[id].organization = batchData.organization;
    });
    onSave(updates);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-600">
          <h3 className="text-lg font-semibold text-white">批量编辑供应商</h3>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            已选择 <span className="font-bold text-blue-600">{selectedIds.length}</span> 个供应商
          </p>

          <div className="space-y-4">
            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={batchData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">不修改</option>
                <option value="合作中">合作中</option>
                <option value="暂停">暂停</option>
                <option value="终止">终止</option>
              </select>
            </div>

            {/* 供应商属性 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商属性</label>
              <select
                value={batchData.supplierAttribute}
                onChange={(e) => handleChange('supplierAttribute', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">不修改</option>
                <option value="企业">企业</option>
                <option value="个体户">个体户</option>
                <option value="事业单位">事业单位</option>
              </select>
            </div>

            {/* 所属组织 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
              <select
                value={batchData.organization}
                onChange={(e) => handleChange('organization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">不修改</option>
                <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                <option value="成都帮帮您公司">成都帮帮您公司</option>
              </select>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            取消
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}
