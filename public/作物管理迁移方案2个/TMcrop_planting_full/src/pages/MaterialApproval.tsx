// ============================================================
// 物料审批页面
// 文件路径：src/pages/MaterialApproval.tsx
// 功能：领料审批、退料审批、采购审批的统一管理
// 使用真实数据：从ApprovalContext获取
// ============================================================

import React, { useState, useMemo, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, ClipboardList,
  Truck, ShoppingCart, RotateCcw, Eye,
  ChevronDown, X, RefreshCw
} from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType } from '../types/approval';

export default function MaterialApproval() {
  const { approvals, approve, reject } = useApproval();

  const [activeTab, setActiveTab] = useState<'material' | 'return' | 'purchase'>('material');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // 新增搜索筛选字段
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('全部');
  const [searchDateStart, setSearchDateStart] = useState('');
  const [searchDateEnd, setSearchDateEnd] = useState('');

  // 展开/折叠行
  const toggleExpandRow = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // 物料分类辅助函数
  const getCategoryByCode = (code: string): string => {
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
  };

  // Tab配置
  const tabs = [
    { key: 'material', label: '领料审批', icon: ClipboardList, path: '/material-receiving', types: [ApprovalType.MATERIAL_REQUEST] },
    { key: 'return', label: '退料审批', icon: RotateCcw, path: '/material-return', types: [ApprovalType.RETURN_MATERIAL] },
    { key: 'purchase', label: '采购审批', icon: ShoppingCart, path: '/purchase-plan', types: [ApprovalType.PURCHASE_REQUEST] },
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
      // 申请人筛选
      const matchApplicant = !searchApplicant ||
        item.applicantName?.includes(searchApplicant);
      // 批次号筛选
      const matchBatchCode = !searchBatchCode ||
        item.businessLink?.batchCode?.toLowerCase().includes(searchBatchCode.toLowerCase());
      // 部门筛选
      const matchDepartment = searchDepartment === '全部' ||
        item.applicantDepartment === searchDepartment;
      // 时间段筛选
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

  // 统计
  const stats = useMemo(() => ({
    total: getCurrentData.length,
    pending: getCurrentData.filter(d => d.status === ApprovalStatus.PENDING).length,
    approved: getCurrentData.filter(d => d.status === ApprovalStatus.APPROVED).length,
    rejected: getCurrentData.filter(d => d.status === ApprovalStatus.REJECTED).length,
  }), [getCurrentData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态显示
  const getStatusBadge = (status: ApprovalStatus) => {
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
  };

  // 退料状态显示（与生产退料页面一致）
  const getReturnStatusBadge = (status: ApprovalStatus) => {
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
  };

  // 退料类型映射
  const getReturnType = (item: any): string => {
    if (item.businessLink?.returnType) return item.businessLink.returnType;
    if (item.description?.includes('生产退料')) return '生产退料';
    if (item.description?.includes('品质退料')) return '品质退料';
    if (item.description?.includes('试制退料')) return '试制退料';
    return '生产退料';
  };

  // 详情弹窗状态
  const [detailModal, setDetailModal] = useState<{
    show: boolean;
    item: typeof paginatedData[0] | null;
  }>({ show: false, item: null });

  // 详情弹窗点击
  const handleViewDetail = (item: typeof paginatedData[0]) => {
    setDetailModal({ show: true, item });
  };

  // 详情弹窗关闭
  const handleCloseDetail = () => {
    setDetailModal({ show: false, item: null });
  };

  // 拒绝原因弹窗状态
  const [rejectModal, setRejectModal] = useState<{
    show: boolean;
    item: typeof paginatedData[0] | null;
    reason: string;
  }>({ show: false, item: null, reason: '' });

  // 点击拒绝按钮
  const handleRejectClick = (item: typeof paginatedData[0]) => {
    setRejectModal({ show: true, item, reason: '' });
  };

  // 确认拒绝
  const handleConfirmReject = () => {
    if (!rejectModal.reason.trim()) {
      alert('请输入拒绝原因');
      return;
    }
    if (rejectModal.item) {
      reject(rejectModal.item.id, rejectModal.reason);
    }
    setRejectModal({ show: false, item: null, reason: '' });
    handleCloseDetail();
  };

  // 取消拒绝
  const handleCancelReject = () => {
    setRejectModal({ show: false, item: null, reason: '' });
  };

  // 点击通过按钮
  const handleApprove = (item: typeof paginatedData[0]) => {
    if (confirm(`确定要通过「${item.title}」吗？`)) {
      approve(item.id);
      handleCloseDetail();
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物料审批</h1>
            <p className="text-gray-500">领料、退料、采购审批流程管理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">总申请数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-xs text-gray-500">已通过</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-xs text-gray-500">已拒绝</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 筛选区域 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-8 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">领料单号</label>
            <input
              type="text"
              placeholder="单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">申领人</label>
            <input
              type="text"
              placeholder="申请人..."
              value={searchApplicant}
              onChange={(e) => setSearchApplicant(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">部门</label>
            <select
              value={searchDepartment}
              onChange={(e) => setSearchDepartment(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="全部">全部</option>
              <option value="生产部">生产部</option>
              <option value="技术部">技术部</option>
              <option value="后勤部">后勤部</option>
              <option value="设备部">设备部</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">生产批次号</label>
            <input
              type="text"
              placeholder="批次号..."
              value={searchBatchCode}
              onChange={(e) => setSearchBatchCode(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={searchDateStart}
              onChange={(e) => setSearchDateStart(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={searchDateEnd}
              onChange={(e) => setSearchDateEnd(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="全部">全部</option>
              <option value="待审批">待审批</option>
              <option value="已通过">已通过</option>
              <option value="已拒绝">已拒绝</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-1"
            >
              搜索
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchApplicant('');
                setSearchDepartment('全部');
                setSearchBatchCode('');
                setSearchDateStart('');
                setSearchDateEnd('');
                setStatusFilter('全部');
              }}
              className="flex-1 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
          <Link
            to={tabs.find(t => t.key === activeTab)?.path || '/'}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            查看全部 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          {activeTab === 'material' && (
            // 领料审批表格
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap w-12"></th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">领料单号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">申请日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">申请人</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">部门</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">库存地点</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">物料种类</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">种植区域/用途</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">审核人</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">生产计划批次号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">备注</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {paginatedData.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpandRow(item.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedRows.has(item.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap">{item.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applyDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantDepartment || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.warehouseLocation || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.materials?.length > 0 ? `${item.materials.length}种` : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.plantArea || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.approvers?.[0]?.userName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.batchCode || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(item.status)}
                            {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
                              <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.records[item.records.length - 1]?.comment}>
                                原因：{item.records[item.records.length - 1]?.comment || '-'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.description || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {item.status === ApprovalStatus.PENDING && (
                              <>
                                <button
                                  onClick={() => approve(item.id)}
                                  className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="通过"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectClick(item)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="拒绝"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleViewDetail(item)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* 展开行 - 物料明细 */}
                      {expandedRows.has(item.id) && (
                        <tr key={`${item.id}-expanded`}>
                          <td colSpan={13} className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium text-blue-800 mb-2">物料明细</div>
                              {item.materials && item.materials.length > 0 ? (
                                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                                  <thead className="bg-[#F2F6FA]">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申领数量</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">当前库存</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.materials.map((m: any, idx: number) => {
                                      const subtotal = (m.requestedQuantity || 0) * (m.unitPrice || 0);
                                      return (
                                        <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                          <td className="px-3 py-2 text-sm text-blue-800 font-mono">{m.materialCode}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.materialName}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.spec || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.unit || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.requestedQuantity || 0}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.stockQuantity ?? '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? m.unitPrice.toFixed(2) : '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? subtotal.toFixed(2) : '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.warehousePosition || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.remark || '-'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                              )}
                              {item.description && (
                                <div className="mt-3 text-gray-600">
                                  <span className="font-medium">申请说明：</span>{item.description}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'return' && (
            // 退料审批表格 - 与生产退料页面一致
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap w-12"></th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料单号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料类型</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">申请人</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料部门</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">仓库位置</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">审批状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">审核人</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">备注</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {paginatedData.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpandRow(item.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedRows.has(item.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap">{item.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applyDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{getReturnType(item)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantDepartment}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.warehouseLocation || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {getReturnStatusBadge(item.status)}
                            {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
                              <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.records[item.records.length - 1]?.comment}>
                                原因：{item.records[item.records.length - 1]?.comment || '-'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.approvers?.[0]?.userName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.description || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {item.status === ApprovalStatus.PENDING && (
                              <>
                                <button
                                  onClick={() => approve(item.id)}
                                  className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="通过"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectClick(item)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="拒绝"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleViewDetail(item)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* 展开行 - 退料明细 */}
                      {expandedRows.has(item.id) && (
                        <tr key={`${item.id}-expanded`}>
                          <td colSpan={12} className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium text-blue-800 mb-2">退料物料明细</div>
                              {item.materials && item.materials.length > 0 ? (
                                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                                  <thead className="bg-[#F2F6FA]">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料分类</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">退料数量</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                      <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">退料原因</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.materials.map((m: any, idx: number) => {
                                      const subtotal = (m.returnQuantity || 0) * (m.unitPrice || 0);
                                      return (
                                        <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                          <td className="px-3 py-2 text-sm text-blue-800 font-mono">{m.sourceApplicationCode || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800 font-mono">{m.materialCode}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.category || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.materialName}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.spec || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.unit || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.returnQuantity || m.requestedQuantity || 0}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? m.unitPrice.toFixed(2) : '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? subtotal.toFixed(2) : '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.warehousePosition || '-'}</td>
                                          <td className="px-3 py-2 text-sm text-blue-800">{m.reason || '-'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-blue-800 text-center py-4">暂无退料物料明细</div>
                              )}
                              {item.description && (
                                <div className="mt-3 text-gray-600">
                                  <span className="font-medium">退料说明：</span>{item.description}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'purchase' && (
            // 采购审批表格 - 参照采购计划页面样式
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划编号</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划名称</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总金额</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">交货日期</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.businessLink?.items?.[0]?.materialName ? '物资' : '生产物资'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.applicantName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.applyDate}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.amount || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.businessLink?.items?.[0]?.supplier || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.businessLink?.expectedDeliveryDate || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        item.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.priority === 'urgent' ? '紧急' :
                         item.priority === 'high' ? '高' :
                         item.priority === 'normal' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {item.status === ApprovalStatus.PENDING && (
                          <>
                            <button
                              onClick={() => approve(item.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="通过"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectClick(item)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="拒绝"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleViewDetail(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filteredData.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>暂无审批记录</p>
            <p className="text-sm text-gray-400 mt-2">在领料/退料/采购页面提交申请后，这里将显示审批列表</p>
          </div>
        )}

        {/* 分页 */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              共 {filteredData.length} 条记录，第 {currentPage}/{totalPages || 1} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(totalPages || 1)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                disabled={currentPage === (totalPages || 1)}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {detailModal.show && detailModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600">
              <h3 className="text-lg font-semibold text-white">{activeTab === 'return' ? '退料' : activeTab === 'purchase' ? '采购' : '领料'}单详情</h3>
              <button
                onClick={handleCloseDetail}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {/* 基本信息 - 参考生产领料样式 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-500">单号</label>
                  <p className="font-mono font-semibold text-gray-900">{detailModal.item.code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">申请日期</label>
                  <p className="font-semibold text-gray-900">{detailModal.item.applyDate}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <p className="font-semibold">{getStatusBadge(detailModal.item.status)}</p>
                  {detailModal.item.status === ApprovalStatus.REJECTED && detailModal.item.records && detailModal.item.records.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      拒绝原因：{detailModal.item.records[detailModal.item.records.length - 1]?.comment || '-'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">申请人</label>
                  <p className="font-semibold text-gray-900">{detailModal.item.applicantName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">部门</label>
                  <p className="font-semibold text-gray-900">{detailModal.item.applicantDepartment}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">审核人</label>
                  <p className="font-semibold text-gray-900">{detailModal.item.approvers?.[0]?.userName || '-'}</p>
                </div>
                {activeTab === 'material' && detailModal.item.businessLink && (
                  <>
                    <div>
                      <label className="text-sm text-gray-500">库存地点</label>
                      <p className="font-semibold text-gray-900">{detailModal.item.businessLink.warehouseLocation || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">生产计划批次号</label>
                      <p className="font-semibold text-gray-900">{detailModal.item.businessLink.batchCode || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">物料种类</label>
                      <p className="font-semibold text-gray-900">
                        {detailModal.item.materials?.length > 0 ? `${detailModal.item.materials.length}种` : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">种植区域/用途</label>
                      <p className="font-semibold text-gray-900">{detailModal.item.businessLink?.plantArea || '-'}</p>
                    </div>
                  </>
                )}
              </div>

              {/* 描述/说明 */}
              {detailModal.item.description && (
                <div className="mb-6">
                  <label className="text-sm text-gray-500 block mb-1">申请说明</label>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailModal.item.description}</p>
                </div>
              )}

              {/* 物料明细 - 参考生产领料样式 */}
              <div className="mb-6">
                <label className="text-sm text-gray-500 block mb-2">
                  {activeTab === 'return' ? '退料' : activeTab === 'purchase' ? '采购' : '领料'}物料明细
                </label>
                {detailModal.item.materials && detailModal.item.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料分类</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">数量</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">已批数量</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailModal.item.materials.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-emerald-50">
                          <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.materialCode}</td>
                          <td className="px-3 py-2 text-sm text-blue-700">{m.materialName}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{getCategoryByCode(m.materialCode)}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{m.spec || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{m.unit}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{m.requestedQuantity || m.returnQuantity}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{m.approvedQuantity || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">暂无物料明细</div>
                )}
              </div>

              {/* 审批记录 */}
              {detailModal.item.records && detailModal.item.records.length > 0 && (
                <div className="mb-6">
                  <label className="text-sm text-gray-500 block mb-2">审批记录</label>
                  <div className="space-y-2">
                    {detailModal.item.records.map((r: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">{r.approverName}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            r.action === 'approve' ? 'bg-emerald-100 text-emerald-700' :
                            r.action === 'reject' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {r.action === 'approve' ? '通过' : r.action === 'reject' ? '拒绝' : '部分通过'}
                          </span>
                        </div>
                        {r.comment && <p className="text-gray-600 mt-1">原因：{r.comment}</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(r.actionTime).toLocaleString('zh-CN')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseDetail}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
                {detailModal.item.status === ApprovalStatus.PENDING && (
                  <>
                    <button
                      onClick={() => handleApprove(detailModal.item)}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => handleRejectClick(detailModal.item)}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      拒绝
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 拒绝原因弹窗 */}
      {rejectModal.show && rejectModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-700">拒绝审批</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">
                确定要拒绝「<span className="font-medium text-gray-900">{rejectModal.item.title}</span>」吗？
              </p>
              <p className="text-xs text-gray-500 mb-4">拒绝后，申请人可以在领料页面修改料单后重新提交审批。</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">拒绝原因（必填）</label>
                <textarea
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="请输入拒绝原因..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelReject}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  确认拒绝
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}