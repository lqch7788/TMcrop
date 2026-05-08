/**
 * 种植区域管理页面（温室大棚管理）
 * 功能：温室信息的新增、编辑、删除、查询
 * 使用 API 替代硬编码数据
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';

interface Greenhouse {
  id: string;
  oid: string;
  code: string;
  name: string;
  greenhouseType: string;
  area: number;
  location: string;
  status: string;
  createdAt: string;
}

const API_BASE = '/api/basic-data/greenhouses';

const GREENHOUSE_TYPES = ['温室大棚', '春秋大棚', '日光温室', '智能温室', '其他'];

export default function PlantAreaManagement() {
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingGreenhouse, setEditingGreenhouse] = useState<Greenhouse | null>(null);
  const [newGreenhouse, setNewGreenhouse] = useState<Partial<Greenhouse>>({ status: 'active' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 5;

  // 加载温室数据
  const loadGreenhouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE);
      const result = await response.json();
      if (result.success) {
        setGreenhouses(result.data || []);
      } else {
        setError('获取温室数据失败');
      }
    } catch (err) {
      console.error('加载温室数据失败:', err);
      setError('加载温室数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGreenhouses();
  }, [loadGreenhouses]);

  const filteredGreenhouses = greenhouses.filter(gh => {
    const matchSearch = gh.name?.toLowerCase().includes(searchTerm.toLowerCase()) || gh.code?.includes(searchTerm);
    const matchStatus = statusFilter === '全部' || gh.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredGreenhouses.length / pageSize);
  const paginatedGreenhouses = filteredGreenhouses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSaveGreenhouse = async () => {
    if (!newGreenhouse.name || !newGreenhouse.code) {
      alert('请填写温室名称和编码');
      return;
    }
    try {
      if (editingGreenhouse) {
        const response = await fetch(`${API_BASE}/${editingGreenhouse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newGreenhouse.name,
            code: newGreenhouse.code,
            greenhouseType: newGreenhouse.greenhouseType,
            area: newGreenhouse.area,
            location: newGreenhouse.location,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadGreenhouses();
          setShowModal(false);
          setEditingGreenhouse(null);
          setNewGreenhouse({ status: 'active' });
        } else {
          alert(result.error || '更新失败');
        }
      } else {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newGreenhouse.name,
            code: newGreenhouse.code,
            greenhouseType: newGreenhouse.greenhouseType,
            area: newGreenhouse.area,
            location: newGreenhouse.location,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadGreenhouses();
          setShowModal(false);
          setNewGreenhouse({ status: 'active' });
        } else {
          alert(result.error || '创建失败');
        }
      }
    } catch (err) {
      console.error('保存温室失败:', err);
      alert('保存温室失败');
    }
  };

  const deleteGreenhouse = async (id: string) => {
    if (!confirm('确定删除该温室吗？')) return;
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        await loadGreenhouses();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (err) {
      console.error('删除温室失败:', err);
      alert('删除温室失败');
    }
  };

  const editGreenhouse = (gh: Greenhouse) => {
    setEditingGreenhouse(gh);
    setNewGreenhouse(gh);
    setShowModal(true);
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
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">种植区域管理</h1>
            <p className="text-gray-500">大棚与种植区域的基础信息管理</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{greenhouses.length}</p>
              <p className="text-xs text-gray-500">区域总数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{greenhouses.filter(g => g.status === 'active').length}</p>
              <p className="text-xs text-gray-500">使用中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{greenhouses.filter(g => g.status === 'inactive').length}</p>
              <p className="text-xs text-gray-500">维护中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{greenhouses.reduce((sum, g) => sum + (g.area || 0), 0)}</p>
              <p className="text-xs text-gray-500">总面积(㎡)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">区域名称</label>
            <input
              type="text"
              placeholder="搜索区域名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>active</option>
              <option>inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="default">
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button
              variant="default"
              onClick={() => { setEditingGreenhouse(null); setNewGreenhouse({ status: 'active' }); setShowModal(true); }}
            >
              <Plus className="w-4 h-4" />
              新增区域
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">种植区域列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">区域编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">区域名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">区域类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">面积(㎡)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">位置</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedGreenhouses.map((gh) => (
                <tr key={gh.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{gh.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{gh.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{gh.greenhouseType || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{gh.area || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{gh.location || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      gh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {gh.status === 'active' ? '使用中' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => editGreenhouse(gh)}
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => deleteGreenhouse(gh.id)}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredGreenhouses.length} 条记录，第 {currentPage}/{totalPages || 1} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingGreenhouse ? '编辑温室' : '新增温室'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">温室名称</label>
                  <input
                    type="text"
                    value={newGreenhouse.name || ''}
                    onChange={(e) => setNewGreenhouse({ ...newGreenhouse, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="如：1号棚"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">温室编码</label>
                  <input
                    type="text"
                    value={newGreenhouse.code || ''}
                    onChange={(e) => setNewGreenhouse({ ...newGreenhouse, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="如：A001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">温室类型</label>
                  <select
                    value={newGreenhouse.greenhouseType || ''}
                    onChange={(e) => setNewGreenhouse({ ...newGreenhouse, greenhouseType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择</option>
                    {GREENHOUSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">面积(㎡)</label>
                  <input
                    type="number"
                    value={newGreenhouse.area || 0}
                    onChange={(e) => setNewGreenhouse({ ...newGreenhouse, area: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                <input
                  type="text"
                  value={newGreenhouse.location || ''}
                  onChange={(e) => setNewGreenhouse({ ...newGreenhouse, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="如：A区"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setShowModal(false); setEditingGreenhouse(null); setNewGreenhouse({ status: 'active' }); }}>取消</Button>
              <Button variant="default" onClick={handleSaveGreenhouse}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
