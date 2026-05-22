/**
 * 角色管理页面
 * 角色CRUD和权限分配
 */

import { useState, useEffect } from 'react';
import { useDragResize } from './useDragResize';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  X,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { useOrganizationStore } from '@/stores';
import { Role } from '../types/authority';
import { showConfirm } from '@/lib/dialogService';

export default function RoleManagement() {
  const roles = useOrganizationStore((s) => s.roles);
  const loadRoles = useOrganizationStore((s) => s.loadRoles);
  const saveRole = useOrganizationStore((s) => s.saveRole);
  const deleteRole = useOrganizationStore((s) => s.deleteRole);
  const loading = useOrganizationStore((s) => s.loading);
  const error = useOrganizationStore((s) => s.error);
  const organizations = useOrganizationStore((s) => s.organizations);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // 弹窗拖拽/缩放
  const { position, size, startDrag, resetPosition, resizeHandles } = useDragResize({ initialWidth: 500, initialHeight: 460 });
  useEffect(() => { if (showModal) resetPosition(); }, [showModal]);

  // 过滤角色
  const filteredRoles = roles.filter(
    (role) =>
      role.name?.includes(searchTerm) ||
      role.aid?.includes(searchTerm) ||
      role.description?.includes(searchTerm)
  );

  // 分页
  const totalPages = Math.ceil(filteredRoles.length / pageSize);
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingRole({
      aid: '',
      name: '',
      orgOid: '',
      description: '',
      sortNumber: 0,
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (role: Role) => {
    setEditingRole({ ...role });
    setShowModal(true);
  };

  // 保存
  const handleSave = async () => {
    if (!editingRole) return;
    try {
      await saveRole(editingRole);
      setShowModal(false);
      setEditingRole(null);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 删除
  const handleDelete = async (oid: string) => {
    if (!await showConfirm('确定要删除该角色吗？')) return;
    try {
      await deleteRole(oid);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 获取组织名称
  const getOrgName = (orgOid: string) => {
    const org = organizations.find((o) => o.oid === orgOid);
    return org?.name || orgOid;
  };

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
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
              <p className="text-gray-500">管理系统角色和权限配置</p>
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{roles.length} 个角色</span>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-40 h-8 pl-8 pr-3 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => loadRoles()}
            className="h-8 px-3 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={handleAdd}
            className="h-8 px-3 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            新增角色
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 角色列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">角色编码</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">角色名称</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">所属组织</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">描述</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">排序</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">状态</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && roles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : paginatedRoles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无角色数据，点击"新增角色"创建
                </td>
              </tr>
            ) : (
              paginatedRoles.map((role) => (
                <tr key={role.oid} className="hover:bg-blue-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{role.aid}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{role.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {getOrgName(role.orgOid)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                    {role.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{role.sortNumber}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        role.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {role.status === 'active' ? '正常' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(role)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(role.oid)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              showPageSize={false}
            />
          </div>
        )}
      </div>

      {/* 弹窗 */}
      {showModal && editingRole && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModal(false)}>
          <div
            className="absolute bg-white rounded-xl shadow-xl"
            style={{
              width: size.width,
              left: `calc(50% - ${size.width / 2}px + ${position.x}px)`,
              top: `calc(50% - ${size.height / 2}px + ${position.y}px)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {resizeHandles}
            <div
              className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl p-4 flex items-center justify-between cursor-move select-none"
              onMouseDown={startDrag}
            >
              <h3 className="text-white font-semibold">
                {editingRole.oid ? '编辑角色' : '新增角色'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRole.aid || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, aid: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：ROLE001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRole.name || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入角色名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
                <select
                  value={editingRole.orgOid || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, orgOid: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择组织</option>
                  {organizations.map((org) => (
                    <option key={org.oid} value={org.oid}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingRole.description || ''}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入角色描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                <input
                  type="number"
                  value={editingRole.sortNumber || 0}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, sortNumber: parseInt(e.target.value) || 0 })
                  }
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!editingRole.aid || !editingRole.name || loading}
                className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
