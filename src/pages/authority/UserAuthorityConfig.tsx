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
      // 循环: 无权限 → 强制允许 → 强制拒绝 → 无权限
      let newVal: number;
      if (current.val === 0) newVal = 1; // 强制允许
      else if (current.val === 1 || current.val === 2) newVal = 0; // 强制拒绝
      else newVal = -1; // 清除(恢复角色权限)
      next.get(processOid)!.set(actionCode, newVal);
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
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">用户特殊权限配置</h1>
            <p className="text-sm text-white/70">对单个用户进行权限增强或限制，覆盖角色权限</p>
          </div>
        </div>
      </div>

      {/* 用户选择 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">选择用户：</label>
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" placeholder="搜索用户..."
              value={searchUserTerm}
              onChange={(e) => setSearchUserTerm(e.target.value)}
              className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm"
            />
          </div>
          <select
            value={selectedUserOid}
            onChange={(e) => setSelectedUserOid(e.target.value)}
            className="h-9 px-2 border border-gray-200 rounded text-sm flex-1 max-w-xs"
          >
            <option value="">-- 请选择用户 --</option>
            {filteredUsers.map((u) => (
              <option key={u.oid} value={u.oid}>
                {u.real_name || u.name} ({u.username || u.aid})
              </option>
            ))}
          </select>
          {selectedUser && (
            <span className="text-sm text-gray-500">
              组织: {selectedUser.org_oid} | 状态: {selectedUser.status}
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
                灰色=无权限 | 蓝色=角色继承 | 绿色=用户特殊允许 | 红色=用户特殊拒绝 | 点击切换
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button onClick={saveChanges}
                  className="h-7 px-3 text-xs bg-violet-500 text-white rounded hover:bg-violet-600 flex items-center gap-1">
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
                <tr className="bg-gray-50 border-b sticky top-0">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 w-48">工序</th>
                  {ACTION_LIST.map((act) => (
                    <th key={act.code} className="text-center py-2 px-2 font-medium text-gray-600 w-20">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${act.color}`}>{act.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allProcesses.map((proc) => (
                  <tr key={proc.oid} className="border-b border-gray-50 hover:bg-gray-50/50">
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
                        bg = val === 1 ? 'bg-emerald-200 text-emerald-700' : val === 0 ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400';
                        label = val === 1 ? '允许' : val === 0 ? '拒绝' : '清除';
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
