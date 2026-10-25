/**
 * 用户特殊权限配置页面
 * 在角色权限基础上对单用户做增强(+1)或限制(0)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
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

/**
 * 动作代码 → 动作 OID
 * 2026-10-25：后端 check-authority 与权限判定都按 action_oid（ACT001~ACT006）查询，
 *   而本页原先把 `view/create/...` 当 actionOid 写库，导致用户覆盖永远匹配不上。
 *   统一改为写 ACT OID；读取时两种形态都兼容（历史数据可能已是 code）。
 */
const ACTION_CODE_TO_OID: Record<string, string> = {
  view: 'ACT001',
  create: 'ACT002',
  edit: 'ACT003',
  delete: 'ACT004',
  export: 'ACT005',
  approve: 'ACT006',
};

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
  // 选中用户实际拥有的角色（用于显示角色名，2026-10-24 修复：原来按 org_oid
  // 匹配角色且读 role_name 蛇形字段，两个条件都不成立 → 永远显示空）
  const [userRoleOids, setUserRoleOids] = useState<string[]>([]);

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

  // 切换用户时的竞态保护：快速切换时，先发的慢请求不得覆盖后发的结果
  const loadSeqRef = useRef(0);

  // 选择用户后加载权限
  useEffect(() => {
    if (!selectedUserOid) { setSelectedUser(null); return; }
    const user = users.find((u) => u.oid === selectedUserOid) || null;
    setSelectedUser(user);
    const seq = ++loadSeqRef.current;

    // 加载用户特殊权限
    authorityService.getUserAuthority?.(selectedUserOid)
      ?.then((data: { processOid: string; actionOid: string; value: number }[]) => {
        if (loadSeqRef.current !== seq) return;
        setUserAuthorities(data || []);
      })
      .catch(() => { if (loadSeqRef.current === seq) setUserAuthorities([]); });

    // 加载用户角色权限（用户继承的权限基线）
    authorityService.getUserRoles?.(selectedUserOid)
      ?.then(async (roleOids: string[]) => {
        if (loadSeqRef.current !== seq) return;
        setUserRoleOids(roleOids || []);
        const allAuths: { processOid: string; actionOid: string; value: number }[] = [];
        for (const roleOid of roleOids) {
          const auths = await authorityService.getRoleAuthority(roleOid, 0);
          allAuths.push(...auths.map((a: { processOid: string; actionOid: string; value: number }) => ({ ...a })));
        }
        if (loadSeqRef.current !== seq) return;
        setRoleAuthorities(allAuths);
      })
      .catch(() => { if (loadSeqRef.current === seq) setRoleAuthorities([]); });

    setAuthorityChanges(new Map());
    setHasChanges(false);
  }, [selectedUserOid, users]);

  // 获取用户角色名称（按用户实际拥有的角色 OID 映射，兼容驼峰/蛇形两种返回）
  const userRoleNames = useMemo(() => {
    if (!selectedUser || userRoleOids.length === 0) return '无角色';
    const names = userRoleOids
      .map((oid) => roles.find((r) => r.oid === oid))
      .filter(Boolean)
      .map((r) => r!.role_name || r!.roleName || r!.name);
    return names.filter(Boolean).join('、') || '无角色';
  }, [selectedUser, userRoleOids, roles]);

  // 获取权限值 (0=拒绝, 1=允许, source=继承来源)
  const getAuthValue = (processOid: string, actionCode: string): { val: number; source: string } => {
    const actOid = ACTION_CODE_TO_OID[actionCode];
    // 同一动作可能以 code 或 ACT OID 存库，两种都匹配
    const matches = (a: { processOid: string; actionOid: string }) =>
      a.processOid === processOid && (a.actionOid === actionCode || a.actionOid === actOid);

    // 先看本地修改
    if (authorityChanges.has(processOid) && authorityChanges.get(processOid)!.has(actionCode)) {
      return { val: authorityChanges.get(processOid)!.get(actionCode)!, source: 'local' };
    }
    // 用户特殊权限（优先于角色）
    const ua = userAuthorities.find(matches);
    if (ua) return { val: ua.value, source: 'user_override' };
    // 角色权限
    const ra = roleAuthorities.find(matches);
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
        // 统一写动作 OID，与后端 check-authority / 权限判定口径一致
        authorities.push({ processOid, actionOid: ACTION_CODE_TO_OID[actionCode] || actionCode, value });
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
                      const { val, source } = getAuthValue(proc.oid ?? '', act.code);
                      // 2026-10-25 修复：原来把「角色已授权」和「角色无权限」都显示成
                      //   同一个"继承角色权限"，而 users_authority 通常为空，
                      //   导致切换任何用户看到的都是同一片继承，看起来像"角色没关联用户"。
                      //   现在明确区分：继承（允许）/ 继承（无权限）/ 强制允许 / 强制拒绝。
                      const isOverride = source === 'user_override' || source === 'local';
                      const inheritedAllowed = source === 'role';
                      const currentValue = isOverride ? (val === 1 ? 'allow' : 'deny') : 'inherit';
                      const inheritLabel = inheritedAllowed ? '继承（允许）' : '继承（无权限）';
                      let textColor = 'text-gray-400';
                      let bgStyle = 'bg-gray-50';
                      if (isOverride) {
                        textColor = val === 1 ? 'text-emerald-700' : 'text-red-600';
                        bgStyle = val === 1 ? 'bg-emerald-100' : 'bg-red-100';
                      } else if (inheritedAllowed) {
                        textColor = 'text-emerald-600';
                        bgStyle = 'bg-emerald-50';
                      }
                      return (
                        <td key={act.code} className="text-center py-1.5 px-1">
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === 'inherit') setAuthValue(proc.oid ?? '', act.code, null);
                              else if (v === 'allow') setAuthValue(proc.oid ?? '', act.code, 1);
                              else if (v === 'deny') setAuthValue(proc.oid ?? '', act.code, 0);
                            }}
                            className={`h-7 px-1 text-xs border border-gray-300 rounded cursor-pointer ${bgStyle} ${textColor} font-medium`}
                          >
                            <option value="inherit" className="text-blue-600 bg-white">{inheritLabel}</option>
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
