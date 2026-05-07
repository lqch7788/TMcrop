/**
 * HR审批中心页面 - 人工管理模块
 * 文件路径：src/pages/hr/HrApproval.tsx
 * 功能：HR审批列表、筛选、审批操作、批量处理
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Eye, Download, Search, RefreshCw, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button, message, Dropdown, Tag } from 'antd';
import type { MenuProps } from 'antd';
import ProTable from '../../components/common/table/ProTable';
import StatusBadge from '../../components/common/badge/StatusBadge';
import ProModal from '../../components/common/modal/ProModal';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';
import HrApprovalDetail from './HrApprovalDetail';

// ============================================================
// 常量定义
// ============================================================

/** 审批类型选项 */
const APPROVAL_TYPE_OPTIONS: { value: ApprovalType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: ApprovalType.LEAVE, label: '请假申请' },
  { value: ApprovalType.OVERTIME, label: '加班申请' },
  { value: ApprovalType.RESIGNATION, label: '离职申请' },
  { value: ApprovalType.RECRUITMENT, label: '招聘申请' },
  { value: ApprovalType.ONBOARDING, label: '入职办理' },
  { value: ApprovalType.ATTENDANCE_REPAIR, label: '考勤补录' },
  { value: ApprovalType.SALARY_ADJUSTMENT, label: '调薪申请' },
  { value: ApprovalType.CONTRACT_RENEWAL, label: '合同续签' },
  { value: ApprovalType.SALARY_BUDGET, label: '工资预算' },
  { value: ApprovalType.TRANSFER, label: '调岗申请' },
];

/** 审批状态选项 */
const APPROVAL_STATUS_OPTIONS: { value: ApprovalStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: ApprovalStatus.DRAFT, label: '草稿' },
  { value: ApprovalStatus.PENDING, label: '待审批' },
  { value: ApprovalStatus.APPROVED, label: '已通过' },
  { value: ApprovalStatus.PARTIALLY_APPROVED, label: '部分通过' },
  { value: ApprovalStatus.REJECTED, label: '已拒绝' },
  { value: ApprovalStatus.CANCELLED, label: '已撤回' },
];

// ============================================================
// 类型定义
// ============================================================

interface HrApprovalFilters {
  keyword: string;
  type: ApprovalType | '';
  status: ApprovalStatus | '';
  startDate: string;
  endDate: string;
}

// ============================================================
// 工具函数
// ============================================================

/** 获取审批类型名称 */
function getApprovalTypeName(type: ApprovalType): string {
  const typeNames: Record<ApprovalType, string> = {
    [ApprovalType.LEAVE]: '请假申请',
    [ApprovalType.OVERTIME]: '加班申请',
    [ApprovalType.RESIGNATION]: '离职申请',
    [ApprovalType.RECRUITMENT]: '招聘申请',
    [ApprovalType.ONBOARDING]: '入职办理',
    [ApprovalType.ATTENDANCE_REPAIR]: '考勤补录',
    [ApprovalType.SALARY_ADJUSTMENT]: '调薪申请',
    [ApprovalType.CONTRACT_RENEWAL]: '合同续签',
    [ApprovalType.SALARY_BUDGET]: '工资预算',
    [ApprovalType.TRANSFER]: '调岗申请',
    [ApprovalType.MATERIAL_REQUEST]: '领料单',
    [ApprovalType.PURCHASE_REQUEST]: '采购申请',
    [ApprovalType.PRODUCTION_PLAN]: '生产计划',
    [ApprovalType.HARVEST_REQUEST]: '采收申请',
    [ApprovalType.RETURN_MATERIAL]: '退料单',
  };
  return typeNames[type] || type;
}

/** 获取状态对应的图标 */
function getStatusIcon(status: ApprovalStatus) {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case ApprovalStatus.REJECTED:
      return <XCircle className="w-4 h-4 text-red-500" />;
    case ApprovalStatus.PENDING:
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return null;
  }
}

// ============================================================
// 主组件
// ============================================================

