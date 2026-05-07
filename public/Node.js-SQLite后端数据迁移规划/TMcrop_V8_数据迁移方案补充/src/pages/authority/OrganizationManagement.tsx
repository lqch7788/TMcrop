/**
 * 组织管理页面
 * 树形组织架构管理
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
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
} from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Organization } from '../types/authority';

export default function OrganizationManagement() {
  const {
    organizations,
    loadOrganizations,
    saveOrganization,
    deleteOrganization,
    loading,
    error,
  } = useAuthSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOids, setExpandedOids] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  // 过滤组织
  const filteredOrgs = organizations.filter(
    (org) =>
      org.name?.includes(searchTerm) ||
      org.aid?.includes(searchTerm) ||
      org.description?.includes(searchTerm)
  );

  // 分页
  const totalPages = Math.ceil(filteredOrgs.length / pageSize);
  const paginatedOrgs = filteredOrgs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 切换展开状态
  const toggleExpand = (oid: string) => {
    const newExpanded = new Set(expandedOids);
    if (newExpanded.has(oid)) {
      newExpanded.delete(oid);
    } else {
      newExpanded.add(oid);
    }
    setExpandedOids(newExpanded);
  };

  // 打开新增弹窗
  const handleAdd = (parentOid?: string) => {
    setEditingOrg({
      oidParent: parentOid || null,
      aid: '',
      name: '',
      description: '',
      orgType: 'department',
      sortNumber: 0,
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (org: Organization) => {
    setEditingOrg({ ...org });
    setShowModal(true);
  };

  // 保存
  const handleSave = async () => {
    if (!editingOrg) return;
    try {
      await saveOrganization(editingOrg);
      setShowModal(false);
      setEditingOrg(null);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 删除
  const handleDelete = async (oid: string) => {
    if (!confirm('确定要删除该组织吗？')) return;
    try {
      await deleteOrganization(oid);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 递归渲染树形节点
  const renderTreeNode = (org: Organization, level: number = 0): JSX.Element => {
    const hasChildren = org.children && org.children.length > 0;
    const isExpanded = expandedOids.has(org.oid);

    return (
      <div key={org.oid}>
        <div
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {/* 展开/折叠按钮 */}
          <button
            onClick={() => toggleExpand(org.oid)}
            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
              hasChildren ? 'visible' : 'invisible'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* 组织信息 */}
          <div className="flex-1 flex items-center gap-4">
            <span className="font-medium text-gray-900">{org.name}</span>
            <span className="text-sm text-gray-500">[{org.aid}]</span>
            {org.orgType && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                {org.orgType}
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAdd(org.oid)}
              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
              title="新增子组织"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEdit(org)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(org.oid)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="bg-gray-50">
            {org.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">组织管理</h1>
            <p className="text-gray-500">管理组织架构和部门信息</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
              <p className="text-xs text-gray-500">组织总数</p>
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
                placeholder="搜索组织名称或编码..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadOrganizations()}
              className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={() => handleAdd()}
              className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增组织
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

      {/* 树形列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">组织架构</h3>
        </div>

        {loading && organizations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : organizations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无组织数据，点击"新增组织"创建
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedOrgs.map((org) => renderTreeNode(org))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              共 {filteredOrgs.length} 条记录，第 {currentPage}/{totalPages} 页
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
                        ? 'bg-blue-600 text-white'
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
      {showModal && editingOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingOrg.oid ? '编辑组织' : '新增组织'}
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
                  组织编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingOrg.aid || ''}
                  onChange={(e) => setEditingOrg({ ...editingOrg, aid: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：ORG001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  组织名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingOrg.name || ''}
                  onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入组织名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">组织类型</label>
                <select
                  value={editingOrg.orgType || 'department'}
                  onChange={(e) =>
                    setEditingOrg({ ...editingOrg, orgType: editingOrg.orgType as any })
                  }
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="company">公司</option>
                  <option value="base">基地</option>
                  <option value="region">区域</option>
                  <option value="department">部门</option>
                  <option value="workshop">车间</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingOrg.description || ''}
                  onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入组织描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                <input
                  type="number"
                  value={editingOrg.sortNumber || 0}
                  onChange={(e) =>
                    setEditingOrg({ ...editingOrg, sortNumber: parseInt(e.target.value) || 0 })
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
                disabled={!editingOrg.aid || !editingOrg.name || loading}
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
