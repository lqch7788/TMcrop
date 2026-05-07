import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Search, Plus, Edit2, Trash2, TrendingUp, DollarSign, ChevronLeft } from 'lucide-react';

interface CostCategory {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'labor' | 'equipment' | 'energy' | 'other';
  unit: string;
  description: string;
  status: 'active' | 'inactive';
}

interface CostBudget {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  usedAmount: number;
  period: string;
  status: 'active' | 'completed' | 'cancelled';
}

const STORAGE_KEY = 'cost_accounting_data';

const DEFAULT_CATEGORIES: CostCategory[] = [
  { id: '1', name: '肥料成本', code: 'COST-MAT-001', type: 'material', unit: '元/吨', description: '各种肥料采购成本', status: 'active' },
  { id: '2', name: '农药成本', code: 'COST-MAT-002', type: 'material', unit: '元/升', description: '农药采购成本', status: 'active' },
  { id: '3', name: '人工成本', code: 'COST-LAB-001', type: 'labor', unit: '元/工时', description: '工人工资和福利', status: 'active' },
  { id: '4', name: '设备折旧', code: 'COST-EQP-001', type: 'equipment', unit: '元/月', description: '设备折旧费用', status: 'active' },
  { id: '5', name: '水电费', code: 'COST-ENR-001', type: 'energy', unit: '元/度', description: '水电能源消耗', status: 'active' },
  { id: '6', name: '其他费用', code: 'COST-OTH-001', type: 'other', unit: '元', description: '其他杂项费用', status: 'active' },
];

const DEFAULT_BUDGETS: CostBudget[] = [
  { id: '1', name: '2024年Q1肥料预算', categoryId: '1', amount: 50000, usedAmount: 32000, period: '2024-Q1', status: 'active' },
  { id: '2', name: '2024年Q1农药预算', categoryId: '2', amount: 20000, usedAmount: 15000, period: '2024-Q1', status: 'active' },
  { id: '3', name: '2024年Q1人工预算', categoryId: '3', amount: 80000, usedAmount: 65000, period: '2024-Q1', status: 'active' },
];

