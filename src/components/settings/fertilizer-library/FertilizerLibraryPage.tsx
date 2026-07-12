/**
 * 肥料知识库页面组件（2026-07-12 布局重构）
 * 布局：PageHeader → [Tabs(分类) + 搜索框/重置/搜索 同行] → 表格 + 工具栏 → Modals
 * 搜索框 + 重置 + 搜索按键移到与 tab 同一行（tab 按键之后）
 * 所有数据通过 useFertilizerLibraryStore 管理
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Download, Leaf, Plus, X, Search, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { useFertilizerLibraryStore, FertilizerLibrary, useToastStore } from '@/stores';
import { FertilizerLibraryTable } from './FertilizerLibraryTable';
import { AddFertilizerModal } from './modals/AddFertilizerModal';
import { EditFertilizerModal } from './modals/EditFertilizerModal';
import { FertilizerDetailModal } from './modals/FertilizerDetailModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { showAlert } from '@/lib/dialogService';
import * as XLSX from 'xlsx';

type FertilizerType = 'organic' | 'inorganic' | 'water_soluble' | 'compound' | 'bio' | 'slow_release' | 'trace';

export default function FertilizerLibraryPage() {
  // ========== 导航 ==========
  const navigate = useNavigate();

  // ========== Store ==========
  const store = useFertilizerLibraryStore();
  const { items, isLoading, error, clearError } = store;
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState<FertilizerType>('organic');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FertilizerLibrary | null>(null);
  const [detailTarget, setDetailTarget] = useState<FertilizerLibrary | null>(null);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // ========== 数据加载 ==========
  useEffect(() => {
    const typeFilter = { ...filters, fertilizer_type: activeTab };
    store.fetchItems(typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载肥料库数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(() => {
    const keyword = filters.fertilizerName || '';
    const typeFilter = { ...filters, fertilizer_type: activeTab, keyword };
    store.fetchItems(typeFilter);
  }, [filters, activeTab, store]);

  const handleReset = useCallback(() => {
    setFilters({});
    store.fetchItems({ fertilizer_type: activeTab });
  }, [activeTab, store]);

  const updateFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ========== CRUD 处理 ==========
  const handleAdd = useCallback(() => setShowAddModal(true), []);

  // ========== 导出处理 ==========
  const handleExportClick = useCallback(() => {
    setExportMode(true);
    setSelectedRows([]);
  }, []);

  const handleExportCancel = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  const handleExportSelectAll = useCallback(() => {
    if (selectedRows.length === items.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(items.map((item) => item.id));
    }
  }, [items, selectedRows]);

  const handleExportConfirm = useCallback(() => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  }, [selectedRows]);

  const handleConfirmExport = useCallback(() => {
    const selectedData = items.filter((item) => selectedRows.includes(item.id));

    const headers = ['肥料编码', '肥料名称', '肥料类型', '分类', '功能说明', '使用禁忌', '保质期', '存储条件', '供应商信息'];

    const categoryMap: Record<string, string> = {
      base: '底肥',
      top_dressing: '追肥',
      foliar: '叶面肥',
      special: '特殊肥',
    };

    const rows = selectedData.map((record) => [
      record.fertilizerCode || '',
      record.fertilizerName || '',
      record.fertilizerType || '',
      categoryMap[record.fertilizerCategory || ''] || '',
      record.functionDesc || '',
      record.tabooDesc || '',
      record.shelfLife || '',
      record.storageCondition || '',
      record.supplierInfo || '',
    ]);

    const fileName = `肥料知识库_${todayLocal()}`;

    if (exportFormat === 'csv') {
      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
    } else if (exportFormat === 'word') {
      const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      const blob = new Blob([content], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.doc`;
      link.click();
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '肥料知识库');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  }, [items, selectedRows, exportFormat]);

  const handleEdit = useCallback(
    async (record: FertilizerLibrary) => {
      const fullRecord = await store.fetchItemById(record.id);
      setEditTarget(fullRecord || record);
    },
    [store],
  );

  const handleDetail = useCallback(
    async (record: FertilizerLibrary) => {
      const fullRecord = await store.fetchItemById(record.id);
      setDetailTarget(fullRecord || record);
    },
    [store],
  );

  const handleDelete = useCallback(
    (id: string) => {
      store.deleteItem(id);
    },
    [store],
  );

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    store.fetchItems({ fertilizer_type: activeTab, ...filters });
  }, [activeTab, filters, store]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    store.fetchItems({ fertilizer_type: activeTab, ...filters });
  }, [activeTab, filters, store]);

  // ========== Tab 切换 ==========
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as FertilizerType);
  }, []);

  // ========== 表头工具栏 ==========
  const renderToolbar = () => (
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">肥料列表</h3>
        <span className="text-sm text-gray-500">共 {items.length} 条记录</span>
      </div>
      <div className="flex items-center gap-2">
        {!exportMode ? (
          <>
            <Button variant="default" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              新增肥料
            </Button>
            <Button variant="default" size="sm" onClick={handleExportClick}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={handleExportConfirm}>
              <Download className="w-4 h-4" />
              确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCancel}>
              <X className="w-4 h-4" /> 取消选择
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // ========== 错误提示 ==========
  const renderError = () =>
    error && (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
        加载出错：{error}
      </div>
    );

  // ========== 渲染 ==========
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center justify-between gap-4">
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
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">肥料库</h1>
              <p className="text-gray-500">管理肥料信息、规格参数和供应商信息</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + 搜索框（同行布局） */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          {/* Tab 按键 */}
          <TabsList>
            <TabsTrigger value="organic">有机肥</TabsTrigger>
            <TabsTrigger value="inorganic">无机肥</TabsTrigger>
            <TabsTrigger value="water_soluble">水溶肥</TabsTrigger>
            <TabsTrigger value="compound">复合肥</TabsTrigger>
            <TabsTrigger value="bio">生物肥</TabsTrigger>
            <TabsTrigger value="slow_release">缓释肥</TabsTrigger>
            <TabsTrigger value="trace">微量元素肥</TabsTrigger>
          </TabsList>

          {/* 搜索框 + 重置 + 搜索按键（tab 按键之后） */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-[280px] max-w-[480px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={filters.fertilizerName || ''}
                onChange={(e) => updateFilter('fertilizerName', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索肥料名称"
                className="w-full h-10 pl-10 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <Button variant="warning" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
            <Button variant="default" size="sm" onClick={handleSearch}>
              <Search className="w-4 h-4" />
              搜索
            </Button>
          </div>
        </div>

        {/* 单一 TabsContent 区域（受控渲染，按 activeTab 显示） */}
        <TabsContent value={activeTab} forceMount>
          {renderError()}
          {renderToolbar()}
          <FertilizerLibraryTable
            data={items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectRow={(id) =>
              setSelectedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
            }
            onSelectAll={handleExportSelectAll}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showAddModal && (
        <AddFertilizerModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSaved={handleAddSaved}
        />
      )}
      {editTarget && (
        <EditFertilizerModal
          isOpen={!!editTarget}
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
      {detailTarget && (
        <FertilizerDetailModal
          isOpen={!!detailTarget}
          record={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
        selectedCount={selectedRows.length}
      />
    </div>
  );
}