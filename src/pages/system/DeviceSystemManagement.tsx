/**
 * 设备系统管理页面 — iAGS deviceSystem 集成
 * 系统类型定义和IDC数据中心关联配置
 * Phase 2 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wrench, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useDeviceSystemStore } from '../../stores/useDeviceSystemStore';
import type { DeviceSystem } from '../../stores/useDeviceSystemStore';
import { Button } from '../../components/ui/button';

export default function DeviceSystemManagement() {
  // ========== Store ==========
  const items = useDeviceSystemStore((s) => s.items);
  const isLoading = useDeviceSystemStore((s) => s.isLoading);
  const fetchItems = useDeviceSystemStore((s) => s.fetchItems);
  const createItem = useDeviceSystemStore((s) => s.createItem);
  const updateItem = useDeviceSystemStore((s) => s.updateItem);
  const deleteItem = useDeviceSystemStore((s) => s.deleteItem);

  // ========== 本地状态 ==========
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeviceSystem | null>(null);

  // 表单状态
  const [form, setForm] = useState({
    systemCode: '', systemName: '', idcUrl: '', idcToken: '', description: '',
  });

  // ========== 初始加载 ==========
  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ========== 筛选后的数据 ==========
  const filteredData = useMemo(() => {
    let filtered = items;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(item =>
        item.systemCode.toLowerCase().includes(kw) ||
        item.systemName.toLowerCase().includes(kw) ||
        (item.idcUrl || '').toLowerCase().includes(kw) ||
        (item.description || '').toLowerCase().includes(kw)
      );
    }
    if (filterStatus) {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    return filtered;
  }, [items, keyword, filterStatus]);

  // ========== 统计数据 ==========
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    inactive: items.filter(i => i.status === 'inactive').length,
    withIdc: items.filter(i => i.idcUrl).length,
  }), [items]);

  // ========== CRUD 操作 ==========
  const resetForm = () => {
    setForm({ systemCode: '', systemName: '', idcUrl: '', idcToken: '', description: '' });
  };

  const handleAdd = useCallback(async () => {
    if (!form.systemCode.trim() || !form.systemName.trim()) return;
    const result = await createItem({
      systemCode: form.systemCode, systemName: form.systemName,
      idcUrl: form.idcUrl || undefined, idcToken: form.idcToken || undefined,
      description: form.description || undefined,
    });
    if (result) { setShowAddModal(false); resetForm(); }
  }, [form, createItem]);

  const handleEdit = useCallback(async () => {
    if (!selectedItem || !form.systemCode.trim() || !form.systemName.trim()) return;
    await updateItem(selectedItem.oid, {
      systemCode: form.systemCode, systemName: form.systemName,
      idcUrl: form.idcUrl || undefined, idcToken: form.idcToken || undefined,
      description: form.description || undefined,
    });
    setShowEditModal(false); setSelectedItem(null); resetForm();
  }, [selectedItem, form, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    await deleteItem(selectedItem.oid);
    setShowDeleteConfirm(false); setSelectedItem(null);
  }, [selectedItem, deleteItem]);

  const openEditModal = (item: DeviceSystem) => {
    setSelectedItem(item);
    setForm({
      systemCode: item.systemCode, systemName: item.systemName,
      idcUrl: item.idcUrl || '', idcToken: item.idcToken || '',
      description: item.description || '',
    });
    setShowEditModal(true);
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
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">系统管理</h1>
              <p className="text-gray-500">设备系统类型定义和IDC数据中心关联配置</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">系统总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-green-600">使用中</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-400">已停用</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{stats.inactive}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-blue-600">已关联IDC</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.withIdc}</p>
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
                  className="w-full h-9 pl-8 pr-2 border border-gray-200 rounded text-sm" placeholder="搜索编码、名称或描述..." />
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
            系统列表 {filteredData.length > 0 && <span className="text-sm text-gray-400 font-normal">({filteredData.length})</span>}
          </h3>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> 新增系统
          </Button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <th className="py-3 px-4 text-left font-medium w-40">系统编码</th>
                <th className="py-3 px-4 text-left font-medium">系统名称</th>
                <th className="py-3 px-4 text-left font-medium">IDC 地址</th>
                <th className="py-3 px-4 text-left font-medium w-44">IDC Token</th>
                <th className="py-3 px-4 text-left font-medium">描述</th>
                <th className="py-3 px-4 text-left font-medium w-24">状态</th>
                <th className="py-3 px-4 text-left font-medium w-40">更新时间</th>
                <th className="py-3 px-4 text-center font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">加载中...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                  {items.length === 0 ? '暂无系统数据，点击"新增系统"开始创建' : '无匹配结果'}
                </td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.oid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-100 text-blue-700">
                        {item.systemCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-900">{item.systemName}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs font-mono max-w-[200px] truncate">
                      {item.idcUrl ? <a href={item.idcUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.idcUrl}</a> : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 text-xs font-mono max-w-[150px] truncate">
                      {item.idcToken ? '••••••••' : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs max-w-[250px] truncate">{item.description || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status === 'active' ? '使用中' : '已停用'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
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
        <SystemModal
          title="新增系统"
          form={form} setForm={setForm}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAdd}
        />
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <SystemModal
          title="编辑系统"
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
                确定要删除系统 "<span className="font-medium text-gray-700">{selectedItem.systemName}</span>" ({selectedItem.systemCode}) 吗？
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

// ==================== 系统新增/编辑弹窗组件 ====================

function SystemModal({ title, form, setForm, onClose, onSubmit }: {
  title: string;
  form: { systemCode: string; systemName: string; idcUrl: string; idcToken: string; description: string };
  setForm: (f: any) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 基本信息系统 */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-3">系统信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-emerald-700 mb-1">系统编码 <span className="text-red-500">*</span></label>
                <input value={form.systemCode} onChange={e => update('systemCode', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white font-mono"
                  placeholder="如：SYS001" />
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">系统名称 <span className="text-red-500">*</span></label>
                <input value={form.systemName} onChange={e => update('systemName', e.target.value)}
                  className="w-full h-9 px-3 border border-emerald-200 rounded text-sm focus:outline-none focus:border-emerald-400 bg-white"
                  placeholder="如：环境监控系统" />
              </div>
            </div>
          </div>

          {/* IDC 关联配置 */}
          <div className="rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">IDC 数据中心关联</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">IDC 地址</label>
                <input value={form.idcUrl} onChange={e => update('idcUrl', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono"
                  placeholder="如：https://idc.example.com/api" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">IDC Token</label>
                <input value={form.idcToken} onChange={e => update('idcToken', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400 font-mono"
                  placeholder="认证令牌" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">描述备注</label>
                <input value={form.description} onChange={e => update('description', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="系统描述信息" />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button onClick={onSubmit}
            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            disabled={!form.systemCode.trim() || !form.systemName.trim()}>提交</button>
        </div>
      </div>
    </div>
  );
}
