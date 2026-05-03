/**
 * 权限配置页面
 * 工序管理、动作管理、角色权限配置
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRightIcon,
  Search,
  RefreshCw,
  X,
  Save,
  Layers,
  Zap,
  Check,
  Minus,
} from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Process, Action, Role, AppType, AuthValue } from '../types/authority';

export default function AuthorityConfiguration() {
  const {
    processes,
    loadProcesses,
    actions,
    loadActions,
    roles,
    loadRoles,
    roleAuthorities,
    loadRoleAuthority,
    saveRoleAuthority,
    loading,
    error,
  } = useAuthSettings();

  const [activeTab, setActiveTab] = useState<'processes' | 'roles'>('processes');
  const [selectedRoleOid, setSelectedRoleOid] = useState<string>('');
  const [selectedAppType, setSelectedAppType] = useState<AppType>(0);
  const [authorityChanges, setAuthorityChanges] = useState<
    Map<string, Map<string, AuthValue>>
  >(new Map());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    loadProcesses({ appType: selectedAppType });
    loadActions({ appType: selectedAppType });
    loadRoles();
  }, [loadProcesses, loadActions, loadRoles, selectedAppType]);

  // 加载角色权限
  useEffect(() => {
    if (selectedRoleOid) {
      loadRoleAuthority(selectedRoleOid, selectedAppType);
    }
  }, [selectedRoleOid, selectedAppType, loadRoleAuthority]);

  // 获取权限值
  const getAuthValue = (processOid: string, actionOid: string): AuthValue => {
    // 先检查变更
    const processChanges = authorityChanges.get(processOid);
    if (processChanges) {
      const changed = processChanges.get(actionOid);
      if (changed !== undefined) return changed;
    }
    // 再检查已保存的权限
    const saved = roleAuthorities.find(
      (a) => a.processOid === processOid && a.actionOid === actionOid
    );
    return saved?.value ?? -1;
  };

  // 切换权限值
  const toggleAuthValue = (processOid: string, actionOid: string) => {
    const current = getAuthValue(processOid, actionOid);
    const next: AuthValue = current === 1 ? 0 : current === 0 ? -1 : 1;

    setAuthorityChanges((prev) => {
      const newChanges = new Map(prev);
      if (!newChanges.has(processOid)) {
        newChanges.set(processOid, new Map());
      }
      newChanges.get(processOid)!.set(actionOid, next);
      return newChanges;
    });
  };

  // 保存权限
  const handleSaveAuthority = async () => {
    if (!selectedRoleOid) return;

    const authorities: { processOid: string; actionOid: string; value: AuthValue }[] = [];
    authorityChanges.forEach((actionMap, processOid) => {
      actionMap.forEach((value, actionOid) => {
        authorities.push({ processOid, actionOid, value });
      });
    });

    try {
      await saveRoleAuthority(selectedRoleOid, authorities);
      setAuthorityChanges(new Map());
      setShowSaveConfirm(false);
      await loadRoleAuthority(selectedRoleOid, selectedAppType);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 获取动作分类
  const actionCategories = [...new Set(actions.map((a) => a.category))];

  // 递归渲染工序树
  const renderProcessTree = (procs: Process[], level: number = 0): JSX.Element => {
    return (
      <>
        {procs.map((proc) => {
          const hasChildren = proc.children && proc.children.length > 0;
          return (
            <div key={proc.oid}>
              <div
                className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
                style={{ paddingLeft: `${level * 24 + 16}px` }}
              >
                {hasChildren && (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
                {!hasChildren && <div className="w-4" />}

                <div className="flex-1 flex items-center gap-4">
                  <span className="font-medium text-gray-900">{proc.name}</span>
                  <span className="text-sm text-gray-500">[{proc.aid}]</span>
                </div>

                {/* 动作权限列 */}
                <div className="flex items-center gap-1">
                  {actions
                    .filter((a) => a.category === '查询')
                    .slice(0, 1)
                    .map((action) => (
                      <button
                        key={action.oid}
                        onClick={() => toggleAuthValue(proc.oid, action.oid)}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                          getAuthValue(proc.oid, action.oid) === 1
                            ? 'bg-green-100 text-green-600'
                            : getAuthValue(proc.oid, action.oid) === 0
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title={action.name}
                      >
                        {getAuthValue(proc.oid, action.oid) === 1 ? (
                          <Check className="w-4 h-4" />
                        ) : getAuthValue(proc.oid, action.oid) === 0 ? (
                          <Minus className="w-4 h-4" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                </div>
              </div>
              {hasChildren && (
                <div className="bg-gray-50">
                  {renderProcessTree(proc.children!, level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  const hasUnsavedChanges = authorityChanges.size > 0;

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">权限配置</h1>
            <p className="text-gray-500">工序、动作和角色权限管理</p>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('processes')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'processes'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            工序权限配置
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            角色权限配置
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'processes' && (
            <div className="space-y-4">
              {/* 工序树列表 */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">工序列表</h3>
                  <div className="text-sm text-gray-500">
                    说明：✓=有权限 ○=无权限 ⊙=继承
                  </div>
                </div>

                {processes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    暂无工序数据
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {renderProcessTree(processes)}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              {/* 角色选择 */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      选择角色
                    </label>
                    <select
                      value={selectedRoleOid}
                      onChange={(e) => setSelectedRoleOid(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">请选择角色</option>
                      {roles.map((role) => (
                        <option key={role.oid} value={role.oid}>
                          {role.name} [{role.aid}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      应用类型
                    </label>
                    <select
                      value={selectedAppType}
                      onChange={(e) => setSelectedAppType(Number(e.target.value) as AppType)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={0}>Web端</option>
                      <option value={1}>移动端</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 权限矩阵 */}
              {selectedRoleOid && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      权限矩阵 -{' '}
                      {roles.find((r) => r.oid === selectedRoleOid)?.name || ''}
                    </h3>
                    <div className="flex items-center gap-2">
                      {hasUnsavedChanges && (
                        <span className="text-sm text-orange-600">有未保存的更改</span>
                      )}
                      <button
                        onClick={() => setShowSaveConfirm(true)}
                        disabled={!hasUnsavedChanges}
                        className="h-9 px-4 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                    </div>
                  </div>

                  {/* 表头 */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-semibold w-48">
                            工序
                          </th>
                          {actionCategories.map((cat) => (
                            <th
                              key={cat}
                              className="text-center py-3 px-4 text-sm font-semibold min-w-[80px]"
                            >
                              {cat}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processes.map((proc) => (
                          <tr key={proc.oid} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {proc.name}
                            </td>
                            {actionCategories.map((cat) => (
                              <td key={cat} className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {actions
                                    .filter((a) => a.category === cat)
                                    .map((action) => {
                                      const value = getAuthValue(proc.oid, action.oid);
                                      return (
                                        <button
                                          key={action.oid}
                                          onClick={() =>
                                            toggleAuthValue(proc.oid, action.oid)
                                          }
                                          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                                            value === 1
                                              ? 'bg-green-100 text-green-600'
                                              : value === 0
                                              ? 'bg-red-100 text-red-600'
                                              : 'bg-gray-100 text-gray-400'
                                          }`}
                                          title={`${action.name}: ${
                                            value === 1
                                              ? '有权限'
                                              : value === 0
                                              ? '无权限'
                                              : '继承'
                                          }`}
                                        >
                                          {value === 1 ? (
                                            <Check className="w-4 h-4" />
                                          ) : value === 0 ? (
                                            <Minus className="w-4 h-4" />
                                          ) : (
                                            <Zap className="w-4 h-4" />
                                          )}
                                        </button>
                                      );
                                    })}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 border-t border-gray-100 text-sm text-gray-500">
                    <p>图例：✓ = 有权限 | ○ = 无权限 | ⊙ = 继承角色权限</p>
                    <p>点击单元格可切换权限状态</p>
                  </div>
                </div>
              )}

              {!selectedRoleOid && (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-500">
                  请选择角色以配置权限
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 保存确认弹窗 */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认保存</h3>
              <p className="text-gray-500 mb-6">
                确定要保存权限配置吗？此操作将覆盖角色现有的权限设置。
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSaveConfirm(false)}
                  className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveAuthority}
                  disabled={loading}
                  className="h-10 px-4 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  确定保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
