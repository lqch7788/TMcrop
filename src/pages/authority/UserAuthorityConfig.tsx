/**
 * 用户特殊权限配置页面
 * 在角色权限基础上对单用户做增强(+1)或限制(0)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Search, RefreshCw, Save, Check, X, UserCog,
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

  // 默认选择第一个用户
  useEffect(() => {
    if (!selectedUserOid && users.length > 0) {
      setSelectedUserOid(users[0].oid);
    }
  }, [users, selectedUserOid]);

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

  // 获取权限值 (0=拒绝, 1=允许, source=继承来源)
  const getAuthValue = (processOid: string, actionCode: string): { val: number; source: string } => {
    // 先看本地修改
    if (authorityChanges.has(processOid) && authorityChanges.get(processOid)!.has(actionCode)) {
      return { val: authorityChanges.get(processOid)!.get(actionCode)!, source: 'local' };
    }
    // 用户特殊权限
    const ua = userAuthorities.find((a) => a.processOid === processOid && a.actionOid === actionCode);
    if (ua) return { val: ua.value, source: 'user_override' };
    // 角色权限
    const ra = roleAuthorities.find((a) => a.processOid === processOid && a.actionOid === actionCode);
    if (ra && ra.value >= 1) return { val: 1, source: 'role' };
    return { val: 0, source: 'none' };
  };

  // 设置权限值 (继承角色=null, 允许=1, 拒绝=0)
  const setAuthValue = (processOid: string, actionCode: string, value: number | null) => {
    setAuthorityChanges((prev) => {
      const next = new Map(prev);
      if (value === null) {
        // 清除记录，恢复继承角色权限
        if (next.has(processOid)) {
          next.get(processOid)!.delete(actionCode);
          if (next.get(processOid)!.size === 0) next.delete(processOid);
        }
      } else {
        if (!next.has(processOid)) next.set(processOid, new Map());
        next.get(processOid)!.set(actionCode, value);
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
      // logger.error('保存失败:', err);
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
      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">选择用户:</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" placeholder="搜索..."
              value={searchUserTerm}
              onChange={(e) => setSearchUserTerm(e.target.value)}
              className="w-44 h-9 pl-8 pr-2 border border-gray-200 rounded text-sm"
            />
          </div>
          <select
            value={selectedUserOid}
            onChange={(e) => setSelectedUserOid(e.target.value)}
            className="h-9 px-2 border border-gray-200 rounded text-sm max-w-[200px]"
          >
            <option value="">-- 请选择用户 --</option>
            {filteredUsers.map((u) => (
              <option key={u.oid} value={u.oid}>
                {u.real_name || u.name} ({u.username || u.aid})
              </option>
            ))}
          </select>
          {selectedUser && (
            <span className="text-sm text-gray-400 whitespace-nowrap">
              组织:{selectedUser.org_oid} | {selectedUser.status}
            </span>
          )}
        </div>
      </div>

      {/* 权限矩阵 */}
      {selectedUser && (
        <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="p-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
              <span>下拉选择：继承=继承角色权限 | 允许=强制允许 | 拒绝=强制拒绝</span>
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
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-b sticky top-0">
                  <th className="text-center py-2 px-2 font-medium text-white w-12">序号</th>
                  <th className="text-left py-2 px-3 font-medium text-white w-48">工序</th>
                  {ACTION_LIST.map((act) => (
                    <th key={act.code} className="text-center py-2 px-2 font-medium text-white w-20">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${act.color}`}>{act.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allProcesses.map((proc, index) => (
                  <tr key={proc.oid} className="border-b border-gray-300 hover:bg-blue-50">
                    <td className="py-1.5 px-2 text-center text-gray-500 text-xs">{index + 1}</td>
                    <td className="py-1.5 px-3 text-gray-700">
                      <div>{proc.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{proc.aid}</div>
                    </td>
                    {ACTION_LIST.map((act) => {
                      const { val, source } = getAuthValue(proc.oid, act.code);
                      // 计算当前值和颜色
                      let currentValue = 'inherit';
                      let textColor = 'text-blue-600';
                      let bgStyle = 'bg-blue-50';
                      if (source === 'role' || source === 'none') {
                        currentValue = 'inherit';
                        textColor = 'text-blue-600';
                        bgStyle = 'bg-blue-50';
                      } else if (val === 1) {
                        currentValue = 'allow';
                        textColor = 'text-emerald-600';
                        bgStyle = 'bg-emerald-50';
                      } else if (val === 0) {
                        currentValue = 'deny';
                        textColor = 'text-red-500';
                        bgStyle = 'bg-red-50';
                      }
                      return (
                        <td key={act.code} className="text-center py-1.5 px-1">
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === 'inherit') setAuthValue(proc.oid, act.code, null);
                              else if (v === 'allow') setAuthValue(proc.oid, act.code, 1);
                              else if (v === 'deny') setAuthValue(proc.oid, act.code, 0);
                            }}
                            className={`h-7 px-1 text-xs border border-gray-300 rounded cursor-pointer ${bgStyle} ${textColor} font-medium`}
                          >
                            <option value="inherit" className="text-blue-600 bg-white">继承角色权限</option>
                            <option value="allow" className="text-emerald-600 bg-white">强制允许</option>
                            <option value="deny" className="text-red-500 bg-white">强制拒绝</option>
                          </select>
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
