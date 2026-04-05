import { useState, useCallback, useMemo } from 'react';
import type { OnboardingRecord, OnboardingFormData, OnboardingFilters, OnboardingPagination, OnboardingStatus } from '../types';

// 模拟数据
const mockOnboardingList: OnboardingRecord[] = [
  {
    id: 'ob001',
    recruitmentId: 'zp001',
    requestCode: 'ZP-20260315-001',
    name: '李四',
    idCard: '110101199001011234',
    phone: '13800138001',
    position: '农艺师',
    department: '种植部',
    contractType: '劳动合同',
    joinDate: '2026-03-20',
    status: '待入职',
    createdAt: '2026-03-15',
    updatedAt: '2026-03-15',
    operatorId: 'u001',
    operatorName: '张明',
  },
  {
    id: 'ob002',
    recruitmentId: 'zp002',
    requestCode: 'ZP-20260316-001',
    name: '王五',
    idCard: '110101199002021234',
    phone: '13800138002',
    position: '临时工',
    department: '收割组',
    contractType: '劳务合同',
    dailyWage: 200,
    joinDate: '2026-03-22',
    status: '办理中',
    createdAt: '2026-03-16',
    updatedAt: '2026-03-18',
    operatorId: 'u001',
    operatorName: '张明',
    progress: [
      { step: 1, name: '资料提交', status: 'completed', completedAt: '2026-03-16' },
      { step: 2, name: '合同签订', status: 'processing' },
      { step: 3, name: '入职培训', status: 'pending' },
      { step: 4, name: '档案创建', status: 'pending' },
    ],
  },
  {
    id: 'ob003',
    recruitmentId: 'zp003',
    requestCode: 'ZP-20260310-001',
    name: '赵六',
    idCard: '110101199003031234',
    phone: '13800138003',
    position: '实习生',
    department: '技术部',
    contractType: '实习协议',
    joinDate: '2026-03-12',
    status: '已入职',
    createdAt: '2026-03-10',
    updatedAt: '2026-03-12',
    operatorId: 'u001',
    operatorName: '张明',
    progress: [
      { step: 1, name: '资料提交', status: 'completed', completedAt: '2026-03-10' },
      { step: 2, name: '合同签订', status: 'completed', completedAt: '2026-03-11' },
      { step: 3, name: '入职培训', status: 'completed', completedAt: '2026-03-12' },
      { step: 4, name: '档案创建', status: 'completed', completedAt: '2026-03-12' },
    ],
  },
];

export interface UseOnboardingReturn {
  data: OnboardingRecord[];
  filters: OnboardingFilters;
  pagination: OnboardingPagination;
  setFilters: (filters: OnboardingFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  createOnboarding: (data: OnboardingFormData, operatorId: string, operatorName: string) => void;
  updateOnboarding: (id: string, data: Partial<OnboardingFormData>) => void;
  updateStatus: (id: string, status: OnboardingStatus, operatorId: string, operatorName: string) => void;
  deleteOnboarding: (id: string) => void;
  getOnboardingById: (id: string) => OnboardingRecord | undefined;
  filteredData: OnboardingRecord[];
}

export function useOnboarding(): UseOnboardingReturn {
  const [filters, setFilters] = useState<OnboardingFilters>({
    status: '',
    keyword: '',
  });

  const [pagination, setPagination] = useState<OnboardingPagination>({
    currentPage: 1,
    pageSize: 10,
    total: mockOnboardingList.length,
  });

  const [onboardingList, setOnboardingList] = useState<OnboardingRecord[]>(mockOnboardingList);

  // 根据筛选条件过滤数据
  const filteredData = useMemo(() => {
    return onboardingList.filter((item) => {
      // 状态筛选
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      // 关键词搜索
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        return (
          item.name.toLowerCase().includes(keyword) ||
          item.idCard.includes(keyword) ||
          item.phone.includes(keyword) ||
          (item.requestCode && item.requestCode.toLowerCase().includes(keyword))
        );
      }
      return true;
    });
  }, [onboardingList, filters]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pagination]);

  // 设置页码
  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }, []);

  // 设置每页数量
  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // 创建入职记录
  const createOnboarding = useCallback(
    (formData: OnboardingFormData, operatorId: string, operatorName: string) => {
      const newRecord: OnboardingRecord = {
        id: `ob${Date.now()}`,
        name: formData.name,
        idCard: formData.idCard,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        contractType: formData.contractType,
        dailyWage: formData.dailyWage,
        hourlyWage: formData.hourlyWage,
        joinDate: formData.joinDate,
        status: '待入职',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        operatorId,
        operatorName,
        progress: [
          { step: 1, name: '资料提交', status: 'completed', completedAt: new Date().toISOString().split('T')[0] },
          { step: 2, name: '合同签订', status: 'pending' },
          { step: 3, name: '入职培训', status: 'pending' },
          { step: 4, name: '档案创建', status: 'pending' },
        ],
      };
      setOnboardingList((prev) => [newRecord, ...prev]);
    },
    []
  );

  // 更新入职记录
  const updateOnboarding = useCallback((id: string, data: Partial<OnboardingFormData>) => {
    setOnboardingList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString().split('T')[0] } : item
      )
    );
  }, []);

  // 更新入职状态
  const updateStatus = useCallback(
    (id: string, status: OnboardingStatus, operatorId: string, operatorName: string) => {
      setOnboardingList((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const updatedItem = {
            ...item,
            status,
            updatedAt: new Date().toISOString().split('T')[0],
            operatorId,
            operatorName,
          };

          // 如果是已入职状态，更新所有进度为完成
          if (status === '已入职') {
            updatedItem.progress = item.progress?.map((p) =>
              p.status !== 'completed' ? { ...p, status: 'completed' as const, completedAt: new Date().toISOString().split('T')[0] } : p
            );
          }

          return updatedItem;
        })
      );
    },
    []
  );

  // 删除入职记录
  const deleteOnboarding = useCallback((id: string) => {
    setOnboardingList((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 根据ID获取记录
  const getOnboardingById = useCallback(
    (id: string) => {
      return onboardingList.find((item) => item.id === id);
    },
    [onboardingList]
  );

  return {
    data: paginatedData,
    filters,
    pagination: { ...pagination, total: filteredData.length },
    setFilters,
    setPage,
    setPageSize,
    createOnboarding,
    updateOnboarding,
    updateStatus,
    deleteOnboarding,
    getOnboardingById,
    filteredData,
  };
}
