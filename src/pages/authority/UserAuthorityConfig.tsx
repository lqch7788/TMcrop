/**
 * 用户特殊权限配置页面
 * 在角色权限基础上对单用户做增强(+1)或限制(0)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Search, RefreshCw, Save, Check, X, ArrowLeft, UserCog,
} from 'lucide-react';
import { useOrganizationStore } from '@/stores';
import type { User, Process } from '@/types/authority';
import * as authorityService from '@/services/authorityService';
import { Button } from '@/components/ui';

const ACTION_LIST = [
  { code: 'view', name: '查看', color: 'bg-blue-100 text-blue-700' },
  { code: 'create', name: '新增', color: 'bg-green-100 text-green-700' },
  { code: 'edit', name: '编辑', color: 'bg-amber-100 text-amber-700' },
  { code: 'delete', name: '删除', color: 'bg-red-100 text-red-700' },
  { code: 'export', name: '导出', color: 'bg-purple-100 text-purple-700' },
  { code: 'approve', name: '审批', color: 'bg-indigo-100 text-indigo-700' },
];

export default function UserAuthorityConfig() {
  // Store
  const users = useOrganizationStore((s) => s.users);
  const loadUsers = useOrganizationStore((s) => s.loadUsers);
  const processes = useOrganizationStore((s) => s.processes);
  const loadProcesses = useOrganizationStore((s) => s.loadProcesses);
  const roles = useOrganizationStore((s) => s.roles);
  const loadRoles = useOrganizationStore((s) => s.loadRoles);

  // 选中的用户
  const [selectedUserOid, setSelectedUserOid] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchUserTerm, setSearchUserTerm] = useState('');

  // 权限数据
  const [userAuthorities, setUserAuthorities] = useState<
    { processOid: string; actionOid: string; value: number }[]
  >([]);
  const [roleAuthorities, setRoleAuthorities] = useState<
    { processOid: string; actionOid: string; value: number }[]
  >([]);
  const [authorityChanges, setAuthorityChanges] = useState<
    Map<string, Map<string, number>>
  >(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // 初始加载
  useEffect(() => {
    loadUsers();
    loadProcesses();
    loadRoles();
  }, []);

  // 选择用户后加载权限
  useEffect(() => {
    if (!selectedUserOid) { setSelectedUser(null); return; }
    const user = users.find((u) => u.oid === selectedUserOid) || null;
    setSelectedUser(user);

    // 加载用户特殊权限
    authorityService.getUserAuthority?.(selectedUserOid)
      ?.then((data: { processOid: string; actionOid: string; value: number }[]) =>
        setUserAuthorities(data || [])
      )
      .catch(() => setUserAuthorities([]));

    // 加载用户角色权限(用于对比展示)
    authorityService.getUserRoles?.(selectedUserOid)
      ?.then(async (roleOids: string[]) => {
        const allAuths: { processOid: string; actionOid: string; value: number }[] = [];
        for (const roleOid of roleOids) {
          const auths = await authorityService.getRoleAuthority(roleOid, 0);
          allAuths.push(...auths.map((a: { processOid: string; actionOid: string; value: number }) => ({ ...a })));
        }
        setRoleAuthorities(allAuths);
      })
      .catch(() => setRoleAuthorities([]));

    setAuthorityChanges(new Map());
    setHasChanges(false);
  }, [selectedUserOid, users]);

  // 获取用户角色名称
  const userRoleNames = useMemo(() => {
    // 简单地显示用户信息中的组织
    if (!selectedUser) return '';
    return roles.filter((r) => r.org_oid === selectedUser.org_oid).map((r) => r.role_name).join('、');
  }, [selectedUser, roles]);

  // 获取权限值 (0=无权限, 1=角色权限, 2=用户特殊授权)
  const getAuthValue = (processOid: string, actionCode: string): { val: number; source: string } => {
    // 先看本地修改
    if (authorityChanges.has(processOid) && authorityChanges.get(processOid)!.has(actionCode)) {
      return { val: authorityChanges.get(processOid)!.get(actionCode)!, source: 'local' };
    }
    // 用户特殊权限
    const ua = userAuthorities.find((a) => a.processOid === processOid && a.actionOid === actionCode);
    if (ua) return { val: ua.value + 1, source: 'user_override' }; // +1 将 0/1 映射为 1/2 方便显示
    // 角色权限
    const ra = roleAuthorities.find((a) => a.processOid === processOid && a.actionOid === actionCode);
    if (ra && ra.value >= 1) return { val: 1, source: 'role' };
    return { val: 0, source: 'none' };
  };

  const cycleValue = (processOid: string, actionCode: string) => {
    setAuthorityChanges((prev) => {
      const next = new Map(prev);
      if (!next.has(processOid)) next.set(processOid, new Map());
      const current = getAuthValue(processOid, actionCode);
      // 三态循环: 原始权限 → 强制允许(1) → 强制拒绝(0) → 清除(恢复原始)
      if (current.source === 'local') {
        if (current.val === 1) {
          next.get(processOid)!.set(actionCode, 0); // 允许 → 拒绝
        } else {
          // 拒绝(val=0) → 清除，恢复原始权限
          next.get(processOid)!.delete(actionCode);
          if (next.get(processOid)!.size === 0) next.delete(processOid);
        }
      } else {
        // 原始状态(角色/无权限/用户覆盖) → 强制允许
        next.get(processOid)!.set(actionCode, 1);
      }
      return next;
    });
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (!selectedUserOid) return;
    const authorities: { processOid: string; actionOid: string; value: number }[] = [];
    for (const [processOid, actions] of authorityChanges) {
      for (const [actionCode, value] of actions) {
        authorities.push({ processOid, actionOid: actionCode, value });
      }
    }
    try {
      await authorityService.saveUserAuthority?.(selectedUserOid, authorities);
      setHasChanges(false);
      setAuthorityChanges(new Map());
      // 重新加载
      const data = await authorityService.getUserAuthority?.(selectedUserOid) || [];
      setUserAuthorities(data);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 筛选用户
  const filteredUsers = useMemo(() => {
    if (!searchUserTerm) return users.slice(0, 30);
    const term = searchUserTerm.toLowerCase();
    return users.filter((u) => {
      const name = (u.real_name || u.name || '').toLowerCase();
      const uname = (u.username || u.aid || '').toLowerCase();
      return name.includes(term) || uname.includes(term);
    }).slice(0, 30);
  }, [users, searchUserTerm]);

  // 展平工序
  const flattenProcesses = (nodes: Process[]): Process[] => {
    return nodes.reduce<Process[]>((acc, n) => {
      acc.push(n);
      if (n.children?.length) acc.push(...flattenProcesses(n.children));
      return acc;
    }, []);
  };
  const allProcesses = useMemo(() => flattenProcesses(processes), [processes]);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <UserCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">用户特殊权限配置</h1>
              <p className="text-gray-500">对单个用户进行权限增强或限制，覆盖角色权限</p>
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">选择用户:</label>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" placeholder="搜索..."
              value={searchUserTerm}
              onChange={(e) => setSearchUserTerm(e.target.value)}
              className="w-36 h-8 pl-7 pr-2 border border-gray-200 rounded text-xs"
            />
          </div>
          <select
            value={selectedUserOid}
            onChange={(e) => setSelectedUserOid(e.target.value)}
            className="h-8 px-2 border border-gray-200 rounded text-xs max-w-[160px]"
          >
            <option value="">-- 请选择用户 --</option>
            {filteredUsers.map((u) => (
              <option key={u.oid} value={u.oid}>
                {u.real_name || u.name} ({u.username || u.aid})
              </option>
            ))}
          </select>
          {selectedUser && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              组织:{selectedUser.org_oid} | {selectedUser.status}
            </span>
          )}
        </div>
      </div>

      {/* 权限矩阵 */}
      {selectedUser && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                工序-动作权限配置
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                灰=无权限 | 蓝=角色继承 | 点击循环: 角色→允许→拒绝→恢复角色
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button onClick={saveChanges}
                  className="h-7 px-3 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1">
                  <Save className="w-3 h-3" /> 保存更改
                </button>
              )}
              <button onClick={() => { setHasChanges(false); setAuthorityChanges(new Map()); }}
                className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> 重置
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-b sticky top-0">
                  <th className="text-left py-2 px-3 font-medium text-white w-48">工序</th>
                  {ACTION_LIST.map((act) => (
                    <th key={act.code} className="text-center py-2 px-2 font-medium text-white w-20">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${act.color}`}>{act.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allProcesses.map((proc) => (
                  <tr key={proc.oid} className="border-b border-gray-100 hover:bg-blue-50">
                    <td className="py-1.5 px-3 text-gray-700">
                      <div>{proc.process_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{proc.process_code}</div>
                    </td>
                    {ACTION_LIST.map((act) => {
                      const { val, source } = getAuthValue(proc.oid, act.code);
                      let bg = 'bg-gray-50 text-gray-300';
                      let label = '-';
                      if (val === 1 && source === 'role') {
                        bg = 'bg-blue-50 text-blue-600';
                        label = '角色';
                      } else if (source === 'user_override') {
                        bg = val === 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500';
                        label = val === 2 ? '允许' : '拒绝';
                      } else if (source === 'local') {
                        bg = val === 1 ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700';
                        label = val === 1 ? '允许' : '拒绝';
                      }
                      return (
                        <td key={act.code} className="text-center py-1.5 px-1">
                          <button
                            onClick={() => cycleValue(proc.oid, act.code)}
                            className={`w-14 h-7 rounded text-xs font-medium transition-colors ${bg} hover:opacity-80`}
                          >
                            {label}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
