/**
 * 新增履历行内表单 — 4 Tab（移入/移出/打标记/作废）
 * 从 SeedlingLabelManageModal 底部表单提取 + 扩展 void Tab + 数量字段
 * 2026-06-23: 粒度扩展 — quantityChange / reason / expectedQuantity
 */
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Stamp, Camera, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { enhancedApiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PlantLabel } from '@/stores/usePlantLabelStore';

// 标记选项（与后端 plant_marks 默认数据一致）
const MARK_OPTIONS = [
  { id: 1, name: '正常', color: '#22c55e' },
  { id: 2, name: '关注', color: '#f59e0b' },
  { id: 3, name: '问题', color: '#ef4444' },
  { id: 4, name: '优质', color: '#3b82f6' },
];

type OpType = 'move_in' | 'move_out' | 'mark' | 'void';

interface AddResumeFormProps {
  selectedLabel: PlantLabel | null;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function AddResumeForm({ selectedLabel, onSubmitted, onCancel }: AddResumeFormProps) {
  const [addOpType, setAddOpType] = useState<OpType>('move_in');
  const [addOpDate, setAddOpDate] = useState(todayLocal());
  const [addAreaName, setAddAreaName] = useState('');
  const [addMarkId, setAddMarkId] = useState<number>(2);
  const [addRemarks, setAddRemarks] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  // 2026-06-23: 数量字段
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reason, setReason] = useState('');

  // 拍照
  const [addPhotoBase64, setAddPhotoBase64] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 切换操作类型时清空关联字段
  const handleOpTypeChange = (t: OpType) => {
    setAddOpType(t);
    setAddAreaName('');
    if (t === 'mark') {
      setQuantityChange('');
      setReason('');
      setAddPhotoBase64(null);
    }
  };

