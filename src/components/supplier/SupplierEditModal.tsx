// 供应商编辑弹窗组件
import { useState, useEffect } from 'react';
import { Supplier, EditFormData } from './types';
import { supplierCategories, getSupplierTypeName } from './data';
import { UnifiedModal } from '../ui/UnifiedModal';

interface SupplierEditModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
}

export default function SupplierEditModal({ isOpen, supplier, onClose, onSave }: SupplierEditModalProps) {
  const [form, setForm] = useState<EditFormData>({
    name: '',
    supplierType: '',
    supplierAttribute: '',
    contact: '',
    mobilePhone: '',
    workPhone: '',
    fax: '',
    status: '合作中',
    country: '中国',
    province: '',
    city: '',
    address: '',
    bankName: '',
    bankCardNumber: '',
    organization: '',
    createDate: '',
    remarks: '',
    lastEditBy: '',
    lastEditTime: ''
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        supplierType: supplier.supplierType,
        supplierAttribute: supplier.supplierAttribute,
        contact: supplier.contact,
        mobilePhone: supplier.mobilePhone,
        workPhone: supplier.workPhone || '',
        fax: supplier.fax || '',
        status: supplier.status,
        country: supplier.country,
        province: supplier.province,
        city: supplier.city,
        address: supplier.address,
        bankName: supplier.bankName || '',
        bankCardNumber: supplier.bankCardNumber || '',
        organization: supplier.organization,
        createDate: supplier.createDate,
        remarks: supplier.remarks || '',
        lastEditBy: '',
        lastEditTime: new Date().toISOString().split('T')[0]
      });
    }
  }, [supplier]);

  const handleChange = (field: keyof EditFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!supplier) return;
    onSave({
      ...supplier,
      ...form
    });
    onClose();
  };

  if (!isOpen || !supplier) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑供应商"
      size="lg"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-4">
            {/* 供应商编号（只读） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</label>
              <input
                type="text"
                value={supplier.code}
                disabled
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            {/* 供应商名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 供应类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应类型 *</label>
              <select
                value={form.supplierType}
                onChange={(e) => handleChange('supplierType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择属性</option>
                <option value="企业">企业</option>
                <option value="个体户">个体户</option>
                <option value="事业单位">事业单位</option>
                <option value="个人">个人</option>
                <option value="网络平台">网络平台</option>
                <option value="代理机构">代理机构</option>
                <option value="其他">其他</option>
              </select>
            </div>

            {/* 所属组织 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属组织 *</label>
              <select
                value={form.organization}
                onChange={(e) => handleChange('organization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择组织</option>
                <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                <option value="成都帮帮您公司">成都帮帮您公司</option>
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态 *</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 移动电话 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">移动电话 *</label>
              <input
                type="text"
                value={form.mobilePhone}
                onChange={(e) => handleChange('mobilePhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 工作电话 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作电话</label>
              <input
                type="text"
                value={form.workPhone}
                onChange={(e) => handleChange('workPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 传真 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">传真</label>
              <input
                type="text"
                value={form.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 国家 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 省份 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">省份</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => handleChange('province', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 城市 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 详细地址 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 开户行 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开户行</label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 银行卡号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">银行卡号</label>
              <input
                type="text"
                value={form.bankCardNumber}
                onChange={(e) => handleChange('bankCardNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 创建时间 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
              <input
                type="date"
                value={form.createDate}
                onChange={(e) => handleChange('createDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 备注 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={form.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        </div>
    </UnifiedModal>
  );
}
