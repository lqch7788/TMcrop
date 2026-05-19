import { useState } from 'react';
import {
  Settings as SettingsIcon, MapPin, ScrollText, Users, Target, ChevronRight,
  ArrowLeft, Building2, Building, Layers, Shield, Bell, GitBranch, Monitor,
  Warehouse, FileText, BookOpen, Settings as SettingsCog, BarChart3, Database,
  Clock, DollarSign, Server, DatabaseBackup, Sprout,
  // iAGS 集成新增图标
  Grid3X3, Radio, Video, Droplets, Zap, AlertTriangle, Bug, Wrench, Tractor,
  MonitorCheck,
} from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';

// 组1: 基础数据 — 核心系统配置与日志
const basicDataSections = [
  { icon: SettingsCog, label: '系统配置', path: '/settings/system-config', desc: '系统参数和全局配置' },
  { icon: BookOpen, label: '数据字典', path: '/settings/dictionary', desc: '管理所有枚举值和状态' },
  { icon: Target, label: '部门设置', path: '/settings/departments', desc: '设置组织架构' },
  { icon: Bell, label: '通知设置', path: '/settings/notification', desc: '消息通知渠道和规则' },
  { icon: FileText, label: '操作日志', path: '/settings/audit-log', desc: '系统操作审计日志' },
];

// 组2: 农场结构 — 基地 · 大棚 · 分区 · 区块（物理空间架构）
const farmStructureSections = [
  { icon: Building2, label: '基地设置', path: '/settings/bases', desc: '管理基地信息配置' },
  { icon: Sprout, label: '基地架构', path: '/settings/farm-structure', desc: '公司基地 · 设施管理 · 区块划分 · 种植记录' },
  { icon: MapPin, label: '种植区域', path: '/settings/regions', desc: '管理温室和大棚区域' },
  { icon: Layers, label: '区块管理', path: '/settings/block', desc: '管理基地下的种植区块' },
  { icon: Grid3X3, label: '分区管理', path: '/settings/partitions', desc: '大棚和种植分区层级管理 · 传感器/水肥/摄像头关联', isIags: true },
  { icon: Radio, label: '区域系统', path: '/settings/area-systems', desc: '分区与设备系统的关联映射配置', isIags: true },
];

// 组3: 权限管理 — 安全与流程控制
const permissionSections = [
  { icon: Shield, label: '用户权限管理', path: '/settings/user-permission', desc: '组织架构 · 角色定义 · 权限矩阵 · 用户管理 · 权限覆盖' },
  { icon: GitBranch, label: '审批流程', path: '/settings/approval-workflow', desc: '审批流程配置' },
  { icon: Shield, label: '分级审批', path: '/settings/approval-level-config', desc: '金额阈值和审批级别配置' },
];

// 组4: 生产配置 — 作物、工序与成本
const productionSections = [
  { icon: Database, label: '作物品种库', path: '/settings/crop-variety', desc: '统一管理系统作物品种编码' },
  { icon: ScrollText, label: '工序管理', path: '/settings/processes', desc: '定义标准农事工序' },
  { icon: Tractor, label: '种植设置', path: '/settings/plant-settings', desc: '种植图标和品种种植参数配置', isIags: true },
  { icon: DollarSign, label: '成本核算', path: '/settings/cost-accounting', desc: '成本类别和预算管理' },
];

// 组5: IoT设备 — 硬件设备参数和管理（iAGS集成）
const iotDeviceSections = [
  { icon: Wrench, label: '系统管理', path: '/settings/device-systems', desc: '设备系统类型定义和IDC关联', isIags: true },
  { icon: Video, label: '视频管理', path: '/settings/cameras', desc: '摄像头注册和RTSP视频流地址配置', isIags: true },
  { icon: Droplets, label: '水肥一体机', path: '/settings/water-fertilizer', desc: '灌溉时段、间隔和ABC混合比例参数配置', isIags: true },
  { icon: Monitor, label: '设备管理', path: '/settings/device', desc: 'IoT设备注册与监控配置' },
  { icon: MonitorCheck, label: '设备分配', path: '/settings/device-distribution', desc: 'IoT设备分配到温室区域 + 运行参数', isIags: true },
  { icon: Bug, label: '工程调试', path: '/settings/project-debug', desc: 'HMI版本、数据库测试、系统诊断工具', isIags: true },
];

// 组6: 监控告警 — 系统监控与合规
const monitorSections = [
  { icon: Server, label: '系统监控', path: '/settings/monitor', desc: '服务器和服务运行状态监控' },
  { icon: DatabaseBackup, label: '备份恢复', path: '/settings/backup', desc: '数据备份与恢复管理' },
  { icon: Zap, label: '能耗管理', path: '/settings/energy-configs', desc: '大棚能耗类型和计量设备配置', isIags: true },
  { icon: AlertTriangle, label: '警报管理', path: '/settings/alarm-configs', desc: '三级警报级别和通知规则配置', isIags: true },
];

// 组7: 运营管理 — 仓库、班组与人事
const operationSections = [
  { icon: Warehouse, label: '仓库管理', path: '/settings/warehouse', desc: '仓库信息配置' },
  { icon: Users, label: '班组管理', path: '/settings/team', desc: '班组和班次管理' },
  { icon: Users, label: '人事管理', path: '/settings/personnel', desc: '管理员工和职务' },
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
      <SectionGroup title="基础数据" subtitle="核心系统配置与日志" sections={basicDataSections} />

      {/* 组2: 农场结构 */}
      <SectionGroup title="农场结构" subtitle="基地 · 大棚 · 分区 · 区块（物理空间架构）" sections={farmStructureSections} />

      {/* 组3: 权限管理 */}
      <SectionGroup title="权限管理" subtitle="安全与流程控制" sections={permissionSections} />

      {/* 组4: 生产配置 */}
      <SectionGroup title="生产配置" subtitle="作物、工序与成本" sections={productionSections} />

      {/* 组5: IoT设备 */}
      <SectionGroup title="IoT设备" subtitle="硬件设备参数和管理（iAGS集成）" sections={iotDeviceSections} />

      {/* 组6: 监控告警 */}
      <SectionGroup title="监控告警" subtitle="系统监控与合规" sections={monitorSections} />

      {/* 组7: 运营管理 */}
      <SectionGroup title="运营管理" subtitle="仓库、班组与人事" sections={operationSections} />

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
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <section.icon className="w-6 h-6 text-emerald-600" />
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
