/**
 * 视频管理页面 — iAGS Camera 集成
 * 摄像头注册和RTSP/HTTP视频流地址配置
 * Phase 3 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, Plus, Pencil, Trash2, Search, X, Monitor } from 'lucide-react';
import { useCameraStore } from '../../stores/useCameraStore';
import type { Camera } from '../../stores/useCameraStore';
import { useFarmPartitionStore } from '../../stores/useFarmPartitionStore';
import { Button } from '../../components/ui/button';

export default function CameraManagement() {
  // ========== Store ==========
  const items = useCameraStore((s) => s.items);
  const isLoading = useCameraStore((s) => s.isLoading);
  const fetchItems = useCameraStore((s) => s.fetchItems);
  const createItem = useCameraStore((s) => s.createItem);
  const updateItem = useCameraStore((s) => s.updateItem);
  const deleteItem = useCameraStore((s) => s.deleteItem);

  const partitions = useFarmPartitionStore((s) => s.items);
  const fetchPartitions = useFarmPartitionStore((s) => s.fetchItems);

  // ========== 本地状态 ==========
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Camera | null>(null);

  const [form, setForm] = useState({
    cameraName: '', cameraCode: '', rtspUrl: '', httpUrl: '',
    partitionOid: '', greenhouseOid: '', brand: '', model: '',
    username: '', password: '', channelCount: 1,
  });

  useEffect(() => { fetchItems(); fetchPartitions(); }, [fetchItems, fetchPartitions]);

  // ========== 筛选 ==========
  const filteredData = useMemo(() => {
    let filtered = items;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(item =>
        item.cameraName.toLowerCase().includes(kw) ||
        (item.cameraCode || '').toLowerCase().includes(kw) ||
        (item.brand || '').toLowerCase().includes(kw) ||
        (item.partitionName || '').toLowerCase().includes(kw)
      );
    }
    if (filterStatus) filtered = filtered.filter(item => item.status === filterStatus);
    return filtered;
  }, [items, keyword, filterStatus]);

  // ========== 统计 ==========
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    withRtsp: items.filter(i => i.rtspUrl).length,
  }), [items]);

  // ========== 分区选项 ==========
  const partitionOptions = useMemo(() => partitions.map(p => ({ oid: p.oid, name: p.name })), [partitions]);

  // ========== CRUD ==========
  const resetForm = () => {
    setForm({ cameraName: '', cameraCode: '', rtspUrl: '', httpUrl: '', partitionOid: '', greenhouseOid: '', brand: '', model: '', username: '', password: '', channelCount: 1 });
  };

  const handleAdd = useCallback(async () => {
    if (!form.cameraName.trim()) return;
    const result = await createItem({
      cameraName: form.cameraName, cameraCode: form.cameraCode || undefined,
      rtspUrl: form.rtspUrl || undefined, httpUrl: form.httpUrl || undefined,
      partitionOid: form.partitionOid || undefined, greenhouseOid: form.greenhouseOid || undefined,
      brand: form.brand || undefined, model: form.model || undefined,
      username: form.username || undefined, password: form.password || undefined,
      channelCount: form.channelCount,
    });
    if (result) { setShowAddModal(false); resetForm(); }
  }, [form, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.cameraName.trim()) return;
    await updateItem(selectedItem.oid, {
      cameraName: form.cameraName, cameraCode: form.cameraCode || undefined,
      rtspUrl: form.rtspUrl || undefined, httpUrl: form.httpUrl || undefined,
      partitionOid: form.partitionOid || undefined, greenhouseOid: form.greenhouseOid || undefined,
      brand: form.brand || undefined, model: form.model || undefined,
      username: form.username || undefined, password: form.password || undefined,
      channelCount: form.channelCount,
    });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: Camera) => {
    setSelectedItem(item);
    setForm({
      cameraName: item.cameraName, cameraCode: item.cameraCode || '',
      rtspUrl: item.rtspUrl || '', httpUrl: item.httpUrl || '',
      partitionOid: item.partitionOid || '', greenhouseOid: item.greenhouseOid || '',
      brand: item.brand || '', model: item.model || '',
      username: item.username || '', password: item.password || '',
      channelCount: item.channelCount,
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
          <Video className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">视频管理</h1>
          <p className="text-sm text-gray-500">摄像头注册和RTSP/HTTP视频流地址配置</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">摄像头总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-green-600">运行中</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-blue-600">RTSP 已配置</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.withRtsp}</p>
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
                  className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索名称、编码或品牌..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full h-9 px-2 border border-gray-200 rounded text-sm">
                <option value="">全部</option>
                <option value="active">运行中</option>
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
            摄像头列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}
          </h3>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> 新增摄像头
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <th className="py-3 px-4 text-left font-medium">摄像头名称</th>
                <th className="py-3 px-4 text-left font-medium w-32">编码</th>
                <th className="py-3 px-4 text-left font-medium">RTSP 地址</th>
                <th className="py-3 px-4 text-left font-medium">所属分区</th>
                <th className="py-3 px-4 text-left font-medium w-24">品牌/型号</th>
                <th className="py-3 px-4 text-left font-medium w-20">通道数</th>
                <th className="py-3 px-4 text-left font-medium w-20">状态</th>
                <th className="py-3 px-4 text-center font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">加载中...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                  {items.length === 0 ? '暂无摄像头数据' : '无匹配结果'}
                </td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{item.cameraName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-mono text-gray-500">{item.cameraCode || '-'}</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs font-mono max-w-[250px] truncate">
                      {item.rtspUrl || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">{item.partitionName || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">
                      {item.brand ? `${item.brand}${item.model ? ` / ${item.model}` : ''}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500">{item.channelCount}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status === 'active' ? '运行中' : '已停用'}
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
        <CameraModal
          title={showAddModal ? '新增摄像头' : '编辑摄像头'}
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
                确定要删除摄像头 "<span className="font-medium text-gray-700">{selectedItem.cameraName}</span>" 吗？
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

// ==================== 摄像头弹窗 ====================

function CameraModal({ title, form, setForm, partitionOptions, onClose, onSubmit }: {
  title: string;
  form: { cameraName: string; cameraCode: string; rtspUrl: string; httpUrl: string; partitionOid: string; greenhouseOid: string; brand: string; model: string; username: string; password: string; channelCount: number };
  setForm: (f: any) => void;
  partitionOptions: { oid: string; name: string }[];
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 基本信息 */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-3">基本信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-emerald-700 mb-1">摄像头名称 <span className="text-red-500">*</span></label>
                <input value={form.cameraName} onChange={e => update('cameraName', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white" placeholder="如：1号棚前置摄像头" />
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">编码</label>
                <input value={form.cameraCode} onChange={e => update('cameraCode', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white font-mono" placeholder="如：CAM001" />
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">所属分区</label>
                <select value={form.partitionOid} onChange={e => update('partitionOid', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white">
                  <option value="">— 请选择 —</option>
                  {partitionOptions.map(p => <option key={p.oid} value={p.oid}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">通道数</label>
                <input type="number" min={1} max={64} value={form.channelCount} onChange={e => update('channelCount', Number(e.target.value))}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white" />
              </div>
            </div>
          </div>

          {/* 视频流配置 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">视频流配置</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">RTSP 地址</label>
                <input value={form.rtspUrl} onChange={e => update('rtspUrl', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono"
                  placeholder="rtsp://192.168.1.100:554/stream1" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">HTTP 预览地址</label>
                <input value={form.httpUrl} onChange={e => update('httpUrl', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono"
                  placeholder="http://192.168.1.100:8080/snapshot" />
              </div>
            </div>
          </div>

          {/* 设备信息 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">设备信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">品牌</label>
                <input value={form.brand} onChange={e => update('brand', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="如：海康威视" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">型号</label>
                <input value={form.model} onChange={e => update('model', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="如：DS-2CD2T47" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">用户名</label>
                <input value={form.username} onChange={e => update('username', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="admin" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">密码</label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="摄像头密码" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button onClick={onSubmit}
            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            disabled={!form.cameraName.trim()}>提交</button>
        </div>
      </div>
    </div>
  );
}
