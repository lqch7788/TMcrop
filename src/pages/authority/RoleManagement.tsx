/**
 * 角色管理页面
 * 角色CRUD和权限分配
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  Save,
  Users,
} from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Role } from '../types/authority';

export default function RoleManagement() {
  const { roles, loadRoles, saveRole, deleteRole, loading, error, organizations } = useAuthSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

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
    if (!confirm('确定要删除该角色吗？')) return;
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
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
            <p className="text-gray-500">管理系统角色和权限配置</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
              <p className="text-xs text-gray-500">角色总数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索角色名称或编码..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadRoles()}
              className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={handleAdd}
              className="h-10 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增角色
            </button>
          </div>
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
          <thead className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
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
                <tr key={role.oid} className="hover:bg-gray-50">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              共 {filteredRoles.length} 条记录，第 {currentPage}/{totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium ${
                      currentPage === page
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 弹窗 */}
      {showModal && editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRole.oid ? '编辑角色' : '新增角色'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRole.aid || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, aid: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="请输入角色名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
                <select
                  value={editingRole.orgOid || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, orgOid: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="h-10 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
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
