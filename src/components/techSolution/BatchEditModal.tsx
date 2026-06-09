/**
 * 技术方案批量编辑弹窗
 * 2026-06-05 字段形式与 CreateModal/EditModal 完全一致
 * 父组件传：selectedRows、techSolutions、selectedTechCode、setSelectedTechCode、editedTechCodes、editedTechs、setEditedTechs、onSave、onCancel
 */
import { useState, useMemo } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { Modal, FormField, Textarea } from '../ui/Modal';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { Input } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { DictSelect } from '../common/settings/DictSelect';
import CropCodeSelector from '../farm/common/CropCodeSelector';
import { CropVariety } from '../../types/cropVariety';
import { TechSolution } from '../../types/techSolution';
import { TECH_SOLUTION_SCOPES } from './constants';
// M-2 抽取：关联生产批次号下拉选项共享
import { RELATED_BATCH_OPTIONS } from './constants/relatedBatchOptions';

export interface BatchEditData {
  version?: string;
  title?: string;
  crop?: string;
  cropCode?: string;
  plantingMode?: string;
  // V9.0: 适用范围数组（与 CreateModal/EditModal 一致）
  scopes?: string[];
  // 2026-06-05: 与 CreateModal/EditModal 字段对齐
  relatedBatchCode?: string;
  author?: string;
  remarks?: string;
  isValid?: string;
  content?: string;
  planDetailFileName?: string;
}

export interface BatchEditModalProps {
  isOpen: boolean;
  techSolutions: TechSolution[];
  selectedRows: (string | number)[];
  selectedTechCode: string;
  editedTechCodes: string[];
  editedTechs: Record<string, BatchEditData>;
  operatorOptions: { value: string; label: string }[];
  onClose: () => void;
  onSelectTechCode: (code: string) => void;
  // 2026-06-05: 放宽签名支持 string[]（scopes 数组用）
  onEditField: (code: string, field: keyof BatchEditData, value: string | string[]) => void;
  onUploadFile: (code: string, file: File) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
}

// 与 CreateModal/EditModal 共享的关联生产批次号 Select 选项（M-2 抽取到 constants/relatedBatchOptions.ts）
// 之前三处各硬编码一份，现统一从 './constants/relatedBatchOptions' 导入

