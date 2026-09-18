/**
 * 新增排班弹窗（个人/班组 × 单日/日期段/周重复 三模式，2026-09-13 重构）
 *
 * 设计：双层 Tab 切换
 *   - 顶层 Segmented：[个人排班] / [按班组排班]
 *   - 第二层 Tab：[单日] / [日期段] / [周重复]
 *
 * 数据流（V2.1 铁律）：
 *   弹窗内直接调 useScheduleStore.getState()，不走 SchedulePage 中转。
 *   失败抛错到 showAlert，成功后 onClose()。
 */

import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Modal, FormField, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { useScheduleStore, useTeamStore, useDictionaryStore, getDictItems } from '@/stores';
import type { ShiftType } from '../types';
import { todayLocalISO, parseLocalISO, formatLocalISO, expandDatesForPreview } from './scheduleDateUtils';

type AddMode = 'single' | 'team';
type DateRangeMode = 'single' | 'range' | 'weekday';

interface ScheduleAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftConfigs: { name: ShiftType; startTime: string; endTime: string }[];
  staffList: { id: string; name: string; workZone: string }[];
  defaultDate?: string;
}

// 统一表单
interface FormState {
  staffId: string;
  teamId: string;
  startDate: string;
  endDate: string;
  weekdays: number[]; // 周重复模式：0-6 数组
  shift: ShiftType;
  workZone: string;
  skipExisting: boolean;
}

const INITIAL_FORM: FormState = {
  staffId: '',
  teamId: '',
  startDate: '',
  endDate: '',
  weekdays: [1, 2, 3, 4, 5], // 默认周一到周五
  shift: '早班',
  workZone: '',
  skipExisting: true,
};

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 2026-09-18：4 个纯日期函数已抽到 ./scheduleDateUtils.ts

