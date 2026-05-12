/**
 * 入职办理页面 Hook
 * 使用 API 数据架构：API → enhancedApiClient → React Query → 组件
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useOnboardingRecords,
  useCreateOnboarding,
  useUpdateOnboarding,
  useDeleteOnboarding,
  useUpdateOnboardingStatus,
} from '../../../../hooks/useOnboardingQueries';
import type { OnboardingRecord, CreateOnboardingParams, UpdateOnboardingParams } from '../../../../services/apiOnboardingService';

// 类型适配：后端API返回的记录格式转换为页面使用的格式
function adaptApiRecord(apiRecord: any): OnboardingRecord {
  // 解析进度（如果需要）
  let progress = apiRecord.progress;
  if (typeof progress === 'string') {
    try {
      progress = JSON.parse(progress);
    } catch {
      progress = [];
    }
  }

  return {
    id: apiRecord.id,
    oid: apiRecord.oid || '',
    name: apiRecord.name,
    idCard: apiRecord.idCard || apiRecord.id_card || '',
    phone: apiRecord.phone || '',
    position: apiRecord.position || '',
    department: apiRecord.department || '',
    departmentOid: apiRecord.departmentOid || apiRecord.department_oid || '',
    contractType: apiRecord.contractType || apiRecord.contract_type || '',
    dailyWage: apiRecord.dailyWage || apiRecord.daily_wage,
    hourlyWage: apiRecord.hourlyWage || apiRecord.hourly_wage,
    joinDate: apiRecord.joinDate || apiRecord.join_date || '',
    status: apiRecord.status === 'pending' ? '待入职' :
            apiRecord.status === 'processing' ? '办理中' :
            apiRecord.status === 'onboarded' ? '已入职' : '待入职',
    progress: progress || [],
    requestCode: apiRecord.requestCode || apiRecord.request_code || '',
    recruitmentId: apiRecord.recruitmentId || apiRecord.recruitment_id || '',
    operatorId: apiRecord.operatorId || apiRecord.operator_id || '',
    operatorName: apiRecord.operatorName || apiRecord.operator_name || '',
    approvedAt: apiRecord.approvedAt || apiRecord.approved_at || '',
    remarks: apiRecord.remarks || '',
    createTime: apiRecord.createTime || apiRecord.create_time || '',
    updateTime: apiRecord.updateTime || apiRecord.update_time || '',
  };
}

export interface OnboardingFilters {
  status: string;
  keyword: string;
}

export interface OnboardingPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

export interface OnboardingFormData {
  name: string;
  idCard: string;
  phone: string;
  position: string;
  department: string;
  contractType: string;
  dailyWage?: number;
  hourlyWage?: number;
  joinDate: string;
}

export type OnboardingStatus = '待入职' | '办理中' | '已入职';

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
  isLoading: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  // 筛选条件
  const [filters, setFilters] = useState<OnboardingFilters>({
    status: '',
    keyword: '',
  });

  // 分页状态
  const [pagination, setPaginationState] = useState<OnboardingPagination>({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });

  // 将筛选条件转换为 API 参数
  const apiFilters = useMemo(() => ({
    status: filters.status || undefined,
    keyword: filters.keyword || undefined,
  }), [filters]);

  const apiPagination = useMemo(() => ({
    page: pagination.currentPage,
    limit: pagination.pageSize,
  }), [pagination.currentPage, pagination.pageSize]);

  // 使用 React Query 获取数据
  const { data: apiResponse, isLoading, refetch } = useOnboardingRecords(apiFilters, apiPagination);

  // API mutations
  const createMutation = useCreateOnboarding();
  const updateMutation = useUpdateOnboarding();
  const deleteMutation = useDeleteOnboarding();
  const updateStatusMutation = useUpdateOnboardingStatus();

  // 将 API 数据转换为页面格式
  const records: OnboardingRecord[] = useMemo(() => {
    if (!apiResponse?.records) return [];
    return apiResponse.records.map(adaptApiRecord);
  }, [apiResponse]);

  // 更新分页总数
  useEffect(() => {
    if (apiResponse?.pagination) {
      setPaginationState(prev => ({
        ...prev,
        total: apiResponse.pagination.total,
      }));
    }
  }, [apiResponse?.pagination]);

  // 设置页码
  const setPage = useCallback((page: number) => {
    setPaginationState(prev => ({ ...prev, currentPage: page }));
  }, []);

  // 设置每页数量
  const setPageSize = useCallback((size: number) => {
    setPaginationState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // 创建入职记录
  const createOnboarding = useCallback((formData: OnboardingFormData, operatorId: string, operatorName: string) => {
    const params: CreateOnboardingParams = {
      name: formData.name,
      idCard: formData.idCard,
      phone: formData.phone,
      position: formData.position,
      department: formData.department,
      contractType: formData.contractType,
      dailyWage: formData.dailyWage,
      hourlyWage: formData.hourlyWage,
      joinDate: formData.joinDate,
      operatorId,
      operatorName,
    };
    createMutation.mutate(params, {
      onSuccess: () => {
        refetch();
      },
    });
  }, [createMutation, refetch]);

  // 更新入职记录
  const updateOnboarding = useCallback((id: string, data: Partial<OnboardingFormData>) => {
    const updates: UpdateOnboardingParams = {
      name: data.name,
      idCard: data.idCard,
      phone: data.phone,
      position: data.position,
      department: data.department,
      contractType: data.contractType,
      dailyWage: data.dailyWage,
      hourlyWage: data.hourlyWage,
      joinDate: data.joinDate,
    };
    updateMutation.mutate({ id, updates }, {
      onSuccess: () => {
        refetch();
      },
    });
  }, [updateMutation, refetch]);

  // 更新入职状态
  const updateStatus = useCallback((id: string, status: OnboardingStatus, operatorId: string, operatorName: string) => {
    const statusMap: Record<OnboardingStatus, string> = {
      '待入职': 'pending',
      '办理中': 'processing',
      '已入职': 'onboarded',
    };
    updateStatusMutation.mutate({
      id,
      params: {
        status: statusMap[status],
        operatorId,
        operatorName,
      },
    }, {
      onSuccess: () => {
        refetch();
      },
    });
  }, [updateStatusMutation, refetch]);

  // 删除入职记录
  const deleteOnboarding = useCallback((id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        refetch();
      },
    });
  }, [deleteMutation, refetch]);

  // 根据ID获取记录
  const getOnboardingById = useCallback((id: string): OnboardingRecord | undefined => {
    return records.find(r => r.id === id);
  }, [records]);

  // 过滤后的数据（用于前端筛选，这里因为API已经做了筛选，所以直接返回）
  const filteredData = records;

  return {
    data: records,
    filters,
    pagination: pagination,
    setFilters,
    setPage,
    setPageSize,
    createOnboarding,
    updateOnboarding,
    updateStatus,
    deleteOnboarding,
    getOnboardingById,
    filteredData,
    isLoading,
  };
}
