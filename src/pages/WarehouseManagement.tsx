/**
 * 仓库管理页面
 * 功能：仓库信息的新增、编辑、删除、查询
 * 数据来源：Zustand Store → API
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Edit2, Layers, Loader2, Plus, Save, Search, Trash2, Warehouse, X } from 'lucide-react';
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

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [newWarehouse, setNewWarehouse] = useState<Partial<WarehouseType>>({ status: 'active' });

  // 初始化加载
  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const filteredWarehouses = warehouses.filter(w =>
    w.name.includes(searchTerm) || w.code.includes(searchTerm) || (w.location && w.location.includes(searchTerm))
  );

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

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">仓库总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-green-600">在用仓库</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-blue-600">总容量</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalCapacity.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-emerald-600">当前库存</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalStock.toLocaleString()}</p>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索仓库..."
          className="pl-10 w-full"
        />
      </div>

      {/* 仓库列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredWarehouses.map(warehouse => {
          const percent = getStockPercent(warehouse.currentStock || 0, warehouse.capacity || 0);
          return (
            <div key={warehouse.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Layers className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                    <p className="text-xs text-gray-500">{warehouse.code}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  warehouse.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {warehouse.status === 'active' ? '启用' : '停用'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-gray-500">类型</p>
                  <p className="text-gray-900 font-medium">{warehouse.warehouseType || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">负责人</p>
                  <p className="text-gray-900 font-medium">{warehouse.managerName || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">位置</p>
                  <p className="text-gray-900 font-medium">{warehouse.location || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">使用率</p>
                  <p className={`font-bold ${getStockColor(percent)}`}>{percent}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${percent >= 80 ? 'bg-red-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>当前: {warehouse.currentStock || 0}</span>
                <span>容量: {warehouse.capacity || 0}</span>
              </div>
              {warehouse.description && (
                <p className="text-xs text-gray-500 mt-2">{warehouse.description}</p>
              )}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                <Button size="icon" variant="ghost" onClick={() => openEditModal(warehouse)}>
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </Button>
                <Button size="icon" variant="destructive" onClick={() => handleDeleteWarehouse(warehouse.id)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 仓库编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingWarehouse ? '编辑仓库' : '新增仓库'}</h3>
            <div className="space-y-4">
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
                  <Label className="block text-sm font-medium text-gray-700 mb-1">容量</Label>
                  <Input
                    type="number"
                    value={newWarehouse.capacity || 0}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: parseInt(e.target.value) || 0 })}
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
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={handleCloseModal}><X className="w-4 h-4" /> 取消</Button>
              <Button variant="default" onClick={editingWarehouse ? handleUpdate : handleCreate}><Save className="w-4 h-4" /> 保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