export function ScheduleAddModal({
  isOpen,
  onClose,
  shiftConfigs,
  staffList,
  defaultDate,
}: ScheduleAddModalProps) {
  const [mode, setMode] = useState<AddMode>('single');
  const [dateMode, setDateMode] = useState<DateRangeMode>('single');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  // 预览状态（2026-09-13 新增）：点击"预览"按钮后展示冲突明细
  const [previewResult, setPreviewResult] = useState<{
    toCreate: number;
    willSkip: Array<{ workerId: string; date: string; reason: string }>;
    total: number;
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const teams = useTeamStore((s) => s.teams);
  const loadTeams = useTeamStore((s) => s.loadTeams);
  // 2026-09-14：字典订阅（planting_area 工作区域下拉）
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const loadDictionaries = useDictionaryStore((s) => s.loadDictionaries);
  const plantingAreas = useMemo(
    () => getDictItems('planting_area'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dictionaries],
  );

  // 打开时重置表单
  useEffect(() => {
    if (isOpen) {
      const today = defaultDate || todayLocalISO();
      setForm({ ...INITIAL_FORM, startDate: today, endDate: today });
      setMode('single');
      setDateMode('single');
      setPreviewResult(null);
      if (teams.length === 0) {
        void loadTeams();
      }
      if (dictionaries.length === 0) {
        void loadDictionaries();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 顶层模式切换：清空对方字段
  const handleModeChange = (next: AddMode) => {
    if (next === mode) return;
    setMode(next);
    // 2026-09-18 修复 C-2：切换模式时同步清空 workZone + 预览结果。
    // 此前只清 staffId/teamId，导致个人模式选的"张三 A 区"残留到班组模式，
    // 提交时整个班组被错误地排到 A 区；旧 previewResult 也会跨模式误导用户。
    setForm(prev => ({
      ...prev,
      staffId: '',
      teamId: '',
      workZone: '', // 由用户在新模式下重新确认（或选员工时自动预填）
    }));
    setPreviewResult(null);
    setPreviewing(false);
  };

  // 模式切换：日期段 ↔ 周重复 ↔ 单日
  const handleDateModeChange = (next: DateRangeMode) => {
    setDateMode(next);
    if (next === 'single') {
      // 单日：起止相同
      setForm(prev => ({ ...prev, endDate: prev.startDate }));
    }
    if (next === 'range') {
      // 日期段：如未设 endDate，默认为 startDate + 7 天
      setForm(prev => {
        if (prev.endDate && prev.endDate > prev.startDate) return prev;
        const s = parseLocalISO(prev.startDate);
        if (!s) return prev;
        const e = new Date(s);
        e.setDate(e.getDate() + 6);
        return { ...prev, endDate: formatLocalISO(e) };
      });
    }
    if (next === 'weekday') {
      // 周重复：默认范围本月
      setForm(prev => {
        const s = parseLocalISO(prev.startDate);
        if (!s) return prev;
        const e = new Date(s.getFullYear(), s.getMonth() + 1, 0); // 本月最后一日
        return { ...prev, endDate: formatLocalISO(e) };
      });
    }
  };

  // 预览数据
  // 班组模式下的 workerIds（用于预览：显示该班组实际成员数，2026-09-15：从按部门过滤改为按 team_members 真值）
  const teamPreviewCount = useMemo(() => {
    if (mode !== 'team' || !form.teamId) return 0;
    const team = teams.find(t => t.id === form.teamId);
    if (!team) return 0;
    return team.memberIds?.length ?? 0;
  }, [mode, form.teamId, teams]);

  const preview = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    if (dateMode === 'single') {
      return { dates: [form.startDate], total: 1 };
    }
    const dates = expandDatesForPreview(
      form.startDate,
      form.endDate,
      dateMode === 'weekday' ? form.weekdays : undefined,
    );
    return { dates, total: dates.length };
  }, [form.startDate, form.endDate, form.weekdays, dateMode]);

  // 切换周几 checkbox
  const toggleWeekday = (day: number) => {
    setForm(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter(d => d !== day)
        : [...prev.weekdays, day].sort(),
    }));
  };

  // ====== 预览（2026-09-13 新增）：提交前显示冲突明细 ======
  const handlePreview = async () => {
    if (mode === 'single' && !form.staffId) {
      showAlert('请选择员工');
      return;
    }
    if (mode === 'team' && !form.teamId) {
      showAlert('请选择班组');
      return;
    }
    if (!form.startDate) {
      showAlert('请选择开始日期');
      return;
    }
    if (dateMode !== 'single' && !form.endDate) {
      showAlert('请选择结束日期');
      return;
    }
    if (dateMode === 'weekday' && form.weekdays.length === 0) {
      showAlert('请至少选择一周中的一天');
      return;
    }

    // 计算 workerIds（2026-09-15：改用 team.memberIds 真值，不再过滤 employees）
    setPreviewing(true);
    try {
      let teamWorkerIds: string[] | undefined;
      if (mode === 'team') {
        const team = teams.find(t => t.id === form.teamId);
        if (!team) {
          showAlert('班组信息无效');
          setPreviewing(false);
          return;
        }
        teamWorkerIds = team.memberIds || [];
        if (teamWorkerIds.length === 0) {
          showAlert(`班组 ${team.teamName} 暂无成员`);
          setPreviewing(false);
          return;
        }
      }

      // 构造 mode 参数
      let apiMode: 'single' | 'single-team' | 'range' | 'weekday';
      if (dateMode === 'single') {
        apiMode = mode === 'team' ? 'single-team' : 'single';
      } else if (dateMode === 'range') {
        apiMode = 'range';
      } else {
        apiMode = 'weekday';
      }

      const params: Parameters<typeof useScheduleStore.getState>[0] extends never ? never : {
        mode: typeof apiMode;
        shift: ShiftType;
        staffId?: string;
        teamId?: string;
        workerIds?: string[];
        date?: string;
        startDate?: string;
        endDate?: string;
        weekdays?: number[];
      } = {
        mode: apiMode,
        shift: form.shift,
      };
      if (mode === 'single') {
        params.staffId = form.staffId;
      } else {
        params.teamId = form.teamId;
        params.workerIds = teamWorkerIds;
      }
      if (dateMode === 'single') {
        params.date = form.startDate;
      } else {
        params.startDate = form.startDate;
        params.endDate = form.endDate;
        if (dateMode === 'weekday') {
          params.weekdays = form.weekdays;
        }
      }

      const result = await useScheduleStore.getState().previewBatchSchedule(params);
      setPreviewResult({
        toCreate: result.toCreate,
        willSkip: result.willSkip,
        total: result.total,
      });
    } catch (err) {
      showAlert(`预览失败：${(err as Error).message}`);
    } finally {
      setPreviewing(false);
    }
  };

  // ====== 提交 ======
  const handleSubmit = async () => {
    if (mode === 'single' && !form.staffId) {
      showAlert('请选择员工');
      return;
    }
    if (mode === 'team' && !form.teamId) {
      showAlert('请选择班组');
      return;
    }
    if (!form.startDate) {
      showAlert('请选择开始日期');
      return;
    }
    if (dateMode !== 'single' && !form.endDate) {
      showAlert('请选择结束日期');
      return;
    }
    if (dateMode !== 'single' && form.startDate > form.endDate) {
      showAlert('开始日期不能晚于结束日期');
      return;
    }
    if (dateMode === 'weekday' && form.weekdays.length === 0) {
      showAlert('请至少选择一周中的一天');
      return;
    }

    setSubmitting(true);
    try {
      let res: { created: number; total: number };
      const isTeam = mode === 'team';
      const wid = isTeam ? form.teamId : form.staffId;

      // 班组模式：从 useTeamStore.teams[i].memberIds 获取班组成员（2026-09-15：数据已迁移，可直接读 team_members）
      // 历史方案（2026-09-13）：team_members.team_id 维度不一致 → 按部门过滤 employees 兜底（bug：变成按部门排班）
      // 现方案（2026-09-15）：team_members 数据已按 teams/employees 维度对齐 → memberIds 即为真实班组成员
      let teamWorkerIds: string[] | undefined;
      if (isTeam) {
        const team = teams.find(t => t.id === wid);
        if (!team) {
          showAlert('班组信息无效');
          setSubmitting(false);
          return;
        }
        teamWorkerIds = team.memberIds || [];
        if (teamWorkerIds.length === 0) {
          showAlert(`班组 ${team.teamName} 暂无成员，请先在员工管理中分配`);
          setSubmitting(false);
          return;
        }
      }

      if (dateMode === 'single') {
        // 单日：复用原 addSchedule（仅个人）或 batchScheduleByTeam（仅班组）
        if (isTeam) {
          const r = await useScheduleStore.getState().batchScheduleByTeam(
            wid,
            form.startDate,
            form.shift,
            form.workZone.trim() || undefined,
            teamWorkerIds,
          );
          res = { created: r.created, total: 1 };
        } else {
          const staff = staffList.find(s => s.id === wid);
          if (!staff) {
            showAlert('员工信息无效');
            setSubmitting(false);
            return;
          }
          await useScheduleStore.getState().addSchedule({
            staffId: wid,
            staffName: staff.name,
            date: form.startDate,
            shift: form.shift,
            workZone: form.workZone,
            status: '已排班',
          });
          res = { created: 1, total: 1 };
        }
      } else if (dateMode === 'range') {
        if (isTeam) {
          const r = await useScheduleStore.getState().batchScheduleByTeamAndDateRange(
            wid,
            form.startDate,
            form.endDate,
            form.shift,
            form.workZone.trim() || undefined,
            form.skipExisting,
            teamWorkerIds,
          );
          res = { created: r.created, total: r.total };
        } else {
          const r = await useScheduleStore.getState().batchScheduleByDateRange(
            wid,
            form.startDate,
            form.endDate,
            form.shift,
            form.workZone,
            form.skipExisting,
          );
          res = { created: r.created, total: r.total };
        }
      } else {
        // weekday
        if (isTeam) {
          const r = await useScheduleStore.getState().batchScheduleByTeamAndWeekday(
            wid,
            form.startDate,
            form.endDate,
            form.weekdays,
            form.shift,
            form.workZone.trim() || undefined,
            form.skipExisting,
            teamWorkerIds,
          );
          res = { created: r.created, total: r.total };
        } else {
          const r = await useScheduleStore.getState().batchScheduleByWeekday(
            wid,
            form.startDate,
            form.endDate,
            form.weekdays,
            form.shift,
            form.workZone,
            form.skipExisting,
          );
          res = { created: r.created, total: r.total };
        }
      }

      // 刷新列表（store action 只失效占用缓存，不刷新 schedules）
      await useScheduleStore.getState().fetchSchedules();
      onClose();
      // 关闭后再提示
      setTimeout(() => {
        if (dateMode === 'single') {
          showAlert(isTeam ? `已为班组排班：创建 ${res.created} 条` : '排班创建成功');
        } else {
          showAlert(
            `批量排班完成：创建 ${res.created} 条${res.total - res.created > 0 ? `，跳过 ${res.total - res.created} 条` : ''}`,
          );
        }
      }, 100);
    } catch (err) {
      showAlert(`排班失败：${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增排班"
      size="xxl"
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        {/* 顶层：个人/班组 */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => handleModeChange('single')}
            className={`
              px-4 py-1.5 text-sm font-medium rounded-md transition-colors
              ${mode === 'single' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}
            `}
          >
            个人排班
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('team')}
            className={`
              px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5
              ${mode === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}
            `}
          >
            <Users className="w-3.5 h-3.5" />
            按班组排班
          </button>
        </div>

        {/* 第二层：日期模式 */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {(['single', 'range', 'weekday'] as DateRangeMode[]).map(dm => (
            <button
              key={dm}
              type="button"
              onClick={() => handleDateModeChange(dm)}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-md transition-colors
                ${dateMode === dm ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}
              `}
            >
              {dm === 'single' && '单日'}
              {dm === 'range' && '日期段'}
              {dm === 'weekday' && '周重复'}
            </button>
          ))}
        </div>

        {/* 日期字段 */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="开始日期" required>
            <DatePicker
              selected={form.startDate ? new Date(form.startDate + 'T00:00:00') : undefined}
              onChange={(date) => {
                const v = formatLocalISO(date);
                setForm(prev => ({
                  ...prev,
                  startDate: v,
                  endDate: dateMode === 'single' ? v : prev.endDate,
                }));
              }}
              className="w-full"
            />
          </FormField>
          {dateMode !== 'single' && (
            <FormField label="结束日期" required>
              <DatePicker
                selected={form.endDate ? new Date(form.endDate + 'T00:00:00') : undefined}
                onChange={(date) => setForm(prev => ({ ...prev, endDate: formatLocalISO(date) }))}
                className="w-full"
              />
            </FormField>
          )}
        </div>

        {/* 周重复模式：周几选择 */}
        {dateMode === 'weekday' && (
          <FormField label="每周重复" required>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleWeekday(idx)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md border transition-colors
                    ${form.weekdays.includes(idx)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>
        )}

        {/* 对象选择 */}
        {mode === 'single' ? (
          <FormField label="选择员工" required>
            <Select
              value={form.staffId}
              onValueChange={(val) => {
                const staff = staffList.find(s => s.id === val);
                setForm(prev => ({
                  ...prev,
                  staffId: val,
                  workZone: staff?.workZone || prev.workZone,
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择员工" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">请选择员工</SelectItem>
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} - {s.workZone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : (
          <FormField label="选择班组" required>
            <Select
              value={form.teamId}
              onValueChange={(val) => setForm(prev => ({ ...prev, teamId: val }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择班组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">请选择班组</SelectItem>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.teamName}
                    {t.departmentName ? ` (${t.departmentName})` : ''}
                    {typeof t.memberCount === 'number' ? ` · ${t.memberCount} 人` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        {/* 班次 */}
        <FormField label="选择班次" required>
          <Select
            value={form.shift}
            onValueChange={(val) => setForm(prev => ({ ...prev, shift: val as ShiftType }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择班次" />
            </SelectTrigger>
            <SelectContent>
              {shiftConfigs.map(config => (
                <SelectItem key={config.name} value={config.name}>
                  {config.name} ({config.startTime}-{config.endTime})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* 工作区域（2026-09-14 重构）：手输 + 字典下拉联动 */}
        <FormField label={mode === 'team' ? '工作区域（可选）' : '工作区域'}>
          <div className="flex gap-2">
            <Input
              value={form.workZone}
              onChange={(e) => setForm(prev => ({ ...prev, workZone: e.target.value }))}
              placeholder={mode === 'team' ? '留空或从右侧下拉选择种植区域' : '留空或从右侧下拉选择种植区域'}
              className="flex-1"
            />
            <Select
              value=""
              onValueChange={(val) => {
                if (val === '__custom__') {
                  // 用户希望继续手输，不需要任何操作
                  return;
                }
                if (val) {
                  setForm(prev => ({ ...prev, workZone: val }));
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={plantingAreas.length === 0 ? '字典加载中' : '📋 从字典选择'} />
              </SelectTrigger>
              <SelectContent>
                {plantingAreas.length === 0 ? (
                  <SelectItem value="__custom__" disabled>
                    暂无种植区域字典
                  </SelectItem>
                ) : (
                  <>
                    {plantingAreas.map(area => (
                      <SelectItem key={area.id} value={area.dictLabel || area.dictValue || ''}>
                        {area.dictLabel || area.dictValue}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          {plantingAreas.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              💡 可手动输入任意区域名，或从右侧字典下拉选择
            </div>
          )}
        </FormField>

        {/* 跳过选项（仅日期段/周重复） */}
        {dateMode !== 'single' && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.skipExisting}
              onChange={(e) => setForm(prev => ({ ...prev, skipExisting: e.target.checked }))}
              className="rounded border-gray-300"
            />
            跳过已排班的日期（推荐）
          </label>
        )}

        {/* 预览 */}
        {preview && preview.total > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
            <div className="font-medium mb-1">预览</div>
            <div>
              {dateMode === 'single'
                ? `单日：${preview.dates[0]}`
                : `${form.startDate} 至 ${form.endDate}，匹配 ${preview.total} 天`}
              {dateMode === 'weekday' && `（${form.weekdays.map(d => WEEKDAY_LABELS[d]).join('、')}）`}
              {mode === 'team' && form.teamId && (
                teamPreviewCount > 0
                  ? ` × ${teamPreviewCount} 人（按部门匹配）`
                  : ' × ⚠ 未匹配到员工'
              )}
            </div>
            {dateMode !== 'single' && preview.total > 31 && (
              <div className="text-amber-700 mt-1">
                ⚠ 跨度较大（{preview.total} 天），请确认无误
              </div>
            )}
            {/* 冲突检查按钮（2026-09-13 新增） */}
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewing}
              >
                {previewing ? '检查中…' : '🔍 检查冲突'}
              </Button>
              {previewResult && (
                <span className="text-xs">
                  将创建 <strong className="text-emerald-700">{previewResult.toCreate}</strong> 条
                  {previewResult.willSkip.length > 0 && (
                    <>
                      ，跳过 <strong className="text-amber-700">{previewResult.willSkip.length}</strong> 条（已排班）
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 冲突明细（2026-09-13 新增） */}
        {previewResult && previewResult.willSkip.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs">
            <div className="font-medium mb-1 text-amber-800">跳过明细（已排班冲突）</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {previewResult.willSkip.map((s, idx) => (
                <div key={idx} className="text-amber-700">
                  • {s.date} {s.shift ? '' : ''}员工 {s.workerId}（{s.reason}）
                </div>
              ))}
            </div>
          </div>
        )}

        {submitting && (
          <div className="text-xs text-gray-500 text-center">提交中...</div>
        )}
      </div>
    </Modal>
  );
}

// 2026-09-18：formatLocalISO 已抽到 ./scheduleDateUtils.ts

export default ScheduleAddModal;
