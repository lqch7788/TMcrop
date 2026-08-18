/**
 * 新增履历行内表单 — 3 Tab（位置变更 / 打标记 / 作废）
 * 2026-08-17：操作引导与文案重构 + 补录/移出 合并
 *  - 「位置变更」Tab 包含起点（默认当前区域，可改）+ 终点（必填）
 *  - 起点=当前区域 → 业务等价"移出到新位置"
 *  - 起点≠当前区域 → 业务等价"补录迁移来源"
 *  - 后端统一 op_type='move'，历史 move_in/move_out 数据仍可读
 *  - 按钮名 + 引导横幅 + 校验 零歧义
 */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ArrowRightLeft, Stamp, Camera, Trash2, Info } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { enhancedApiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PlantLabel } from '@/stores/usePlantLabelStore';

// 2026-08-17：标记从硬编码改为字典加载（plant_mark_status 分类，4 父节点 20 子节点）
// 字典项基础类型（与后端 /api/dictionaries/mark-status 返回结构一致）
export interface MarkDictNode {
  id: string;
  dict_code: string;
  dict_label: string;
  dict_value: string;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
}
export interface MarkDictCategory extends MarkDictNode {
  children: MarkDictNode[];
}

// 2026-08-17：4 Tab（位置变更 / 补录现有属性 / 打标记 / 作废）
type OpType = 'move' | 'patch' | 'mark' | 'void';

// 引导文案
const OP_GUIDE: Record<OpType, { title: string; subtitle: string; effect: string }> = {
  move: {
    title: '位置变更',
    subtitle: '登记这批标签实物的位置迁移（移出 / 补录来源都是这个动作）',
    effect:
      '起点（可改）：默认取当前区域；改成别的区域 = 「补录来源」（用于历史标签/合并拆分场景）\n' +
      '终点（必填）：新位置\n' +
      '提交后：①履历表新增一行（起点 → 终点） ②标签表 move_out_area_name 更新为终点\n' +
      '下次再做位置变更时，"起点"自动取最新已知区域',
  },
  patch: {
    title: '补录现有属性',
    subtitle: '修改当前标签已有的标记状态 + 移出位置（iAGS 标记01 截图功能）',
    effect:
      '标记状态（多选）：从字典里选 1 个主 + N 个次标记（与 plant_labels.mark_ids 一致）\n' +
      '移出位置：修改标签的 move_out_area_name\n' +
      '标记日期：独立于履历日期\n' +
      '⚠ 仅当字段实际变化时才 UPDATE 标签表 + INSERT 履历（iAGS 条件追加模式）\n' +
      '若字段无变化直接提交 → 后端返回 {changed: false}，不写入任何记录',
  },
  mark: {
    title: '打标记',
    subtitle: '给当前标签贴一个状态标签（正常/关注/问题/优质）',
    effect: '提交后：标签立即显示该颜色徽标，方便后续筛选与重点关注',
  },
  void: {
    title: '作废标签',
    subtitle: '结束标签生命周期（标签实物已全部处理，不再使用）',
    effect: '提交后：①标签状态变为"已作废" ②停止所有新增履历与打印 ③不影响历史数据',
  },
};

