/**
 * 用户管理页面
 * 用户 CRUD + 角色分配 + 启停 + 修改密码
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDragResize } from './useDragResize';
import { Edit2, Eye, EyeOff, Key, Plus, RefreshCw, RotateCcw, Save, Search, Shield, Trash2, UserCheck, UserX, Users, X } from 'lucide-react';
import { useOrganizationStore, useDepartmentStore } from '@/stores';
import type { User, OrgStatus, Organization } from '@/types/authority';
import * as authorityService from '@/services/authorityService';
import { Button } from '@/components/ui';
import { Pagination } from '@/components/ui';

// ==================== 辅助函数 ====================

/** 组织树节点：后端把子组织放在 children 里，store 顶层只存根节点 */
type OrgNode = Organization & { children?: OrgNode[] };

/**
 * 递归查找组织（含子组织）
 * 修复：原来只用 organizations.find 在顶层数组找，子组织（如生产部）
 * 永远查不到，表格里就会直接显示原始 OID
 */
function findOrgDeep(nodes: OrgNode[], oid: string): OrgNode | null {
  for (const node of nodes) {
    if (node.oid === oid) return node;
    const hit = node.children?.length ? findOrgDeep(node.children, oid) : null;
    if (hit) return hit;
  }
  return null;
}

/** 把组织树展平为下拉选项（带层级缩进），保证子组织/部门可选 */
function flattenOrgs(nodes: OrgNode[], depth = 0): Array<{ oid: string; name: string; depth: number }> {
  const out: Array<{ oid: string; name: string; depth: number }> = [];
  for (const node of nodes) {
    if (node.oid) out.push({ oid: node.oid, name: node.name, depth });
    if (node.children?.length) out.push(...flattenOrgs(node.children, depth + 1));
  }
  return out;
}

// ==================== 组件 ====================

