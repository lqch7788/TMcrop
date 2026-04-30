import { useState, useMemo } from 'react';
import type { ScheduleRecord, ShiftConfig, ShiftType, ScheduleStatus, SwapRequest, Staff } from '../types';

// 班次配置
const DEFAULT_SHIFT_CONFIGS: ShiftConfig[] = [
  { name: '早班', startTime: '06:00', endTime: '14:00', color: 'bg-amber-500' },
  { name: '中班', startTime: '14:00', endTime: '22:00', color: 'bg-blue-500' },
  { name: '晚班', startTime: '22:00', endTime: '06:00', color: 'bg-indigo-600' },
  { name: '全天', startTime: '08:00', endTime: '20:00', color: 'bg-green-500' },
  { name: '弹性', startTime: '09:00', endTime: '18:00', color: 'bg-purple-500' },
];

// 模拟员工数据
const MOCK_STAFF: Staff[] = [
  { id: 'S001', name: '张三', workZone: 'A区' },
  { id: 'S002', name: '李四', workZone: 'B区' },
  { id: 'S003', name: '王五', workZone: 'A区' },
  { id: 'S004', name: '赵六', workZone: 'C区' },
  { id: 'S005', name: '钱七', workZone: 'B区' },
  { id: 'S006', name: '孙八', workZone: 'A区' },
  { id: 'S007', name: '周九', workZone: 'C区' },
  { id: 'S008', name: '吴十', workZone: 'B区' },
];

// 生成一周的模拟排班数据
function generateMockSchedule(): ScheduleRecord[] {
  const records: ScheduleRecord[] = [];
  const today = new Date();
  const shifts: ShiftType[] = ['早班', '中班', '晚班', '全天', '弹性'];
  const statuses: ScheduleStatus[] = ['已排班', '已执行', '已排班', '已排班'];
  const workZones = ['A区', 'B区', 'C区'];

  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + weekOffset * 7 + dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      // 每天随机分配2-4个员工
      const staffCount = 2 + Math.floor(Math.random() * 3);
      const selectedStaff = [...MOCK_STAFF].sort(() => Math.random() - 0.5).slice(0, staffCount);

      selectedStaff.forEach((staff, idx) => {
        const shift = shifts[Math.floor(Math.random() * shifts.length)];
        const isToday = dateStr === today.toISOString().split('T')[0];
        const isPast = date < today && !isToday;

        records.push({
          id: `SCH-${dateStr.replace(/-/g, '')}-${staff.id}`,
          staffId: staff.id,
          staffName: staff.name,
          date: dateStr,
          shift,
          workZone: staff.workZone,
          status: isPast ? '已执行' : (Math.random() > 0.1 ? '已排班' : '已取消'),
          checkIn: isPast && Math.random() > 0.3 ? `${6 + idx}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined,
          checkOut: isPast && Math.random() > 0.5 ? `${14 + idx}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined,
        });
      });
    }
  }

  return records;
}

// 调班申请模拟数据
function generateMockSwapRequests(): SwapRequest[] {
  return [
    {
      id: 'SWAP001',
      requesterId: 'S001',
      requesterName: '张三',
      targetId: 'S002',
      targetName: '李四',
      originalDate: '2026-04-05',
      targetDate: '2026-04-07',
      reason: '家中有事，需要调班',
      status: '待审批',
      createTime: '2026-04-03 10:30:00',
    },
    {
      id: 'SWAP002',
      requesterId: 'S003',
      requesterName: '王五',
      targetId: 'S004',
      targetName: '赵六',
      originalDate: '2026-04-06',
      targetDate: '2026-04-08',
      reason: '临时会议冲突',
      status: '已同意',
      createTime: '2026-04-02 14:20:00',
    },
  ];
}

export interface UseScheduleProps {
  initialDate?: string;
}

