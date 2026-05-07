/**
 * 招聘申请页面 - 人工管理模块
 * 实现招聘需求的提交与审批功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Users, Plus, Search, Download, Check, X, Eye, RefreshCw } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { useDepartments, usePositions, useUsers } from '../../components/common/settings';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';
import { useApprovalLevel } from '../../hooks/useApprovalLevel';

// ============================================================
// 常量定义
// ============================================================

/** 用工类型选项 */
const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '正式工', label: '正式工' },
  { value: '临时工', label: '临时工' },
  { value: '季节工', label: '季节工' },
  { value: '实习生', label: '实习生' },
];

/** 优先级选项 */
const PRIORITY_OPTIONS = [
  { value: '紧急', label: '紧急', color: 'red' },
  { value: '高', label: '高', color: 'orange' },
  { value: '普通', label: '普通', color: 'blue' },
  { value: '低', label: '低', color: 'gray' },
];

/** 状态筛选选项 */
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已撤回', label: '已撤回' },
];

// ============================================================
// 类型定义
// ============================================================

/** 招聘记录状态 */
type RecruitmentStatus = '待审批' | '已通过' | '已拒绝' | '已撤回';

/** 招聘记录 */
interface RecruitmentRecord {
  id: string;
  recruitmentCode: string;
  deptId: string;
  deptName: string;
  positionId: string;
  position: string;
  headcount: number;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  priority: string;
  status: RecruitmentStatus;
  reason: string;
  remarks?: string;
  applicantId: string;
  applicantName: string;
  applyDate: string;
}

/** 筛选条件 */
interface RecruitmentFilters {
  recruitmentCode: string;
  deptId: string;
  position: string;
  status: RecruitmentStatus | '';
  priority: string;
}

// ============================================================
// 主组件
// ============================================================