interface AddResumeFormProps {
  selectedLabel: PlantLabel | null;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function AddResumeForm({ selectedLabel, onSubmitted, onCancel }: AddResumeFormProps) {
  const [addOpType, setAddOpType] = useState<OpType>('move');
  const [addOpDate, setAddOpDate] = useState(todayLocal());
  // 位置变更字段
  const [addFromAreaName, setAddFromAreaName] = useState('');
  const [addToAreaName, setAddToAreaName] = useState('');
  // 2026-08-17：补录现有属性字段
  const [addPatchMarkIds, setAddPatchMarkIds] = useState<string[]>([]);
  const [addPatchToArea, setAddPatchToArea] = useState('');
  const [addPatchMarkDate, setAddPatchMarkDate] = useState(todayLocal());
  const [markTree, setMarkTree] = useState<MarkDictCategory[]>([]);
  const [addMarkIds, setAddMarkIds] = useState<number[]>([]); // 多选 mark id（实际是 dictionaries.id，需后端用字符串 id）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await enhancedApiClient.get<{ tree: MarkDictCategory[] }>(
          '/dictionary/dictionaries/mark-status'
        );
        if (!cancelled && res?.tree) setMarkTree(res.tree);
      } catch {
        // 静默失败：fallback 到硬编码
        if (!cancelled) setMarkTree([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  // 平铺所有子节点用于遍历
  const flatMarkChildren = useMemo(
    () => markTree.flatMap((c) => c.children.map((child) => ({ ...child, parentLabel: c.dict_label }))),
    [markTree]
  );
  // 通用字段
  const [addRemarks, setAddRemarks] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reason, setReason] = useState('');
  const [addPhotoBase64, setAddPhotoBase64] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 当前位置：move_out_area_name 优先（最近一次移出目的地），fallback 到 move_in_area_name
  const currentLocation = useMemo(() => {
    if (!selectedLabel) return '';
    return selectedLabel.move_out_area_name || selectedLabel.move_in_area_name || '';
  }, [selectedLabel]);

  // 切换操作类型时清空 + 预填起点
  const handleOpTypeChange = (t: OpType) => {
    setAddOpType(t);
    setAddFromAreaName('');
    setAddToAreaName('');
    if (t === 'move') {
      // 位置变更模式：起点预填当前区域
      setAddFromAreaName(currentLocation);
    }
    if (t === 'mark') {
      setQuantityChange('');
      setReason('');
      setAddPhotoBase64(null);
    }
    if (t === 'patch') {
      // 2026-08-17：补录现有属性模式：预填当前标记 + 移出位置
      const cur = (selectedLabel as any);
      const curMarkCsv: string = cur?.mark_ids || '';
      if (curMarkCsv) {
        setAddPatchMarkIds(curMarkCsv.split(',').filter(Boolean));
      }
      const curMoveOut: string = cur?.moveOutAreaName || '';
      if (curMoveOut) {
        setAddPatchToArea(curMoveOut);
      }
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

    // 校验
    if (addOpType === 'move') {
      if (!addFromAreaName.trim()) {
        showAlert('请填写"起点"区域');
        return;
      }
      if (!addToAreaName.trim()) {
        showAlert('请填写"终点"区域');
        return;
      }
      if (addFromAreaName.trim() === addToAreaName.trim()) {
        showAlert('"起点"与"终点"不能相同（同区域内不算迁移）');
        return;
      }
    }

    // 2026-08-17：前端兜底校验数量变更范围（防止 max/min 被复制粘贴绕过）
    if (addOpType !== 'mark' && quantityChange !== '') {
      const currentQty = selectedLabel?.quantity ?? 0;
      const absVal = Math.abs(Number(quantityChange));
      if (absVal > currentQty) {
        showAlert(`数量变更绝对值（${absVal}）超出当前标签数量（${currentQty}）。\n单株标签只能填 -1（死亡/消耗），批量标签请确认是否选错标签。`);
        return;
      }
    }

    setAddSubmitting(true);
    try {
      const operatorName =
        useAuthStore.getState().currentUser?.realName ||
        useAuthStore.getState().currentUser?.username ||
        'system';

      if (addOpType === 'mark') {
        if (addMarkIds.length === 0) {
          showAlert('请至少选择一个标记');
          setAddSubmitting(false);
          return;
        }
        // 2026-08-17：mark_ids 数组（主+次标记），dictionaries.id 是字符串
        const res: any = await enhancedApiClient.post('/plant-labels/assign', {
          mark_ids: addMarkIds,
          label_ids: [labelId],
        });
        if (res?.success !== false) {
          onSubmitted();
        } else {
          showAlert('标记失败：' + (res?.error || '未知错误'));
        }
      } else if (addOpType === 'patch') {
        // 2026-08-17：补录现有属性（iAGS 标记01 截图核心）
        if (addPatchMarkIds.length === 0 && addPatchToArea.trim() === '') {
          showAlert('请至少填写标记状态或移出位置');
          setAddSubmitting(false);
          return;
        }
        const patchPayload: Record<string, any> = {
          mark_ids: addPatchMarkIds,
          to_area_name: addPatchToArea.trim() || undefined,
          operation_date: addOpDate,
          mark_date: addPatchMarkDate,
          reason: reason.trim() || '属性补录',
        };
        const patchRes: any = await enhancedApiClient.post(`/plant-labels/${labelId}/patch`, patchPayload);
        if (patchRes?.success !== false) {
          // 后端可能返回 {changed: false}（无字段变化），提示但不报错
          if (patchRes?.data?.changed === false) {
            showAlert('字段无变化，未写入（iAGS 条件追加模式）');
          }
          onSubmitted();
        } else {
          showAlert('补录失败：' + (patchRes?.error || '未知错误'));
        }
      } else {
        const payload: Record<string, any> = {
          operation_type: addOpType,
          operation_date: addOpDate,
          operator_name: operatorName,
          remarks: addRemarks.trim() || null,
          image_base64: addPhotoBase64 || null,
        };

        if (addOpType === 'move') {
          // 统一 op_type='move'，from/to 都传
          payload.from_area_name = addFromAreaName.trim();
          payload.to_area_name = addToAreaName.trim();
        }

        // 数量变更
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
      showAlert('网络错误：' + (e.message));
    } finally {
      setAddSubmitting(false);
    }
  };

  const selectedLabelNumber = selectedLabel?.labelNumber || '-';
  const guide = OP_GUIDE[addOpType];

  return (
    <div className="px-4 py-3 border-t border-emerald-200 bg-emerald-50 flex-shrink-0">
      <div className="text-xs font-semibold text-emerald-900 mb-2">
        新增履历 — 当前标签：{selectedLabelNumber}
      </div>

      {/* 3 Tab 按钮 */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {([
          { v: 'move' as OpType, label: '位置变更', icon: <ArrowRightLeft className="w-3 h-3" />, cls: 'bg-emerald-100 text-emerald-700' },
          { v: 'patch' as OpType, label: '补录现有属性', icon: <Stamp className="w-3 h-3" />, cls: 'bg-amber-100 text-amber-700' },
          { v: 'mark' as OpType, label: '打标记', icon: <Stamp className="w-3 h-3" />, cls: 'bg-purple-100 text-purple-700' },
          { v: 'void' as OpType, label: '作废', icon: <Trash2 className="w-3 h-3" />, cls: 'bg-gray-200 text-gray-700' },
        ]).map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => handleOpTypeChange(opt.v)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              addOpType === opt.v
                ? opt.cls + ' ring-2 ring-offset-1 ring-emerald-400'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.icon}{opt.label}
          </button>
        ))}
      </div>

      {/* 操作引导横幅 */}
      <div className="mb-2 px-3 py-2 bg-white border border-emerald-200 rounded text-xs">
        <div className="font-semibold text-emerald-900 mb-0.5">{guide.title}</div>
        <div className="text-gray-600 mb-1">{guide.subtitle}</div>
        <div className="text-gray-700 whitespace-pre-line leading-relaxed">
          <Info className="w-3 h-3 inline-block mr-0.5 -mt-0.5 text-blue-500" />
          {guide.effect}
        </div>
        {/* 位置变更时显示当前位置上下文 */}
        {addOpType === 'move' && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-gray-500">
            标签当前位置（最新已知）：
            <span className={`ml-1 font-medium ${currentLocation ? 'text-emerald-700' : 'text-amber-600'}`}>
              {currentLocation || '未登记（起点需手动填）'}
            </span>
            <span className="ml-2 text-gray-400">（若不变可直接点确认）</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* 日期 */}
        <Input
          type="date"
          value={addOpDate}
          onChange={(e) => setAddOpDate(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs h-7"
        />

        {/* 位置变更：起点 + 终点 */}
        {addOpType === 'move' && (
          <>
            <Input
              type="text"
              value={addFromAreaName}
              onChange={(e) => setAddFromAreaName(e.target.value)}
              placeholder="起点（默认当前区域）"
              title="起点区域：默认是当前最新已知区域，可手动改成其他区域（=补录来源）"
              className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-44"
            />
            <span className="text-gray-400 text-xs">→</span>
            <Input
              type="text"
              value={addToAreaName}
              onChange={(e) => setAddToAreaName(e.target.value)}
              placeholder="终点（新位置，如：西区-B区）"
              className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-44"
            />
          </>
        )}

        {/* 标记选择（2026-08-17：字典加载 + 父节点分组 + 多选） */}
        {addOpType === 'mark' && (
          <div className="flex flex-wrap gap-2">
            {markTree.length === 0 && (
              <span className="text-xs text-amber-600">暂无标记（系统设置 → 数据字典 → 标记状态 配置）</span>
            )}
            {markTree.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">{cat.dict_label}</span>
                <div className="flex flex-wrap gap-1">
                  {cat.children.map((child) => {
                    const selected = addMarkIds.includes(child.id);
                    return (
                      <button
                        key={child.id}
                        type="button"
                        title={`${cat.dict_label} / ${child.dict_label}`}
                        onClick={() => setAddMarkIds((prev) =>
                          selected ? prev.filter((x) => x !== child.id) : [...prev, child.id]
                        )}
                        className={`px-2 py-1 rounded text-xs font-medium text-white ${
                          selected ? 'ring-2 ring-offset-1 ring-emerald-400' : 'opacity-70'
                        }`}
                        style={{ backgroundColor: child.color || '#9ca3af' }}
                      >
                        {child.dict_label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 补录现有属性（2026-08-17：标记状态多选 + 移出位置 + 标记日期） */}
        {addOpType === 'patch' && (
          <div className="flex flex-wrap gap-2 items-start">
            {/* 标记状态多选 */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">标记状态（多选）</span>
              {markTree.length === 0 ? (
                <span className="text-xs text-amber-600">暂无标记（系统设置 → 数据字典 → 标记状态 配置）</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {markTree.map((cat) => (
                    <div key={cat.id} className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500">{cat.dict_label}</span>
                      <div className="flex flex-wrap gap-1">
                        {cat.children.map((child) => {
                          const selected = addPatchMarkIds.includes(child.id);
                          return (
                            <button
                              key={child.id}
                              type="button"
                              title={`${cat.dict_label} / ${child.dict_label}`}
                              onClick={() => setAddPatchMarkIds((prev) =>
                                selected ? prev.filter((x) => x !== child.id) : [...prev, child.id]
                              )}
                              className={`px-2 py-1 rounded text-xs font-medium text-white ${
                                selected ? 'ring-2 ring-offset-1 ring-amber-400' : 'opacity-70'
                              }`}
                              style={{ backgroundColor: child.color || '#9ca3af' }}
                            >
                              {child.dict_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* 移出位置 */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">移出位置（修改）</span>
              <Input
                type="text"
                value={addPatchToArea}
                onChange={(e) => setAddPatchToArea(e.target.value)}
                placeholder="如：西区-B区"
                className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-44"
              />
            </div>
            {/* 标记日期 */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">标记日期</span>
              <Input
                type="date"
                value={addPatchMarkDate}
                onChange={(e) => setAddPatchMarkDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-40"
              />
            </div>
            {/* 原因 */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">原因</span>
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="如：补录历史数据"
                className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-44"
              />
            </div>
          </div>
        )}

        {/* 数量变更（位置变更 / 作废时显示；2026-08-17 加 quantity 上下文与范围校验） */}
        {addOpType !== 'mark' && (() => {
          // 2026-08-17：标签当前 quantity 单株通常为 1，提示用户输入范围
          const currentQty = selectedLabel?.quantity ?? 0;
          const parsed = quantityChange === '' ? null : Number(quantityChange);
          const overLimit = parsed !== null && Math.abs(parsed) > currentQty;
          const hintText = currentQty === 1
            ? '此标签为单株标签（当前数量=1），通常 -1 表示死亡/消耗；只能填 -1 或 0'
            : `此标签当前数量=${currentQty}，变更范围 -${currentQty} ~ +${currentQty}`;
          return (
            <div className="flex flex-col gap-0.5">
              <Input
                type="number"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                min={-currentQty}
                max={currentQty}
                placeholder={currentQty === 1 ? '数量变更（单株：通常填 -1）' : `数量变更（-${currentQty} ~ +${currentQty}）`}
                title={hintText}
                className={`px-2 py-1 border rounded text-xs h-7 w-40 ${
                  overLimit ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {overLimit && (
                <span className="text-xs text-red-600">
                  ⚠ 超出当前数量（${currentQty}），提交会被后端拒绝
                </span>
              )}
            </div>
          );
        })()}

        {/* 原因（位置变更 / 作废时显示） */}
        {addOpType !== 'mark' && (
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="原因（如：移栽损耗）"
            className="px-2 py-1 border border-gray-300 rounded text-xs h-7 flex-1 min-w-[120px]"
          />
        )}

        {/* 备注 */}
        <Input
          type="text"
          value={addRemarks}
          onChange={(e) => setAddRemarks(e.target.value)}
          placeholder="备注（可选）"
          className="px-2 py-1 border border-gray-300 rounded text-xs h-7 flex-1 min-w-[120px]"
        />

        {/* 拍照 */}
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
