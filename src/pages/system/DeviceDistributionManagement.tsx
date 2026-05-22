/**
 * 设备分配页面 — iAGS DeviceDistribution 集成
 * IoT设备分配到温室/区域 + 运行参数配置
 * 预留端口 — 种植管理系统暂无真实IoT设备
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MonitorCheck, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useDeviceDistributionStore } from '../../stores/useDeviceDistributionStore';
import type { DeviceDistribution } from '../../services/apiDeviceDistributionService';
import { Button } from '../../components/ui/button';

export default function DeviceDistributionManagement() {
  const items = useDeviceDistributionStore((s) => s.items);
  const isLoading = useDeviceDistributionStore((s) => s.isLoading);
  const fetchItems = useDeviceDistributionStore((s) => s.fetchItems);
  const createItem = useDeviceDistributionStore((s) => s.createItem);
  const updateItem = useDeviceDistributionStore((s) => s.updateItem);
  const deleteItem = useDeviceDistributionStore((s) => s.deleteItem);

  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeviceDistribution | null>(null);
  const [form, setForm] = useState({
    deviceName: '', deviceCode: '', siteName: '', areaName: '', deviceType: '',
    motorName: '', sortOrder: 0, allowRuntime: '', restTime: '', initialStatus: '',
    circuit: '', slaveDevices: '', startTime: '', showCurve: 0, specs: '', remarks: '',
  });

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filteredData = useMemo(() => {
    let filtered = items;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(i =>
        i.deviceName.toLowerCase().includes(kw) ||
        (i.deviceCode || '').toLowerCase().includes(kw) ||
        (i.siteName || '').toLowerCase().includes(kw) ||
        (i.deviceType || '').toLowerCase().includes(kw)
      );
    }
    if (filterType) filtered = filtered.filter(i => i.deviceType === filterType);
    return filtered;
  }, [items, keyword, filterType]);

  const deviceTypes = useMemo(() => {
    const types = new Set(items.map(i => i.deviceType).filter(Boolean));
    return Array.from(types);
  }, [items]);

  const resetForm = () => setForm({
    deviceName: '', deviceCode: '', siteName: '', areaName: '', deviceType: '',
    motorName: '', sortOrder: 0, allowRuntime: '', restTime: '', initialStatus: '',
    circuit: '', slaveDevices: '', startTime: '', showCurve: 0, specs: '', remarks: '',
  });

  const handleAdd = useCallback(async () => {
    if (!form.deviceName.trim()) return;
    const r = await createItem({ ...form, showCurve: form.showCurve || 0 });
    if (r) { setShowAddModal(false); resetForm(); }
  }, [form, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.deviceName.trim()) return;
    await updateItem(selectedItem.oid, { ...form, showCurve: form.showCurve || 0 });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: DeviceDistribution) => {
    setSelectedItem(item);
    setForm({
      deviceName: item.deviceName, deviceCode: item.deviceCode || '',
      siteName: item.siteName || '', areaName: item.areaName || '',
      deviceType: item.deviceType || '', motorName: item.motorName || '',
      sortOrder: item.sortOrder, allowRuntime: item.allowRuntime || '',
      restTime: item.restTime || '', initialStatus: item.initialStatus || '',
      circuit: item.circuit || '', slaveDevices: item.slaveDevices || '',
      startTime: item.startTime || '', showCurve: item.showCurve,
      specs: item.specs || '', remarks: item.remarks || '',
    });
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
              <MonitorCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">设备分配</h1>
              <p className="text-gray-500">IoT设备分配到温室/区域 + 运行参数配置（预留端口）</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">关键词搜索</label>
            <div className="relative"><Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input value={keyword} onChange={e => setKeyword(e.target.value)} className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索设备名称/编号/站点/类型..." />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">设备类型</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 px-2 border border-gray-200 rounded text-sm min-w-[140px]">
              <option value="">全部类型</option>
              {deviceTypes.map(t => <option key={t} value={t!}>{t}</option>)}
            </select>
          </div>
          <button onClick={() => { setKeyword(''); setFilterType(''); }} className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap">重置</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            分配列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}
          </h3>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}><Plus className="w-4 h-4" /> 新增分配</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <th className="py-3 px-4 text-left font-medium">设备名称</th>
              <th className="py-3 px-4 text-left font-medium">设备编号</th>
              <th className="py-3 px-4 text-left font-medium">所属站点</th>
              <th className="py-3 px-4 text-left font-medium">区域</th>
              <th className="py-3 px-4 text-left font-medium">设备类型</th>
              <th className="py-3 px-4 text-left font-medium">关联电机</th>
              <th className="py-3 px-4 text-center font-medium w-20">排序</th>
              <th className="py-3 px-4 text-left font-medium w-24">状态</th>
              <th className="py-3 px-4 text-center font-medium w-24">操作</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={9} className="py-12 text-center text-gray-400">加载中...</td></tr> :
               filteredData.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-gray-400">{items.length === 0 ? '暂无分配数据 — 预留端口' : '无匹配结果'}</td></tr> :
               filteredData.map(item => (
                <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-gray-900">{item.deviceName}</td>
                  <td className="py-2.5 px-4"><span className="inline-flex px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">{item.deviceCode || '-'}</span></td>
                  <td className="py-2.5 px-4 text-gray-600">{item.siteName || '-'}</td>
                  <td className="py-2.5 px-4 text-gray-600">{item.areaName || '-'}</td>
                  <td className="py-2.5 px-4"><span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{item.deviceType || '-'}</span></td>
                  <td className="py-2.5 px-4 text-gray-600">{item.motorName || '-'}</td>
                  <td className="py-2.5 px-4 text-center text-gray-500">{item.sortOrder}</td>
                  <td className="py-2.5 px-4"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.status === 'active' ? '启用' : '停用'}</span></td>
                  <td className="py-2.5 px-4"><div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEditModal(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedItem(item); setShowDeleteConfirm(true); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-t-xl text-white shrink-0">
              <h3 className="text-lg font-semibold">{showAddModal ? '新增设备分配' : '编辑设备分配'}</h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-1 hover:bg-white/20 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* 基本信息 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-700 mb-3">基本信息</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs text-blue-700 mb-1">设备名称 <span className="text-red-500">*</span></label>
                    <input value={form.deviceName} onChange={e => setForm(f => ({ ...f, deviceName: e.target.value }))} className="w-full h-9 px-3 border border-blue-200 rounded text-sm bg-white" placeholder="如：1号水泵" /></div>
                  <div><label className="block text-xs text-blue-700 mb-1">设备编号</label>
                    <input value={form.deviceCode} onChange={e => setForm(f => ({ ...f, deviceCode: e.target.value }))} className="w-full h-9 px-3 border border-blue-200 rounded text-sm bg-white font-mono" placeholder="DeviceEntityAID" /></div>
                  <div><label className="block text-xs text-blue-700 mb-1">排序</label>
                    <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full h-9 px-3 border border-blue-200 rounded text-sm bg-white" /></div>
                </div>
              </div>

              {/* 分配信息 */}
              <div className="rounded-lg p-4 border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">分配信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">所属站点</label>
                    <input value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="IDCOID/站点名称" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">温室区域</label>
                    <input value={form.areaName} onChange={e => setForm(f => ({ ...f, areaName: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="区域系统名称" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">设备类型</label>
                    <input value={form.deviceType} onChange={e => setForm(f => ({ ...f, deviceType: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="如：传感器/电磁阀/水泵" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">关联电机/水泵</label>
                    <input value={form.motorName} onChange={e => setForm(f => ({ ...f, motorName: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="电机名称" /></div>
                </div>
              </div>

              {/* 运行参数 */}
              <div className="rounded-lg p-4 border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">运行参数</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">允许运行时间</label>
                    <input value={form.allowRuntime} onChange={e => setForm(f => ({ ...f, allowRuntime: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="如：83:55（分:秒）" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">休息时间</label>
                    <input value={form.restTime} onChange={e => setForm(f => ({ ...f, restTime: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="分钟" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">初始状态</label>
                    <input value={form.initialStatus} onChange={e => setForm(f => ({ ...f, initialStatus: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="如：关闭/停止/开启" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">启动时间</label>
                    <input type="date" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">所属回路</label>
                    <input value={form.circuit} onChange={e => setForm(f => ({ ...f, circuit: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="回路编号" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">从属设备</label>
                    <input value={form.slaveDevices} onChange={e => setForm(f => ({ ...f, slaveDevices: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="逗号分隔" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">显示曲线</label>
                    <select value={form.showCurve} onChange={e => setForm(f => ({ ...f, showCurve: parseInt(e.target.value) }))} className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                      <option value={0}>否</option><option value={1}>是</option>
                    </select></div>
                  <div><label className="block text-xs text-gray-500 mb-1">规格说明</label>
                    <input value={form.specs} onChange={e => setForm(f => ({ ...f, specs: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="规格描述" /></div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded text-sm" placeholder="备注信息" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button onClick={showAddModal ? handleAdd : handleEdit} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={!form.deviceName.trim()}>提交</button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="p-6"><h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-sm text-gray-500">确定要删除设备分配 "<span className="font-medium text-gray-700">{selectedItem.deviceName}</span>" 吗？</p>
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