export default function RecruitmentPage() {
  const { departments } = useDepartments();
  const { positions } = usePositions();
  const { workers } = useUsers();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<RecruitmentFilters>({
    recruitmentCode: '',
    deptId: '',
    position: '',
    status: '',
    priority: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<RecruitmentRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    deptId: '',
    positionId: '',
    headcount: 1,
    employmentType: '正式工',
    salaryMin: 0,
    salaryMax: 0,
    priority: '普通',
    reason: '',
    remarks: '',
  });

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // Context & Hooks
  // ============================================================

  const { addApproval, approve, reject, getFilteredApprovals, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 招聘记录数据 - 从ApprovalContext获取招聘类型的审批 */
  const [recruitmentRecords, setRecruitmentRecords] = useState<RecruitmentRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选招聘类型的审批记录
    const recruitmentApprovals = approvals.filter(a => a.type === ApprovalType.RECRUITMENT);

    // 转换为RecruitmentRecord格式
    const records: RecruitmentRecord[] = recruitmentApprovals.map(approval => {
      const businessData = approval.businessLink as {
        recruitmentId?: string;
        department?: string;
        position?: string;
        headcount?: number;
        employmentType?: string;
        salaryMin?: number;
        salaryMax?: number;
        priority?: string;
        reason?: string;
      } | null;

      return {
        id: approval.id,
        recruitmentCode: approval.code,
        deptId: businessData?.department || '',
        deptName: approval.applicantDepartment,
        positionId: businessData?.position || '',
        position: businessData?.position || '',
        headcount: businessData?.headcount || 0,
        employmentType: businessData?.employmentType || '正式工',
        salaryMin: businessData?.salaryMin || 0,
        salaryMax: businessData?.salaryMax || 0,
        priority: businessData?.priority || '普通',
        status: mapApprovalStatus(approval.status),
        reason: businessData?.reason || '',
        remarks: approval.remark,
        applicantId: approval.applicantId,
        applicantName: approval.applicantName,
        applyDate: approval.applyDate,
      };
    });

    setRecruitmentRecords(records);
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [approvals]);

  /** 状态映射 - 将ApprovalStatus转换为RecruitmentStatus */
  const mapApprovalStatus = (status: ApprovalStatus): RecruitmentStatus => {
    switch (status) {
      case ApprovalStatus.PENDING: return '待审批';
      case ApprovalStatus.APPROVED: return '已通过';
      case ApprovalStatus.REJECTED: return '已拒绝';
      case ApprovalStatus.CANCELLED: return '已撤回';
      default: return '待审批';
    }
  };

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return recruitmentRecords.filter(record => {
      if (filters.recruitmentCode && !record.recruitmentCode.toLowerCase().includes(filters.recruitmentCode.toLowerCase())) return false;
      if (filters.deptId && record.deptId !== filters.deptId) return false;
      if (filters.position && record.position !== filters.position) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.priority && record.priority !== filters.priority) return false;
      return true;
    });
  }, [recruitmentRecords, filters]);

  /** 根据选择的部门筛选岗位 */
  const availablePositions = useMemo(() => {
    if (!formData.deptId) return positions;
    return positions.filter(p => p.departmentOid === formData.deptId);
  }, [formData.deptId, positions]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof RecruitmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ recruitmentCode: '', deptId: '', position: '', status: '', priority: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 搜索 */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 打开新增弹窗 */
  const handleOpenFormModal = () => {
    setSelectedRecord(null);
    setFormData({
      deptId: '',
      positionId: '',
      headcount: 1,
      employmentType: '正式工',
      salaryMin: 0,
      salaryMax: 0,
      priority: '普通',
      reason: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: RecruitmentRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 部门选择变化 */
  const handleDeptChange = (deptId: string) => {
    setFormData(prev => ({ ...prev, deptId, positionId: '' }));
  };

  /** 招聘人数校验 */
  const handleHeadcountChange = (value: number) => {
    // 正整数校验，最小为1
    if (value < 1) {
      setFormData(prev => ({ ...prev, headcount: 1 }));
    } else {
      setFormData(prev => ({ ...prev, headcount: Math.floor(value) }));
    }
  };

  /** 提交招聘申请 */
  const handleSubmit = () => {
    if (!formData.deptId || !formData.positionId || formData.headcount < 1 || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    if (formData.salaryMin > formData.salaryMax) {
      alert('最低薪资不能大于最高薪资');
      return;
    }

    // 获取部门名称
    const dept = departments.find(d => d.id === formData.deptId);
    const position = positions.find(p => p.id === formData.positionId);

    // 生成新记录
    const newRecord: RecruitmentRecord = {
      id: `REC${Date.now()}`,
      recruitmentCode: `ZP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      deptId: formData.deptId,
      deptName: dept?.name || '',
      positionId: formData.positionId,
      position: position?.name || '',
      headcount: formData.headcount,
      employmentType: formData.employmentType,
      salaryMin: formData.salaryMin,
      salaryMax: formData.salaryMax,
      priority: formData.priority,
      status: '待审批',
      reason: formData.reason,
      remarks: formData.remarks,
      applicantId: 'U001', // TODO: 替换为当前用户ID
      applicantName: '王建华', // TODO: 替换为当前用户名
      applyDate: new Date().toISOString().slice(0, 10),
    };

    // 创建审批记录 - 使用分级审批动态生成审批人配置
    const approvalLevelResult = generateApprovers(ApprovalType.RECRUITMENT, 0);

    const approval: Approval = {
      id: `APR-${Date.now()}`,
      code: newRecord.recruitmentCode,
      type: ApprovalType.RECRUITMENT,
      typeName: '招聘申请',
      category: 'hr',
      title: `${dept?.name || ''}${position?.name || ''}招聘${formData.headcount}人`,
      description: formData.reason,
      applicantId: 'U001', // TODO: 替换为当前用户ID
      applicantName: '王建华', // TODO: 替换为当前用户名
      applicantDepartment: dept?.name || '',
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: formData.priority === '紧急' ? 'urgent' : formData.priority === '高' ? 'high' : formData.priority === '低' ? 'low' : 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: approvalLevelResult.totalSteps,
      approvers: approvalLevelResult.approvers,
      records: [],
      remark: formData.remarks,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'recruitment',
        requestId: newRecord.id,
        recruitmentId: newRecord.id,
        department: newRecord.deptName,
        position: newRecord.position,
        headcount: newRecord.headcount,
        employmentType: newRecord.employmentType,
        salaryMin: newRecord.salaryMin,
        salaryMax: newRecord.salaryMax,
        priority: newRecord.priority as 'low' | 'normal' | 'high' | 'urgent',
        reason: newRecord.reason,
      },
    };

    // 添加到Context
    addApproval(approval);

    // 更新本地状态
    setRecruitmentRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  };

  /** 审批通过 */
  const handleApprove = (record: RecruitmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意招聘');
      setRecruitmentRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as RecruitmentStatus } : r)
      );
    }
  };

  /** 审批驳回 */
  const handleReject = (record: RecruitmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合招聘条件');
      setRecruitmentRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as RecruitmentStatus } : r)
      );
    }
  };

  /** 批量审批通过 */
  const handleBatchApprove = () => {
    selectedRowKeys.forEach(key => {
      const record = recruitmentRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 批量审批驳回 */
  const handleBatchReject = () => {
    selectedRowKeys.forEach(key => {
      const record = recruitmentRecords.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 导出功能 */
  const handleExport = () => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['招聘编号', '申请部门', '招聘岗位', '人数', '用工类型', '薪资范围', '优先级', '状态', '申请原因', '申请日期'];
    const exportData = dataToExport.map(row => ({
      '招聘编号': row.recruitmentCode,
      '申请部门': row.deptName,
      '招聘岗位': row.position,
      '人数': row.headcount,
      '用工类型': row.employmentType,
      '薪资范围': `${row.salaryMin}-${row.salaryMax}`,
      '优先级': row.priority,
      '状态': row.status,
      '申请原因': row.reason,
      '申请日期': row.applyDate,
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `招聘申请_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 获取优先级颜色 */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '紧急': return 'text-red-600 bg-red-50';
      case '高': return 'text-orange-600 bg-orange-50';
      case '普通': return 'text-blue-600 bg-blue-50';
      case '低': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns = [
    {
      title: '招聘编号',
      dataIndex: 'recruitmentCode',
      key: 'recruitmentCode',
      width: 160,
    },
    {
      title: '申请部门',
      dataIndex: 'deptName',
      key: 'deptName',
      width: 100,
    },
    {
      title: '招聘岗位',
      dataIndex: 'position',
      key: 'position',
      width: 100,
    },
    {
      title: '招聘人数',
      dataIndex: 'headcount',
      key: 'headcount',
      width: 80,
      render: (value: number) => `${value}人`,
    },
    {
      title: '用工类型',
      dataIndex: 'employmentType',
      key: 'employmentType',
      width: 100,
    },
    {
      title: '薪资范围',
      dataIndex: 'salaryRange',
      key: 'salaryRange',
      width: 120,
      render: (_: any, record: RecruitmentRecord) => `${record.salaryMin}-${record.salaryMax}`,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: RecruitmentStatus) => {
        const statusMap: Record<RecruitmentStatus, { label: string; status: string }> = {
          '待审批': { label: '待审批', status: 'pending' },
          '已通过': { label: '已通过', status: 'completed' },
          '已拒绝': { label: '已拒绝', status: 'rejected' },
          '已撤回': { label: '已撤回', status: 'cancelled' },
        };
        const config = statusMap[value] || { label: value, status: 'pending' };
        return <LaborStatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: RecruitmentRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenDetailModal(record)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === '待审批' && (
            <>
              <button
                onClick={() => handleApprove(record)}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="批准"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(record)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="驳回"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">招聘申请</h1>
            <p className="text-xs text-gray-500">提交招聘需求，查看招聘进度</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* 招聘编号搜索 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索招聘编号"
              value={filters.recruitmentCode}
              onChange={(e) => handleFilterChange('recruitmentCode', e.target.value)}
              className="h-9 w-44 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 部门筛选 */}
          <select
            value={filters.deptId}
            onChange={(e) => handleFilterChange('deptId', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部部门</option>
            {departments.map(dept => (
              <option key={dept.oid} value={dept.oid}>{dept.name}</option>
            ))}
          </select>

          {/* 岗位筛选 */}
          <select
            value={filters.position}
            onChange={(e) => handleFilterChange('position', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部岗位</option>
            {positions.map(pos => (
              <option key={pos.id} value={pos.name}>{pos.name}</option>
            ))}
          </select>

          {/* 状态筛选 */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* 优先级筛选 */}
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部优先级</option>
            {PRIORITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>

          {/* 重置按钮 */}
          <button
            onClick={handleResetFilters}
            className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
        </div>

        {/* 操作按钮栏 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleOpenFormModal}
            className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            新增招聘
          </button>

          {batchMode === 'none' && (
            <>
              <button
                onClick={() => setBatchMode('approve')}
                className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                批量通过
              </button>
              <button
                onClick={() => setBatchMode('reject')}
                className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                批量驳回
              </button>
              <button
                onClick={() => setBatchMode('export')}
                className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </>
          )}

          {batchMode !== 'none' && (
            <>
              {batchMode === 'approve' && (
                <button
                  onClick={handleBatchApprove}
                  disabled={selectedRowKeys.length === 0}
                  className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  确认通过 ({selectedRowKeys.length})
                </button>
              )}
              {batchMode === 'reject' && (
                <button
                  onClick={handleBatchReject}
                  disabled={selectedRowKeys.length === 0}
                  className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  确认驳回 ({selectedRowKeys.length})
                </button>
              )}
              {batchMode === 'export' && (
                <button
                  onClick={handleExport}
                  className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
                </button>
              )}
              <button
                onClick={() => { setBatchMode('none'); setSelectedRowKeys([]); }}
                className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          )}
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <ProTable
          columns={columns}
          dataSource={filteredData}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, size) => setPagination({ current: page, pageSize: size, total: pagination.total }),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          rowSelection={
            batchMode !== 'none'
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }
              : undefined
          }
        />
      </div>

      {/* 新增/编辑表单弹窗 */}
      <UnifiedModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="新建招聘申请"
        size="lg"
        showFooter={false}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* 部门选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              申请部门 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.deptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择部门</option>
              {departments.map(dept => (
                <option key={dept.oid} value={dept.oid}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* 岗位选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              招聘岗位 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.positionId}
              onChange={(e) => setFormData(prev => ({ ...prev, positionId: e.target.value }))}
              disabled={!formData.deptId}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">请选择岗位</option>
              {availablePositions.map(pos => (
                <option key={pos.id} value={pos.id}>{pos.name}</option>
              ))}
            </select>
          </div>

          {/* 招聘人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              招聘人数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.headcount}
              onChange={(e) => handleHeadcountChange(parseInt(e.target.value) || 1)}
              min={1}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="输入招聘人数"
            />
          </div>

          {/* 用工类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用工类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employmentType}
              onChange={(e) => setFormData(prev => ({ ...prev, employmentType: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 最低薪资 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最低薪资 (元/月)
            </label>
            <input
              type="number"
              value={formData.salaryMin || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: parseInt(e.target.value) || 0 }))}
              min={0}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="输入最低薪资"
            />
          </div>

          {/* 最高薪资 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最高薪资 (元/月)
            </label>
            <input
              type="number"
              value={formData.salaryMax || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: parseInt(e.target.value) || 0 }))}
              min={0}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="输入最高薪资"
            />
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              优先级
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 薪资校验提示 */}
          {formData.salaryMin > 0 && formData.salaryMax > 0 && formData.salaryMin > formData.salaryMax && (
            <div className="col-span-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                最低薪资不能大于最高薪资
              </div>
            </div>
          )}

          {/* 招聘原因 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              招聘原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入招聘原因"
            />
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入备注信息（可选）"
            />
          </div>
        </div>

        {/* 弹窗底部按钮 */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setIsFormModalOpen(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.deptId || !formData.positionId || formData.headcount < 1 || !formData.reason || formData.salaryMin > formData.salaryMax}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交申请
          </button>
        </div>
      </UnifiedModal>

      {/* 详情弹窗 */}
      <UnifiedModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="招聘详情"
        size="lg"
        showFooter={false}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">招聘编号</label>
                <div className="text-sm text-gray-900">{selectedRecord.recruitmentCode}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">申请部门</label>
                <div className="text-sm text-gray-900">{selectedRecord.deptName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">招聘岗位</label>
                <div className="text-sm text-gray-900">{selectedRecord.position}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">招聘人数</label>
                <div className="text-sm text-gray-900">{selectedRecord.headcount} 人</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">用工类型</label>
                <div className="text-sm text-gray-900">{selectedRecord.employmentType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">薪资范围</label>
                <div className="text-sm text-gray-900">{selectedRecord.salaryMin}-{selectedRecord.salaryMax} 元/月</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">优先级</label>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(selectedRecord.priority)}`}>
                    {selectedRecord.priority}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                <div className="mt-1">
                  <LaborStatusBadge
                    status={
                      selectedRecord.status === '已通过' ? 'completed' :
                      selectedRecord.status === '已拒绝' ? 'rejected' :
                      selectedRecord.status === '已撤回' ? 'cancelled' : 'pending'
                    }
                    label={selectedRecord.status}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">申请人</label>
                <div className="text-sm text-gray-900">{selectedRecord.applicantName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">申请日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.applyDate}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">招聘原因</label>
                <div className="text-sm text-gray-900">{selectedRecord.reason || '无'}</div>
              </div>
              {selectedRecord.remarks && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
                  <div className="text-sm text-gray-900">{selectedRecord.remarks}</div>
                </div>
              )}
            </div>

            {/* 审批操作 */}
            {selectedRecord.status === '待审批' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { handleReject(selectedRecord); setIsDetailModalOpen(false); }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  驳回
                </button>
                <button
                  onClick={() => { handleApprove(selectedRecord); setIsDetailModalOpen(false); }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  通过
                </button>
              </div>
            )}
          </div>
        )}
      </UnifiedModal>
    </div>
  );
}