export default function UserManagement() {
  // Store
  const users = useOrganizationStore((s) => s.users);
  const loadUsers = useOrganizationStore((s) => s.loadUsers);
  const saveUser = useOrganizationStore((s) => s.saveUser);
  const deleteUser = useOrganizationStore((s) => s.deleteUser);

  const organizations = useOrganizationStore((s) => s.organizations);
  const loadOrganizations = useOrganizationStore((s) => s.loadOrganizations);

  const roles = useOrganizationStore((s) => s.roles);
  const loadRoles = useOrganizationStore((s) => s.loadRoles);

  // 部门列表（用于显示自动关联的部门信息）
  const departments = useDepartmentStore((s) => s.departments);
  const loadDepartments = useDepartmentStore((s) => s.loadDepartments);

  // UI 状态
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const pageSize = 10;

  // 弹窗状态
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [userForm, setUserForm] = useState({
    username: '', realName: '', password: '', orgOid: '',
    // 2026-10-25：新增可显式指定的部门（此前只能由所属组织自动带出）
    departmentOid: '',
    email: '', phone: '', status: 'active' as OrgStatus,
  });
  const [userRoleOids, setUserRoleOids] = useState<string[]>([]);

  // 密码弹窗
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  // 2026-10-25：密码框显示/隐藏切换
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // 弹窗拖拽/缩放
  const d1 = useDragResize({ initialWidth: 550, initialHeight: 520 });
  const d2 = useDragResize({ initialWidth: 400, initialHeight: 250 });
  const d3 = useDragResize({ initialWidth: 400, initialHeight: 220 });
  useEffect(() => { if (showUserModal) d1.resetPosition(); }, [showUserModal]);
  useEffect(() => { if (showPasswordModal) d2.resetPosition(); }, [showPasswordModal]);
  useEffect(() => { if (deleteTarget) d3.resetPosition(); }, [deleteTarget]);

  // 初始加载
  useEffect(() => {
    loadUsers();
    loadOrganizations();
    loadDepartments();
    loadRoles();
  }, []);

  // 获取组织名称（递归查子组织；找不到时不再回退显示原始 OID）
  const getOrgName = (orgOid: string) => {
    if (!orgOid) return '-';
    const org = findOrgDeep(organizations as OrgNode[], orgOid);
    return org?.name || '未知组织';
  };

  // 获取组织关联的部门信息（递归查子组织）
  const getOrgLinkedDept = (orgOid: string) => {
    const org = findOrgDeep(organizations as OrgNode[], orgOid);
    if (org?.departmentId) {
      const dept = departments.find((d) => (d.id || d.oid) === org.departmentId);
      return dept?.name || org.departmentName || org.departmentId;
    }
    return null;
  };

  // 获取组织关联的部门 ID（用于「所属组织」切换时预填部门下拉）
  const getOrgLinkedDeptId = (orgOid: string): string => {
    const org = findOrgDeep(organizations as OrgNode[], orgOid);
    return org?.departmentId || '';
  };

  // 通过部门OID获取部门名称（部门表查不到时返回 null，由表格显示 '-'）
  const getDeptName = (deptOid: string | undefined) => {
    if (!deptOid) return null;
    const dept = departments.find((d) => (d.id || d.oid) === deptOid);
    return dept?.name || null;
  };

  // 筛选
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = (u.real_name || u.name || '').toLowerCase();
        const uname = (u.username || u.aid || '').toLowerCase();
        if (!name.includes(term) && !uname.includes(term)) return false;
      }
      return true;
    });
  }, [users, searchTerm, statusFilter]);

  // 分页
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ========== 弹窗操作 ==========

  const openAddModal = () => {
    setEditingUser(null);
    const firstOrgOid = organizations[0]?.oid || '';
    setUserForm({
      username: '', realName: '', password: '', orgOid: firstOrgOid,
      departmentOid: getOrgLinkedDeptId(firstOrgOid),
      email: '', phone: '', status: 'active',
    });
    setUserRoleOids([]);
    setShowUserModal(true);
  };

  const openEditModal = async (user: User) => {
    setEditingUser(user);
    const orgOid = user.org_oid || user.orgOid || '';
    setUserForm({
      username: (user.username || user.aid || '') as string,
      realName: (user.real_name || user.name || '') as string,
      password: '',
      orgOid,
      // 优先用用户自己的部门；没有则沿用组织的关联部门
      departmentOid: (user.department_oid || user.departmentOid || '') || getOrgLinkedDeptId(orgOid),
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || 'active',
    });
    // 加载用户角色
    try {
      const roleOids = await authorityService.getUserRoles(user.oid);
      setUserRoleOids(roleOids);
    } catch {
      setUserRoleOids([]);
    }
    setShowUserModal(true);
  };

  const handleUserSave = async () => {
    if (!userForm.username || !userForm.realName) return;

    const payload: Partial<User> = {
      oid: editingUser?.oid || `USER_${Date.now()}`,
      username: userForm.username,
      real_name: userForm.realName,
      org_oid: userForm.orgOid,
      // 空字符串表示"明确不指定部门"，后端据此写 NULL 且不再按组织自动填充
      department_oid: userForm.departmentOid,
      email: userForm.email,
      phone: userForm.phone,
      status: userForm.status,
      passwordHash: userForm.password || undefined,
    };

    await saveUser(payload);

    // 保存用户角色
    if (userRoleOids.length > 0) {
      try {
        await authorityService.assignUserRoles(payload.oid!, userRoleOids);
      } catch (err) {
        // logger.error('保存用户角色失败:', err);
      }
    }

    setShowUserModal(false);
    loadUsers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget);
    setDeleteTarget(null);
    loadUsers();
  };

  const openPasswordModal = (user: User) => {
    setPasswordUser(user);
    setNewPassword('');
    setShowNewPassword(false); // 每次打开默认隐藏
    setShowPasswordModal(true);
  };

  const handlePasswordChange = async () => {
    if (!passwordUser || !newPassword) return;
    try {
      await fetch(`/api/authority/users/${passwordUser.oid}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ newPassword }),
      });
      setShowPasswordModal(false);
    } catch (err) {
      // logger.error('修改密码失败:', err);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`/api/authority/users/${user.oid}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status: newStatus }),
      });
      loadUsers();
    } catch (err) {
      // logger.error('启停用户失败:', err);
    }
  };

  // ========== 渲染 ==========

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" placeholder="搜索..."
              value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-36 h-8 pl-7 pr-2 border border-gray-200 rounded text-xs"
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="h-8 px-2 border border-gray-200 rounded text-xs">
            <option value="all">全部</option>
            <option value="active">启用</option>
            <option value="inactive">禁用</option>
          </select>
          {/* 2026-10-25：原 className 里的 text-gray-500 / hover:text-gray-700
              覆盖了 warning 变体自带的 text-white，导致橙底灰字看不清 */}
          <Button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            variant="warning"
            className="h-8 px-2 text-xs bg-amber-600 hover:bg-amber-700">
            <RotateCcw className="w-4 h-4" /> 重置
          </Button>
          <Button onClick={openAddModal}
            className="h-8 px-3 bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增用户
          </Button>
        </div>
      </div>

      {/* 用户表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-b">
              <th className="text-left py-2.5 px-4 font-medium text-white">用户名</th>
              <th className="text-left py-2.5 px-4 font-medium text-white">姓名</th>
              <th className="text-left py-2.5 px-4 font-medium text-white">所属组织</th>
              <th className="text-left py-2.5 px-4 font-medium text-white">部门</th>
              <th className="text-left py-2.5 px-4 font-medium text-white">邮箱/电话</th>
              <th className="text-center py-2.5 px-4 font-medium text-white w-20">状态</th>
              <th className="text-right py-2.5 px-4 font-medium text-white w-44">操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((user) => (
              <tr key={user.oid} className="border-b border-gray-300 hover:bg-blue-50">
                <td className="py-2 px-4 text-gray-700 font-medium">{user.username || user.aid}</td>
                <td className="py-2 px-4 text-gray-700">{user.real_name || user.name}</td>
                <td className="py-2 px-4 text-gray-500">{getOrgName(user.org_oid || user.orgOid || '')}</td>
                <td className="py-2 px-4">
                  {(() => {
                    const deptOid = user.department_oid || user.departmentOid;
                    if (deptOid) {
                      const deptName = getDeptName(deptOid);
                      // 查不到部门名时不再回退显示原始 ID，交由下方组织关联兜底
                      if (deptName) {
                        return (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded">
                            {deptName}
                          </span>
                        );
                      }
                    }
                    // 尝试从组织获取关联部门
                    const orgOid = user.org_oid || user.orgOid;
                    const linkedDept = orgOid ? getOrgLinkedDept(orgOid) : null;
                    if (linkedDept) {
                      return (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded" title="保存后自动关联">
                          {linkedDept}
                        </span>
                      );
                    }
                    return <span className="text-xs text-gray-400">-</span>;
                  })()}
                </td>
                <td className="py-2 px-4 text-xs text-gray-400">
                  {user.email && <span>{user.email}</span>}
                  {user.phone && <span className="ml-2">{user.phone}</span>}
                </td>
                <td className="py-2 px-4 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                    user.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {user.status === 'active' ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(user)} className="p-1 border border-gray-300 rounded text-blue-500 hover:border-blue-500" title="编辑">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openPasswordModal(user)} className="p-1 border border-gray-300 rounded text-amber-600 hover:border-amber-500" title="修改密码">
                      <Key className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(user)} className="p-1 border border-gray-300 rounded text-purple-500 hover:border-purple-500" title={user.status === 'active' ? '禁用' : '启用'}>
                      {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(user.oid)} className="p-1 border border-gray-300 rounded text-red-500 hover:border-red-500" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {pagedUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">暂无用户数据</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-blue-50/30">
            <span className="text-sm text-gray-500">共 {filteredUsers.length} 名用户</span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ========== 新增/编辑弹窗 ========== */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowUserModal(false)}>
          <div className="absolute bg-white rounded-xl shadow-2xl"
            style={{
              width: d1.size.width,
              left: `calc(50% - ${d1.size.width / 2}px + ${d1.position.x}px)`,
              top: `calc(50% - ${d1.size.height / 2}px + ${d1.position.y}px)`,
            }}
            onClick={(e) => e.stopPropagation()}>
            {d1.resizeHandles}
            <div
              className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl p-4 flex items-center justify-between cursor-move select-none"
              onMouseDown={d1.startDrag}
            >
              <h3 className="text-white font-semibold">{editingUser ? '编辑用户' : '新增用户'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowUserModal(false)} className="text-white/70 hover:text-white hover:bg-white/20"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">用户名 *</label>
                  <input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full h-9 px-2 border border-gray-200 rounded text-sm" placeholder="登录账号" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">姓名 *</label>
                  <input value={userForm.realName} onChange={(e) => setUserForm({ ...userForm, realName: e.target.value })}
                    className="w-full h-9 px-2 border border-gray-200 rounded text-sm" placeholder="真实姓名" />
                </div>
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">初始密码</label>
                  <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full h-9 px-2 border border-gray-200 rounded text-sm" placeholder="留空则使用默认密码" />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">所属组织</label>
                {/* 2026-10-25：原来只列顶层组织（公司），选不到生产部/后勤部等子组织；
                    改为展平整棵组织树，带层级缩进 */}
                <select value={userForm.orgOid} onChange={(e) => {
                  const newOrgOid = e.target.value;
                  // 切换组织时按组织关联部门预填（仍可手工改）
                  setUserForm({ ...userForm, orgOid: newOrgOid, departmentOid: getOrgLinkedDeptId(newOrgOid) });
                }}
                  className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                  {flattenOrgs(organizations as OrgNode[]).map((org) => (
                    <option key={org.oid} value={org.oid}>{'　'.repeat(org.depth)}{org.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">所属部门</label>
                <select value={userForm.departmentOid} onChange={(e) => setUserForm({ ...userForm, departmentOid: e.target.value })}
                  className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                  <option value="">不指定部门</option>
                  {departments.map((dept) => (
                    <option key={dept.id || dept.oid} value={dept.id || dept.oid}>{dept.name}</option>
                  ))}
                </select>
                {userForm.departmentOid && userForm.departmentOid === getOrgLinkedDeptId(userForm.orgOid) && (
                  <p className="text-xs text-emerald-600 mt-1">已按所属组织自动关联，可手工修改</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                  <input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full h-9 px-2 border border-gray-200 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">电话</label>
                  <input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full h-9 px-2 border border-gray-200 rounded text-sm" />
                </div>
              </div>
              {/* 角色分配 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">角色分配</label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
                  {roles.map((role) => (
                    <label key={role.oid} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-blue-50 py-0.5 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={userRoleOids.includes(role.oid ?? '')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserRoleOids([...userRoleOids, role.oid ?? '']);
                          } else {
                            setUserRoleOids(userRoleOids.filter((r) => r !== role.oid));
                          }
                        }}
                        className="rounded"
                      />
                      {/* 后端 /authority/roles 返回的是驼峰 roleName/roleCode（另有 aid/name 别名），
                          无 role_name/role_code，原写法导致复选框旁文字恒为空 */}
                      <span className="text-gray-700">{role.role_name || role.roleName || role.name}</span>
                      <span className="text-xs text-gray-400 font-mono ml-auto">{role.role_code || role.roleCode || role.aid}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <Button onClick={() => setShowUserModal(false)} className="h-8 px-4 text-sm border border-gray-200 rounded"><X className="w-4 h-4" /> 取消</Button>
              <Button onClick={handleUserSave} className="h-8 px-4 text-sm bg-blue-500 text-white hover:bg-blue-600"><Save className="w-4 h-4" /> 保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 修改密码弹窗 ========== */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowPasswordModal(false)}>
          <div className="absolute bg-white rounded-xl shadow-2xl"
            style={{
              width: d2.size.width,
              left: `calc(50% - ${d2.size.width / 2}px + ${d2.position.x}px)`,
              top: `calc(50% - ${d2.size.height / 2}px + ${d2.position.y}px)`,
            }}
            onClick={(e) => e.stopPropagation()}>
            {d2.resizeHandles}
            <div
              className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl p-4 flex items-center justify-between cursor-move select-none"
              onMouseDown={d2.startDrag}
            >
              <h3 className="text-white font-semibold">修改密码 - {passwordUser.real_name || passwordUser.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPasswordModal(false)} className="text-white/70 hover:text-white hover:bg-white/20"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-5">
              <label className="block text-xs text-gray-500 mb-1">新密码</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 pl-2 pr-9 border border-gray-200 rounded text-sm"
                  placeholder="输入新密码"
                />
                {/* 2026-10-25：显示/隐藏密码，避免用户看不到输入内容 */}
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded"
                  title={showNewPassword ? '隐藏密码' : '显示密码'}
                  aria-label={showNewPassword ? '隐藏密码' : '显示密码'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <Button onClick={() => setShowPasswordModal(false)} className="h-8 px-4 text-sm border border-gray-200 rounded"><X className="w-4 h-4" /> 取消</Button>
              <Button onClick={handlePasswordChange} className="h-8 px-4 text-sm bg-amber-600 text-white hover:bg-amber-700"><Edit2 className="w-4 h-4" /> 确认修改</Button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 删除确认弹窗 ========== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDeleteTarget(null)}>
          <div className="absolute bg-white rounded-xl shadow-2xl"
            style={{
              width: d3.size.width,
              left: `calc(50% - ${d3.size.width / 2}px + ${d3.position.x}px)`,
              top: `calc(50% - ${d3.size.height / 2}px + ${d3.position.y}px)`,
            }}
            onClick={(e) => e.stopPropagation()}>
            {d3.resizeHandles}
            <div
              className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl p-4 cursor-move select-none"
              onMouseDown={d3.startDrag}
            >
              <h3 className="text-white font-semibold">确认删除用户</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600">删除后用户将无法登录系统，确定要删除吗？</p>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <Button onClick={() => setDeleteTarget(null)} className="h-8 px-4 text-sm border border-gray-200 rounded"><X className="w-4 h-4" /> 取消</Button>
              <Button onClick={handleDelete} className="h-8 px-4 text-sm bg-red-500 text-white hover:bg-red-600"><Trash2 className="w-4 h-4" /> 确认删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
