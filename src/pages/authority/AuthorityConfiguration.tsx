/**
 * 权限配置页面
 * 工序管理 + 动作管理 + 角色-工序-动作权限矩阵 + 角色数据权限
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDragResize } from './useDragResize';
import {
  Shield, Plus, Trash2, Save, RefreshCw, Check, X, ChevronRight, ChevronDown,
  Key, FolderTree, Settings, Search, Building2,
} from 'lucide-react';
import { useOrganizationStore } from '@/stores';
import type { Process, Action, Role, RoleAuthorityItem, AuthValue } from '@/types/authority';
import * as authorityService from '@/services/authorityService';
import { Button } from '@/components/ui';

// ==================== 常量 ====================

const APP_TYPE_OPTIONS = [
  { value: 0, label: 'Web 端' },
  { value: 1, label: '移动端' },
];

const ACTION_LIST: { code: string; name: string; color: string }[] = [
  { code: 'view', name: '查看', color: 'bg-blue-100 text-blue-700' },
  { code: 'create', name: '新增', color: 'bg-green-100 text-green-700' },
  { code: 'edit', name: '编辑', color: 'bg-amber-100 text-amber-700' },
  { code: 'delete', name: '删除', color: 'bg-red-100 text-red-700' },
  { code: 'export', name: '导出', color: 'bg-purple-100 text-purple-700' },
  { code: 'approve', name: '审批', color: 'bg-indigo-100 text-indigo-700' },
];

// ==================== 组件 ====================

export default function AuthorityConfiguration() {
  // Store 数据
  const processes = useOrganizationStore((s) => s.processes);
  const loadProcesses = useOrganizationStore((s) => s.loadProcesses);
  const saveProcess = useOrganizationStore((s) => s.saveProcess);
  const deleteProcess = useOrganizationStore((s) => s.deleteProcess);

  const roles = useOrganizationStore((s) => s.roles);
  const loadRoles = useOrganizationStore((s) => s.loadRoles);

  // UI 状态
  const [activeTab, setActiveTab] = useState<'processes' | 'authority'>('authority');
  const [selectedAppType, setSelectedAppType] = useState(0);
  const [selectedRoleOid, setSelectedRoleOid] = useState('');
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // 工序编辑状态
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Partial<Process> | null>(null);
  const [processForm, setProcessForm] = useState({ name: '', code: '', route: '', description: '', parentOid: '' });

  // 弹窗拖拽/缩放
  const { position, size, startDrag, resetPosition, resizeHandles } = useDragResize({ initialWidth: 550, initialHeight: 420 });
  useEffect(() => { if (showProcessModal) resetPosition(); }, [showProcessModal]);

  // 权限矩阵状态
  const [roleAuthorities, setRoleAuthorities] = useState<RoleAuthorityItem[]>([]);
  const [authorityChanges, setAuthorityChanges] = useState<Map<string, Map<string, AuthValue>>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // 数据权限状态
  const [showDataAuthPanel, setShowDataAuthPanel] = useState(false);
  const [dataAuthorities, setDataAuthorities] = useState<string[]>([]);
  const [dataAuthChanges, setDataAuthChanges] = useState<Set<string>>(new Set());
  const organizations = useOrganizationStore((s) => s.organizations);
  const loadOrganizations = useOrganizationStore((s) => s.loadOrganizations);

  // 初始化加载
  useEffect(() => {
    loadProcesses({ appType: selectedAppType });
    loadRoles();
    loadOrganizations();
  }, [selectedAppType]);

  // 默认选择系统管理员
  useEffect(() => {
    if (!selectedRoleOid && roles.length > 0) {
      const adminRole = roles.find((r) => r.name === '系统管理员');
      if (adminRole) {
        setSelectedRoleOid(adminRole.oid);
      }
    }
  }, [roles, selectedRoleOid]);

  // 加载角色权限
  useEffect(() => {
    if (selectedRoleOid) {
      authorityService.getRoleAuthority(selectedRoleOid, selectedAppType as 0 | 1)
        .then(setRoleAuthorities)
        .catch(() => setRoleAuthorities([]));
      authorityService.getRoleDataAuthority(selectedRoleOid)
        .then((data) => setDataAuthorities(data.map((d: { orgOid: string }) => d.orgOid)))
        .catch(() => setDataAuthorities([]));
      setAuthorityChanges(new Map());
      setHasChanges(false);
    }
  }, [selectedRoleOid, selectedAppType]);

  // 构建权限 Map: processOid -> actionOid -> value
  const authorityMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const a of roleAuthorities) {
      if (!map.has(a.processOid)) map.set(a.processOid, new Map());
      map.get(a.processOid)!.set(a.actionOid, a.value);
    }
    return map;
  }, [roleAuthorities]);

  // 递归获取所有工序（展平）
  const flattenProcesses = useCallback((nodes: Process[]): Process[] => {
    return nodes.reduce<Process[]>((acc, n) => {
      acc.push(n);
      if (n.children?.length) acc.push(...flattenProcesses(n.children));
      return acc;
    }, []);
  }, []);

  const allProcesses = useMemo(() => flattenProcesses(processes), [processes, flattenProcesses]);

  // 筛选工序
  const filteredProcesses = useMemo(() => {
    if (!searchTerm) return processes;
    const term = searchTerm.toLowerCase();
    const filter = (nodes: Process[]): Process[] =>
      nodes.reduce<Process[]>((acc, n) => {
        const nameMatch = n.name?.toLowerCase().includes(term);
        const codeMatch = n.aid?.toLowerCase().includes(term);
        const children = n.children ? filter(n.children) : [];
        if (nameMatch || codeMatch || children.length) {
          acc.push({ ...n, children: children.length ? children : n.children });
        }
        return acc;
      }, []);
    return filter(processes);
  }, [processes, searchTerm]);

  // ========== 权限切换 ==========

  const getAuthValue = (processOid: string, actionOid: string): AuthValue => {
    // 先看本地修改
    if (authorityChanges.has(processOid) && authorityChanges.get(processOid)!.has(actionOid)) {
      return authorityChanges.get(processOid)!.get(actionOid)!;
    }
    // 再看服务端数据
    const sv = authorityMap.get(processOid)?.get(actionOid);
    return (sv === 1 ? 1 : 0) as AuthValue;
  };

  const toggleAuthority = (processOid: string, actionOid: string) => {
    const current = getAuthValue(processOid, actionOid);
    const newValue: AuthValue = current === 1 ? 0 : 1;

    setAuthorityChanges((prev) => {
      const next = new Map(prev);
      if (!next.has(processOid)) next.set(processOid, new Map());
      next.get(processOid)!.set(actionOid, newValue);
      return next;
    });
    setHasChanges(true);
  };

  const grantAll = () => {
    const changes = new Map<string, Map<string, AuthValue>>();
    for (const proc of allProcesses) {
      const actionMap = new Map<string, AuthValue>();
      for (const act of ACTION_LIST) {
        // 找到对应的 action oid
        actionMap.set(act.code, 1);
      }
      changes.set(proc.oid, actionMap);
    }
    setAuthorityChanges(changes);
    setHasChanges(true);
  };

  const revokeAll = () => {
    const changes = new Map<string, Map<string, AuthValue>>();
    for (const proc of allProcesses) {
      const actionMap = new Map<string, AuthValue>();
      for (const act of ACTION_LIST) {
        actionMap.set(act.code, 0);
      }
      changes.set(proc.oid, actionMap);
    }
    setAuthorityChanges(changes);
    setHasChanges(true);
  };

  // ========== 保存权限 ==========

  const saveAuthority = async () => {
    if (!selectedRoleOid) return;

    const authorities: { processOid: string; actionOid: string; value: number }[] = [];
    for (const [processOid, actions] of authorityChanges) {
      for (const [actionCode, value] of actions) {
        // 将 actionCode 转换为 actionOid（使用 actions 表中的 oid）
        const actionOid = actionCode; // 暂时使用 code 作为 key
        authorities.push({ processOid, actionOid, value });
      }
    }

    try {
      await authorityService.saveRoleAuthority(selectedRoleOid, authorities);
      // 重新加载
      const data = await authorityService.getRoleAuthority(selectedRoleOid, selectedAppType as 0 | 1);
      setRoleAuthorities(data);
      setAuthorityChanges(new Map());
      setHasChanges(false);
    } catch (err) {
      console.error('保存角色权限失败:', err);
    }
  };

  // ========== 工序 CRUD ==========

  const openProcessAdd = (parentOid = '') => {
    setEditingProcess(null);
    setProcessForm({ name: '', code: '', route: '', description: '', parentOid });
    setShowProcessModal(true);
  };

  const openProcessEdit = (proc: Process) => {
    setEditingProcess(proc);
    setProcessForm({
      name: proc.name || '',
      code: proc.aid || '',
      route: (proc as Record<string, unknown>).route as string || '',
      description: proc.description || '',
      parentOid: proc.oidParent || '',
    });
    setShowProcessModal(true);
  };

  const handleProcessSave = async () => {
    if (!processForm.name) return;
    const payload: Partial<Process> = {
      oid: editingProcess?.oid || `PROC_${Date.now()}`,
      process_name: processForm.name,
      process_code: processForm.code || `CODE_${Date.now()}`,
      route: processForm.route,
      description: processForm.description,
      parent_oid: processForm.parentOid || null,
      app_type: selectedAppType,
    };
    await saveProcess(payload);
    setShowProcessModal(false);
    loadProcesses({ appType: selectedAppType });
  };

  const handleProcessDelete = async (oid: string) => {
    await deleteProcess(oid);
    loadProcesses({ appType: selectedAppType });
  };

  const toggleExpand = (oid: string) => {
    setExpandedProcesses((prev) => {
      const next = new Set(prev);
      if (next.has(oid)) { next.delete(oid); } else { next.add(oid); }
      return next;
    });
  };

  // ========== 渲染工序树节点 ==========

  const renderProcessTreeNode = (node: Process, depth: number) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedProcesses.has(node.oid);

    return (
      <div key={node.oid}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-blue-50 rounded"
          style={{ paddingLeft: depth * 20 + 8 }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(node.oid)} className="p-0.5 text-gray-400 hover:text-gray-600">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <FolderTree className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-sm text-gray-700 flex-1">
            {node.name}
            <span className="text-xs text-gray-400 font-mono ml-1">（{node.aid}）</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => openProcessAdd(node.oid)} className="p-1 text-gray-400 hover:text-green-600" title="新增子工序">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => openProcessEdit(node)} className="p-1 text-gray-400 hover:text-blue-600" title="编辑">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => handleProcessDelete(node.oid)} className="p-1 text-gray-400 hover:text-red-600" title="删除">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && node.children!.map((c) => renderProcessTreeNode(c, depth + 1))}
      </div>
    );
  };

  // ========== 渲染权限矩阵 ==========

  const renderAuthorityMatrix = () => {
    if (!selectedRoleOid) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Shield className="w-12 h-12 mb-3" />
          <p>请先在左侧选择一个角色</p>
        </div>
      );
    }

    // 展平并筛选
    const flatList = allProcesses.filter((p) => {
      if (!searchTerm) return true;
      return p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             p.aid?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (flatList.length === 0) {
      return <div className="py-8 text-center text-gray-400">暂无工序数据</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-b">
              <th className="text-left py-2 px-3 font-medium text-white w-48">工序名称</th>
              <th className="text-left py-2 px-3 font-medium text-white w-32">编码</th>
              {ACTION_LIST.map((act) => (
                <th key={act.code} className="text-center py-2 px-2 font-medium text-white w-16">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${act.color}`}>{act.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flatList.map((proc) => (
              <tr key={proc.oid} className="border-b border-gray-300 hover:bg-blue-50">
                <td className="py-1.5 px-3 text-gray-700">{proc.name}</td>
                <td className="py-1.5 px-3 text-xs text-gray-400 font-mono">{proc.aid}</td>
                {ACTION_LIST.map((act) => {
                  const val = getAuthValue(proc.oid, act.code);
                  return (
                    <td key={act.code} className="text-center py-1.5 px-2">
                      <button
                        onClick={() => toggleAuthority(proc.oid, act.code)}
                        className={`w-7 h-7 rounded border flex items-center justify-center transition-colors font-bold text-base ${
                          val === 1
                            ? 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                            : 'border-gray-300 text-red-500 hover:bg-red-50'
                        }`}
                      >
                        {val === 1 ? '✓' : '✗'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ========== 主渲染 ==========

  return (
    <div className="space-y-4">
      {/* 工具栏：标题 + 内部Tab */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('authority')}
            className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'authority' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className="w-3 h-3 inline mr-1" /> 角色权限配置
          </button>
          <button
            onClick={() => setActiveTab('processes')}
            className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'processes' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderTree className="w-3 h-3 inline mr-1" /> 工序与菜单管理
          </button>
        </div>
      </div>

      {activeTab === 'processes' ? (
        /* ========== 工序管理 Tab ========== */
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-800">工序树</h2>
              <select
                value={selectedAppType}
                onChange={(e) => setSelectedAppType(Number(e.target.value))}
                className="h-8 px-2 border border-gray-200 rounded text-xs"
              >
                {APP_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={() => openProcessAdd('')}>
              <Plus className="w-3.5 h-3.5" /> 新增根工序
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-lg">
            {filteredProcesses.map((p) => renderProcessTreeNode(p, 0))}
            {filteredProcesses.length === 0 && (
              <div className="py-8 text-center text-gray-400">暂无工序数据，点击上方按钮新增</div>
            )}
          </div>
        </div>
      ) : (
        /* ========== 角色权限配置 Tab ========== */
        <div className="flex gap-4">
          {/* 左侧：角色选择 + 工序树 */}
          <div className="w-64 shrink-0 space-y-3">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">选择角色</h3>
              <select
                value={selectedRoleOid}
                onChange={(e) => setSelectedRoleOid(e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              >
                <option value="">-- 请选择角色 --</option>
                {roles.map((r) => (
                  <option key={r.oid} value={r.oid}>{r.role_name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-gray-400">APP:</span>
                <select
                  value={selectedAppType}
                  onChange={(e) => setSelectedAppType(Number(e.target.value))}
                  className="h-7 px-1 border border-gray-200 rounded text-xs flex-1"
                >
                  {APP_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 数据权限面板 */}
            {selectedRoleOid && (
              <div className="bg-white rounded-xl shadow-sm p-3">
                <button
                  onClick={() => setShowDataAuthPanel(!showDataAuthPanel)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  数据权限范围
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showDataAuthPanel ? 'rotate-180' : ''}`} />
                </button>
                {showDataAuthPanel && (
                  <div className="mt-2 max-h-48 overflow-y-auto border-t pt-2">
                    <p className="text-xs text-gray-400 mb-1">
                      已授权 {dataAuthorities.length} 个组织
                    </p>
                    {/* 组织树勾选 */}
                    {organizations.map((org) => (
                      <label key={org.oid} className="flex items-center gap-1.5 py-0.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dataAuthorities.includes(org.oid)}
                          onChange={async () => {
                            const isAuth = dataAuthorities.includes(org.oid);
                            const newList = isAuth
                              ? dataAuthorities.filter((o) => o !== org.oid)
                              : [...dataAuthorities, org.oid];
                            setDataAuthorities(newList);
                            try {
                              await authorityService.saveRoleDataAuthority(
                                selectedRoleOid, [org.oid], !isAuth
                              );
                            } catch (err) {
                              console.error('保存数据权限失败:', err);
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-gray-600">{org.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：权限矩阵 */}
          <div className="flex-1 bg-white rounded-xl shadow-sm">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-700">工序-动作权限矩阵</h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    placeholder="搜索工序..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-7 pl-7 pr-2 border border-gray-200 rounded text-xs w-40"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={grantAll} className="h-7 px-3 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100">
                  全部授权
                </button>
                <button onClick={revokeAll} className="h-7 px-3 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">
                  全部取消
                </button>
                {hasChanges && (
                  <button onClick={saveAuthority} className="h-7 px-3 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1">
                    <Save className="w-3 h-3" /> 保存
                  </button>
                )}
                <button onClick={() => { loadProcesses({ appType: selectedAppType }); setHasChanges(false); setAuthorityChanges(new Map()); }}
                  className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> 刷新
                </button>
              </div>
            </div>
            {renderAuthorityMatrix()}
          </div>
        </div>
      )}

      {/* ========== 工序编辑弹窗 ========== */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setShowProcessModal(false)}>
          <div className="absolute bg-white rounded-xl shadow-2xl"
            style={{
              width: size.width,
              left: `calc(50% - ${size.width / 2}px + ${position.x}px)`,
              top: `calc(50% - ${size.height / 2}px + ${position.y}px)`,
            }}
            onClick={(e) => e.stopPropagation()}>
            {resizeHandles}
            {/* 标题栏 */}
            <div
              className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl p-4 flex items-center justify-between cursor-move select-none"
              onMouseDown={startDrag}
            >
              <h3 className="text-white font-semibold">{editingProcess ? '编辑工序' : '新增工序'}</h3>
              <button onClick={() => setShowProcessModal(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* 表单 */}
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">工序名称 *</label>
                  <input value={processForm.name} onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })}
                    className="w-full h-9 px-2 border border-gray-200 rounded text-sm" placeholder="如：订单管理" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">工序编码 *</label>
                  <input value={processForm.code} onChange={(e) => setProcessForm({ ...processForm, code: e.target.value })}
                    className="w-full h-9 px-2 border border-gray-200 rounded text-sm" placeholder="如：crop-orders" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">前端路由</label>
                <input value={processForm.route} onChange={(e) => setProcessForm({ ...processForm, route: e.target.value })}
                  className="w-full h-9 px-2 border border-gray-200 rounded text-sm font-mono" placeholder="如：/production/orders" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">描述</label>
                <textarea value={processForm.description} onChange={(e) => setProcessForm({ ...processForm, description: e.target.value })}
                  className="w-full h-16 px-2 py-1 border border-gray-200 rounded text-sm resize-none" placeholder="工序描述..." />
              </div>
            </div>
            {/* 按钮 */}
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button onClick={() => setShowProcessModal(false)}
                className="h-8 px-4 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded">
                取消
              </button>
              <button onClick={handleProcessSave}
                className="h-8 px-4 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
