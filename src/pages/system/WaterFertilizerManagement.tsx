/**
 * 水肥一体机管理页面 — iAGS WaterFertilizer 集成
 * 灌溉时段、间隔和ABC混合比例参数配置
 * Phase 5 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Droplets, Plus, Pencil, Trash2, Search, X, Send, Loader2, Clock, Repeat, FlaskConical } from 'lucide-react';
import { useWaterFertilizerStore, INTERVAL_UNITS } from '../../stores/useWaterFertilizerStore';
import type { WaterFertilizerConfig } from '../../stores/useWaterFertilizerStore';
import { useFarmPartitionStore } from '../../stores/useFarmPartitionStore';
import { Button } from '../../components/ui/button';

export default function WaterFertilizerManagement() {
  // ========== Store ==========
  const items = useWaterFertilizerStore((s) => s.items);
  const isLoading = useWaterFertilizerStore((s) => s.isLoading);
  const fetchItems = useWaterFertilizerStore((s) => s.fetchItems);
  const createItem = useWaterFertilizerStore((s) => s.createItem);
  const updateItem = useWaterFertilizerStore((s) => s.updateItem);
  const deleteItem = useWaterFertilizerStore((s) => s.deleteItem);
  const dispatchParams = useWaterFertilizerStore((s) => s.dispatchParams);

  const partitions = useFarmPartitionStore((s) => s.items);
  const fetchPartitions = useFarmPartitionStore((s) => s.fetchItems);

  // ========== 本地状态 ==========
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WaterFertilizerConfig | null>(null);

  // 下发进度
  const [dispatchingOid, setDispatchingOid] = useState<string | null>(null);
  const [dispatchProgress, setDispatchProgress] = useState(0);

  const defaultForm = {
    partitionOid: '', deviceOid: '', deviceCode: '',
    machineAddr: '', macAddr: '',
    startTime: '', endTime: '',
    intervalValue: 1, intervalUnit: 'day',
    mixRatioA: 0, mixRatioB: 0, mixRatioC: 0, description: '',
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { fetchItems(); fetchPartitions(); }, [fetchItems, fetchPartitions]);

  // ========== 筛选 ==========
  const filteredData = useMemo(() => {
    let filtered = items;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(item =>
        (item.partitionName || '').toLowerCase().includes(kw) ||
        (item.deviceCode || '').toLowerCase().includes(kw) ||
        (item.description || '').toLowerCase().includes(kw)
      );
    }
    if (filterStatus) filtered = filtered.filter(item => item.status === filterStatus);
    return filtered;
  }, [items, keyword, filterStatus]);

  const partitionOptions = useMemo(() => partitions.map(p => ({ oid: p.oid, name: p.name })), [partitions]);

  // ========== CRUD ==========
  const resetForm = () => setForm({ ...defaultForm });

  const handleAdd = useCallback(async () => {
    if (!form.partitionOid) return;
    const result = await createItem({
      partitionOid: form.partitionOid, deviceOid: form.deviceOid || undefined,
      deviceCode: form.deviceCode || undefined,
      machineAddr: form.machineAddr || undefined, macAddr: form.macAddr || undefined,
      startTime: form.startTime || undefined, endTime: form.endTime || undefined,
      intervalValue: form.intervalValue, intervalUnit: form.intervalUnit,
      mixRatioA: form.mixRatioA, mixRatioB: form.mixRatioB, mixRatioC: form.mixRatioC,
      description: form.description || undefined,
    });
    if (result) { setShowAddModal(false); resetForm(); }
  }, [form, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.partitionOid) return;
    await updateItem(selectedItem.oid, {
      partitionOid: form.partitionOid, deviceOid: form.deviceOid || undefined,
      deviceCode: form.deviceCode || undefined,
      machineAddr: form.machineAddr || undefined, macAddr: form.macAddr || undefined,
      startTime: form.startTime || undefined, endTime: form.endTime || undefined,
      intervalValue: form.intervalValue, intervalUnit: form.intervalUnit,
      mixRatioA: form.mixRatioA, mixRatioB: form.mixRatioB, mixRatioC: form.mixRatioC,
      description: form.description || undefined,
    });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: WaterFertilizerConfig) => {
    setSelectedItem(item);
    setForm({
      partitionOid: item.partitionOid, deviceOid: item.deviceOid || '',
      deviceCode: item.deviceCode || '', machineAddr: item.machineAddr || '',
      macAddr: item.macAddr || '', startTime: item.startTime || '',
      endTime: item.endTime || '', intervalValue: item.intervalValue,
      intervalUnit: item.intervalUnit, mixRatioA: item.mixRatioA,
      mixRatioB: item.mixRatioB, mixRatioC: item.mixRatioC,
      description: item.description || '',
    });
    setShowEditModal(true);
  };

  // ========== 参数下发 ==========
  const handleDispatch = useCallback(async (oid: string) => {
    setDispatchingOid(oid);
    setDispatchProgress(0);
    // 模拟进度
    const interval = setInterval(() => {
      setDispatchProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 30;
      });
    }, 300);
    const result = await dispatchParams(oid);
    clearInterval(interval);
    if (result) {
      setDispatchProgress(100);
      setTimeout(() => { setDispatchingOid(null); setDispatchProgress(0); }, 1500);
    } else {
      setDispatchingOid(null);
      setDispatchProgress(0);
    }
  }, [dispatchParams]);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Droplets className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">水肥一体机</h1>
          <p className="text-sm text-gray-500">灌溉时段、间隔和ABC混合比例参数配置</p>
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
                  className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索分区或设备..." />
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

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            设备列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}
          </h3>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> 新增配置
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <th className="py-3 px-4 text-left font-medium">分区</th>
                <th className="py-3 px-4 text-left font-medium w-28">设备编号</th>
                <th className="py-3 px-4 text-left font-medium w-44">灌溉时段</th>
                <th className="py-3 px-4 text-left font-medium w-28">灌溉间隔</th>
                <th className="py-3 px-4 text-left font-medium w-44">ABC混合比例</th>
                <th className="py-3 px-4 text-left font-medium w-20">状态</th>
                <th className="py-3 px-4 text-center font-medium w-36">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">加载中...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                  {items.length === 0 ? '暂无水肥配置' : '无匹配结果'}
                </td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{item.partitionName || item.partitionOid}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-mono text-gray-500">{item.deviceCode || '-'}</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 text-xs">
                      {item.startTime && item.endTime ? `${item.startTime} ~ ${item.endTime}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">
                      每{item.intervalValue}{INTERVAL_UNITS.find(u => u.value === item.intervalUnit)?.label || ''}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-mono">A:{item.mixRatioA}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono">B:{item.mixRatioB}</span>
                        <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-mono">C:{item.mixRatioC}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status === 'active' ? '使用中' : '已停用'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* 下发按钮 */}
                        {dispatchingOid === item.oid ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded">
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                            <span className="text-xs text-emerald-600">{Math.round(dispatchProgress)}%</span>
                          </div>
                        ) : (
                          <button onClick={() => handleDispatch(item.oid)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="下发参数">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
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
        <WaterFertilizerModal
          title={showAddModal ? '新增水肥配置' : '编辑水肥配置'}
          form={form} setForm={setForm}
          partitionOptions={partitionOptions}
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
                确定要删除 {selectedItem.partitionName || selectedItem.partitionOid} 的水肥配置吗？
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

// ==================== 水肥配置弹窗（复杂表单） ====================

function WaterFertilizerModal({ title, form, setForm, partitionOptions, onClose, onSubmit }: {
  title: string;
  form: typeof defaultForm;
  setForm: (f: any) => void;
  partitionOptions: { oid: string; name: string }[];
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[680px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 分区和设备关联 */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4" /> 设备关联
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-emerald-700 mb-1">所属分区 <span className="text-red-500">*</span></label>
                <select value={form.partitionOid} onChange={e => update('partitionOid', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white">
                  <option value="">— 请选择大棚/分区 —</option>
                  {partitionOptions.map(p => <option key={p.oid} value={p.oid}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">设备编号</label>
                <input value={form.deviceCode} onChange={e => update('deviceCode', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white font-mono" placeholder="如：WF-001" />
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">设备 OID</label>
                <input value={form.deviceOid} onChange={e => update('deviceOid', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white font-mono" placeholder="可选" />
              </div>
            </div>
          </div>

          {/* 硬件地址（只读风格展示） */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">硬件地址</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">设备地址 (MachineAddr)</label>
                <input value={form.machineAddr} onChange={e => update('machineAddr', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono bg-gray-50"
                  placeholder="设备物理地址" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">MAC 地址 (MACAddr)</label>
                <input value={form.macAddr} onChange={e => update('macAddr', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono bg-gray-50"
                  placeholder="网络MAC地址" />
              </div>
            </div>
          </div>

          {/* 灌溉时段 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> 灌溉时段
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">开始时间</label>
                <input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">结束时间</label>
                <input type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
          </div>

          {/* 灌溉间隔 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Repeat className="w-4 h-4" /> 灌溉间隔
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">每隔</span>
              <input type="number" min={1} max={365} value={form.intervalValue} onChange={e => update('intervalValue', Number(e.target.value))}
                className="w-20 h-9 px-3 border border-gray-200 rounded text-sm text-center focus:outline-none focus:border-emerald-400" />
              <select value={form.intervalUnit} onChange={e => update('intervalUnit', e.target.value)}
                className="h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400">
                {INTERVAL_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              <span className="text-sm text-gray-500">灌溉一次</span>
            </div>
          </div>

          {/* ABC 混合比例 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> ABC 混合比例
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-red-600 mb-1 font-medium">A 液比例</label>
                <div className="flex items-center">
                  <input type="number" min={0} max={100} step={0.1} value={form.mixRatioA} onChange={e => update('mixRatioA', Number(e.target.value))}
                    className="w-full h-9 px-3 border border-red-200 rounded-l text-sm text-center focus:outline-none focus:border-red-400 bg-red-50" />
                  <span className="h-9 px-2 flex items-center text-xs bg-red-100 text-red-600 rounded-r border border-red-200 border-l-0">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-blue-600 mb-1 font-medium">B 液比例</label>
                <div className="flex items-center">
                  <input type="number" min={0} max={100} step={0.1} value={form.mixRatioB} onChange={e => update('mixRatioB', Number(e.target.value))}
                    className="w-full h-9 px-3 border border-blue-200 rounded-l text-sm text-center focus:outline-none focus:border-blue-400 bg-blue-50" />
                  <span className="h-9 px-2 flex items-center text-xs bg-blue-100 text-blue-600 rounded-r border border-blue-200 border-l-0">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-green-600 mb-1 font-medium">C 液比例</label>
                <div className="flex items-center">
                  <input type="number" min={0} max={100} step={0.1} value={form.mixRatioC} onChange={e => update('mixRatioC', Number(e.target.value))}
                    className="w-full h-9 px-3 border border-green-200 rounded-l text-sm text-center focus:outline-none focus:border-green-400 bg-green-50" />
                  <span className="h-9 px-2 flex items-center text-xs bg-green-100 text-green-600 rounded-r border border-green-200 border-l-0">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 描述 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <label className="block text-xs text-gray-500 mb-1">描述备注</label>
            <input value={form.description} onChange={e => update('description', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="备注信息" />
          </div>
        </div>

        {/* 底部按钮 */}
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

// 默认表单常量
const defaultForm = {
  partitionOid: '', deviceOid: '', deviceCode: '',
  machineAddr: '', macAddr: '',
  startTime: '', endTime: '',
  intervalValue: 1, intervalUnit: 'day',
  mixRatioA: 0, mixRatioB: 0, mixRatioC: 0, description: '',
};
