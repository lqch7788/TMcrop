/**
 * 能耗管理页面 — iAGS AreaEnery 集成
 * 大棚能耗类型和计量设备配置
 * Phase 3 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useEnergyConfigStore, ENERGY_TYPES } from '../../stores/useEnergyConfigStore';
import type { EnergyConfig } from '../../stores/useEnergyConfigStore';
import { useFarmPartitionStore } from '../../stores/useFarmPartitionStore';
import { Button } from '../../components/ui/button';

export default function EnergyConfigManagement() {
  // ========== Store ==========
  const items = useEnergyConfigStore((s) => s.items);
  const isLoading = useEnergyConfigStore((s) => s.isLoading);
  const fetchItems = useEnergyConfigStore((s) => s.fetchItems);
  const createItem = useEnergyConfigStore((s) => s.createItem);
  const updateItem = useEnergyConfigStore((s) => s.updateItem);
  const deleteItem = useEnergyConfigStore((s) => s.deleteItem);

  const partitions = useFarmPartitionStore((s) => s.items);
  const fetchPartitions = useFarmPartitionStore((s) => s.fetchItems);

  // ========== 本地状态 ==========
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnergyConfig | null>(null);

  const [form, setForm] = useState({
    partitionOid: '', energyType: 'electricity', deviceOid: '',
    deviceName: '', meterCode: '', unit: 'kWh', description: '',
  });

  useEffect(() => { fetchItems(); fetchPartitions(); }, [fetchItems, fetchPartitions]);

  // ========== 筛选 ==========
  const filteredData = useMemo(() => {
    let filtered = items;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(item =>
        (item.partitionName || '').toLowerCase().includes(kw) ||
        (item.deviceName || '').toLowerCase().includes(kw) ||
        (item.description || '').toLowerCase().includes(kw)
      );
    }
    if (filterType) filtered = filtered.filter(item => item.energyType === filterType);
    if (filterStatus) filtered = filtered.filter(item => item.status === filterStatus);
    return filtered;
  }, [items, keyword, filterType, filterStatus]);

  // ========== 统计 ==========
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    byType: ENERGY_TYPES.map(t => ({
      label: t.label, count: items.filter(i => i.energyType === t.value).length,
    })).filter(t => t.count > 0),
  }), [items]);

  // ========== 分区选项 ==========
  const partitionOptions = useMemo(() => partitions.map(p => ({ oid: p.oid, name: p.name })), [partitions]);

  // ========== CRUD ==========
  const resetForm = () => {
    setForm({ partitionOid: '', energyType: 'electricity', deviceOid: '', deviceName: '', meterCode: '', unit: 'kWh', description: '' });
  };

  const handleEnergyTypeChange = (value: string) => {
    const type = ENERGY_TYPES.find(t => t.value === value);
    setForm(prev => ({ ...prev, energyType: value, unit: type?.unit || 'kWh' }));
  };

  const handleAdd = useCallback(async () => {
    if (!form.partitionOid) return;
    const result = await createItem({
      partitionOid: form.partitionOid, energyType: form.energyType,
      deviceOid: form.deviceOid || undefined, deviceName: form.deviceName || undefined,
      meterCode: form.meterCode || undefined, unit: form.unit, description: form.description || undefined,
    });
    if (result) { setShowAddModal(false); resetForm(); }
  }, [form, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.partitionOid) return;
    await updateItem(selectedItem.oid, {
      partitionOid: form.partitionOid, energyType: form.energyType,
      deviceOid: form.deviceOid || undefined, deviceName: form.deviceName || undefined,
      meterCode: form.meterCode || undefined, unit: form.unit, description: form.description || undefined,
    });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: EnergyConfig) => {
    setSelectedItem(item);
    setForm({
      partitionOid: item.partitionOid, energyType: item.energyType,
      deviceOid: item.deviceOid || '', deviceName: item.deviceName || '',
      meterCode: item.meterCode || '', unit: item.unit, description: item.description || '',
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Zap className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">能耗管理</h1>
          <p className="text-sm text-gray-500">大棚能耗类型和计量设备配置</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">配置总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-green-600">使用中</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 col-span-2">
          <p className="text-sm text-gray-500 mb-2">能耗类型分布</p>
          <div className="flex items-center gap-3">
            {stats.byType.length > 0 ? stats.byType.map(t => (
              <span key={t.label} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                {t.label}: {t.count}
              </span>
            )) : <span className="text-sm text-gray-400">暂无数据</span>}
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-end gap-4">
          <div className="grid grid-cols-4 gap-4 flex-1">
            <div>
              <label className="block text-xs text-gray-500 mb-1">关键词搜索</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input value={keyword} onChange={e => setKeyword(e.target.value)}
                  className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索分区、设备或描述..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">能耗类型</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                <option value="">全部</option>
                {ENERGY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
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
              <button onClick={() => { setKeyword(''); setFilterType(''); setFilterStatus(''); }}
                className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700">重置</button>
            </div>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            能耗配置列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}
          </h3>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> 新增配置
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <th className="py-3 px-4 text-left font-medium">所属分区</th>
                <th className="py-3 px-4 text-left font-medium w-24">能耗类型</th>
                <th className="py-3 px-4 text-left font-medium">计量设备</th>
                <th className="py-3 px-4 text-left font-medium w-32">表计编号</th>
                <th className="py-3 px-4 text-left font-medium w-20">单位</th>
                <th className="py-3 px-4 text-left font-medium">描述</th>
                <th className="py-3 px-4 text-left font-medium w-24">状态</th>
                <th className="py-3 px-4 text-center font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">加载中...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                  {items.length === 0 ? '暂无能耗配置' : '无匹配结果'}
                </td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{item.partitionName || item.partitionOid}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.energyType === 'electricity' ? 'bg-yellow-100 text-yellow-700' :
                        item.energyType === 'water' ? 'bg-blue-100 text-blue-700' :
                        item.energyType === 'gas' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {ENERGY_TYPES.find(t => t.value === item.energyType)?.label || item.energyType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">{item.deviceName || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs font-mono">{item.meterCode || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-500">{item.unit}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs max-w-[200px] truncate">{item.description || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status === 'active' ? '使用中' : '已停用'}
                      </span>
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

      {/* 新增/编辑弹窗 */}
      {(showAddModal || showEditModal) && (
        <EnergyModal
          title={showAddModal ? '新增能耗配置' : '编辑能耗配置'}
          form={form} setForm={setForm}
          partitionOptions={partitionOptions}
          onEnergyTypeChange={handleEnergyTypeChange}
          onClose={() => { setShowAddModal(false); setShowEditModal(false); setSelectedItem(null); }}
          onSubmit={showAddModal ? handleAdd : handleEdit}
        />
      )}

      {/* 删除确认 */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-sm text-gray-500">
                确定要删除 "{selectedItem.partitionName || selectedItem.partitionOid}" 的能耗配置吗？
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

// ==================== 能耗配置弹窗 ====================

function EnergyModal({ title, form, setForm, partitionOptions, onEnergyTypeChange, onClose, onSubmit }: {
  title: string;
  form: { partitionOid: string; energyType: string; deviceOid: string; deviceName: string; meterCode: string; unit: string; description: string };
  setForm: (f: any) => void;
  partitionOptions: { oid: string; name: string }[];
  onEnergyTypeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[560px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 关联配置 */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-3">关联配置</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-emerald-700 mb-1">所属分区 <span className="text-red-500">*</span></label>
                <select value={form.partitionOid} onChange={e => update('partitionOid', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white">
                  <option value="">— 请选择大棚/分区 —</option>
                  {partitionOptions.map(p => <option key={p.oid} value={p.oid}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">能耗类型 <span className="text-red-500">*</span></label>
                <select value={form.energyType} onChange={e => onEnergyTypeChange(e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white">
                  {ENERGY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 计量设备 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">计量设备</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">设备名称</label>
                <input value={form.deviceName} onChange={e => update('deviceName', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="如：电表001" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">表计编号</label>
                <input value={form.meterCode} onChange={e => update('meterCode', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono" placeholder="如：MTR-001" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">设备 OID</label>
                <input value={form.deviceOid} onChange={e => update('deviceOid', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono" placeholder="可选" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">计量单位</label>
                <input value={form.unit} onChange={e => update('unit', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="kWh" />
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 border border-gray-100">
            <label className="block text-xs text-gray-500 mb-1">描述备注</label>
            <input value={form.description} onChange={e => update('description', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="备注信息" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button onClick={onSubmit}
            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            disabled={!form.partitionOid}>提交</button>
        </div>
      </div>
    </div>
  );
}
