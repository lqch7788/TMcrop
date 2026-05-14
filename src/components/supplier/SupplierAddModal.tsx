// 供应商新增弹窗组件 - 参照物料入库 InboundAddModal 样式
import { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { Supplier, NewSupplierData } from './types';
import { getSupplierTypeName } from './data';
import { Button } from '../ui/button';
import { useDictionaryStore, useSupplierCodeRuleStore } from '../../stores';

interface SupplierAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (supplier: Supplier) => void;
  generatedCode?: string;
}

export default function SupplierAddModal({ isOpen, onClose, onAdd, generatedCode }: SupplierAddModalProps) {
  const today = new Date().toISOString().split('T')[0];

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

  // 从Store获取分类数据（与编码规则页同步）
  const categories = useSupplierCodeRuleStore((s) => s.categories);

  const [form, setForm] = useState<NewSupplierData>({
    organization: '',
    code: '',
    name: '',
    supplierType: '',
    supplierAttribute: '',
    contact: '',
    mobilePhone: '',
    workPhone: '',
    fax: '',
    country: '中国',
    province: '',
    city: '',
    address: '',
    status: '合作中',
    bankName: '',
    bankCardNumber: '',
    createDate: today,
    remarks: ''
  });

  // 弹窗最大化状态
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });

  // 同步外部生成的编码
  useEffect(() => {
    if (generatedCode) {
      setForm(prev => ({ ...prev, code: generatedCode }));
    }
  }, [generatedCode]);

  // 拖动处理
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('supplier-add-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const dialog = document.getElementById('supplier-add-dialog');
      if (dialog) {
        dialog.style.position = 'fixed';
        dialog.style.left = `${dragStart.left + deltaX}px`;
        dialog.style.top = `${dragStart.top + deltaY}px`;
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

  // 最大化/还原
  const toggleMaximize = () => {
    const dialog = document.getElementById('supplier-add-dialog');
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

  const handleChange = (field: keyof NewSupplierData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const newSupplier: Supplier = {
      id: Date.now(),
      ...form
    };
    onAdd(newSupplier);
    // 重置表单
    setForm({
      organization: '', code: '', name: '', supplierType: '', supplierAttribute: '',
      contact: '', mobilePhone: '', workPhone: '', fax: '', country: '中国',
      province: '', city: '', address: '', status: '合作中',
      bankName: '', bankCardNumber: '', createDate: today, remarks: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        id="supplier-add-dialog"
        className="bg-white rounded-xl w-full max-w-6xl shadow-xl max-h-[90vh] flex flex-col relative"
      >
        {/* 标题栏 */}
        <div
          className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 flex-shrink-0 cursor-move"
          onMouseDown={handleDragStart}
        >
          <h3 className="text-lg font-semibold text-white select-none">新增供应商</h3>
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
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 基本信息区域 */}
        <div className="p-4 bg-emerald-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 供应商编号 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">供应商编号</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="手动输入或使用编码生成器"
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm font-mono"
              />
            </div>

            {/* 供应商名称 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">供应商名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 供应类型 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">供应类型 *</label>
              <select
                value={form.supplierType}
                onChange={(e) => handleChange('supplierType', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              >
                <option value="">请选择类型</option>
                {categories.map(cat => (
                  <option key={cat.code} value={cat.code}>{getSupplierTypeName(cat.code)}</option>
                ))}
              </select>
            </div>

            {/* 供应商属性 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">供应商属性 *</label>
              <select
                value={form.supplierAttribute}
                onChange={(e) => handleChange('supplierAttribute', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              >
                <option value="">请选择属性</option>
                {supplierAttributeOptions.map(opt => (
                  <option key={opt.dictCode} value={opt.dictLabel}>{opt.dictLabel}</option>
                ))}
              </select>
            </div>

            {/* 所属组织 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">所属组织 *</label>
              <select
                value={form.organization}
                onChange={(e) => handleChange('organization', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              >
                <option value="">请选择组织</option>
                <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                <option value="成都帮帮您公司">成都帮帮您公司</option>
              </select>
            </div>

            {/* 联系人 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">联系人 *</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 移动电话 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">移动电话 *</label>
              <input
                type="text"
                value={form.mobilePhone}
                onChange={(e) => handleChange('mobilePhone', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">状态</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              >
                <option value="合作中">合作中</option>
                <option value="暂停">暂停</option>
                <option value="终止">终止</option>
              </select>
            </div>
          </div>
        </div>

        {/* 详细信息区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {/* 工作电话 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">工作电话</label>
              <input
                type="text"
                value={form.workPhone}
                onChange={(e) => handleChange('workPhone', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 传真 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">传真</label>
              <input
                type="text"
                value={form.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 国家 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">国家</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 省份 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">省份</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => handleChange('province', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 城市 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">城市</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 创建时间 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">创建时间</label>
              <input
                type="date"
                value={form.createDate}
                onChange={(e) => handleChange('createDate', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 详细地址 */}
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">详细地址</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 开户行 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">开户行</label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 银行卡号 */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">银行卡号</label>
              <input
                type="text"
                value={form.bankCardNumber}
                onChange={(e) => handleChange('bankCardNumber', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 备注 */}
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={form.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={2}
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            提交
          </Button>
        </div>
      </div>
    </div>
  );
}
