/**
 * 技术方案新增弹窗
 * 父组件传：form、setForm、scopeExpanded、selectedCrop、handleCropChange、generateCode、operatorOptions、onSubmitDraft/onSubmitApprove
 */
import { ChevronDown, ChevronUp, FileText, Leaf, RefreshCw, Send, Upload } from 'lucide-react';
import { useMemo } from 'react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { DictSelect } from '../common/settings/DictSelect';
import CropCodeSelector from '../farm/common/CropCodeSelector';
import { CropVariety } from '../../types/cropVariety';
import type { CropBatch } from '../../types';
import { TECH_SOLUTION_SCOPES } from './constants';
import { RELATED_BATCH_OPTIONS } from './constants/relatedBatchOptions';
// 2026-06-10: 翻译 plantingMode 用的全局 value→label 映射（与生产计划 ProductionTable 同源）
// 注：这些 modes 在 production/constants.ts 导出，不在 techSolution/constants.ts
import { SEED_BREEDING_MODES, SEEDLING_MODES, PLANTING_MODES } from '../production/constants';
import { todayLocal } from '@/lib/dateUtils';

export interface NewPlanForm {
  code: string;
  title: string;
  crop: string;
  cropCode: string;
  plantingMode: string;
  // 旧的 stage 字符串保留兼容（M-1: 已迁移到 scopes，DB 列保留不动）
  /** @deprecated 2026-06-06 V9.0：使用 scopes 数组替代，stage 仅作历史数据展示 */
  stage: string;
  // V9.0: 新增适用范围数组
  scopes: string[];
  author: string;
  version: string;
  content: string;
  remarks: string;
  planDetailFileName: string;
  relatedBatchCode: string;
}

export interface CreateModalProps {
  isOpen: boolean;
  form: NewPlanForm;
  scopeExpanded: boolean;
  selectedCrop: CropVariety | null;
  // 2026-06-10: 关联生产批次号下拉项从生产计划列表动态生成 + 联动自动填作物信息
  batches?: CropBatch[];
  operatorOptions: { value: string; label: string }[];
  onClose: () => void;
  onFormChange: (form: NewPlanForm) => void;
  onScopeToggle: () => void;
  onCropChange: (code: string, varietyInfo: CropVariety | null) => void;
  onGenerateCode: () => string;
  onSubmitDraft: () => void;
  onSubmitApprove: () => void;
}

