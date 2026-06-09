/**
 * 药剂知识库页面组件
 * 布局：PageHeader → Tabs(化学防治/生物防治/物理防治) → FilterBar → Table → Modals
 * 所有数据通过 usePesticideLibraryStore 管理
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bug, Download, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { usePesticideLibraryStore, PesticideLibrary } from '@/stores';
import { PesticideLibraryFilter } from './PesticideLibraryFilter';
import { PesticideLibraryTable } from './PesticideLibraryTable';
import { AddPesticideModal } from './modals/AddPesticideModal';
import { EditPesticideModal } from './modals/EditPesticideModal';
import { PesticideDetailModal } from './modals/PesticideDetailModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { showAlert } from '@/lib/dialogService';
import * as XLSX from 'xlsx';

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

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PesticideLibrary | null>(null);
  const [detailTarget, setDetailTarget] = useState<PesticideLibrary | null>(null);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // ========== 数据加载 ==========
  useEffect(() => {
    const controlTypeFilter = { ...filters, control_type: activeTab };
    store.fetchItems(controlTypeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // 首次加载

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(() => {
    const keyword = filters.pesticideName || '';
    const controlTypeFilter = { ...filters, control_type: activeTab, keyword };
    store.fetchItems(controlTypeFilter);
  }, [filters, activeTab, store]);

  const handleReset = useCallback(() => {
    setFilters({});
    store.fetchItems({ control_type: activeTab });
  }, [activeTab, store]);

  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
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
      setSelectedRows(items.map(item => item.id));
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
    // 获取选中的数据
    const selectedData = items.filter(item => selectedRows.includes(item.id));

    // 导出表头
    const headers = ['药剂编码', '药剂名称', '防治类型', '功能说明', '使用禁忌', '防治对象'];

    // 生成导出数据（数组格式）
    const rows = selectedData.map(record => [
      record.pesticideCode || '',
      record.pesticideName || '',
      record.controlType === 'chemical' ? '化学防治' : record.controlType === 'bio' ? '生物防治' : '物理防治',
      record.functionDesc || '',
      record.tabooDesc || '',
      record.targetPests || '',
    ]);

    const fileName = `药剂知识库_${new Date().toISOString().slice(0, 10)}`;

    if (exportFormat === 'csv') {
      // CSV 格式
      const csvContent = [headers, ...rows].map(row =>
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
    } else if (exportFormat === 'word') {
      // Word 格式（HTML 表格）
      const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      const blob = new Blob([content], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.doc`;
      link.click();
    } else {
      // Excel 格式，使用 xlsx 库
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '药剂知识库');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  }, [items, selectedRows, exportFormat]);

  const handleEdit = useCallback(async (record: PesticideLibrary) => {
    // 获取完整的药剂数据（含规格），因为列表数据不包含规格
    const fullRecord = await store.fetchItemById(record.id);
    setEditTarget(fullRecord || record);
  }, [store]);

  const handleDetail = useCallback(async (record: PesticideLibrary) => {
    // 获取完整的药剂数据（含规格）
    const fullRecord = await store.fetchItemById(record.id);
    setDetailTarget(fullRecord || record);
  }, [store]);

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
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Bug className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">药剂库</h1>
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

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          {/* 表头工具栏 */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">药剂列表</h3>
              <span className="text-sm text-gray-500">共 {items.length} 条记录</span>
            </div>
            <div className="flex items-center gap-2">
              {!exportMode ? (
                <>
                  <Button variant="default" size="sm" onClick={handleAdd}>
                    <Plus className="w-4 h-4" />
                    新增药剂
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

          {/* 表格 */}
          <PesticideLibraryTable
            data={items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectRow={(id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])}
            onSelectAll={handleExportSelectAll}
          />
        </TabsContent>

        <TabsContent value="bio">
          <PesticideLibraryFilter
            filters={filters}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          {/* 表头工具栏 */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">药剂列表</h3>
              <span className="text-sm text-gray-500">共 {items.length} 条记录</span>
            </div>
            <div className="flex items-center gap-2">
              {!exportMode ? (
                <>
                  <Button variant="default" size="sm" onClick={handleAdd}>
                    <Plus className="w-4 h-4" />
                    新增药剂
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

          <PesticideLibraryTable
            data={items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectRow={(id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])}
            onSelectAll={handleExportSelectAll}
          />
        </TabsContent>

        <TabsContent value="physical">
          <PesticideLibraryFilter
            filters={filters}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          {/* 表头工具栏 */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">药剂列表</h3>
              <span className="text-sm text-gray-500">共 {items.length} 条记录</span>
            </div>
            <div className="flex items-center gap-2">
              {!exportMode ? (
                <>
                  <Button variant="default" size="sm" onClick={handleAdd}>
                    <Plus className="w-4 h-4" />
                    新增药剂
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

          <PesticideLibraryTable
            data={items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectRow={(id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])}
            onSelectAll={handleExportSelectAll}
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