export function BatchEditModal({
  isOpen,
  techSolutions,
  selectedRows,
  selectedTechCode,
  editedTechCodes,
  editedTechs,
  operatorOptions,
  onClose,
  onSelectTechCode,
  onEditField,
  onUploadFile,
  onCancel,
  onSave,
}: BatchEditModalProps) {
  const currentTech = techSolutions.find((t) => t.code === selectedTechCode);
  const editedData = (selectedTechCode ? editedTechs[selectedTechCode] : undefined) || {};
  // 2026-06-05: 编辑弹窗的当前选中的品种（与 CreateModal/EditModal 一致基于 CropVariety）
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);
  // 2026-06-05: scopes 折叠状态
  const [scopeExpanded, setScopeExpanded] = useState(false);

  const currentScopes: string[] = useMemo(() => {
    // 优先取编辑中的 scopes，否则取原 tech 的 scopes
    if (editedData.scopes !== undefined) return editedData.scopes;
    return (currentTech as any)?.scopes || [];
  }, [editedData.scopes, currentTech]);

  const handleCropChange = (code: string, varietyInfo: CropVariety | null) => {
    setSelectedCrop(varietyInfo);
    onEditField(selectedTechCode, 'cropCode', code);
    onEditField(selectedTechCode, 'crop', varietyInfo ? (varietyInfo.subVariety1Name || varietyInfo.varietyName) : '');
  };

  const toggleScope = (scope: string) => {
    const next = currentScopes.includes(scope)
      ? currentScopes.filter(s => s !== scope)
      : [...currentScopes, scope];
    onEditField(selectedTechCode, 'scopes', next);
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // H-4 修复：.docx 二进制文件 readAsText 会乱码，仅允许纯文本
    input.accept = '.md,.txt';
    input.onchange = (e) => {
      const file = (e.target as unknown as HTMLInputElement).files?.[0];
      if (file && selectedTechCode) {
        onUploadFile(selectedTechCode, file);
      }
    };
    input.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑技术方案"
      size="xxl"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 个技术方案进行批量编辑，
            已编辑 <strong>{editedTechCodes.length}</strong> 个
          </p>
        </div>

        {/* Batch Selector */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <Label>选择技术方案编号</Label>
            <Select value={selectedTechCode} onValueChange={onSelectTechCode}>
              <SelectTrigger>
                <SelectValue placeholder="请选择方案编号" />
              </SelectTrigger>
              <SelectContent>
                {techSolutions
                  .filter((t) => selectedRows.includes(t.id))
                  .map((tech) => (
                    <SelectItem key={tech.id} value={tech.code}>
                      {tech.code} - {tech.title}{' '}
                      {editedTechCodes.includes(tech.code) ? '✅ 已编辑' : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Edit Form */}
        {selectedTechCode && currentTech && (
          <div className="space-y-3">
            {/* 第一行：方案编号 + 版本 + 编制人 + 创建日期 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">方案编号</div>
                <div className="text-sm font-medium text-gray-900">{currentTech.code}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">版本</div>
                <Input
                  value={editedData.version ?? currentTech.version}
                  onChange={(e) => onEditField(selectedTechCode, 'version', e.target.value)}
                  className="h-7 py-0 text-xs"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">编制人</div>
                <Select
                  value={editedData.author ?? currentTech.author}
                  onValueChange={(v) => onEditField(selectedTechCode, 'author', v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">创建日期</div>
                <div className="text-sm text-gray-700">{currentTech.createDate}</div>
              </div>
            </div>

            {/* 第二行：方案标题（横跨） */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">方案标题 <span className="text-red-500">*</span></div>
              <Input
                value={editedData.title ?? currentTech.title}
                onChange={(e) => onEditField(selectedTechCode, 'title', e.target.value)}
                className="h-7 py-0 text-xs"
              />
            </div>

            {/* 第三行：作物品种 + 种植模式 + 关联批次号 + 方案是否有效 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">作物品种 <span className="text-red-500">*</span></div>
                <CropCodeSelector
                  value={editedData.cropCode ?? currentTech.cropCode ?? ''}
                  onChange={handleCropChange}
                  placeholder="搜索或选择作物品种..."
                  size="sm"
                  showFullPath
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">种植模式</div>
                <DictSelect
                  category="planting_mode"
                  value={editedData.plantingMode ?? currentTech.plantingMode}
                  onChange={(v) => onEditField(selectedTechCode, 'plantingMode', v)}
                  placeholder="选择种植模式"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">关联生产批次号</div>
                <Select
                  value={editedData.relatedBatchCode ?? currentTech.relatedBatchCode ?? ''}
                  onValueChange={(v) => onEditField(selectedTechCode, 'relatedBatchCode', v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATED_BATCH_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">方案是否有效</div>
                <Select
                  value={editedData.isValid ?? currentTech.isValid ?? '有效'}
                  onValueChange={(v) => onEditField(selectedTechCode, 'isValid', v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="有效">有效</SelectItem>
                    <SelectItem value="作废" className="text-red-600">作废</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 第四行：适用范围（多选 Checkbox） */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                <span>适用范围（可多选）</span>
                <button
                  type="button"
                  onClick={() => setScopeExpanded(!scopeExpanded)}
                  className="text-emerald-600 text-xs hover:underline"
                >
                  {scopeExpanded ? '收起' : '展开'}
                </button>
              </div>
              {scopeExpanded ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {TECH_SOLUTION_SCOPES.map((option) => (
                    <label key={option} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={currentScopes.includes(option)}
                        onCheckedChange={() => toggleScope(option)}
                      />
                      <span className="text-xs">{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="h-7 px-2 border border-gray-300 rounded-lg text-xs text-gray-600 bg-white flex items-center">
                  {currentScopes.length === 0 ? '请选择' : currentScopes.join(', ')}
                </div>
              )}
            </div>

            {/* 第五行：备注 + 方案内容 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">备注</div>
                <Textarea
                  value={editedData.remarks ?? currentTech.remarks ?? ''}
                  onChange={(e) => onEditField(selectedTechCode, 'remarks', e.target.value)}
                  placeholder="请输入备注信息"
                  rows={2}
                  className="text-xs"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">方案内容</div>
                <Textarea
                  value={editedData.content ?? currentTech.content ?? ''}
                  onChange={(e) => onEditField(selectedTechCode, 'content', e.target.value)}
                  placeholder="请输入方案内容"
                  rows={4}
                  className="text-xs"
                />
              </div>
            </div>

            {/* 第六行：方案详情文件 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">方案详情文件</div>
              <div className="flex items-center gap-4">
                {(editedData.planDetailFileName ?? currentTech.planDetailFileName) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      {editedData.planDetailFileName ?? currentTech.planDetailFileName}
                    </span>
                    <Button variant="blue" size="sm" onClick={handleUploadClick}>
                      <Upload className="w-4 h-4" />
                      重新上传
                    </Button>
                    <span className="text-xs text-gray-500">支持 .md, .txt 格式</span>
                  </div>
                ) : (
                  <Button variant="default" size="sm" onClick={handleUploadClick}>
                    <Upload className="w-4 h-4" />
                    上传方案文件
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button size="sm" variant="default" onClick={onSave}>
            <Save className="w-4 h-4" /> 保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}
