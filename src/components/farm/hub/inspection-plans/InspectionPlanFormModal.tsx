/**
 * 巡查计划表单弹窗（2026-10-21 P3）
 *
 * 分区：基本信息 → 巡查对象 → 频率与时间 → 执行与排班 → 检查项模板
 * 校验与后端 §6.2 同口径（前端先拦一道，减少无谓往返；后端仍是权威）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Label, Modal, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TextArea } from '@/components/ui';
import { useInspectionPlanStore, type InspectionPlan, type PlanChecklistItem } from '@/stores/useInspectionPlanStore';
import { INSPECTION_TYPES } from '@/types/farm/common';
import { showAlert } from '@/lib/dialogService';

interface Props {
  isOpen: boolean;
  plan?: InspectionPlan | null;
  onClose: () => void;
  onSaved?: (plan: InspectionPlan) => void;
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
  { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

const FREQUENCY_OPTIONS = [
  { value: 'once', label: '一次性' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

export function InspectionPlanFormModal({ isOpen, plan, onClose, onSaved }: Props) {
  const { createPlan, updatePlan } = useInspectionPlanStore();
  const isEdit = !!plan;

  const [form, setForm] = useState({
    title: '',
    inspectionType: 'farm',
    // 巡查对象
    greenhouseName: '',
    cropName: '',
    equipmentName: '',
    infrastructureName: '',
    area: '',
    // 频率与时间
    frequency: 'weekly',
    intervalValue: 1,
    weekdays: [1] as number[],
    dayOfMonth: 1,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    windowDays: 14,
    defaultTime: '09:00',
    durationHours: 1,
    // 执行与排班
    assigneeId: '',
    assigneeName: '',
    autoSchedule: true,
    // 检查项模板
    checklist: [] as PlanChecklistItem[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (plan) {
      const weekdays = Array.isArray(plan.weekdays)
        ? plan.weekdays
        : (() => { try { return JSON.parse(String(plan.weekdays || '[]')); } catch { return []; } })();
      let checklist: PlanChecklistItem[] = [];
      try {
        const parsed = typeof plan.checklist === 'string' ? JSON.parse(plan.checklist) : plan.checklist;
        checklist = Array.isArray(parsed) ? parsed : [];
      } catch { checklist = []; }
      setForm({
        title: plan.title || '',
        inspectionType: plan.inspectionType || 'farm',
        greenhouseName: plan.greenhouseName || '',
        cropName: plan.cropName || '',
        equipmentName: plan.equipmentName || '',
        infrastructureName: plan.infrastructureName || '',
        area: plan.area || '',
        frequency: plan.frequency || 'weekly',
        intervalValue: Number(plan.intervalValue ?? 1) || 1,
        weekdays: (weekdays as number[]).length > 0 ? (weekdays as number[]) : [1],
        dayOfMonth: Number(plan.dayOfMonth ?? 1) || 1,
        startDate: plan.startDate || new Date().toISOString().slice(0, 10),
        endDate: plan.endDate || '',
        windowDays: Number(plan.windowDays ?? 14) || 14,
        defaultTime: plan.defaultTime || '09:00',
        durationHours: Number(plan.durationHours ?? 1) || 1,
        assigneeId: plan.assigneeId || '',
        assigneeName: plan.assigneeName || '',
        autoSchedule: plan.autoSchedule !== 0,
        checklist,
      });
    } else {
      setForm({
        title: '', inspectionType: 'farm', greenhouseName: '', cropName: '',
        equipmentName: '', infrastructureName: '', area: '',
        frequency: 'weekly', intervalValue: 1, weekdays: [1], dayOfMonth: 1,
        startDate: new Date().toISOString().slice(0, 10), endDate: '',
        windowDays: 14, defaultTime: '09:00', durationHours: 1,
        assigneeId: '', assigneeName: '', autoSchedule: true, checklist: [],
      });
    }
    setErrors({});
  }, [isOpen, plan]);

  const validate = useMemo(() => () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = '请填写计划名称';
    if (!form.assigneeName.trim()) next.assigneeName = '请填写执行人（否则生成的巡查任务无人可派）';
    if (!form.startDate) next.startDate = '请选择开始日期';
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      next.endDate = '结束日期不能早于开始日期';
    }
    if (form.windowDays < 1 || form.windowDays > 90) next.windowDays = '生成窗口须为 1..90 天';
    if (form.intervalValue < 1) next.intervalValue = '间隔须 ≥ 1';
    if (form.frequency === 'weekly' && form.weekdays.length === 0) {
      next.weekdays = '请至少选择一个周几';
    }
    if (form.frequency === 'monthly' && (form.dayOfMonth < 1 || form.dayOfMonth > 28)) {
      next.dayOfMonth = '每月几号须为 1..28';
    }
    if (form.inspectionType === 'safety' && !form.area.trim()) {
      next.area = '安全检查必须填写检查区域/场所';
    }
    if (form.inspectionType === 'equipment' && !form.equipmentName.trim()) {
      next.equipmentName = '请填写设备名称';
    }
    if (form.inspectionType === 'infrastructure' && !form.infrastructureName.trim()) {
      next.infrastructureName = '请填写设施名称';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      inspectionType: form.inspectionType,
      frequency: form.frequency,
      intervalValue: form.intervalValue,
      weekdays: form.frequency === 'weekly' ? form.weekdays : [],
      dayOfMonth: form.frequency === 'monthly' ? form.dayOfMonth : null,
      startDate: form.startDate,
      endDate: form.endDate || null,
      windowDays: form.windowDays,
      defaultTime: form.defaultTime,
      durationHours: form.durationHours,
      assigneeId: form.assigneeId || form.assigneeName.trim(),
      assigneeName: form.assigneeName.trim(),
      autoSchedule: form.autoSchedule,
      greenhouseName: form.greenhouseName || null,
      cropName: form.cropName || null,
      equipmentName: form.equipmentName || null,
      infrastructureName: form.infrastructureName || null,
      area: form.area || null,
      checklist: form.checklist,
    };

    try {
      const result = isEdit && plan
        ? await updatePlan(plan.id, payload)
        : await createPlan(payload);
      if (!result) {
        showAlert('保存失败，请稍后重试');
        return;
      }
      const gen = result.generate;
      if (gen && gen.created.length > 0) {
        showAlert(
          `计划已保存，生成 ${gen.created.length} 条实例任务` +
          (gen.scheduled ? `，已排班 ${gen.scheduled} 条` : '') +
          (Object.keys(gen.unscheduledReasons || {}).length
            ? `；${Object.keys(gen.unscheduledReasons).length} 条未排班（见详情）`
            : '')
        );
      }
      onSaved?.(result.plan);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `编辑巡查计划 - ${plan?.planCode || ''}` : '新建巡查计划'}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto px-1">
        {/* 基本信息 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">基本信息</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">计划名称 *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：1号卷帘机每日巡检" />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">巡查类型 *</Label>
              <Select value={form.inspectionType} onValueChange={(v) => setForm({ ...form, inspectionType: v })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value as string}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 巡查对象 */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-slate-700">巡查对象</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.inspectionType === 'farm' && (
              <>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">温室/区域</Label>
                  <Input value={form.greenhouseName} onChange={(e) => setForm({ ...form, greenhouseName: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">作物</Label>
                  <Input value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} />
                </div>
              </>
            )}
            {form.inspectionType === 'equipment' && (
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-600 mb-1 block">设备名称 *</Label>
                <Input value={form.equipmentName} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} placeholder="如：1号卷帘机" />
                {errors.equipmentName && <p className="text-xs text-red-600 mt-1">{errors.equipmentName}</p>}
              </div>
            )}
            {form.inspectionType === 'infrastructure' && (
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-600 mb-1 block">设施名称 *</Label>
                <Input value={form.infrastructureName} onChange={(e) => setForm({ ...form, infrastructureName: e.target.value })} />
                {errors.infrastructureName && <p className="text-xs text-red-600 mt-1">{errors.infrastructureName}</p>}
              </div>
            )}
            {(form.inspectionType === 'safety' || form.inspectionType === 'other') && (
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-600 mb-1 block">
                  检查区域/场所{form.inspectionType === 'safety' ? ' *' : ''}
                </Label>
                <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="如：3号仓库配电间" />
                {errors.area && <p className="text-xs text-red-600 mt-1">{errors.area}</p>}
              </div>
            )}
          </div>
        </div>

        {/* 频率与时间 */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-slate-700">频率与时间</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">频率 *</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">间隔（倍数）</Label>
              <Input
                type="number" min={1}
                value={String(form.intervalValue)}
                onChange={(e) => setForm({ ...form, intervalValue: Number(e.target.value) || 1 })}
              />
              {errors.intervalValue && <p className="text-xs text-red-600 mt-1">{errors.intervalValue}</p>}
            </div>
            {form.frequency === 'monthly' && (
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">每月几号</Label>
                <Input
                  type="number" min={1} max={28}
                  value={String(form.dayOfMonth)}
                  onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) || 1 })}
                />
                {errors.dayOfMonth && <p className="text-xs text-red-600 mt-1">{errors.dayOfMonth}</p>}
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">默认时间</Label>
              <Input type="time" value={form.defaultTime} onChange={(e) => setForm({ ...form, defaultTime: e.target.value })} />
            </div>
          </div>

          {form.frequency === 'weekly' && (
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">周几 *</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((d) => {
                  const active = form.weekdays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        weekdays: active ? form.weekdays.filter((x) => x !== d.value) : [...form.weekdays, d.value],
                      })}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-slate-600 hover:border-emerald-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {errors.weekdays && <p className="text-xs text-red-600 mt-1">{errors.weekdays}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">开始日期 *</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">结束日期（空=无限期）</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>}
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">生成窗口（天）</Label>
              <Input
                type="number" min={1} max={90}
                value={String(form.windowDays)}
                onChange={(e) => setForm({ ...form, windowDays: Number(e.target.value) || 14 })}
              />
              {errors.windowDays && <p className="text-xs text-red-600 mt-1">{errors.windowDays}</p>}
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">预计时长（小时）</Label>
              <Input
                type="number" min={0.5} step={0.5}
                value={String(form.durationHours)}
                onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) || 1 })}
              />
            </div>
          </div>
        </div>

        {/* 执行与排班 */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-slate-700">执行与排班</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">执行人 *</Label>
              <Input
                value={form.assigneeName}
                onChange={(e) => setForm({ ...form, assigneeName: e.target.value, assigneeId: e.target.value })}
                placeholder="姓名（须与员工档案一致才能自动排班）"
              />
              {errors.assigneeName && <p className="text-xs text-red-600 mt-1">{errors.assigneeName}</p>}
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autoSchedule}
                  onChange={(e) => setForm({ ...form, autoSchedule: e.target.checked })}
                  className="w-4 h-4"
                />
                自动排班
              </label>
            </div>
          </div>
        </div>

        {/* 检查项模板 */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">检查项模板</h4>
            <Button
              size="sm" variant="outline"
              onClick={() => setForm({
                ...form,
                checklist: [...form.checklist, { key: `item_${form.checklist.length + 1}`, label: '', required: false }],
              })}
            >
              添加检查项
            </Button>
          </div>
          {form.checklist.length === 0 ? (
            <p className="text-xs text-slate-400">未设置检查项（可选）</p>
          ) : (
            <div className="space-y-2">
              {form.checklist.map((item, idx) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={item.label}
                    placeholder={`检查项 ${idx + 1}`}
                    onChange={(e) => {
                      const next = [...form.checklist];
                      next[idx] = { ...item, label: e.target.value };
                      setForm({ ...form, checklist: next });
                    }}
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={!!item.required}
                      onChange={(e) => {
                        const next = [...form.checklist];
                        next[idx] = { ...item, required: e.target.checked };
                        setForm({ ...form, checklist: next });
                      }}
                    />
                    必填
                  </label>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setForm({ ...form, checklist: form.checklist.filter((_, i) => i !== idx) })}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : isEdit ? '保存' : '创建并生成排期'}
        </Button>
      </div>
    </Modal>
  );
}