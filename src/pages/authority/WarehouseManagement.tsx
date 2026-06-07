/**
 * 仓库管理页面
 * V5.0 系统设置重构
 * 仓库CRUD管理
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  RefreshCw,
  X,
  Save,
  Building2,
} from 'lucide-react';
import { Pagination } from '@/components/ui';
import {
  Warehouse,
  getWarehouses,
  saveWarehouses,
} from '../../services/dictionaryService';
import { showConfirm } from '@/lib/dialogService';

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Partial<Warehouse> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 加载仓库数据
  const loadWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWarehouses();
      setWarehouses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载仓库失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  // 过滤仓库
  const filteredWarehouses = warehouses.filter(
    (wh) =>
      wh.warehouseName?.includes(searchTerm) ||
      wh.warehouseCode?.includes(searchTerm) ||
      wh.warehouseType?.includes(searchTerm) ||
      wh.location?.includes(searchTerm)
  );

  // 分页
  const totalPages = Math.ceil(filteredWarehouses.length / pageSize);
  const paginatedWarehouses = filteredWarehouses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingWarehouse({
      warehouseCode: '',
      warehouseName: '',
      warehouseType: '',
      location: '',
      capacity: undefined,
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse({ ...warehouse });
    setShowModal(true);
  };

  // 保存
  const handleSave = async () => {
    if (!editingWarehouse) return;
    try {
      setLoading(true);
      await saveWarehouses({
        inserted: editingWarehouse.oid ? [] : [editingWarehouse as Warehouse],
        updated: editingWarehouse.oid ? [editingWarehouse as Warehouse] : [],
        deleted: [],
      });
      setShowModal(false);
      setEditingWarehouse(null);
      await loadWarehouses();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async (warehouse: Warehouse) => {
    if (!await showConfirm(`确定要删除仓库"${warehouse.warehouseName}"吗？`)) return;
    try {
      setLoading(true);
      await saveWarehouses({
        inserted: [],
        updated: [],
        deleted: [warehouse.oid!],
      });
      await loadWarehouses();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <a
            href="/settings"
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
            title="返回系统设置"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">仓库管理</h1>
            <p className="text-gray-500">管理仓库信息和配置</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <WarehouseIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warehouses.length}</p>
              <p className="text-xs text-gray-500">仓库总数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索仓库名称、编码或类型..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadWarehouses()}
              className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={handleAdd}
              className="h-10 px-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4" />
              新增仓库
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">仓库编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">仓库名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">仓库类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">位置</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">容量</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无仓库数据
                  </td>
                </tr>
              ) : (
                paginatedWarehouses.map((warehouse) => (
                  <tr key={warehouse.oid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{warehouse.warehouseCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{warehouse.warehouseName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{warehouse.warehouseType || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{warehouse.location || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {warehouse.capacity ? `${warehouse.capacity} m²` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(warehouse)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(warehouse)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              showPageSize={false}
            />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 弹窗 */}
      {showModal && editingWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingWarehouse.oid ? '编辑仓库' : '新增仓库'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仓库编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingWarehouse.warehouseCode || ''}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, warehouseCode: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：WH001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仓库名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingWarehouse.warehouseName || ''}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, warehouseName: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：宁波仓库"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">仓库类型</label>
                <input
                  type="text"
                  value={editingWarehouse.warehouseType || ''}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, warehouseType: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：常温库、冷库"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                <input
                  type="text"
                  value={editingWarehouse.location || ''}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, location: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：宁波鄞州区"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">容量 (m²)</label>
                <input
                  type="number"
                  value={editingWarehouse.capacity || ''}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, capacity: parseFloat(e.target.value) || undefined })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !editingWarehouse.warehouseCode || !editingWarehouse.warehouseName}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
