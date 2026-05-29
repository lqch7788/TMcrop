/**
 * 用户基地权限配置页面
 * 管理用户对特定基地的访问权限
 * 布局：左侧用户列表，右侧基地权限矩阵
 */

import { useState, useEffect } from 'react';
import {
  Building2, Search, Save, Check, X, Loader2, CheckSquare, Square,
} from 'lucide-react';
import { useOrganizationStore } from '@/stores';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// 访问级别配置
const ACCESS_LEVELS = [
  { code: 'read', name: '只读', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { code: 'write', name: '读写', color: 'bg-green-100 text-green-700 border-green-300' },
  { code: 'admin', name: '管理', color: 'bg-purple-100 text-purple-700 border-purple-300' },
];

interface UserBasePermission {
  id: string;
  user_oid: string;
  base_oid: string;
  base_name: string;
  access_level: string;
  created_at?: string;
  updated_at?: string;
}

interface Base {
  baseOid: string;
  baseName: string;
}

export default function UserBasePermission() {
  // Store
  const users = useOrganizationStore((s) => s.users);
  const loadUsers = useOrganizationStore((s) => s.loadUsers);

  // 状态
  const [selectedUserOid, setSelectedUserOid] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ oid: string; username?: string; real_name?: string; name?: string } | null>(null);
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [userPermissions, setUserPermissions] = useState<UserBasePermission[]>([]);
  const [allBases, setAllBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 权限变更 (baseOid -> accessLevel)
  const [permissionChanges, setPermissionChanges] = useState<Map<string, string>>(new Map());

  // 初始加载
  useEffect(() => {
    loadUsers();
    loadAllBases();
  }, []);

  // 默认选择第一个用户
  useEffect(() => {
    if (!selectedUserOid && users.length > 0) {
      setSelectedUserOid(users[0].oid);
    }
  }, [users, selectedUserOid]);

  // 选择用户后加载权限
  useEffect(() => {
    if (!selectedUserOid) {
      setSelectedUser(null);
      setUserPermissions([]);
      return;
    }

    const user = users.find((u) => u.oid === selectedUserOid) || null;
    setSelectedUser(user);
    loadUserPermissions(selectedUserOid);
    setPermissionChanges(new Map());
  }, [selectedUserOid, users]);

  // 加载用户权限
  const loadUserPermissions = async (userOid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user-base-permissions?userOid=${userOid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserPermissions(data || []);
      }
    } catch (error) {
      console.error('加载用户基地权限失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载所有可用基地
  const loadAllBases = async () => {
    try {
      const res = await fetch('/api/user-base-permissions/all-bases', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllBases(data || []);
      }
    } catch (error) {
      console.error('加载基地列表失败:', error);
    }
  };

  // 获取某个基地的当前权限级别
  const getAccessLevel = (baseOid: string): string => {
    if (permissionChanges.has(baseOid)) {
      return permissionChanges.get(baseOid)!;
    }
    const perm = userPermissions.find(p => p.base_oid === baseOid);
    return perm?.access_level || 'none';
  };

  // 检查是否有变更
  const hasChanges = (baseOid: string): boolean => {
    const currentLevel = getAccessLevel(baseOid);
    const originalPerm = userPermissions.find(p => p.base_oid === baseOid);
    const originalLevel = originalPerm?.access_level || 'none';
    return currentLevel !== originalLevel;
  };

  // 处理权限变更
  const handleAccessLevelChange = (baseOid: string, accessLevel: string) => {
    const newChanges = new Map(permissionChanges);
    if (accessLevel === 'none') {
      // 如果是取消权限，从userPermissions中移除
      if (!userPermissions.find(p => p.base_oid === baseOid)) {
        // 该基地原本就没有权限，直接删除pending
        newChanges.delete(baseOid);
      } else {
        newChanges.set(baseOid, 'none');
      }
    } else {
      newChanges.set(baseOid, accessLevel);
    }
    setPermissionChanges(newChanges);
  };

  // 保存单个权限变更
  const savePermission = async (baseOid: string) => {
    if (!selectedUserOid) return;

    const accessLevel = getAccessLevel(baseOid);
    const base = allBases.find(b => b.baseOid === baseOid);

    setSaving(true);
    try {
      const res = await fetch('/api/user-base-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userOid: selectedUserOid,
          baseOid,
          baseName: base?.baseName || baseOid,
          accessLevel,
        }),
      });

      if (res.ok) {
        await loadUserPermissions(selectedUserOid);
        setPermissionChanges(prev => {
          const newMap = new Map(prev);
          newMap.delete(baseOid);
          return newMap;
        });
      }
    } catch (error) {
      console.error('保存权限失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 批量保存所有变更
  const saveAllChanges = async () => {
    if (!selectedUserOid || permissionChanges.size === 0) return;

    setSaving(true);
    try {
      const permissions = Array.from(permissionChanges.entries()).map(([baseOid, accessLevel]) => {
        const base = allBases.find(b => b.baseOid === baseOid);
        return { baseOid, baseName: base?.baseName || baseOid, accessLevel };
      });

      const res = await fetch('/api/user-base-permissions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userOid: selectedUserOid,
          permissions,
        }),
      });

      if (res.ok) {
        await loadUserPermissions(selectedUserOid);
        setPermissionChanges(new Map());
      }
    } catch (error) {
      console.error('批量保存权限失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 过滤后的用户列表
  const filteredUsers = users.filter(u => {
    const term = searchUserTerm.toLowerCase();
    const name = (u.real_name || u.name || '').toLowerCase();
    const username = (u.username || u.aid || '').toLowerCase();
    return name.includes(term) || username.includes(term);
  });

  // 是否有任何变更
  const hasAnyChanges = permissionChanges.size > 0;

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)]">
      {/* 左侧：用户列表 */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-3">用户列表</h3>

          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchUserTerm}
              onChange={(e) => setSearchUserTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 用户列表 */}
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.map((user) => {
              const isSelected = selectedUserOid === user.oid;
              return (
                <button
                  key={user.oid}
                  onClick={() => setSelectedUserOid(user.oid)}
                  className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 ${
                    isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-medium flex-shrink-0">
                    {(user.real_name || user.name || user.username || user.aid || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.real_name || user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      @{user.username || user.aid}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧：基地权限矩阵 */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm p-4 flex-1 flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                {selectedUser ? `${selectedUser.real_name || selectedUser.name} 的基地权限` : '基地权限'}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                共 {allBases.length} 个基地
              </p>
            </div>

            {/* 保存按钮 */}
            {hasAnyChanges && (
              <Button
                onClick={saveAllChanges}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存全部 ({permissionChanges.size})
              </Button>
            )}
          </div>

          {/* 基地列表 */}
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : allBases.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无基地数据</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600">
                  <tr>
                    <th className="text-left py-2.5 px-3 text-sm font-medium text-white w-8">
                      {/* 选择状态指示 */}
                    </th>
                    <th className="text-left py-2.5 px-3 text-sm font-medium text-white">基地名称</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-white">只读</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-white">读写</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-white">管理</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-white w-20">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {allBases.map((base) => {
                    const accessLevel = getAccessLevel(base.baseOid);
                    const currentPerm = userPermissions.find(p => p.base_oid === base.baseOid);
                    const isGranted = !!currentPerm || permissionChanges.has(base.baseOid);
                    const changed = hasChanges(base.baseOid);
                    const isSaving = saving && changed;

                    return (
                      <tr
                        key={base.baseOid}
                        className={`border-b border-gray-400 hover:bg-gray-50 ${
                          changed ? 'bg-amber-50' : ''
                        }`}
                      >
                        {/* 选择状态 */}
                        <td className="py-2.5 px-3">
                          {isGranted ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </td>

                        {/* 基地名称 */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{base.baseName}</span>
                            {changed && (
                              <span className="text-xs text-amber-600">(已修改)</span>
                            )}
                          </div>
                        </td>

                        {/* 只读 */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleAccessLevelChange(base.baseOid, 'read')}
                            className={`w-5 h-5 rounded text-xs font-medium border-2 transition-colors flex items-center justify-center ${
                              accessLevel === 'read'
                                ? 'bg-blue-100 text-blue-700 border-blue-500'
                                : 'bg-white text-gray-400 border-gray-400 hover:border-blue-400 hover:text-blue-500'
                            }`}
                          >
                            {accessLevel === 'read' ? <Check className="w-2 h-2" /> : ''}
                          </button>
                        </td>

                        {/* 读写 */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleAccessLevelChange(base.baseOid, 'write')}
                            className={`w-5 h-5 rounded text-xs font-medium border-2 transition-colors flex items-center justify-center ${
                              accessLevel === 'write'
                                ? 'bg-green-100 text-green-700 border-green-500'
                                : 'bg-white text-gray-400 border-gray-400 hover:border-green-400 hover:text-green-500'
                            }`}
                          >
                            {accessLevel === 'write' ? <Check className="w-2 h-2" /> : ''}
                          </button>
                        </td>

                        {/* 管理 */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleAccessLevelChange(base.baseOid, 'admin')}
                            className={`w-5 h-5 rounded text-xs font-medium border-2 transition-colors flex items-center justify-center ${
                              accessLevel === 'admin'
                                ? 'bg-purple-100 text-purple-700 border-purple-500'
                                : 'bg-white text-gray-400 border-gray-400 hover:border-purple-400 hover:text-purple-500'
                            }`}
                          >
                            {accessLevel === 'admin' ? <Check className="w-2 h-2" /> : ''}
                          </button>
                        </td>

                        {/* 操作 */}
                        <td className="py-2.5 px-3 text-center">
                          {isGranted && accessLevel !== 'none' && (
                            <div className="flex items-center justify-center gap-1">
                              {changed && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => savePermission(base.baseOid)}
                                  disabled={saving}
                                  className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAccessLevelChange(base.baseOid, 'none')}
                                disabled={saving}
                                className="h-8 px-3 text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {!isGranted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAccessLevelChange(base.baseOid, 'read')}
                              disabled={saving}
                              className="h-8 px-3 text-xs"
                            >
                              授权
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
