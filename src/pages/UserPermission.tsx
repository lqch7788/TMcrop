import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Key, Search, Plus, Edit2, Trash2, CheckCircle, XCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  users: string[];
  status: 'active' | 'inactive';
}

interface User {
  id: string;
  name: string;
  username: string;
  department: string;
  position: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

const STORAGE_KEY = 'user_permission_data';

const DEFAULT_ROLES: Role[] = [
  { id: '1', name: '系统管理员', code: 'admin', description: '拥有系统所有权限', permissions: ['*'], users: ['admin'], status: 'active' },
  { id: '2', name: '生产主管', code: 'production_manager', description: '负责生产管理', permissions: ['production:*', 'tasks:*', 'reports:read'], users: ['张三'], status: 'active' },
  { id: '3', name: '仓库管理员', code: 'warehouse_manager', description: '负责仓库和物料管理', permissions: ['materials:*', 'warehouse:*'], users: ['李四'], status: 'active' },
  { id: '4', name: '普通员工', code: 'employee', description: '基础查看权限', permissions: ['*:read'], users: ['王五'], status: 'active' },
];

const DEFAULT_USERS: User[] = [
  { id: '1', name: '系统管理员', username: 'admin', department: 'IT部', position: '管理员', role: 'admin', status: 'active', lastLogin: '2024-03-15 10:30' },
  { id: '2', name: '张三', username: 'zhangsan', department: '生产部', position: '生产主管', role: 'production_manager', status: 'active', lastLogin: '2024-03-14 16:45' },
  { id: '3', name: '李四', username: 'lisi', department: '仓储部', position: '仓库管理员', role: 'warehouse_manager', status: 'active', lastLogin: '2024-03-15 09:15' },
  { id: '4', name: '王五', username: 'wangwu', department: '生产部', position: '技术员', role: 'employee', status: 'inactive', lastLogin: '2024-03-10 14:20' },
];

const DEFAULT_PERMISSIONS: Permission[] = [
  { id: '1', module: 'dashboard', action: 'read', description: '查看仪表盘' },
  { id: '2', module: 'production', action: 'read', description: '查看生产计划' },
  { id: '3', module: 'production', action: 'create', description: '创建生产计划' },
  { id: '4', module: 'production', action: 'update', description: '编辑生产计划' },
  { id: '5', module: 'production', action: 'delete', description: '删除生产计划' },
  { id: '6', module: 'tasks', action: 'read', description: '查看任务' },
  { id: '7', module: 'tasks', action: 'create', description: '创建任务' },
  { id: '8', module: 'tasks', action: 'update', description: '编辑任务' },
  { id: '9', module: 'materials', action: 'read', description: '查看物料' },
  { id: '10', module: 'materials', action: 'create', description: '创建物料' },
  { id: '11', module: 'warehouse', action: 'read', description: '查看仓库' },
  { id: '12', module: 'warehouse', action: 'update', description: '管理仓库' },
  { id: '13', module: 'reports', action: 'read', description: '查看报表' },
  { id: '14', module: 'settings', action: 'manage', description: '管理系统设置' },
];

export default function UserPermission() {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'permissions'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions] = useState<Permission[]>(DEFAULT_PERMISSIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role>>({ status: 'active' });
  const [newUser, setNewUser] = useState<Partial<User>>({ status: 'active' });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setRoles(data.roles || DEFAULT_ROLES);
      setUsers(data.users || DEFAULT_USERS);
    } else {
      setRoles(DEFAULT_ROLES);
      setUsers(DEFAULT_USERS);
    }
  }, []);

  useEffect(() => {
    if (roles.length > 0 && users.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roles, users }));
    }
  }, [roles, users]);

  const filteredRoles = roles.filter(r => r.name.includes(searchTerm) || r.code.includes(searchTerm));
  const filteredUsers = users.filter(u => u.name.includes(searchTerm) || u.username.includes(searchTerm));

  const handleSaveRole = () => {
    if (editingRole) {
      setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...newRole } as Role : r));
    } else {
      setRoles([...roles, { ...newRole, id: Date.now().toString(), permissions: newRole.permissions || [], users: newRole.users || [] } as Role]);
    }
    setShowRoleModal(false);
    setEditingRole(null);
    setNewRole({ status: 'active' });
  };

  const handleSaveUser = () => {
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...newUser } as User : u));
    } else {
      setUsers([...users, { ...newUser, id: Date.now().toString(), role: newUser.role || 'employee' } as User]);
    }
    setShowUserModal(false);
    setEditingUser(null);
    setNewUser({ status: 'active' });
  };

  const deleteRole = (id: string) => {
    if (confirm('确定删除该角色吗？')) {
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  const deleteUser = (id: string) => {
    if (confirm('确定删除该用户吗？')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const editRole = (role: Role) => {
    setEditingRole(role);
    setNewRole(role);
    setShowRoleModal(true);
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setNewUser(user);
    setShowUserModal(true);
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">用户权限管理</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'roles' as const, label: '角色管理', icon: Shield },
          { id: 'users' as const, label: '用户管理', icon: Users },
          { id: 'permissions' as const, label: '权限矩阵', icon: Key },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 角色管理 */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingRole(null); setNewRole({ status: 'active' }); setShowRoleModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增角色
            </button>
          </div>
          <div className="grid gap-4">
            {filteredRoles.map(role => (
              <div key={role.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-xs text-gray-500">{role.code}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    role.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {role.status === 'active' ? '启用' : '停用'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {role.permissions.slice(0, 6).map((p, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{p}</span>
                  ))}
                  {role.permissions.length > 6 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">+{role.permissions.length - 6}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">用户数: <span className="font-medium">{role.users.length}</span></p>
                  <div className="flex gap-2">
                    <button onClick={() => editRole(role)} className="p-1.5 hover:bg-gray-100 rounded">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => deleteRole(role.id)} className="p-1.5 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingUser(null); setNewUser({ status: 'active' }); setShowUserModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增用户
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">职位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后登录</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => {
                  const role = roles.find(r => r.code === user.role);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-medium">
                            {user.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.position}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">{role?.name || user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`flex items-center gap-1 text-sm ${user.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {user.status === 'active' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {user.status === 'active' ? '启用' : '停用'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{user.lastLogin}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => editUser(user)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button onClick={() => deleteUser(user.id)} className="p-1.5 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 权限矩阵 */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模块</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                {roles.map(role => (
                  <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{role.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permissions.map(perm => (
                <tr key={perm.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{perm.module}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{perm.action}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{perm.description}</td>
                  {roles.map(role => {
                    const hasAccess = role.permissions.includes('*') ||
                      role.permissions.includes(`${perm.module}:*`) ||
                      role.permissions.includes(`${perm.module}:${perm.action}`);
                    return (
                      <td key={role.id} className="px-6 py-4 text-center">
                        {hasAccess ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 角色编辑弹窗 */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingRole ? '编辑角色' : '新增角色'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
                <input
                  type="text"
                  value={newRole.name || ''}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="例如：生产主管"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色代码</label>
                <input
                  type="text"
                  value={newRole.code || ''}
                  onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="例如：production_manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newRole.description || ''}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                  placeholder="角色说明"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">权限列表（逗号分隔）</label>
                <input
                  type="text"
                  value={(newRole.permissions || []).join(', ')}
                  onChange={(e) => setNewRole({ ...newRole, permissions: e.target.value.split(',').map(p => p.trim()) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="production:*, tasks:read"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={newRole.status || 'active'}
                  onChange={(e) => setNewRole({ ...newRole, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveRole} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 用户编辑弹窗 */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingUser ? '编辑用户' : '新增用户'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={newUser.name || ''}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={newUser.username || ''}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <input
                  type="text"
                  value={newUser.department || ''}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
                <input
                  type="text"
                  value={newUser.position || ''}
                  onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={newUser.role || ''}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">请选择角色</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.code}>{role.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveUser} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
