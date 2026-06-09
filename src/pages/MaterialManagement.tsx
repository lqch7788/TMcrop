/**
 * 物料管理页面（物料类型定义）
 * 架构：组件 → useMaterialTypeStore (Zustand) → API
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Edit, Loader2, Package, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Modal, FormField, Input, Textarea } from '../components/ui/Modal';
import { useMaterialTypeStore } from '../stores';
import type { MaterialType } from '../services/apiBasicDataService';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { Pagination } from '@/components/ui';

const CATEGORY_OPTIONS = ['肥料', '农药', '农膜', '工具', '种子', '其他'];

export default function MaterialManagement() {
  const { types, loading, error, loadTypes, addType, editType, removeType } = useMaterialTypeStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialType | null>(null);
  const [formData, setFormData] = useState<Partial<MaterialType>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pageSize = 8;

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const filtered = useMemo(() => {
    return types.filter(item => {
      const matchSearch = (item.typeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.typeCode || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === '全部' || item.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [types, searchTerm, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenModal = (item?: MaterialType) => {
    if (item) { setEditingItem(item); setFormData(item); }
    else { setEditingItem(null); setFormData({ status: 'active' }); }
    setErrors({}); setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingItem(null); setFormData({}); setErrors({}); };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.typeCode?.trim()) newErrors.typeCode = '请输入物料编码';
    if (!formData.typeName?.trim()) newErrors.typeName = '请输入物料名称';
    if (!formData.category) newErrors.category = '请选择类别';
    if (!formData.defaultUnit?.trim()) newErrors.defaultUnit = '请输入单位';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      if (editingItem) {
        await editType(editingItem.id, formData);
      } else {
        await addType(formData);
      }
      handleCloseModal();
    } catch (err) { await showAlert('保存失败'); }
  };

  const handleDelete = async (id: number) => {
    if (await showConfirm('确定删除该物料类型吗？')) {
      try { await removeType(id); } catch (err) { await showAlert('删除失败'); }
    }
  };

  const stats = useMemo(() => ({
    total: types.length,
    active: types.filter(t => t.status === 'active').length,
    inactive: types.filter(t => t.status === 'inactive').length,
  }), [types]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物料管理</h1>
            <p className="text-gray-500">生产物料类型的添加、修改、删除、搜索</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500">物料种类</p></div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><span className="text-green-600 text-lg">✓</span></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.active}</p><p className="text-xs text-gray-500">启用</p></div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><span className="text-amber-600 text-lg">!</span></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.inactive}</p><p className="text-xs text-gray-500">停用</p></div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
            <input type="text" placeholder="搜索物料..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <option>全部</option>
              {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="warning" onClick={() => { setSearchTerm(''); setCategoryFilter('全部'); }}><RotateCcw className="w-4 h-4" /> 重置</Button>
            <Button variant="default" onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4" /> 添加物料
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">物料列表</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">类别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单位</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">参考单价(元)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">规格</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.typeCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.typeName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.category || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.defaultUnit || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.defaultPrice || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.specifications || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {item.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenModal(item)} title="编辑"><Edit className="w-4 h-4" /></Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(item.id)} title="删除"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">共 {filtered.length} 条记录</div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[8, 16, 24, 50]}
            showPageSize
          />
        </div>
      </div>

      {showModal && (
        <Modal isOpen={showModal} onClose={handleCloseModal} title={editingItem ? '编辑物料' : '新增物料'} onConfirm={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="物料编码" required error={errors.typeCode}>
                <Input value={formData.typeCode || ''} onChange={(e) => setFormData({ ...formData, typeCode: e.target.value })} placeholder="如：FERT001" />
              </FormField>
              <FormField label="物料名称" required error={errors.typeName}>
                <Input value={formData.typeName || ''} onChange={(e) => setFormData({ ...formData, typeName: e.target.value })} placeholder="请输入物料名称" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="类别" required error={errors.category}>
                <select value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">请选择</option>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="单位" required error={errors.defaultUnit}>
                <Input value={formData.defaultUnit || ''} onChange={(e) => setFormData({ ...formData, defaultUnit: e.target.value })} placeholder="如：公斤" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="参考单价(元)">
                <Input type="number" value={formData.defaultPrice || 0} onChange={(e) => setFormData({ ...formData, defaultPrice: Number(e.target.value) })} placeholder="参考单价" />
              </FormField>
              <FormField label="状态">
                <select value={formData.status || 'active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="active">启用</option><option value="inactive">停用</option>
                </select>
              </FormField>
            </div>
            <FormField label="规格">
              <Input value={formData.specifications || ''} onChange={(e) => setFormData({ ...formData, specifications: e.target.value })} placeholder="规格说明" />
            </FormField>
            <FormField label="备注说明">
              <Textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="请输入备注说明（可选）" rows={3} />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
