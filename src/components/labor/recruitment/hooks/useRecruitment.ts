import { useState, useMemo, useCallback } from 'react';
import { RecruitmentRequest, RecruitmentFormData, RecruitmentFilters, RecruitmentStatus } from '../types';

// 生成招聘单号
function generateRequestCode(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ZP-${dateStr}-${random}`;
}

// Mock数据
const mockRecruitments: RecruitmentRequest[] = [
  {
    id: '1',
    requestCode: 'ZP-20260401-001',
    position: '温室技术员',
    department: '生产部',
    quantity: 2,
    reason: '新温室投入使用，需要增加技术人员',
    requirements: '有温室种植经验，熟悉番茄、黄瓜种植技术',
    source: '劳务公司',
    expectedDate: '2026-04-15',
    status: '待审批',
    applicantId: 'u001',
    applicantName: '张明',
    applyDate: '2026-04-01',
  },
  {
    id: '2',
    requestCode: 'ZP-20260328-001',
    position: '采收工人',
    department: '采收部',
    quantity: 5,
    reason: '采收旺季，人手不足',
    requirements: '身体健康，能吃苦耐劳，有采收经验优先',
    source: '个人零工',
    expectedDate: '2026-04-05',
    status: '招聘中',
    applicantId: 'u002',
    applicantName: '李华',
    applyDate: '2026-03-28',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-29',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u002', operatorName: '李华', operateDate: '2026-03-28' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-29', comment: '同意招聘' },
    ],
  },
  {
    id: '3',
    requestCode: 'ZP-20260325-001',
    position: '农技实习生',
    department: '技术部',
    quantity: 3,
    reason: '与农业院校合作，提供实习岗位',
    requirements: '农业相关专业在校学生，吃苦耐劳',
    source: '学生实习',
    expectedDate: '2026-05-01',
    status: '已完成',
    applicantId: 'u003',
    applicantName: '陈静',
    applyDate: '2026-03-25',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-26',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u003', operatorName: '陈静', operateDate: '2026-03-25' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-26' },
    ],
  },
  {
    id: '4',
    requestCode: 'ZP-20260320-001',
    position: '设备维护工程师',
    department: '设备部',
    quantity: 1,
    reason: '现有工程师离职，需补充',
    requirements: '有农机设备维修经验，持电工证优先',
    source: '内部推荐',
    expectedDate: '2026-04-10',
    status: '已完成',
    applicantId: 'u004',
    applicantName: '赵强',
    applyDate: '2026-03-20',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-21',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u004', operatorName: '赵强', operateDate: '2026-03-20' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-21' },
    ],
  },
  {
    id: '5',
    requestCode: 'ZP-20260402-001',
    position: '仓库管理员',
    department: '仓储部',
    quantity: 1,
    reason: '仓库业务扩张，需要专人管理',
    requirements: '有仓库管理经验，熟悉ERP系统',
    source: '劳务公司',
    expectedDate: '2026-04-20',
    status: '待审批',
    applicantId: 'u006',
    applicantName: '钱伟',
    applyDate: '2026-04-02',
  },
  {
    id: '6',
    requestCode: 'ZP-20260315-001',
    position: '包装工人',
    department: '包装部',
    quantity: 4,
    reason: '出口订单增加，需要增加包装人员',
    requirements: '有食品包装经验优先',
    source: '个人零工',
    expectedDate: '2026-03-25',
    status: '已取消',
    applicantId: 'u007',
    applicantName: '孙丽',
    applyDate: '2026-03-15',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-16',
    remarks: '因订单取消，暂停招聘',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u007', operatorName: '孙丽', operateDate: '2026-03-15' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-16' },
      { step: 3, action: 'cancel', actionName: '取消招聘', operatorId: 'u007', operatorName: '孙丽', operateDate: '2026-03-18', comment: '订单取消' },
    ],
  },
  {
    id: '7',
    requestCode: 'ZP-20260310-001',
    position: '质检员',
    department: '质量部',
    quantity: 2,
    reason: '新增质检岗位',
    requirements: '有农产品质检经验，了解GMP规范',
    source: '劳务公司',
    expectedDate: '2026-03-30',
    status: '招聘中',
    applicantId: 'u008',
    applicantName: '周杰',
    applyDate: '2026-03-10',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-11',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u008', operatorName: '周杰', operateDate: '2026-03-10' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-11' },
    ],
  },
  {
    id: '8',
    requestCode: 'ZP-20260403-001',
    position: '安全员',
    department: '安全部',
    quantity: 1,
    reason: '安全制度要求，需配备专职安全员',
    requirements: '有安全管理经验，持安全员证书',
    source: '内部推荐',
    expectedDate: '2026-04-25',
    status: '待审批',
    applicantId: 'u009',
    applicantName: '吴涛',
    applyDate: '2026-04-03',
  },
];

export function useRecruitment() {
  const [recruitments, setRecruitments] = useState<RecruitmentRequest[]>(mockRecruitments);
  const [filters, setFilters] = useState<RecruitmentFilters>({
    searchTerm: '',
    statusFilter: 'all',
    sourceFilter: 'all',
  });

  // 筛选后的数据
  const filteredRecruitments = useMemo(() => {
    return recruitments.filter((rec) => {
      const matchSearch =
        rec.requestCode.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        rec.position.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        rec.department.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchStatus = filters.statusFilter === 'all' || rec.status === filters.statusFilter;
      const matchSource = filters.sourceFilter === 'all' || rec.source === filters.sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }, [recruitments, filters]);

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
    setRecruitments(prev => [newRecruitment, ...prev]);
    return newRecruitment;
  }, []);

  // 更新招聘申请
  const updateRecruitment = useCallback((id: string, data: Partial<RecruitmentFormData>) => {
    setRecruitments(prev => prev.map(rec =>
      rec.id === id ? { ...rec, ...data } : rec
    ));
  }, []);

  // 审批通过
  const approveRecruitment = useCallback((id: string, approverId: string, approverName: string, comment?: string) => {
    setRecruitments(prev => prev.map(rec => {
      if (rec.id !== id) return rec;
      const now = new Date().toISOString().split('T')[0];
      return {
        ...rec,
        status: '招聘中' as RecruitmentStatus,
        approverId,
        approverName,
        approveDate: now,
        approvalHistory: [
          ...(rec.approvalHistory || []),
          { step: (rec.approvalHistory?.length || 1) + 1, action: 'approve', actionName: '审批通过', operatorId: approverId, operatorName: approverName, operateDate: now, comment },
        ],
      };
    }));
  }, []);

  // 取消招聘
  const cancelRecruitment = useCallback((id: string, operatorId: string, operatorName: string, reason?: string) => {
    setRecruitments(prev => prev.map(rec => {
      if (rec.id !== id) return rec;
      const now = new Date().toISOString().split('T')[0];
      return {
        ...rec,
        status: '已取消' as RecruitmentStatus,
        remarks: reason,
        approvalHistory: [
          ...(rec.approvalHistory || []),
          { step: (rec.approvalHistory?.length || 1) + 1, action: 'cancel', actionName: '取消招聘', operatorId, operatorName, operateDate: now, comment: reason },
        ],
      };
    }));
  }, []);

  // 完成招聘
  const completeRecruitment = useCallback((id: string, operatorId: string, operatorName: string) => {
    setRecruitments(prev => prev.map(rec => {
      if (rec.id !== id) return rec;
      const now = new Date().toISOString().split('T')[0];
      return {
        ...rec,
        status: '已完成' as RecruitmentStatus,
        approvalHistory: [
          ...(rec.approvalHistory || []),
          { step: (rec.approvalHistory?.length || 1) + 1, action: 'approve', actionName: '招聘完成', operatorId, operatorName, operateDate: now },
        ],
      };
    }));
  }, []);

  // 删除招聘申请
  const deleteRecruitment = useCallback((id: string) => {
    setRecruitments(prev => prev.filter(rec => rec.id !== id));
  }, []);

  return {
    recruitments: filteredRecruitments,
    allRecruitments: recruitments,
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
