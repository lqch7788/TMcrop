// 供应商新增弹窗组件
import { useState } from 'react';
import { X } from 'lucide-react';
import { Supplier, NewSupplierData } from './types';
import { supplierCategories, getSupplierTypeName } from './data';

interface SupplierAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (supplier: Supplier) => void;
  generatedCode?: string;
}

export default function SupplierAddModal({ isOpen, onClose, onAdd, generatedCode }: SupplierAddModalProps) {
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
    createDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const handleChange = (field: keyof NewSupplierData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // 生成新的供应商ID（实际应该调用API）
    const newSupplier: Supplier = {
      id: Date.now(),
      ...form
    };
    onAdd(newSupplier);
    onClose();
    // 重置表单
    setForm({
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
      createDate: new Date().toISOString().split('T')[0],
      remarks: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b bg-emerald-600">
          <h3 className="text-lg font-semibold text-white">新增供应商</h3>
          <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 表单 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* 供应商编号（可选填入生成的编码） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</label>
              <input
                type="text"
                value={generatedCode || form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="可使用编码生成器生成"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 供应商名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 供应类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应类型 *</label>
              <select
                value={form.supplierType}
                onChange={(e) => handleChange('supplierType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择类型</option>
                {supplierCategories.map(cat => (
                  <option key={cat.code} value={cat.code}>{getSupplierTypeName(cat.code)}</option>
                ))}
              </select>
            </div>

            {/* 供应商属性 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商属性 *</label>
              <select
                value={form.supplierAttribute}
                onChange={(e) => handleChange('supplierAttribute', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择属性</option>
                <option value="企业">企业</option>
                <option value="个体户">个体户</option>
                <option value="事业单位">事业单位</option>
              </select>
            </div>

            {/* 所属组织 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属组织 *</label>
              <select
                value={form.organization}
                onChange={(e) => handleChange('organization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择组织</option>
                <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                <option value="成都帮帮您公司">成都帮帮您公司</option>
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="合作中">合作中</option>
                <option value="暂停">暂停</option>
                <option value="终止">终止</option>
              </select>
            </div>

            {/* 联系人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">联系人 *</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 移动电话 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">移动电话 *</label>
              <input
                type="text"
                value={form.mobilePhone}
                onChange={(e) => handleChange('mobilePhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 工作电话 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作电话</label>
              <input
                type="text"
                value={form.workPhone}
                onChange={(e) => handleChange('workPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 传真 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">传真</label>
              <input
                type="text"
                value={form.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 国家 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 省份 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">省份</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => handleChange('province', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 城市 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 详细地址 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 开户行 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开户行</label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 银行卡号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">银行卡号</label>
              <input
                type="text"
                value={form.bankCardNumber}
                onChange={(e) => handleChange('bankCardNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 创建时间 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
              <input
                type="date"
                value={form.createDate}
                onChange={(e) => handleChange('createDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 备注 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={form.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            取消
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
