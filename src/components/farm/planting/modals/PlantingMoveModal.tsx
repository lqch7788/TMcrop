/**
 * 种植移入/移出操作弹窗（整批级别，2026-06-19 重构）
 *
 * 与之前 PlantLabel 单株粒度的区别：
 * - 不依赖 plant_labels 表（之前该表几乎为空，导致"找不到标签"）
 * - 直接在 planting 行级别更新 areaId/areaName
 * - 写入 planting_move_records 履历
 * - 添加"数量"字段（移入/移出多少株）
 *
 * 字段集：
 * - 操作类型（移入/移出）
 * - 目标区域
 * - 数量（必填）
 * - 操作日期
 * - 备注
 */
import React, { useEffect, useState } from 'react';
import { MoveRight, AlertCircle } from 'lucide-react';
import { Label, UnifiedModal } from '@/components/ui';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  DatePicker, TextArea, NumberInput
} from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

// ========== 表单数据接口 ==========
export interface MoveFormData {
  /** 操作类型 */
  operationType: 'move_in' | 'move_out';
  /** 目标区域 ID */
  toAreaId: string;
  /** 目标区域名称 */
  toAreaName: string;
  /** 数量（株） */
  quantity: number;
  /** 操作日期 */
  operationDate: string;
  /** 备注 */
  remarks: string;
}

// ========== 组件属性 ==========

const deepInputClass = 'px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner';

interface PlantingMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 可选区域列表（含 value/label） */
  areaOptions: Array<{ value: string; label: string }>;
  /** 编辑模式下的初始数据（可选） */
  initialData?: Partial<MoveFormData>;
  /** 提交回调 */
  onSubmit: (data: MoveFormData) => Promise<boolean> | boolean;
  /** 是否已采收（已采收植株不能移动） */
  isHarvested?: boolean;
  /** 剩余可移动数量（默认 = 种植数量） */
  maxQuantity?: number;
  /** 当前操作员（弹窗标题前缀） */
  currentOperator?: string;
}

const defaultForm: MoveFormData = {
  operationType: 'move_in',
  toAreaId: '',
  toAreaName: '',
  quantity: 0,
  operationDate: todayLocal(),
  remarks: '',
};

export default function PlantingMoveModal({
  isOpen,
  onClose,
  areaOptions,
  initialData,
  onSubmit,
  isHarvested = false,
  maxQuantity,
  currentOperator,
}: PlantingMoveModalProps) {
  const [form, setForm] = useState<MoveFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开时重置表单
  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...defaultForm, ...initialData } : { ...defaultForm });
    }
  }, [isOpen, initialData]);

  const handleChange = <K extends keyof MoveFormData>(field: K, value: MoveFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAreaChange = (value: string) => {
    // 从 areaOptions 同时取 id 和 name（约定 value 格式 "id|name"）
    const [id, name] = value.split('|');
    setForm((prev) => ({ ...prev, toAreaId: id, toAreaName: name }));
  };

  const handleSubmit = async () => {
    if (!form.toAreaName) {
      await showAlert('请选择目标区域');
      return;
    }
    if (!form.quantity || form.quantity <= 0) {
      await showAlert('请填写数量（> 0）');
      return;
    }
    if (maxQuantity && form.quantity > maxQuantity) {
      await showAlert(`数量 ${form.quantity} 超过最大可移动 ${maxQuantity}`);
      return;
    }
    setSubmitting(true);
    try {
      const ok = await onSubmit(form);
      if (ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 当前 areaOptions 不含 id 字段的兼容方案
  const areaValue = (() => {
    if (!form.toAreaName) return ''
    const match = areaOptions.find((a) => a.label === form.toAreaName)
    if (match) return `${match.value}|${match.label}`
    return form.toAreaName
  })()

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`移入/移出操作${isHarvested ? '（已采收植株不可移动）' : ''}`}
      size="md"
      // 2026-06-19: 默认大小 +50%（md=500px → 750px，精确无 size 档位 750）
      width={750}
      height={500}
      showFooter={true}
      onSubmit={isHarvested ? undefined : handleSubmit}
      submitText={submitting ? '处理中...' : '提交'}
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 业务规则提示 - 已采收植株不能移动 */}
        {isHarvested && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>已采收植株不能移动，请先取消采收状态</span>
          </div>
        )}

        {/* 操作类型 */}
        <div>
          <Label className="text-gray-900">操作类型 *</Label>
          <Select
            value={form.operationType}
            onValueChange={(v) => handleChange('operationType', v as 'move_in' | 'move_out')}
            disabled={isHarvested}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="move_in">
                <span className="flex items-center gap-1.5"><MoveRight className="w-3.5 h-3.5" /> 移入</span>
              </SelectItem>
              <SelectItem value="move_out">
                <span className="flex items-center gap-1.5"><MoveRight className="w-3.5 h-3.5 rotate-180" /> 移出</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 目标区域 */}
        <div>
          <Label className="text-gray-900">
            {form.operationType === 'move_in' ? '移入目标区域' : '移出目标区域'} *
          </Label>
          {areaOptions.length === 0 ? (
            <div>
              <div className={`${deepInputClass} bg-gray-50 text-gray-500 italic`}>
                暂无可用区域，请先在【基础数据-种植区域】中配置
              </div>
              <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                需要先配置种植区域字典
              </p>
            </div>
          ) : (
            <Select
              value={areaValue}
              onValueChange={handleAreaChange}
              disabled={isHarvested}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="选择区域" />
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((area) => (
                  <SelectItem key={area.value} value={`${area.value}|${area.label}`}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 数量（株） */}
        <div>
          <Label className="text-gray-900">数量（株）*</Label>
          <NumberInput
            value={form.quantity}
            onChange={(v) => handleChange('quantity', Number(v) || 0)}
            min={0}
            max={maxQuantity || undefined}
            className={deepInputClass}
            placeholder="0"
            disabled={isHarvested}
          />
          {maxQuantity ? (
            <p className="mt-1 text-xs text-gray-500">
              剩余可移动：<span className="font-semibold">{maxQuantity}</span> 株
            </p>
          ) : null}
        </div>

        {/* 操作日期 */}
        <div>
          <Label className="text-gray-900">操作日期</Label>
          <DatePicker
            className="w-full"
            // 2026-06-21: 修复 DatePicker prop 错配 — 之前用 `value` 字符串传入但组件只接受 `selected: Date`
            // 表现：input 显示空字符串、点不动日历选择器
            selected={form.operationDate ? new Date(form.operationDate) : undefined}
            onChange={(date) =>
              handleChange(
                'operationDate',
                date ? date.toISOString().slice(0, 10) : todayLocal()
              )
            }
            disabled={isHarvested}
          />
        </div>

        {/* 备注 */}
        <div>
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={form.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="备注信息（可选）"
            rows={3}
            disabled={isHarvested}
            className={deepInputClass}
          />
        </div>

        {/* 操作员信息 */}
        {currentOperator && (
          <div className="text-xs text-gray-500">
            操作员：<span className="font-medium text-gray-700">{currentOperator}</span>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
