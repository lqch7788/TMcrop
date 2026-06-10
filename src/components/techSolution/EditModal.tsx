/**
 * 技术方案编辑弹窗
 * 2026-06-10: 字段顺序和功能与 CreateModal 完全对齐
 * 父组件传：selectedTech、editForm、setEditForm、scopeExpandedEdit、setScopeExpandedEdit、selectedCropEdit、handleCropChangeEdit、batches
 */
import { useMemo } from 'react';
import { Trash2, Upload, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { DictSelect } from '../common/settings/DictSelect';
import CropCodeSelector from '../farm/common/CropCodeSelector';
import { CropVariety } from '../../types/cropVariety';
import { TechSolution } from '../../types/techSolution';
import type { CropBatch } from '../../types';
import { TECH_SOLUTION_SCOPES } from './constants';
// 2026-06-10: 翻译 plantingMode 用的全局 value→label 映射（与 CreateModal 同源）
import { SEED_BREEDING_MODES, SEEDLING_MODES, PLANTING_MODES } from '../production/constants';

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
  // 2026-06-10: 与 CreateModal 一致——从生产计划列表动态生成关联生产批次号下拉项
  batches?: CropBatch[];
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
  batches,
  operatorOptions,
  onClose,
  onSubmit,
  onFormChange,
  onScopeToggle,
  onCropChange,
}: EditModalProps) {
  // 2026-06-10: 与 CreateModal 一致——关联生产批次号下拉从生产计划列表动态生成
  const relatedBatchOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: '', label: '不关联' }];
    (batches ?? []).forEach(b => {
      if (b.batchCode) {
        opts.push({
          value: b.batchCode,
          label: `${b.batchCode} - ${b.cropName || b.variety || ''}`,
        });
      }
    });
    return opts;
  }, [batches]);

  // 2026-06-10: 反查选中的 batch 用于详情框显示
  const selectedBatch = useMemo(
    () => form.relatedBatchCode
      ? (batches ?? []).find(b => b.batchCode === form.relatedBatchCode) || null
      : null,
    [form.relatedBatchCode, batches]
  );

  // 2026-06-10: 关联生产批次号 onChange 联动——同 CreateModal
  const handleRelatedBatchChange = (value: string) => {
    if (!value) {
      onFormChange({
        ...form,
        relatedBatchCode: '',
        cropCode: '',
        crop: '',
        plantingMode: '',
      });
      return;
    }
    const batch = (batches ?? []).find(b => b.batchCode === value);
    if (!batch) {
      onFormChange({ ...form, relatedBatchCode: value });
      return;
    }
    onFormChange({
      ...form,
      relatedBatchCode: value,
      cropCode: batch.cropCode || '',
      crop: batch.cropName || '',
      plantingMode: batch.plantingMode || '',
    });
  };

  // 2026-06-10: 关联批次后锁定作物品种 + 种植模式字段
  const isLockedByBatch = !!form.relatedBatchCode;

  // 2026-06-10: 种植模式中文翻译（同 CreateModal）
  const ALL_MODE_LABELS: Record<string, string> = (() => {
    const m: Record<string, string> = {};
    [...SEED_BREEDING_MODES, ...SEEDLING_MODES, ...PLANTING_MODES].forEach(opt => {
      m[opt.value] = opt.label;
    });
    return m;
  })();
  const translatePlantingMode = (raw: string | undefined | null): string => {
    if (!raw) return '';
    return raw.split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => ALL_MODE_LABELS[v] || v)
      .filter(Boolean)
      .join('、');
  };
  const plantingModeDisplay = translatePlantingMode(form.plantingMode);

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
      // 2026-06-10: 统一 4 页面 × 新增/编辑弹窗尺寸 = 900×650
      size="xl"
      width={900}
      height={650}
      onSubmit={onSubmit}
      submitText="保存"
      cancelText="取消"
    >
      {tech && (
        <div className="space-y-4 [&_input]:!border-gray-500 [&_textarea]:!border-gray-500 [&_button[role='combobox']]:!border-gray-500">
          {/* 第 1 行：方案编号 + 方案标题（与 CreateModal 一致） */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="方案编号">
              <Input value={tech.code} disabled className="bg-gray-50" />
            </FormField>
            <FormField label="方案标题" required>
              <Input
                value={form.title}
                onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                placeholder="请输入方案标题"
              />
            </FormField>
          </div>

          {/* 第 2 行：关联生产批次号（动态下拉 + 联动自动填作物信息，置于作物品种之前） */}
          <FormField label="关联生产批次号">
            <Select
              value={form.relatedBatchCode}
              onChange={(e) => handleRelatedBatchChange(e.target.value)}
              options={relatedBatchOptions}
            />
          </FormField>

          {/* 第 3 行：作物品种 + 种植模式（关联批次时锁定） */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="作物品种">
              <CropCodeSelector
                value={form.cropCode || ''}
                onChange={onCropChange}
                placeholder={isLockedByBatch ? '已从关联批次自动填充' : '搜索或选择作物品种...'}
                size="md"
                showFullPath={true}
                disabled={isLockedByBatch}
              />
              {(selectedCrop || selectedBatch) && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  {selectedCrop ? (
                    <>
                      <div className="text-emerald-700 flex items-center gap-1">
                        <Leaf className="w-3 h-3 flex-shrink-0" />
                        {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                        {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                      </div>
                      <div className="text-emerald-600 mt-0.5">编码：{selectedCrop.cropCode}</div>
                    </>
                  ) : selectedBatch ? (
                    <>
                      <div className="text-emerald-700 flex items-center gap-1">
                        <Leaf className="w-3 h-3 flex-shrink-0" />
                        作物：{selectedBatch.cropName || '-'}
                        {selectedBatch.variety && ` · ${selectedBatch.variety}`}
                      </div>
                      {selectedBatch.plantingMode && (
                        <div className="text-emerald-600 mt-0.5">
                          种植模式：{translatePlantingMode(selectedBatch.plantingMode) || selectedBatch.plantingMode}
                        </div>
                      )}
                      {selectedBatch.cropCode && (
                        <div className="text-emerald-600 mt-0.5">编码：{selectedBatch.cropCode}</div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </FormField>
            <FormField label="种植模式">
              {isLockedByBatch ? (
                // 2026-06-10: 关联批次锁定时用 div 显示中文标签（DictSelect 即便 disabled 仍按 value 渲染）
                <div className="h-10 px-3 border border-gray-400 bg-gray-50 rounded-lg text-sm text-gray-900 flex items-center">
                  {plantingModeDisplay || '（未设置）'}
                </div>
              ) : (
                <DictSelect
                  category="planting_mode"
                  value={form.plantingMode}
                  onChange={(value) => onFormChange({ ...form, plantingMode: value })}
                  placeholder="选择种植模式"
                />
              )}
            </FormField>
          </div>

          {/* 第 4 行：适用范围（多选Checkbox） */}
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

          {/* 第 5 行：编制人 + 版本 + 创建日期（3 列，与 CreateModal 一致） */}
          <div className="grid grid-cols-3 gap-4">
            <FormField label="编制人">
              <Select
                value={form.author}
                onChange={(e) => onFormChange({ ...form, author: e.target.value })}
                options={operatorOptions}
              />
            </FormField>
            <FormField label="版本">
              <Input
                value={form.version}
                onChange={(e) => onFormChange({ ...form, version: e.target.value })}
              />
            </FormField>
            <FormField label="创建日期">
              <Input value={tech.createDate} disabled className="bg-gray-50" />
            </FormField>
          </div>

          {/* 第 6 行：备注 */}
          <FormField label="备注">
            <Textarea
              value={form.remarks}
              onChange={(e) => onFormChange({ ...form, remarks: e.target.value })}
              rows={2}
            />
          </FormField>

          {/* 第 7 行：方案是否有效（编辑弹窗独有，CreateModal 没有） */}
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

          {/* 第 8 行：方案内容 */}
          <FormField label="方案内容">
            <Textarea
              value={form.content}
              onChange={(e) => onFormChange({ ...form, content: e.target.value })}
              rows={6}
            />
          </FormField>

          {/* 第 9 行：方案详细文件上传 */}
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