export function CreateModal({
  isOpen,
  form,
  scopeExpanded,
  selectedCrop,
  batches,
  operatorOptions,
  onClose,
  onFormChange,
  onScopeToggle,
  onCropChange,
  onGenerateCode,
  onSubmitDraft,
  onSubmitApprove,
}: CreateModalProps) {
  // 2026-06-10: 关联生产批次号下拉项从生产计划列表动态生成（替代旧硬编码 RELATED_BATCH_OPTIONS）
  // C6 修复 1: 动态为空时 fallback 到 RELATED_BATCH_OPTIONS 静态兜底（与 BatchEditModal 一致）
  const relatedBatchOptions = useMemo(() => {
    const dynamic = (batches ?? []).filter(b => b.batchCode).map(b => ({
      value: b.batchCode!,
      label: `${b.batchCode} - ${b.cropName || b.variety || ''}`,
    }));
    return dynamic.length > 0
      ? [{ value: '', label: '不关联' }, ...dynamic]
      : RELATED_BATCH_OPTIONS;
  }, [batches]);

  // 2026-06-10: 根据当前选中的 relatedBatchCode 反查选中的 batch（用于详情框显示）
  const selectedBatch = useMemo(
    () => form.relatedBatchCode
      ? (batches ?? []).find(b => b.batchCode === form.relatedBatchCode) || null
      : null,
    [form.relatedBatchCode, batches]
  );

  // 2026-06-10: 关联生产批次号 onChange 联动——选了具体批次就自动填作物信息+禁用作物品种/种植模式
  // 选 "不关联"（空 value）则清空自动填的字段，让用户手工选
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
      // 找不到对应批次时只设 relatedBatchCode，作物字段留空让用户手动选
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

  // 2026-06-10: 关联批次后锁定作物品种 + 种植模式字段（disabled）
  const isLockedByBatch = !!form.relatedBatchCode;

  // 2026-06-10: 翻译 plantingMode 用的 value→label 全局映射（与 ProductionTable 同样的 3 重兜底）
  const ALL_MODE_LABELS: Record<string, string> = (() => {
    const m: Record<string, string> = {};
    [...SEED_BREEDING_MODES, ...SEEDLING_MODES, ...PLANTING_MODES].forEach(opt => {
      m[opt.value] = opt.label;
    });
    return m;
  })();

  // 把 "open_field,supplier_direct" 翻译成 "露天栽培、供应商直供"
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
      title="新增方案"
      // 2026-06-10: 统一 4 页面 × 新增/编辑弹窗尺寸 = 900×650
      size="xl"
      width={900}
      height={650}
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={onSubmitDraft}>
            <FileText className="w-4 h-4" /> 存为草稿
          </Button>
          <Button type="button" size="sm" variant="default" onClick={onSubmitApprove}>
            <Send className="w-4 h-4" /> 提交审批
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 第一行：方案编号 + 方案标题 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="方案编号">
            <div className="flex gap-2 w-full">
              <div className="flex-1">
                <Input
                  value={form.code}
                  onChange={(e) => onFormChange({ ...form, code: e.target.value })}
                  placeholder="请输入方案编号"
                />
              </div>
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={() => onFormChange({ ...form, code: onGenerateCode() })}
              >
                <RefreshCw className="w-4 h-4" />
                生成
              </Button>
            </div>
          </FormField>
          <FormField label="方案标题" required>
            <Input
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder="请输入方案标题"
            />
          </FormField>
        </div>

        {/* 第二行：关联生产批次号（创建日期已移至第五行，与版本同一排） */}
        <FormField label="关联生产批次号">
          <Select
            value={form.relatedBatchCode}
            onChange={(e) => handleRelatedBatchChange(e.target.value)}
            options={relatedBatchOptions}
          />
        </FormField>

        {/* 第三行：作物品种 + 种植模式 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="作物品种" required>
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
              // 2026-06-10: 关联批次锁定时用 div 显示中文标签（DictSelect 即使 disabled 仍按 value 渲染，不翻译）
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

        {/* 第四行：适用范围（多选Checkbox）单独占满整行（关联生产批次号已移至第二行） */}
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

        {/* 第五行：编制人 + 版本 + 创建日期（三个字段同一排，创建日期移到版本后面） */}
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
            <Input value={todayLocal()} disabled className="bg-gray-50" />
          </FormField>
        </div>

        {/* 第六行：备注（单独一行） */}
        <FormField label="备注">
          <Textarea
            value={form.remarks}
            onChange={(e) => onFormChange({ ...form, remarks: e.target.value })}
            placeholder="请输入备注信息"
            rows={3}
          />
        </FormField>

        {/* 方案内容（与 EditModal 对齐，2026-06-06 新增） */}
        <FormField label="方案内容">
          <Textarea
            value={form.content}
            onChange={(e) => onFormChange({ ...form, content: e.target.value })}
            rows={6}
            placeholder="请输入方案内容（也可通过下方导入文件自动填充）"
          />
        </FormField>

        {/* 第七行：方案详细文件上传（单独一行） */}
        <FormField label="方案详细">
          <div className="flex items-center gap-3">
            <Button type="button" variant="blue" size="sm" onClick={handleFileUpload}>
              <Upload className="w-4 h-4 mr-1" />
              导入文件
            </Button>
            <span className="text-xs text-gray-500">支持 .txt, .md 格式</span>
            {form.planDetailFileName && (
              <span className="text-xs text-emerald-600">{form.planDetailFileName}</span>
            )}
          </div>
        </FormField>
      </div>
    </Modal>
  );
}