export default function HrApproval() {
  const navigate = useNavigate();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<HrApprovalFilters>({
    keyword: '',
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject'>('none');

  /** 详情弹窗 */
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  /** 确认弹窗 */
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    type: 'approve' | 'reject';
    title: string;
    content: string;
    approvalIds: string[];
  }>({
    type: 'approve',
    title: '',
    content: '',
    approvalIds: [],
  });

  /** 审批意见 */
  const [approvalComment, setApprovalComment] = useState('');

  // ============================================================
  // Context
  // ============================================================

  const { approvals, approve, reject, getFilteredApprovals } = useApprovalContext();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 过滤后的HR审批列表 */
  const filteredApprovals = useMemo(() => {
    let result = approvals.filter(a => a.category === 'hr');

    // 关键词搜索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(keyword) ||
        a.applicantName.toLowerCase().includes(keyword) ||
        a.code.toLowerCase().includes(keyword)
      );
    }

    // 类型筛选
    if (filters.type) {
      result = result.filter(a => a.type === filters.type);
    }

    // 状态筛选
    if (filters.status) {
      result = result.filter(a => a.status === filters.status);
    }

    // 日期筛选
    if (filters.startDate) {
      result = result.filter(a => a.applyDate >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(a => a.applyDate <= filters.endDate);
    }

    return result;
  }, [approvals, filters]);

  /** 更新总数 */
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, total: filteredApprovals.length }));
  }, [filteredApprovals]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof HrApprovalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ keyword: '', type: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 搜索 */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 查看详情 */
  const handleViewDetail = (approvalId: string) => {
    setSelectedApprovalId(approvalId);
    setDetailModalOpen(true);
  };

  /** 审批通过 */
  const handleApprove = (approvalId: string) => {
    approve(approvalId, '同意');
    message.success('审批已通过');
  };

  /** 审批拒绝 */
  const handleReject = (approvalId: string) => {
    setConfirmModalConfig({
      type: 'reject',
      title: '确认拒绝',
      content: '确定要拒绝此审批申请吗？',
      approvalIds: [approvalId],
    });
    setApprovalComment('');
    setConfirmModalOpen(true);
  };

  /** 批量审批通过 */
  const handleBatchApprove = () => {
    confirmModalConfig.approvalIds.forEach(id => {
      approve(id, '批量同意');
    });
    message.success(`已通过 ${confirmModalConfig.approvalIds.length} 项审批`);
    setSelectedRowKeys([]);
    setBatchMode('none');
    setConfirmModalOpen(false);
  };

  /** 批量审批拒绝 */
  const handleBatchReject = () => {
    setConfirmModalConfig({
      type: 'reject',
      title: '批量拒绝',
      content: `确定要拒绝选中的 ${selectedRowKeys.length} 项审批申请吗？`,
      approvalIds: selectedRowKeys as string[],
    });
    setApprovalComment('');
    setConfirmModalOpen(true);
  };

  /** 确认弹窗确定 */
  const handleConfirmOk = () => {
    if (confirmModalConfig.type === 'reject') {
      confirmModalConfig.approvalIds.forEach(id => {
        reject(id, approvalComment || '不符合条件');
      });
      message.success(`已拒绝 ${confirmModalConfig.approvalIds.length} 项审批`);
    } else {
      handleBatchApprove();
      return;
    }
    setSelectedRowKeys([]);
    setBatchMode('none');
    setConfirmModalOpen(false);
  };

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns = [
    {
      title: '审批编号',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      render: (code: string) => (
        <span className="text-blue-600 font-mono text-sm">{code}</span>
      ),
    },
    {
      title: '审批类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: ApprovalType) => (
        <Tag color="blue">{getApprovalTypeName(type)}</Tag>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      key: 'applicantName',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'applicantDepartment',
      key: 'applicantDepartment',
      width: 100,
    },
    {
      title: '申请时间',
      dataIndex: 'applyDate',
      key: 'applyDate',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ApprovalStatus) => (
        <div className="flex items-center gap-1">
          {getStatusIcon(status)}
          <StatusBadge status={status} />
        </div>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const colors: Record<string, string> = {
          low: 'gray',
          normal: 'default',
          high: 'orange',
          urgent: 'red',
        };
        const labels: Record<string, string> = {
          low: '低',
          normal: '普通',
          high: '高',
          urgent: '紧急',
        };
        return <Tag color={colors[priority] || 'default'}>{labels[priority] || priority}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Approval) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(record.id)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === ApprovalStatus.PENDING && (
            <>
              <button
                onClick={() => handleApprove(record.id)}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="批准"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(record.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="拒绝"
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
    <div className="p-6 space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">人事审批中心</h1>
            <p className="text-xs text-gray-500">管理所有人相关审批申请</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {/* 关键词搜索 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索审批单标题、申请人、单号..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 审批类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">审批类型</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {APPROVAL_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 审批状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">审批状态</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {APPROVAL_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 日期筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>

          {/* 重置按钮 */}
          <button
            onClick={handleResetFilters}
            className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
        </div>

        {/* 操作按钮栏 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          {batchMode === 'none' && (
            <>
              <button
                onClick={() => setBatchMode('approve')}
                disabled={selectedRowKeys.length === 0}
                className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                批量通过
              </button>
              <button
                onClick={() => setBatchMode('reject')}
                disabled={selectedRowKeys.length === 0}
                className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                批量拒绝
              </button>
            </>
          )}

          {batchMode !== 'none' && (
            <>
              {batchMode === 'approve' && (
                <button
                  onClick={handleBatchApprove}
                  className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  确认通过 ({selectedRowKeys.length})
                </button>
              )}
              {batchMode === 'reject' && (
                <button
                  onClick={handleBatchReject}
                  className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认拒绝 ({selectedRowKeys.length})
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

          <span className="text-sm text-gray-500 ml-auto">
            共 {pagination.total} 条记录
            {selectedRowKeys.length > 0 && `，已选中 ${selectedRowKeys.length} 项`}
          </span>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <ProTable
          columns={columns}
          dataSource={filteredApprovals}
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
          rowKey="id"
        />
      </div>

      {/* 详情弹窗 */}
      <ProModal
        title="审批单详情"
        type="info"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={900}
        footer={null}
      >
        {selectedApprovalId && (
          <HrApprovalDetail
            approvalId={selectedApprovalId}
            isModal
            onClose={() => setDetailModalOpen(false)}
          />
        )}
      </ProModal>

      {/* 确认弹窗 */}
      <ProModal
        title={confirmModalConfig.title}
        type={confirmModalConfig.type === 'reject' ? 'error' : 'primary'}
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        onOk={handleConfirmOk}
        width={400}
        loading={false}
      >
        <div className="space-y-4">
          <p>{confirmModalConfig.content}</p>
          {confirmModalConfig.type === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">审批意见</label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="请输入审批意见（选填）"
              />
            </div>
          )}
        </div>
      </ProModal>
    </div>
  );
}
