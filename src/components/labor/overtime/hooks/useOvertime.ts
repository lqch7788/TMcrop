import { useState, useCallback, useMemo } from 'react';
import type {
  OvertimeRecord,
  OvertimeFilters,
  OvertimePaginationInfo,
  OvertimeFormData,
  UseOvertimeReturn,
  OvertimeType,
} from '../types';

// 加班费倍数
const OVERTIME_MULTIPLIERS: Record<OvertimeType, number> = {
  '普通加班': 1.5,
  '周末加班': 2,
  '节假日加班': 3,
};

// Mock 数据
const mockOvertimeRecords: OvertimeRecord[] = [
  { id: 'OT001', staffId: 'S001', staffName: '郭靖', date: '2024-03-15', hours: 3, type: '普通加班', reason: '紧急订单处理', status: '已审批', approver: '黄药师', approveTime: '2024-03-15 18:00', hourlyRate: 50, totalPay: 225 },
  { id: 'OT002', staffId: 'S002', staffName: '杨过', date: '2024-03-16', hours: 4, type: '周末加班', reason: '设备维护', status: '已审批', approver: '黄药师', approveTime: '2024-03-16 10:00', hourlyRate: 50, totalPay: 400 },
  { id: 'OT003', staffId: 'S003', staffName: '张无忌', date: '2024-03-20', hours: 2, type: '普通加班', reason: '客户来访准备', status: '待审批', hourlyRate: 60, totalPay: 180 },
  { id: 'OT004', staffId: 'S004', staffName: '令狐冲', date: '2024-04-01', hours: 6, type: '节假日加班', reason: '春耕生产', status: '已审批', approver: '黄药师', approveTime: '2024-04-01 08:30', hourlyRate: 50, totalPay: 900 },
  { id: 'OT005', staffId: 'S005', staffName: '段誉', date: '2024-04-05', hours: 3, type: '普通加班', reason: '物资整理', status: '已驳回', approver: '黄药师', approveTime: '2024-04-04 16:00', remarks: '无需加班' },
  { id: 'OT006', staffId: 'S006', staffName: '黄蓉', date: '2024-04-10', hours: 5, type: '周末加班', reason: '促销活动准备', status: '已审批', approver: '黄药师', approveTime: '2024-04-10 09:00', hourlyRate: 55, totalPay: 550 },
  { id: 'OT007', staffId: 'S007', staffName: '陈家洛', date: '2024-04-15', hours: 2, type: '普通加班', reason: '会议加班', status: '待审批', hourlyRate: 50, totalPay: 150 },
  { id: 'OT008', staffId: 'S008', staffName: '任盈盈', date: '2024-04-20', hours: 4, type: '普通加班', reason: '项目赶工', status: '已审批', approver: '黄药师', approveTime: '2024-04-20 17:30', hourlyRate: 55, totalPay: 330 },
];

/**
 * 计算加班费
 * @param hours 加班小时数
 * @param type 加班类型
 * @param hourlyRate 时薪（默认50元/小时，应从员工工资配置中获取）
 */
function calculateOvertimePay(hours: number, type: OvertimeType, hourlyRate: number = 50): number {
  return hours * hourlyRate * OVERTIME_MULTIPLIERS[type];
}

/**
 * 加班管理数据管理 Hook
 */
export function useOvertime(): UseOvertimeReturn {
  // 筛选条件
  const [filters, setFilters] = useState<OvertimeFilters>({
    staffName: '',
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 选中记录（用于详情/编辑）
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);

  // 弹窗状态
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 分页信息
  const pagination: OvertimePaginationInfo = {
    currentPage,
    pageSize,
    total: mockOvertimeRecords.length,
  };

  // 设置筛选条件
  const handleSetFilters = useCallback((newFilters: OvertimeFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
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

  // 保存记录（新建/编辑）
  const handleSave = useCallback((data: OvertimeFormData) => {
    // TODO: 实际项目中应从员工工资配置 API 获取时薪
    const hourlyRate = 50; // TODO: 临时使用默认值50，应替换为实际时薪
    const newRecord: OvertimeRecord = {
      id: `OT${Date.now()}`,
      ...data,
      status: '待审批',
      hourlyRate,
      totalPay: calculateOvertimePay(data.hours, data.type, hourlyRate),
    };
    setIsFormOpen(false);
  }, []);

  // 审批通过
  const handleApprove = useCallback((record: OvertimeRecord) => {
    // 实际项目中这里会调用 API 执行审批操作
    setIsDetailOpen(false);
  }, []);

  // 驳回
  const handleReject = useCallback((record: OvertimeRecord) => {
    // 实际项目中这里会调用 API 执行驳回操作
    setIsDetailOpen(false);
  }, []);

  // 取消申请
  const handleCancel = useCallback((record: OvertimeRecord) => {
    // 实际项目中这里会调用 API 执行取消操作
  }, []);

  return {
    data: mockOvertimeRecords,
    filters,
    pagination,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    selectedRecord,
    setSelectedRecord,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
    handleApprove,
    handleReject,
    handleCancel,
  };
}
