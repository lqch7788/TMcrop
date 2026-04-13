import { Modal, FormField, Input, Select, Textarea } from '../../ui/Modal';
import { CropBatch, Greenhouse, CropType } from '../../../types';
import { RESPONSIBLE_PERSONS, batchStatusLabels } from '../constants';
import { useRef } from 'react';
import { Upload } from 'lucide-react';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: {
    batchCode: string;
    cropName: string;
    variety: string;
    greenhouseId: string;
    plantingArea: string;
    startDate: string;
    expectedHarvestDate: string;
    targetYield: string;
    plantingMode: string;
    responsiblePerson: string;
    publisher: string;
    batchStatus: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
    description: string;
    planDetail: string;
  };
  errors: Record<string, string>;
  greenhouses: Greenhouse[];
  cropTypes: CropType[];
  plantingModes: { id: string; name: string; description: string }[];
  onFormChange: (field: string, value: any) => void;
  onGenerateCode: () => void;
}

export function CreateBatchModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  errors,
  greenhouses,
  cropTypes,
  plantingModes,
  onFormChange,
  onGenerateCode,
}: CreateBatchModalProps) {
  const handleCropChange = (cropName: string) => {
    const crop = cropTypes.find(c => c.name === cropName);
    onFormChange('cropName', cropName);
    onFormChange('variety', crop?.varieties[0] || '');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增生产计划批次"
      size="xl"
      onSubmit={onSubmit}
    >
      <div className="space-y-4 modal-form-inputs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="生产计划批次号" required error={errors.batchCode}>
            <div className="flex gap-2">
              <Input
                value={formData.batchCode}
                onChange={(e) => onFormChange('batchCode', e.target.value)}
                placeholder="例如：FQ2024-001"
                error={!!errors.batchCode}
              />
              <button
                type="button"
                onClick={onGenerateCode}
                className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm whitespace-nowrap"
              >
                生成
              </button>
            </div>
          </FormField>

          <FormField label="作物名称" required error={errors.cropName}>
            <Select
              value={formData.cropName}
              onChange={(e) => handleCropChange(e.target.value)}
              options={cropTypes.map(c => ({ value: c.name, label: c.name }))}
            />
          </FormField>

          <FormField label="作物品种" required error={errors.variety}>
            <Input
              value={formData.variety}
              onChange={(e) => onFormChange('variety', e.target.value)}
              placeholder="例如：红果番茄"
            />
          </FormField>

          <FormField label="种植区域" required error={errors.greenhouseId}>
            <Select
              value={formData.greenhouseId}
              onChange={(e) => onFormChange('greenhouseId', e.target.value)}
              options={greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name }))}
            />
          </FormField>

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
              placeholder="例如：1000或1500.50"
            />
          </FormField>

          <FormField label="种植模式" required error={errors.plantingMode}>
            <Select
              value={formData.plantingMode}
              onChange={(e) => onFormChange('plantingMode', e.target.value)}
              options={plantingModes.map(m => ({ value: m.name, label: m.name }))}
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
              placeholder="例如：10000或10000kg"
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

          <FormField label="当前状态">
            <Select
              value={formData.batchStatus}
              onChange={(e) => onFormChange('batchStatus', e.target.value)}
              options={Object.entries(batchStatusLabels).map(([key, label]) => ({ value: key, label }))}
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
              <button
                type="button"
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
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                <Upload className="w-3 h-3" />
                导入文件
              </button>
              <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式文件</span>
            </div>
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
