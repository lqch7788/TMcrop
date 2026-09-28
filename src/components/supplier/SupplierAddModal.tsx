// 供应商新增弹窗组件 - 参照物料入库 InboundAddModal 样式
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Supplier, NewSupplierData, SUPPLIER_STATUS_OPTIONS, SUPPLIER_ORGANIZATION_OPTIONS, SUPPLIER_SETTLEMENT_OPTIONS, SUPPLIER_INTERNAL_OPTIONS, SUPPLIER_RATING_LABEL, SUPPLIER_RATING_HINT } from './types';
import { getSupplierTypeName } from './data';
import { QUALIFICATION_ROWS, QUALIFICATION_LABELS, requiredKindForType } from './qualification';
import SupplierCodeGenerator from './SupplierCodeGenerator';
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

interface SupplierAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 2026-09-28：允许返回 false 表示保存失败（弹窗据此保留草稿） */
  onAdd: (supplier: Supplier) => void | Promise<unknown>;
}

// 2026-09-28：编码生成器已移入本弹窗（原为页面生成→复制→粘贴，改为一键回填），
// 原 generatedCode 外部注入通道随之移除
export default function SupplierAddModal({ isOpen, onClose, onAdd }: SupplierAddModalProps) {
  // 深度输入框样式（与其他 AddModal 一致）
  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

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
    remarks: '',
    // 2026-09-28 批次B/C：资质证照 + 经营决策
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

  // 2026-09-28：拖动/最大化/提交中禁用改由 UnifiedModal（ui/Modal）统一提供，
  // 本组件不再自管 isMaximized/isDragging/submitting 状态（此前为自绘弹窗遗留）

  const handleChange = (field: keyof NewSupplierData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 当前供应类型强制要求的证照（用于表单高亮；不强制时返回 null）
  const requiredKind = requiredKindForType(form.supplierType);

  /** 表单重置（提交成功 / 关闭时共用） */
  const resetForm = () => {
    setRegionPathNodes([]);
    setForm({
      organization: '', code: '', name: '', supplierType: '', supplierAttribute: '',
      contact: '', mobilePhone: '', workPhone: '', fax: '', country: '中国',
      province: '', city: '', address: '', status: '合作中',
      bankName: '', bankCardNumber: '', remarks: '',
      pesticideLicenseNo: '', pesticideLicenseExpiry: '', seedFilingNo: '', seedFilingExpiry: '',
      fertilizerRegNo: '', fertilizerRegExpiry: '',
      isInternal: 'external', settlementType: '', creditDays: '', rating: ''
    });
  };

  const handleSubmit = async () => {
    // 2026-09-28 审计修复：必填校验——UI 上带 * 的 6 个字段此前**完全不校验**
    // （validators 对空串一律放行），空编码+空名称可直接提交并落库
    const requiredFields: Array<{ key: keyof typeof form; label: string }> = [
      { key: 'organization', label: '所属组织' },
      { key: 'code', label: '供应商编号' },
      { key: 'name', label: '供应商名称' },
      { key: 'supplierType', label: '供应类型' },
      { key: 'supplierAttribute', label: '供应商属性' },
      { key: 'contact', label: '联系人' },
      { key: 'mobilePhone', label: '移动电话' },
    ];
    const missing = requiredFields.filter((f) => !String(form[f.key] || '').trim()).map((f) => f.label);
    if (missing.length > 0) {
      await showAlert(`请填写必填项：${missing.join('、')}`);
      return;
    }

    // 格式验证（对标 iAGS purchaserManagement 第613-670行）
    const errors = runValidations([
      { field: 'mobilePhone', valid: validateMobilePhone(form.mobilePhone), message: '请输入移动电话号码' },
      { field: 'workPhone', valid: validateWorkPhone(form.workPhone), message: '请输入工作电话号码' },
      { field: 'fax', valid: validateFax(form.fax), message: '请输入传真号码' },
      { field: 'bankCardNumber', valid: validateBankCard(form.bankCardNumber), message: '请输入银行卡号' },
      { field: 'code', valid: validateCode(form.code), message: '标识码只能包含字母、数字、下划线和连字符' },
    ]);
    if (errors.length > 0) {
      await showAlert(`请检查以下字段：\n${errors.map(e => e.message).join('\n')}`);
      return;
    }

    const newSupplier: Supplier = {
      id: form.code, // 2026-09-28：id 用编码（string），与后端 TEXT 主键一致（原 Date.now() 是数字，类型不符）
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      // 2026-09-28 批次C：数值列显式转换（表单里是文本，直接落库会被 SQLite 存成字符串）
      creditDays: Number(form.creditDays) || 0,
      rating: Number(form.rating) || 0,
      // 2026-09-28：建档日期不再由用户填写，提交当天即建档日（列表「创建时间」列／详情弹窗照常展示）
      createDate: todayLocal(),
    };
    // 2026-09-28 审计修复：等待保存结果——失败时保留草稿（此前先清表单，用户 18 个字段白填）
    // 防重复提交由 UnifiedModal 的 isSubmitting 承担（提交期间按钮禁用）
    const ok = await (onAdd as unknown as (s: Supplier) => Promise<unknown> | unknown)(newSupplier);
    if (ok === false) return;
    resetForm();
  };

  // 2026-09-28 审计修复：关闭时重置草稿——组件常驻挂载，此前取消后再打开会带出上一单内容
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isOpen) resetForm(); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增供应商"
      size="xxxl"
      // 显式给宽度：Modal 定位用 sizeDefaults.xxxl(1350px)，而 CSS 上限是 max-w-6xl(1152px)，
      // 两者不一致 → 在 ≤1380 宽的屏幕上按 1350 居中会把左边缘算到屏幕外（标题被裁）。
      // 这里对齐到 1152（= 原自绘弹窗的 max-w-6xl），与 CSS 上限一致。
      width={1152}
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="提交"
      cancelText="取消"
    >
        {/* 基本信息区域 */}
        <div className="p-4 bg-emerald-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 供应商编号（占一列，不再横跨两列） */}
            <div>
              <Label className="block text-xs font-medium text-emerald-700 mb-1">供应商编号 *</Label>
              <Input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="手动输入或点击生成"
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

            {/* 供应类型（大类）—— 排在「编码中类」之前：先选大类才能选中类 */}
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

            {/* 编码中类 + 生成按钮（与编号/名称/供应类型同一行）：选中类 → 生成 → 直接回填编号字段 */}
            <div>
              <Label className="block text-xs font-medium text-emerald-700 mb-1">编码中类</Label>
              <SupplierCodeGenerator
                bigCategory={form.supplierType}
                onGenerated={(code) => setForm(prev => ({ ...prev, code }))}
              />
            </div>
          </div>

          {/* 第二行：属性/组织/联系人/移动电话/状态 五个字段同行（独立 5 列，避免第 5 个被挤到下一行） */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
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
                  {/* 2026-09-28：选项取自 types.ts 常量，消除 4 处硬编码 */}
                  {SUPPLIER_ORGANIZATION_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
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
                  {/* 2026-09-28：三态选项取自 types.ts 常量（与合作中/暂停/终止 → active/paused/terminated 映射一致） */}
                  {SUPPLIER_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
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

            {/* 详细地址（与省/市/区同一行：省市区占 1 列，地址占 2 列） */}
            <div className="col-span-2">
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

            {/* 2026-09-28 批次B 合规风控：资质证照（三类全展示，当前类型要求的标红星） */}
            <div className="col-span-3 border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="block text-xs font-medium text-gray-700">资质证照</Label>
                <span className={`text-xs ${requiredKind ? 'text-orange-600' : 'text-gray-400'}`}>
                  {requiredKind
                    ? `当前「${getSupplierTypeName(form.supplierType)}」须持${QUALIFICATION_LABELS[requiredKind]}`
                    : '当前供应类型不强制持证'}
                </span>
              </div>
              <div className="space-y-2">
                {QUALIFICATION_ROWS.map((row) => {
                  const isRequired = row.kind === requiredKind;
                  return (
                    <div key={row.kind} className="flex items-center gap-3">
                      <Label className="w-28 shrink-0 text-xs text-gray-700">
                        {row.label}
                        {isRequired && <span className="text-red-500 ml-0.5" title="当前供应类型强制要求">*</span>}
                      </Label>
                      <Input
                        type="text"
                        value={String(form[row.noField] ?? '')}
                        onChange={(e) => handleChange(row.noField as keyof NewSupplierData, e.target.value)}
                        placeholder="证号"
                        className={`flex-1 ${deepInputClass}`}
                      />
                      <Input
                        type="date"
                        value={String(form[row.expiryField] ?? '')}
                        onChange={(e) => handleChange(row.expiryField as keyof NewSupplierData, e.target.value)}
                        title="有效期至"
                        className={`w-40 shrink-0 ${deepInputClass}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2026-09-28 批次C 经营决策：内部自产 / 结算方式 / 账期 / 评级（四个字段同一行） */}
            <div className="col-span-3 border-t border-gray-200 pt-3">
              <Label className="block text-xs font-medium text-gray-700 mb-2">经营决策</Label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="block text-xs font-medium text-gray-700 mb-1">内部自产标记</Label>
                  <Select
                    value={form.isInternal}
                    onValueChange={(val) => handleChange('isInternal', val)}
                  >
                    <SelectTrigger className={deepInputClass}>
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
                  <Label className="block text-xs font-medium text-gray-700 mb-1">结算方式</Label>
                  <Select
                    value={form.settlementType}
                    onValueChange={(val) => handleChange('settlementType', val)}
                  >
                    <SelectTrigger className={deepInputClass}>
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
                  <Label className="block text-xs font-medium text-gray-700 mb-1">账期天数</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.creditDays}
                    onChange={(e) => handleChange('creditDays', e.target.value)}
                    placeholder="0"
                    className={deepInputClass}
                  />
                </div>

                <div>
                  <Label className="block text-xs font-medium text-gray-700 mb-1">{SUPPLIER_RATING_LABEL}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={form.rating}
                    onChange={(e) => handleChange('rating', e.target.value)}
                    placeholder={SUPPLIER_RATING_HINT}
                    className={deepInputClass}
                  />
                </div>
              </div>
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

        {/* 底部按钮由 UnifiedModal 统一渲染（showFooter + onSubmit） */}
    </UnifiedModal>
  );
}
