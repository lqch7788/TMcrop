/**
 * 温室管理页面
 * V5.0 系统设置重构
 * 温室CRUD管理
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  Search,
  RefreshCw,
  X,
  Save,
  TreePine,
} from 'lucide-react';
import {
  Greenhouse,
  Base,
  getGreenhouses,
  getBases,
  saveGreenhouses,
} from '../../services/dictionaryService';
import { showConfirm } from '@/lib/dialogService';

export default function GreenhouseManagement() {
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGreenhouse, setEditingGreenhouse] = useState<Partial<Greenhouse> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ghData, baseData] = await Promise.all([
        getGreenhouses(),
        getBases(),
      ]);
      setGreenhouses(ghData);
      setBases(baseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 过滤温室
  const filteredGreenhouses = greenhouses.filter(
    (gh) =>
      gh.greenhouseName?.includes(searchTerm) ||
      gh.greenhouseCode?.includes(searchTerm) ||
      gh.greenhouseType?.includes(searchTerm)
  );

  // 分页
  const totalPages = Math.ceil(filteredGreenhouses.length / pageSize);
  const paginatedGreenhouses = filteredGreenhouses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 获取基地名称
  const getBaseName = (baseOid: string) => {
    const base = bases.find((b) => b.oid === baseOid);
    return base?.baseName || baseOid;
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingGreenhouse({
      greenhouseCode: '',
      greenhouseName: '',
      baseOid: '',
      greenhouseType: '',
      area: undefined,
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (greenhouse: Greenhouse) => {
    setEditingGreenhouse({ ...greenhouse });
    setShowModal(true);
  };

  // 保存
  const handleSave = async () => {
    if (!editingGreenhouse) return;
    try {
      setLoading(true);
      await saveGreenhouses({
        inserted: editingGreenhouse.oid ? [] : [editingGreenhouse as Greenhouse],
        updated: editingGreenhouse.oid ? [editingGreenhouse as Greenhouse] : [],
        deleted: [],
      });
      setShowModal(false);
      setEditingGreenhouse(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async (greenhouse: Greenhouse) => {
    if (!await showConfirm(`确定要删除温室"${greenhouse.greenhouseName}"吗？`)) return;
    try {
      setLoading(true);
      await saveGreenhouses({
        inserted: [],
        updated: [],
        deleted: [greenhouse.oid!],
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">温室管理</h1>
            <p className="text-gray-500">管理温室大棚信息</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Home className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{greenhouses.length}</p>
              <p className="text-xs text-gray-500">温室总数</p>
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
                placeholder="搜索温室名称、编码或类型..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={handleAdd}
              className="h-10 px-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4" />
              新增温室
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">温室编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">温室名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">所属基地</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">温室类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">面积</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedGreenhouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无温室数据
                  </td>
                </tr>
              ) : (
                paginatedGreenhouses.map((greenhouse) => (
                  <tr key={greenhouse.oid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{greenhouse.greenhouseCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{greenhouse.greenhouseName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getBaseName(greenhouse.baseOid)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{greenhouse.greenhouseType || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {greenhouse.area ? `${greenhouse.area} m²` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(greenhouse)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(greenhouse)}
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
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              显示 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, filteredGreenhouses.length)} 条，共 {filteredGreenhouses.length} 条
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {currentPage} / {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
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
      {showModal && editingGreenhouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingGreenhouse.oid ? '编辑温室' : '新增温室'}
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
                  温室编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingGreenhouse.greenhouseCode || ''}
                  onChange={(e) => setEditingGreenhouse({ ...editingGreenhouse, greenhouseCode: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="例如：GH001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  温室名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingGreenhouse.greenhouseName || ''}
                  onChange={(e) => setEditingGreenhouse({ ...editingGreenhouse, greenhouseName: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="例如：1号大棚"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  所属基地 <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingGreenhouse.baseOid || ''}
                  onChange={(e) => setEditingGreenhouse({ ...editingGreenhouse, baseOid: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">请选择基地</option>
                  {bases.map((base) => (
                    <option key={base.oid} value={base.oid}>
                      {base.baseName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">温室类型</label>
                <input
                  type="text"
                  value={editingGreenhouse.greenhouseType || ''}
                  onChange={(e) => setEditingGreenhouse({ ...editingGreenhouse, greenhouseType: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="例如：日光温室、塑料大棚"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">面积 (m²)</label>
                <input
                  type="number"
                  value={editingGreenhouse.area || ''}
                  onChange={(e) => setEditingGreenhouse({ ...editingGreenhouse, area: parseFloat(e.target.value) || undefined })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="例如：2000"
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
                disabled={loading || !editingGreenhouse.greenhouseCode || !editingGreenhouse.greenhouseName || !editingGreenhouse.baseOid}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
