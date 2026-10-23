/**
 * 任务排班页（原「任务派工排班」，P0-6）
 *
 * 2026-10-20：并入「排班调度」(/schedule) 的「任务排班」Tab，旧路由 /farm-task-schedule 重定向过来。
 *
 * 2026-10-23：布局重构（原：左侧待排班任务列表 + 右侧内嵌排班表单的两栏布局）：
 *   1. 待排班任务由卡片列表改为表格（与「排班记录」表格模式一致：标题栏 + 搜索 + 分页）；
 *   2. 新增排班由页面内嵌表单改为弹窗（TaskScheduleAddModal，与「编辑排班」弹窗同款 UnifiedModal）；
 *   3. 当日排班保持列表形式，改为整宽放在待排班任务表格下方。
 *
 * 与同页「考勤排班」Tab 区分：这里排的是"哪条农事任务在什么时候由谁做"；
 * 考勤排班排的是"某个人哪天上什么班、几点打卡"。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Clock, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button, DateRangePicker, Input, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useFarmTaskSchedule, type FarmTaskSchedule } from '../../hooks/useFarmTaskSchedule';
import { useWorkerStore } from '../../stores';
import { useTeamManageStore } from '../../stores/useTeamManageStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import TaskScheduleEditModal, { type TaskScheduleEditTarget } from './TaskScheduleEditModal';
import TaskScheduleAddModal, { type TaskScheduleCreateInput } from './TaskScheduleAddModal';
import { formatEndTimeLabel } from './taskScheduleUtils';

export default function TaskSchedulePage() {
  // URL 参数：date（初始日期）/ teamId（预选班组）/ taskId（预选待排班任务），由班组分配页、巡查计划面板跳转带进来
  const [searchParams] = useSearchParams();
  const urlDate = searchParams.get('date');
  const urlTeamId = searchParams.get('teamId');
  // 2026-10-21 P5：巡查计划实例「去排班」深链 —— /schedule?date=...&taskId=...
  //   未排班的巡查任务本来就在「待排班任务」列表里（status='pending' 且无排班行），
  //   这里把选中的那条预选上，用户落地即可直接排班，不必在列表里再找一遍。
  const urlTaskId = searchParams.get('taskId');

  // 2026-10-23：日期切换改为「已排班任务」表格的日期范围筛选（原先是页头的单日 ‹ 日期 › 切换）。
  //   区间为空 = 不限日期，表格展示全部已排班任务。
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const { schedules, unscheduledTasks, shifts, loading, error, createSchedule, updateSchedule, deleteSchedule, refresh } =
    useFarmTaskSchedule({
      startDate: rangeStart || undefined,
      endDate: rangeEnd || undefined,
    });

  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);

  useEffect(() => {
    if (workers.length === 0) void loadWorkers();
  }, [workers.length, loadWorkers]);

  // 班组列表（与「班组分配」页同一 Store）
  const teams = useTeamManageStore((s) => s.teams);
  const fetchTeamData = useTeamManageStore((s) => s.fetchData);

  useEffect(() => {
    if (teams.length === 0) void fetchTeamData();
  }, [teams.length, fetchTeamData]);

  // 新增排班弹窗（2026-10-23：原先是页面右侧内嵌表单，改为弹窗）
  const [showAddModal, setShowAddModal] = useState(false);
  /** 弹窗内预选的任务 id（从待排班任务表格行尾「排班」进来时带上） */
  const [addTaskId, setAddTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 待排班任务表格：搜索 + 分页
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 2026-10-21 P5：深链预选 —— 待排班列表到位后再选，否则那一刻它还是空数组
  // 2026-10-22（审核 P3-5）：任务不在待排班列表时（已排班/已取消/已完成）明确告知，
  //   而不是静默什么都不发生 —— 用户从计划面板点「去排班」落地后毫无反馈会很困惑。
  // 2026-10-23：预选后直接打开「新增排班」弹窗（表单已移入弹窗）。
  //   同时用 handledUrlTaskRef 保证同一个 taskId 只处理一次：
  //   保存排班后待排班列表会重新拉取，若不拦截，effect 会再跑一遍 ——
  //   轻则弹窗被重置表单后重开，重则弹出「该任务已有排班」的误导提示。
  const handledUrlTaskRef = useRef<string | null>(null);
  useEffect(() => {
    if (!urlTaskId || loading) return;
    if (unscheduledTasks.length === 0) return;
    if (handledUrlTaskRef.current === urlTaskId) return;
    handledUrlTaskRef.current = urlTaskId;
    if (unscheduledTasks.some((t) => t.id === urlTaskId)) {
      setAddTaskId(urlTaskId);
      setShowAddModal(true);
    } else {
      showAlert('该任务已有排班或已不处于待排班状态，无需重新排班。');
    }
  }, [urlTaskId, unscheduledTasks, loading]);

  // 打开新增排班弹窗（可预选任务）
  const openAddModal = (taskId?: string) => {
    setAddTaskId(taskId ?? null);
    setShowAddModal(true);
  };

  // 待排班任务（搜索过滤）
  const filteredUnscheduled = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) return unscheduledTasks;
    return unscheduledTasks.filter((t) =>
      [
        t.taskCode || '',
        t.taskTitle || t.title || '',
        t.typeName || t.type || '',
        t.greenhouseName || t.areaName || '',
        t.assigneeName || '',
      ]
        .some((v) => v.toLowerCase().includes(kw)),
    );
  }, [unscheduledTasks, searchTerm]);

  // 分页数据
  const pagedUnscheduled = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnscheduled.slice(start, start + pageSize);
  }, [filteredUnscheduled, currentPage, pageSize]);

  const totalUnscheduledPages = Math.ceil(filteredUnscheduled.length / pageSize);

  // 已排班任务表格（2026-10-23：与待排班任务同样的表格形式）：日期范围 + 搜索 + 分页
  const [schedSearch, setSchedSearch] = useState('');
  const [schedPage, setSchedPage] = useState(1);
  const [schedPageSize, setSchedPageSize] = useState(10);

  // 已排班任务（搜索过滤）
  const filteredSchedules = useMemo(() => {
    const kw = schedSearch.trim().toLowerCase();
    if (!kw) return schedules;
    return schedules.filter((s) =>
      [s.taskCode || s.taskId || '', s.taskTitle || '', s.workerName || '', s.teamName || '', s.shiftName || s.shiftType || '']
        .some((v) => v.toLowerCase().includes(kw)),
    );
  }, [schedules, schedSearch]);

  // 已排班任务分页数据
  const pagedSchedules = useMemo(() => {
    const start = (schedPage - 1) * schedPageSize;
    return filteredSchedules.slice(start, start + schedPageSize);
  }, [filteredSchedules, schedPage, schedPageSize]);

  const totalSchedPages = Math.ceil(filteredSchedules.length / schedPageSize);

  // 重置「已排班任务」筛选（日期范围 + 关键词）
  const resetSchedFilters = () => {
    setRangeStart('');
    setRangeEnd('');
    setSchedSearch('');
    setSchedPage(1);
  };

  // 深链 ?date=xxx：把日期范围收敛到该日（既是筛选条件，也是新增排班的默认日期）
  useEffect(() => {
    if (!urlDate) return;
    setRangeStart(urlDate);
    setRangeEnd(urlDate);
  }, [urlDate]);

  // 新增排班提交（弹窗内已做必填校验，这里只负责落库 + 反馈）
  const handleCreateSchedule = async (input: TaskScheduleCreateInput) => {
    setSaving(true);
    try {
      await createSchedule(input);
      await showAlert('排班已保存');
      setShowAddModal(false);
      setAddTaskId(null);
    } catch (e) {
      await showAlert(`排班失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
    } catch (e) {
      await showAlert(`删除失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ===== 编辑排班 =====
  // 派工后自动生成的排班落在任务计划日期上，现场常需改期 / 换班次 / 换执行人。
  // 没有编辑能力只能"删了重排"，而删除是物理删除（不可撤销），容易误删。
  const [editing, setEditing] = useState<TaskScheduleEditTarget | null>(null);

  const openEditModal = (s: FarmTaskSchedule) => {
    setEditing({
      id: s.id,
      taskId: s.taskId,
      taskCode: s.taskCode,
      taskTitle: s.taskTitle,
      workerId: s.workerId,
      workerName: s.workerName,
      teamId: s.teamId,
      teamName: s.teamName,
      planDate: s.planDate,
      planStart: s.planStart,
      planEnd: s.planEnd,
      shiftType: s.shiftType,
      remarks: s.remarks,
    });
  };

  const handleSaveEdit = async (
    id: string,
    updates: {
      planDate: string;
      workerId: string;
      workerName: string;
      teamId: string | null;
      teamName: string | null;
      shiftType: string;
      planStart: string;
      planEnd: string;
      remarks: string;
    },
  ) => {
    setSaving(true);
    try {
      await updateSchedule(id, updates as Partial<FarmTaskSchedule>);
      await showAlert('排班已更新');
      setEditing(null);
    } catch (e) {
      await showAlert(`更新失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          排班数据加载失败：{error}
        </div>
      )}

      {/* 待排班任务（2026-10-23：卡片列表改为表格，与「排班记录」表格模式一致） */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* 标题栏：标题 + 搜索框同一排；右侧为记录数与操作按钮 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 whitespace-nowrap">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                待排班任务（{unscheduledTasks.length}）
              </h3>
              {/* 2026-10-23：搜索框从下方工具栏移到标题名称之后（同一排显示） */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索任务编号、标题、执行人..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 h-8 w-[240px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 whitespace-nowrap">共 {filteredUnscheduled.length} 条记录</span>
              <Button variant="blue" size="sm" onClick={refresh}>
                <RefreshCw className="w-4 h-4" />
                刷新
              </Button>
              <Button size="sm" onClick={() => openAddModal()}>
                <Plus className="w-4 h-4" />
                新增排班
              </Button>
            </div>
          </div>
          {/* 列表说明（页头整行已删除，页面标题由 Tab 承担，说明落到列表副标题） */}
          <p className="text-xs text-gray-500 mt-1.5">把已派工的农事任务安排到具体的日期、班次与执行人</p>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">任务编号</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">任务标题</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">类型</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">区域</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">计划日期</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">执行人</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-300">
              {pagedUnscheduled.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {loading ? '加载中…' : '暂无待排班任务'}
                  </TableCell>
                </TableRow>
              ) : (
                pagedUnscheduled.map((t) => (
                  <TableRow key={t.id} className="hover:bg-blue-100 transition-colors">
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-600">{t.taskCode}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{t.taskTitle || t.title || '农事任务'}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {t.typeName || t.type || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {t.greenhouseName || t.areaName || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {t.planDate || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {t.assigneeName || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => openAddModal(t.id)}>
                        <Plus className="w-4 h-4" />
                        排班
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalUnscheduledPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            showPageSize={true}
          />
        </div>
      </div>

      {/* 已排班任务（2026-10-23：由「当日排班」列表改为表格 + 日期范围筛选） */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            已排班任务（{filteredSchedules.length}）
          </h3>
          <span className="text-sm text-gray-500">
            {rangeStart || rangeEnd ? `${rangeStart || '不限'} ~ ${rangeEnd || '不限'}` : '全部日期'}
          </span>
        </div>

        {/* 工具栏：日期范围（在前）+ 搜索 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">日期:</span>
              <DateRangePicker
                startDate={rangeStart ? new Date(rangeStart + 'T00:00:00') : undefined}
                endDate={rangeEnd ? new Date(rangeEnd + 'T00:00:00') : undefined}
                onChange={(start, end) => {
                  setRangeStart(start ? todayLocal(start) : '');
                  setRangeEnd(end ? todayLocal(end) : '');
                  setSchedPage(1);
                }}
                className="!min-w-[220px]"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索任务编号、标题、执行人..."
                value={schedSearch}
                onChange={(e) => {
                  setSchedSearch(e.target.value);
                  setSchedPage(1);
                }}
                className="pl-9 pr-4 w-[240px]"
              />
            </div>
            {/* 重置：清空日期范围 + 关键词 */}
            <Button variant="secondary" size="sm" onClick={resetSchedFilters}>
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
            <div className="text-sm text-gray-500 ml-auto">共 {filteredSchedules.length} 条记录</div>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">排班日期</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">任务编号</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">任务标题</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">班次</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">时间</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">执行人</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">班组</TableHead>
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-300">
              {pagedSchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {schedules.length === 0 ? '该日期区间暂无排班' : '没有匹配的排班记录'}
                  </TableCell>
                </TableRow>
              ) : (
                pagedSchedules.map((s) => (
                  <TableRow key={s.id} className="hover:bg-blue-100 transition-colors">
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {s.planDate || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-600">{s.taskCode || s.taskId}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{s.taskTitle || '-'}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                        {s.shiftName || shifts.find((x) => x.shiftCode === s.shiftType)?.shiftName || s.shiftType}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {/* 跨天班次（晚班 22:00 → 次日 06:00）标注「次日」，避免看起来像倒序 */}
                      {s.planStart || '—'} ~ {formatEndTimeLabel(s.planEnd || '', s.planStart || '')}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {s.workerName || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {s.teamName || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(s)}
                          title="编辑排班"
                          aria-label="编辑排班"
                        >
                          <Pencil className="w-4 h-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="删除排班">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={schedPage}
            totalPages={totalSchedPages}
            onPageChange={setSchedPage}
            pageSize={schedPageSize}
            onPageSizeChange={(size) => {
              setSchedPageSize(size);
              setSchedPage(1);
            }}
            showPageSize={true}
          />
        </div>
      </div>

      {/* 新增排班弹窗（2026-10-23：原页面右侧内嵌表单改为弹窗）
          默认排班日期：深链 ?date= > 日期区间起始日 > 今天 —— 落在当前筛选区间内，
          避免"保存成功但在表格里看不到"（区间筛选时新建的排班不在区间外） */}
      <TaskScheduleAddModal
        open={showAddModal}
        initialTaskId={addTaskId}
        initialTeamId={urlTeamId}
        tasks={unscheduledTasks}
        defaultDate={urlDate || rangeStart || todayLocal()}
        shifts={shifts}
        teams={teams}
        workers={workers}
        saving={saving}
        onClose={() => {
          setShowAddModal(false);
          setAddTaskId(null);
        }}
        onSubmit={handleCreateSchedule}
      />

      {/* 编辑排班弹窗 */}
      <TaskScheduleEditModal
        open={editing !== null}
        target={editing}
        shifts={shifts}
        teams={teams}
        workers={workers}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
