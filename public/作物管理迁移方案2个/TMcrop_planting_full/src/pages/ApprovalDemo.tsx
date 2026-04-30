// ============================================================
// 审批流程演示中心
// 文件路径：src/pages/ApprovalDemo.tsx
// 功能：完整展示审批流程的提交流转和审批过程
// 支持 localStorage 持久化
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, RotateCcw, ChevronRight, ChevronLeft,
  CheckCircle, XCircle, Clock, AlertCircle,
  Package, ShoppingCart, ArrowLeftRight, FileText,
  Sprout, Warehouse, Eye, ArrowRight,
  RefreshCw, Trash2
} from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType } from '../types/approval';
import { clearApprovalsStorage } from '../contexts/ApprovalContext';

// 审批类型配置
const approvalTypeConfig: Record<string, { label: string; icon: typeof Package; color: string }> = {
  [ApprovalType.MATERIAL_REQUEST]: { label: '领料单', icon: Package, color: 'bg-blue-500' },
  [ApprovalType.PURCHASE_REQUEST]: { label: '采购申请', icon: ShoppingCart, color: 'bg-purple-500' },
  [ApprovalType.RETURN_MATERIAL]: { label: '退料单', icon: ArrowLeftRight, color: 'bg-orange-500' },
  [ApprovalType.PRODUCTION_PLAN]: { label: '生产计划', icon: Sprout, color: 'bg-green-500' },
  [ApprovalType.HARVEST_REQUEST]: { label: '采收申请', icon: Warehouse, color: 'bg-emerald-500' },
  [ApprovalType.LEAVE]: { label: '请假', icon: Clock, color: 'bg-cyan-500' },
  [ApprovalType.OVERTIME]: { label: '加班', icon: Clock, color: 'bg-amber-500' },
};

