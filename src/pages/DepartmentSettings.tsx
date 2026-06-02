import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, Edit, Trash2, Search, ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';
import { useDepartmentStore } from '../stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/Pagination';
import type { Department } from '../services/apiBasicDataService';

// 新增/编辑部门弹窗
function DepartmentModal({
  open,
  onClose,
  onSave,
  editItem,
  departmentOptions,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (item: Partial<Department>) => void;
  editItem?: Department | null;
  departmentOptions: Department[];
}) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    parentOid: '',
    managerId: '',
    managerName: '',
    sortNumber: 0,
    description: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        code: editItem.code || '',
        name: editItem.name || '',
        parentOid: editItem.parentOid || '',
        managerId: editItem.managerId || '',
        managerName: editItem.managerName || '',
        sortNumber: editItem.sortNumber || 0,
        description: editItem.description || '',
        status: editItem.status || 'active',
      });
    } else {
      setForm({ code: '', name: '', parentOid: '', managerId: '', managerName: '', sortNumber: 0, description: '', status: 'active' });
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    // 编码为空时自动生成
    const payload = { ...form, code: form.code.trim() || `DEPT_${Date.now()}` };
    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // 过滤掉自身作为父部门选项
  const parentOptions = departmentOptions.filter((d) => d.id !== editItem?.id && d.oid !== editItem?.oid);

  return (
    <Modal isOpen={open} onClose={onClose} title={editItem ? '编辑部门' : '新增部门'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>部门编码 *</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="如: DEPT_TECH"
            />
          </div>
          <div>
            <Label>部门名称 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="如: 技术部"
            />
          </div>
          <div>
            <Label>上级部门</Label>
            <Select
              value={form.parentOid}
              onChange={(e) => setForm((f) => ({ ...f, parentOid: e.target.value || '' }))}
            >
              <option value="">-- 无（顶级部门）--</option>
              {parentOptions.map((d) => (
                <option key={d.oid || d.id} value={d.oid}>
                  {d.code} {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>部门负责人</Label>
            <Input
              value={form.managerName}
              onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))}
              placeholder="负责人姓名"
            />
          </div>
          <div>
            <Label>排序号</Label>
            <Input
              type="number"
              value={form.sortNumber}
              onChange={(e) => setForm((f) => ({ ...f, sortNumber: Number(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>状态</Label>
            <Select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value || 'active' }))}
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>职能描述</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="部门职能描述..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 删除确认弹窗
function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  itemName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}) {
  return (
    <Modal isOpen={open} onClose={onClose} title="确认删除">
      <div className="space-y-4">
        <p className="text-gray-600">
          确定要删除部门 <span className="font-semibold text-gray-900">{itemName}</span> 吗？如果存在子部门，请先删除子部门。
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function DepartmentSettings() {
  const departments = useDepartmentStore((state) => state.departments);
  const loading = useDepartmentStore((state) => state.loading);
  const loadDepartments = useDepartmentStore((state) => state.loadDepartments);
  const addDepartment = useDepartmentStore((state) => state.addDepartment);
  const updateDepartment = useDepartmentStore((state) => state.updateDepartment);
  const removeDepartment = useDepartmentStore((state) => state.removeDepartment);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const pageSize = 10;

  useEffect(() => {
    if (departments.length === 0 && !loading) {
      loadDepartments();
    }
  }, [departments.length, loading, loadDepartments]);

  // 搜索过滤
  const filtered = searchText
    ? departments.filter((d) =>
        d.code?.includes(searchText) ||
        d.name?.includes(searchText) ||
        d.managerName?.includes(searchText)
      )
    : departments;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCount = departments.filter((d) => d.status === 'active').length;

  const handleAdd = async (form: Partial<Department>) => {
    await addDepartment(form);
    setCurrentPage(1);
  };

  const handleEdit = async (form: Partial<Department>) => {
    if (!editItem) return;
    // 使用 oid 或 id 作为标识
    const id = editItem.id || editItem.oid;
    await updateDepartment(id, form);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id || deleteTarget.oid;
    await removeDepartment(id);
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    const newTotal = Math.ceil((filtered.length - 1) / pageSize);
    if (currentPage > newTotal && newTotal > 0) setCurrentPage(newTotal);
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
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">部门设置</h1>
              <p className="text-gray-500">组织架构与部门信息管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              <p className="text-xs text-gray-500">部门总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg font-bold">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.length - activeCount}</p>
              <p className="text-xs text-gray-500">停用</p>
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="搜索部门编码/名称/负责人..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Button
            variant="default"
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            新增部门
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">上级部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">排序</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">加载中...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {searchText ? '没有匹配的部门' : '暂无部门数据'}
                  </td>
                </tr>
              ) : (
                paginated.map((dept) => (
                  <tr key={dept.id || dept.oid} className="hover:bg-blue-100 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{dept.code || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dept.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {(dept as any).parentName || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dept.managerName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dept.sortNumber || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          dept.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {dept.status === 'active' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditItem(dept);
                            setModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-500 hover:text-blue-600"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(dept);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500 hover:text-red-600"
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
        </div>
        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
          <div className="text-sm text-gray-500">共 {filtered.length} 条</div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setCurrentPage(1); }}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <DepartmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={editItem ? handleEdit : handleAdd}
        editItem={editItem}
        departmentOptions={departments}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        itemName={deleteTarget ? `${deleteTarget.code} ${deleteTarget.name}` : ''}
      />
    </div>
  );
}
