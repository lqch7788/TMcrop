import { useState } from 'react';
import { Settings as SettingsIcon, Leaf, MapPin, Sprout, Package, ScrollText, Users, Target, ChevronRight, ArrowLeft, Building2, Building, Layers, Shield, Bell, GitBranch, Monitor, Warehouse, Calculator, FileText, BookOpen, Settings as SettingsCog, BarChart3, Database } from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';

const settingsSections = [
  { icon: SettingsCog, label: '系统配置', path: '/settings/system-config', desc: '系统参数和全局配置' },
  { icon: BookOpen, label: '数据字典', path: '/settings/dictionary', desc: '管理所有枚举值和状态' },
  { icon: Shield, label: '用户权限', path: '/settings/user-permission', desc: '角色和权限管理' },
  { icon: GitBranch, label: '审批流程', path: '/settings/approval-workflow', desc: '审批流程配置' },
  { icon: Shield, label: '分级审批', path: '/settings/approval-level-config', desc: '金额阈值和审批级别配置' },
  { icon: Bell, label: '通知设置', path: '/settings/notification', desc: '消息通知渠道和规则' },
  { icon: Monitor, label: '设备管理', path: '/settings/device', desc: 'IoT设备配置' },
  { icon: Warehouse, label: '仓库管理', path: '/settings/warehouse', desc: '仓库信息配置' },
  { icon: Users, label: '班组管理', path: '/settings/team', desc: '班组和班次管理' },
  { icon: Building, label: '基地管理', path: '/settings/branch', desc: '管理种植基地信息' },
  { icon: Layers, label: '区块管理', path: '/settings/block', desc: '管理基地下的区块' },
  { icon: Building2, label: '基地设置', path: '/settings/bases', desc: '管理基地信息配置' },
  { icon: MapPin, label: '区域管理', path: '/settings/regions', desc: '管理种植区域和地块' },
  { icon: Leaf, label: '种植模式', path: '/settings/modes', desc: '管理种植模式配置' },
  { icon: Database, label: '作物品种库', path: '/settings/crop-variety', desc: '统一管理系统作物品种编码' },
  { icon: Package, label: '物料管理', path: '/settings/materials', desc: '管理物资分类和物料' },
  { icon: ScrollText, label: '工序管理', path: '/settings/processes', desc: '定义标准农事工序' },
  { icon: Users, label: '人事管理', path: '/settings/personnel', desc: '管理员工和职务' },
  { icon: Target, label: '部门设置', path: '/settings/departments', desc: '设置组织架构' },
  { icon: Calculator, label: '成本核算', path: '/settings/cost-accounting', desc: '成本类别和预算' },
  { icon: FileText, label: '操作日志', path: '/settings/audit-log', desc: '系统操作审计日志' },
];

export default function Settings() {
  const location = useLocation();
  const isSubPage = location.pathname !== '/settings';

  // 子页面需要全宽显示，不受 max-w-6xl 限制
  if (isSubPage) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section, index) => (
          <Link
            key={index}
            to={section.path}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <section.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">{section.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{section.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">系统信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '系统版本', value: 'V3.0.0' },
            { label: '数据库版本', value: 'PostgreSQL 14' },
            { label: '最后更新', value: '2026-04-30' },
            { label: '在线用户', value: '12人' },
          ].map((info, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">{info.label}</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{info.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