export default function ApprovalDemo() {
  const { approvals, stats, approve, reject, addApproval } = useApproval();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  // 统计数据
  const statsData = useMemo(() => ({
    total: approvals.length,
    pending: approvals.filter(a => a.status === ApprovalStatus.PENDING).length,
    approved: approvals.filter(a => a.status === ApprovalStatus.APPROVED).length,
    rejected: approvals.filter(a => a.status === ApprovalStatus.REJECTED).length,
    partiallyApproved: approvals.filter(a => a.status === ApprovalStatus.PARTIALLY_APPROVED).length,
  }), [approvals]);

  // 筛选数据
  const filteredApprovals = useMemo(() => {
    let result = approvals;
    if (activeTab === 'pending') {
      result = result.filter(a => a.status === ApprovalStatus.PENDING);
    } else if (activeTab === 'approved') {
      result = result.filter(a => a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED);
    } else if (activeTab === 'rejected') {
      result = result.filter(a => a.status === ApprovalStatus.REJECTED || a.status === ApprovalStatus.CANCELLED);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [approvals, activeTab]);

  // 重置演示数据
  const handleReset = () => {
    if (confirm('确定要重置所有审批数据吗？这将清除所有新增的审批记录。')) {
      clearApprovalsStorage();
      window.location.reload();
    }
  };

  // 快速创建演示数据
  const handleCreateDemoData = () => {
    const demoApprovals = [
      {
        id: `demo_${Date.now()}_1`,
        code: `LL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`,
        type: ApprovalType.MATERIAL_REQUEST,
        typeName: '领料单',
        category: 'business' as const,
        title: '演示用户的领料申请',
        description: '用于番茄种植基地的肥料施用',
        applicantId: 'current_user',
        applicantName: '演示用户',
        applicantDepartment: '生产部',
        applyDate: new Date().toISOString().split('T')[0],
        applyTime: new Date().toTimeString().slice(0, 5),
        currentStep: 1,
        totalSteps: 1,
        approvers: [{ userId: 'demo', userName: '王志刚', role: '审批人', order: 1, status: 'pending' as const }],
        records: [],
        status: ApprovalStatus.PENDING,
        priority: 'normal' as const,
        reminderCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notificationSent: false,
        materials: [
          { materialId: 'M001', materialCode: 'SP02001', materialName: '水溶肥NPK', requestedQuantity: 100, unit: '公斤' },
          { materialId: 'M002', materialCode: 'SP02002', materialName: '有机肥', requestedQuantity: 200, unit: '公斤' },
        ],
        businessLink: {
          type: 'material' as const,
          requestId: '1',
          requestCode: `LL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`,
          warehouseLocation: '仓库A区',
          plantArea: '1号大棚/番茄种植区',
          batchCode: 'SC202604001'
        }
      },
      {
        id: `demo_${Date.now()}_2`,
        code: `CG${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`,
        type: ApprovalType.PURCHASE_REQUEST,
        typeName: '采购申请',
        category: 'business' as const,
        title: '农药采购申请',
        description: '用于病虫害防治的农药采购',
        applicantId: 'current_user',
        applicantName: '演示用户',
        applicantDepartment: '技术部',
        applyDate: new Date().toISOString().split('T')[0],
        applyTime: new Date().toTimeString().slice(0, 5),
        currentStep: 1,
        totalSteps: 1,
        approvers: [{ userId: 'demo', userName: '演示审批人', role: '审批人', order: 1, status: 'pending' as const }],
        records: [],
        status: ApprovalStatus.PENDING,
        priority: 'high' as const,
        reminderCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notificationSent: false,
        amount: '5000元',
        businessLink: { type: 'purchase' as const, requestId: '2', requestCode: 'CG20260410-001' }
      },
      {
        id: `demo_${Date.now()}_3`,
        code: `TL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`,
        type: ApprovalType.RETURN_MATERIAL,
        typeName: '退料单',
        category: 'business' as const,
        title: '化肥退料申请',
        description: '因规格不符，需要退料',
        applicantId: 'current_user',
        applicantName: '演示用户',
        applicantDepartment: '生产部',
        applyDate: new Date().toISOString().split('T')[0],
        applyTime: new Date().toTimeString().slice(0, 5),
        currentStep: 1,
        totalSteps: 1,
        approvers: [{ userId: 'demo', userName: '演示审批人', role: '审批人', order: 1, status: 'pending' as const }],
        records: [],
        status: ApprovalStatus.PENDING,
        priority: 'normal' as const,
        reminderCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notificationSent: false,
        businessLink: { type: 'return' as const, requestId: '3', requestCode: 'TL20260410-001' }
      },
    ];

    demoApprovals.forEach(approval => addApproval(approval));
    setAnimationKey(prev => prev + 1);
  };

  // 状态显示配置
  const getStatusConfig = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return { label: '已通过', icon: CheckCircle, bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
      case ApprovalStatus.REJECTED:
        return { label: '已拒绝', icon: XCircle, bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      case ApprovalStatus.PARTIALLY_APPROVED:
        return { label: '部分通过', icon: AlertCircle, bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
      case ApprovalStatus.CANCELLED:
        return { label: '已撤回', icon: AlertCircle, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
      default:
        return { label: '待审批', icon: Clock, bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: ApprovalType) => {
    const config = approvalTypeConfig[type];
    return config?.icon || FileText;
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">审批流程演示中心</h1>
              <p className="text-gray-500">演示完整的审批提交流转和业务联动过程</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateDemoData}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建演示数据
            </button>
            <button
              onClick={handleReset}
              className="h-10 px-4 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置数据
            </button>
          </div>
        </div>
      </div>

      {/* 流程概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg ${animationKey}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{statsData.total}</p>
              <p className="text-blue-100 text-sm">总申请数</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{statsData.pending}</p>
              <p className="text-amber-100 text-sm">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{statsData.approved}</p>
              <p className="text-emerald-100 text-sm">已通过</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{statsData.rejected}</p>
              <p className="text-red-100 text-sm">已拒绝</p>
            </div>
          </div>
        </div>
      </div>

      {/* 流程图示 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">审批流程示意</h2>
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 border-4 border-blue-500 flex items-center justify-center mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">提交申请</p>
            <p className="text-xs text-gray-500">创建审批单</p>
          </div>
          <ArrowRight className="w-8 h-8 text-gray-300" />
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-500 flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">待审批</p>
            <p className="text-xs text-gray-500">等待处理</p>
          </div>
          <ArrowRight className="w-8 h-8 text-gray-300" />
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">审批通过</p>
            <p className="text-xs text-gray-500">业务联动</p>
          </div>
          <ArrowRight className="w-8 h-8 text-gray-300" />
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-purple-100 border-4 border-purple-500 flex items-center justify-center mb-2">
              <RefreshCw className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">联动完成</p>
            <p className="text-xs text-gray-500">库存/采购更新</p>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {[
          { key: 'all', label: '全部' },
          { key: 'pending', label: '待审批' },
          { key: 'approved', label: '已通过' },
          { key: 'rejected', label: '已拒绝' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.key === 'all' && <FileText className="w-4 h-4" />}
            {tab.key === 'pending' && <Clock className="w-4 h-4" />}
            {tab.key === 'approved' && <CheckCircle className="w-4 h-4" />}
            {tab.key === 'rejected' && <XCircle className="w-4 h-4" />}
            {tab.label}
            {tab.key === 'pending' && statsData.pending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                {statsData.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 审批列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">审批记录</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredApprovals.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>暂无审批记录</p>
              <p className="text-sm text-gray-400 mt-2">点击上方"创建演示数据"开始演示</p>
            </div>
          ) : (
            filteredApprovals.map((approval) => {
              const statusConfig = getStatusConfig(approval.status);
              const TypeIcon = getTypeIcon(approval.type);
              return (
                <div key={approval.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg ${approvalTypeConfig[approval.type]?.color || 'bg-gray-500'} flex items-center justify-center`}>
                        <TypeIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{approval.title}</h4>
                          <span className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs rounded-full`}>
                            {statusConfig.label}
                          </span>
                          {approval.priority === 'high' || approval.priority === 'urgent' ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                              {approval.priority === 'urgent' ? '紧急' : '高优先级'}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>单号：{approval.code}</span>
                          <span>申请人：{approval.applicantName}</span>
                          <span>部门：{approval.applicantDepartment}</span>
                          <span>申请时间：{approval.applyDate} {approval.applyTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {approval.status === ApprovalStatus.PENDING && (
                        <>
                          <button
                            onClick={() => {
                              approve(approval.id, '审批通过');
                              setAnimationKey(prev => prev + 1);
                            }}
                            className="h-9 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            通过
                          </button>
                          <button
                            onClick={() => reject(approval.id, '审批拒绝')}
                            className="h-9 px-3 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            拒绝
                          </button>
                        </>
                      )}
                      <button className="h-9 px-3 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        详情
                      </button>
                    </div>
                  </div>
                  {approval.materials && approval.materials.length > 0 && (
                    <div className="mt-3 ml-16 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 mb-2">物料明细</p>
                      <div className="flex flex-wrap gap-2">
                        {approval.materials.map((mat, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                            {mat.materialName} × {mat.requestedQuantity}{mat.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 业务联动说明 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">业务联动说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">领料审批</h4>
                <p className="text-xs text-gray-500">通过后自动减少库存</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 库存数量 = 原库存 - 申请数量</p>
              <p>• 生成出库记录</p>
              <p>• 更新库存台账</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">采购审批</h4>
                <p className="text-xs text-gray-500">通过后自动更新采购状态</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 采购状态 → 采购中</p>
              <p>• 生成采购订单</p>
              <p>• 通知供应商</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">退料审批</h4>
                <p className="text-xs text-gray-500">通过后自动增加库存</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 库存数量 = 原库存 + 退料数量</p>
              <p>• 生成入库记录</p>
              <p>• 更新库存台账</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速链接 */}
      <div className="flex items-center justify-center gap-4">
        <Link
          to="/material-receiving"
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-emerald-600"
        >
          <Package className="w-4 h-4" />
          前往领料申请
        </Link>
        <Link
          to="/material-return"
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-emerald-600"
        >
          <ArrowLeftRight className="w-4 h-4" />
          前往退料申请
        </Link>
        <Link
          to="/purchase-plan"
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-emerald-600"
        >
          <ShoppingCart className="w-4 h-4" />
          前往采购申请
        </Link>
      </div>
    </div>
  );
}

// Plus 图标组件（lucide-react 可能没有）
function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
