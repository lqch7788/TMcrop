/**
 * 区域系统管理页面 — iAGS AreaSystem 集成
 * 分区与设备系统的关联映射配置
 * Phase 1 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Radio, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useAreaSystemStore } from '../../stores/useAreaSystemStore';
import type { AreaSystemMapping } from '../../stores/useAreaSystemStore';
import { useFarmPartitionStore } from '../../stores/useFarmPartitionStore';
import { Button } from '../../components/ui/button';

export default function AreaSystemManagement() {
  // ========== Store ==========
  const items = useAreaSystemStore((s) => s.items);
  const isLoading = useAreaSystemStore((s) => s.isLoading);
  const fetchItems = useAreaSystemStore((s) => s.fetchItems);
  const createItem = useAreaSystemStore((s) => s.createItem);
  const updateItem = useAreaSystemStore((s) => s.updateItem);
  const deleteItem = useAreaSystemStore((s) => s.deleteItem);

  const partitions = useFarmPartitionStore((s) => s.items);
  const fetchPartitions = useFarmPartitionStore((s) => s.fetchItems);

  // ========== 本地状态 ==========
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AreaSystemMapping | null>(null);

  // 表单状态
  const [form, setForm] = useState({
    partitionOid: '', systemOid: '', deviceOid: '', description: '',
  });

  // ========== 初始加载 ==========
  useEffect(() => { fetchItems(); fetchPartitions(); }, [fetchItems, fetchPartitions]);

  // ========== 筛选后的数据 ==========
  const filteredData = useMemo(() => {
    let filtered = items;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(item =>
        (item.partitionName || '').toLowerCase().includes(kw) ||
        (item.systemName || '').toLowerCase().includes(kw) ||
        (item.description || '').toLowerCase().includes(kw) ||
        (item.deviceOid || '').toLowerCase().includes(kw)
      );
    }
    if (filterStatus) {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    return filtered;
  }, [items, keyword, filterStatus]);

  // ========== 系统名称选项（从已存在的映射中提取 + 预定义） ==========
  const systemOptions = useMemo(() => {
    const existingSystems = [...new Set(items.map(i => i.systemOid).filter(Boolean))];
    return existingSystems;
  }, [items]);

  // ========== 分区下拉选项（扁平化，含父子层级） ==========
  const partitionOptions = useMemo(() => {
    const options: { oid: string; label: string }[] = [];

    // 构建parentOid → name 的快速查找
    const nameMap = new Map(partitions.map(p => [p.oid, p.name]));

    // 递归收集选项，显示层级路径
    const collect = (parentOid: string | null, depth: number, prefix: string) => {
      const children = partitions.filter(p => p.parentOid === parentOid).sort((a, b) => a.sortOrder - b.sortOrder);
      for (const child of children) {
        const label = prefix ? `${prefix} > ${child.name}` : child.name;
        options.push({ oid: child.oid, label });
        collect(child.oid, depth + 1, label);
      }
    };
    collect(null, 0, '');
    return options;
  }, [partitions]);

  // ========== CRUD 操作 ==========
  const resetForm = () => {
    setForm({ partitionOid: '', systemOid: '', deviceOid: '', description: '' });
  };

  const handleAdd = useCallback(async () => {
    if (!form.partitionOid || !form.systemOid) return;
    const result = await createItem({
      partitionOid: form.partitionOid, systemOid: form.systemOid,
      deviceOid: form.deviceOid || undefined, description: form.description || undefined,
    });
    if (result) { setShowAddModal(false); resetForm(); }
  }, [form, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.partitionOid || !form.systemOid) return;
    await updateItem(selectedItem.oid, {
      partitionOid: form.partitionOid, systemOid: form.systemOid,
      deviceOid: form.deviceOid || undefined, description: form.description || undefined,
    });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: AreaSystemMapping) => {
    setSelectedItem(item);
    setForm({
      partitionOid: item.partitionOid, systemOid: item.systemOid,
      deviceOid: item.deviceOid || '', description: item.description || '',
    });
    setShowEditModal(true);
  };

  // ========== 渲染 ==========
  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Radio className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">区域系统</h1>
          <p className="text-sm text-gray-500">分区与设备系统的关联映射配置</p>
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
                  className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索分区、系统或描述..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                <option value="">全部</option>
                <option value="active">使用中</option>
                <option value="inactive">已停用</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setKeyword(''); setFilterStatus(''); }}
                className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700">重置</button>
            </div>
          </div>
        </div>
      </div>

      {/* 表格卡片 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            映射列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}
          </h3>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> 新增映射
          </Button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <th className="py-3 px-4 text-left font-medium">分区名称</th>
                <th className="py-3 px-4 text-left font-medium">设备系统</th>
                <th className="py-3 px-4 text-left font-medium w-40">关联设备</th>
                <th className="py-3 px-4 text-left font-medium">描述</th>
                <th className="py-3 px-4 text-left font-medium w-24">状态</th>
                <th className="py-3 px-4 text-left font-medium w-40">创建时间</th>
                <th className="py-3 px-4 text-center font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">加载中...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                  {items.length === 0 ? '暂无映射数据，点击"新增映射"开始创建' : '无匹配结果'}
                </td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900">
                      {item.partitionName || item.partitionOid}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {item.systemName || item.systemOid}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs font-mono">{item.deviceOid || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs max-w-[300px] truncate">{item.description || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status === 'active' ? '使用中' : '已停用'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-center gap-1">
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
        <MappingModal
          title="新增映射"
          form={form} setForm={setForm}
          partitionOptions={partitionOptions}
          systemOptions={systemOptions}
          onClose={() => { setShowAddModal(false); }}
          onSubmit={handleAdd}
        />
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <MappingModal
          title="编辑映射"
          form={form} setForm={setForm}
          partitionOptions={partitionOptions}
          systemOptions={systemOptions}
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
                确定要删除映射 "<span className="font-medium text-gray-700">{selectedItem.partitionName || selectedItem.partitionOid}</span> → <span className="font-medium text-gray-700">{selectedItem.systemName || selectedItem.systemOid}</span>" 吗？
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

// ==================== 映射新增/编辑弹窗组件 ====================

function MappingModal({ title, form, setForm, partitionOptions, systemOptions, onClose, onSubmit }: {
  title: string;
  form: { partitionOid: string; systemOid: string; deviceOid: string; description: string };
  setForm: (f: any) => void;
  partitionOptions: { oid: string; label: string }[];
  systemOptions: string[];
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  // 系统名称与 OID 分离 — 用户可输入系统OID或从已有中选择
  const [systemInputMode, setSystemInputMode] = useState<'select' | 'input'>(
    systemOptions.length > 0 ? 'select' : 'input'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[560px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 关联配置区 */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-3">关联配置</h4>
            <div className="space-y-4">
              {/* 分区选择 */}
              <div>
                <label className="block text-xs text-emerald-700 mb-1">分区 <span className="text-red-500">*</span></label>
                <select value={form.partitionOid} onChange={e => update('partitionOid', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white">
                  <option value="">— 请选择分区 —</option>
                  {partitionOptions.map(p => (
                    <option key={p.oid} value={p.oid}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* 设备系统选择 */}
              <div>
                <label className="block text-xs text-emerald-700 mb-1">设备系统 <span className="text-red-500">*</span></label>
                {systemOptions.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setSystemInputMode('select')}
                      className={`text-xs px-2 py-1 rounded ${systemInputMode === 'select' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >选择已有</button>
                    <button
                      onClick={() => { setSystemInputMode('input'); update('systemOid', ''); }}
                      className={`text-xs px-2 py-1 rounded ${systemInputMode === 'input' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >手动输入</button>
                  </div>
                )}
                {systemInputMode === 'select' && systemOptions.length > 0 ? (
                  <select value={form.systemOid} onChange={e => update('systemOid', e.target.value)}
                    className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white">
                    <option value="">— 请选择设备系统 —</option>
                    {systemOptions.map(sys => (
                      <option key={sys} value={sys}>{sys}</option>
                    ))}
                  </select>
                ) : (
                  <input value={form.systemOid} onChange={e => update('systemOid', e.target.value)}
                    className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white"
                    placeholder="输入设备系统 OID 或名称" />
                )}
              </div>
            </div>
          </div>

          {/* 详细信息区 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">其他信息</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">关联设备 OID</label>
                <input value={form.deviceOid} onChange={e => update('deviceOid', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono"
                  placeholder="设备 OID（可选）" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">描述备注</label>
                <input value={form.description} onChange={e => update('description', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="备注信息" />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button onClick={onSubmit}
            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            disabled={!form.partitionOid || !form.systemOid}>提交</button>
        </div>
      </div>
    </div>
  );
}
