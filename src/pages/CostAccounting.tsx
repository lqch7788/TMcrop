import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Search, Plus, TrendingUp, DollarSign, ChevronLeft, RefreshCw } from 'lucide-react';
import { useCostCategories, useCostBudgets, useCostStats } from '../hooks/useCost';
import {
  CostCategory,
  CostBudget,
  CostCategoryType,
  COST_CATEGORY_TYPE_MAP,
  COST_CATEGORY_STATUS_MAP,
  BUDGET_STATUS_MAP,
} from '../types/cost';

export default function CostAccounting() {
  const [activeTab, setActiveTab] = useState<'categories' | 'budgets' | 'analysis'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null);
  const [editingBudget, setEditingBudget] = useState<CostBudget | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<CostCategory>>({ status: 'active' });
  const [newBudget, setNewBudget] = useState<Partial<CostBudget>>({ status: 'active' });

  // 使用 Hook 加载成本类别和预算
  const { categories, loading: categoriesLoading, reload: reloadCategories } = useCostCategories();
  const { budgets, loading: budgetsLoading, reload: reloadBudgets } = useCostBudgets();
  const { stats, summary, loading: statsLoading, reload: reloadStats } = useCostStats({});

  // 筛选
  const filteredCategories = categories.filter(c =>
    c.name.includes(searchTerm) || c.code.includes(searchTerm)
  );
  const filteredBudgets = budgets.filter(b => b.name.includes(searchTerm));

  // 保存类别
  const handleSaveCategory = () => {
    if (editingCategory) {
      // 更新现有类别（本地状态更新）
      const updated = categories.map(c =>
        c.id === editingCategory.id ? { ...c, ...newCategory } as CostCategory : c
      );
      // 本地更新（实际项目中应该调用API）
      console.log('更新类别:', updated);
    } else {
      // 新增类别
      const newCat: CostCategory = {
        id: Date.now().toString(),
        name: newCategory.name || '',
        code: newCategory.code || '',
        type: newCategory.type || 'other',
        unit: newCategory.unit || '元',
        description: newCategory.description || '',
        status: 'active',
      };
      console.log('新增类别:', newCat);
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
    setNewCategory({ status: 'active' });
  };

  // 保存预算
  const handleSaveBudget = () => {
    if (editingBudget) {
      const updated = budgets.map(b =>
        b.id === editingBudget.id ? { ...b, ...newBudget } as CostBudget : b
      );
      console.log('更新预算:', updated);
    } else {
      const newBud: CostBudget = {
        id: Date.now().toString(),
        name: newBudget.name || '',
        categoryId: newBudget.categoryId || '',
        amount: newBudget.amount || 0,
        usedAmount: 0,
        period: newBudget.period || '',
        status: 'active',
      };
      console.log('新增预算:', newBud);
    }
    setShowBudgetModal(false);
    setEditingBudget(null);
    setNewBudget({ status: 'active' });
  };

  // 删除类别（本地模拟）
  const deleteCategory = (id: string) => {
    if (confirm('确定删除该成本类别吗？')) {
      console.log('删除类别:', id);
      reloadCategories();
    }
  };

  // 删除预算（本地模拟）
  const deleteBudget = (id: string) => {
    if (confirm('确定删除该预算吗？')) {
      console.log('删除预算:', id);
      reloadBudgets();
    }
  };

  // 计算预算百分比
  const getBudgetPercent = (used: number, total: number) =>
    total > 0 ? Math.round((used / total) * 100) : 0;

  // 统计信息
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + b.usedAmount, 0);
  const activeBudgets = budgets.filter(b => b.status === 'active').length;

  // 刷新数据
  const handleRefresh = () => {
    reloadCategories();
    reloadBudgets();
    reloadStats();
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">成本核算设置</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 统计卡片 - 从API加载真实数据 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">总预算</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            ¥{(summary?.total_material_cost || totalBudget).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-gray-500">已使用</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">
            ¥{(summary?.total_material_cost || totalUsed).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">成本类别</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">进行中预算</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{activeBudgets}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'categories' as const, label: '成本类别', icon: Calculator },
          { id: 'budgets' as const, label: '预算管理', icon: DollarSign },
          { id: 'analysis' as const, label: '成本分析', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 成本类别 Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingCategory(null);
                setNewCategory({ status: 'active' });
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增类别
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">编码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">单位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoriesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.code}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                          {COST_CATEGORY_TYPE_MAP[cat.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.unit}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{cat.description}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            cat.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {COST_CATEGORY_STATUS_MAP[cat.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="p-1.5 hover:bg-red-50 rounded"
                          >
                            <span className="text-red-600 text-sm">删除</span>
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
      )}

      {/* 预算管理 Tab */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingBudget(null);
                setNewBudget({ status: 'active' });
                setShowBudgetModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增预算
            </button>
          </div>
          <div className="space-y-4">
            {budgetsLoading ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">加载中...</div>
            ) : filteredBudgets.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">暂无数据</div>
            ) : (
              filteredBudgets.map(budget => {
                const category = categories.find(c => c.id === budget.categoryId);
                const percent = getBudgetPercent(budget.usedAmount, budget.amount);
                return (
                  <div
                    key={budget.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          budget.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {BUDGET_STATUS_MAP[budget.status]}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-500">类别</p>
                        <p className="text-gray-900 font-medium">
                          {category?.name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">周期</p>
                        <p className="text-gray-900 font-medium">{budget.period}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">使用率</p>
                        <p
                          className={`font-bold ${
                            percent >= 80 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {percent}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full ${
                          percent >= 80 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        已用: ¥{budget.usedAmount.toLocaleString()}
                      </span>
                      <span>
                        总预算: ¥{budget.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 成本分析 Tab */}
      {activeTab === 'analysis' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">成本结构分析</h3>
          {statsLoading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : (
            <div className="space-y-4">
              {/* 物料成本分析 */}
              {stats?.material?.slice(0, 5).map((item, index) => {
                const totalAmount = stats.material.reduce(
                  (sum, m) => sum + m.total_amount,
                  0
                );
                const percent =
                  totalAmount > 0
                    ? Math.round((item.total_amount / totalAmount) * 100)
                    : 0;
                return (
                  <div key={`mat-${index}`} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">
                      {item.cost_name || item.cost_type}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-emerald-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-900 font-medium text-right">
                      {percent}%
                    </div>
                    <div className="w-28 text-sm text-gray-600 text-right">
                      ¥{item.total_amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}

              {/* 能源成本分析 */}
              {stats?.energy?.slice(0, 5).map((item, index) => {
                const totalAmount = stats.energy.reduce(
                  (sum, e) => sum + e.total_amount,
                  0
                );
                const percent =
                  totalAmount > 0
                    ? Math.round((item.total_amount / totalAmount) * 100)
                    : 0;
                return (
                  <div key={`energy-${index}`} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">
                      {item.cost_type}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-blue-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-900 font-medium text-right">
                      {percent}%
                    </div>
                    <div className="w-28 text-sm text-gray-600 text-right">
                      ¥{item.total_amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}

              {/* 人工成本分析 */}
              {stats?.labor?.slice(0, 5).map((item, index) => {
                const totalAmount = stats.labor.reduce(
                  (sum, l) => sum + l.total_amount,
                  0
                );
                const percent =
                  totalAmount > 0
                    ? Math.round((item.total_amount / totalAmount) * 100)
                    : 0;
                return (
                  <div key={`labor-${index}`} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">
                      {item.cost_type}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-orange-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-900 font-medium text-right">
                      {percent}%
                    </div>
                    <div className="w-28 text-sm text-gray-600 text-right">
                      ¥{item.total_amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 类别编辑弹窗 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCategory ? '编辑类别' : '新增成本类别'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    类别名称
                  </label>
                  <input
                    type="text"
                    value={newCategory.name || ''}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    编码
                  </label>
                  <input
                    type="text"
                    value={newCategory.code || ''}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    类型
                  </label>
                  <select
                    value={newCategory.type || 'other'}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        type: e.target.value as CostCategoryType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="material">物料</option>
                    <option value="labor">人工</option>
                    <option value="equipment">设备</option>
                    <option value="energy">能源</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    单位
                  </label>
                  <input
                    type="text"
                    value={newCategory.unit || ''}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={newCategory.description || ''}
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预算编辑弹窗 */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingBudget ? '编辑预算' : '新增预算'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预算名称
                </label>
                <input
                  type="text"
                  value={newBudget.name || ''}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    成本类别
                  </label>
                  <select
                    value={newBudget.categoryId || ''}
                    onChange={(e) =>
                      setNewBudget({ ...newBudget, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    预算金额
                  </label>
                  <input
                    type="number"
                    value={newBudget.amount || 0}
                    onChange={(e) =>
                      setNewBudget({
                        ...newBudget,
                        amount: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预算周期
                </label>
                <input
                  type="text"
                  value={newBudget.period || ''}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, period: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="如：2024-Q1"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBudgetModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleSaveBudget}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
