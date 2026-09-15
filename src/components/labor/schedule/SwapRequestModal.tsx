/**
 * 调班申请弹窗（2026-09-14 重构）
 *
 * 增强：选 requester / target 后自动加载该人/该班组未来 30 天排班
 *       originalDate / targetDate 改为下拉，数据源是已加载的未来排班
 *       target 支持个人或班组（target_id 是员工 ID 或班组 ID）
 *
 * 数据流（V2.1 铁律）：
 *   弹窗内直接调 useScheduleStore / useTeamStore 的 getState，不走 SchedulePage 中转。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, ChevronDown, Download, Send, User, Users, X, XCircle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Label } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { useScheduleStore, useTeamStore } from '@/stores';
import type { Staff, SwapRequest } from './types';

interface SwapRequestModalProps {
  staffList: Staff[];
  // 2026-09-14：行尾发起调班时预填的 requester
  initialRequester?: { id: string; name: string } | null;
  onSubmit: (request: {
    requesterId: string;
    requesterName: string;
    targetId: string;
    targetName: string;
    targetType: 'staff' | 'team';
    originalDate: string;
    targetDate: string;
    reason: string;
  }) => void;
  onClose: () => void;
}

// 未来 30 天范围
const FUTURE_DAYS = 30;

function todayLocalISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function futureISO(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SwapRequestModal({ staffList, initialRequester, onSubmit, onClose }: SwapRequestModalProps) {
  const [formData, setFormData] = useState({
    requesterId: initialRequester?.id || '',
    requesterName: initialRequester?.name || '',
    requesterType: 'staff' as 'staff' | 'team', // 2026-09-14：申请人类型
    targetId: '',
    targetName: '',
    targetType: 'staff' as 'staff' | 'team', // 由 requesterType 派生（同步设置）
    originalDate: '',
    targetDate: '',
    reason: '',
  });

  const teams = useTeamStore((s) => s.teams);
  const loadTeams = useTeamStore((s) => s.loadTeams);

  // 申请人未来 30 天排班
  const [requesterSchedules, setRequesterSchedules] = useState<
    Array<{ id: string; date: string; shift: string; workZone: string | null }>
  >([]);
  // 原日期当天的空闲度（2026-09-14 重构）：选原日期后调用一次，target 候选用
  // staffMap: staffId → 是否有排班；teamMap: teamId → 部门当天是否有任意排班
  const [availability, setAvailability] = useState<{
    staffMap: Map<string, boolean>;
    teamMap: Map<string, boolean>;
  }>({ staffMap: new Map(), teamMap: new Map() });
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  // target 在原日期当天的排班（决定目标日期下拉的数据源）
  const [targetOriginalDateSchedules, setTargetOriginalDateSchedules] = useState<
    Array<{ id: string; date: string; shift: string; workZone: string | null; staffId?: string; staffName?: string }>
  >([]);
  const [loadingRequester, setLoadingRequester] = useState(false);

  // 打开时加载班组
  useEffect(() => {
    if (teams.length === 0) {
      void loadTeams();
    }
  }, [teams.length, loadTeams]);

  // 2026-09-15：行尾预填 initialRequester 时，自动加载该员工未来排班
  // 历史 bug：仅预填 formData.requesterId 但未触发 loadStaffSchedules → requesterSchedules 空 → 弹窗显示「该员工未来 30 天无排班」
  useEffect(() => {
    if (initialRequester?.id) {
      setLoadingRequester(true);
      void loadStaffSchedules(initialRequester.id).then((data) => {
        setRequesterSchedules(data);
        setLoadingRequester(false);
      });
    }
  }, [initialRequester?.id]);

  // 加载某个员工 ID 的未来 30 天排班
  const loadStaffSchedules = async (staffId: string): Promise<
    Array<{ id: string; date: string; shift: string; workZone: string | null }>
  > => {
    const start = todayLocalISO();
    const end = futureISO(FUTURE_DAYS);
    // 走 store action（避免直接 fetch）
    try {
      // 通过 scheduleStore 的 fetchSchedulesByDate 不够，需要按员工过滤
      // 复用 store action batchScheduleByDateRange 不合适；改用直接 enhancedApiClient
      const { enhancedApiClient } = await import('@/lib/apiClient');
      // 2026-09-15：后端路由读 snake_case query（staff_id/start_date/end_date），不是 camelCase
      const rows = await enhancedApiClient.get<unknown[]>(
        `/schedules?staff_id=${encodeURIComponent(staffId)}&start_date=${start}&end_date=${end}&limit=100`,
      );
      return (rows || []).map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          id: (r.id as string) || '',
          date: (r.date as string) || '',
          shift: (r.shift as string) || '',
          workZone: ((r.workZone ?? r.work_zone) as string | null) || null,
        };
      });
    } catch (err) {
      console.warn('[SwapRequestModal] 加载员工排班失败:', err);
      return [];
    }
  };

  // 加载班组全员未来 30 天排班（2026-09-15：按 team.memberIds 真值，不再按 departmentName 过滤）
  const loadTeamSchedules = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    const memberIds = team.memberIds || [];
    if (memberIds.length === 0) return [];

    const start = todayLocalISO();
    const end = futureISO(FUTURE_DAYS);
    const { enhancedApiClient } = await import('@/lib/apiClient');
    // 2026-09-15：后端路由读 snake_case query
    const rows = await enhancedApiClient.get<unknown[]>(
      `/schedules?start_date=${start}&end_date=${end}&limit=500`,
    );
    const allRows = (rows || []) as Array<Record<string, unknown>>;
    // 过滤：本班组员工
    const memberSet = new Set(memberIds);
    return allRows
      .filter(r => {
        const sid = (r.staffId ?? r.staff_id) as string | undefined;
        return sid && memberSet.has(sid);
      })
      .map(r => ({
        id: (r.id as string) || '',
        date: (r.date as string) || '',
        shift: (r.shift as string) || '',
        workZone: ((r.workZone ?? r.work_zone) as string | null) || null,
        staffId: ((r.staffId ?? r.staff_id) as string) || '',
        staffName: '',
      }));
  };

  // 加载原日期当天所有排班，构建空闲度（2026-09-15 修复：班组空闲度按 team.memberIds 匹配）
  // 个人：staffMap[staffId] = 该员工当天是否有排班
  // 班组：teamMap[teamId] = 该班组真实成员中是否有任一人当天有排班
  // 历史 bug（2026-09-15 修复）：用 team.departmentName 匹配 deptHasSchedule，导致同部门多班组共用判断 → T003（生产C组，成员=空）也会显示「✓ 当天有安排」
  const loadOriginalDateAvailability = async (date: string) => {
    setLoadingAvailability(true);
    try {
      const { enhancedApiClient } = await import('@/lib/apiClient');
      // 2026-09-15：后端路由读 snake_case query
      const rows = await enhancedApiClient.get<unknown[]>(
        `/schedules?start_date=${date}&end_date=${date}&limit=500`,
      );
      const allRows = (rows || []) as Array<Record<string, unknown>>;

      // 个人空闲度：staffMap[staffId] = 该员工当天是否有排班
      const staffMap = new Map<string, boolean>();
      const scheduledStaffIds = new Set<string>();
      for (const r of allRows) {
        const sid = ((r.staffId ?? r.staff_id) as string) || '';
        if (sid) {
          staffMap.set(sid, true);
          scheduledStaffIds.add(sid);
        }
      }

      // 班组空闲度：teamMap[teamId] = team.memberIds ∩ scheduledStaffIds 非空
      const teamMap = new Map<string, boolean>();
      for (const t of teams) {
        const memberIds = t.memberIds || [];
        const hasAny = memberIds.some((mid) => scheduledStaffIds.has(mid));
        teamMap.set(t.id, hasAny);
      }

      setAvailability({ staffMap, teamMap });
    } catch (err) {
      console.warn('[SwapRequestModal] 加载空闲度失败:', err);
      setAvailability({ staffMap: new Map(), teamMap: new Map() });
    } finally {
      setLoadingAvailability(false);
    }
  };

  // 申请人变化（个人）
  const handleRequesterChange = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    setFormData(prev => ({
      ...prev,
      requesterId: staff.id,
      requesterName: staff.name,
      requesterType: 'staff',
      targetType: 'staff', // 同步：target 由 requester 决定
      targetId: '',
      targetName: '',
      // 重置日期（避免错位）
      originalDate: '',
      targetDate: '',
    }));
    setRequesterSchedules([]);
    void (async () => {
      setLoadingRequester(true);
      const data = await loadStaffSchedules(staff.id);
      setRequesterSchedules(data);
      setLoadingRequester(false);
    })();
  };

  // 加载 target 在原日期当天的排班（2026-09-14 重构）
  const loadTargetOnOriginalDate = async (originalDate: string) => {
    const { enhancedApiClient } = await import('@/lib/apiClient');
    // 2026-09-15：后端路由读 snake_case query
    const rows = await enhancedApiClient.get<unknown[]>(
      `/schedules?start_date=${originalDate}&end_date=${originalDate}&limit=500`,
    );
    return ((rows || []) as Array<Record<string, unknown>>).map(r => ({
      id: (r.id as string) || '',
      date: (r.date as string) || '',
      shift: (r.shift as string) || '',
      workZone: ((r.workZone ?? r.work_zone) as string | null) || null,
      staffId: ((r.staffId ?? r.staff_id) as string) || '',
      staffName: '',
    }));
  };

  // 调班对象变化（个人）
  const handleTargetStaffChange = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    setFormData(prev => ({ ...prev, targetId: staff.id, targetName: staff.name, targetType: 'staff', targetDate: '' }));
    setTargetOriginalDateSchedules([]);
    if (!formData.originalDate) return;
    void (async () => {
      const all = await loadTargetOnOriginalDate(formData.originalDate);
      setTargetOriginalDateSchedules(all.filter(r => r.staffId === staff.id));
    })();
  };

  // 调班对象变化（班组）
  const handleTargetTeamChange = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    setFormData(prev => ({ ...prev, targetId: team.id, targetName: team.teamName, targetType: 'team', targetDate: '' }));
    setTargetOriginalDateSchedules([]);
    if (!formData.originalDate) return;
    void (async () => {
      // 2026-09-15：按 team.memberIds 真值过滤，不再按 departmentName 兜底
      const memberSet = new Set(team.memberIds || []);
      const all = await loadTargetOnOriginalDate(formData.originalDate);
      const filtered = all.filter(r => r.staffId && memberSet.has(r.staffId));
      setTargetOriginalDateSchedules(filtered);
    })();
  };

  // 提交
  const handleSubmit = () => {
    if (!formData.requesterId || !formData.targetId || !formData.originalDate) {
      showAlert('请填写完整信息');
      return;
    }
    // 2026-09-15：个人 target 时，先校验 target 在原日期是否有班（无班则无法调班）
    // 历史 bug：target 原日期无班时下拉框为空、placeholder 提示不够醒目，用户点提交只看到「请选择目标日期」而非根本原因
    if (formData.targetType === 'staff' && availability.staffMap.get(formData.targetId) === false) {
      showAlert(`调班对象 ${formData.targetName} 在 ${formData.originalDate} 当天无班可换，无法调班。请选择其他调班对象。`);
      return;
    }
    // 班组 target 时 targetDate 可为空（部门级调班，具体由班组内部决定）
    // 个人 target 时 targetDate 必须有值
    if (formData.targetType === 'staff' && !formData.targetDate) {
      showAlert('请选择目标日期');
      return;
    }
    if (formData.requesterId === formData.targetId) {
      showAlert('不能与自己调班');
      return;
    }
    // 2026-09-15：删掉「原日期与目标日期不能相同」校验
    // 业务语义冲突：UI/数据源暗示「调班 = target 替 requester 在原日期上班」（targetDate === originalDate 是主流程）
    //   原校验假设「调班 = A 与 B 互换两天班」与 UI 文案矛盾，阻止合法场景
    // 后端 (server/src/routes/farmTaskSwapRequests.ts) 无此校验
    onSubmit(formData);
    onClose();
  };

  const content = (
    <div className="space-y-4">
      {/* 申请人（2026-09-14 重构：申请人可以是个人或班组） */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          申请人
        </Label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              requesterType: 'staff',
              requesterId: '',
              requesterName: '',
              targetType: 'staff',
              targetId: '',
              targetName: '',
              originalDate: '',
              targetDate: '',
            }))}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              formData.requesterType === 'staff'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <User className="w-3 h-3 inline mr-1" />
            个人
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              requesterType: 'team',
              requesterId: '',
              requesterName: '',
              targetType: 'team',
              targetId: '',
              targetName: '',
              originalDate: '',
              targetDate: '',
            }))}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              formData.requesterType === 'team'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            班组
          </button>
        </div>
        {formData.requesterType === 'staff' ? (
          <Select value={formData.requesterId} onValueChange={handleRequesterChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择申请人（个人）" />
            </SelectTrigger>
            <SelectContent>
              {staffList.map(staff => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name} - {staff.workZone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={formData.requesterId}
            onValueChange={(val) => {
              const team = teams.find(t => t.id === val);
              if (!team) return;
              setFormData(prev => ({
                ...prev,
                requesterId: team.id,
                requesterName: team.teamName,
                requesterType: 'team',
                targetType: 'team', // 同步：target 由 requester 决定
                targetId: '',
                targetName: '',
                originalDate: '',
                targetDate: '',
              }));
              // 班组作为申请人：拉班组全员未来 30 天
              void (async () => {
                setLoadingRequester(true);
                const data = await loadTeamSchedules(team.id);
                setRequesterSchedules(data);
                setLoadingRequester(false);
              })();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择申请人（班组）" />
            </SelectTrigger>
            <SelectContent>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.teamName}
                  {t.departmentName ? ` (${t.departmentName})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 申请人未来排班 */}
      {formData.requesterId && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-blue-800 flex items-center gap-1">
              <User className="w-3 h-3" />
              {formData.requesterName} 未来 {FUTURE_DAYS} 天排班
            </div>
            <span className="text-blue-700">{requesterSchedules.length} 条</span>
          </div>
          {loadingRequester ? (
            <div className="text-blue-600">加载中…</div>
          ) : requesterSchedules.length === 0 ? (
            <div className="text-blue-600">该员工未来 {FUTURE_DAYS} 天无排班</div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {requesterSchedules.map(s => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-1.5 rounded ${
                    s.date === formData.originalDate
                      ? 'bg-emerald-100 border border-emerald-400'
                      : 'hover:bg-blue-100'
                  }`}
                >
                  <span className="text-gray-700">{s.date} {s.shift}</span>
                  {s.workZone && <span className="text-gray-500">{s.workZone}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 原排班日期（下拉：基于申请人未来排班） */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          原排班日期（选申请人某天已有的班）
        </Label>
        <Select
          value={formData.originalDate}
          onValueChange={(val) => {
            setFormData(prev => ({ ...prev, originalDate: val, targetId: '', targetName: '', targetDate: '' }));
            setTargetOriginalDateSchedules([]);
            // 2026-09-14 重构：选原日期后立刻拉当天全部排班，构建 target 空闲度
            void loadOriginalDateAvailability(val);
          }}
          disabled={requesterSchedules.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={requesterSchedules.length === 0 ? '请先选申请人' : '选择日期'} />
          </SelectTrigger>
          <SelectContent>
            {requesterSchedules.map(s => (
              <SelectItem key={s.id} value={s.date}>
                {s.date} {s.shift} {s.workZone ? `(${s.workZone})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 调班对象（2026-09-14 重构：由申请人类型自动确定，下拉选项后贴原日期空闲度标签） */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          调班对象
          <span className="ml-2 text-xs text-gray-400">
            （由申请人类型自动确定：{formData.requesterType === 'staff' ? '个人 ↔ 个人' : '班组 ↔ 班组'}）
          </span>
        </Label>
        {!formData.originalDate && (
          <div className="text-xs text-amber-600 mb-1">⚠ 请先选择原日期，才能判断空闲度</div>
        )}
        {formData.targetType === 'staff' ? (
          <Select
            value={formData.targetId}
            onValueChange={handleTargetStaffChange}
            disabled={!formData.requesterId || !formData.originalDate}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !formData.requesterId
                    ? '请先选申请人'
                    : !formData.originalDate
                      ? '请先选原日期'
                      : '选择调班对象'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {staffList.filter(s => s.id !== formData.requesterId).map(staff => {
                const hasSchedule = availability.staffMap.get(staff.id) === true;
                return (
                  <SelectItem key={staff.id} value={staff.id}>
                    <span className="flex items-center justify-between gap-2">
                      <span>{staff.name} - {staff.workZone}</span>
                      {loadingAvailability ? (
                        <span className="text-xs text-gray-400">检测中…</span>
                      ) : (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          hasSchedule
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {hasSchedule ? '✓ 原日期有班' : '✗ 原日期无班'}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={formData.targetId}
            onValueChange={handleTargetTeamChange}
            disabled={!formData.requesterId || !formData.originalDate}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !formData.requesterId
                    ? '请先选申请人'
                    : !formData.originalDate
                      ? '请先选原日期'
                      : '选择班组'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {teams.map(t => {
                const hasSchedule = availability.teamMap.get(t.id) === true;
                return (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center justify-between gap-2">
                      <span>{t.teamName}{t.departmentName ? ` (${t.departmentName})` : ''}</span>
                      {loadingAvailability ? (
                        <span className="text-xs text-gray-400">检测中…</span>
                      ) : (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          hasSchedule
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {hasSchedule ? '✓ 当天有安排' : '✗ 当天无安排'}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
        {/* 简短说明（2026-09-14 重构后） */}
        {formData.targetId && formData.originalDate && (
          <div className={`mt-1 text-xs ${
            (formData.targetType === 'staff'
              ? availability.staffMap.get(formData.targetId)
              : availability.teamMap.get(formData.targetId))
              ? 'text-emerald-600'
              : formData.targetType === 'team' ? 'text-gray-500' : 'text-red-600'
          }`}>
            {formData.targetType === 'staff' ? (
              availability.staffMap.get(formData.targetId)
                ? `✓ ${formData.targetName} 在 ${formData.originalDate} 当天有班可换`
                : `✗ ${formData.targetName} 在 ${formData.originalDate} 当天无班可换`
            ) : (
              availability.teamMap.get(formData.targetId)
                ? `✓ ${formData.targetName} 在 ${formData.originalDate} 部门当天有安排，可换给班组`
                : `⚠ ${formData.targetName} 在 ${formData.originalDate} 部门当天无安排（班组可留空 targetDate，审批时定）`
            )}
          </div>
        )}
      </div>

      {/* 目标日期（2026-09-14 重构：班组 target 可空） */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          目标日期 {formData.targetType === 'staff'
            ? `（${formData.targetName || '对象'} 在 ${formData.originalDate || '原日期'} 当天的班次）`
            : '（班组互换时可选，由审批流程确定）'}
        </Label>
        <Select
          value={formData.targetDate}
          onValueChange={(val) => setFormData(prev => ({ ...prev, targetDate: val }))}
          // 班组 target：disabled 放开（可空），但仍要求有 targetId 才可选
          disabled={!formData.targetId || (formData.targetType === 'staff' && targetOriginalDateSchedules.length === 0)}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                !formData.targetId
                  ? '请先选调班对象'
                  : formData.targetType === 'team'
                    ? '班组 target 可留空'
                    : targetOriginalDateSchedules.length === 0
                      ? '该对象在原日期当天无班次可选'
                      : '选择班次'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {formData.targetType === 'team' && (
              <SelectItem value="">— 留空（由审批确定）—</SelectItem>
            )}
            {targetOriginalDateSchedules.map(s => (
              <SelectItem key={s.id} value={s.date}>
                {s.shift}
                {s.staffName && formData.targetType === 'team' && ` (${s.staffName})`}
                {s.workZone ? ` ${s.workZone}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 调班原因 */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          调班原因
        </Label>
        <TextArea
          value={formData.reason}
          onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="请输入调班原因..."
          rows={3}
          className="w-full"
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant="outline" size="sm" onClick={onClose}>
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button variant="default" size="sm" onClick={handleSubmit}>
        <Send className="w-4 h-4" />
        提交申请
      </Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title="调班申请"
      size="xl"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}

// 调班申请列表组件（2026-09-15：与排班记录导出完全一致 — 进入 exportMode 显示 checkbox + 「确认导出」「取消」）
interface SwapRequestListProps {
  requests: SwapRequest[];
  onHandle: (id: string, status: '已同意' | '已拒绝') => void;
  // 2026-09-15：导出模式（受控），与 ScheduleTable 一致
  exportMode?: boolean;
  selectedRows?: string[];
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onEnterExportMode?: () => void;
  onConfirmExport?: () => void;
  onCancelExport?: () => void;
}

type SwapStatusFilter = '全部' | '待审批' | '已同意' | '已拒绝';

// 状态徽章样式（表格里复用）
function StatusBadge({ status }: { status: SwapRequest['status'] }) {
  const cls =
    status === '待审批' ? 'bg-yellow-100 text-yellow-700'
    : status === '已同意' ? 'bg-green-100 text-green-700'
    : status === '已拒绝' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function SwapRequestList({
  requests,
  onHandle,
  exportMode = false,
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onEnterExportMode,
  onConfirmExport,
  onCancelExport,
}: SwapRequestListProps) {
  // 状态过滤 tab（仅在非导出模式下展示，避免与导出工具栏冲突）
  const [filter, setFilter] = useState<SwapStatusFilter>('全部');
  // 2026-09-15：分页状态（与排班记录一致，默认 10 条/页）
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 切换 tab 时重置 currentPage = 1，避免跨 tab 翻页错位
  const handleFilterChange = (tab: SwapStatusFilter) => {
    setFilter(tab);
    setCurrentPage(1);
  };

  // 按 tab 过滤 + 按创建时间倒序（最新在最上面，2026-09-15）
  const filtered = useMemo(() => {
    const base = filter === '全部' ? requests : requests.filter(r => r.status === filter);
    return [...base].sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));
  }, [requests, filter]);

  // 分页数据（2026-09-15：与排班记录列表底部同款分页）
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // 各状态计数（用于 tab 标签）
  const counts = useMemo(() => ({
    全部: requests.length,
    待审批: requests.filter(r => r.status === '待审批').length,
    已同意: requests.filter(r => r.status === '已同意').length,
    已拒绝: requests.filter(r => r.status === '已拒绝').length,
  }), [requests]);

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无调班申请
      </div>
    );
  }

  const selectedSet = new Set(selectedRows);
  const filteredIds = filtered.map(r => r.id);
  const allFilteredSelected = exportMode && filteredIds.length > 0 && filteredIds.every(id => selectedSet.has(id));
  const someFilteredSelected = exportMode && filteredIds.some(id => selectedSet.has(id));

  return (
    <div>
      {/* 顶部工具栏：导出模式下显示「确认导出/取消」；非导出模式显示 tab + 「导出」入口 */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        {exportMode ? (
          <>
            <div className="text-sm text-gray-600">
              已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
              （请勾选要导出的调班申请）
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelExport}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['全部', '待审批', '已同意', '已拒绝'] as SwapStatusFilter[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleFilterChange(tab)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    filter === tab
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab}
                  <span className={`ml-1 text-[10px] ${
                    filter === tab ? 'text-blue-500' : 'text-gray-400'
                  }`}>
                    {counts[tab]}
                  </span>
                </button>
              ))}
            </div>
            {onEnterExportMode && (
              <Button
                size="sm"
                onClick={onEnterExportMode}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
          </>
        )}
      </div>

      {/* 表格 */}
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          「{filter}」状态下暂无调班申请
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {exportMode && (
                  <TableHead className="px-3 py-2 w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) (el as HTMLInputElement).indeterminate = !allFilteredSelected && someFilteredSelected;
                      }}
                      onCheckedChange={() => onSelectAll?.()}
                    />
                  </TableHead>
                )}
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  状态
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  申请人
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  调班对象
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  原日期
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  目标日期
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  原因
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  申请时间
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap w-24 text-center">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {paginatedData.map(request => (
                <TableRow
                  key={request.id}
                  className={`hover:bg-blue-50 transition-colors ${exportMode && selectedSet.has(request.id) ? 'bg-blue-50/50' : ''}`}
                >
                  {exportMode && (
                    <TableCell className="px-3 py-2">
                      <Checkbox
                        checked={selectedSet.has(request.id)}
                        onCheckedChange={() => onSelectRow?.(request.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                    {request.requesterName}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                    {request.targetName}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {request.originalDate}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {request.targetDate}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600 max-w-[200px] truncate" title={request.reason || ''}>
                    {request.reason || '—'}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {request.createTime}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-center">
                    {request.status === '待审批' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onHandle(request.id, '已同意')}
                          className="p-1 rounded text-green-600 hover:bg-green-100 transition-colors"
                          title="同意"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onHandle(request.id, '已拒绝')}
                          className="p-1 rounded text-red-600 hover:bg-red-100 transition-colors"
                          title="拒绝"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 2026-09-15：分页（与排班记录 ScheduleTable 同款 Pagination 组件，单页也显示便于调整每页条数） */}
      {filtered.length > 0 && (
        <div className="px-3 py-3 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            showPageSize={true}
          />
        </div>
      )}
    </div>
  );
}

export default SwapRequestModal;
