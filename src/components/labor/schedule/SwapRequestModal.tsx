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
import { Calendar, Check, ChevronDown, MessageSquare, Send, User, Users, X, XCircle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Label } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { useScheduleStore, useTeamStore, useWorkerStore } from '@/stores';
import type { Staff, SwapRequest } from './types';

interface SwapRequestModalProps {
  staffList: Staff[];
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

export function SwapRequestModal({ staffList, onSubmit, onClose }: SwapRequestModalProps) {
  const [formData, setFormData] = useState({
    requesterId: '',
    requesterName: '',
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
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);

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
    if (workers.length === 0) {
      void loadWorkers();
    }
  }, [teams.length, workers.length, loadTeams, loadWorkers]);

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
      const rows = await enhancedApiClient.get<unknown[]>(
        `/schedules?staffId=${encodeURIComponent(staffId)}&startDate=${start}&endDate=${end}&limit=100`,
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

  // 加载班组全员未来 30 天排班（去重日期）
  const loadTeamSchedules = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    // 找出班组部门下的员工
    const teamWorkers = workers
      .filter((w: unknown) => (w as { departmentName?: string }).departmentName === team.departmentName)
      .map((w: { id?: string; name?: string }) => ({ id: w.id || '', name: w.name || '' }))
      .filter(w => w.id);

    if (teamWorkers.length === 0) return [];

    const start = todayLocalISO();
    const end = futureISO(FUTURE_DAYS);
    const { enhancedApiClient } = await import('@/lib/apiClient');
    const rows = await enhancedApiClient.get<unknown[]>(
      `/schedules?startDate=${start}&endDate=${end}&limit=500`,
    );
    const allRows = (rows || []) as Array<Record<string, unknown>>;
    // 过滤：本班组员工
    const memberSet = new Set(teamWorkers.map(w => w.id));
    const nameMap = new Map(teamWorkers.map(w => [w.id, w.name]));
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
        staffName: nameMap.get((r.staffId ?? r.staff_id) as string) || '',
      }));
  };

  // 加载原日期当天所有排班，构建空闲度（2026-09-14 重构）
  // 个人：staffMap[staffId] = 该员工当天是否有排班
  // 班组：teamMap[teamId] = 该班组部门当天是否有任意排班
  const loadOriginalDateAvailability = async (date: string) => {
    setLoadingAvailability(true);
    try {
      const { enhancedApiClient } = await import('@/lib/apiClient');
      const rows = await enhancedApiClient.get<unknown[]>(
        `/schedules?startDate=${date}&endDate=${date}&limit=500`,
      );
      const allRows = (rows || []) as Array<Record<string, unknown>>;

      // 个人空闲度
      const staffMap = new Map<string, boolean>();
      // 部门 → 是否有任意排班（班组空闲度用）
      const deptHasSchedule = new Set<string>();
      for (const r of allRows) {
        const sid = ((r.staffId ?? r.staff_id) as string) || '';
        if (sid) staffMap.set(sid, true);
        // 工人数据里读 departmentName
        const w = workers.find(
          (x: unknown) => (x as { id?: string }).id === sid,
        ) as { departmentName?: string } | undefined;
        if (w?.departmentName) deptHasSchedule.add(w.departmentName);
      }

      // 班组空闲度：teamMap[teamId] = team.departmentName ∈ deptHasSchedule
      const teamMap = new Map<string, boolean>();
      for (const t of teams) {
        teamMap.set(t.id, deptHasSchedule.has(t.departmentName || ''));
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
    const rows = await enhancedApiClient.get<unknown[]>(
      `/schedules?startDate=${originalDate}&endDate=${originalDate}&limit=500`,
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
      const teamWorkers = workers
        .filter((w: unknown) => (w as { departmentName?: string }).departmentName === team.departmentName)
        .map((w: { id?: string; name?: string }) => ({ id: w.id || '', name: w.name || '' }))
        .filter(w => w.id);
      const memberSet = new Set(teamWorkers.map(w => w.id));
      const nameMap = new Map(teamWorkers.map(w => [w.id, w.name]));
      const all = await loadTargetOnOriginalDate(formData.originalDate);
      const filtered = all
        .filter(r => r.staffId && memberSet.has(r.staffId))
        .map(r => ({ ...r, staffName: nameMap.get(r.staffId) || '' }));
      setTargetOriginalDateSchedules(filtered);
    })();
  };

  // 提交
  const handleSubmit = () => {
    if (!formData.requesterId || !formData.targetId || !formData.originalDate) {
      showAlert('请填写完整信息');
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
    if (formData.targetDate && formData.originalDate === formData.targetDate) {
      showAlert('原日期与目标日期不能相同');
      return;
    }
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

// 调班申请列表组件（不变）
interface SwapRequestListProps {
  requests: SwapRequest[];
  onHandle: (id: string, status: '已同意' | '已拒绝') => void;
}

export function SwapRequestList({ requests, onHandle }: SwapRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无调班申请
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map(request => (
        <div
          key={request.id}
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-800">{request.requesterName}</span>
                <span className="text-gray-400">与</span>
                <span className="font-medium text-gray-800">{request.targetName}</span>
                <span className={`
                  px-2 py-0.5 rounded text-xs font-medium
                  ${request.status === '待审批' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${request.status === '已同意' ? 'bg-green-100 text-green-700' : ''}
                  ${request.status === '已拒绝' ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {request.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                <span>原日期: {request.originalDate}</span>
                <span>目标日期: {request.targetDate}</span>
              </div>
              {request.reason && (
                <p className="text-sm text-gray-500 mt-2 flex items-start gap-1">
                  <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {request.reason}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                申请时间: {request.createTime}
              </p>
            </div>

            {request.status === '待审批' && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onHandle(request.id, '已同意')}
                  className="text-green-600 hover:bg-green-50"
                  title="同意"
                >
                  <Check className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onHandle(request.id, '已拒绝')}
                  className="text-red-600 hover:bg-red-50"
                  title="拒绝"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SwapRequestModal;
