/**
 * 分区管理页面 — iAGS GreenHouseArea 集成
 * 大棚和种植分区层级管理 · 传感器/水肥/摄像头关联
 * Phase 1 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Grid3X3, Plus, Pencil, Trash2, Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useFarmPartitionStore } from '../../stores/useFarmPartitionStore';
import type { FarmPartition } from '../../stores/useFarmPartitionStore';
import { Button } from '../../components/ui/button';

// 区域类型选项（从数据字典 concept 对应）
const AREA_TYPES = [
  { value: 'greenhouse', label: '大棚' },
  { value: 'shed_out', label: '棚外' },
  { value: 'shed_in', label: '棚内' },
  { value: 'plant_area', label: '种植区' },
];

export default function FarmPartitionManagement() {
  // ========== Store ==========
  const items = useFarmPartitionStore((s) => s.items);
  const isLoading = useFarmPartitionStore((s) => s.isLoading);
  const fetchItems = useFarmPartitionStore((s) => s.fetchItems);
  const createItem = useFarmPartitionStore((s) => s.createItem);
  const updateItem = useFarmPartitionStore((s) => s.updateItem);
  const deleteItem = useFarmPartitionStore((s) => s.deleteItem);

  // ========== 本地状态 ==========
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FarmPartition | null>(null);
  const [parentForAdd, setParentForAdd] = useState<string | null>(null);

  // 表单状态
  const [form, setForm] = useState({
    name: '', areaType: 'greenhouse', greenhouseType: '',
    area: 0, areaUnit: '亩', managerName: '', address: '', description: '',
  });

  // ========== 初始加载 ==========
  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ========== 构建树形数据 ==========
  const treeData = useMemo(() => {
    const buildTree = (parentOid: string | null): FarmPartition[] => {
      return items
        .filter(p => (parentOid === null ? !p.parentOid : p.parentOid === parentOid))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(p => ({ ...p, children: buildTree(p.oid) }));
    };
    return buildTree(null);
  }, [items]);

  // ========== 扁平化树（用于筛选后的展示） ==========
  const flattenTree = useCallback((nodes: FarmPartition[], depth: number = 0): (FarmPartition & { depth: number; hasChildren: boolean })[] => {
    const result: (FarmPartition & { depth: number; hasChildren: boolean })[] = [];
    for (const node of nodes) {
      const hasChildren = (node.children && node.children.length > 0) || false;
      result.push({ ...node, depth, hasChildren });
      if (node.children && expandedIds.has(node.oid)) {
        result.push(...flattenTree(node.children, depth + 1));
      }
    }
    return result;
  }, [expandedIds]);

  const filteredData = useMemo(() => {
    let filtered = flattenTree(treeData);
    if (keyword) {
      filtered = filtered.filter(p => p.name.includes(keyword) || (p.description || '').includes(keyword));
    }
    if (filterType) {
      filtered = filtered.filter(p => p.areaType === filterType);
    }
    return filtered;
  }, [treeData, flattenTree, keyword, filterType]);

  // ========== 切换展开 ==========
  const toggleExpand = (oid: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(oid)) next.delete(oid); else next.add(oid);
      return next;
    });
  };

  // ========== 递归展开所有 ==========
  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: FarmPartition[]) => {
      nodes.forEach(n => { if (n.children?.length) { allIds.add(n.oid); collect(n.children); } });
    };
    collect(treeData);
    setExpandedIds(allIds);
  };

  const collapseAll = () => setExpandedIds(new Set());

  // ========== CRUD 操作 ==========
  const resetForm = () => {
    setForm({ name: '', areaType: 'greenhouse', greenhouseType: '', area: 0, areaUnit: '亩', managerName: '', address: '', description: '' });
  };

  const handleAdd = useCallback(async () => {
    if (!form.name.trim()) return;
    const result = await createItem({
      name: form.name, areaType: form.areaType, greenhouseType: form.greenhouseType || undefined,
      area: form.area, areaUnit: form.areaUnit, managerName: form.managerName || undefined,
      address: form.address || undefined, description: form.description || undefined,
      parentOid: parentForAdd,
    });
    if (result) { setShowAddModal(false); resetForm(); setParentForAdd(null); }
  }, [form, parentForAdd, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.name.trim()) return;
    await updateItem(selectedItem.oid, {
      name: form.name, areaType: form.areaType, greenhouseType: form.greenhouseType || undefined,
      area: form.area, areaUnit: form.areaUnit, managerName: form.managerName || undefined,
      address: form.address || undefined, description: form.description || undefined,
    });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: FarmPartition) => {
    setSelectedItem(item);
    setForm({
      name: item.name, areaType: item.areaType, greenhouseType: item.greenhouseType || '',
      area: item.area, areaUnit: item.areaUnit, managerName: item.managerName || '',
      address: item.address || '', description: item.description || '',
    });
    setShowEditModal(true);
  };

  const openAddChildModal = (parentOid: string) => {
    setParentForAdd(parentOid);
    resetForm();
    setShowAddModal(true);
  };

  // ========== 渲染 ==========
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
              <Grid3X3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">分区管理</h1>
              <p className="text-gray-500">大棚和种植分区层级管理 · 传感器/水肥/摄像头关联</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-end gap-4">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div>
              <label className="block text-xs text-gray-500 mb-1">关键词搜索</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input value={keyword} onChange={e => setKeyword(e.target.value)}
                  className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索名称或描述..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">区域类型</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                <option value="">全部类型</option>
                {AREA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => { setKeyword(''); setFilterType(''); }}
                className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700">重置</button>
              <button onClick={expandAll} className="h-9 px-3 text-sm text-blue-600 hover:text-blue-700">全部展开</button>
              <button onClick={collapseAll} className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700">全部折叠</button>
            </div>
          </div>
        </div>
      </div>

      {/* 表格卡片 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            分区列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}
          </h3>
          <Button size="sm" onClick={() => { setParentForAdd(null); resetForm(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> 新增分区
          </Button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <th className="py-3 px-4 text-left font-medium w-10"></th>
                <th className="py-3 px-4 text-left font-medium">名称</th>
                <th className="py-3 px-4 text-left font-medium w-24">区域类型</th>
                <th className="py-3 px-4 text-left font-medium w-20">面积</th>
                <th className="py-3 px-4 text-left font-medium w-24">负责人</th>
                <th className="py-3 px-4 text-left font-medium w-24">大棚类型</th>
                <th className="py-3 px-4 text-left font-medium">位置</th>
                <th className="py-3 px-4 text-left font-medium w-20">排序</th>
                <th className="py-3 px-4 text-left font-medium w-24">状态</th>
                <th className="py-3 px-4 text-center font-medium w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">加载中...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">
                  {items.length === 0 ? '暂无分区数据，点击"新增分区"开始创建' : '无匹配结果'}
                </td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1" style={{ paddingLeft: item.depth * 20 }}>
                        {item.hasChildren ? (
                          <button onClick={() => toggleExpand(item.oid)} className="p-0.5 hover:bg-gray-200 rounded">
                            {expandedIds.has(item.oid)
                              ? <ChevronDown className="w-4 h-4 text-gray-500" />
                              : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          </button>
                        ) : <span className="w-5" />}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-900">{item.name}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.areaType === 'greenhouse' ? 'bg-green-100 text-green-700' :
                        item.areaType === 'plant_area' ? 'bg-blue-100 text-blue-700' :
                        item.areaType === 'shed_in' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {AREA_TYPES.find(t => t.value === item.areaType)?.label || item.areaType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">{item.area > 0 ? `${item.area}${item.areaUnit}` : '-'}</td>
                    <td className="py-2.5 px-4 text-gray-600">{item.managerName || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-600">{item.greenhouseType || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs max-w-[200px] truncate">{item.address || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-500">{item.sortOrder}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status === 'active' ? '使用中' : '已停用'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openAddChildModal(item.oid)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="添加子分区">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setSelectedItem(item); setShowDeleteConfirm(true); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增弹窗 */}
      {showAddModal && (
        <PartitionModal
          title={parentForAdd ? '添加子分区' : '新增分区'}
          form={form} setForm={setForm}
          onClose={() => { setShowAddModal(false); setParentForAdd(null); }}
          onSubmit={handleAdd}
        />
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <PartitionModal
          title="编辑分区"
          form={form} setForm={setForm}
          onClose={() => { setShowEditModal(false); setSelectedItem(null); }}
          onSubmit={handleEdit}
        />
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-sm text-gray-500">
                确定要删除分区 "<span className="font-medium text-gray-700">{selectedItem.name}</span>" 吗？
                {items.filter(p => p.parentOid === selectedItem.oid).length > 0 && (
                  <span className="block mt-1 text-amber-600">注意：其下的所有子分区也将被一同删除。</span>
                )}
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 分区新增/编辑弹窗组件 ====================

function PartitionModal({ title, form, setForm, onClose, onSubmit }: {
  title: string;
  form: { name: string; areaType: string; greenhouseType: string; area: number; areaUnit: string; managerName: string; address: string; description: string };
  setForm: (f: any) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 基本信息区 */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-3">基本信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-emerald-700 mb-1">名称 <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => update('name', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white" placeholder="分区/大棚名称" />
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">区域类型</label>
                <select value={form.areaType} onChange={e => update('areaType', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white">
                  {AREA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">面积</label>
                <div className="flex gap-1">
                  <input type="number" value={form.area || ''} onChange={e => update('area', Number(e.target.value))}
                    className="flex-1 h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white" placeholder="面积" />
                  <select value={form.areaUnit} onChange={e => update('areaUnit', e.target.value)}
                    className="w-16 h-9 px-1 border border-emerald-200 rounded text-sm bg-white">
                    <option value="亩">亩</option><option value="㎡">㎡</option><option value="ha">ha</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">大棚类型</label>
                <input value={form.greenhouseType} onChange={e => update('greenhouseType', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white" placeholder="如：玻璃温室、薄膜大棚" />
              </div>
            </div>
          </div>

          {/* 详细信息区 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">详细信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">负责人</label>
                <input value={form.managerName} onChange={e => update('managerName', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="负责人姓名" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">位置地址</label>
                <input value={form.address} onChange={e => update('address', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="详细位置" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">描述备注</label>
                <input value={form.description} onChange={e => update('description', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="备注信息" />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button onClick={onSubmit}
            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            disabled={!form.name.trim()}>提交</button>
        </div>
      </div>
    </div>
  );
}
