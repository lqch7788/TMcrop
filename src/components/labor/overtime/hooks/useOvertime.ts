/**
 * 加班管理数据管理 Hook (V2.0 架构改造)
 *
 * 数据流：useOvertimeStore → Hook → 组件
 * 移除硬编码mock数据，改用 Zustand Store
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useOvertimeStore } from '@/stores/overtimeStore';
import type {
  OvertimeRecord as StoreOvertimeRecord,
  OvertimeType as StoreOvertimeType,
  OvertimeStatus as StoreOvertimeStatus,
} from '@/stores/overtimeStore';
import type {
  OvertimeRecord,
  OvertimeFilters,
  OvertimePaginationInfo,
  OvertimeFormData,
  UseOvertimeReturn,
  OvertimeType,
} from '../types';

// ==================== 常量 ====================

/** 加班费倍数 */
const OVERTIME_MULTIPLIERS: Record<string, number> = {
  workday: 1.5,
  weekend: 2,
  holiday: 3,
  工作日加班: 1.5,
  周末加班: 2,
  节假日加班: 3,
};

/** 英文枚举 → 中文标签 */
const OVERTIME_TYPE_EN_TO_CN: Record<string, string> = {
  workday: '工作日加班',
  weekend: '周末加班',
  holiday: '节假日加班',
};

const OVERTIME_STATUS_EN_TO_CN: Record<string, string> = {
  pending: '待审批',
  approved: '已审批',
  rejected: '已驳回',
  cancelled: '已取消',
};

/** 中文标签 → 英文枚举 */
const OVERTIME_TYPE_CN_TO_EN: Record<string, string> = {};
for (const [en, cn] of Object.entries(OVERTIME_TYPE_EN_TO_CN)) {
  OVERTIME_TYPE_CN_TO_EN[cn] = en;
}

// ==================== 工具函数 ====================

/**
 * 计算加班费
 * @param hours 加班小时数
 * @param type 加班类型（英文枚举）
 * @param hourlyRate 时薪（默认50元/小时）
 */
function calculateOvertimePay(hours: number, type: string, hourlyRate: number = 50): number {
  const multiplier = OVERTIME_MULTIPLIERS[type] || 1.5;
  return hours * hourlyRate * multiplier;
}

/**
 * Store 格式 → 组件内部格式
 */
function mapStoreToComponent(record: StoreOvertimeRecord): OvertimeRecord {
  return {
    id: record.id,
    staffId: record.workerId,
    staffName: record.workerName,
    date: record.workDate,
    hours: record.hours,
    type: OVERTIME_TYPE_EN_TO_CN[record.overtimeType] || record.overtimeType,
    reason: record.reason,
    status: OVERTIME_STATUS_EN_TO_CN[record.status] || record.status,
    approver: undefined, // Store中approver字段通过approvedAt判断
    approveTime: record.approvedAt,
    remarks: record.remarks,
    hourlyRate: record.hourlyRate,
    totalPay: record.overtimePay,
  };
}

// ==================== Hook 实现 ====================

/**
 * 加班管理数据管理 Hook
 */
export function useOvertime(): UseOvertimeReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const storeRecords = useOvertimeStore((s) => s.overtimeRecords);
  const fetchItems = useOvertimeStore((s) => s.fetchItems);
  const createItem = useOvertimeStore((s) => s.createItem);
  const updateItem = useOvertimeStore((s) => s.updateItem);
  const approveOvertime = useOvertimeStore((s) => s.approveOvertime);
  const rejectOvertime = useOvertimeStore((s) => s.rejectOvertime);
  const cancelOvertime = useOvertimeStore((s) => s.cancelOvertime);

  // ========== 挂载时加载数据 ==========
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ========== 筛选条件 ==========
  const [filters, setFilters] = useState<OvertimeFilters>({
    staffName: '',
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // ========== 分页状态 ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ========== 选中记录 ==========
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);

  // ========== 弹窗状态 ==========
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // ========== Store数据 → 组件格式 ==========
  const data: OvertimeRecord[] = useMemo(() => {
    return storeRecords.map(mapStoreToComponent);
  }, [storeRecords]);

  // ========== 分页信息 ==========
  const pagination: OvertimePaginationInfo = useMemo(() => ({
    currentPage,
    pageSize,
    total: data.length,
  }), [currentPage, pageSize, data.length]);

  // ========== 设置筛选条件 ==========
  const handleSetFilters = useCallback((newFilters: OvertimeFilters) => {
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
  const handleSave = useCallback(async (formData: OvertimeFormData) => {
    const hourlyRate = 50; // 临时默认值，后续可从员工配置获取

    if (selectedRecord) {
      // 编辑现有记录
      const updates: Partial<StoreOvertimeRecord> = {
        workDate: formData.date,
        hours: formData.hours,
        overtimeType: (OVERTIME_TYPE_CN_TO_EN[formData.type] || 'workday') as StoreOvertimeType,
        reason: formData.reason,
        hourlyRate,
        overtimePay: calculateOvertimePay(formData.hours, OVERTIME_TYPE_CN_TO_EN[formData.type] || formData.type, hourlyRate),
      };
      await updateItem(selectedRecord.id, updates);
    } else {
      // 创建新记录 — 调用 Store 的 createItem
      await createItem({
        workerId: formData.staffId,
        workerName: formData.staffName,
        overtimeType: (OVERTIME_TYPE_CN_TO_EN[formData.type] || 'workday') as StoreOvertimeType,
        workDate: formData.date,
        startTime: '',
        endTime: '',
        hours: formData.hours,
        hourlyRate,
        overtimePay: calculateOvertimePay(formData.hours, OVERTIME_TYPE_CN_TO_EN[formData.type] || formData.type, hourlyRate),
        reason: formData.reason,
        status: 'pending' as StoreOvertimeStatus,
      });
    }
    setIsFormOpen(false);
    fetchItems();
  }, [selectedRecord, createItem, updateItem, fetchItems]);

  // ========== 审批通过 ==========
  const handleApprove = useCallback(async (record: OvertimeRecord) => {
    await approveOvertime(record.id);
    setIsDetailOpen(false);
    fetchItems();
  }, [approveOvertime, fetchItems]);

  // ========== 驳回 ==========
  const handleReject = useCallback(async (record: OvertimeRecord) => {
    await rejectOvertime(record.id, '审批驳回');
    setIsDetailOpen(false);
    fetchItems();
  }, [rejectOvertime, fetchItems]);

  // ========== 取消申请 ==========
  const handleCancel = useCallback(async (record: OvertimeRecord) => {
    await cancelOvertime(record.id);
    fetchItems();
  }, [cancelOvertime, fetchItems]);

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
