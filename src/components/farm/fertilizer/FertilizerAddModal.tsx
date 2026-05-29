/**
 * 施肥新增弹窗组件
 * 4个区域：基础信息、肥料与用量、位置与时间、操作与备注
 * 使用 UnifiedModal 包装，提交时调用 store.createItem()
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { TextArea } from '../../ui/TextArea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/select';
import { DictSelect } from '../../common/settings/DictSelect';
import { GreenhouseSelect } from '../../common/settings/GreenhouseSelect';
import CropCodeSelector from '../../farm/common/CropCodeSelector';
import { useFertilizerStore, useProductionPlanStore } from '@/stores';
import { validateDateNotFuture } from '@/lib/validators';
import FertilizerCodeGenerator from './FertilizerCodeGenerator';
import type { CropVariety } from '@/types/cropVariety';
import { showAlert } from '@/lib/dialogService';

interface FertilizerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 默认表单数据
const defaultForm = {
  fertilizerCode: '',
  fertilizerName: '',
  fertilizerType: '',
  cropName: '',
  greenhouseName: '',
  dilutionRatio: '',
  quantity: 0,
  unit: '千克',
  unitPrice: 0,
  totalCost: 0,
  fertilizeTime: '',
  operatorName: '',
  dataSource: 'manual' as const,
  description: '',
};

export function FertilizerAddModal({ isOpen, onClose, onSaved }: FertilizerAddModalProps) {
  const store = useFertilizerStore();

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 生产计划搜索状态
  const [planSearchKeyword, setPlanSearchKeyword] = useState('');
  const [selectedPlanLabel, setSelectedPlanLabel] = useState(''); // 选中显示文本
  const [showPlanSearch, setShowPlanSearch] = useState(false);
  const planSearchRef = useRef<HTMLDivElement>(null);

  // 获取生产计划列表（过滤已完成）
  const planOptions = useMemo(() => {
    const plans = useProductionPlanStore.getState().plans;
    const activePlans = plans.filter(p => p.status !== 'completed');
    if (!planSearchKeyword.trim()) return activePlans;
    const kw = planSearchKeyword.toLowerCase();
    return activePlans.filter(p =>
      p.batchCode.toLowerCase().includes(kw) ||
      (p.cropName || '').toLowerCase().includes(kw)
    );
  }, [planSearchKeyword]);

  // 点击外部关闭计划搜索
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (planSearchRef.current && !planSearchRef.current.contains(e.target as Node)) {
        setShowPlanSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 作物选择处理
  const handleCropCodeChange = useCallback((code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setCropCode(varietyInfo.cropCode);
      const cropNameValue = varietyInfo.detailVarietyCode && varietyInfo.detailVarietyCode !== '00'
        ? varietyInfo.varietyName
        : (varietyInfo.subVariety1Name || varietyInfo.varietyName);
      setForm(prev => ({
        ...prev,
        cropName: cropNameValue,
      }));
    }
  }, []);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm);
      setCropCode('');
      setSelectedCrop(null);
      setPlanSearchKeyword('');
      setSelectedPlanLabel('');
    }
  }, [isOpen]);

  // 更新表单字段
  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // 自动计算总成本 = 施肥量 * 单价
      if (field === 'quantity' || field === 'unitPrice') {
        next.totalCost = (field === 'quantity' ? value : prev.quantity) * (field === 'unitPrice' ? value : prev.unitPrice);
      }
      return next;
    });
  }, []);

  // 提交表单
  const handleSubmit = async () => {
    if (!form.fertilizerName.trim()) return; // 基本校验
    // 方案5.1: 施肥日期不能大于当前时间
    if (form.fertilizeTime && !validateDateNotFuture(form.fertilizeTime)) {
      await showAlert('施肥日期不能大于当前时间');
      return;
    }
    setSubmitting(true);
    await store.createItem({
      fertilizerCode: form.fertilizerCode,
      fertilizerName: form.fertilizerName,
      fertilizerType: form.fertilizerType,
      cropName: form.cropName,
      greenhouseName: form.greenhouseName,
      dilutionRatio: form.dilutionRatio,
      quantity: form.quantity,
      unit: form.unit,
      unitPrice: form.unitPrice,
      totalCost: form.totalCost,
      fertilizeTime: form.fertilizeTime,
      operatorName: form.operatorName,
      dataSource: form.dataSource,
      description: form.description,
    });
    setSubmitting(false);
    onSaved();
  };

  // 区域标题（纯文本粗体，无折叠功能）
  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增施肥记录"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">施肥编号</Label>
                <FertilizerCodeGenerator
                  value={form.fertilizerCode}
                  onChange={(code) => updateField('fertilizerCode', code)}
                />
              </div>
              <div>
                <Label className="text-gray-900">数据来源</Label>
                <Select
                  value={form.dataSource}
                  onValueChange={(val) => updateField('dataSource', val)}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <SelectValue placeholder="手动录入" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动录入</SelectItem>
                    <SelectItem value="auto_iot">IoT自动</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div ref={planSearchRef} className="relative">
                <Label className="text-gray-900">关联生产计划</Label>
                {/* 已选中计划（包括"不关联"选项） */}
                {selectedPlanLabel ? (
                  <div className={`p-2 border rounded-lg ${
                    form.productionPlanCode
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        form.productionPlanCode ? 'text-blue-800' : 'text-gray-500'
                      }`}>
                        {selectedPlanLabel}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          updateField('productionPlanCode', '');
                          updateField('productionPlanId', '');
                          setPlanSearchKeyword('');
                          setSelectedPlanLabel('');
                        }}
                      >
                        <X className={`w-4 h-4 ${form.productionPlanCode ? 'text-blue-600' : 'text-gray-400'}`} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex">
                      <Input
                        type="text"
                        value={planSearchKeyword}
                        onChange={(e) => { setPlanSearchKeyword(e.target.value); setShowPlanSearch(true); }}
                        onFocus={() => setShowPlanSearch(true)}
                        placeholder="搜索生产计划批次号..."
                        className="flex-1 px-3 py-2 border border-gray-400 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowPlanSearch(!showPlanSearch)}
                        className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg"
                      >
                        <Search className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                    {/* 下拉选项 */}
                    {showPlanSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {/* 第一个选项：不关联 */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateField('productionPlanCode', '');
                            updateField('productionPlanId', '');
                            setPlanSearchKeyword('');
                            setSelectedPlanLabel('不关联生产计划');
                            setShowPlanSearch(false);
                          }}
                          className="w-full justify-start rounded-none border-b border-gray-100"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">不关联生产计划</span>
                        </Button>
                        {planOptions.length > 0 ? (
                          planOptions.map((plan) => (
                            <Button
                              key={plan.id}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateField('productionPlanId', plan.id);
                                updateField('productionPlanCode', plan.batchCode);
                                setPlanSearchKeyword(plan.batchCode);
                                setSelectedPlanLabel(plan.batchCode);
                                setShowPlanSearch(false);
                              }}
                              className="w-full justify-start rounded-none border-b border-gray-100 last:border-b-0"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">{plan.batchCode}</p>
                                <p className="text-xs text-gray-500">{plan.cropName || ''} · {plan.greenhouseName || ''}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                plan.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                                plan.status === 'planned' ? 'bg-amber-100 text-amber-600' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {plan.status === 'in_progress' ? '进行中' : plan.status === 'planned' ? '计划中' : plan.status}
                              </span>
                            </Button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-400">
                            无匹配的生产计划
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <Label className="text-gray-900">关联种植记录</Label>
                <Input
                  type="text"
                  value={form.plantingCode || ''}
                  onChange={(e) => updateField('plantingCode', e.target.value)}
                  placeholder="可选，输入种植记录编号"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 肥料与用量 */}
        <div>
          <SectionTitle title="肥料与用量" icon="🧪" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">肥料类型</Label>
                <DictSelect
                  category="fertilizer_type"
                  value={form.fertilizerType}
                  onChange={(value) => updateField('fertilizerType', value)}
                  placeholder="选择肥料类型"
                />
              </div>
              <div>
                <Label className="text-gray-900">
                  肥料名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={form.fertilizerName}
                  onChange={(e) => updateField('fertilizerName', e.target.value)}
                  placeholder="请输入肥料名称"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-900">稀释比例</Label>
                <Input
                  type="text"
                  value={form.dilutionRatio}
                  onChange={(e) => updateField('dilutionRatio', e.target.value)}
                  placeholder="如 1:500"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label className="text-gray-900">施肥量</Label>
                <Input
                  type="number"
                  value={form.quantity || ''}
                  onChange={(e) => updateField('quantity', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label className="text-gray-900">单位</Label>
                <DictSelect
                  category="unit"
                  value={form.unit}
                  onChange={(value) => updateField('unit', value)}
                  placeholder="选择单位"
                />
              </div>
              <div>
                <Label className="text-gray-900">单价 (元/{form.unit || '单位'})</Label>
                <Input
                  type="number"
                  value={form.unitPrice || ''}
                  onChange={(e) => updateField('unitPrice', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-900">总成本（自动计算）</Label>
              <Input
                type="text"
                value={`${form.totalCost.toFixed(2)} 元`}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-green-50 font-bold text-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* Section 3: 位置与时间 */}
        <div>
          <SectionTitle title="位置与时间" icon="📍" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">温室位置</Label>
                <Input
                  type="text"
                  value={form.greenhouseName}
                  onChange={(e) => updateField('greenhouseName', e.target.value)}
                  placeholder="请输入温室位置"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label className="text-gray-900">作物品种</Label>
                <CropCodeSelector
                  value={cropCode}
                  onChange={handleCropCodeChange}
                  placeholder="搜索或选择作物品种..."
                  size="md"
                  showFullPath={true}
                />
                {selectedCrop && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <div className="text-emerald-700">
                      {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                      {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-gray-900">施肥时间</Label>
              <Input
                type="datetime-local"
                value={form.fertilizeTime}
                onChange={(e) => updateField('fertilizeTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: 操作与备注 */}
        <div>
          <SectionTitle title="操作与备注" icon="📝" />
          <div className="space-y-3">
            <div>
              <Label className="text-gray-900">操作员</Label>
              <Input
                type="text"
                value={form.operatorName}
                onChange={(e) => updateField('operatorName', e.target.value)}
                placeholder="请输入操作员名称"
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-gray-900">备注</Label>
              <TextArea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="请输入备注信息"
                rows={3}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !form.fertilizerName.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
