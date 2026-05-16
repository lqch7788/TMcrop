/**
 * 用户权限管理 - 统一入口页面（内联TAB）
 * 合并：组织管理 / 角色管理 / 权限配置 / 用户管理 / 用户权限覆盖
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Building2, Key, Users, GitBranch, ChevronLeft } from 'lucide-react';
import OrganizationManagement from './OrganizationManagement';
import RoleManagement from './RoleManagement';
import AuthorityConfiguration from './AuthorityConfiguration';
import UserManagement from './UserManagement';
import UserAuthorityConfig from './UserAuthorityConfig';

const TABS = [
  { key: 'organizations', label: '组织管理', icon: Building2, desc: '组织架构树形管理' },
  { key: 'roles', label: '角色管理', icon: Shield, desc: '角色定义与组织关联' },
  { key: 'authority', label: '权限配置', icon: Key, desc: '工序菜单与角色权限矩阵' },
  { key: 'users', label: '用户管理', icon: Users, desc: '用户账号与角色分配' },
  { key: 'user-authority', label: '用户权限覆盖', icon: GitBranch, desc: '特定用户权限覆盖' },
];

export default function UserPermissionHub() {
  const [activeTab, setActiveTab] = useState('organizations');

  const renderContent = () => {
    switch (activeTab) {
      case 'organizations': return <OrganizationManagement />;
      case 'roles': return <RoleManagement />;
      case 'authority': return <AuthorityConfiguration />;
      case 'users': return <UserManagement />;
      case 'user-authority': return <UserAuthorityConfig />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户权限管理</h1>
            <p className="text-gray-500">组织架构 · 角色定义 · 权限矩阵 · 用户管理 · 权限覆盖</p>
          </div>
        </div>
      </div>

      {/* TAB 导航栏 */}
      <div className="bg-white rounded-xl shadow-sm p-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={tab.desc}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 内容区 */}
      <div>{renderContent()}</div>
    </div>
  );
}
