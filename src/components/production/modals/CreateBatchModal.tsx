/**
 * 新增生产计划批次弹窗
 */

import { Modal, FormField, Input, Select, Textarea } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { RefreshCw, ChevronDown, ChevronUp, FileText, Send, Upload, Leaf } from 'lucide-react';
// M-07: 移除未使用的 RadixSelect import（之前定义了但实际未使用）
import { Checkbox } from '@/components/ui';
import { CropBatch, Greenhouse, CropOrder, PlanType, PlanTypeLabels, PlanTypeColors } from '../../../types';
import { RESPONSIBLE_PERSONS, planTypeOptions, getModesByPlanType } from '../constants';
import { useState, useEffect, useRef } from 'react';
import { CropVariety } from '../../../types/cropVariety';
import CropCodeSelector from '../../farm/common/CropCodeSelector';
import { DictSelect } from '../../common/settings/DictSelect';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onSubmitForApproval: () => void;
  formData: {
    batchCode: string;
    planType: PlanType;
    planTypeName: string;
    cropCode: string;
    cropName: string;
    variety: string;
    greenhouseId: string[];
    plantingArea: string;
    plantingAreaUnit: string;
    startDate: string;
    expectedHarvestDate: string;
    targetYield: string;
    unit: string;
    plantingMode: string[];
    responsiblePerson: string;
    publisher: string;
    description: string;
    planDetail: string;
    orderId: string[];
    orderCode: string[];
  };
  errors: Record<string, string>;
  greenhouses: Greenhouse[];
  orders: CropOrder[];
  // M-08: 移除 any，value 限定为 string / string[] / number / null
  onFormChange: (field: string, value: string | string[] | number | null) => void;
  onGenerateCode: () => void;
}

