/**
 * 药剂知识库页面组件
 * 布局：PageHeader → Tabs(化学防治/生物防治/物理防治) → FilterBar → ActionBar → Table → Modals
 * 所有数据通过 usePesticideLibraryStore 管理
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Bug, Plus, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { usePesticideLibraryStore, PesticideLibrary } from '@/stores';
import { PesticideLibraryFilter } from './PesticideLibraryFilter';
import { PesticideLibraryTable } from './PesticideLibraryTable';
import { AddPesticideModal } from './modals/AddPesticideModal';
import { EditPesticideModal } from './modals/EditPesticideModal';
import { PesticideDetailModal } from './modals/PesticideDetailModal';

type ControlType = 'chemical' | 'bio' | 'physical';

export default function PesticideLibraryPage() {
  // ========== 导航 ==========
  const navigate = useNavigate();

  // ========== Store ==========
  const store = usePesticideLibraryStore();
  const { items, isLoading, error } = store;

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState<ControlType>('chemical');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchKeyword, setSearchKeyword] = useState('');

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PesticideLibrary | null>(null);
  const [detailTarget, setDetailTarget] = useState<PesticideLibrary | null>(null);

  // ========== 数据加载 ==========
  useEffect(() => {
    const controlTypeFilter = { ...filters, control_type: activeTab };
    store.fetchItems(controlTypeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // 首次加载

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(() => {
    const controlTypeFilter = { ...filters, control_type: activeTab, keyword: searchKeyword };
    store.fetchItems(controlTypeFilter);
  }, [filters, activeTab, searchKeyword, store]);

  const handleReset = useCallback(() => {
    setFilters({});
    setSearchKeyword('');
    store.fetchItems({ control_type: activeTab });
  }, [activeTab, store]);

  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
  }, []);

  // ========== CRUD 处理 ==========
  const handleAdd = useCallback(() => setShowAddModal(true), []);

  const handleEdit = useCallback((record: PesticideLibrary) => {
    setEditTarget(record);
  }, []);

  const handleDetail = useCallback((record: PesticideLibrary) => {
    setDetailTarget(record);
  }, []);

  const handleDelete = useCallback((id: string) => {
    store.deleteItem(id);
  }, [store]);

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    store.fetchItems({ control_type: activeTab, ...filters });
  }, [activeTab, filters, store]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    store.fetchItems({ control_type: activeTab, ...filters });
  }, [activeTab, filters, store]);

  // ========== Tab切换时重新加载 ==========
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as ControlType);
  }, []);

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
              <h1 className="text-2xl font-bold text-gray-900">药剂知识库</h1>
              <p className="text-gray-500">管理药剂信息、规格参数和生产厂家</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: 化学防治 / 生物防治 / 物理防治 */}
      <Tabs defaultValue="chemical" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="chemical">化学防治</TabsTrigger>
          <TabsTrigger value="bio">生物防治</TabsTrigger>
          <TabsTrigger value="physical">物理防治</TabsTrigger>
        </TabsList>

        <TabsContent value="chemical">
          {/* 筛选器 */}
          <PesticideLibraryFilter
            filters={filters}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          {/* 顶部操作栏 */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索药剂名称、编码..."
                    className="pl-10 h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAdd}
                >
                  <Plus className="w-4 h-4" />
                  新增药剂
                </Button>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          {/* 表格 */}
          <PesticideLibraryTable
            data={items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="bio">
          <PesticideLibraryFilter
            filters={filters}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索药剂名称、编码..."
                    className="pl-10 h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAdd}
                >
                  <Plus className="w-4 h-4" />
                  新增药剂
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          <PesticideLibraryTable
            data={items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="physical">
          <PesticideLibraryFilter
            filters={filters}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索药剂名称、编码..."
                    className="pl-10 h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAdd}
                >
                  <Plus className="w-4 h-4" />
                  新增药剂
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          <PesticideLibraryTable
            data={items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showAddModal && (
        <AddPesticideModal
          isOpen={showAddModal}
          controlType={activeTab}
          onClose={() => setShowAddModal(false)}
          onSaved={handleAddSaved}
        />
      )}
      {editTarget && (
        <EditPesticideModal
          isOpen={!!editTarget}
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
      {detailTarget && (
        <PesticideDetailModal
          isOpen={!!detailTarget}
          record={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}
