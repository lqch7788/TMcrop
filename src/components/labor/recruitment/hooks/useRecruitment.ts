/**
 * 招聘管理Hook (components版)
 *
 * V2.0架构改造：数据存储迁移到 useRecruitmentManageStore
 * 业务逻辑保留在Hook层
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRecruitmentManageStore, generateRequestCode } from '@/stores';
import { RecruitmentRequest, RecruitmentFormData, RecruitmentFilters, RecruitmentStatus, RecruitmentSource } from '../types';

export function useRecruitment() {
  const store = useRecruitmentManageStore();
  const [filters, setFilters] = useState<RecruitmentFilters>({
    searchTerm: '',
    statusFilter: 'all',
    sourceFilter: 'all',
  });

  // 组件挂载时初始化种子数据
  useEffect(() => {
    store.initSeedData();
  }, []);

  // 筛选后的数据
  const filteredRecruitments = useMemo(() => {
    return store.recruitments.filter((rec) => {
      const matchSearch =
        rec.requestCode.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        rec.position.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        rec.department.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchStatus = filters.statusFilter === 'all' || rec.status === filters.statusFilter;
      const matchSource = filters.sourceFilter === 'all' || rec.source === filters.sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }, [store.recruitments, filters]);

  // 设置搜索关键词
  const setSearchTerm = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  }, []);

  // 设置状态筛选
  const setStatusFilter = useCallback((statusFilter: RecruitmentStatus | 'all') => {
    setFilters(prev => ({ ...prev, statusFilter }));
  }, []);

  // 设置来源筛选
  const setSourceFilter = useCallback((sourceFilter: RecruitmentSource | 'all') => {
    setFilters(prev => ({ ...prev, sourceFilter }));
  }, []);

  // 重置筛选
  const resetFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      statusFilter: 'all',
      sourceFilter: 'all',
    });
  }, []);

  // 创建招聘申请
  const createRecruitment = useCallback((data: RecruitmentFormData, applicantId: string, applicantName: string) => {
    const newRecruitment: RecruitmentRequest = {
      id: Date.now().toString(),
      requestCode: generateRequestCode(),
      ...data,
      status: '待审批',
      applicantId,
      applicantName,
      applyDate: new Date().toISOString().split('T')[0],
      approvalHistory: [
        { step: 1, action: 'submit', actionName: '提交申请', operatorId: applicantId, operatorName: applicantName, operateDate: new Date().toISOString().split('T')[0] },
      ],
    };
    store.addRecruitment(newRecruitment);
    return newRecruitment;
  }, [store]);

  // 更新招聘申请
  const updateRecruitment = useCallback((id: string, data: Partial<RecruitmentFormData>) => {
    store.updateRecruitment(id, data);
  }, [store]);

  // 审批通过
  const approveRecruitment = useCallback((id: string, approverId: string, approverName: string, comment?: string) => {
    const rec = store.recruitments.find(r => r.id === id);
    if (!rec) return;
    const now = new Date().toISOString().split('T')[0];
    store.updateRecruitment(id, {
      status: '招聘中' as RecruitmentStatus,
      approverId,
      approverName,
      approveDate: now,
      approvalHistory: [
        ...(rec.approvalHistory || []),
        { step: (rec.approvalHistory?.length || 1) + 1, action: 'approve' as const, actionName: '审批通过', operatorId: approverId, operatorName: approverName, operateDate: now, comment },
      ],
    });
  }, [store]);

  // 取消招聘
  const cancelRecruitment = useCallback((id: string, operatorId: string, operatorName: string, reason?: string) => {
    const rec = store.recruitments.find(r => r.id === id);
    if (!rec) return;
    const now = new Date().toISOString().split('T')[0];
    store.updateRecruitment(id, {
      status: '已取消' as RecruitmentStatus,
      remarks: reason,
      approvalHistory: [
        ...(rec.approvalHistory || []),
        { step: (rec.approvalHistory?.length || 1) + 1, action: 'cancel' as const, actionName: '取消招聘', operatorId, operatorName, operateDate: now, comment: reason },
      ],
    });
  }, [store]);

  // 完成招聘
  const completeRecruitment = useCallback((id: string, operatorId: string, operatorName: string) => {
    const rec = store.recruitments.find(r => r.id === id);
    if (!rec) return;
    const now = new Date().toISOString().split('T')[0];
    store.updateRecruitment(id, {
      status: '已完成' as RecruitmentStatus,
      approvalHistory: [
        ...(rec.approvalHistory || []),
        { step: (rec.approvalHistory?.length || 1) + 1, action: 'approve' as const, actionName: '招聘完成', operatorId, operatorName, operateDate: now },
      ],
    });
  }, [store]);

  // 删除招聘申请
  const deleteRecruitment = useCallback((id: string) => {
    store.deleteRecruitment(id);
  }, [store]);

  return {
    recruitments: filteredRecruitments,
    allRecruitments: store.recruitments,
    filters,
    setSearchTerm,
    setStatusFilter,
    setSourceFilter,
    resetFilters,
    createRecruitment,
    updateRecruitment,
    approveRecruitment,
    cancelRecruitment,
    completeRecruitment,
    deleteRecruitment,
  };
}

export default useRecruitment;
