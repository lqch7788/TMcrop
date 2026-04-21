import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Warehouse, Search, Plus, Edit2, Trash2, Layers, ChevronLeft } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string;
  manager: string;
  capacity: number;
  currentStock: number;
  status: 'active' | 'inactive';
  description: string;
}

const STORAGE_KEY = 'warehouse_management_data';

const WAREHOUSE_TYPES = ['原料仓库', '成品仓库', '耗材仓库', '农药仓库', '化肥仓库', '设备仓库', '其他'];

const DEFAULT_WAREHOUSES: Warehouse[] = [
  { id: '1', name: '主仓库A', code: 'WH-A001', type: '原料仓库', location: '园区1号仓库', manager: '张三', capacity: 1000, currentStock: 650, status: 'active', description: '主要原料存放仓库' },
  { id: '2', name: '成品仓库B', code: 'WH-B001', type: '成品仓库', location: '园区2号仓库', manager: '李四', capacity: 800, currentStock: 320, status: 'active', description: '成品存放仓库' },
  { id: '3', name: '耗材仓库', code: 'WH-C001', type: '耗材仓库', location: '园区3号仓库', manager: '王五', capacity: 500, currentStock: 180, status: 'active', description: '耗材和包装材料存放' },
  { id: '4', name: '农药仓库', code: 'WH-D001', type: '农药仓库', location: '园区危险品区', manager: '赵六', capacity: 200, currentStock: 50, status: 'active', description: '农药等特殊物资存放' },
];

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [newWarehouse, setNewWarehouse] = useState<Partial<Warehouse>>({ status: 'active' });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setWarehouses(JSON.parse(saved));
    } else {
      setWarehouses(DEFAULT_WAREHOUSES);
    }
  }, []);

  useEffect(() => {
    if (warehouses.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouses));
    }
  }, [warehouses]);

  const filteredWarehouses = warehouses.filter(w =>
    w.name.includes(searchTerm) || w.code.includes(searchTerm) || w.location.includes(searchTerm)
  );

  const handleSaveWarehouse = () => {
    if (editingWarehouse) {
      setWarehouses(warehouses.map(w => w.id === editingWarehouse.id ? { ...w, ...newWarehouse } as Warehouse : w));
    } else {
      setWarehouses([...warehouses, { ...newWarehouse, id: Date.now().toString(), currentStock: 0 } as Warehouse]);
    }
    setShowModal(false);
    setEditingWarehouse(null);
    setNewWarehouse({ status: 'active' });
  };

  const deleteWarehouse = (id: string) => {
    if (confirm('确定删除该仓库吗？')) {
      setWarehouses(warehouses.filter(w => w.id !== id));
    }
  };

  const editWarehouse = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setNewWarehouse(warehouse);
    setShowModal(true);
  };

  const getStockPercent = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getStockColor = (percent: number) => {
    if (percent >= 80) return 'text-red-600';
    if (percent >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const stats = {
    total: warehouses.length,
    active: warehouses.filter(w => w.status === 'active').length,
    totalCapacity: warehouses.reduce((sum, w) => sum + w.capacity, 0),
    totalStock: warehouses.reduce((sum, w) => sum + w.currentStock, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">仓库管理</h2>
        </div>
        <button
          onClick={() => { setEditingWarehouse(null); setNewWarehouse({ status: 'active' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增仓库
        </button>
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
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalCapacity}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-emerald-600">当前库存</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalStock}</p>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索仓库..."
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
        />
      </div>

      {/* 仓库列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredWarehouses.map(warehouse => {
          const percent = getStockPercent(warehouse.currentStock, warehouse.capacity);
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
                  <p className="text-gray-900 font-medium">{warehouse.type}</p>
                </div>
                <div>
                  <p className="text-gray-500">负责人</p>
                  <p className="text-gray-900 font-medium">{warehouse.manager}</p>
                </div>
                <div>
                  <p className="text-gray-500">位置</p>
                  <p className="text-gray-900 font-medium">{warehouse.location}</p>
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
                <span>当前: {warehouse.currentStock}</span>
                <span>容量: {warehouse.capacity}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{warehouse.description}</p>
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => editWarehouse(warehouse)} className="p-1.5 hover:bg-gray-100 rounded">
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => deleteWarehouse(warehouse.id)} className="p-1.5 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">仓库名称</label>
                  <input
                    type="text"
                    value={newWarehouse.name || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">仓库编码</label>
                  <input
                    type="text"
                    value={newWarehouse.code || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">仓库类型</label>
                  <select
                    value={newWarehouse.type || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择</option>
                    {WAREHOUSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                  <input
                    type="text"
                    value={newWarehouse.manager || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, manager: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                <input
                  type="text"
                  value={newWarehouse.location || ''}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">容量</label>
                  <input
                    type="number"
                    value={newWarehouse.capacity || 0}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={newWarehouse.status || 'active'}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, status: e.target.value as Warehouse['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newWarehouse.description || ''}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveWarehouse} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
