import { useState } from 'react';
import {
  Settings as SettingsIcon, MapPin, Sprout, ScrollText, Users, Target, ChevronRight,
  ArrowLeft, Building2, Building, Layers, Shield, Bell, GitBranch, Monitor,
  Warehouse, FileText, BookOpen, Settings as SettingsCog, BarChart3, Database,
  Package, Wrench, Clock, DollarSign,
} from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';

// 组1: 基础数据 — 系统运行的根基
const basicDataSections = [
  { icon: SettingsCog, label: '系统配置', path: '/settings/system-config', desc: '系统参数和全局配置' },
  { icon: BookOpen, label: '数据字典', path: '/settings/dictionary', desc: '管理所有枚举值和状态' },
  { icon: Building2, label: '基地设置', path: '/settings/bases', desc: '管理基地信息配置' },
  { icon: Target, label: '部门设置', path: '/settings/departments', desc: '设置组织架构' },
  { icon: MapPin, label: '种植区域', path: '/settings/regions', desc: '管理温室和大棚区域' },
  { icon: Layers, label: '区块管理', path: '/settings/block', desc: '管理基地下的种植区块' },
];

// 组2: 权限与审批 — 流程控制
const permissionSections = [
  { icon: Shield, label: '用户权限管理', path: '/settings/user-permission', desc: '组织架构 · 角色定义 · 权限矩阵 · 用户管理 · 权限覆盖' },
  { icon: GitBranch, label: '审批流程', path: '/settings/approval-workflow', desc: '审批流程配置' },
  { icon: Shield, label: '分级审批', path: '/settings/approval-level-config', desc: '金额阈值和审批级别配置' },
];

// 组3: 业务标准 — 生产相关的配置
const businessSections = [
  { icon: Database, label: '作物品种库', path: '/settings/crop-variety', desc: '统一管理系统作物品种编码' },
  { icon: Sprout, label: '作物管理', path: '/settings/crops', desc: '作物基础信息管理' },
  { icon: ScrollText, label: '工序管理', path: '/settings/processes', desc: '定义标准农事工序' },
  { icon: Package, label: '物料管理', path: '/settings/materials', desc: '物料类型定义和规格管理' },
  { icon: Wrench, label: '农事活动', path: '/settings/farm-activity', desc: '农事活动类型和计划模板' },
];

// 组4: 运营管理 — 日常运营
const operationSections = [
  { icon: Warehouse, label: '仓库管理', path: '/settings/warehouse', desc: '仓库信息配置' },
  { icon: Users, label: '班组管理', path: '/settings/team', desc: '班组和班次管理' },
  { icon: Monitor, label: '设备管理', path: '/settings/device', desc: 'IoT设备配置' },
  { icon: DollarSign, label: '成本核算', path: '/settings/cost-accounting', desc: '成本类别和预算管理' },
  { icon: Users, label: '人事管理', path: '/settings/personnel', desc: '管理员工和职务' },
];

// 组5: 监控与合规
const monitorSections = [
  { icon: Bell, label: '通知设置', path: '/settings/notification', desc: '消息通知渠道和规则' },
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
      {/* 组1: 基础数据 */}
      <SectionGroup title="基础数据" subtitle="系统运行的根基" sections={basicDataSections} />

      {/* 组2: 权限与审批 */}
      <SectionGroup title="权限与审批" subtitle="流程控制" sections={permissionSections} />

      {/* 组3: 业务标准 */}
      <SectionGroup title="业务标准" subtitle="生产相关的配置" sections={businessSections} />

      {/* 组4: 运营管理 */}
      <SectionGroup title="运营管理" subtitle="日常运营" sections={operationSections} />

      {/* 组5: 监控与合规 */}
      <SectionGroup title="监控与合规" subtitle="系统监控和审计" sections={monitorSections} />

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">系统信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '系统版本', value: 'V1.1' },
            { label: '数据库', value: 'SQLite' },
            { label: '最后更新', value: '2026-05-17' },
            { label: '前端框架', value: 'React 18 + Vite' },
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

// 分组卡片区域组件
function SectionGroup({ title, subtitle, sections }: {
  title: string;
  subtitle: string;
  sections: typeof basicDataSections;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, index) => (
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
    </div>
  );
}
