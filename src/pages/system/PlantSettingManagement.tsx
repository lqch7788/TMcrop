/**
 * 种植设置页面 — iAGS Plantset 集成
 * 种植图标和品种种植参数配置
 * Phase 6 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Tractor, Plus, Pencil, Trash2, Search, X, Image } from 'lucide-react';
import { usePlantSettingStore } from '../../stores/usePlantSettingStore';
import type { PlantSetting } from '../../stores/usePlantSettingStore';
import { Button } from '../../components/ui/button';

export default function PlantSettingManagement() {
  const items = usePlantSettingStore((s) => s.items);
  const isLoading = usePlantSettingStore((s) => s.isLoading);
  const fetchItems = usePlantSettingStore((s) => s.fetchItems);
  const createItem = usePlantSettingStore((s) => s.createItem);
  const updateItem = usePlantSettingStore((s) => s.updateItem);
  const deleteItem = usePlantSettingStore((s) => s.deleteItem);

  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlantSetting | null>(null);
  const [form, setForm] = useState({ settingKey: '', settingValue: '', cropVarietyOid: '', iconUrl: '', description: '' });

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filteredData = useMemo(() => {
    let filtered = items;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(i => i.settingKey.toLowerCase().includes(kw) || (i.settingValue || '').toLowerCase().includes(kw) || (i.description || '').toLowerCase().includes(kw));
    }
    if (filterStatus) filtered = filtered.filter(i => i.status === filterStatus);
    return filtered;
  }, [items, keyword, filterStatus]);

  const resetForm = () => setForm({ settingKey: '', settingValue: '', cropVarietyOid: '', iconUrl: '', description: '' });

  const handleAdd = useCallback(async () => {
    if (!form.settingKey.trim()) return;
    const r = await createItem({
      settingKey: form.settingKey, settingValue: form.settingValue || undefined,
      cropVarietyOid: form.cropVarietyOid || undefined, iconUrl: form.iconUrl || undefined,
      description: form.description || undefined,
    });
    if (r) { setShowAddModal(false); resetForm(); }
  }, [form, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.settingKey.trim()) return;
    await updateItem(selectedItem.oid, {
      settingKey: form.settingKey, settingValue: form.settingValue || undefined,
      cropVarietyOid: form.cropVarietyOid || undefined, iconUrl: form.iconUrl || undefined,
      description: form.description || undefined,
    });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: PlantSetting) => {
    setSelectedItem(item);
    setForm({ settingKey: item.settingKey, settingValue: item.settingValue || '', cropVarietyOid: item.cropVarietyOid || '', iconUrl: item.iconUrl || '', description: item.description || '' });
    setShowEditModal(true);
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
              <Tractor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">种植设置</h1>
              <p className="text-gray-500">种植图标和品种种植参数配置</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-end gap-4">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div>
              <label className="block text-xs text-gray-500 mb-1">关键词搜索</label>
              <div className="relative"><Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input value={keyword} onChange={e => setKeyword(e.target.value)} className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索设置键或值..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                <option value="">全部</option><option value="active">使用中</option><option value="inactive">已停用</option>
              </select>
            </div>
            <div className="flex items-end"><button onClick={() => { setKeyword(''); setFilterStatus(''); }} className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700">重置</button></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">设置列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}</h3>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}><Plus className="w-4 h-4" /> 新增设置</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <th className="py-3 px-4 text-left font-medium">设置键</th>
              <th className="py-3 px-4 text-left font-medium">设置值</th>
              <th className="py-3 px-4 text-left font-medium w-36">关联品种</th>
              <th className="py-3 px-4 text-left font-medium w-36">图标</th>
              <th className="py-3 px-4 text-left font-medium">描述</th>
              <th className="py-3 px-4 text-left font-medium w-24">状态</th>
              <th className="py-3 px-4 text-center font-medium w-24">操作</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="py-12 text-center text-gray-400">加载中...</td></tr> :
               filteredData.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-gray-400">{items.length === 0 ? '暂无设置数据' : '无匹配结果'}</td></tr> :
               filteredData.map(item => {
                return (
                <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-4"><span className="inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-100 text-blue-700">{item.settingKey}</span></td>
                  <td className="py-2.5 px-4 font-medium text-gray-900 max-w-[200px] truncate">{item.settingValue || '-'}</td>
                  <td className="py-2.5 px-4 text-gray-500 text-xs font-mono">{item.cropVarietyOid || '-'}</td>
                  <td className="py-2.5 px-4">{item.iconUrl ? <Image className="w-5 h-5 text-emerald-500" /> : <span className="text-gray-400 text-xs">-</span>}</td>
                  <td className="py-2.5 px-4 text-gray-500 text-xs max-w-[200px] truncate">{item.description || '-'}</td>
                  <td className="py-2.5 px-4"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.status === 'active' ? '使用中' : '已停用'}</span></td>
                  <td className="py-2.5 px-4"><div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEditModal(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(item); setShowDeleteConfirm(true); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-[560px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white shrink-0">
              <h3 className="text-lg font-semibold">{showAddModal ? '新增设置' : '编辑设置'}</h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-1 hover:bg-white/20 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-emerald-700 mb-3">基本配置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-emerald-700 mb-1">设置键 <span className="text-red-500">*</span></label>
                    <input value={form.settingKey} onChange={e => setForm(f => ({ ...f, settingKey: e.target.value }))} className="w-full h-9 px-3 border border-emerald-200 rounded text-sm bg-white" placeholder="如：plant_icon" /></div>
                  <div><label className="block text-xs text-emerald-700 mb-1">设置值</label>
                    <input value={form.settingValue} onChange={e => setForm(f => ({ ...f, settingValue: e.target.value }))} className="w-full h-9 px-3 border border-emerald-200 rounded text-sm bg-white" placeholder="如：tomato" /></div>
                </div>
              </div>
              <div className="rounded-lg p-4 border border-gray-100 space-y-4">
                <div><label className="block text-xs text-gray-500 mb-1">关联品种 OID</label>
                  <input value={form.cropVarietyOid} onChange={e => setForm(f => ({ ...f, cropVarietyOid: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm font-mono" placeholder="品种OID" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">图标 URL</label>
                  <input value={form.iconUrl} onChange={e => setForm(f => ({ ...f, iconUrl: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="https://..." /></div>
                <div><label className="block text-xs text-gray-500 mb-1">描述</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="备注" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button onClick={showAddModal ? handleAdd : handleEdit} className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50" disabled={!form.settingKey.trim()}>提交</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="p-6"><h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-sm text-gray-500">确定要删除设置 "<span className="font-medium text-gray-700">{selectedItem.settingKey}</span>" 吗？</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
