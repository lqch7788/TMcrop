// ============================================================
// 审批中心 - 仪表盘概览页面
// 文件路径：src/pages/Approvals.tsx
// 功能：统计概览 + 快捷入口链接到各审批子页面
// ============================================================

import { useApproval } from '../hooks/useApproval';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ShoppingCart,
  RotateCcw,
  Factory,
  Users,
  Sprout,
  FileText,
  Calendar,
  Warehouse,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  LayoutGrid,
  ArrowRightLeft,
  UserPlus,
  Coins,
  ScrollText,
  Construction,
  AlertCircle,
  CheckSquare,
  Bell,
  Target,
} from 'lucide-react';

export default function Approvals() {
  const { stats } = useApproval();

  // 快捷入口配置
  const quickEntries = [
    {
      group: '业务审批',
      icon: ClipboardList,
      color: 'blue',
      entries: [
        { label: '领料审批', path: '/material-approval', desc: '物资/领料申请审批' },
        { label: '退料审批', path: '/material-approval?tab=return', desc: '退料单审批' },
        { label: '采购审批', path: '/material-approval?tab=purchase', desc: '采购申请审批' },
        { label: '物料入库', path: '/business-approval?type=material_inbound', desc: '物料入库审批' },
        { label: '库存调拨', path: '/business-approval?type=material_transfer', desc: '库存调拨审批' },
        { label: '订单创建', path: '/business-approval?type=order_create', desc: '订单创建审批' },
        { label: '订单变更', path: '/business-approval?type=order_change', desc: '订单变更审批' },
      ],
    },
    {
      group: '生产审批',
      icon: Factory,
      color: 'emerald',
      entries: [
        { label: '技术方案', path: '/production-approval?tab=tech', desc: '技术方案审批' },
        { label: '生产计划', path: '/production-approval?tab=plan', desc: '生产计划审批' },
        { label: '采收申请', path: '/production-approval?tab=harvest', desc: '采收申请审批' },
      ],
    },
    {
      group: '农事审批',
      icon: Sprout,
      color: 'green',
      entries: [
        { label: '任务派发', path: '/farm-approval?tab=task_dispatch', desc: '农事任务派发审批' },
        { label: '任务变更', path: '/farm-approval?tab=task_change', desc: '任务变更审批' },
        { label: '巡查问题', path: '/farm-approval?tab=inspection', desc: '巡查问题审批' },
        { label: '问题整改', path: '/farm-approval?tab=resolve', desc: '问题整改审批' },
      ],
    },
    {
      group: '指标/预算审批',
      icon: BarChart3,
      color: 'purple',
      entries: [
        { label: '指标发布', path: '/indicator-budget-approval?tab=indicator', desc: '指标发布审批' },
        { label: '指标调整', path: '/indicator-budget-approval?tab=indicator_adjust', desc: '指标调整审批' },
        { label: '预算编制', path: '/indicator-budget-approval?tab=budget_create', desc: '预算编制审批' },
        { label: '预算调整', path: '/indicator-budget-approval?tab=budget_adjust', desc: '预算调整审批' },
      ],
    },
    {
      group: 'HR审批',
      icon: Users,
      color: 'orange',
      entries: [
        { label: 'HR审批中心', path: '/hr-approval', desc: '请假/加班/离职等HR审批' },
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; icon: string; hover: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', hover: 'hover:bg-blue-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', hover: 'hover:bg-emerald-100' },
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', hover: 'hover:bg-green-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', hover: 'hover:bg-purple-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', hover: 'hover:bg-orange-100' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">审批中心</h1>
            <p className="text-gray-500 mt-1">审批管理统一入口</p>
          </div>
          <Link
            to="/my-applications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            我的申请
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待审批</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已通过</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已拒绝</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">全部</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="space-y-4">
        {quickEntries.map(group => {
          const colors = colorMap[group.color] || colorMap.blue;
          return (
            <div key={group.group} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <group.icon className={`w-4 h-4 ${colors.icon}`} />
                </div>
                <h2 className="font-semibold text-gray-900">{group.group}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {group.entries.map(entry => (
                  <Link
                    key={entry.path + entry.label}
                    to={entry.path}
                    className={`flex flex-col gap-1 p-3 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-colors group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 text-sm">{entry.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </div>
                    <p className="text-xs text-gray-500">{entry.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
