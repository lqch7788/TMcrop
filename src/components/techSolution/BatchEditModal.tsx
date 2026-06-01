/**
 * 技术方案批量编辑弹窗
 * 父组件传：selectedRows、techSolutions、selectedTechCode、setSelectedTechCode、editedTechCodes、editedTechs、setEditedTechs、onSave、onCancel
 */
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { DictSelect } from '../common/settings/DictSelect';
import { TechSolution } from '../../types/techSolution';

export interface BatchEditData {
  version?: string;
  title?: string;
  crop?: string;
  plantingMode?: string;
  stage?: string;
  planDetailFileName?: string;
  content?: string;
}

export interface BatchEditModalProps {
  isOpen: boolean;
  techSolutions: TechSolution[];
  selectedRows: (string | number)[];
  selectedTechCode: string;
  editedTechCodes: string[];
  editedTechs: Record<string, BatchEditData>;
  onClose: () => void;
  onSelectTechCode: (code: string) => void;
  onEditField: (code: string, field: keyof BatchEditData, value: string) => void;
  onUploadFile: (code: string, file: File) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
}

export function BatchEditModal({
  isOpen,
  techSolutions,
  selectedRows,
  selectedTechCode,
  editedTechCodes,
  editedTechs,
  onClose,
  onSelectTechCode,
  onEditField,
  onUploadFile,
  onCancel,
  onSave,
}: BatchEditModalProps) {
  const currentTech = techSolutions.find((t) => t.code === selectedTechCode);
  const editedData = (selectedTechCode ? editedTechs[selectedTechCode] : undefined) || {};
  const crops = Array.from(new Set(techSolutions.map((t) => t.crop).filter(Boolean)));

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.docx,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
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
          <div className="grid grid-cols-4 gap-3">
            {/* 方案编号 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">方案编号</div>
              <div className="text-sm font-medium text-gray-900">{currentTech.code}</div>
            </div>

            {/* 版本 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">版本</div>
              <Input
                value={editedData.version ?? currentTech.version}
                onChange={(e) => onEditField(selectedTechCode, 'version', e.target.value)}
                className="h-7 py-0 text-xs"
              />
            </div>

            {/* 方案标题 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2 col-span-2">
              <div className="text-xs text-gray-500 mb-1">方案标题</div>
              <Input
                value={editedData.title ?? currentTech.title}
                onChange={(e) => onEditField(selectedTechCode, 'title', e.target.value)}
                className="h-7 py-0 text-xs"
              />
            </div>

            {/* 作物品种 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">作物品种</div>
              <Select
                value={editedData.crop ?? currentTech.crop}
                onValueChange={(v) => onEditField(selectedTechCode, 'crop', v)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((crop) => (
                    <SelectItem key={crop} value={crop}>
                      {crop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 种植模式 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">种植模式</div>
              <DictSelect
                category="planting_mode"
                value={editedData.plantingMode ?? currentTech.plantingMode}
                onChange={(v) => onEditField(selectedTechCode, 'plantingMode', v)}
                placeholder="选择种植模式"
              />
            </div>

            {/* 适用范围 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">适用范围</div>
              <Input
                value={editedData.stage ?? currentTech.stage}
                onChange={(e) => onEditField(selectedTechCode, 'stage', e.target.value)}
                className="h-7 py-0 text-xs"
              />
            </div>

            {/* 编制人 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">编制人</div>
              <div className="text-sm text-gray-700">{currentTech.author}</div>
            </div>

            {/* 创建日期 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">创建日期</div>
              <div className="text-sm text-gray-700">{currentTech.createDate}</div>
            </div>

            {/* 方案详情文件 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2 col-span-4">
              <div className="text-xs text-gray-500 mb-1">方案详情文件</div>
              <div className="flex items-center gap-4">
                {(editedData.planDetailFileName ?? currentTech.planDetailFileName) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      {editedData.planDetailFileName ?? currentTech.planDetailFileName}
                    </span>
                    <Button variant="blue" size="sm" onClick={handleUploadClick}>
                      <Upload className="w-3 h-3" />
                      重新上传
                    </Button>
                    <span className="text-xs text-gray-500">支持 .md, .docx, .txt 格式</span>
                  </div>
                ) : (
                  <Button variant="default" size="sm" onClick={handleUploadClick}>
                    <Upload className="w-3 h-3" />
                    上传方案文件
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button variant="default" onClick={onSave}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}
