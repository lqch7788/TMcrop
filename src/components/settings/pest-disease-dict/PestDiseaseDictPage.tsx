/**
 * 病虫害字典主页面组件
 * Tab切换：虫害 / 病害
 * 顶部操作栏：搜索框、适用作物筛选、状态筛选、新增按钮
 * 表格显示：编码、名称、类型、适用作物、描述、操作
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ArrowLeft, Bug, Plus, RotateCcw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { usePestDiseaseDictStore, PestDiseaseDict } from '@/stores';
import { showConfirm } from '@/lib/dialogService';
import { PestDiseaseDictTable } from './PestDiseaseDictTable';
import { AddPestDiseaseModal } from './modals/AddPestDiseaseModal';
import { EditPestDiseaseModal } from './modals/EditPestDiseaseModal';
import { PestDiseaseDetailModal } from './modals/PestDiseaseDetailModal';

type TabType = 'pest' | 'disease';

export default function PestDiseaseDictPage() {
  // ========== 导航 ==========
  const navigate = useNavigate();

  // ========== Store（用 selector 避免整 store 解构反模式）==========
  const items = usePestDiseaseDictStore((s) => s.items);
  const isLoading = usePestDiseaseDictStore((s) => s.isLoading);
  const error = usePestDiseaseDictStore((s) => s.error);
  const clearError = usePestDiseaseDictStore((s) => s.clearError);
  // 2026-07-28 修复 Maximum update depth exceeded：
  // 单独 selector 提取 actions，每个都是稳定引用（函数在 store 中不会改变）
  const fetchItems = usePestDiseaseDictStore((s) => s.fetchItems);
  const deleteItem = usePestDiseaseDictStore((s) => s.deleteItem);

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState<TabType>('pest');
  const [filters, setFilters] = useState<Record<string, string>>({ dictType: 'pest' });

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PestDiseaseDict | null>(null);
  const [detailTarget, setDetailTarget] = useState<PestDiseaseDict | null>(null);

  // ========== 数据加载 ==========
  // C4 + Bug 8 修复：
  // - 初始化加载：fetchItems 不传 dictType，让 API 返回 虫害+病害 全集
  //   —— 这样 stats.pestCount 和 stats.diseaseCount 才能正确统计
  //   （之前传 dictType=activeTab，导致 items 只含一个 tab 的数据，另一个永远 0）
  // - Tab 切换：只更新 filters.dictType（供搜索使用），不再触发重新拉取
  //   —— 前端 filteredItems = items.filter(it => it.dictType === activeTab) 已做 tab 过滤
  useEffect(() => {
    fetchItems({ limit: '10000' });
  }, [fetchItems]);

  // Tab 切换同步 filters.dictType（不重新查询）
  useEffect(() => {
    setFilters({ dictType: activeTab });
  }, [activeTab]);

  // ========== 筛选处理 ==========
  // H10 修复：去掉 searchKeyword 本地 state，搜索词走 filters.keyword；
  // 搜索框实时回车或点击「搜索」触发，handleSearch 直接传 keyword。
  const handleSearch = useCallback(() => {
    fetchItems({ ...filters, limit: '10000' });
  }, [filters, fetchItems]);

  const handleReset = useCallback(() => {
    setFilters({ dictType: activeTab });
    fetchItems({ dictType: activeTab, limit: '10000' });
  }, [activeTab, fetchItems]);

  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    setFilters({ ...newFilters, dictType: activeTab });
  }, [activeTab]);

  // ========== CRUD 处理 ==========
  const handleAdd = useCallback(() => setShowAddModal(true), []);

  const handleDetail = useCallback((record: PestDiseaseDict) => {
    setDetailTarget(record);
  }, []);

  const handleEdit = useCallback((record: PestDiseaseDict) => {
    setEditTarget(record);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await showConfirm('确定删除该病虫害吗？\n\n删除后，被引用的信息将无法完整显示。');
    if (ok) {
      deleteItem(id);
    }
  }, [deleteItem]);

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    fetchItems({ dictType: activeTab, limit: '10000' });
  }, [activeTab, fetchItems]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    fetchItems({ dictType: activeTab, limit: '10000' });
  }, [activeTab, fetchItems]);

  // ========== 根据Tab过滤数据 ==========
  const filteredItems = items.filter(item => item.dictType === activeTab);

  // ========== 统计数据 ==========
  const stats = {
    total: filteredItems.length,
    pestCount: items.filter(it => it.dictType === 'pest').length,
    diseaseCount: items.filter(it => it.dictType === 'disease').length,
  };

  // ========== 渲染 ==========
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-gray-500 hover:text-gray-700"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Bug className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">病虫害字典</h1>
              <p className="text-gray-500">管理虫害和病害的基础数据</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pest')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'pest'
                  ? 'border-green-500 text-green-600 bg-green-100'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bug className="w-4 h-4 inline mr-2" />
              虫害 ({stats.pestCount})
            </button>
            <button
              onClick={() => setActiveTab('disease')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'disease'
                  ? 'border-green-500 text-green-600 bg-green-100'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              病害 ({stats.diseaseCount})
            </button>
          </div>
        </div>

        {/* 顶部操作栏 */}
        <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* 搜索框（H10 修复：直接 bind filters.keyword，无本地 state）*/}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={filters.keyword || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, dictType: activeTab }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索病虫害名称或编码..."
                className="pl-9 h-10"
              />
            </div>
            {/* 适用作物 */}
            <div className="w-40">
              <Input
                type="text"
                value={filters.targetCrops || ''}
                onChange={(e) => handleFilterChange({ ...filters, targetCrops: e.target.value })}
                placeholder="适用作物"
                className="h-10"
              />
            </div>
            {/* 状态 */}
            <div className="w-28">
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 bg-white"
              >
                <option value="">状态</option>
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
              </select>
            </div>
            <Button variant="default" size="sm" onClick={handleSearch}>
              <Search className="w-4 h-4" /> 搜索
            </Button>
            <Button variant="warning" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" /> 重置
            </Button>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            新增{activeTab === 'pest' ? '虫害' : '病害'}
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            加载出错：{error}
          </div>
        )}

        {/* Table */}
        <PestDiseaseDictTable
          data={filteredItems}
          isLoading={isLoading}
          onDetail={handleDetail}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddPestDiseaseModal
          isOpen={showAddModal}
          dictType={activeTab}
          onClose={() => setShowAddModal(false)}
          onSaved={handleAddSaved}
        />
      )}
      {editTarget && (
        <EditPestDiseaseModal
          isOpen={!!editTarget}
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
      {detailTarget && (
        <PestDiseaseDetailModal
          isOpen={!!detailTarget}
          record={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}
