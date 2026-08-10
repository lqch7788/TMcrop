// useMaterialApproval Hook
// 物料审批页面的状态管理和业务逻辑
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Package, ClipboardList, RotateCcw, ShoppingCart,
  Truck, Sprout, FileText, CheckCircle, XCircle, Clock, Eye
} from 'lucide-react';
import { useApproval } from '@/hooks/useApproval';
import { ApprovalStatus, ApprovalType, Approval } from '@/types/approval';
import { showAlert, showConfirm } from '@/lib/dialogService';
import type {
  MaterialApprovalTab,
  TabConfig,
  ApprovalStats,
  DetailModalState,
  RejectModalState,
  UseMaterialApprovalReturn
} from '../types/materialApproval.types';

/**
 * useMaterialApproval Hook
 * 管理物料审批页面的所有状态和业务逻辑
 */
export function useMaterialApproval(): UseMaterialApprovalReturn {
  const { approvals, approve, reject, refreshApprovals, isLoading } = useApproval();

  // 2026-08-10 修复：首次进入页面时自动拉取审批数据
  //   之前 useApproval() 只读 store，无人触发 fetchApprovals，列表永远空白
  useEffect(() => {
    refreshApprovals();
  }, [refreshApprovals]);

  // 权限检查 - 已取消，所有人可使用所有功能
  const canApprove = true;
  const canView = true;

  // Tab状态
  const [activeTab, setActiveTab] = useState<MaterialApprovalTab>('material');

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('全部');
  const [searchDateStart, setSearchDateStart] = useState('');
  const [searchDateEnd, setSearchDateEnd] = useState('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 展开行状态
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 详情弹窗状态
  const [detailModal, setDetailModal] = useState<DetailModalState>({
    show: false,
    item: null
  });

  // 拒绝原因弹窗状态
  const [rejectModal, setRejectModal] = useState<RejectModalState>({
    show: false,
    item: null,
    reason: ''
  });

  // Tab配置
  const tabs = [
    { key: 'material', label: '领料审批', icon: ClipboardList, path: '/material-receiving', types: [ApprovalType.MATERIAL_REQUEST] },
    { key: 'return', label: '退料审批', icon: RotateCcw, path: '/material-return', types: [ApprovalType.RETURN_MATERIAL] },
    { key: 'material_inbound', label: '物料入库', icon: Truck, path: '/warehouse-inbound', types: [ApprovalType.MATERIAL_INBOUND] },
    { key: 'material_transfer', label: '库存调拨', icon: RotateCcw, path: '/warehouse-overview', types: [ApprovalType.MATERIAL_TRANSFER] },
    { key: 'seed_inbound', label: '种源入库', icon: Package, path: '/crop/seed-source', types: [ApprovalType.SEED_SOURCE_INBOUND] },
    { key: 'supplementary', label: '补录审批', icon: FileText, path: '/crop/seed-source', types: [ApprovalType.SEEDLING_SUPPLEMENTARY, ApprovalType.CROP_STORAGE_SUPPLEMENTARY] },
  ] as const;

  // 根据Tab类型筛选数据
  const getCurrentData = useMemo(() => {
    const currentTab = tabs.find(t => t.key === activeTab);
    if (!currentTab) return [];
    return approvals.filter(a => currentTab.types.includes(a.type));
  }, [approvals, activeTab]);

  // 筛选数据
  const filteredData = useMemo(() => {
    return getCurrentData.filter(item => {
      const matchSearch =
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.applicantName?.includes(searchTerm) ||
        item.code?.includes(searchTerm);
      const matchStatus =
        statusFilter === '全部' ||
        (statusFilter === '待审批' && item.status === ApprovalStatus.PENDING) ||
        (statusFilter === '已通过' && item.status === ApprovalStatus.APPROVED) ||
        (statusFilter === '已拒绝' && item.status === ApprovalStatus.REJECTED);
      const matchApplicant = !searchApplicant || item.applicantName?.includes(searchApplicant);
      const matchBatchCode = !searchBatchCode || item.businessLink?.batchCode?.toLowerCase().includes(searchBatchCode.toLowerCase());
      const matchDepartment = searchDepartment === '全部' || item.applicantDepartment === searchDepartment;
      let matchDate = true;
      if (searchDateStart && item.applyDate) {
        matchDate = matchDate && item.applyDate >= searchDateStart;
      }
      if (searchDateEnd && item.applyDate) {
        matchDate = matchDate && item.applyDate <= searchDateEnd;
      }
      return matchSearch && matchStatus && matchApplicant && matchBatchCode && matchDepartment && matchDate;
    });
  }, [getCurrentData, searchTerm, statusFilter, searchApplicant, searchBatchCode, searchDepartment, searchDateStart, searchDateEnd]);

  // 统计数据
  const stats = useMemo(() => ({
    total: getCurrentData.length,
    pending: getCurrentData.filter(d => d.status === ApprovalStatus.PENDING).length,
    approved: getCurrentData.filter(d => d.status === ApprovalStatus.APPROVED).length,
    rejected: getCurrentData.filter(d => d.status === ApprovalStatus.REJECTED).length,
  }), [getCurrentData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 展开/折叠行
  const toggleExpandRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newExpandedRows = new Set(prev);
      if (newExpandedRows.has(id)) {
        newExpandedRows.delete(id);
      } else {
        newExpandedRows.add(id);
      }
      return newExpandedRows;
    });
  }, []);

  // 详情弹窗操作
  const handleViewDetail = useCallback((item: Approval) => {
    setDetailModal({ show: true, item });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailModal({ show: false, item: null });
  }, []);

  // 拒绝弹窗操作
  const handleRejectClick = useCallback((item: Approval) => {
    setRejectModal({ show: true, item, reason: '' });
  }, []);

  const handleConfirmReject = useCallback(() => {
    if (!rejectModal.reason.trim()) {
      showAlert('请输入拒绝原因');
      return;
    }
    if (rejectModal.item) {
      reject(rejectModal.item.id, rejectModal.reason);
    }
    setRejectModal({ show: false, item: null, reason: '' });
    handleCloseDetail();
  }, [rejectModal, reject, handleCloseDetail]);

  const handleCancelReject = useCallback(() => {
    setRejectModal({ show: false, item: null, reason: '' });
  }, []);

  // 设置拒绝原因
  const setRejectReason = useCallback((reason: string) => {
    setRejectModal(prev => ({ ...prev, reason }));
  }, []);

  // 通过审批
  const handleApprove = useCallback(async (item: Approval) => {
    if (await showConfirm(`确定要通过「${item.title}」吗？`)) {
      approve(item.id);
      handleCloseDetail();
    }
  }, [approve, handleCloseDetail]);

  // 物料分类辅助函数
  const getCategoryByCode = useCallback((code: string): string => {
    const prefix = code.substring(0, 2);
    const categoryMap: Record<string, string> = {
      'SP': '种质资源',
      'EQ': '农业机械',
      'OP': '劳保与防护用品',
      'PH': '采收容器',
      'IT': '监测设备'
    };
    if (prefix === 'SP') {
      const subPrefix = code.substring(2, 4);
      if (subPrefix === '02') return '肥料与土壤改良剂';
      if (subPrefix === '03') return '农药与植保产品';
      if (subPrefix === '01') return '种质资源';
    }
    return categoryMap[prefix] || '其他';
  }, []);

  // 状态显示
  const getStatusBadge = useCallback((status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">已通过</span>;
      case ApprovalStatus.REJECTED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">已拒绝</span>;
      case ApprovalStatus.PENDING:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">待审批</span>;
      case ApprovalStatus.CANCELLED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">已取消</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  }, []);

  // 退料状态显示
  const getReturnStatusBadge = useCallback((status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">已完成</span>;
      case ApprovalStatus.REJECTED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">已驳回</span>;
      case ApprovalStatus.PENDING:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">待审批</span>;
      case ApprovalStatus.CANCELLED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">已取消</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  }, []);

  // 退料类型映射
  const getReturnType = useCallback((item: Approval): string => {
    if (item.businessLink?.returnType) return item.businessLink.returnType;
    if (item.description?.includes('生产退料')) return '生产退料';
    if (item.description?.includes('品质退料')) return '品质退料';
    if (item.description?.includes('试制退料')) return '试制退料';
    return '生产退料';
  }, []);

  return {
    approvals,
    stats,
    tabs,

    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    searchApplicant,
    setSearchApplicant,
    searchBatchCode,
    setSearchBatchCode,
    searchDepartment,
    setSearchDepartment,
    searchDateStart,
    setSearchDateStart,
    searchDateEnd,
    setSearchDateEnd,

    currentPage,
    setCurrentPage,
    pageSize,
    totalPages,
    filteredData,
    paginatedData,

    expandedRows,
    toggleExpandRow,

    detailModal,
    handleViewDetail,
    handleCloseDetail,

    rejectModal,
    setRejectReason,
    handleRejectClick,
    handleConfirmReject,
    handleCancelReject,

    handleApprove,
    approve,
    reject,

    getCategoryByCode,
    getStatusBadge,
    getReturnStatusBadge,
    getReturnType,
    getCurrentData,
  };
}
