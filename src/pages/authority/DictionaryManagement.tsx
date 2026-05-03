/**
 * 数据字典管理页面
 * V5.0 系统设置重构
 * 数据字典CRUD管理
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Book,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  Search,
  RefreshCw,
  X,
  Save,
  FolderTree,
} from 'lucide-react';
import {
  Dictionary,
  getDictionaries,
  getDictionaryCategories,
  saveDictionaries,
  getCategoryChineseName,
} from '../../services/dictionaryService';

export default function DictionaryManagement() {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingDictionary, setEditingDictionary] = useState<Partial<Dictionary> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 新增分类弹窗状态
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dictData, catData] = await Promise.all([
        getDictionaries(selectedCategory || undefined),
        getDictionaryCategories(),
      ]);
      setDictionaries(dictData);
      setCategories(catData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  // 过滤字典
  const filteredDictionaries = dictionaries.filter(
    (dict) =>
      dict.name?.includes(searchTerm) ||
      dict.code?.includes(searchTerm) ||
      dict.category?.includes(searchTerm)
  );

  // 分页
  const totalPages = Math.ceil(filteredDictionaries.length / pageSize);
  const paginatedDictionaries = filteredDictionaries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 按分类分组统计
  const categoryStats = categories.reduce((acc, cat) => {
    acc[cat] = dictionaries.filter((d) => d.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingDictionary({
      category: selectedCategory || '',
      code: '',
      name: '',
      sortNumber: 0,
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (dictionary: Dictionary) => {
    setEditingDictionary({ ...dictionary });
    setShowModal(true);
  };

  // 保存
  const handleSave = async () => {
    if (!editingDictionary) return;
    try {
      setLoading(true);
      await saveDictionaries({
        inserted: editingDictionary.id ? [] : [editingDictionary as Dictionary],
        updated: editingDictionary.id ? [editingDictionary as Dictionary] : [],
        deleted: [],
      });
      setShowModal(false);
      setEditingDictionary(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async (dictionary: Dictionary) => {
    if (!confirm(`确定要删除字典项"${dictionary.name}"吗？`)) return;
    try {
      setLoading(true);
      await saveDictionaries({
        inserted: [],
        updated: [],
        deleted: [dictionary.id!],
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开新增分类弹窗
  const handleAddCategory = () => {
    setNewCategoryCode('');
    setNewCategoryName('');
    setShowAddCategoryModal(true);
  };

  // 保存新分类
  const handleSaveNewCategory = () => {
    if (!newCategoryCode.trim() || !newCategoryName.trim()) {
      alert('请填写完整的分类信息');
      return;
    }
    setEditingDictionary({
      category: newCategoryCode.trim(),
      code: 'NEW',
      name: newCategoryName.trim(),
      sortNumber: 0,
    });
    setShowAddCategoryModal(false);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Book className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据字典</h1>
            <p className="text-gray-500">管理系统数据字典配置</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              <p className="text-xs text-gray-500">字典分类</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Book className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dictionaries.length}</p>
              <p className="text-xs text-gray-500">字典项总数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* 分类筛选 */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryChineseName(cat)} ({categoryStats[cat] || 0})
                </option>
              ))}
            </select>

            {/* 搜索 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索字典名称或编码..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              onClick={handleAddCategory}
              className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增分类
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedCategory}
              className="h-10 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              新增字典项
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">分类</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">字典编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">字典名称</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">排序</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedDictionaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    暂无字典数据
                  </td>
                </tr>
              ) : (
                paginatedDictionaries.map((dictionary) => (
                  <tr key={dictionary.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {dictionary.category}
                      <span className="text-gray-400 ml-1">({getCategoryChineseName(dictionary.category)})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {dictionary.code}
                      <span className="text-gray-400 ml-1">({dictionary.name})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{dictionary.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{dictionary.sortNumber || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(dictionary)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dictionary)}
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
              显示 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, filteredDictionaries.length)} 条，共 {filteredDictionaries.length} 条
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

      {/* 新增分类弹窗 */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">新增字典分类</h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryCode}
                  onChange={(e) => setNewCategoryCode(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：supplier_type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：供应商类型"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveNewCategory}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 */}
      {showModal && editingDictionary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDictionary.id ? '编辑字典项' : '新增字典项'}
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
                  字典分类 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingDictionary.category || ''}
                  onChange={(e) => setEditingDictionary({ ...editingDictionary, category: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：作物类型"
                  disabled={!!editingDictionary.id}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  字典编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingDictionary.code || ''}
                  onChange={(e) => setEditingDictionary({ ...editingDictionary, code: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：VEGETABLE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  字典名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingDictionary.name || ''}
                  onChange={(e) => setEditingDictionary({ ...editingDictionary, name: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：蔬菜"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  value={editingDictionary.sortNumber || 0}
                  onChange={(e) => setEditingDictionary({ ...editingDictionary, sortNumber: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
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
                disabled={loading || !editingDictionary.category || !editingDictionary.code || !editingDictionary.name}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
