import { useState, useMemo } from 'react';
import type { PieceRate, PieceworkFilters, PieceworkPagination, PieceworkStats } from '../types';

// 任务选项
export const taskOptions = [
  { id: 'T001', name: '番茄采收' },
  { id: 'T002', name: '黄瓜分装' },
  { id: 'T003', name: '辣椒采收' },
  { id: 'T004', name: '茄子打包' },
  { id: 'T005', name: '番茄包装' },
];

// Mock计件工资数据
const mockPieceworkData: PieceRate[] = [
  {
    id: 'PR001',
    workerId: 'W001',
    workerName: '萧峰',
    taskId: 'T001',
    taskName: '番茄采收',
    unit: '斤',
    quantity: 500,
    unitPrice: 0.5,
    total: 250,
    workDate: '2026-04-01',
    status: '已发放',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-01 18:00:00',
  },
  {
    id: 'PR002',
    workerId: 'W002',
    workerName: '虚竹',
    taskId: 'T001',
    taskName: '番茄采收',
    unit: '斤',
    quantity: 480,
    unitPrice: 0.5,
    total: 240,
    workDate: '2026-04-01',
    status: '已发放',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-01 18:00:00',
  },
  {
    id: 'PR003',
    workerId: 'W001',
    workerName: '萧峰',
    taskId: 'T002',
    taskName: '黄瓜分装',
    unit: '箱',
    quantity: 120,
    unitPrice: 2,
    total: 240,
    workDate: '2026-04-02',
    status: '已确认',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-02 18:00:00',
  },
  {
    id: 'PR004',
    workerId: 'W003',
    workerName: '狄云',
    taskId: 'T003',
    taskName: '辣椒采收',
    unit: '斤',
    quantity: 350,
    unitPrice: 0.6,
    total: 210,
    workDate: '2026-04-02',
    status: '待确认',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-02 18:00:00',
  },
  {
    id: 'PR005',
    workerId: 'W004',
    workerName: '石破天',
    taskId: 'T002',
    taskName: '黄瓜分装',
    unit: '箱',
    quantity: 100,
    unitPrice: 2,
    total: 200,
    workDate: '2026-04-03',
    status: '待确认',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-03 18:00:00',
  },
  {
    id: 'PR006',
    workerId: 'W005',
    workerName: '胡斐',
    taskId: 'T004',
    taskName: '茄子打包',
    unit: '箱',
    quantity: 80,
    unitPrice: 2.5,
    total: 200,
    workDate: '2026-04-03',
    status: '已确认',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-03 18:00:00',
  },
  {
    id: 'PR007',
    workerId: 'W002',
    workerName: '虚竹',
    taskId: 'T005',
    taskName: '番茄包装',
    unit: '箱',
    quantity: 90,
    unitPrice: 3,
    total: 270,
    workDate: '2026-04-04',
    status: '待确认',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-04 18:00:00',
  },
  {
    id: 'PR008',
    workerId: 'W006',
    workerName: '袁承志',
    taskId: 'T001',
    taskName: '番茄采收',
    unit: '斤',
    quantity: 420,
    unitPrice: 0.5,
    total: 210,
    workDate: '2026-04-04',
    status: '已确认',
    creatorId: 'admin',
    creatorName: '管理员',
    createTime: '2026-04-04 18:00:00',
  },
];

export function usePiecework() {
  const [filters, setFilters] = useState<PieceworkFilters>({});
  const [pagination, setPagination] = useState<PieceworkPagination>({
    currentPage: 1,
    pageSize: 10,
    total: mockPieceworkData.length,
  });

  // 过滤数据
  const filteredData = useMemo(() => {
    return mockPieceworkData.filter((record) => {
      if (filters.workerName && !record.workerName.includes(filters.workerName)) {
        return false;
      }
      if (filters.taskName && !record.taskName.includes(filters.taskName)) {
        return false;
      }
      if (filters.startDate && record.workDate < filters.startDate) {
        return false;
      }
      if (filters.endDate && record.workDate > filters.endDate) {
        return false;
      }
      if (filters.status && record.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [filters]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pagination]);

  // 统计数据
  const stats = useMemo<PieceworkStats>(() => {
    const workers = new Set(filteredData.map((r) => r.workerId));
    const totalQuantity = filteredData.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = filteredData.reduce((sum, r) => sum + r.total, 0);

    return {
      totalWorkers: workers.size,
      totalQuantity,
      totalAmount,
      avgAmountPerWorker: workers.size > 0 ? totalAmount / workers.size : 0,
    };
  }, [filteredData]);

  // 更新筛选
  const updateFilters = (newFilters: Partial<PieceworkFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({});
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // 分页操作
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  };

  // 计算总工资
  const calculateTotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice;
  };

  // 添加记录
  const addRecord = (data: Omit<PieceRate, 'id' | 'total' | 'createTime'>) => {
    const newRecord: PieceRate = {
      ...data,
      id: `PR${String(mockPieceworkData.length + 1).padStart(3, '0')}`,
      total: data.quantity * data.unitPrice,
      createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    mockPieceworkData.unshift(newRecord);
    setPagination((prev) => ({ ...prev, total: mockPieceworkData.length }));
  };

  // 更新记录状态
  const updateRecordStatus = (recordId: string, status: PieceRate['status']) => {
    const record = mockPieceworkData.find((r) => r.id === recordId);
    if (record) {
      record.status = status;
    }
  };

  return {
    data: paginatedData,
    total: filteredData.length,
    stats,
    pagination,
    filters,
    updateFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange,
    calculateTotal,
    addRecord,
    updateRecordStatus,
  };
}
