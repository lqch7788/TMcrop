/**
 * 入职办理页面 - 人工管理模块
 * 使用通用组件实现完整功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { UserPlus, Plus, Search, Download, Check, X, Eye, RefreshCw } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { workers } from '../../data/mockData';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';

// ============================================================
// 常量定义
// ============================================================

/** 在职状态选项 */
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '试用期', label: '试用期' },
  { value: '正式', label: '正式' },
];

/** 状态筛选选项 */
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
];

// ============================================================
// 类型定义
// ============================================================

interface OnboardingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  expectedStartDate: string;
  actualStartDate?: string;
  status: '待入职' | '入职中' | '已完成' | '已取消';
  education?: string;
  major?: string;
  contactPhone?: string;
  emergencyContact?: string;
  idCard?: string;
  bankCard?: string;
  remarks?: string;
}

interface OnboardingFilters {
  employeeName: string;
  department: string;
  status: string;
  startDate: string;
}

// ============================================================
// 主组件
// ============================================================

export default function OnboardingPage() {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<OnboardingFilters>({
    employeeName: '',
    department: '',
    status: '',
    startDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    employeeName: '',
    department: '',
    position: '',
    expectedStartDate: '',
    education: '',
    major: '',
    contactPhone: '',
    emergencyContact: '',
    idCard: '',
    bankCard: '',
    remarks: '',
  });

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // Context
  // ============================================================

  const { addApproval, approve, reject, approvals } = useApprovalContext();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 模拟入职办理记录数据 */
  const [records, setRecords] = useState<OnboardingRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选入职类型的审批记录
    const onboardApprovals = approvals.filter(a => a.type === ApprovalType.ONBOARD);

    // 转换为OnboardingRecord格式
    const onboardRecords: OnboardingRecord[] = onboardApprovals.map(approval => {
      const businessData = approval.businessLink as { employeeId?: string; employeeName?: string; department?: string; position?: string; expectedStartDate?: string; actualStartDate?: string; education?: string; major?: string; contactPhone?: string; emergencyContact?: string; idCard?: string; bankCard?: string } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        position: businessData?.position || '',
        expectedStartDate: businessData?.expectedStartDate || approval.applyDate,
        actualStartDate: businessData?.actualStartDate,
        status: mapApprovalStatus(approval.status),
        education: businessData?.education,
        major: businessData?.major,
        contactPhone: businessData?.contactPhone,
        emergencyContact: businessData?.emergencyContact,
        idCard: businessData?.idCard,
        bankCard: businessData?.bankCard,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据（员工ID格式：EMP-YYYYMMDD-XXX）
    const mockRecords: OnboardingRecord[] = [
      { id: 'OB001', employeeId: 'EMP-20260501-001', employeeName: '赵敏', department: '生产部', position: '种植工', expectedStartDate: '2026-05-01', status: '待入职', education: '高中', major: '', contactPhone: '13800001111', emergencyContact: '赵刚', remarks: '' },
      { id: 'OB002', employeeId: 'EMP-20260420-001', employeeName: '孙华', department: '生产部', position: '农机手', expectedStartDate: '2026-04-20', actualStartDate: '2026-04-20', status: '已完成', education: '中专', major: '农业机械', contactPhone: '13800002222', emergencyContact: '孙强', remarks: '已完成入职培训' },
      { id: 'OB003', employeeId: 'EMP-20260510-001', employeeName: '周杰', department: '生产部', position: '农技员', expectedStartDate: '2026-05-10', status: '入职中', education: '本科', major: '农学', contactPhone: '13800003333', emergencyContact: '周明', remarks: '资料审核中' },
    ];

    setRecords([...mockRecords, ...onboardRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + onboardRecords.length }));
  }, [approvals]);

  /** 状态映射 */
  const mapApprovalStatus = (status: ApprovalStatus): OnboardingRecord['status'] => {
    switch (status) {
      case ApprovalStatus.PENDING: return '待入职';
      case ApprovalStatus.APPROVED: return '已完成';
      case ApprovalStatus.REJECTED: return '已取消';
      case ApprovalStatus.CANCELLED: return '已取消';
      default: return '待入职';
    }
  };

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.expectedStartDate < filters.startDate) return false;
      return true;
    });
  }, [records, filters]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof OnboardingFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ employeeName: '', department: '', status: '', startDate: '' });
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
      employeeName: '',
      department: '生产部',
      position: '',
      expectedStartDate: '',
      education: '',
      major: '',
      contactPhone: '',
      emergencyContact: '',
      idCard: '',
      bankCard: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: OnboardingRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 提交入职申请 */
  const handleSubmit = () => {
    if (!formData.employeeName || !formData.expectedStartDate) {
      alert('请填写完整信息');
      return;
    }

    // 验证身份证号格式（18位）
    if (formData.idCard && !/^\d{17}[\dXx]$/.test(formData.idCard)) {
      alert('身份证号格式不正确，请输入18位身份证号');
      return;
    }

    // 验证银行卡号格式（16-19位）
    if (formData.bankCard && !/^\d{16,19}$/.test(formData.bankCard)) {
      alert('银行卡号格式不正确，请输入16-19位银行卡号');
      return;
    }

    // 生成员工ID：EMP-YYYYMMDD-XXX（标准格式：前缀-年月日-3位序号）
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const sequence = String(records.length + 1).padStart(3, '0');
    const generatedEmployeeId = `EMP-${dateStr}-${sequence}`;

    // 生成新记录
    const newRecord: OnboardingRecord = {
      id: `OB${Date.now()}`,
      employeeId: generatedEmployeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      expectedStartDate: formData.expectedStartDate,
      status: '待入职',
      education: formData.education,
      major: formData.major,
      contactPhone: formData.contactPhone,
      emergencyContact: formData.emergencyContact,
      idCard: formData.idCard,
      bankCard: formData.bankCard,
      remarks: formData.remarks,
    };

    // 创建审批记录
    const approval: Approval = {
      id: `APR-OB-${Date.now()}`,
      code: `SP-OB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.ONBOARD,
      typeName: '入职申请',
      category: 'hr',
      title: `${formData.employeeName}入职申请`,
      description: formData.remarks || `申请入职${formData.department}`,
      applicantId: newRecord.employeeId,
      applicantName: formData.employeeName,
      applicantDepartment: formData.department,
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: 1,
      approvers: [
        { userId: 'U003', userName: '王建国', role: '部门经理', order: 1, status: 'pending', comment: '' },
      ],
      records: [],
      remark: formData.remarks,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'leave',
        requestId: newRecord.id,
        employeeId: newRecord.employeeId,
        employeeName: newRecord.employeeName,
        department: newRecord.department,
        position: newRecord.position,
        expectedStartDate: newRecord.expectedStartDate,
        education: newRecord.education,
        major: newRecord.major,
        contactPhone: newRecord.contactPhone,
        emergencyContact: newRecord.emergencyContact,
        idCard: formData.idCard,
        bankCard: formData.bankCard,
      },
    };

    // 添加到Context
    addApproval(approval);

    // 更新本地状态
    setRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  };

  /** 审批通过 */
  const handleApprove = (record: OnboardingRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意入职');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已完成' as OnboardingRecord['status'] } : r)
      );
    } else {
      // 如果没有对应审批记录，直接更新状态
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已完成' as OnboardingRecord['status'] } : r)
      );
    }
  };

  /** 审批驳回 */
  const handleReject = (record: OnboardingRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合条件');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已取消' as OnboardingRecord['status'] } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已取消' as OnboardingRecord['status'] } : r)
      );
    }
  };

  /** 批量审批通过 */
  const handleBatchApprove = () => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 批量审批驳回 */
  const handleBatchReject = () => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
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

    const headers = ['员工姓名', '部门', '岗位', '预计入职日期', '实际入职日期', '状态', '联系方式', '紧急联系人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '预计入职日期': row.expectedStartDate,
      '实际入职日期': row.actualStartDate || '',
      '状态': row.status,
      '联系方式': row.contactPhone || '',
      '紧急联系人': row.emergencyContact || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `入职记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 120,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: '岗位',
      dataIndex: 'position',
      key: 'position',
      width: 100,
    },
    {
      title: '预计入职日期',
      dataIndex: 'expectedStartDate',
      key: 'expectedStartDate',
      width: 130,
    },
    {
      title: '实际入职日期',
      dataIndex: 'actualStartDate',
      key: 'actualStartDate',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: OnboardingRecord['status']) => {
        const statusMap: Record<string, { label: string; status: string }> = {
          '待入职': { label: '待入职', status: 'pending' },
          '入职中': { label: '入职中', status: 'in_progress' },
          '已完成': { label: '已完成', status: 'completed' },
          '已取消': { label: '已取消', status: 'cancelled' },
        };
        const config = statusMap[value] || { label: value, status: 'pending' };
        return <LaborStatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: OnboardingRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenDetailModal(record)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === '待入职' && (
            <>
              <button
                onClick={() => handleApprove(record)}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="批准入职"
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
  // 部门选项
  // ============================================================

  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, []);

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">入职办理</h1>
            <p className="text-xs text-gray-500">员工入职申请与管理</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* 员工姓名搜索 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索员工姓名"
              value={filters.employeeName}
              onChange={(e) => handleFilterChange('employeeName', e.target.value)}
              className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 部门筛选 */}
          <select
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {departmentOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
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

          {/* 日期筛选 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="入职日期"
            />
          </div>

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
            新增入职
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
        title="新建入职申请"
        size="lg"
        showFooter={false}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* 员工姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              员工姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.employeeName}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入员工姓名"
            />
          </div>

          {/* 部门 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部门 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择部门</option>
              {departmentOptions.filter(d => d.value).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 岗位 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              岗位 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入岗位"
            />
          </div>

          {/* 预计入职日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预计入职日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expectedStartDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedStartDate: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 学历 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学历</label>
            <select
              value={formData.education}
              onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择学历</option>
              <option value="初中">初中</option>
              <option value="中专">中专</option>
              <option value="高中">高中</option>
              <option value="大专">大专</option>
              <option value="本科">本科</option>
              <option value="硕士">硕士</option>
              <option value="博士">博士</option>
            </select>
          </div>

          {/* 专业 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">专业</label>
            <input
              type="text"
              value={formData.major}
              onChange={(e) => setFormData(prev => ({ ...prev, major: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入专业"
            />
          </div>

          {/* 联系电话 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
            <input
              type="text"
              value={formData.contactPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入联系电话"
            />
          </div>

          {/* 紧急联系人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">紧急联系人</label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入紧急联系人"
            />
          </div>

          {/* 身份证号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label>
            <input
              type="text"
              value={formData.idCard}
              onChange={(e) => setFormData(prev => ({ ...prev, idCard: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入18位身份证号"
              maxLength={18}
            />
          </div>

          {/* 银行卡号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">银行卡号</label>
            <input
              type="text"
              value={formData.bankCard}
              onChange={(e) => setFormData(prev => ({ ...prev, bankCard: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入16-19位银行卡号"
              maxLength={19}
            />
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入备注信息"
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
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            提交申请
          </button>
        </div>
      </UnifiedModal>

      {/* 详情弹窗 */}
      <UnifiedModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="入职详情"
        size="lg"
        showFooter={false}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</label>
                <div className="text-sm text-gray-900">{selectedRecord.employeeName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">部门</label>
                <div className="text-sm text-gray-900">{selectedRecord.department}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">岗位</label>
                <div className="text-sm text-gray-900">{selectedRecord.position}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">预计入职日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.expectedStartDate}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">实际入职日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.actualStartDate || '未入职'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                <div className="mt-1">
                  <LaborStatusBadge
                    status={
                      selectedRecord.status === '已完成' ? 'completed' :
                      selectedRecord.status === '已取消' ? 'cancelled' :
                      selectedRecord.status === '入职中' ? 'in_progress' : 'pending'
                    }
                    label={selectedRecord.status}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">学历</label>
                <div className="text-sm text-gray-900">{selectedRecord.education || '未填写'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">专业</label>
                <div className="text-sm text-gray-900">{selectedRecord.major || '未填写'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">联系电话</label>
                <div className="text-sm text-gray-900">{selectedRecord.contactPhone || '未填写'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">紧急联系人</label>
                <div className="text-sm text-gray-900">{selectedRecord.emergencyContact || '未填写'}</div>
              </div>
              {selectedRecord.remarks && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
                  <div className="text-sm text-gray-900">{selectedRecord.remarks}</div>
                </div>
              )}
            </div>

            {/* 审批操作 */}
            {selectedRecord.status === '待入职' && (
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
