import { useState, useCallback, useMemo } from 'react';
import type { WorkLog, WorkLogFilters, PaginationInfo, UseWorkLogReturn } from '../types';

// Mock 数据 - 扩展到8条，覆盖不同日期、工人、大棚
const mockWorkLogs: WorkLog[] = [
  { id: 1, code: 'WL20240301', date: '2024-03-14', worker: '郭靖', weather: '晴', temperature: '25°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '授粉、浇水', problems: '无', solutions: '-', taskId: 'T001', batchId: 'B001', batchCode: 'FQ2024-001' },
  { id: 2, code: 'WL20240302', date: '2024-03-14', worker: '杨过', weather: '晴', temperature: '26°C', crop: '黄瓜', greenhouse: '2号棚', growthStatus: '良好', tasks: '施肥、病虫害防治', problems: '发现少量蚜虫', solutions: '已喷洒吡虫啉', taskId: 'T002', batchId: 'B002', batchCode: 'FQ2024-002' },
  { id: 3, code: 'WL20240303', date: '2024-03-14', worker: '张无忌', weather: '晴', temperature: '24°C', crop: '草莓', greenhouse: '3号棚', growthStatus: '一般', tasks: '疏果、浇水', problems: '部分叶片发黄', solutions: '补充氮肥', taskId: 'T003', batchId: 'B003', batchCode: 'FQ2024-003' },
  { id: 4, code: 'WL20240304', date: '2024-03-13', worker: '令狐冲', weather: '多云', temperature: '22°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '整枝、授粉', problems: '无', solutions: '-', taskId: 'T001', batchId: 'B001', batchCode: 'FQ2024-001' },
  { id: 5, code: 'WL20240305', date: '2024-03-13', worker: '段誉', weather: '多云', temperature: '23°C', crop: '辣椒', greenhouse: '4号棚', growthStatus: '良好', tasks: '浇水、施肥', problems: '无', solutions: '-', taskId: 'T005', batchId: 'B005', batchCode: 'FQ2024-005' },
  { id: 6, code: 'WL20240306', date: '2024-03-12', worker: '黄蓉', weather: '阴', temperature: '20°C', crop: '生菜', greenhouse: '5号棚', growthStatus: '良好', tasks: '采收、清洗', problems: '无', solutions: '-', taskId: 'T004', batchId: 'B004', batchCode: 'FQ2024-004' },
  { id: 7, code: 'WL20240307', date: '2024-03-12', worker: '陈家洛', weather: '阴', temperature: '21°C', crop: '菠菜', greenhouse: '6号棚', growthStatus: '一般', tasks: '除草、浇水', problems: '发现蜗牛', solutions: '已撒石灰驱除', taskId: undefined, batchId: 'B006', batchCode: 'FQ2024-006' },
  { id: 8, code: 'WL20240308', date: '2024-03-11', worker: '任盈盈', weather: '晴', temperature: '24°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '绑蔓、修剪', problems: '无', solutions: '-', taskId: 'T001', batchId: 'B001', batchCode: 'FQ2024-001' },
];

/**
 * 工作日志数据管理 Hook
 */
export function useWorkLog(): UseWorkLogReturn {
  // 筛选条件
  const [filters, setFilters] = useState<WorkLogFilters>({
    date: '',
    worker: '',
    greenhouse: '全部',
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 选中日志（用于详情/编辑）
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);

  // 弹窗状态
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return mockWorkLogs.filter((log) => {
      // 日期筛选
      if (filters.date && log.date !== filters.date) return false;
      // 工人筛选
      if (filters.worker && !log.worker.includes(filters.worker)) return false;
      // 大棚筛选
      if (filters.greenhouse && filters.greenhouse !== '全部' && log.greenhouse !== filters.greenhouse) return false;
      return true;
    });
  }, [filters]);

  // 分页信息
  const pagination: PaginationInfo = {
    currentPage,
    pageSize,
    total: filteredData.length,
  };

  // 设置筛选条件
  const handleSetFilters = useCallback((newFilters: WorkLogFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // 重置页码
  }, []);

  // 设置页码
  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 设置每页条数
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // 保存日志（新建/编辑）
  const handleSave = useCallback((data: Partial<WorkLog>) => {
    // 实际项目中这里会调用 API 保存数据
    setIsFormOpen(false);
  }, []);

  return {
    data: filteredData, // 返回筛选后的数据
    filters,
    pagination,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    selectedLog,
    setSelectedLog,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
  };
}
