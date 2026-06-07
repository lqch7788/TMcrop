// 供应商新增弹窗组件 - 参照物料入库 InboundAddModal 样式
import { useState, useMemo, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Supplier, NewSupplierData } from './types';
import { getSupplierTypeName } from './data';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Cascader } from '@/components/ui';
import type { CascaderOption, CascaderValueNode } from '../ui/Cascader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Label } from '@/components/ui';
import { useDictionaryStore, useSupplierCodeRuleStore, useRegionStore } from '../../stores';
import {
  validateMobilePhone,
  validateWorkPhone,
  validateFax,
  validateBankCard,
  validateCode,
  runValidations,
} from '../../lib/validators';
import { showAlert } from '@/lib/dialogService';

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
    // 格式验证（对标 iAGS purchaserManagement 第613-670行）
    const errors = runValidations([
      { field: 'mobilePhone', valid: validateMobilePhone(form.mobilePhone), message: '手机号格式不正确，应为1开头的11位数字' },
      { field: 'workPhone', valid: validateWorkPhone(form.workPhone), message: '工作电话格式不正确，应为区号-号码格式（如：0571-88886666）' },
      { field: 'fax', valid: validateFax(form.fax), message: '传真格式不正确' },
      { field: 'bankCardNumber', valid: validateBankCard(form.bankCardNumber), message: '银行卡号格式不正确，应为15位或17-18位数字' },
      { field: 'code', valid: validateCode(form.code), message: '标识码只能包含字母、数字、下划线和连字符' },
    ]);
    if (errors.length > 0) {
      showAlert(`请检查以下字段：\n${errors.map(e => e.message).join('\n')}`);
      return;
    }

    const newSupplier: Supplier = {
      id: Date.now(),
      ...form
    };
    onAdd(newSupplier);
    // 重置表单
    setRegionPathNodes([]);
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
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMaximize}
              className="text-white hover:bg-emerald-700"
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
            </Button>
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
              <Label className="block text-xs font-medium text-emerald-700 mb-1">供应商编号</Label>
              <Input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="手动输入或使用编码生成器"
                className={deepInputClass.replace('text-sm', 'text-sm font-mono')}
              />
            </div>

            {/* 供应商名称 */}
            <div>
              <Label className="block text-xs font-medium text-emerald-700 mb-1">供应商名称 *</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 供应类型 */}
            <div>
              <Label className="block text-xs font-medium text-emerald-700 mb-1">供应类型 *</Label>
              <Select
                value={form.supplierType}
                onValueChange={(val) => handleChange('supplierType', val)}
              >
                <SelectTrigger className={deepInputClass.replace('text-sm', 'text-sm')}>
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
              <Label className="block text-xs font-medium text-emerald-700 mb-1">供应商属性 *</Label>
              <Select
                value={form.supplierAttribute}
                onValueChange={(val) => handleChange('supplierAttribute', val)}
              >
                <SelectTrigger className={deepInputClass.replace('text-sm', 'text-sm')}>
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
              <Label className="block text-xs font-medium text-emerald-700 mb-1">所属组织 *</Label>
              <Select
                value={form.organization}
                onValueChange={(val) => handleChange('organization', val)}
              >
                <SelectTrigger className={deepInputClass.replace('text-sm', 'text-sm')}>
                  <SelectValue placeholder="请选择组织" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">请选择组织</SelectItem>
                  <SelectItem value="宁波帮帮忙公司">宁波帮帮忙公司</SelectItem>
                  <SelectItem value="成都帮帮您公司">成都帮帮您公司</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 联系人 */}
            <div>
              <Label className="block text-xs font-medium text-emerald-700 mb-1">联系人 *</Label>
              <Input
                type="text"
                value={form.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 移动电话 */}
            <div>
              <Label className="block text-xs font-medium text-emerald-700 mb-1">移动电话 *</Label>
              <Input
                type="text"
                value={form.mobilePhone}
                onChange={(e) => handleChange('mobilePhone', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 状态 */}
            <div>
              <Label className="block text-xs font-medium text-emerald-700 mb-1">状态</Label>
              <Select
                value={form.status}
                onValueChange={(val) => handleChange('status', val)}
              >
                <SelectTrigger className={deepInputClass.replace('text-sm', 'text-sm')}>
                  <SelectValue placeholder="合作中" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="合作中">合作中</SelectItem>
                  <SelectItem value="暂停">暂停</SelectItem>
                  <SelectItem value="终止">终止</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 详细信息区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {/* 工作电话 */}
            <div>
              <Label className="block text-xs font-medium text-gray-700 mb-1">工作电话</Label>
              <Input
                type="text"
                value={form.workPhone}
                onChange={(e) => handleChange('workPhone', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 传真 */}
            <div>
              <Label className="block text-xs font-medium text-gray-700 mb-1">传真</Label>
              <Input
                type="text"
                value={form.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 国家 */}
            <div>
              <Label className="block text-xs font-medium text-gray-700 mb-1">国家</Label>
              <Input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 区域选择（四级级联：省份→城市→区县） */}
            <div>
              <Label className="block text-xs font-medium text-gray-700 mb-1">省/市/区</Label>
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

            {/* 创建时间 */}
            <div>
              <Label className="block text-xs font-medium text-gray-700 mb-1">创建时间</Label>
              <Input
                type="date"
                value={form.createDate}
                onChange={(e) => handleChange('createDate', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 详细地址 */}
            <div className="col-span-3">
              <Label className="block text-xs font-medium text-gray-700 mb-1">详细地址</Label>
              <Input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 开户行 */}
            <div>
              <Label className="block text-xs font-medium text-gray-700 mb-1">开户行</Label>
              <Input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 银行卡号 */}
            <div className="col-span-2">
              <Label className="block text-xs font-medium text-gray-700 mb-1">银行卡号</Label>
              <Input
                type="text"
                value={form.bankCardNumber}
                onChange={(e) => handleChange('bankCardNumber', e.target.value)}
                className={deepInputClass.replace('text-sm', 'text-sm')}
              />
            </div>

            {/* 备注 */}
            <div className="col-span-3">
              <Label className="block text-xs font-medium text-gray-700 mb-1">备注</Label>
              <TextArea
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
