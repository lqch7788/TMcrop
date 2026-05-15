/**
 * 用户权限管理 - 重定向页面
 * 旧版权限管理已迁移至新的组织与权限管理系统
 * 此页面保留作为导航入口，引导用户到新的权限管理页面
 */

import { Link } from 'react-router-dom';
import { Shield, Users, Building2, Key, GitBranch, ChevronLeft, ArrowRight } from 'lucide-react';

const authorityLinks = [
  {
    icon: Building2,
    label: '组织管理',
    path: '/settings/organizations',
    desc: '管理组织架构树形结构，支持公司/基地/区域/部门/车间层级',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    icon: Shield,
    label: '角色管理',
    path: '/settings/roles',
    desc: '定义系统角色，关联所属组织，配置角色权限矩阵',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    icon: Key,
    label: '权限配置',
    path: '/settings/authority-config',
    desc: '配置工序菜单与角色权限矩阵，管理数据权限范围',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    icon: Users,
    label: '用户管理',
    path: '/settings/users',
    desc: '管理用户账号、个人信息、角色分配与启用/停用',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    icon: GitBranch,
    label: '用户权限覆盖',
    path: '/settings/user-authority',
    desc: '为特定用户设置权限覆盖（允许/拒绝），优先级高于角色权限',
    color: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
];

export default function UserPermission() {
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户权限管理</h1>
            <p className="text-gray-500">权限管理系统已升级，请使用以下新功能模块</p>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>提示：</strong>旧版权限管理功能已迁移至全新的组织与权限管理系统。以下列出所有新的权限管理入口，请根据需要选择对应功能。
        </p>
      </div>

      {/* 权限管理入口卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {authorityLinks.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-6 h-6 ${item.textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {item.label}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
