import { useState } from 'react';
import {
  Settings as SettingsIcon, MapPin, ScrollText, Users, Target, ChevronRight,
  ArrowLeft, Building2, Building, Layers, Shield, Bell, GitBranch, Monitor,
  Warehouse, FileText, BookOpen, Settings as SettingsCog, BarChart3, Database,
  Clock, DollarSign, Package, Bug, AlertTriangle,
} from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';

// 组1: 基础数据 — 核心系统配置与日志
const basicDataSections = [
  { icon: SettingsCog, label: '系统配置', path: '/settings/system-config', desc: '系统参数和全局配置' },
  { icon: BookOpen, label: '数据字典', path: '/settings/dictionary', desc: '管理所有枚举值和状态' },
  { icon: Target, label: '部门设置', path: '/settings/departments', desc: '设置组织架构' },
  // 2026-07-25：补 基地架构管理 菜单入口（之前只有路由，无菜单项，导致用户找不到 base area 编辑页）
  { icon: Building2, label: '基地架构管理', path: '/settings/bases', desc: '公司-基地结构配置（编辑基地面积/负责人/经纬度等）' },
  { icon: Building2, label: '基地运营中心', path: '/settings/base-operations?baseOid=base_1780023508412', desc: '设施管理 · 区域划分 · 种植记录' },
  { icon: Bell, label: '通知设置', path: '/settings/notification', desc: '消息通知渠道和规则' },
  { icon: FileText, label: '操作日志', path: '/settings/audit-log', desc: '系统操作审计日志' },
];

// 组2: 生产配置 — 作物、工序与成本
const productionSections = [
  { icon: Database, label: '作物品种库', path: '/settings/crop-variety', desc: '统一管理系统作物品种编码' },
  { icon: Bug, label: '药剂库', path: '/settings/pesticide-library', desc: '管理药剂信息、规格参数和生产厂家' },
  { icon: AlertTriangle, label: '病虫害字典', path: '/settings/pest-disease-dict', desc: '管理病虫害类型、名称和防治方法' },
  { icon: Package, label: '肥料库', path: '/settings/fertilizer-library', desc: '管理肥料信息、规格参数和供应商' },
];

// 组3: 运营管理 — 仓库、班组与权限
const operationSections = [
  { icon: Warehouse, label: '仓库管理', path: '/settings/warehouse', desc: '仓库信息配置' },
  { icon: Users, label: '班组管理', path: '/settings/team', desc: '班组和班次管理' },
  { icon: Shield, label: '用户权限管理', path: '/settings/user-permission', desc: '组织架构 · 角色定义 · 权限矩阵 · 用户管理 · 权限覆盖' },
  { icon: GitBranch, label: '审批流程', path: '/settings/approval-workflow', desc: '审批流程配置' },
  { icon: Shield, label: '分级审批', path: '/settings/approval-level-config', desc: '金额阈值和审批级别配置' },
];

export default function Settings() {
  const location = useLocation();
  const isSubPage = location.pathname !== '/settings';

  // 子页面需要全宽显示，不受 max-w-6xl 限制
  if (isSubPage) {
    return <Outlet />;
  }

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
            <p className="text-gray-500">系统配置、权限管理、生产参数与设备管理</p>
          </div>
        </div>
      </div>

      {/* 组1: 基础数据 */}
      <SectionGroup title="基础数据" subtitle="核心系统配置与日志" sections={basicDataSections} />

      {/* 组2: 生产配置 */}
      <SectionGroup title="生产配置" subtitle="作物与成本" sections={productionSections} />

      {/* 组3: 运营管理 */}
      <SectionGroup title="运营管理" subtitle="仓库、班组与权限" sections={operationSections} />

      <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
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

// 设置卡片条目类型
interface SectionEntry { icon: any; label: string; path: string; desc: string; isIags?: boolean; }

// 分组卡片区域组件
function SectionGroup({ title, subtitle, sections }: {
  title: string;
  subtitle: string;
  sections: SectionEntry[];
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
            className="bg-white rounded-xl p-6 shadow-none border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl group-hover:from-emerald-600 group-hover:to-green-700 transition-colors">
                <section.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold transition-colors ${section.isIags ? 'text-blue-600' : 'text-gray-900'} group-hover:text-emerald-600`}>{section.label}</h3>
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
