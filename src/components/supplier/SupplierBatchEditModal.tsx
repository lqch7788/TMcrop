// 供应商批量编辑弹窗组件
import { useState, useEffect, useMemo } from 'react';
import { Supplier } from './types';
import { UnifiedModal } from '../ui/UnifiedModal';
import { useDictionaryStore } from '../../stores';

interface SupplierBatchEditModalProps {
  isOpen: boolean;
  suppliers: Supplier[];
  selectedIds: number[];
  onClose: () => void;
  onSave: (updates: Record<number, Partial<Supplier>>) => void;
}

export default function SupplierBatchEditModal({ isOpen, suppliers, selectedIds, onClose, onSave }: SupplierBatchEditModalProps) {
  // 从全局设置数据获取供应商属性字典
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  const supplierAttributeOptions = useMemo(() =>
    dictionaries.filter(d => d.categoryCode === 'supplier_attribute' && d.status === 'active'),
    [dictionaries]
  );

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

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑供应商"
      size="md"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存修改"
      cancelText="取消"
    >
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
            {supplierAttributeOptions.map(opt => (
              <option key={opt.dictCode} value={opt.dictLabel}>{opt.dictLabel}</option>
            ))}
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
    </UnifiedModal>
  );
}
