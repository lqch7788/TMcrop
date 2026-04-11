import { useState, useMemo } from 'react';
import type { SalaryRecord, SalaryFilters, SalaryPagination, SalaryCalculateData } from '../types';

// Mock数据 - 8条工资记录
const mockSalaryData: SalaryRecord[] = [
  // 2024-01月
  {
    id: 'SAL001',
    staffId: 'W001',
    staffName: '张明',
    month: '2024-01',
    calcType: '月薪制',
    baseSalary: 5000,
    overtimePay: 800,
    bonuses: 500,
    deductions: 0,
    lateDeductions: 0,
    absenceDeductions: 0,
    socialSecurity: 450,
    housingFund: 300,
    personalTax: 285,
    netSalary: 5265,
    status: '已发放',
  },
  {
    id: 'SAL002',
    staffId: 'W002',
    staffName: '李华',
    month: '2024-01',
    calcType: '日薪制',
    baseSalary: 0,
    overtimePay: 0,
    bonuses: 0,
    deductions: 200,
    lateDeductions: 50,
    absenceDeductions: 150,
    socialSecurity: 0,
    housingFund: 0,
    personalTax: 0,
    netSalary: 2600,
    status: '已发放',
  },
  // 2024-02月
  {
    id: 'SAL003',
    staffId: 'W001',
    staffName: '张明',
    month: '2024-02',
    calcType: '月薪制',
    baseSalary: 5000,
    overtimePay: 1200,
    bonuses: 800,
    deductions: 0,
    lateDeductions: 0,
    absenceDeductions: 0,
    socialSecurity: 450,
    housingFund: 300,
    personalTax: 375,
    netSalary: 5875,
    status: '已确认',
  },
  {
    id: 'SAL004',
    staffId: 'W003',
    staffName: '王芳',
    month: '2024-02',
    calcType: '时薪制',
    baseSalary: 0,
    overtimePay: 0,
    bonuses: 0,
    deductions: 100,
    lateDeductions: 100,
    absenceDeductions: 0,
    socialSecurity: 0,
    housingFund: 0,
    personalTax: 0,
    netSalary: 1800,
    status: '待确认',
  },
  // 2024-03月
  {
    id: 'SAL005',
    staffId: 'W001',
    staffName: '张明',
    month: '2024-03',
    calcType: '月薪制',
    baseSalary: 5000,
    overtimePay: 600,
    bonuses: 300,
    deductions: 0,
    lateDeductions: 100,
    absenceDeductions: 0,
    socialSecurity: 450,
    housingFund: 300,
    personalTax: 225,
    netSalary: 4825,
    status: '已发放',
  },
  {
    id: 'SAL006',
    staffId: 'W004',
    staffName: '赵强',
    month: '2024-03',
    calcType: '日薪制',
    baseSalary: 0,
    overtimePay: 0,
    bonuses: 200,
    deductions: 300,
    lateDeductions: 0,
    absenceDeductions: 300,
    socialSecurity: 0,
    housingFund: 0,
    personalTax: 0,
    netSalary: 2600,
    status: '已确认',
  },
  // 2024-04月
  {
    id: 'SAL007',
    staffId: 'W002',
    staffName: '李华',
    month: '2024-04',
    calcType: '日薪制',
    baseSalary: 0,
    overtimePay: 0,
    bonuses: 0,
    deductions: 150,
    lateDeductions: 150,
    absenceDeductions: 0,
    socialSecurity: 0,
    housingFund: 0,
    personalTax: 0,
    netSalary: 2700,
    status: '待确认',
  },
  {
    id: 'SAL008',
    staffId: 'W005',
    staffName: '陈静',
    month: '2024-04',
    calcType: '月薪制',
    baseSalary: 4500,
    overtimePay: 400,
    bonuses: 600,
    deductions: 0,
    lateDeductions: 0,
    absenceDeductions: 0,
    socialSecurity: 405,
    housingFund: 270,
    personalTax: 188,
    netSalary: 4637,
    status: '待确认',
  },
];

/**
 * 工资数据管理Hook
 */
export function useSalary() {
  const [filters, setFilters] = useState<SalaryFilters>({});
  const [pagination, setPagination] = useState<SalaryPagination>({
    currentPage: 1,
    pageSize: 10,
    total: mockSalaryData.length,
  });

  // 根据筛选条件过滤数据
  const filteredData = useMemo(() => {
    return mockSalaryData.filter((record) => {
      // 月份筛选
      if (filters.month && record.month !== filters.month) {
        return false;
      }
      // 姓名筛选
      if (filters.staffName && !record.staffName.includes(filters.staffName)) {
        return false;
      }
      // 计算类型筛选
      if (filters.calcType && record.calcType !== filters.calcType) {
        return false;
      }
      // 状态筛选
      if (filters.status && record.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [filters]);

  // 分页后的数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pagination]);

  // 更新筛选条件
  const updateFilters = (newFilters: Partial<SalaryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, currentPage: 1 })); // 重置页码
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

  // 计算工资 (针对临时工)
  const calculateSalary = (record: SalaryRecord, data: SalaryCalculateData): number => {
    let total = 0;

    if (record.calcType === '日薪制' && data.daysWorked && data.dailyRate) {
      total = data.daysWorked * data.dailyRate;
    } else if (record.calcType === '时薪制' && data.hoursWorked && data.hourlyRate) {
      total = data.hoursWorked * data.hourlyRate;
    }

    // 加上加班费、奖金
    total += record.overtimePay + record.bonuses;

    // 减去扣款
    total -= record.deductions + record.lateDeductions + record.absenceDeductions;

    // 减去社保、公积金、个税
    total -= record.socialSecurity + record.housingFund + record.personalTax;

    return Math.max(0, total);
  };

  // 更新记录状态
  const updateRecordStatus = (recordId: string, status: SalaryRecord['status']) => {
    const record = mockSalaryData.find((r) => r.id === recordId);
    if (record) {
      record.status = status;
    }
  };

  // 添加工资记录
  const addSalaryRecord = (data: Omit<SalaryRecord, 'id'>) => {
    const newId = `SAL${String(mockSalaryData.length + 1).padStart(3, '0')}`;
    const newRecord: SalaryRecord = {
      ...data,
      id: newId,
    };
    mockSalaryData.unshift(newRecord);
    setPagination((prev) => ({ ...prev, total: mockSalaryData.length }));
  };

  return {
    data: paginatedData,
    total: filteredData.length,
    pagination,
    filters,
    updateFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange,
    calculateSalary,
    updateRecordStatus,
    addSalaryRecord,
  };
}
