/**
 * 技术方案新增弹窗
 * 父组件传：form、setForm、scopeExpanded、selectedCrop、handleCropChange、generateCode、operatorOptions、onSubmitDraft/onSubmitApprove
 */
import { ChevronDown, ChevronUp, FileText, Leaf, RefreshCw, Send, Upload } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { DictSelect } from '../common/settings/DictSelect';
import CropCodeSelector from '../farm/common/CropCodeSelector';
import { CropVariety } from '../../types/cropVariety';
import { TECH_SOLUTION_SCOPES } from './constants';
// M-2 抽取：关联生产批次号下拉选项共享
import { RELATED_BATCH_OPTIONS } from './constants/relatedBatchOptions';

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
  operatorOptions,
  onClose,
  onFormChange,
  onScopeToggle,
  onCropChange,
  onGenerateCode,
  onSubmitDraft,
  onSubmitApprove,
}: CreateModalProps) {
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

        {/* 第二行：版本 + 创建日期 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="版本">
            <Input
              value={form.version}
              onChange={(e) => onFormChange({ ...form, version: e.target.value })}
            />
          </FormField>
          <FormField label="创建日期">
            <Input value={new Date().toISOString().split('T')[0]} disabled className="bg-gray-50" />
          </FormField>
        </div>

        {/* 第三行：作物品种 + 种植模式 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="作物品种" required>
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

        {/* 第四行：适用范围（多选Checkbox）+ 关联生产批次号 */}
        <div className="grid grid-cols-2 gap-4">
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
          <FormField label="关联生产批次号">
            <Select
              value={form.relatedBatchCode}
              onChange={(e) => onFormChange({ ...form, relatedBatchCode: e.target.value })}
              // M-2 抽取：共享 RELATED_BATCH_OPTIONS（与 EditModal/BatchEditModal 一致）
              options={RELATED_BATCH_OPTIONS}
            />
          </FormField>
        </div>

        {/* 第五行：编制人 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="编制人">
            <Select
              value={form.author}
              onChange={(e) => onFormChange({ ...form, author: e.target.value })}
              options={operatorOptions}
            />
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
