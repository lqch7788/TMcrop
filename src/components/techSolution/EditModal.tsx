/**
 * 技术方案编辑弹窗
 * 父组件传：selectedTech、editForm、setEditForm、scopeExpandedEdit、setScopeExpandedEdit、selectedCropEdit、handleCropChangeEdit
 */
import { useState } from 'react';
import { Trash2, Upload, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { DictSelect } from '../common/settings/DictSelect';
import CropCodeSelector from '../farm/common/CropCodeSelector';
import { CropVariety } from '../../types/cropVariety';
import { TechSolution } from '../../types/techSolution';
import { TECH_SOLUTION_SCOPES } from './constants';
// M-2 抽取：关联生产批次号下拉选项共享
import { RELATED_BATCH_OPTIONS } from './constants/relatedBatchOptions';

export interface EditForm {
  title: string;
  crop: string;
  cropCode: string;
  plantingMode: string;
  // 旧的 stage 字符串保留兼容（M-1: 已迁移到 scopes，DB 列保留不动）
  /** @deprecated 2026-06-06 V9.0：使用 scopes 数组替代，stage 仅作历史数据展示 */
  stage: string;
  // V9.0: 新增适用范围数组（替代字符串拼接）
  scopes: string[];
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
  // 2026-06-05: 与 CreateModal 一致——编制人改为 Select 可编辑
  operatorOptions: { value: string; label: string }[];
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
  operatorOptions,
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
    // H-4 修复：.docx 是二进制 zip 文件，readAsText 会读出乱码。仅允许纯文本格式
    input.accept = '.txt,.md';
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
        <div className="space-y-4 [&_input]:!border-gray-500 [&_textarea]:!border-gray-500 [&_button[role='combobox']]:!border-gray-500">
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
                  {TECH_SOLUTION_SCOPES.map((option) => (
                    <label key={option} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={form.scopes.includes(option)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onFormChange({ ...form, scopes: [...form.scopes, option] });
                          } else {
                            onFormChange({
                              ...form,
                              scopes: form.scopes.filter((s) => s !== option),
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

          {/* 关联生产批次号（label 与 CreateModal 一致：编码 - 作物名） */}
          <FormField label="关联生产批次号">
            <Select
              value={form.relatedBatchCode}
              onChange={(e) => onFormChange({ ...form, relatedBatchCode: e.target.value })}
              // M-2 抽取：共享 RELATED_BATCH_OPTIONS（与 CreateModal/BatchEditModal 一致）
              options={RELATED_BATCH_OPTIONS}
            />
          </FormField>

          {/* 编制人 + 创建日期（编制人改为 Select 可编辑，与 CreateModal 一致） */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="编制人">
              <Select
                value={form.author}
                onChange={(e) => onFormChange({ ...form, author: e.target.value })}
                options={operatorOptions}
              />
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
                <Upload className="w-4 h-4 mr-1" />
                导入文件
              </Button>
              <span className="text-xs text-gray-500">支持 .txt, .md 格式</span>
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
                  <Trash2 className="w-4 h-4" />
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