export function useSchedule({ initialDate }: UseScheduleProps = {}) {
  // 状态
  const [scheduleList, setScheduleList] = useState<ScheduleRecord[]>(generateMockSchedule);
  const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>(DEFAULT_SHIFT_CONFIGS);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>(generateMockSwapRequests);

  // 获取指定日期的排班
  const getScheduleByDate = (date: string) => {
    return scheduleList.filter(record => record.date === date);
  };

  // 获取指定员工指定日期的排班
  const getScheduleByStaffAndDate = (staffId: string, date: string) => {
    return scheduleList.find(record => record.staffId === staffId && record.date === date);
  };

  // 添加排班
  const addSchedule = (record: Omit<ScheduleRecord, 'id'>) => {
    const newRecord: ScheduleRecord = {
      ...record,
      id: `SCH-${record.date.replace(/-/g, '')}-${record.staffId}-${Date.now()}`,
    };
    setScheduleList(prev => [...prev, newRecord]);
    return newRecord;
  };

  // 更新排班
  const updateSchedule = (id: string, updates: Partial<ScheduleRecord>) => {
    setScheduleList(prev =>
      prev.map(record => (record.id === id ? { ...record, ...updates } : record))
    );
  };

  // 取消排班
  const cancelSchedule = (id: string) => {
    updateSchedule(id, { status: '已取消' });
  };

  // 删除排班
  const deleteSchedule = (id: string) => {
    setScheduleList(prev => prev.filter(record => record.id !== id));
  };

  // 批量调整排班（拖拽用）
  const batchUpdateSchedule = (ids: string[], updates: Partial<ScheduleRecord>) => {
    setScheduleList(prev =>
      prev.map(record => (ids.includes(record.id) ? { ...record, ...updates } : record))
    );
  };

  // 更新班次配置
  const updateShiftConfig = (name: ShiftType, config: Partial<ShiftConfig>) => {
    setShiftConfigs(prev =>
      prev.map(cfg => (cfg.name === name ? { ...cfg, ...config } : cfg))
    );
  };

  // 提交调班申请
  const submitSwapRequest = (request: Omit<SwapRequest, 'id' | 'status' | 'createTime'>) => {
    const newRequest: SwapRequest = {
      ...request,
      id: `SWAP-${Date.now()}`,
      status: '待审批',
      createTime: new Date().toISOString().replace('T', ' ').split('.')[0],
    };
    setSwapRequests(prev => [...prev, newRequest]);
    return newRequest;
  };

  // 处理调班申请
  const handleSwapRequest = (id: string, status: '已同意' | '已拒绝') => {
    let approvedRequest: SwapRequest | null = null;

    setSwapRequests(prev =>
      prev.map(req => {
        if (req.id === id) {
          if (status === '已同意') {
            approvedRequest = { ...req, status };
          }
          return { ...req, status };
        }
        return req;
      })
    );

    // 如果同意，执行调班
    if (status === '已同意' && approvedRequest) {
      // 更新原员工的排班
      const originalSchedule = getScheduleByStaffAndDate(approvedRequest.requesterId, approvedRequest.originalDate);
      if (originalSchedule) {
        updateSchedule(originalSchedule.id, {
          staffId: approvedRequest.targetId,
          staffName: approvedRequest.targetName,
        });
      }
    }
  };

  // 获取周视图日期范围
  const weekDateRange = useMemo(() => {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  // 获取月视图日期范围
  const monthDateRange = useMemo(() => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const dates: string[] = [];
    // 补齐月初空白
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    // 当月日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    // 补齐月末空白
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < (lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek); i++) {
      const d = new Date(year, month + 1, i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  return {
    // 数据
    scheduleList,
    shiftConfigs,
    staffList: MOCK_STAFF,
    swapRequests,
    // 视图
    selectedDate,
    viewMode,
    weekDateRange,
    monthDateRange,
    // 设置
    setSelectedDate,
    setViewMode,
    // 查询
    getScheduleByDate,
    getScheduleByStaffAndDate,
    // 操作
    addSchedule,
    updateSchedule,
    cancelSchedule,
    deleteSchedule,
    batchUpdateSchedule,
    updateShiftConfig,
    submitSwapRequest,
    handleSwapRequest,
  };
}

export type UseScheduleReturn = ReturnType<typeof useSchedule>;
