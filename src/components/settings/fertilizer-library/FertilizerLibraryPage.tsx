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
import { useFertilizerLibraryStore, useToastStore } from '@/stores';
import type { FertilizerLibrary } from '@/stores';
import {
  FertilizerType,
  FERTILIZER_TYPE_OPTIONS,
  FERTILIZER_SUB_TYPE_OPTIONS,
  FERTILIZER_TYPE_WITH_SUB,
} from './constants';
import { FertilizerLibraryTable } from './FertilizerLibraryTable';
import { AddFertilizerModal } from './modals/AddFertilizerModal';
import { EditFertilizerModal } from './modals/EditFertilizerModal';
import { FertilizerDetailModal } from './modals/FertilizerDetailModal';
import { FertilizerStockInModal } from './modals/FertilizerStockInModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { showAlert, showConfirm } from '@/lib/dialogService';
import * as XLSX from 'xlsx';

export default function FertilizerLibraryPage() {
  // ========== 导航 ==========
  const navigate = useNavigate();

  // ========== Store（H22 修复：用 selector 避免整 store 解构反模式）==========
  const items = useFertilizerLibraryStore((s) => s.items);
  const isLoading = useFertilizerLibraryStore((s) => s.isLoading);
  const error = useFertilizerLibraryStore((s) => s.error);
  const clearError = useFertilizerLibraryStore((s) => s.clearError);
  // 2026-07-27 修复：必须用 selector 单独选 actions，否则 useFertilizerLibraryStore()
  // 返回整个 store 对象引用，每次 set({isLoading}) 都让 store 引用变 → useEffect
  // 依赖里包含 store 会无限重渲染 + Maximum update depth 死循环。
  // 用 useShallow 浅比较 actions 对象（zustand 5 推荐用法）。
  const fetchItems = useFertilizerLibraryStore((s) => s.fetchItems);
  const fetchItemById = useFertilizerLibraryStore((s) => s.fetchItemById);
  const deleteItem = useFertilizerLibraryStore((s) => s.deleteItem);
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState<FertilizerType>('organic');
  // 无机肥料中类筛选（空字符串 = 全部中类）；其它大类不使用
  const [activeSubType, setActiveSubType] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  // 搜索触发计数器：每次新搜索时 +1，传给表格用于将分页重置到第 1 页
  // （修复"跨 tab 搜索结果被分页隐藏"导致用户看不到的 bug）
  const [searchKey, setSearchKey] = useState(0);

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FertilizerLibrary | null>(null);
  const [detailTarget, setDetailTarget] = useState<FertilizerLibrary | null>(null);
  // 入库弹窗
  const [stockInTarget, setStockInTarget] = useState<FertilizerLibrary | null>(null);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // ========== 数据加载 ==========
  // C7 修复：补全依赖数组（filters + fetchItems）
  // 2026-07-27 修复：依赖必须是稳定引用的 fetchItems selector，不能是整个 store 对象
  // 注意：activeTab 切换后需要保留关键字（肥料名称）作为后端 keyword 查询条件，
  // 否则 useEffect 拉的全 tab 列表会覆盖掉搜索结果，导致用户看不到匹配行。
  // 2026-08-15 审核修复：提取 buildFetchFilters 统一「fertilizerName → keyword」转换，
  // 此前 handleAddSaved/handleEditSaved/handleStockInSaved 直接把 fertilizerName 当参数名
  // 传给后端（后端只认 keyword），保存后搜索结果被静默清空
  const buildFetchFilters = useCallback((): Record<string, string> => ({
    fertilizer_type: activeTab,
    // 中类筛选只在无机肥料大类下生效
    fertilizer_sub_type: activeTab === FERTILIZER_TYPE_WITH_SUB ? activeSubType : '',
    keyword: (filters.fertilizerName || '').trim(),
  }), [activeTab, activeSubType, filters]);

  useEffect(() => {
    fetchItems(buildFetchFilters());
  }, [buildFetchFilters, fetchItems]);

  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载肥料库数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(async () => {
    const keyword = (filters.fertilizerName || '').trim();
    setSearchKey((k) => k + 1);
    if (keyword) {
      // 输入了关键字时：全局搜索（不按 tab / 中类过滤），让用户能跨类型找到肥料
      // 同时清空中类筛选，避免后续按 tab 重拉时把命中的其它中类记录过滤掉
      setActiveSubType('');
      await fetchItems({ ...filters, keyword });
      // 取首条命中 → 自动切到该肥料所在的 tab，保证"输入名称即可定位"
      const firstMatch = useFertilizerLibraryStore.getState().items[0];
      if (firstMatch?.fertilizerType && firstMatch.fertilizerType !== activeTab) {
        const newTab = firstMatch.fertilizerType as FertilizerType;
        setActiveTab(newTab);
        // useEffect on [activeTab] 会自动按新 tab + 当前 keyword 重新拉取
      }
    } else {
      // 无关键字时按当前大类 + 中类过滤
      await fetchItems(buildFetchFilters());
    }
  }, [filters, activeTab, buildFetchFilters, fetchItems]);

  const handleReset = useCallback(() => {
    setFilters({});
    setSearchKey((k) => k + 1);
    fetchItems(buildFetchFilters());
  }, [buildFetchFilters, fetchItems]);

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

    const headers = [
      '肥料编码', '肥料名称', '品牌', '肥料类型', '肥料中类', '成份与含量', '功能说明',
      '包装规格', '库存量', '库存单位', '单价', '生产厂家', '建议用量', '单位',
      '稀释比例', '产品批次', '生产日期', '过期日期', '备注',
    ];

    const rows = selectedData.map((record) => [
      record.fertilizerCode || '',
      record.fertilizerName || '',
      record.brandName || '',
      // 大类 + 中类均输出中文，避免导出英文码
      FERTILIZER_TYPE_OPTIONS.find((o) => o.value === record.fertilizerType)?.label || record.fertilizerType || '',
      record.fertilizerSubType
        ? (FERTILIZER_SUB_TYPE_OPTIONS.find((o) => o.value === record.fertilizerSubType)?.label || record.fertilizerSubType)
        : '',
      record.specContent || '',
      record.functionDesc || '',
      record.packageSpec || '',
      record.stockQuantity?.toFixed(2) ?? '',
      record.stockUnit || 'kg',
      record.unitPrice?.toFixed(2) ?? '',
      record.manufacturer || '',
      record.suggestedDosage || '',
      record.dosageUnit || '',
      record.suggestedRatio || '',
      record.batchNumber || '',
      record.productionDate || '',
      record.expirationDate || '',
      record.remark || '',
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
      const fullRecord = await fetchItemById(record.id);
      setEditTarget(fullRecord || record);
    },
    [fetchItemById],
  );

  const handleDetail = useCallback(
    async (record: FertilizerLibrary) => {
      const fullRecord = await fetchItemById(record.id);
      setDetailTarget(fullRecord || record);
    },
    [fetchItemById],
  );

  // 入库
  const handleStockIn = useCallback((record: FertilizerLibrary) => {
    setStockInTarget(record);
  }, []);

  const handleStockInSaved = useCallback(() => {
    setStockInTarget(null);
    fetchItems(buildFetchFilters());
  }, [buildFetchFilters, fetchItems]);

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await showConfirm('确认删除该肥料记录？此操作不可恢复。\n\n删除后，相关防治/施肥记录中的使用追溯可能无法完整显示。');
      if (!confirmed) return;
      // 2026-08-15 审核修复：等待删除结果，失败给用户可见提示（原代码 fire-and-forget，失败静默）
      const success = await deleteItem(id);
      if (!success) {
        await showAlert('删除失败：' + (useFertilizerLibraryStore.getState().error || '请稍后重试'));
      }
    },
    [deleteItem],
  );

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    fetchItems(buildFetchFilters());
  }, [buildFetchFilters, fetchItems]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    fetchItems(buildFetchFilters());
  }, [buildFetchFilters, fetchItems]);

  // ========== Tab 切换 ==========
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as FertilizerType);
    // 切大类时重置中类筛选（包括切到无机肥料时默认「全部中类」）
    setActiveSubType('');
  }, []);

  // ========== 中类筛选（仅无机肥料） ==========
  const handleSubTypeChange = useCallback((subType: string) => {
    setActiveSubType(subType);
    setSearchKey((k) => k + 1);
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
          {/* Tab 按键（4 大类，2026-10-18 重分类） */}
          <TabsList selectedValue={activeTab} onValueChange={handleTabChange}>
            {FERTILIZER_TYPE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>{opt.label}</TabsTrigger>
            ))}
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

        {/* 无机肥料中类筛选（仅无机肥料 Tab 显示） */}
        {activeTab === FERTILIZER_TYPE_WITH_SUB && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-gray-500">中类：</span>
            <Button
              size="sm"
              variant={activeSubType === '' ? 'default' : 'secondary'}
              onClick={() => handleSubTypeChange('')}
            >
              全部
            </Button>
            {FERTILIZER_SUB_TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={activeSubType === opt.value ? 'default' : 'secondary'}
                onClick={() => handleSubTypeChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

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
            onStockIn={handleStockIn}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectRow={(id) =>
              setSelectedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
            }
            onSelectAll={handleExportSelectAll}
            searchKey={searchKey}
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
      {stockInTarget && (
        <FertilizerStockInModal
          isOpen={!!stockInTarget}
          record={stockInTarget}
          onClose={() => setStockInTarget(null)}
          onSaved={handleStockInSaved}
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