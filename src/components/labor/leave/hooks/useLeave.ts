/**
 * 请假管理数据管理 Hook (V2.0 架构改造)
 *
 * 数据流：useLeaveStore → Hook → 组件
 * 不再使用 React Query，改为直接与 Zustand Store 交互
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLeaveStore } from '@/stores/leaveStore';
import type { LeaveRecord as StoreLeaveRecord, LeaveType as StoreLeaveType, LeaveStatus as StoreLeaveStatus } from '@/stores/leaveStore';
import type { LeaveRecord, LeaveFilters, PaginationInfo, UseLeaveReturn, LeaveType, LeaveStatus } from '../types';

// ==================== 枚举映射 ====================

/** 英文枚举 → 中文标签 */
const LEAVE_TYPE_EN_TO_CN: Record<string, LeaveType> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  marriage: '婚假',
  maternity: '产假',
  paternity: '陪产假',
  bereavement: '丧假',
  work_injury: '工伤假',
};

const LEAVE_STATUS_EN_TO_CN: Record<string, LeaveStatus> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
  withdrawn: '已撤回',
};

/** 中文标签 → 英文枚举 */
const LEAVE_TYPE_CN_TO_EN: Record<string, string> = {};
for (const [en, cn] of Object.entries(LEAVE_TYPE_EN_TO_CN)) {
  LEAVE_TYPE_CN_TO_EN[cn] = en;
}

/**
 * Store 格式 → 组件内部格式
 */
function mapStoreToComponent(record: StoreLeaveRecord): LeaveRecord {
  return {
    id: record.id,
    staffId: record.workerId,
    staffName: record.workerName,
    leaveType: (LEAVE_TYPE_EN_TO_CN[record.leaveType] || record.leaveType) as LeaveType,
    startDate: record.startDate,
    endDate: record.endDate,
    days: record.days,
    reason: record.reason,
    status: (LEAVE_STATUS_EN_TO_CN[record.status] || record.status) as LeaveStatus,
    approver: record.approver,
    approveTime: record.approveTime,
    remarks: record.remarks,
  };
}

/**
 * 请假管理数据管理 Hook
 */
export function useLeave(): UseLeaveReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const storeRecords = useLeaveStore((s) => s.leaveRecords);
  const fetchItems = useLeaveStore((s) => s.fetchItems);
  const createItem = useLeaveStore((s) => s.createItem);
  const updateItem = useLeaveStore((s) => s.updateItem);

  // ========== 挂载时加载数据 ==========
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ========== 筛选条件 ==========
  const [filters, setFilters] = useState<LeaveFilters>({
    staffName: '',
    leaveType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // ========== 分页状态 ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ========== 选中记录 ==========
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);

  // ========== 弹窗状态 ==========
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // ========== Store数据 → 组件格式 ==========
  const data: LeaveRecord[] = useMemo(() => {
    return storeRecords.map(mapStoreToComponent);
  }, [storeRecords]);

  // ========== 分页信息 ==========
  const pagination: PaginationInfo = useMemo(() => ({
    currentPage,
    pageSize,
    total: data.length,
  }), [currentPage, pageSize, data.length]);

  // ========== 设置筛选条件 ==========
  const handleSetFilters = useCallback((newFilters: LeaveFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // ========== 设置页码 ==========
  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // ========== 设置每页条数 ==========
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // ========== 保存记录（新建/编辑） ==========
  const handleSave = useCallback(async (saveData: Partial<LeaveRecord>) => {
    try {
      if (selectedRecord) {
        // 更新现有记录
        const updates: Partial<StoreLeaveRecord> = {};
        if (saveData.leaveType) {
          updates.leaveType = (LEAVE_TYPE_CN_TO_EN[saveData.leaveType] || 'personal') as StoreLeaveType;
        }
        if (saveData.startDate) updates.startDate = saveData.startDate;
        if (saveData.endDate) updates.endDate = saveData.endDate;
        if (saveData.days !== undefined) updates.days = saveData.days;
        if (saveData.reason) updates.reason = saveData.reason;
        if (saveData.remarks !== undefined) updates.remarks = saveData.remarks;

        await updateItem(selectedRecord.id, updates);
      } else {
        // 创建新记录
        await createItem({
          workerId: saveData.staffId || '',
          workerName: saveData.staffName || '',
          leaveType: (LEAVE_TYPE_CN_TO_EN[saveData.leaveType || ''] || 'personal') as StoreLeaveType,
          startDate: saveData.startDate || '',
          endDate: saveData.endDate || '',
          days: saveData.days || 0,
          reason: saveData.reason || '',
          remarks: saveData.remarks,
          status: 'pending' as StoreLeaveStatus,
        });
      }
      setIsFormOpen(false);
      fetchItems();
    } catch (error) {
      console.error('保存请假记录失败:', error);
      throw error;
    }
  }, [selectedRecord, createItem, updateItem, fetchItems]);

  // ========== 审批通过 ==========
  const handleApprove = useCallback(async (record: LeaveRecord) => {
    try {
      const store = useLeaveStore.getState();
      await store.approveLeave(record.id, record.approver);
      setIsDetailOpen(false);
      fetchItems();
    } catch (error) {
      console.error('审批通过失败:', error);
      throw error;
    }
  }, [fetchItems]);

  // ========== 驳回 ==========
  const handleReject = useCallback(async (record: LeaveRecord) => {
    try {
      const store = useLeaveStore.getState();
      await store.rejectLeave(record.id, '审批驳回');
      setIsDetailOpen(false);
      fetchItems();
    } catch (error) {
      console.error('审批驳回失败:', error);
      throw error;
    }
  }, [fetchItems]);

  // ========== 取消申请 ==========
  const handleCancel = useCallback(async (record: LeaveRecord) => {
    try {
      await updateItem(record.id, {
        status: 'cancelled' as StoreLeaveStatus,
      });
      fetchItems();
    } catch (error) {
      console.error('取消申请失败:', error);
      throw error;
    }
  }, [updateItem, fetchItems]);

  return {
    data,
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
