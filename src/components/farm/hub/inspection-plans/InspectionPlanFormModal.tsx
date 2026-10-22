/**
 * 巡查计划表单弹窗（2026-10-21 P3 / 2026-10-22 审核返修）
 *
 * 分区：基本信息 → 巡查对象 → 频率与时间 → 执行与排班 → 检查项模板
 * 校验与后端 §6.2 同口径（前端先拦一道，减少无谓往返；后端仍是权威）
 *
 * 审核返修（2026-10-22）：
 *   · 日期默认值改 todayLocal()（原 toISOString().slice(0,10) 是 UTC，
 *     北京时间 0:00–8:00 会得到「昨天」—— 项目已有同名事故记忆）
 *   · 表单字段改用 FormField（label 字号/必填红星/错误样式与 CreateInspectionModal 一致）
 *   · 输入框统一 deepInputClass；日期改 DatePicker；数字改 NumberInput
 *     与同模块巡查创建弹窗同一套控件，避免「同页两种输入框」
 *   · 星期/严重程度选择器对齐 CreateInspectionModal 的 border-2 rounded-lg 范式
 *   · 取消用 Modal 内置 footer（对齐 px-6 py-4 / size="sm" / variant="secondary"），去掉内层双滚动
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, FormField, Input, Modal, NumberInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TextArea } from '@/components/ui';
import { useInspectionPlanStore, type InspectionPlan, type PlanChecklistItem } from '@/stores/useInspectionPlanStore';
// 2026-10-22（遗留项 5）：执行人改为员工选择器（数据源 = 员工档案）
import { useWorkerStore } from '@/stores/useWorkerStore';
import { INSPECTION_TYPES } from '@/types/farm/common';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

interface Props {
  isOpen: boolean;
  plan?: InspectionPlan | null;
  onClose: () => void;
  onSaved?: (plan: InspectionPlan) => void;
}

/** 与 CreateInspectionModal 完全一致的输入框样式（同模块统一视觉 token） */
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner w-full";

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

  // 2026-10-22（遗留项 5）：执行人从「自由文本」改为「员工档案选择」。
  //   原实现把姓名同时写进 assigneeId / assigneeName，语义不干净：
  //   assigneeId 应当是 employees.id，否则排班侧每次都要靠姓名反查。
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);
  useEffect(() => {
    if (isOpen && workers.length === 0) void loadWorkers();
  }, [isOpen, workers.length, loadWorkers]);

  // 在职员工（口径与 useWorkerPersonnel / apiWorkerService 的 legacyActive 约定一致：
  //   后端历史数据是 'active'，前端展示层是 '在职'，两种都要认）
  const activeWorkers = useMemo(
    () => workers.filter((w) => w.status === '在职' || (w.status as string) === 'active'),
    [workers],
  );

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
    // 本地日期（禁止 UTC 截取）
    startDate: todayLocal(),
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

  // 已选执行人：优先按 id 匹配，其次按姓名匹配。
  //   后者用于兼容历史计划 —— 旧的文本输入把姓名写进了 assigneeId，
  //   这里能匹配到时保存会自动纠正为 employees.id（数据清理，不需要单独迁移脚本）。
  const matchedWorker = useMemo(
    () => activeWorkers.find(
      (w) => (!!form.assigneeId && w.id === form.assigneeId)
        || (!!form.assigneeName && w.name === form.assigneeName),
    ),
    [activeWorkers, form.assigneeId, form.assigneeName],
  );

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
        startDate: plan.startDate || todayLocal(),
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
        startDate: todayLocal(), endDate: '',
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
      // 2026-10-22（遗留项 5）：命中员工档案时写 employees.id + 档案姓名（自动纠正历史脏值）；
      //   未命中（历史自由文本）时保持原值，后端 resolveEmployeeId 仍会按姓名兜底。
      assigneeId: matchedWorker?.id || form.assigneeId || form.assigneeName.trim(),
      assigneeName: matchedWorker?.name || form.assigneeName.trim(),
      autoSchedule: form.autoSchedule,
      greenhouseName: form.greenhouseName || null,
      cropName: form.cropName || null,
      equipmentName: form.equipmentName || null,
      infrastructureName: form.infrastructureName || null,
      area: form.area || null,
      checklist: form.checklist,
    };

    const result = isEdit && plan
      ? await updatePlan(plan.id, payload)
      : await createPlan(payload);
    if (!result) {
      showAlert(`保存失败：${useInspectionPlanStore.getState().error || '请稍后重试'}`);
      return;
    }
    const gen = result.generate;
    if (gen && (gen.created.length > 0 || Object.keys(gen.unscheduledReasons || {}).length > 0)) {
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
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `编辑巡查计划 - ${plan?.planCode || ''}` : '新建巡查计划'}
      size="xl"
      // 用内置 footer：与 CreateInspectionModal 一致（px-6 py-4 / size=sm / 取消=secondary）
      onSubmit={handleSave}
      submitText={isEdit ? '保存' : '创建并生成排期'}
      cancelText="取消"
    >
      <div className="space-y-5">
        {/* 基本信息 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">基本信息</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="计划名称" required error={errors.title}>
              <Input
                className={deepInputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="如：1号卷帘机每日巡检"
              />
            </FormField>
            <FormField label="巡查类型" required>
              <Select value={form.inspectionType} onValueChange={(v) => setForm({ ...form, inspectionType: v })}>
                <SelectTrigger className={deepInputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value as string}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>

        {/* 巡查对象 */}
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700">巡查对象</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.inspectionType === 'farm' && (
              <>
                <FormField label="温室/区域">
                  <Input className={deepInputClass} value={form.greenhouseName} onChange={(e) => setForm({ ...form, greenhouseName: e.target.value })} />
                </FormField>
                <FormField label="作物">
                  <Input className={deepInputClass} value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} />
                </FormField>
              </>
            )}
            {form.inspectionType === 'equipment' && (
              <div className="md:col-span-2">
                <FormField label="设备名称" required error={errors.equipmentName}>
                  <Input className={deepInputClass} value={form.equipmentName} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} placeholder="如：1号卷帘机" />
                </FormField>
              </div>
            )}
            {form.inspectionType === 'infrastructure' && (
              <div className="md:col-span-2">
                <FormField label="设施名称" required error={errors.infrastructureName}>
                  <Input className={deepInputClass} value={form.infrastructureName} onChange={(e) => setForm({ ...form, infrastructureName: e.target.value })} />
                </FormField>
              </div>
            )}
            {(form.inspectionType === 'safety' || form.inspectionType === 'other') && (
              <div className="md:col-span-2">
                <FormField
                  label="检查区域/场所"
                  required={form.inspectionType === 'safety'}
                  error={errors.area}
                >
                  <Input className={deepInputClass} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="如：3号仓库配电间" />
                </FormField>
              </div>
            )}
          </div>
        </div>

        {/* 频率与时间 */}
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700">频率与时间</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField label="频率" required>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger className={deepInputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="间隔（倍数）" error={errors.intervalValue}>
              <NumberInput
                className={deepInputClass}
                value={form.intervalValue}
                decimals={0}
                onChange={(v) => setForm({ ...form, intervalValue: Number(v) || 1 })}
              />
            </FormField>
            {form.frequency === 'monthly' && (
              <FormField label="每月几号" error={errors.dayOfMonth}>
                <NumberInput
                  className={deepInputClass}
                  value={form.dayOfMonth}
                  decimals={0}
                  onChange={(v) => setForm({ ...form, dayOfMonth: Number(v) || 1 })}
                />
              </FormField>
            )}
            <FormField label="默认时间">
              <Input className={deepInputClass} type="time" value={form.defaultTime} onChange={(e) => setForm({ ...form, defaultTime: e.target.value })} />
            </FormField>
          </div>

          {form.frequency === 'weekly' && (
            <FormField label="周几" required error={errors.weekdays}>
              {/* 与 CreateInspectionModal 的问题分类选择器同款：border-2 rounded-lg */}
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
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </FormField>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField label="开始日期" required error={errors.startDate}>
              <DatePicker
                selected={form.startDate ? new Date(form.startDate) : undefined}
                onChange={(d) => setForm({ ...form, startDate: d ? todayLocal(d) : '' })}
                className={deepInputClass}
              />
            </FormField>
            <FormField label="结束日期（空=无限期）" error={errors.endDate}>
              <DatePicker
                selected={form.endDate ? new Date(form.endDate) : undefined}
                onChange={(d) => setForm({ ...form, endDate: d ? todayLocal(d) : '' })}
                className={deepInputClass}
              />
            </FormField>
            <FormField label="生成窗口（天）" error={errors.windowDays}>
              <NumberInput
                className={deepInputClass}
                value={form.windowDays}
                decimals={0}
                onChange={(v) => setForm({ ...form, windowDays: Number(v) || 14 })}
              />
            </FormField>
            <FormField label="预计时长（小时）">
              <NumberInput
                className={deepInputClass}
                value={form.durationHours}
                decimals={1}
                onChange={(v) => setForm({ ...form, durationHours: Number(v) || 1 })}
              />
            </FormField>
          </div>
        </div>

        {/* 执行与排班 */}
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700">执行与排班</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="执行人" required error={errors.assigneeName}>
              {/* 2026-10-22（遗留项 5）：员工档案下拉，选中即同时拿到 employees.id 与姓名。
                  历史数据（姓名写进 assigneeId）匹配不到员工时保留一个只读选项，
                  避免编辑旧计划时下拉空白、误以为执行人丢了。 */}
              <Select
                value={matchedWorker?.id || (form.assigneeName ? '__legacy__' : '')}
                onValueChange={(v) => {
                  if (v === '__legacy__') return;
                  const w = activeWorkers.find((x) => x.id === v);
                  setForm((f) => ({ ...f, assigneeId: w?.id || '', assigneeName: w?.name || '' }));
                }}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="选择执行人（须在员工档案中）" />
                </SelectTrigger>
                <SelectContent>
                  {form.assigneeName && !matchedWorker && (
                    <SelectItem value="__legacy__">
                      {form.assigneeName}（员工档案未匹配，请重新选择）
                    </SelectItem>
                  )}
                  {activeWorkers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}{w.team ? `（${w.team}）` : ''}
                    </SelectItem>
                  ))}
                  {activeWorkers.length === 0 && (
                    <SelectItem value="__empty__" disabled>暂无在职员工档案</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FormField>
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">检查项模板</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setForm({
                ...form,
                checklist: [...form.checklist, { key: `item_${form.checklist.length + 1}`, label: '', required: false }],
              })}
            >
              添加检查项
            </Button>
          </div>
          {form.checklist.length === 0 ? (
            <p className="text-xs text-gray-400">未设置检查项（可选）</p>
          ) : (
            <div className="space-y-2">
              {form.checklist.map((item, idx) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Input
                    className={deepInputClass}
                    value={item.label}
                    placeholder={`检查项 ${idx + 1}`}
                    onChange={(e) => {
                      const next = [...form.checklist];
                      next[idx] = { ...item, label: e.target.value };
                      setForm({ ...form, checklist: next });
                    }}
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
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
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
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
    </Modal>
  );
}