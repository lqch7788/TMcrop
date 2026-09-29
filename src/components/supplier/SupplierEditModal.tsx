// 供应商编辑弹窗组件
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Supplier, EditFormData, SUPPLIER_STATUS_OPTIONS, SUPPLIER_ORGANIZATION_OPTIONS, SUPPLIER_SETTLEMENT_OPTIONS, SUPPLIER_INTERNAL_OPTIONS, SUPPLIER_RATING_LABEL, SUPPLIER_RATING_HINT } from './types';
import { getSupplierTypeName } from './data';
import { QUALIFICATION_ROWS, QUALIFICATION_LABELS, requiredKindForType } from './qualification';
import { UnifiedModal } from '@/components/ui';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Cascader } from '@/components/ui';
import type { CascaderOption, CascaderValueNode } from '../ui/Cascader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Label } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
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

// 表单控件统一样式（对齐生产领料弹窗 ApplicationModals 标准）
const inputClass = "w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

interface SupplierEditModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  /**
   * 保存回调。返回 Promise 时会被 await —— UnifiedModal 依赖"onSubmit 返回 pending Promise"
   * 在提交期间禁用按钮，不返回 Promise 会导致防重复提交失效（2026-09-29 审计修复）
   */
  onSave: (supplier: Supplier) => Promise<unknown> | unknown;
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
    remarks: '',
    lastEditBy: '',
    lastEditTime: '',
    // 2026-09-28 批次B/C：资质证照 + 经营决策（空串表示未登记）
    pesticideLicenseNo: '',
    pesticideLicenseExpiry: '',
    seedFilingNo: '',
    seedFilingExpiry: '',
    fertilizerRegNo: '',
    fertilizerRegExpiry: '',
    isInternal: 'external',
    settlementType: '',
    creditDays: '',
    rating: '',
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
        // 2026-09-28：建档日期不再出现在表单里（提交时由新增流程记当天），
        // 编辑不触碰该字段——走 {...supplier, ...form} 合并时沿用库中现值
        remarks: supplier.remarks || '',
        lastEditBy: '',
        lastEditTime: todayLocal(),
        // 2026-09-28 批次B/C：资质证照 + 经营决策（DB 里 null → 空串，表单可控）
        pesticideLicenseNo: supplier.pesticideLicenseNo || '',
        pesticideLicenseExpiry: supplier.pesticideLicenseExpiry || '',
        seedFilingNo: supplier.seedFilingNo || '',
        seedFilingExpiry: supplier.seedFilingExpiry || '',
        fertilizerRegNo: supplier.fertilizerRegNo || '',
        fertilizerRegExpiry: supplier.fertilizerRegExpiry || '',
        isInternal: supplier.isInternal || 'external',
        settlementType: supplier.settlementType || '',
        creditDays: supplier.creditDays ? String(supplier.creditDays) : '',
        rating: supplier.rating ? String(supplier.rating) : '',
      });
      // 2026-09-28 审计修复：地区级联节点此前从不同步 → 编辑已有供应商时省市显示为空，
      // 且跨供应商残留（编辑 A 后取消再编辑 B，界面仍显示 A 的省市）。
      // 这里按当前供应商的 province/city 重建节点；数据缺失则清空，避免串档。
      // CascaderValueNode 需要 { id, name }（见 ui/Cascader.tsx:18）——用区域名做键，仅为回显
      setRegionPathNodes(
        supplier.province
          ? [
              { id: 0, name: supplier.province },
              ...(supplier.city ? [{ id: 1, name: supplier.city }] : []),
            ]
          : []
      );
    }
    // 2026-09-28 审计修复：依赖加 isOpen——弹窗常驻挂载，同一供应商"改→取消→再编辑"时
    // supplier 引用不变、effect 不重跑，表单里留的是上次被放弃的草稿，直接保存就会写库
  }, [supplier, isOpen]);

  const handleChange = (field: keyof EditFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!supplier) return;

    // 格式验证（对标 iAGS purchaserManagement 第613-670行）
    const errors = runValidations([
      { field: 'mobilePhone', valid: validateMobilePhone(form.mobilePhone), message: '手机号格式不正确，应为1开头的11位数字' },
      { field: 'workPhone', valid: validateWorkPhone(form.workPhone), message: '工作电话格式不正确，应为区号-号码格式（如：0571-88886666）' },
      { field: 'fax', valid: validateFax(form.fax), message: '传真格式不正确' },
      { field: 'bankCardNumber', valid: validateBankCard(form.bankCardNumber), message: '银行卡号格式不正确，应为15位或17-18位数字' },
    ]);
    if (errors.length > 0) {
      showAlert(`请检查以下字段：\n${errors.map(e => e.message).join('\n')}`);
      return;
    }

    // 2026-09-29 审计修复：await 保存结果 —— 此前同步返回 undefined，
    // UnifiedModal 的 `await onSubmit(); setIsSubmitting(false)` 立即复位，
    // 按钮禁用窗口≈0，双击"保存"会发两次 PUT（多一次全库落盘）。
    await onSave({
      ...supplier,
      ...form,
      // 2026-09-28 批次C：数值列显式转换（表单里是文本，直接落库会被 SQLite 存成字符串）
      creditDays: Number(form.creditDays) || 0,
      rating: Number(form.rating) || 0,
    });
  };

  // 当前供应类型强制要求的证照（用于表单高亮；不强制时返回 null）
  const requiredKind = requiredKindForType(form.supplierType);

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
                className={inputClass}
              />
            </div>

            {/* 供应类型 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">供应类型 *</Label>
              <Select
                value={form.supplierType}
                onValueChange={(val) => handleChange('supplierType', val)}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="请选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {/* 2026-09-29 审计修复：移除"请选择类型"空选项。
                      选中它会把 supplierType 置为空串并落库，导致该供应商的资质判定
                      由「未登记」变为「不适用」（合规检查形同虚设）。未选状态由 placeholder 表达即可。 */}
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
                <SelectTrigger className={inputClass}>
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
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="请选择组织" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">请选择组织</SelectItem>
                  {SUPPLIER_ORGANIZATION_OPTIONS.map(org => (
                    <SelectItem key={org} value={org}>{org}</SelectItem>
                  ))}
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
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="合作中" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_STATUS_OPTIONS.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
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
                className={inputClass}
              />
            </div>

            {/* 移动电话 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">移动电话 *</Label>
              <Input
                type="text"
                value={form.mobilePhone}
                onChange={(e) => handleChange('mobilePhone', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 工作电话 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">工作电话</Label>
              <Input
                type="text"
                value={form.workPhone}
                onChange={(e) => handleChange('workPhone', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 传真 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">传真</Label>
              <Input
                type="text"
                value={form.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 国家 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">国家</Label>
              <Input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className={inputClass}
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
                className={inputClass}
              />
            </div>

            {/* 开户行 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">开户行</Label>
              <Input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 银行卡号 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">银行卡号</Label>
              <Input
                type="text"
                value={form.bankCardNumber}
                onChange={(e) => handleChange('bankCardNumber', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 2026-09-28 批次B 合规风控：资质证照（三类全展示，当前类型要求的标红星） */}
            <div className="col-span-2 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="block text-sm font-medium text-gray-700">资质证照</Label>
                <span className={`text-xs ${requiredKind ? 'text-orange-600' : 'text-gray-400'}`}>
                  {requiredKind
                    ? `当前「${getSupplierTypeName(form.supplierType)}」须持${QUALIFICATION_LABELS[requiredKind]}`
                    : '当前供应类型不强制持证'}
                </span>
              </div>
              <div className="space-y-3">
                {QUALIFICATION_ROWS.map((row) => {
                  const isRequired = row.kind === requiredKind;
                  return (
                    <div key={row.kind} className="flex items-center gap-3">
                      <Label className="w-32 shrink-0 text-sm text-gray-700">
                        {row.label}
                        {isRequired && <span className="text-red-500 ml-0.5" title="当前供应类型强制要求">*</span>}
                      </Label>
                      <Input
                        type="text"
                        value={String(form[row.noField] ?? '')}
                        onChange={(e) => handleChange(row.noField as keyof EditFormData, e.target.value)}
                        placeholder="证号"
                        className={`flex-1 ${inputClass}`}
                      />
                      <Input
                        type="date"
                        value={String(form[row.expiryField] ?? '')}
                        onChange={(e) => handleChange(row.expiryField as keyof EditFormData, e.target.value)}
                        title="有效期至"
                        className={`w-44 shrink-0 ${inputClass}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2026-09-28 批次C 经营决策：内部自产 / 结算方式 / 账期 / 评级 */}
            <div className="col-span-2 border-t border-gray-200 pt-4">
              <Label className="block text-sm font-medium text-gray-700 mb-3">经营决策</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">内部自产标记</Label>
                  <Select
                    value={form.isInternal}
                    onValueChange={(val) => handleChange('isInternal', val)}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="外部采购" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_INTERNAL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">结算方式</Label>
                  <Select
                    value={form.settlementType}
                    onValueChange={(val) => handleChange('settlementType', val)}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="请选择结算方式" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* 空 value 项不可省：ui/Select 把 '' 映射为 sentinel（非空），
                          无匹配项时 Radix 不渲染 placeholder，触发器会是空白 */}
                      <SelectItem value="">未设置</SelectItem>
                      {SUPPLIER_SETTLEMENT_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">账期天数</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.creditDays}
                    onChange={(e) => handleChange('creditDays', e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">{SUPPLIER_RATING_LABEL}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={form.rating}
                    onChange={(e) => handleChange('rating', e.target.value)}
                    placeholder={SUPPLIER_RATING_HINT}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* 备注 */}
            <div className="col-span-2">
              <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
              <TextArea
                value={form.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
        </div>
    </UnifiedModal>
  );
}
