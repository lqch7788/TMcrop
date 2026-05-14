/**
 * 供应商批量编辑弹窗 — 逐条编辑+累积保存模式
 * 参照物料入库 BatchEditModal 设计
 */
import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Supplier } from './types';
import { getSupplierTypeName } from './data';
import { Button } from '../../components/ui/button';
import { useDictionaryStore, useSupplierCodeRuleStore } from '../../stores';

interface SupplierBatchEditModalProps {
  isOpen: boolean;
  selectedSuppliers: Supplier[];
  batchEditedSuppliers: Record<number, Partial<Supplier>>;
  currentBatchEditIndex: number;
  onClose: () => void;
  onSupplierSelect: (index: number) => void;
  onFieldChange: (supplierId: number, field: string, value: string) => void;
  onNext: () => void;
  onSaveAll: () => void;
}

export default function SupplierBatchEditModal({
  isOpen,
  selectedSuppliers,
  batchEditedSuppliers,
  currentBatchEditIndex,
  onClose,
  onSupplierSelect,
  onFieldChange,
  onNext,
  onSaveAll,
}: SupplierBatchEditModalProps) {
  // 弹窗拖拽/最大化状态
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });

  // 字典数据
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);
  useEffect(() => {
    if (dictionaries.length === 0) loadDictionaries();
  }, [dictionaries.length, loadDictionaries]);

  const supplierAttributeOptions = useMemo(() =>
    dictionaries.filter(d => d.categoryCode === 'supplier_attribute' && d.status === 'active'),
    [dictionaries]
  );

  const categories = useSupplierCodeRuleStore((s) => s.categories);

  // 当前编辑的供应商
  const currentSupplierId = selectedSuppliers[currentBatchEditIndex]?.id;
  const currentSupplier = selectedSuppliers[currentBatchEditIndex];
  const currentEdits = batchEditedSuppliers[currentSupplierId] || {};
  const editedCount = Object.keys(batchEditedSuppliers).length;

  // 拖拽处理
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('supplier-batch-edit-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dialog = document.getElementById('supplier-batch-edit-dialog');
      if (dialog) {
        dialog.style.position = 'fixed';
        dialog.style.left = `${dragStart.left + e.clientX - dragStart.x}px`;
        dialog.style.top = `${dragStart.top + e.clientY - dragStart.y}px`;
        dialog.style.margin = '0';
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const toggleMaximize = () => {
    const dialog = document.getElementById('supplier-batch-edit-dialog');
    if (!isMaximized && dialog) {
      dialog.style.width = '100vw';
      dialog.style.height = '100vh';
      dialog.style.maxWidth = 'none';
      dialog.style.maxHeight = 'none';
      dialog.style.borderRadius = '0';
    } else if (dialog) {
      dialog.style.width = '';
      dialog.style.height = '';
      dialog.style.maxWidth = '';
      dialog.style.maxHeight = '';
      dialog.style.borderRadius = '';
    }
    setIsMaximized(!isMaximized);
  };

  // 获取字段当前值（优先取已编辑值，否则取原始值）
  const getValue = (field: keyof Supplier) => {
    if (currentEdits[field] !== undefined) return currentEdits[field];
    if (currentSupplier) return currentSupplier[field];
    return '';
  };

  const handleFieldChange = (field: string, value: string) => {
    if (currentSupplierId != null) {
      onFieldChange(currentSupplierId, field, value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        id="supplier-batch-edit-dialog"
        className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[90vh] flex flex-col"
      >
        {/* 翠绿标题栏 */}
        <div
          className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 flex-shrink-0 cursor-move"
          onMouseDown={handleDragStart}
        >
          <h3 className="text-lg font-semibold text-white select-none">批量编辑供应商</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMaximize}
              className="text-white hover:bg-emerald-700 p-1.5 rounded transition-colors"
              title={isMaximized ? '还原' : '最大化'}
            >
              {isMaximized ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 4v2a2 2 0 002 2h2m8 0h2a2 2 0 002-2v-2m0-4V6a2 2 0 00-2-2h-2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedSuppliers.length}</strong> 个供应商进行批量编辑，已编辑 <strong>{editedCount}</strong> 个
          </p>
        </div>

        {/* 供应商选择下拉 + 导航 */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">当前编辑：</label>
          <select
            value={currentSupplierId ?? ''}
            onChange={(e) => {
              const idx = selectedSuppliers.findIndex(s => s.id === Number(e.target.value));
              if (idx >= 0) onSupplierSelect(idx);
            }}
            className="flex-1 h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {selectedSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name} {batchEditedSuppliers[s.id] ? ' ✅' : ''}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentBatchEditIndex === 0}
              onClick={() => onSupplierSelect(currentBatchEditIndex - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {currentBatchEditIndex + 1} / {selectedSuppliers.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={currentBatchEditIndex >= selectedSuppliers.length - 1}
              onClick={() => onSupplierSelect(currentBatchEditIndex + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 只读标识信息 */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">供应商编号</label>
              <div className="text-sm font-medium text-gray-900">{currentSupplier?.code || '-'}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">供应商名称</label>
              <div className="text-sm font-medium text-gray-900">{currentSupplier?.name || '-'}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">创建时间</label>
              <div className="text-sm text-gray-600">{currentSupplier?.createDate || '-'}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">原始状态</label>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                (currentSupplier?.status) === '合作中' ? 'bg-green-100 text-green-700' :
                (currentSupplier?.status) === '暂停' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {currentSupplier?.status || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 可编辑字段 — 滚动区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 基本信息 */}
          <h4 className="text-sm font-semibold text-emerald-700 mb-3 pb-1 border-b border-emerald-200">基本信息</h4>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">供应类型</label>
              <select
                value={getValue('supplierType')}
                onChange={(e) => handleFieldChange('supplierType', e.target.value)}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">不修改</option>
                {categories.map(cat => (
                  <option key={cat.code} value={cat.code}>{getSupplierTypeName(cat.code)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">供应商属性</label>
              <select
                value={getValue('supplierAttribute')}
                onChange={(e) => handleFieldChange('supplierAttribute', e.target.value)}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">不修改</option>
                {supplierAttributeOptions.map(opt => (
                  <option key={opt.dictCode} value={opt.dictLabel}>{opt.dictLabel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">所属组织</label>
              <select
                value={getValue('organization')}
                onChange={(e) => handleFieldChange('organization', e.target.value)}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">不修改</option>
                <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                <option value="成都帮帮您公司">成都帮帮您公司</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
              <select
                value={getValue('status')}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">不修改</option>
                <option value="合作中">合作中</option>
                <option value="暂停">暂停</option>
                <option value="终止">终止</option>
              </select>
            </div>
          </div>

          {/* 联系信息 */}
          <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-200">联系信息</h4>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">联系人</label>
              <input
                type="text"
                value={getValue('contact')}
                onChange={(e) => handleFieldChange('contact', e.target.value)}
                placeholder={currentSupplier?.contact || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">移动电话</label>
              <input
                type="text"
                value={getValue('mobilePhone')}
                onChange={(e) => handleFieldChange('mobilePhone', e.target.value)}
                placeholder={currentSupplier?.mobilePhone || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">工作电话</label>
              <input
                type="text"
                value={getValue('workPhone')}
                onChange={(e) => handleFieldChange('workPhone', e.target.value)}
                placeholder={currentSupplier?.workPhone || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">传真</label>
              <input
                type="text"
                value={getValue('fax')}
                onChange={(e) => handleFieldChange('fax', e.target.value)}
                placeholder={currentSupplier?.fax || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 地区信息 */}
          <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-200">地区信息</h4>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">国家</label>
              <input
                type="text"
                value={getValue('country')}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                placeholder={currentSupplier?.country || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">省份</label>
              <input
                type="text"
                value={getValue('province')}
                onChange={(e) => handleFieldChange('province', e.target.value)}
                placeholder={currentSupplier?.province || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">城市</label>
              <input
                type="text"
                value={getValue('city')}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder={currentSupplier?.city || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">详细地址</label>
            <input
              type="text"
              value={getValue('address')}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder={currentSupplier?.address || '未填写'}
              className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 财务信息 */}
          <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-200">财务信息</h4>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">开户行</label>
              <input
                type="text"
                value={getValue('bankName')}
                onChange={(e) => handleFieldChange('bankName', e.target.value)}
                placeholder={currentSupplier?.bankName || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">银行卡号</label>
              <input
                type="text"
                value={getValue('bankCardNumber')}
                onChange={(e) => handleFieldChange('bankCardNumber', e.target.value)}
                placeholder={currentSupplier?.bankCardNumber || '未填写'}
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* 备注 */}
          <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-200">备注</h4>
          <div>
            <textarea
              value={getValue('remarks')}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              placeholder={currentSupplier?.remarks || '未填写'}
              rows={2}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-between gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onNext}
              disabled={!currentSupplierId}
            >
              确认 {currentBatchEditIndex + 1 < selectedSuppliers.length ? '(下一个)' : '(已最后一个)'}
            </Button>
            <Button onClick={onSaveAll}>
              保存全部 ({editedCount} 个)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
