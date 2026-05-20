/**
 * 成本核算设置页面
 * 功能：成本类别管理、预算管理、成本分析
 * 数据流：组件 → useCostStore / useCostStats → API → SQLite
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Search, Plus, TrendingUp, DollarSign, ChevronLeft, RefreshCw } from 'lucide-react';
import { useCostStore } from '../stores';
import type { CostCategoryItem, CostBudgetItem } from '../stores';
import { useCostStats } from '../hooks/useCost';
import { showAlert, showConfirm } from '@/lib/dialogService';
import {
  COST_CATEGORY_TYPE_MAP,
  COST_CATEGORY_STATUS_MAP,
  BUDGET_STATUS_MAP,
} from '../types/cost';

const CATEGORY_TYPE_OPTIONS = ['material', 'labor', 'equipment', 'energy', 'other'] as const;
const BUDGET_STATUS_OPTIONS = ['active', 'completed', 'cancelled'] as const;

export default function CostAccounting() {
  const [activeTab, setActiveTab] = useState<'categories' | 'budgets' | 'analysis'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCategoryItem | null>(null);
  const [editingBudget, setEditingBudget] = useState<CostBudgetItem | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<CostCategoryItem>>({ status: 'active', categoryType: 'other' });
  const [newBudget, setNewBudget] = useState<Partial<CostBudgetItem>>({ status: 'active' });

  const { categories, budgets, loadAll, addCategory, updateCategory, removeCategory, addBudget, updateBudget, removeBudget } = useCostStore();
  const { stats, summary, loading: statsLoading } = useCostStats({});

  useEffect(() => { loadAll(); }, []);

  const filteredCategories = categories.filter(c =>
    (c.categoryName || '').includes(searchTerm) || (c.categoryCode || '').includes(searchTerm)
  );
  const filteredBudgets = budgets.filter(b =>
    (b.budgetName || '').includes(searchTerm) || (b.categoryName || '').includes(searchTerm)
  );

  // ==================== 类别操作 ====================

  const handleSaveCategory = async () => {
    if (!newCategory.categoryName || !newCategory.categoryCode) {
      await showAlert('请填写类别名称和编码'); return;
    }
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, newCategory);
      } else {
        await addCategory(newCategory);
      }
      setShowCategoryModal(false); setEditingCategory(null);
      setNewCategory({ status: 'active', categoryType: 'other' });
    } catch { /* store handles error */ }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!await showConfirm('确定删除该成本类别吗？')) return;
    try { await removeCategory(id); } catch { /* store handles error */ }
  };

  const editCategory = (cat: CostCategoryItem) => {
    setEditingCategory(cat); setNewCategory(cat); setShowCategoryModal(true);
  };

  // ==================== 预算操作 ====================

  const handleSaveBudget = async () => {
    if (!newBudget.budgetName || !newBudget.categoryOid || !newBudget.budgetYear) {
      await showAlert('请填写预算名称、选择类别和年份'); return;
    }
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, newBudget);
      } else {
        await addBudget(newBudget);
      }
      setShowBudgetModal(false); setEditingBudget(null);
      setNewBudget({ status: 'active' });
    } catch { /* store handles error */ }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!await showConfirm('确定删除该预算吗？')) return;
    try { await removeBudget(id); } catch { /* store handles error */ }
  };

  const editBudget = (bud: CostBudgetItem) => {
    setEditingBudget(bud); setNewBudget(bud); setShowBudgetModal(true);
  };

  const getBudgetPercent = (used: number, total: number) =>
    total > 0 ? Math.round((used / total) * 100) : 0;

  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + b.usedAmount, 0);
  const activeBudgets = budgets.filter(b => b.status === 'active').length;

  const handleRefresh = () => { loadAll(); };

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
          <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />刷新
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="搜索..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-5 h-5 text-blue-600" /><p className="text-sm text-gray-500">总预算</p></div>
          <p className="text-xl font-bold text-gray-900">¥{totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-emerald-600" /><p className="text-sm text-gray-500">已使用</p></div>
          <p className="text-xl font-bold text-emerald-600">¥{totalUsed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">成本类别</p><p className="text-xl font-bold text-gray-900 mt-1">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">进行中预算</p><p className="text-xl font-bold text-gray-900 mt-1">{activeBudgets}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'categories' as const, label: '成本类别', icon: Calculator },
          { id: 'budgets' as const, label: '预算管理', icon: DollarSign },
          { id: 'analysis' as const, label: '成本分析', icon: TrendingUp },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* 成本类别 Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingCategory(null); setNewCategory({ status: 'active', categoryType: 'other' }); setShowCategoryModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
              <Plus className="w-4 h-4" />新增类别
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
                {filteredCategories.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">暂无数据</td></tr>
                ) : (
                  filteredCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{cat.categoryName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.categoryCode}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                          {COST_CATEGORY_TYPE_MAP[cat.categoryType as keyof typeof COST_CATEGORY_TYPE_MAP] || cat.categoryType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.unit}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{cat.description}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {COST_CATEGORY_STATUS_MAP[cat.status as keyof typeof COST_CATEGORY_STATUS_MAP] || cat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => editCategory(cat)} className="p-1 text-blue-600 hover:bg-blue-50 rounded text-sm">编辑</button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 text-red-600 hover:bg-red-50 rounded text-sm">删除</button>
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
            <button onClick={() => { setEditingBudget(null); setNewBudget({ status: 'active' }); setShowBudgetModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
              <Plus className="w-4 h-4" />新增预算
            </button>
          </div>
          <div className="space-y-4">
            {filteredBudgets.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">暂无数据</div>
            ) : (
              filteredBudgets.map(budget => {
                const percent = getBudgetPercent(budget.usedAmount, budget.budgetAmount);
                return (
                  <div key={budget.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{budget.budgetName}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${budget.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {BUDGET_STATUS_MAP[budget.status as keyof typeof BUDGET_STATUS_MAP] || budget.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div><p className="text-gray-500">类别</p><p className="text-gray-900 font-medium">{budget.categoryName || '-'}</p></div>
                      <div><p className="text-gray-500">周期</p><p className="text-gray-900 font-medium">{budget.budgetYear}{budget.budgetMonth ? `-${String(budget.budgetMonth).padStart(2, '0')}` : ''}</p></div>
                      <div><p className={`font-bold ${percent >= 80 ? 'text-red-600' : 'text-emerald-600'}`}>{percent}%</p></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div className={`h-3 rounded-full ${percent >= 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>已用: ¥{budget.usedAmount.toLocaleString()}</span>
                      <span>总预算: ¥{budget.budgetAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button onClick={() => editBudget(budget)} className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs">编辑</button>
                      <button onClick={() => handleDeleteBudget(budget.id)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-xs">删除</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 成本分析 Tab（只读，使用 costStats API） */}
      {activeTab === 'analysis' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">成本结构分析</h3>
          {statsLoading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : (
            <div className="space-y-4">
              {stats?.material?.slice(0, 5).map((item: any, index: number) => {
                const totalAmount = stats.material.reduce((sum: number, m: any) => sum + m.total_amount, 0);
                const percent = totalAmount > 0 ? Math.round((item.total_amount / totalAmount) * 100) : 0;
                return (
                  <div key={`mat-${index}`} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">{item.cost_name || item.cost_type}</div>
                    <div className="flex-1"><div className="w-full bg-gray-200 rounded-full h-4"><div className="h-4 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div></div>
                    <div className="w-20 text-sm text-gray-900 font-medium text-right">{percent}%</div>
                    <div className="w-28 text-sm text-gray-600 text-right">¥{item.total_amount.toLocaleString()}</div>
                  </div>
                );
              })}
              {(!stats?.material || stats.material.length === 0) && <p className="text-center text-gray-400 py-4">暂无物料成本数据</p>}
            </div>
          )}
        </div>
      )}

      {/* 类别编辑弹窗 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingCategory ? '编辑类别' : '新增成本类别'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">类别名称</label>
                  <input type="text" value={newCategory.categoryName || ''} onChange={(e) => setNewCategory({ ...newCategory, categoryName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <input type="text" value={newCategory.categoryCode || ''} onChange={(e) => setNewCategory({ ...newCategory, categoryCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select value={newCategory.categoryType || 'other'} onChange={(e) => setNewCategory({ ...newCategory, categoryType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {CATEGORY_TYPE_OPTIONS.map(t => <option key={t} value={t}>{COST_CATEGORY_TYPE_MAP[t]}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <input type="text" value={newCategory.unit || ''} onChange={(e) => setNewCategory({ ...newCategory, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={newCategory.description || ''} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
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
              <div><label className="block text-sm font-medium text-gray-700 mb-1">预算名称</label>
                <input type="text" value={newBudget.budgetName || ''} onChange={(e) => setNewBudget({ ...newBudget, budgetName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">成本类别</label>
                  <select value={newBudget.categoryOid || ''} onChange={(e) => setNewBudget({ ...newBudget, categoryOid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">请选择</option>
                    {categories.map(cat => <option key={cat.oid} value={cat.oid}>{cat.categoryName}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">预算金额</label>
                  <input type="number" value={newBudget.budgetAmount || 0} onChange={(e) => setNewBudget({ ...newBudget, budgetAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">年份</label>
                  <input type="number" value={newBudget.budgetYear || new Date().getFullYear()} onChange={(e) => setNewBudget({ ...newBudget, budgetYear: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">月份（可选）</label>
                  <input type="number" min={1} max={12} value={newBudget.budgetMonth || ''} onChange={(e) => setNewBudget({ ...newBudget, budgetMonth: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
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
