/**
 * 种植移入/移出操作弹窗
 * 管理植株在不同区域之间的移动
 */
import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui';
import {
  Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  DatePicker, TextArea, Input
} from '../../../ui';
import { showAlert } from '@/lib/dialogService';

// ========== 表单数据接口 ==========
export interface MoveFormData {
  /** 操作类型 */
  operationType: 'move_in' | 'move_out';
  /** 标签编号 */
  labelNumber: string;
  /** 目标区域 */
  targetArea: string;
  /** 操作日期 */
  operationDate: string;
  /** 备注 */
  remarks: string;
}

// ========== 组件属性 ==========

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
interface PlantingMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 可选区域列表 */
  areaOptions: Array<{ value: string; label: string }>;
  /** 编辑模式下的初始数据（可选） */
  initialData?: Partial<MoveFormData>;
  /** 提交回调 */
  onSubmit: (data: MoveFormData) => void;
  /** 是否已采收（已采收植株不能移动） */
  isHarvested?: boolean;
}

const defaultForm: MoveFormData = {
  operationType: 'move_in',
  labelNumber: '',
  targetArea: '',
  operationDate: new Date().toISOString().split('T')[0],
  remarks: ''
};

export default function PlantingMoveModal({
  isOpen,
  onClose,
  areaOptions,
  initialData,
  onSubmit,
  isHarvested = false
}: PlantingMoveModalProps) {
  const [form, setForm] = useState<MoveFormData>(defaultForm);

  // 弹窗打开时重置表单
  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...defaultForm, ...initialData } : { ...defaultForm });
    }
  }, [isOpen, initialData]);

  const handleChange = <K extends keyof MoveFormData>(field: K, value: MoveFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.labelNumber.trim()) {
      await showAlert('请输入标签编号');
      return;
    }
    if (!form.targetArea) {
      await showAlert('请选择目标区域');
      return;
    }
    await onSubmit(form);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">移入/移出操作</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-orange-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 业务规则提示 - 已采收植株不能移动 */}
        {isHarvested && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>已采收植株不能移动，请先取消采收状态</span>
          </div>
        )}

        {/* 表单内容 */}
        <div className="p-4 space-y-4">
          {/* 操作类型 */}
          <div>
            <Label className="text-gray-700">操作类型 *</Label>
            <Select
              value={form.operationType}
              onValueChange={(v) => handleChange('operationType', v as 'move_in' | 'move_out')}
              disabled={isHarvested}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="move_in">移入</SelectItem>
                <SelectItem value="move_out">移出</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 标签编号 */}
          <div>
            <Label className="text-gray-700">标签编号 *</Label>
            <Input
              value={form.labelNumber}
              onChange={(e) => handleChange('labelNumber', (e.target as HTMLInputElement).value)}
              placeholder="请输入或扫描标签二维码ID"
              disabled={isHarvested}
              className={deepInputClass}
            />
          </div>

          {/* 目标区域 */}
          <div>
            <Label className="text-gray-700">
              {form.operationType === 'move_in' ? '移入目标区域' : '移出目标区域'} *
            </Label>
            <Select
              value={form.targetArea}
              onValueChange={(v) => handleChange('targetArea', v)}
              disabled={isHarvested}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="选择区域" />
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((area) => (
                  <SelectItem key={area.value} value={area.value}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 操作日期 */}
          <div>
            <Label className="text-gray-700">操作日期</Label>
            <DatePicker
              value={form.operationDate}
              onChange={(date) => handleChange('operationDate', date)}
              disabled={isHarvested}
            />
          </div>

          {/* 备注 */}
          <div>
            <Label className="text-gray-700">备注</Label>
            <TextArea
              value={form.remarks}
              onChange={(e) => handleChange('remarks', (e.target as HTMLTextAreaElement).value)}
              placeholder="备注信息（可选）"
              rows={3}
              disabled={isHarvested}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isHarvested}>
            提交
          </Button>
        </div>
      </div>
    </div>
  );
}
