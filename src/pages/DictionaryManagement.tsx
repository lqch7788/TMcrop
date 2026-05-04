/**
 * 数据字典管理页面
 * V5.0 按模块分组展示分类和字典项
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Book,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  Save,
  ChevronUp,
  Users,
  Truck,
  Sprout,
  Flower2,
  Warehouse,
  Building,
  CheckCircle,
  ClipboardList,
} from 'lucide-react';
import {
  Dictionary,
  getDictionaries,
  getDictionaryCategories,
  saveDictionaries,
  getCategoryChineseName,
  DICTIONARY_MODULES,
  getCategoriesByModule,
} from '../services/dictionaryService';

// 模块图标映射
const MODULE_ICONS: Record<string, React.ReactNode> = {
  Users: <Users className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
  Sprout: <Sprout className="w-5 h-5" />,
  Flower2: <Flower2 className="w-5 h-5" />,
  Warehouse: <Warehouse className="w-5 h-5" />,
  Building: <Building className="w-5 h-5" />,
  CheckCircle: <CheckCircle className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
};

export default function DictionaryManagement() {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 展开的模块集合
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  // 展开的分类集合
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 编辑状态
  const [editingItem, setEditingItem] = useState<Dictionary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);

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
        getDictionaries(),
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
  }, []);

  // 切换模块展开/折叠
  const toggleModule = (moduleCode: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleCode)) {
      newExpanded.delete(moduleCode);
    } else {
      newExpanded.add(moduleCode);
    }
    setExpandedModules(newExpanded);
  };

  // 切换分类展开/折叠
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // 展开所有
  const expandAll = async () => {
    // 如果字典数据为空，先加载数据
    if (dictionaries.length === 0) {
      await loadData();
    }
    setExpandedModules(new Set(DICTIONARY_MODULES.map(m => m.code)));
    setExpandedCategories(new Set(categories));
  };

  // 折叠所有
  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedCategories(new Set());
  };

  // 获取模块下的分类
  const getCategoriesInModule = (moduleCode: string) => {
    const module = DICTIONARY_MODULES.find(m => m.code === moduleCode);
    if (!module) return [];
    return categories.filter(c => module.categories.includes(c));
  };

  // 按分类过滤字典项（不受搜索词影响）
  const getDictionariesByCategory = (category: string) => {
    return dictionaries
      .filter(d => d.category === category)
      .sort((a, b) => (a.sortNumber || 0) - (b.sortNumber || 0));
  };

  // 打开新增字典项弹窗
  const handleAddItem = (category: string) => {
    setEditingItem({
      category,
      code: '',
      name: '',
      sortNumber: 0,
    });
    setIsNewItem(true);
    setIsModalOpen(true);
  };

  // 打开编辑字典项弹窗
  const handleEditItem = (item: Dictionary) => {
    setEditingItem({ ...item });
    setIsNewItem(false);
    setIsModalOpen(true);
  };

  // 保存字典项
  const handleSave = async () => {
    if (!editingItem) return;
    if (!editingItem.name?.trim()) {
      alert('请输入字典名称');
      return;
    }
    if (!editingItem.code?.trim()) {
      alert('请输入字典编码');
      return;
    }
    try {
      setLoading(true);
      await saveDictionaries({
        inserted: isNewItem && !editingItem.id ? [editingItem] : [],
        updated: editingItem.id ? [editingItem] : [],
        deleted: [],
      });
      setIsModalOpen(false);
      setEditingItem(null);
      await loadData();
      // 触发全局刷新事件，通知其他使用字典的组件更新数据
      window.dispatchEvent(new CustomEvent('settings:refresh'));
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除字典项
  const handleDelete = async (item: Dictionary) => {
    if (!confirm(`确定要删除字典项"${item.name}"吗？`)) return;
    try {
      setLoading(true);
      await saveDictionaries({
        inserted: [],
        updated: [],
        deleted: [item.id!],
      });
      await loadData();
      // 触发全局刷新事件，通知其他使用字典的组件更新数据
      window.dispatchEvent(new CustomEvent('settings:refresh'));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存新分类
  const handleSaveNewCategory = () => {
    if (!newCategoryCode.trim() || !newCategoryName.trim()) {
      alert('请填写完整的分类信息');
      return;
    }
    setEditingItem({
      category: newCategoryCode.trim(),
      code: 'NEW',
      name: newCategoryName.trim(),
      sortNumber: 0,
    });
    setShowAddCategoryModal(false);
    setIsNewItem(true);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
            >
              <ChevronDown className="w-4 h-4" />
              全部展开
            </button>
            <button
              onClick={collapseAll}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
            >
              <ChevronUp className="w-4 h-4" />
              全部折叠
            </button>
            <button
              onClick={() => loadData()}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="h-10 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4" />
              新增分类
            </button>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索字典名称或编码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 模块折叠面板列表 */}
      <div className="space-y-3">
        {DICTIONARY_MODULES.map((mod) => {
          const moduleCategories = getCategoriesInModule(mod.code);
          const isModuleExpanded = expandedModules.has(mod.code);
          const totalItems = moduleCategories.reduce((sum, cat) => sum + getDictionariesByCategory(cat).length, 0);

          // 过滤逻辑：如果有搜索词，只显示包含匹配项的模块
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const hasMatchingItems = moduleCategories.some(cat => {
              const items = getDictionariesByCategory(cat);
              return items.some(d =>
                d.name.toLowerCase().includes(searchLower) ||
                d.code.toLowerCase().includes(searchLower)
              );
            });
            if (!hasMatchingItems) return null;
          }

          return (
            <div key={mod.code} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* 模块头部 */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors"
                onClick={() => toggleModule(mod.code)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-sm text-indigo-600">
                    {MODULE_ICONS[mod.icon]}
                  </div>
                  {isModuleExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-lg font-semibold text-gray-900">{mod.name}</span>
                  <span className="px-2 py-0.5 bg-white text-indigo-600 text-xs rounded-full shadow-sm">
                    {moduleCategories.length} 分类 / {totalItems} 项
                  </span>
                </div>
              </div>

              {/* 模块下的分类列表 */}
              {isModuleExpanded && (
                <div className="border-t border-gray-100">
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {moduleCategories.map((category) => {
                        const isExpanded = expandedCategories.has(category);
                        const items = getDictionariesByCategory(category);
                        const chineseName = getCategoryChineseName(category);

                        // 搜索过滤
                        if (searchTerm) {
                          const searchLower = searchTerm.toLowerCase();
                          const matchesCategory = chineseName.toLowerCase().includes(searchLower) ||
                            category.toLowerCase().includes(searchLower);
                          const matchesItems = items.some(d =>
                            d.name.toLowerCase().includes(searchLower) ||
                            d.code.toLowerCase().includes(searchLower)
                          );
                          if (!matchesCategory && !matchesItems) return null;
                        }

                        return (
                          <div key={category} className="border border-gray-100 rounded-lg overflow-hidden">
                            {/* 分类头部 */}
                            <div
                              className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleCategory(category)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-sm font-medium text-gray-700">{chineseName}</span>
                                <span className="text-xs text-gray-400">({category})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                                  {items.length}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddItem(category);
                                  }}
                                  className="p-1 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                  title="新增"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* 字典项列表 */}
                            {isExpanded && (
                              <div className="border-t border-gray-100">
                                {items.length === 0 ? (
                                  <div className="px-3 py-4 text-center text-gray-400 text-xs">
                                    暂无字典项
                                  </div>
                                ) : (
                                  <table className="table-fixed w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-50 text-left text-gray-500">
                                        <th className="py-1.5 pl-3 font-medium">编码</th>
                                        <th className="py-1.5 text-center font-medium">名称</th>
                                        <th className="py-1.5 text-center font-medium">排序</th>
                                        <th className="py-1.5 text-center font-medium">状态</th>
                                        <th className="py-1.5 pr-2 text-right font-medium">操作</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                                          <td className="py-1 pl-3">
                                            <span className="font-mono text-gray-700">{item.code}</span>
                                          </td>
                                          <td className="py-1 text-center">
                                            <span className="text-gray-900 truncate block">{item.name}</span>
                                          </td>
                                          <td className="py-1 text-center text-gray-500">
                                            {item.sortNumber || 0}
                                          </td>
                                          <td className="py-1 text-center">
                                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                              item.status === 'active'
                                                ? 'bg-green-50 text-green-600'
                                                : 'bg-gray-100 text-gray-500'
                                            }`}>
                                              {item.status === 'active' ? '启用' : '停用'}
                                            </span>
                                          </td>
                                          <td className="py-1 pr-2 text-right">
                                            <div className="flex items-center justify-end gap-0.5">
                                              <button
                                                onClick={() => handleEditItem(item)}
                                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="编辑"
                                              >
                                                <Edit className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => handleDelete(item)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="删除"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 统计信息 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>共 {DICTIONARY_MODULES.length} 个模块，{categories.length} 个分类，{dictionaries.length} 个字典项</span>
        </div>
      </div>

      {/* 新增/编辑字典项弹窗 */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {isNewItem && !editingItem.id ? '新增字典项' : '编辑字典项'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 分类（只读） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <input
                  type="text"
                  value={`${getCategoryChineseName(editingItem.category)} (${editingItem.category})`}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
                  disabled
                />
              </div>

              {/* 编码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingItem.code || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：active"
                  disabled={!isNewItem || !!editingItem.id}
                />
              </div>

              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：启用"
                  autoFocus
                />
              </div>

              {/* 排序 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  value={editingItem.sortNumber || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, sortNumber: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !editingItem.code || !editingItem.name}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增分类弹窗 */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">新增字典分类</h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryCode}
                  onChange={(e) => setNewCategoryCode(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：custom_category"
                />
                <p className="mt-1 text-xs text-gray-400">建议使用英文下划线格式，如 custom_category</p>
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
                  placeholder="例如：自定义分类"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveNewCategory}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"
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