export function CreateBatchModal({
  isOpen,
  onClose,
  onSaveDraft,
  onSubmitForApproval,
  formData,
  errors,
  greenhouses,
  orders,
  onFormChange,
  onGenerateCode,
}: CreateBatchModalProps) {
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);
  const [greenhouseExpanded, setGreenhouseExpanded] = useState(false);
  const [plantingModeExpanded, setPlantingModeExpanded] = useState(false);
  const [orderExpanded, setOrderExpanded] = useState(false);
  const inputClass = "w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  // 跟踪最近选中的订单 ID；多订单 cropCode 不一致时，以用户最后勾选/取消的订单为准
  const lastSelectedOrderIdRef = useRef<string | null>(null);

  // L-06: 受控 input ref 复用 + cleanup（之前每次点击都 new 一个 input 未清理）
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    return () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current = null;
      }
    };
  }, []);

  // 弹窗关闭时重置最近选中订单 ref（避免下次开弹窗残留）
  useEffect(() => {
    if (!isOpen) {
      lastSelectedOrderIdRef.current = null;
    }
  }, [isOpen]);

  const handleCropChange = (code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      onFormChange('cropCode', varietyInfo.cropCode);
      onFormChange('variety', varietyInfo.subVariety1Name || varietyInfo.varietyName);
      onFormChange('cropName', varietyInfo.varietyName);
    } else {
      setSelectedCrop(null);
      onFormChange('cropCode', '');
      onFormChange('variety', '');
      onFormChange('cropName', '');
    }
  };

  // 从订单自动填充作物品种：直接用订单自身字段，
  // 不依赖前端品种库（前端 cropVarietyService 用 localStorage，与后端 SQLite 不同源，查不到数据）
  // 注意：订单 AddModal 已废弃 cropName 字段（始终为空），真正的品种名是 cropVariety
  const autoFillCropFromOrder = (order: CropOrder) => {
    setSelectedCrop(null);
    onFormChange('cropCode', order.cropCode || '');
    onFormChange('variety', order.cropVariety || '');
    // 兼容下游 batch.cropName 写入：把 cropVariety 同步给 cropName
    onFormChange('cropName', order.cropVariety || '');
  };

  const clearCropFields = () => {
    setSelectedCrop(null);
    onFormChange('cropCode', '');
    onFormChange('variety', '');
    onFormChange('cropName', '');
  };

  // 订单勾选/取消：勾选 → 自动关联品种；取消最后一个 → 清空品种字段
  const handleOrderToggle = (order: CropOrder, checked: boolean) => {
    if (checked) {
      const newOrderIds = [...formData.orderId, order.id];
      const newOrderCodes = [...formData.orderCode, order.orderCode];
      onFormChange('orderId', newOrderIds);
      onFormChange('orderCode', newOrderCodes);
      lastSelectedOrderIdRef.current = order.id;
      autoFillCropFromOrder(order);
    } else {
      const newOrderIds = formData.orderId.filter(id => id !== order.id);
      const newOrderCodes = formData.orderCode.filter(code => code !== order.orderCode);
      onFormChange('orderId', newOrderIds);
      onFormChange('orderCode', newOrderCodes);

      if (newOrderIds.length === 0) {
        // 全部取消 → 清空品种
        lastSelectedOrderIdRef.current = null;
        clearCropFields();
      } else if (lastSelectedOrderIdRef.current === order.id) {
        // 取消的是当前"最近"订单 → 切到剩余的最后一个，并刷新品种
        const newLastId = newOrderIds[newOrderIds.length - 1];
        lastSelectedOrderIdRef.current = newLastId;
        const newLastOrder = orders.find(o => o.id === newLastId);
        if (newLastOrder) {
          autoFillCropFromOrder(newLastOrder);
        }
      }
    }
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          onFormChange('planDetail', event.target?.result as string);
          onFormChange('planDetailFileName', file.name);
        };
        reader.readAsText(file);
      }
    };
    fileInputRef.current = input;
    input.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增生产计划批次"
      // 2026-06-10: 统一 4 页面 × 新增/编辑弹窗尺寸 = 900×650
      size="xl"
      width={900}
      height={650}
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button size="sm" variant="secondary" onClick={onSaveDraft}><FileText className="w-4 h-4" /> 存为草稿</Button>
          <Button size="sm" variant="default" onClick={onSubmitForApproval}><Send className="w-4 h-4" /> 提交审批</Button>
        </div>
      }
    >
      <div className="space-y-4 modal-form-inputs">
        {/* 第一行：计划类型（按钮组，横跨整行） */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 w-20 shrink-0">计划类型</span>
          <div className="flex gap-2">
            {planTypeOptions.map((option) => {
              const isSelected = formData.planType === option.value;
              return (
                <div
                  key={option.value}
                  onClick={() => {
                    onFormChange('planType', option.value);
                    onFormChange('planTypeName', option.label);
                  }}
                  className={`
                    px-4 py-2 rounded-lg cursor-pointer border-2 transition-all text-sm font-medium
                    ${isSelected
                      ? `border-emerald-500 ${option.color.bg} ${option.color.text}`
                      : 'border-gray-300 hover:border-gray-400 bg-white text-gray-700'}
                  `}
                >
                  {option.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* 第二行：批次号 + 发布人 */}
        <div className="grid grid-cols-2 gap-4 items-start">
          <FormField label="生产计划批次号" required error={errors.batchCode}>
            <div className="flex gap-2 items-center w-full">
              <div className="flex-1">
                <Input
                  value={formData.batchCode}
                  onChange={(e) => onFormChange('batchCode', e.target.value)}
                  placeholder="点击生成获取编号"
                  className="w-full"
                />
              </div>
              <Button size="sm" onClick={onGenerateCode}>
                <RefreshCw className="w-4 h-4" />
                生成
              </Button>
            </div>
          </FormField>
          <FormField label="发布人">
            <Input value={formData.publisher} disabled className="w-full bg-gray-50" />
          </FormField>
        </div>

        {/* 第三行：关联订单 + 作物品种 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">关联订单</span>
              <button
                type="button"
                onClick={() => setOrderExpanded(!orderExpanded)}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
              >
                {orderExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {orderExpanded ? '收起' : '展开'}
              </button>
            </div>
            {orderExpanded ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {orders
                  .filter(o => o.status === 'planned' || o.status === 'in_progress')
                  .map(order => (
                    <div key={order.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`order-${order.id}`}
                        checked={formData.orderId.includes(order.id)}
                        onCheckedChange={(checked) => handleOrderToggle(order, checked === true)}
                      />
                      <label htmlFor={`order-${order.id}`} className="text-sm cursor-pointer">
                        {order.orderCode} - {order.orderName} ({order.cropVariety})
                      </label>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 flex items-center">
                {formData.orderId.length === 0 ? '未选择' : formData.orderId.map(id => orders.find(o => o.id === id)?.orderCode).filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <div>
            <FormField label="作物品种" required error={errors.variety}>
              {/* 选了关联订单 → 渲染只读展示框（直接读订单的 cropName + cropVariety，不查前端品种库）；
                  未选 → 渲染可手动选的 CropCodeSelector */}
              {formData.orderId.length > 0 ? (
                <div className="w-full h-8 px-3 border border-gray-400 rounded-lg shadow-inner bg-gray-100 cursor-not-allowed flex items-center text-sm gap-2">
                  <Leaf className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="truncate text-gray-900">
                    {/* 订单的品种名就是 cropVariety（订单 AddModal 已废弃 cropName 字段） */}
                    {formData.variety || '(订单未填作物品种)'}
                  </span>
                  {formData.cropCode && (
                    <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                      {formData.cropCode}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <CropCodeSelector
                    value={formData.cropCode || ''}
                    onChange={handleCropChange}
                    placeholder="搜索或选择作物品种..."
                    size="sm"
                    showFullPath={true}
                  />
                  {selectedCrop && (
                    <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs">
                      <span className="text-emerald-700">
                        {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                        {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </FormField>
          </div>
        </div>

        {/* 第四行：种植区域 + 生产模式 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">种植区域<span className="text-red-500 ml-1">*</span></span>
              <button
                type="button"
                onClick={() => setGreenhouseExpanded(!greenhouseExpanded)}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
              >
                {greenhouseExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {greenhouseExpanded ? '收起' : '展开'}
              </button>
            </div>
            {greenhouseExpanded ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {greenhouses.filter(g => g.status === 'active').map(g => (
                  <div key={g.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`gh-${g.id}`}
                      checked={formData.greenhouseId.includes(g.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onFormChange('greenhouseId', [...formData.greenhouseId, g.id]);
                        } else {
                          onFormChange('greenhouseId', formData.greenhouseId.filter(id => id !== g.id));
                        }
                      }}
                    />
                    <label htmlFor={`gh-${g.id}`} className="text-sm cursor-pointer">{g.name}</label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 flex items-center">
                {formData.greenhouseId.length === 0 ? '请选择' : formData.greenhouseId.map(id => greenhouses.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
              </div>
            )}
            {errors.greenhouseId && <p className="text-sm text-red-500 mt-1">{errors.greenhouseId}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">生产模式<span className="text-red-500 ml-1">*</span></span>
              <button
                type="button"
                onClick={() => setPlantingModeExpanded(!plantingModeExpanded)}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
              >
                {plantingModeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {plantingModeExpanded ? '收起' : '展开'}
              </button>
            </div>
            {plantingModeExpanded ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {getModesByPlanType(formData.planType).map(mode => (
                  <div key={mode.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`pm-${mode.value}`}
                      checked={formData.plantingMode.includes(mode.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onFormChange('plantingMode', [...formData.plantingMode, mode.value]);
                        } else {
                          onFormChange('plantingMode', formData.plantingMode.filter(m => m !== mode.value));
                        }
                      }}
                    />
                    <label htmlFor={`pm-${mode.value}`} className="text-sm cursor-pointer">{mode.label}</label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 flex items-center">
                {formData.plantingMode.length === 0 ? '请选择' : formData.plantingMode.map(m => getModesByPlanType(formData.planType).find(mode => mode.value === m)?.label).filter(Boolean).join(', ')}
              </div>
            )}
            {errors.plantingMode && <p className="text-sm text-red-500 mt-1">{errors.plantingMode}</p>}
          </div>
        </div>

        {/* 第五行：开始时间 + 预计结束时间 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField label="开始时间" required error={errors.startDate}>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => onFormChange('startDate', e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
          <div>
            <FormField label="预计结束时间" required error={errors.expectedHarvestDate}>
              <Input
                type="date"
                value={formData.expectedHarvestDate}
                onChange={(e) => onFormChange('expectedHarvestDate', e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
        </div>

        {/* 第六行：负责人 + 目标产量 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField label="负责人" required error={errors.responsiblePerson}>
              <Select
                value={formData.responsiblePerson}
                onChange={(e) => onFormChange('responsiblePerson', e.target.value)}
                options={RESPONSIBLE_PERSONS.map(name => ({ value: name, label: name }))}
              />
            </FormField>
          </div>
          {/* 2026-06-14: 按计划类型分流 */}
          {formData.planType === 'seedling' ? (
            /* 育苗计划：投入 + 产出（单位锁定为"株"） */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FormField label="目标投入（母株/种子/分株基数）">
                  <Input
                    type="number"
                    min="0"
                    value={formData.targetInputCount === 0 ? '' : (formData.targetInputCount ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        onFormChange('targetInputCount', 0);
                      } else {
                        const n = Number(v);
                        if (!Number.isNaN(n) && n >= 0) onFormChange('targetInputCount', n);
                      }
                    }}
                    placeholder="0"
                    className={inputClass}
                  />
                </FormField>
              </div>
              <div>
                <FormField label="目标产出（成活/扩繁/嫁接苗）">
                  <Input
                    type="number"
                    min="0"
                    value={formData.targetOutputCount === 0 ? '' : (formData.targetOutputCount ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        onFormChange('targetOutputCount', 0);
                      } else {
                        const n = Number(v);
                        if (!Number.isNaN(n) && n >= 0) onFormChange('targetOutputCount', n);
                      }
                    }}
                    placeholder="0"
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>
          ) : (
            /* 育种 / 种植计划：目标产量 + 单位 */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FormField label="目标产量" error={errors.targetYield}>
                  <Input
                    type="number"
                    value={formData.targetYield}
                    onChange={(e) => onFormChange('targetYield', e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </FormField>
              </div>
              <div>
                <FormField label="单位">
                  <DictSelect
                    category="unit"
                    value={formData.unit}
                    onChange={(value) => onFormChange('unit', value)}
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* 第七行：种植面积 + 面积单位 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField label="种植面积" error={errors.plantingArea}>
              <Input
                type="number"
                value={formData.plantingArea}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, '');
                  onFormChange('plantingArea', val);
                }}
                placeholder="0"
                className={inputClass}
              />
            </FormField>
          </div>
          <div>
            <FormField label="面积单位">
              <DictSelect
                category="unit"
                value={formData.plantingAreaUnit}
                onChange={(value) => onFormChange('plantingAreaUnit', value)}
              />
            </FormField>
          </div>
        </div>

        {/* 第八行：备注说明（横跨整行） */}
        <div>
          <FormField label="备注说明">
            <Textarea
              value={formData.description}
              onChange={(e) => onFormChange('description', e.target.value)}
              placeholder="输入备注信息..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none"
            />
          </FormField>
        </div>

        {/* 第九行：计划详细说明（横跨整行） */}
        <div>
          <FormField label="计划详细说明">
            <div className="flex items-center gap-3">
              {/* L-06: 受控 input ref 复用 + cleanup */}
              <Button
                size="sm"
                variant="blue"
                onClick={triggerFilePicker}
              >
                <Upload className="w-4 h-4 mr-1" />
                导入文件
              </Button>
              <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式</span>
              {formData.planDetailFileName && (
                <span className="text-xs text-emerald-600">{formData.planDetailFileName}</span>
              )}
            </div>
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
