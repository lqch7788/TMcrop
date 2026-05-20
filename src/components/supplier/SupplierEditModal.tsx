// 供应商编辑弹窗组件
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Supplier, EditFormData } from './types';
import { getSupplierTypeName } from './data';
import { UnifiedModal } from '../ui/UnifiedModal';
import { Input } from '../ui/input';
import { TextArea } from '../ui/TextArea';
import { Cascader } from '../ui/Cascader';
import type { CascaderOption, CascaderValueNode } from '../ui/Cascader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Label } from '../ui/label';
import { useDictionaryStore, useSupplierCodeRuleStore, useRegionStore } from '../../stores';
import {
  validateMobilePhone,
  validateWorkPhone,
  validateFax,
  validateBankCard,
  validateCode,
  runValidations,
} from '../../lib/validators';

interface SupplierEditModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
}

export default function SupplierEditModal({ isOpen, supplier, onClose, onSave }: SupplierEditModalProps) {
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

  // 区域级联选择 - 四级懒加载
  const fetchProvinces = useRegionStore((s) => s.fetchProvinces);
  const getChildren = useRegionStore((s) => s.getChildren);
  const provinces = useRegionStore((s) => s.provinces);

  // 跟踪级联选择路径节点
  const [regionPathNodes, setRegionPathNodes] = useState<CascaderValueNode[]>([]);

  // 加载省份列表
  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  // 将 RegionNode 转为 CascaderOption
  const provincesOptions: CascaderOption[] = useMemo(
    () =>
      provinces.map((n) => ({
        label: n.name,
        value: String(n.id),
      })),
    [provinces]
  );

  // 懒加载回调
  const handleLoadRegionChildren = useCallback(
    async (parentId: number): Promise<CascaderOption[]> => {
      const children = await getChildren(parentId);
      return children.map((n) => ({
        label: n.name,
        value: String(n.id),
      }));
    },
    [getChildren]
  );

  // 级联选择变化回调
  const handleRegionChange = useCallback(
    (nodes: CascaderValueNode[]) => {
      setRegionPathNodes(nodes);
      const province = nodes[0]?.name || '';
      const city = nodes.slice(1).map((n) => n.name).join(' ');
      setForm((prev) => ({ ...prev, province, city }));
    },
    []
  );

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

    // 格式验证（对标 iAGS purchaserManagement 第613-670行）
    const errors = runValidations([
      { field: 'mobilePhone', valid: validateMobilePhone(form.mobilePhone), message: '手机号格式不正确，应为1开头的11位数字' },
      { field: 'workPhone', valid: validateWorkPhone(form.workPhone), message: '工作电话格式不正确，应为区号-号码格式（如：0571-88886666）' },
      { field: 'fax', valid: validateFax(form.fax), message: '传真格式不正确' },
      { field: 'bankCardNumber', valid: validateBankCard(form.bankCardNumber), message: '银行卡号格式不正确，应为15位或17-18位数字' },
    ]);
    if (errors.length > 0) {
      alert(`请检查以下字段：\n${errors.map(e => e.message).join('\n')}`);
      return;
    }

    onSave({
      ...supplier,
      ...form
    });
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
              <Label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</Label>
              <Input
                type="text"
                value={supplier.code}
                disabled
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            {/* 供应商名称 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">供应商名称 *</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 供应类型 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">供应类型 *</Label>
              <Select
                value={form.supplierType}
                onValueChange={(val) => handleChange('supplierType', val)}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="请选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">请选择类型</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.code} value={cat.code}>{getSupplierTypeName(cat.code)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 供应商属性 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">供应商属性 *</Label>
              <Select
                value={form.supplierAttribute}
                onValueChange={(val) => handleChange('supplierAttribute', val)}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="请选择属性" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">请选择属性</SelectItem>
                  {supplierAttributeOptions.map(opt => (
                    <SelectItem key={opt.dictCode} value={opt.dictLabel}>{opt.dictLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 所属组织 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">所属组织 *</Label>
              <Select
                value={form.organization}
                onValueChange={(val) => handleChange('organization', val)}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="请选择组织" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">请选择组织</SelectItem>
                  <SelectItem value="宁波帮帮忙公司">宁波帮帮忙公司</SelectItem>
                  <SelectItem value="成都帮帮您公司">成都帮帮您公司</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 状态 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">状态 *</Label>
              <Select
                value={form.status}
                onValueChange={(val) => handleChange('status', val)}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="合作中" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="合作中">合作中</SelectItem>
                  <SelectItem value="暂停">暂停</SelectItem>
                  <SelectItem value="终止">终止</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 联系人 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">联系人 *</Label>
              <Input
                type="text"
                value={form.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 移动电话 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">移动电话 *</Label>
              <Input
                type="text"
                value={form.mobilePhone}
                onChange={(e) => handleChange('mobilePhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 工作电话 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">工作电话</Label>
              <Input
                type="text"
                value={form.workPhone}
                onChange={(e) => handleChange('workPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 传真 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">传真</Label>
              <Input
                type="text"
                value={form.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 国家 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">国家</Label>
              <Input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 区域选择（四级级联：省份→城市→区县） */}
            <div className="col-span-2">
              <Label className="block text-sm font-medium text-gray-700 mb-1">省/市/区</Label>
              <Cascader
                options={provincesOptions}
                lazy
                maxLevel={4}
                onLoadChildren={handleLoadRegionChildren}
                onChangeNodes={handleRegionChange}
                valueNodes={regionPathNodes.length > 0 ? regionPathNodes : undefined}
                placeholder="请选择省/市/区"
                className="w-full"
              />
            </div>

            {/* 详细地址 */}
            <div className="col-span-2">
              <Label className="block text-sm font-medium text-gray-700 mb-1">详细地址</Label>
              <Input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 开户行 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">开户行</Label>
              <Input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 银行卡号 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">银行卡号</Label>
              <Input
                type="text"
                value={form.bankCardNumber}
                onChange={(e) => handleChange('bankCardNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 创建时间 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">创建时间</Label>
              <Input
                type="date"
                value={form.createDate}
                onChange={(e) => handleChange('createDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 备注 */}
            <div className="col-span-2">
              <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
              <TextArea
                value={form.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
        </div>
    </UnifiedModal>
  );
}
