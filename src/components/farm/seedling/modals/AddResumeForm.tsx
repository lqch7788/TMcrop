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
import { ArrowRightLeft, Stamp, Camera, Trash2, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { enhancedApiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PlantLabel } from '@/stores/usePlantLabelStore';
import { MarkCategoryPicker, type MarkDictCategory } from './MarkCategoryPicker';

// 2026-08-17：标记从硬编码改为字典加载（plant_mark_status 分类，4 父节点 20 子节点）
// 字典项基础类型（与后端 /api/dictionaries/mark-status 返回结构一致）
// 注：MarkDictNode/MarkDictCategory 类型已迁移到 ./MarkCategoryPicker，本文件 re-export 以保持历史 import 兼容
export type { MarkDictNode, MarkDictCategory } from './MarkCategoryPicker';

// 2026-08-17：4 Tab（位置变更 / 补录现有属性 / 打标记 / 作废）
type OpType = 'move' | 'patch' | 'mark' | 'void';

// 引导文案 — 2026-08-19：明确区分 mark（动作流）和 patch（条件追加）
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
    subtitle: '补录历史漏掉的标记或位置（iAGS 条件追加 — 仅字段真变化才写入）',
    effect:
      '⚠ 与"标记状态"的区别：本 Tab 是「补漏」语义，每次保存前会对比当前值\n' +
      '  → 字段无变化 → 后端返回 {changed: false}，不写入任何记录（避免空履历）\n' +
      '  → 字段有变化 → UPDATE 标签表 + INSERT 履历\n' +
      '标记日期：可指定历史某天（默认今天）\n' +
      '原因：必须填写，说明为什么补录\n' +
      '拍照：可选现场取证（最多 5 张）',
  },
  mark: {
    title: '标记状态',
    subtitle: '现场立即登记标签当前状态（含照片存证，写入事件流）',
    effect:
      '⚠ 与"补录现有属性"的区别：本 Tab 是「动作」语义，每次保存都写入一条新事件\n' +
      '  → 不论是否与上次标记相同，都会 INSERT 履历（事件流模型）\n' +
      '  → 想"覆盖"标签的 mark_ids 而不留痕迹？请用「补录现有属性」\n' +
      '标记选择：从 6 大类里多选（健康/病害/长势/品质/事件/状态）\n' +
      '拍照：可选现场取证（最多 5 张）',
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

  // 2026-08-19：2 个下拉（大类单选 → 子项复选框），勾选后不显示 chip（复选框即勾选态）
  const [addMarkCategory, setAddMarkCategory] = useState<string>('');
  const [addActivePatchCategory, setAddActivePatchCategory] = useState<string>('');
  const [markTree, setMarkTree] = useState<MarkDictCategory[]>([]);
  const [addMarkIds, setAddMarkIds] = useState<string[]>([]); // 多选字典 id（dictionaries.id，字符串）
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
  // 平铺所有子节点用于遍历（MarkDictCategory 来自共享组件，已是 camelCase）
  const flatMarkChildren = useMemo(
    () => markTree.flatMap((c) => c.children.map((child) => ({ ...child, parentLabel: c.dictLabel }))),
    [markTree]
  );
  // 通用字段
  const [addRemarks, setAddRemarks] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reason, setReason] = useState('');
  const [addPhotos, setAddPhotos] = useState<string[]>([]); // 最多 5 张照片 base64 数组
  const [showGuide, setShowGuide] = useState(false); // 2026-08-19：操作引导横幅默认隐藏，点击"说明"按钮展开
  const photoInputRef = useRef<HTMLInputElement>(null);
  const MAX_PHOTOS = 5;

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
      setAddPhotos([]);
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

  // 选择图片 → Base64 预览（追加到数组，最多 5 张）
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // 限 5 张 — 现有 + 新增
    const remaining = MAX_PHOTOS - addPhotos.length;
    if (remaining <= 0) {
      showAlert(`最多只能拍 ${MAX_PHOTOS} 张照片`);
      e.target.value = '';
      return;
    }
    const toRead = Array.from(files).slice(0, remaining);
    let pending = toRead.length;
    toRead.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        showAlert(`"${file.name}" 超过 2MB，已跳过`);
        pending--;
        if (pending === 0) e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = (ev.target?.result as string) || '';
        if (result) {
          // 函数式 setState 避免 stale closure（多文件并行 read 时 last value 覆盖问题）
          setAddPhotos((prev) => (prev.length < MAX_PHOTOS ? [...prev, result] : prev));
        }
        pending--;
        if (pending === 0) e.target.value = '';
      };
      reader.readAsDataURL(file);
    });
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
        // 2026-08-19：标记操作支持多张照片（最多 5 张，JSON 数组）
        const photosJson = addPhotos.length > 0 ? JSON.stringify(addPhotos) : null;
        const res: any = await enhancedApiClient.post('/plant-labels/assign', {
          mark_ids: addMarkIds,
          label_ids: [labelId],
          image_base64: photosJson,
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
          // 2026-08-19：patch Tab 支持拍照（最多 5 张，JSON 数组），与 mark Tab 共用同一 addPhotos state
          image_base64: addPhotos.length > 0 ? JSON.stringify(addPhotos) : null,
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
          // 2026-08-19：照片改为 JSON 数组（最多 5 张），与项目 pictures 字段一致
          image_base64: addPhotos.length > 0 ? JSON.stringify(addPhotos) : null,
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

      {/* Tab 按钮 + 引导说明开关（2026-08-19：引导横幅默认隐藏） */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {([
          { v: 'move' as OpType, label: '位置变更', icon: <ArrowRightLeft className="w-3 h-3" />, cls: 'bg-emerald-100 text-emerald-700' },
          { v: 'patch' as OpType, label: '补录现有属性', icon: <Stamp className="w-3 h-3" />, cls: 'bg-amber-100 text-amber-700' },
          { v: 'mark' as OpType, label: '标记状态', icon: <Stamp className="w-3 h-3" />, cls: 'bg-purple-100 text-purple-700' },
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
        {/* 2026-08-19：说明按钮（toggle 引导横幅显隐） */}
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200"
          title={showGuide ? '收起说明' : '展开说明'}
        >
          <Info className="w-3 h-3" />
          说明
          {showGuide ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {/* 操作引导横幅（默认隐藏） */}
      {showGuide && (
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
      )}

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

        {/* 标记选择（2026-08-19：大类下拉单选 → 子项复选框多选）— 抽到共享组件 MarkCategoryPicker */}
        {addOpType === "mark" && (
          <MarkCategoryPicker
            markTree={markTree}
            selectedCategory={addMarkCategory}
            onCategoryChange={(v) => { setAddMarkCategory(v || ''); setAddMarkIds([]); }}
            selectedIds={addMarkIds}
            onIdsChange={setAddMarkIds}
            accent="purple"
          />
        )}

        {/* 补录现有属性（2026-08-19：大类下拉 → 子项复选框 + 移出位置 + 标记日期）— 选择器抽到共享组件 */}
        {addOpType === "patch" && (
          <div className="flex flex-col gap-2 max-w-xl">
            <MarkCategoryPicker
              markTree={markTree}
              selectedCategory={addActivePatchCategory}
              onCategoryChange={(v) => { setAddActivePatchCategory(v || ''); setAddPatchMarkIds([]); }}
              selectedIds={addPatchMarkIds}
              onIdsChange={setAddPatchMarkIds}
              accent="amber"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 whitespace-nowrap" style={{ width: 80 }}>移出位置</span>
              <input type="text" value={addPatchToArea} onChange={(e) => setAddPatchToArea(e.target.value)} placeholder="如：西区-B区" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 whitespace-nowrap" style={{ width: 80 }}>标记日期</span>
              <input type="date" value={addPatchMarkDate} onChange={(e) => setAddPatchMarkDate(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 whitespace-nowrap" style={{ width: 80 }}>原因</span>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：补录历史数据" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs" />
            </div>
          </div>
        )}        {/* 拍照 */}
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
          title={`拍照/选择图片（最多 ${MAX_PHOTOS} 张）`}
        >
          <Camera className="w-4 h-4" />
          {addPhotos.length > 0 ? `已附图 ${addPhotos.length}/${MAX_PHOTOS}` : '拍照'}
        </Button>

        <Button onClick={handleSubmit} disabled={addSubmitting} size="sm">
          {addSubmitting ? '提交中...' : '确认'}
        </Button>
        <Button
          onClick={() => { onCancel(); setAddPhotos([]); }}
          variant="secondary"
          size="sm"
        >
          取消
        </Button>
      </div>

      {/* 图片预览（最多 MAX_PHOTOS 张网格） */}
      {addPhotos.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {addPhotos.map((src, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={src}
                  alt={`照片${idx + 1}`}
                  className="w-16 h-16 object-cover rounded border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setAddPhotos((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除此照片"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {addPhotos.length < MAX_PHOTOS && (
            <p className="text-[10px] text-gray-500 mt-1">还可再添加 {MAX_PHOTOS - addPhotos.length} 张</p>
          )}
        </div>
      )}
    </div>
  );
}

export default AddResumeForm;
