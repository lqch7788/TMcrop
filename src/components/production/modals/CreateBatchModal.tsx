import { Modal, FormField, Input, Select, Textarea } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { CropBatch, Greenhouse, PlanType, PlanTypeLabels, PlanTypeColors } from '../../../types';
import { RESPONSIBLE_PERSONS, planTypeOptions, getModesByPlanType } from '../constants';
import { useState } from 'react';
import { Upload, Leaf } from 'lucide-react';
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
    planType: PlanType;  // 计划类型
    planTypeName: string;  // 计划类型名称
    cropCode: string;  // 作物编码（11位）
    cropName: string;
    variety: string;
    greenhouseId: string;
    plantingArea: string;
    plantingAreaUnit: string;  // 面积单位
    startDate: string;
    expectedHarvestDate: string;
    targetYield: string;
    unit: string;  // 单位
    plantingMode: string;
    responsiblePerson: string;
    publisher: string;
    description: string;
    planDetail: string;
  };
  errors: Record<string, string>;
  greenhouses: Greenhouse[];
  onFormChange: (field: string, value: any) => void;
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
  onFormChange,
  onGenerateCode,
}: CreateBatchModalProps) {
  // 作物品种选择（与种源管理一致，CropCodeSelector 内部自动初始化品种数据）
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 作物品种选择回调
  const handleCropChange = (code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      onFormChange('cropCode', varietyInfo.cropCode);
      // 取最细化的品种名称
      onFormChange('variety', varietyInfo.subVariety1Name || varietyInfo.varietyName);
      onFormChange('cropName', varietyInfo.varietyName);
    } else {
      setSelectedCrop(null);
      onFormChange('cropCode', '');
      onFormChange('variety', '');
      onFormChange('cropName', '');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增生产计划批次"
      size="xl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onSaveDraft}>
            存为草稿
          </Button>
          <Button onClick={onSubmitForApproval}>
            提交审批
          </Button>
        </div>
      }
    >
      <div className="space-y-4 modal-form-inputs">
        {/* 计划类型和生产计划批次号同一行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="计划类型" required>
            <div className="flex gap-4 flex-wrap">
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
                      flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-2 transition-all
                      ${isSelected
                        ? `border-emerald-500 ${option.color.bg} ${option.color.text}`
                        : 'border-gray-200 hover:border-gray-400 bg-white text-gray-700'}
                    `}
                  >
                    <span className="font-medium">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </FormField>

          <FormField label="生产计划批次号" required error={errors.batchCode}>
            <div className="flex gap-2">
              <Input
                value={formData.batchCode}
                onChange={(e) => onFormChange('batchCode', e.target.value)}
                placeholder="例如：FQ2024-001"
                error={!!errors.batchCode}
              />
              <Button size="sm" onClick={onGenerateCode}>
                生成
              </Button>
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 作物品种 - 使用统一的 CropCodeSelector（与种源管理一致） */}
          <FormField label="作物品种" required error={errors.variety}>
            <CropCodeSelector
              value={formData.cropCode || ''}
              onChange={handleCropChange}
              placeholder="搜索或选择作物品种..."
              size="md"
              showFullPath={true}
            />
            {/* 显示选中作物的详细信息 */}
            {selectedCrop && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <div className="text-emerald-700 flex items-center gap-1">
                  <Leaf className="w-3 h-3 flex-shrink-0" />
                  {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                  {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                </div>
                <div className="text-emerald-600 mt-0.5">
                  编码：{selectedCrop.cropCode}
                </div>
              </div>
            )}
          </FormField>

          <FormField label="种植区域" required error={errors.greenhouseId}>
            <Select
              value={formData.greenhouseId}
              onChange={(e) => onFormChange('greenhouseId', e.target.value)}
              options={greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name }))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="种植面积" required error={errors.plantingArea}>
              <Input
                value={formData.plantingArea}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, '');
                  const parts = val.split('.');
                  let formatted = parts[0];
                  if (parts.length > 1) {
                    formatted += '.' + parts[1].slice(0, 2);
                  }
                  onFormChange('plantingArea', formatted);
                }}
                placeholder="例如：1000"
              />
            </FormField>
            <FormField label="单位">
              <DictSelect
                category="unit"
                value={formData.plantingAreaUnit}
                onChange={(value) => onFormChange('plantingAreaUnit', value)}
                placeholder="选择单位"
              />
            </FormField>
          </div>

          <FormField label="生产模式" required error={errors.plantingMode}>
            <Select
              value={formData.plantingMode}
              onChange={(e) => onFormChange('plantingMode', e.target.value)}
              options={getModesByPlanType(formData.planType)}
            />
          </FormField>

          <FormField label="开始时间" required error={errors.startDate}>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => onFormChange('startDate', e.target.value)}
            />
          </FormField>

          <FormField label="预计结束时间" required error={errors.expectedHarvestDate}>
            <Input
              type="date"
              value={formData.expectedHarvestDate}
              onChange={(e) => onFormChange('expectedHarvestDate', e.target.value)}
            />
          </FormField>

          <FormField label="目标产量" required error={errors.targetYield}>
            <Input
              value={formData.targetYield}
              onChange={(e) => onFormChange('targetYield', e.target.value)}
              placeholder="例如：10000"
            />
          </FormField>

          <FormField label="单位">
            <DictSelect
              category="unit"
              value={formData.unit}
              onChange={(value) => onFormChange('unit', value)}
              placeholder="选择单位"
            />
          </FormField>

          <FormField label="负责人" required error={errors.responsiblePerson}>
            <Select
              value={formData.responsiblePerson}
              onChange={(e) => onFormChange('responsiblePerson', e.target.value)}
              options={RESPONSIBLE_PERSONS.map(name => ({ value: name, label: name }))}
            />
          </FormField>

          <FormField label="发布人">
            <Input
              value={formData.publisher}
              disabled
              className="bg-blue-50 text-blue-700 font-medium"
            />
          </FormField>

          <FormField label="版本号">
            <Input
              value="V1.0"
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </FormField>

          <FormField label="备注说明">
            <Textarea
              value={formData.description}
              onChange={(e) => onFormChange('description', e.target.value)}
              placeholder="输入相关的备注信息..."
            />
          </FormField>

          <FormField label="计划详细说明">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="blue"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.txt,.md,.docx';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        onFormChange('planDetail', event.target?.result as string);
                        // 从文件名生成计划详情文件名
                        const fileName = file.name;
                        onFormChange('planDetailFileName', fileName);
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-3 h-3" />
                导入文件
              </Button>
              <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式文件</span>
            </div>
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
