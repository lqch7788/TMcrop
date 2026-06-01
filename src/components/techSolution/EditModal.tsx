/**
 * 技术方案编辑弹窗
 * 父组件传：selectedTech、editForm、setEditForm、scopeExpandedEdit、setScopeExpandedEdit、selectedCropEdit、handleCropChangeEdit
 */
import { useState } from 'react';
import { Upload, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { DictSelect } from '../common/settings/DictSelect';
import CropCodeSelector from '../farm/common/CropCodeSelector';
import { CropVariety } from '../../types/cropVariety';
import { TechSolution } from '../../types/techSolution';

// 适用范围选项（多选）
const scopeOptions = [
  '品种选育', '种子生产', '种源采集', '种子加工', '种子检测',
  '播种育苗', '催芽管理', '苗期管理', '出圃管理', '嫁接育苗', '组培育苗',
  '土壤准备', '定植移栽', '生长期管理', '开花结果期', '采收期管理',
  '温室环境调控', '大棚管理', '灌溉管理', '施肥管理', '病虫害防治',
  '采收管理', '分级包装', '贮藏保鲜', '加工处理',
  '全周期管理', '综合技术方案', '应急处理', '其他',
];

export interface EditForm {
  title: string;
  crop: string;
  cropCode: string;
  plantingMode: string;
  stage: string;
  version: string;
  content: string;
  remarks: string;
  relatedBatchCode: string;
  planDetailFileName: string;
  isValid: string;
  lastSubmitTime: string;
}

export interface EditModalProps {
  isOpen: boolean;
  tech: TechSolution | null;
  form: EditForm;
  scopeExpanded: boolean;
  selectedCrop: CropVariety | null;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (form: EditForm) => void;
  onScopeToggle: () => void;
  onCropChange: (code: string, varietyInfo: CropVariety | null) => void;
}

export function EditModal({
  isOpen,
  tech,
  form,
  scopeExpanded,
  selectedCrop,
  onClose,
  onSubmit,
  onFormChange,
  onScopeToggle,
  onCropChange,
}: EditModalProps) {
  // 局部文件读取逻辑
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          onFormChange({
            ...form,
            content: event.target?.result as string,
            planDetailFileName: file.name,
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑方案"
      size="lg"
      onSubmit={onSubmit}
      submitText="保存"
      cancelText="取消"
    >
      {tech && (
        <div className="space-y-4">
          {/* 方案编号 + 版本 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="方案编号">
              <Input value={tech.code} disabled className="bg-gray-50" />
            </FormField>
            <FormField label="版本">
              <Input
                value={form.version}
                onChange={(e) => onFormChange({ ...form, version: e.target.value })}
              />
            </FormField>
          </div>

          {/* 方案标题 */}
          <FormField label="方案标题">
            <Input
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
            />
          </FormField>

          {/* 作物品种 + 种植模式 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="作物品种">
              <CropCodeSelector
                value={form.cropCode || ''}
                onChange={onCropChange}
                placeholder="搜索或选择作物品种..."
                size="md"
                showFullPath={true}
              />
              {selectedCrop && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <div className="text-emerald-700 flex items-center gap-1">
                    <Leaf className="w-3 h-3 flex-shrink-0" />
                    {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                    {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                  </div>
                  <div className="text-emerald-600 mt-0.5">编码：{selectedCrop.cropCode}</div>
                </div>
              )}
            </FormField>
            <FormField label="种植模式">
              <DictSelect
                category="planting_mode"
                value={form.plantingMode}
                onChange={(value) => onFormChange({ ...form, plantingMode: value })}
                placeholder="选择种植模式"
              />
            </FormField>
          </div>

          {/* 适用范围（多选Checkbox） */}
          <FormField label="适用范围（可多选）">
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onScopeToggle}
                className="flex items-center gap-1 text-gray-600"
              >
                {scopeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{scopeExpanded ? '收起' : '展开'}</span>
              </Button>
              {scopeExpanded && (
                <div className="flex flex-wrap gap-2">
                  {scopeOptions.map((option) => (
                    <label key={option} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={form.stage.split(',').includes(option)}
                        onCheckedChange={(checked) => {
                          const currentStages = form.stage ? form.stage.split(',').filter((s) => s) : [];
                          if (checked) {
                            onFormChange({ ...form, stage: [...currentStages, option].join(',') });
                          } else {
                            onFormChange({
                              ...form,
                              stage: currentStages.filter((s) => s !== option).join(','),
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* 关联生产批次号 */}
          <FormField label="关联生产批次号">
            <Select
              value={form.relatedBatchCode}
              onChange={(e) => onFormChange({ ...form, relatedBatchCode: e.target.value })}
              options={[
                { value: '', label: '不关联生产批次' },
                { value: 'ZZB2026-001', label: 'ZZB2026-001' },
                { value: 'ZZB2026-002', label: 'ZZB2026-002' },
                { value: 'ZZB2026-003', label: 'ZZB2026-003' },
                { value: 'YMB2026-001', label: 'YMB2026-001' },
                { value: 'YMB2026-002', label: 'YMB2026-002' },
                { value: 'JZB2026-001', label: 'JZB2026-001' },
                { value: 'JZB2026-002', label: 'JZB2026-002' },
              ]}
            />
          </FormField>

          {/* 编制人 + 创建日期 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="编制人">
              <Input value={tech.author} disabled className="bg-gray-50" />
            </FormField>
            <FormField label="创建日期">
              <Input value={tech.createDate} disabled className="bg-gray-50" />
            </FormField>
          </div>

          {/* 备注 */}
          <FormField label="备注">
            <Textarea
              value={form.remarks}
              onChange={(e) => onFormChange({ ...form, remarks: e.target.value })}
              rows={2}
            />
          </FormField>

          {/* 方案是否有效 */}
          <FormField label="方案是否有效">
            <Select
              value={form.isValid}
              onChange={(e) => onFormChange({ ...form, isValid: e.target.value })}
              options={[
                { value: '有效', label: '有效' },
                { value: '作废', label: '作废' },
              ]}
            />
            {form.isValid === '作废' && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ 选择"作废"后方案将无法使用，提交后将进入审核流程
              </p>
            )}
          </FormField>

          {/* 方案内容 */}
          <FormField label="方案内容">
            <Textarea
              value={form.content}
              onChange={(e) => onFormChange({ ...form, content: e.target.value })}
              rows={6}
            />
          </FormField>

          {/* 方案详细文件上传 */}
          <FormField label="方案详情文件">
            <div className="flex items-center gap-3">
              <Button type="button" variant="blue" size="sm" onClick={handleFileUpload}>
                <Upload className="w-3 h-3 mr-1" />
                导入文件
              </Button>
              <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式</span>
              {form.planDetailFileName && (
                <span className="text-xs text-emerald-600">{form.planDetailFileName}</span>
              )}
              {form.planDetailFileName && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFormChange({ ...form, content: '', planDetailFileName: '' })}
                  className="text-red-500 hover:text-red-700"
                >
                  删除
                </Button>
              )}
            </div>
          </FormField>
        </div>
      )}
    </Modal>
  );
}
