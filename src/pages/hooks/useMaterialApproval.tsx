// useMaterialApproval Hook
// 物料审批页面的状态管理和业务逻辑
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ClipboardList, RotateCcw, ShoppingCart,
  Truck, Sprout, FileText, CheckCircle, XCircle, Clock, Eye
} from 'lucide-react';
import { useApproval } from '@/hooks/useApproval';
import { useApprovalStore } from '@/stores/useApprovalStore';
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

  // 审批意见弹窗状态（2026-09-27：拒绝原因 / 通过意见 双模式共用）
  const [rejectModal, setRejectModal] = useState<RejectModalState>({
    show: false,
    item: null,
    reason: '',
    mode: 'reject'
  });

  // Tab配置
  // 2026-10-09：移除种源入库 tab（按用户要求；后端联动代码保留用于未来其它入口）
  // 2026-10-09：库存调拨 / 补录审批 tab path 修正：
  //   - material_transfer：/warehouse-overview → /crop-inventory（作物库存页有"调拨入库"按钮）
  //   - supplementary：/crop/seed-source → /crop-inventory（作物库存页有"补录入库"按钮）
  // 2026-10-09：hint 悬停提示（告知对应业务页面）；"库存调拨"改名"作物调拨审批"（数据源是作物库存页，避免与物料库存混淆）
  const tabs = [
    { key: 'material', label: '领料审批', icon: ClipboardList, path: '/material-receiving', types: [ApprovalType.MATERIAL_REQUEST], hint: '审批「生产领料」页面提交的领料单' },
    { key: 'return', label: '退料审批', icon: RotateCcw, path: '/material-return', types: [ApprovalType.RETURN_MATERIAL], hint: '审批「生产退料」页面提交的退料单（通过后自动恢复库存）' },
    { key: 'material_inbound', label: '物料入库', icon: Truck, path: '/warehouse-inbound', types: [ApprovalType.MATERIAL_INBOUND], hint: '审批「物料入库」页面提交的待审核入库单（通过后物料入账）' },
    { key: 'material_transfer', label: '作物调拨审批', icon: RotateCcw, path: '/crop-inventory', types: [ApprovalType.MATERIAL_TRANSFER], hint: '审批「作物库存」页面"新增→调拨入库"提交的调拨申请（通过后源仓扣减、目标仓入账）' },
    { key: 'supplementary', label: '补录审批', icon: FileText, path: '/crop-inventory', types: [ApprovalType.SEEDLING_SUPPLEMENTARY, ApprovalType.CROP_STORAGE_SUPPLEMENTARY], hint: '审批「作物库存」页面"补录入库"与「种植管理」页面"种植自留种"提交的补录申请' },
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

  // 拒绝弹窗操作（2026-09-27 审计修复：同一弹窗复用为"通过意见/拒绝原因"双模式）
  const handleRejectClick = useCallback((item: Approval) => {
    setRejectModal({ show: true, item, reason: '', mode: 'reject' });
  }, []);

  const handleConfirmReject = useCallback(async () => {
    // 拒绝原因必填；通过意见选填（2026-09-27：此前通过不传意见，审批意见恒为空）
    if (rejectModal.mode === 'reject' && !rejectModal.reason.trim()) {
      showAlert('请输入拒绝原因');
      return;
    }
    if (!rejectModal.item) return;
    // 2026-09-28 审计修复：审批操作必须等待结果并提示失败——
    // 此前不 await 也不看结果（store 内部吞错），后端拒绝（如 409 入库单联动失败）
    // 时界面照常关闭，用户以为审批成功。
    const isApprove = rejectModal.mode === 'approve';
    const ok = isApprove
      ? await approve(rejectModal.item.id, rejectModal.reason.trim() || undefined)
      : await reject(rejectModal.item.id, rejectModal.reason);
    if (!ok) {
      const reason = useApprovalStore.getState().error || '未知原因';
      await showAlert(`${isApprove ? '审批通过' : '审批拒绝'}失败：${reason}`);
      return;
    }
    setRejectModal({ show: false, item: null, reason: '', mode: 'reject' });
    handleCloseDetail();
  }, [rejectModal, approve, reject, handleCloseDetail]);

  const handleCancelReject = useCallback(() => {
    setRejectModal({ show: false, item: null, reason: '', mode: 'reject' });
  }, []);

  // 设置拒绝原因 / 通过意见
  const setRejectReason = useCallback((reason: string) => {
    setRejectModal(prev => ({ ...prev, reason }));
  }, []);

  // 通过审批（2026-09-27：改为弹出意见输入弹窗，意见可选填）
  const handleApprove = useCallback((item: Approval) => {
    setRejectModal({ show: true, item, reason: '', mode: 'approve' });
  }, []);

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
