/**
 * 组织管理页面
 * 树形组织架构管理
 */

import { useState, useEffect } from 'react';
import { useDragResize } from './useDragResize';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRightIcon,
  Search,
  RefreshCw,
  X,
  Save,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { useOrganizationStore, useDepartmentStore } from '@/stores';
import type { Organization } from '@/types/authority';
import { showConfirm } from '@/lib/dialogService';

export default function OrganizationManagement() {
  const organizations = useOrganizationStore((s) => s.organizations);
  const loadOrganizations = useOrganizationStore((s) => s.loadOrganizations);
  const saveOrganization = useOrganizationStore((s) => s.saveOrganization);
  const deleteOrganization = useOrganizationStore((s) => s.deleteOrganization);
  const loading = useOrganizationStore((s) => s.loading);
  const error = useOrganizationStore((s) => s.error);

  // 部门列表（用于关联部门下拉选择）
  const departments = useDepartmentStore((s) => s.departments);
  const loadDepartments = useDepartmentStore((s) => s.loadDepartments);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOids, setExpandedOids] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadOrganizations();
    loadDepartments();
  }, [loadOrganizations, loadDepartments]);

  // 弹窗拖拽/缩放
  const { position, size, startDrag, resetPosition, resizeHandles } = useDragResize({ initialWidth: 500, initialHeight: 480 });
  useEffect(() => { if (showModal) resetPosition(); }, [showModal]);

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
      // logger.error('保存失败:', err);
    }
  };

  // 删除
  const handleDelete = async (oid: string) => {
    if (!await showConfirm('确定要删除该组织吗？')) return;
    try {
      await deleteOrganization(oid);
    } catch (err) {
      // logger.error('删除失败:', err);
    }
  };

  // 递归渲染树形节点
  const renderTreeNode = (org: Organization, level: number = 0): JSX.Element => {
    const hasChildren = org.children && org.children.length > 0;
    const isExpanded = expandedOids.has(org.oid);

    return (
      <div key={org.oid}>
        <div
          className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 border-b border-blue-100"
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
            {org.departmentId && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded flex items-center gap-1" title="已关联部门，双向同步">
                <Building2 className="w-3 h-3" />
                {org.departmentName || org.departmentId}
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
          <div className="bg-blue-50/30">
            {org.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{organizations.length} 个组织</span>
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
            onClick={() => loadOrganizations()}
            className="h-8 px-3 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={() => handleAdd()}
            className="h-8 px-3 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            新增组织
          </button>
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
      {showModal && editingOrg && (
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
                {editingOrg.oid ? '编辑组织' : '新增组织'}
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
                  onChange={(e) => {
                    const newType = e.target.value;
                    setEditingOrg({
                      ...editingOrg,
                      orgType: newType as Organization['orgType'],
                      // 切换非部门类型时清除部门关联
                      ...(newType !== 'department' ? { departmentId: undefined, departmentName: undefined } : {}),
                    });
                  }}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="company">公司</option>
                  <option value="base">基地</option>
                  <option value="region">区域</option>
                  <option value="department">部门</option>
                  <option value="workshop">车间</option>
                </select>
              </div>

              {/* 关联部门（仅部门类型显示） */}
              {(editingOrg.orgType === 'department' || editingOrg.orgType === undefined) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    关联部门 <span className="text-xs text-gray-400">（双向同步）</span>
                  </label>
                  <select
                    value={editingOrg.departmentId || ''}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      const dept = departments.find((d) => d.id === deptId || d.oid === deptId);
                      setEditingOrg({
                        ...editingOrg,
                        departmentId: deptId || undefined,
                        departmentName: dept?.name || undefined,
                      });
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">不关联（独立组织）</option>
                    {departments.filter((d) => d.status !== 'inactive').map((dept) => (
                      <option key={dept.id || dept.oid} value={dept.id || dept.oid}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  {editingOrg.departmentId && (
                    <p className="text-xs text-blue-600 mt-1">
                      已关联部门，修改名称/负责人将双向同步
                    </p>
                  )}
                </div>
              )}

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