export default function CostAccounting() {
  const [activeTab, setActiveTab] = useState<'categories' | 'budgets' | 'analysis'>('categories');
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [budgets, setBudgets] = useState<CostBudget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null);
  const [editingBudget, setEditingBudget] = useState<CostBudget | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<CostCategory>>({ status: 'active' });
  const [newBudget, setNewBudget] = useState<Partial<CostBudget>>({ status: 'active' });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setCategories(data.categories || DEFAULT_CATEGORIES);
      setBudgets(data.budgets || DEFAULT_BUDGETS);
    } else {
      setCategories(DEFAULT_CATEGORIES);
      setBudgets(DEFAULT_BUDGETS);
    }
  }, []);

  useEffect(() => {
    if (categories.length > 0 || budgets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, budgets }));
    }
  }, [categories, budgets]);

  const filteredCategories = categories.filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm));
  const filteredBudgets = budgets.filter(b => b.name.includes(searchTerm));

  const handleSaveCategory = () => {
    if (editingCategory) {
      setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, ...newCategory } as CostCategory : c));
    } else {
      setCategories([...categories, { ...newCategory, id: Date.now().toString() } as CostCategory]);
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
    setNewCategory({ status: 'active' });
  };

  const handleSaveBudget = () => {
    if (editingBudget) {
      setBudgets(budgets.map(b => b.id === editingBudget.id ? { ...b, ...newBudget } as CostBudget : b));
    } else {
      setBudgets([...budgets, { ...newBudget, id: Date.now().toString(), usedAmount: 0 } as CostBudget]);
    }
    setShowBudgetModal(false);
    setEditingBudget(null);
    setNewBudget({ status: 'active' });
  };

  const deleteCategory = (id: string) => {
    if (confirm('确定删除该成本类别吗？')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const deleteBudget = (id: string) => {
    if (confirm('确定删除该预算吗？')) {
      setBudgets(budgets.filter(b => b.id !== id));
    }
  };

  const getBudgetPercent = (used: number, total: number) => Math.round((used / total) * 100);

  const stats = {
    totalBudget: budgets.reduce((sum, b) => sum + b.amount, 0),
    totalUsed: budgets.reduce((sum, b) => sum + b.usedAmount, 0),
    categories: categories.length,
    activeBudgets: budgets.filter(b => b.status === 'active').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">成本核算设置</h2>
        </div>
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">总预算</p>
          </div>
          <p className="text-xl font-bold text-gray-900">¥{stats.totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-gray-500">已使用</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">¥{stats.totalUsed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">成本类别</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.categories}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">进行中预算</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.activeBudgets}</p>
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
              activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 成本类别 */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingCategory(null); setNewCategory({ status: 'active' }); setShowCategoryModal(true); }}
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
                {filteredCategories.map(cat => {
                  const typeMap = { material: '物料', labor: '人工', equipment: '设备', energy: '能源', other: '其他' };
                  return (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.code}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">{typeMap[cat.type]}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.unit}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{cat.description}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {cat.status === 'active' ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => deleteCategory(cat.id)} className="p-1.5 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 预算管理 */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingBudget(null); setNewBudget({ status: 'active' }); setShowBudgetModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增预算
            </button>
          </div>
          <div className="space-y-4">
            {filteredBudgets.map(budget => {
              const category = categories.find(c => c.id === budget.categoryId);
              const percent = getBudgetPercent(budget.usedAmount, budget.amount);
              return (
                <div key={budget.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      budget.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {budget.status === 'active' ? '进行中' : budget.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">类别</p>
                      <p className="text-gray-900 font-medium">{category?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">周期</p>
                      <p className="text-gray-900 font-medium">{budget.period}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">使用率</p>
                      <p className={`font-bold ${percent >= 80 ? 'text-red-600' : 'text-emerald-600'}`}>{percent}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full ${percent >= 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>已用: ¥{budget.usedAmount.toLocaleString()}</span>
                    <span>总预算: ¥{budget.amount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 成本分析 */}
      {activeTab === 'analysis' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">成本结构分析</h3>
          <div className="space-y-4">
            {categories.map(cat => {
              const catBudgets = budgets.filter(b => b.categoryId === cat.id);
              const totalUsed = catBudgets.reduce((sum, b) => sum + b.usedAmount, 0);
              const percent = stats.totalUsed > 0 ? Math.round((totalUsed / stats.totalUsed) * 100) : 0;
              return (
                <div key={cat.id} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">{cat.name}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="h-4 rounded-full bg-emerald-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-sm text-gray-900 font-medium text-right">{percent}%</div>
                  <div className="w-28 text-sm text-gray-600 text-right">¥{totalUsed.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 类别编辑弹窗 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingCategory ? '编辑类别' : '新增成本类别'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类别名称</label>
                  <input
                    type="text"
                    value={newCategory.name || ''}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <input
                    type="text"
                    value={newCategory.code || ''}
                    onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={newCategory.type || 'other'}
                    onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as CostCategory['type'] })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <input
                    type="text"
                    value={newCategory.unit || ''}
                    onChange={(e) => setNewCategory({ ...newCategory, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newCategory.description || ''}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveCategory} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 预算编辑弹窗 */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingBudget ? '编辑预算' : '新增预算'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预算名称</label>
                <input
                  type="text"
                  value={newBudget.name || ''}
                  onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">成本类别</label>
                  <select
                    value={newBudget.categoryId || ''}
                    onChange={(e) => setNewBudget({ ...newBudget, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">预算金额</label>
                  <input
                    type="number"
                    value={newBudget.amount || 0}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预算周期</label>
                <input
                  type="text"
                  value={newBudget.period || ''}
                  onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="如：2024-Q1"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowBudgetModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveBudget} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