  // 选择图片 → Base64 预览
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showAlert('图片不能超过 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAddPhotoBase64((ev.target?.result as string) || null);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 提交
  const handleSubmit = async () => {
    const labelId = selectedLabel?.id as number | undefined;
    if (!labelId) { showAlert('请先选择左侧标签'); return; }
    if (addOpType !== 'mark' && addOpType !== 'void' && !addAreaName.trim()) {
      showAlert('请输入区域名称');
      return;
    }
    setAddSubmitting(true);
    try {
      const operatorName =
        useAuthStore.getState().currentUser?.realName ||
        useAuthStore.getState().currentUser?.username ||
        'system';

      if (addOpType === 'mark') {
        // 打标记（专用接口）
        const res: any = await enhancedApiClient.post('/plant-labels/marks/assign', {
          mark_id: addMarkId,
          label_ids: [labelId],
        });
        if (res?.success !== false) {
          onSubmitted();
        } else {
          showAlert('标记失败：' + (res?.error || '未知错误'));
        }
      } else {
        // 移入/移出/作废 — 统一履历接口
        const payload: Record<string, any> = {
          operation_type: addOpType,
          operation_date: addOpDate,
          operator_name: operatorName,
          remarks: addRemarks.trim() || null,
          image_base64: addPhotoBase64 || null,
        };
        // 区域（移入/移出需要）
        if (addOpType !== 'void') {
          payload.to_area_name = addAreaName.trim();
        }
        // 数量变更（2026-06-23 新增）
        if (quantityChange !== '') {
          payload.quantity_change = Number(quantityChange);
          payload.expected_quantity = selectedLabel.quantity ?? undefined;
        }
        // 原因
        if (reason.trim()) {
          payload.reason = reason.trim();
        }

        const res: any = await enhancedApiClient.post(`/plant-labels/${labelId}/resumes`, payload);
        if (res?.success !== false) {
          onSubmitted();
        } else {
          showAlert('录入失败：' + (res?.error || '未知错误'));
        }
      }
    } catch (e) {
      showAlert('网络错误：' + (e as Error).message);
    } finally {
      setAddSubmitting(false);
    }
  };

  const selectedLabelNumber = selectedLabel?.labelNumber || '-';

  return (
    <div className="px-4 py-3 border-t border-emerald-200 bg-emerald-50 flex-shrink-0">
      <div className="text-xs font-semibold text-emerald-900 mb-2">
        新增履历 — 当前标签：{selectedLabelNumber}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* 4 个操作类型 Tab */}
        {([
          { v: 'move_in' as OpType, label: '移入', icon: <ArrowRight className="w-3 h-3" />, cls: 'bg-emerald-100 text-emerald-700' },
          { v: 'move_out' as OpType, label: '移出', icon: <ArrowLeft className="w-3 h-3" />, cls: 'bg-orange-100 text-orange-700' },
          { v: 'mark' as OpType, label: '打标记', icon: <Stamp className="w-3 h-3" />, cls: 'bg-purple-100 text-purple-700' },
          { v: 'void' as OpType, label: '作废', icon: <Trash2 className="w-3 h-3" />, cls: 'bg-gray-100 text-gray-700' },
        ]).map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => handleOpTypeChange(opt.v)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              addOpType === opt.v
                ? opt.cls + ' ring-2 ring-offset-1 ring-emerald-400'
                : 'bg-white text-gray-600 border border-gray-300'
            }`}
          >
            {opt.icon}{opt.label}
          </button>
        ))}

        {/* 日期 */}
        <Input
          type="date"
          value={addOpDate}
          onChange={(e) => setAddOpDate(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs h-7"
        />

        {/* 区域输入（移入/移出用） */}
        {addOpType !== 'mark' && addOpType !== 'void' && (
          <Input
            type="text"
            value={addAreaName}
            onChange={(e) => setAddAreaName(e.target.value)}
            placeholder={addOpType === 'move_in' ? '移入到哪个区域（如：东区-A区）' : '移出到哪个区域（如：隔离区）'}
            className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-48"
          />
        )}

        {/* 标记选择（打标记用） */}
        {addOpType === 'mark' && (
          <div className="flex gap-1">
            {MARK_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAddMarkId(m.id)}
                className={`px-2 py-1 rounded text-xs font-medium text-white ${
                  addMarkId === m.id ? 'ring-2 ring-offset-1 ring-emerald-400' : 'opacity-70'
                }`}
                style={{ backgroundColor: m.color }}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {/* 数量变更（2026-06-23 新增：非标记操作时显示） */}
        {addOpType !== 'mark' && (
          <Input
            type="number"
            value={quantityChange}
            onChange={(e) => setQuantityChange(e.target.value)}
            placeholder="数量变更（如：-5, +3）"
            className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-36"
          />
        )}

        {/* 原因（2026-06-23 新增） */}
        {addOpType !== 'mark' && (
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="原因（如：移栽损耗）"
            className="px-2 py-1 border border-gray-300 rounded text-xs h-7 flex-1 min-w-[120px]"
          />
        )}

        {/* 备注（通用） */}
        <Input
          type="text"
          value={addRemarks}
          onChange={(e) => setAddRemarks(e.target.value)}
          placeholder="备注（可选）"
          className="px-2 py-1 border border-gray-300 rounded text-xs h-7 flex-1 min-w-[120px]"
        />

        {/* 拍照按钮 */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <Button
          onClick={() => photoInputRef.current?.click()}
          variant="outline"
          size="sm"
          title="拍照/选择图片"
        >
          <Camera className="w-4 h-4" />
          {addPhotoBase64 ? '已附图' : '拍照'}
        </Button>

        {/* 操作按钮 */}
        <Button onClick={handleSubmit} disabled={addSubmitting} size="sm">
          {addSubmitting ? '提交中...' : '确认'}
        </Button>
        <Button
          onClick={() => { onCancel(); setAddPhotoBase64(null); }}
          variant="secondary"
          size="sm"
        >
          取消
        </Button>
      </div>

      {/* 图片预览 */}
      {addPhotoBase64 && (
        <div className="mt-2 flex items-center gap-2">
          <img
            src={addPhotoBase64}
            alt="预览"
            className="w-16 h-16 object-cover rounded border border-gray-300"
          />
          <button
            type="button"
            onClick={() => setAddPhotoBase64(null)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            删除图片
          </button>
        </div>
      )}
    </div>
  );
}

export default AddResumeForm;
