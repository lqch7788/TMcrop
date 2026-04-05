import { useState, useCallback } from 'react';
import type { LeaveRecord, LeaveFilters, PaginationInfo, UseLeaveReturn, LeaveType, LeaveStatus } from '../types';

// Mock 数据
const mockLeaveRecords: LeaveRecord[] = [
  { id: 'LV001', staffId: 'S001', staffName: '郭靖', leaveType: '事假', startDate: '2024-03-15', endDate: '2024-03-16', days: 2, reason: '家中急事需要处理', status: '待审批' },
  { id: 'LV002', staffId: 'S002', staffName: '杨过', leaveType: '病假', startDate: '2024-03-10', endDate: '2024-03-12', days: 3, reason: '感冒发烧', status: '已审批', approver: '黄药师', approveTime: '2024-03-10 09:30' },
  { id: 'LV003', staffId: 'S003', staffName: '张无忌', leaveType: '年假', startDate: '2024-03-20', endDate: '2024-03-25', days: 6, reason: '年度旅游休假', status: '待审批' },
  { id: 'LV004', staffId: 'S004', staffName: '令狐冲', leaveType: '婚假', startDate: '2024-04-01', endDate: '2024-04-05', days: 5, reason: '婚礼筹备及蜜月', status: '已审批', approver: '黄药师', approveTime: '2024-03-20 14:00' },
  { id: 'LV005', staffId: 'S005', staffName: '段誉', leaveType: '丧假', startDate: '2024-03-08', endDate: '2024-03-10', days: 3, reason: '家中老人去世', status: '已审批', approver: '黄药师', approveTime: '2024-03-08 08:00' },
  { id: 'LV006', staffId: 'S006', staffName: '黄蓉', leaveType: '产假', startDate: '2024-05-01', endDate: '2024-08-31', days: 123, reason: '生育休假', status: '已审批', approver: '黄药师', approveTime: '2024-04-15 10:00' },
  { id: 'LV007', staffId: 'S007', staffName: '陈家洛', leaveType: '工伤假', startDate: '2024-02-20', endDate: '2024-03-05', days: 14, reason: '工作中受伤', status: '已审批', approver: '黄药师', approveTime: '2024-02-20 16:00' },
  { id: 'LV008', staffId: 'S008', staffName: '任盈盈', leaveType: '陪产假', startDate: '2024-04-10', endDate: '2024-04-15', days: 6, reason: '妻子生育', status: '已驳回', approver: '黄药师', approveTime: '2024-04-08 11:00', remarks: '人员紧张，暂不批准' },
];

/**
 * 请假管理数据管理 Hook
 */
export function useLeave(): UseLeaveReturn {
  // 筛选条件
  const [filters, setFilters] = useState<LeaveFilters>({
    staffName: '',
    leaveType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 选中记录（用于详情/编辑）
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);

  // 弹窗状态
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 分页信息
  const pagination: PaginationInfo = {
    currentPage,
    pageSize,
    total: mockLeaveRecords.length,
  };

  // 设置筛选条件
  const handleSetFilters = useCallback((newFilters: LeaveFilters) => {
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
  const handleSave = useCallback((data: Partial<LeaveRecord>) => {
    // 实际项目中这里会调用 API 保存数据
    setIsFormOpen(false);
  }, []);

  // 审批通过
  const handleApprove = useCallback((record: LeaveRecord) => {
    // 实际项目中这里会调用 API 执行审批操作
    setIsDetailOpen(false);
  }, []);

  // 驳回
  const handleReject = useCallback((record: LeaveRecord) => {
    // 实际项目中这里会调用 API 执行驳回操作
    setIsDetailOpen(false);
  }, []);

  // 取消申请
  const handleCancel = useCallback((record: LeaveRecord) => {
    // 实际项目中这里会调用 API 执行取消操作
  }, []);

  return {
    data: mockLeaveRecords,
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
