/**
 * 病虫害字典主页面组件
 * Tab切换：虫害 / 病害
 * 顶部操作栏：新增按钮、搜索框
 * 表格显示：编码、名称、类型、适用作物、描述、操作
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Bug, Plus, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { usePestDiseaseDictStore, PestDiseaseDict } from '@/stores';
import { PestDiseaseDictFilter } from './PestDiseaseDictFilter';
import { PestDiseaseDictTable } from './PestDiseaseDictTable';
import { AddPestDiseaseModal } from './modals/AddPestDiseaseModal';
import { EditPestDiseaseModal } from './modals/EditPestDiseaseModal';

type TabType = 'pest' | 'disease';

export default function PestDiseaseDictPage() {
  // ========== 导航 ==========
  const navigate = useNavigate();

  // ========== Store ==========
  const store = usePestDiseaseDictStore();
  const { items, isLoading, error } = store;

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState<TabType>('pest');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchKeyword, setSearchKeyword] = useState('');

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PestDiseaseDict | null>(null);

  // ========== 数据加载 ==========
  useEffect(() => {
    store.fetchItems({});
  }, []);

  // ========== Tab切换时重新加载数据 ==========
  useEffect(() => {
    setFilters({ dictType: activeTab });
    store.fetchItems({ dictType: activeTab });
  }, [activeTab]);

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(() => {
    store.fetchItems({ ...filters, keyword: searchKeyword });
  }, [filters, searchKeyword, store]);

  const handleReset = useCallback(() => {
    setFilters({ dictType: activeTab });
    setSearchKeyword('');
    store.fetchItems({ dictType: activeTab });
  }, [activeTab, store]);

  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    setFilters({ ...newFilters, dictType: activeTab });
  }, [activeTab]);

  // ========== CRUD 处理 ==========
  const handleAdd = useCallback(() => setShowAddModal(true), []);

  const handleEdit = useCallback((record: PestDiseaseDict) => {
    setEditTarget(record);
  }, []);

  const handleDelete = useCallback((id: string) => {
    store.deleteItem(id);
  }, [store]);

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    store.fetchItems({ dictType: activeTab });
  }, [activeTab, store]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    store.fetchItems({ dictType: activeTab });
  }, [activeTab, store]);

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
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pest'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bug className="w-4 h-4 inline mr-2" />
              虫害 ({stats.pestCount})
            </button>
            <button
              onClick={() => setActiveTab('disease')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'disease'
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bug className="w-4 h-4 inline mr-2" />
              病害 ({stats.diseaseCount})
            </button>
          </div>
        </div>

        {/* 顶部操作栏 */}
        <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1">
            {/* 搜索框 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索病虫害名称或编码..."
                className="pl-9 h-10"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleSearch}>
              搜索
            </Button>
            <Button variant="secondary" size="sm" onClick={handleReset}>
              重置
            </Button>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            新增{activeTab === 'pest' ? '虫害' : '病害'}
          </Button>
        </div>

        {/* FilterBar */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <PestDiseaseDictFilter
            filters={filters}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
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
    </div>
  );
}
