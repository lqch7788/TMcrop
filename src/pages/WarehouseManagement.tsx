/**
 * 仓库管理页面
 * 功能：仓库信息的新增、编辑、删除、查询
 * 数据来源：Zustand Store → API
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Edit2, Layers, Loader2, Plus, Save, Trash2, Warehouse, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  useWarehouseStore,
  type Warehouse as WarehouseType,
} from '../stores';
import { showAlert, showConfirm } from '@/lib/dialogService';

const WAREHOUSE_TYPES = ['原料仓库', '成品仓库', '耗材仓库', '农药仓库', '化肥仓库', '设备仓库', '其他'];

// 2026-07-28：将英文 dict_code 翻译为中文标签展示
// 历史数据存了 dict_code 英文（如 cold_storage / normal），UI 必须显示中文
const WAREHOUSE_TYPE_LABEL_MAP: Record<string, string> = {
  cold_storage: '冷藏库',
  normal: '常温库',
  seed_storage: '种子库',
  seedling: '种苗库',
  raw_material: '原料仓库',
  finished_goods: '成品仓库',
  consumable: '耗材仓库',
  pesticide: '农药仓库',
  fertilizer: '化肥仓库',
  equipment: '设备仓库',
  other: '其他',
};

function translateWarehouseType(code?: string | null): string {
  if (!code) return '-';
  // 已经是中文的情况：直接显示
  if (/[一-龥]/.test(code)) return code;
  // 匹配英文 dict_code
  const label = WAREHOUSE_TYPE_LABEL_MAP[code];
  if (label) return label;
  // 兜底：英文 → 友好展示
  return code.replace(/_/g, ' ');
}

export default function WarehouseManagement() {
  // 数据从 Zustand Store 获取
  const {
    warehouses,
    loading,
    error,
    loadWarehouses,
    addWarehouse,
    editWarehouse,
    removeWarehouse,
    refreshWarehouses,
  } = useWarehouseStore();

  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [newWarehouse, setNewWarehouse] = useState<Partial<WarehouseType>>({ status: 'active' });

  // 初始化加载
  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // 2026-07-28 v6：去掉搜索框，列表直接展示全部已激活仓库
  const filteredWarehouses = warehouses;

  // 创建仓库
  const handleCreate = async () => {
    if (!newWarehouse.name || !newWarehouse.code) {
      await showAlert('请填写仓库名称和编码');
      return;
    }
    try {
      await addWarehouse({
        name: newWarehouse.name,
        code: newWarehouse.code,
        warehouseType: newWarehouse.warehouseType,
        location: newWarehouse.location,
        capacity: newWarehouse.capacity,
        managerId: newWarehouse.managerId,
        managerName: newWarehouse.managerName,
      });
      await refreshWarehouses();
      setShowModal(false);
      setNewWarehouse({ status: 'active' });
    } catch (err) {
      // logger.error('创建仓库失败:', err);
      await showAlert('创建仓库失败');
    }
  };

  // 更新仓库
  const handleUpdate = async () => {
    if (!editingWarehouse) return;
    try {
      await editWarehouse(editingWarehouse.id, {
        name: newWarehouse.name,
        code: newWarehouse.code,
        warehouseType: newWarehouse.warehouseType,
        location: newWarehouse.location,
        capacity: newWarehouse.capacity,
        managerId: newWarehouse.managerId,
        managerName: newWarehouse.managerName,
      });
      await refreshWarehouses();
      setShowModal(false);
      setEditingWarehouse(null);
      setNewWarehouse({ status: 'active' });
    } catch (err) {
      // logger.error('更新仓库失败:', err);
      await showAlert('更新仓库失败');
    }
  };

  // 删除仓库
  const handleDeleteWarehouse = async (id: string) => {
    if (!await showConfirm('确定删除该仓库吗？')) return;
    try {
      await removeWarehouse(id);
      await refreshWarehouses();
    } catch (err) {
      // logger.error('删除仓库失败:', err);
      await showAlert('删除仓库失败');
    }
  };

  // 打开新增弹窗（2026-07-28 v4：列表上方的"新增仓库"按钮调用此函数）
  const openCreateModal = () => {
    setEditingWarehouse(null);
    setNewWarehouse({ status: 'active' });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const openEditModal = (warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse);
    setNewWarehouse(warehouse);
    setShowModal(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWarehouse(null);
    setNewWarehouse({ status: 'active' });
  };

  // 获取库存百分比
  const getStockPercent = (current: number, capacity: number) => {
    if (!capacity) return 0;
    return Math.round((current / capacity) * 100);
  };

  // 获取库存颜色
  const getStockColor = (percent: number) => {
    if (percent >= 80) return 'text-red-600';
    if (percent >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 统计
  const stats = {
    total: warehouses.length,
    active: warehouses.filter(w => w.status === 'active').length,
    totalCapacity: warehouses.reduce((sum, w) => sum + (w.capacity || 0), 0),
    totalStock: warehouses.reduce((sum, w) => sum + (w.currentStock || 0), 0),
  };

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
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">仓库管理</h1>
              <p className="text-gray-500">仓库信息与库存管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片（2026-07-28 v5：紧凑型 — 单行 label 左 / value 右，圆角/字号缩小）*/}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">仓库总数</span>
          <span className="text-xl font-bold text-gray-900 tabular-nums">{stats.total}</span>
        </div>
        <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
          <span className="text-xs text-green-600">在用仓库</span>
          <span className="text-xl font-bold text-green-600 tabular-nums">{stats.active}</span>
        </div>
        <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
          <span className="text-xs text-blue-600">总容量 (m³)</span>
          <span className="text-xl font-bold text-blue-600 tabular-nums">{stats.totalCapacity.toLocaleString()}</span>
        </div>
        <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-600">当前库存</span>
          <span className="text-xl font-bold text-emerald-600 tabular-nums">{stats.totalStock.toLocaleString()}</span>
        </div>
      </div>

      {/* 新增仓库（2026-07-28 v7：按钮严格按 UI 库惯例 — size=sm h-8、icon 不带 mr-*）*/}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          新增仓库
        </Button>
      </div>

      {/* 仓库列表（2026-07-28 v4：列宽重新规划 — 使用 table-layout: fixed 平衡宽度；
          仓库名称独占剩余空间，其它列按内容宽度分配）*/}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredWarehouses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂无仓库数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              {/* 2026-07-28 v4.1：列宽重新分配，仓库名称不再独占剩余空间
                  —— 9 列大致按 10-15% 区间均分，让每个字段都有充足宽度 */}
              <colgroup><col style={{ width: '110px' }} /><col style={{ width: '220px' }} /><col style={{ width: '130px' }} /><col style={{ width: '100px' }} /><col style={{ width: '140px' }} /><col style={{ width: '130px' }} /><col style={{ width: '240px' }} /><col style={{ width: '160px' }} /><col style={{ width: '110px' }} /></colgroup>
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">仓库编码</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">仓库名称</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">仓库类型</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">位置</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">负责人</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">容量 <span className="normal-case">(m³)</span></th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">使用率</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-blue-400/30">启用状态</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredWarehouses.map(warehouse => {
                  const percent = getStockPercent(warehouse.currentStock || 0, warehouse.capacity || 0);
                  return (
                    <tr
                      key={warehouse.id}
                      className="border-t border-gray-200 hover:bg-blue-50/40 transition-colors"
                    >
                      {/* 仓库编码（独立列，mono 字体） */}
                      <td className="px-3 py-3 text-gray-700 font-mono text-xs whitespace-nowrap border-r border-gray-100 truncate">
                        {warehouse.code}
                      </td>
                      {/* 仓库名称（独立列，flex 占剩余空间） */}
                      <td className="px-3 py-3 text-gray-900 font-medium border-r border-gray-100 whitespace-nowrap truncate" title={warehouse.name}>
                        {warehouse.name}
                      </td>
                      {/* 仓库类型 — 英文 dict_code 转中文标签 */}
                      <td className="px-3 py-3 border-r border-gray-100">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          {translateWarehouseType(warehouse.warehouseType)}
                        </span>
                      </td>
                      {/* 位置（独立列） */}
                      <td className="px-3 py-3 text-gray-700 border-r border-gray-100 whitespace-nowrap truncate" title={warehouse.location || ''}>
                        {warehouse.location || '-'}
                      </td>
                      {/* 负责人（独立列） */}
                      <td className="px-3 py-3 text-gray-700 border-r border-gray-100 whitespace-nowrap truncate" title={warehouse.managerName || ''}>
                        {warehouse.managerName || '-'}
                      </td>
                      {/* 容量（独立列） */}
                      <td className="px-3 py-3 text-gray-700 border-r border-gray-100 whitespace-nowrap">
                        {warehouse.capacity != null ? `${warehouse.capacity} m³` : '-'}
                      </td>
                      {/* 使用率（独立列，含进度条） */}
                      <td className="px-3 py-3 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div
                              className={`h-2 rounded-full ${percent >= 80 ? 'bg-red-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${getStockColor(percent)} w-10 text-right whitespace-nowrap`}>
                            {percent}%
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 flex justify-between">
                          <span>当前 {warehouse.currentStock || 0}</span>
                          <span>总量 {warehouse.capacity || 0} m³</span>
                        </div>
                      </td>
                      {/* 启用状态（独立列，徽章） */}
                      <td className="px-3 py-3 border-r border-gray-100 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          warehouse.status === 'active'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            warehouse.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`} aria-hidden />
                          {warehouse.status === 'active' ? '已启用' : '已停用'}
                        </span>
                      </td>
                      {/* 操作（独立列） */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditModal(warehouse)}
                          title="编辑"
                          aria-label="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteWarehouse(warehouse.id)}
                          title="删除"
                          aria-label="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 仓库编辑/新增弹窗（2026-07-28 v5：头部绿渐变 + 圆角化）*/}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* 头部：绿渐变背景 */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">{editingWarehouse ? '编辑仓库' : '新增仓库'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">仓库名称</Label>
                  <Input
                    type="text"
                    value={newWarehouse.name || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                    placeholder="请输入仓库名称"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">仓库编码</Label>
                  <Input
                    type="text"
                    value={newWarehouse.code || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                    placeholder="如：WH001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">仓库类型</Label>
                  <Select
                    value={newWarehouse.warehouseType || ''}
                    onValueChange={(val) => setNewWarehouse({ ...newWarehouse, warehouseType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">负责人</Label>
                  <Input
                    type="text"
                    value={newWarehouse.managerName || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, managerName: e.target.value })}
                    placeholder="请输入负责人"
                  />
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">位置</Label>
                <Input
                  type="text"
                  value={newWarehouse.location || ''}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                  placeholder="请输入仓库位置"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">容量 (m³)</Label>
                  <Input
                    type="number"
                    value={newWarehouse.capacity || 0}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: parseInt(e.target.value) || 0 })}
                    placeholder="如：500（立方米）"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
                  <Select
                    value={newWarehouse.status || 'active'}
                    onValueChange={(val) => setNewWarehouse({ ...newWarehouse, status: val as WarehouseType['status'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* 底部按钮区（2026-07-28 v5：单独分隔，加 padding） */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={handleCloseModal}><X className="w-4 h-4" /> 取消</Button>
              <Button variant="default" onClick={editingWarehouse ? handleUpdate : handleCreate}><Save className="w-4 h-4 mr-1" /> 保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
