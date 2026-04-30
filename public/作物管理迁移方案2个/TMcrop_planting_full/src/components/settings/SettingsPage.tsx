import { Settings as SettingsIcon, Leaf, MapPin, Sprout, Package, ScrollText, Users, Target, ChevronRight, Building2 } from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';

const settingsSections = [
  { icon: Building2, label: '基地设置', path: '/settings/bases', desc: '管理基地信息配置' },
  { icon: MapPin, label: '区域管理', path: '/settings/regions', desc: '管理种植区域和地块' },
  { icon: Leaf, label: '种植模式管理', path: '/settings/modes', desc: '管理种植模式配置' },
  { icon: Sprout, label: '作物管理', path: '/settings/crops', desc: '管理作物种类和品种' },
  { icon: Package, label: '物料管理', path: '/settings/materials', desc: '管理物资分类和物料' },
  { icon: ScrollText, label: '工序管理', path: '/settings/processes', desc: '定义标准农事工序' },
  { icon: Users, label: '人事管理', path: '/settings/personnel', desc: '管理员工和职务' },
  { icon: Target, label: '部门设置', path: '/settings/departments', desc: '设置组织架构' },
];

export function SettingsPage() {
  const location = useLocation();
  const isSubPage = location.pathname !== '/settings';

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 space-y-6">
        {/* 主页面标题卡片 */}
        {!isSubPage && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <SettingsIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
                <p className="text-sm text-gray-500 mt-1">管理系统配置和基础数据</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Grid - only show on main settings page */}
        {!isSubPage && (
          <>
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
          </>
        )}

        {/* Render nested routes */}
        <Outlet />
      </div>

      {/* System Info - 固定在页面最下方 */}
      {!isSubPage && (
        <div className="bg-white rounded-xl py-2 px-4 shadow-sm border border-gray-100 mt-6">
          <h3 className="font-semibold text-gray-900 mb-2">系统信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '系统版本', value: 'v3.0.0' },
              { label: '数据库版本', value: 'PostgreSQL 14' },
              { label: '最后更新', value: '2026-03-26' },
              { label: '在线用户', value: '12人' },
            ].map((info, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{info.label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{info.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
