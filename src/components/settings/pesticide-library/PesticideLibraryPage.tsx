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
import { todayLocal } from '@/lib/dateUtils';
import { usePesticideLibraryStore, PesticideLibrary } from '@/stores';
import { PesticideLibraryFilter } from './PesticideLibraryFilter';
import { PesticideLibraryTable } from './PesticideLibraryTable';
import { AddPesticideModal } from './modals/AddPesticideModal';
import { EditPesticideModal } from './modals/EditPesticideModal';
import { PesticideDetailModal } from './modals/PesticideDetailModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { showAlert } from '@/lib/dialogService';
import * as XLSX from 'xlsx';
// 2026-07-10：导出时把 pesticideTypes 转中文
import { getDictLabel, useDictionaryStore } from '@/stores/useDictionaryStore';

/**
 * 2026-07-10：树形剪枝 + 中文 label 渲染（导出用）
 * 一级被二级覆盖时隐藏一级，例如 ["fungicide","fungicide_fungi"] → "杀菌剂-真菌"
 */
function renderPesticideTypeLabelsExport(
  types: string[] | undefined,
  getLabel: (cat: string, code: string) => string,
  dictionaries: any[]
): string {
  if (!types || types.length === 0) return '';
  const topLevelCodes = new Set<string>();
  const childrenByParent = new Map<string, Set<string>>();
  for (const d of dictionaries) {
    const cat = d.categoryCode || d.category_code || d.category;
    if (cat !== 'pesticide_type') continue;
    const code = d.dictCode || d.dict_code;
    const parentId = d.parentId || d.parent_id;
    if (!parentId) {
      topLevelCodes.add(code);
    } else {
      const parent = dictionaries.find((x: any) => x.id === parentId);
      if (parent) {
        const parentCode = parent.dictCode || parent.dict_code;
        if (!childrenByParent.has(parentCode)) childrenByParent.set(parentCode, new Set());
        childrenByParent.get(parentCode)!.add(code);
      }
    }
  }
  const filtered = types.filter(t => {
    if (topLevelCodes.has(t)) {
      const children = childrenByParent.get(t);
      if (children) {
        for (const c of children) {
          if (types.includes(c)) return false;
        }
      }
    }
    return true;
  });
  return filtered.map(t => getLabel('pesticide_type', t) || t).join('、');
}

// 2026-07-10：取消 ControlType 分类，改用 pesticideType 字典项 dictCode
// 保留类型别名但不使用，改用 Tabs 显示药剂类型一级分类
// type ControlType = 'chemical' | 'bio' | 'physical';

/**
 * 2026-07-10：把后端返回的 pesticideType（camelCase 单数 + JSON 字符串）解析为 pesticideTypes 数组
 * 同时也支持已经是数组的情况
 */
function parsePesticideTypeField(row: any): string[] {
  // 优先 pesticideTypes（已经是数组）
  if (Array.isArray(row.pesticideTypes)) return row.pesticideTypes;
  // 兼容 pesticide_type（snake_case JSON 字符串）
  if (typeof row.pesticide_type === 'string' && row.pesticide_type.trim()) {
    try {
      const parsed = JSON.parse(row.pesticide_type);
      return Array.isArray(parsed) ? parsed : [row.pesticide_type];
    } catch {
      return [row.pesticide_type];
    }
  }
  // 兼容 pesticideType（camelCase 单数 JSON 字符串）
  if (typeof row.pesticideType === 'string' && row.pesticideType.trim()) {
    try {
      const parsed = JSON.parse(row.pesticideType);
      return Array.isArray(parsed) ? parsed : [row.pesticideType];
    } catch {
      return [row.pesticideType];
    }
  }
  // 兼容 pesticideType 已经是数组（camelCase 中间件没把数组转字符串）
  if (Array.isArray(row.pesticideType)) return row.pesticideType;
  return [];
}

export default function PesticideLibraryPage() {
  // ========== 导航 ==========
  const navigate = useNavigate();

  // ========== Store ==========
  const store = usePesticideLibraryStore();
  // 2026-07-10：导出树形剪枝需要 dictionaries（用于判断一级是否被二级覆盖）
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const { items, isLoading, error } = store;

  // ========== 本地状态 ==========
  // 2026-07-10：activeTab 改为药剂类型 dictCode（杀虫剂/杀菌剂/...）；'' 表示全部
  const [activeTab, setActiveTab] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  // 2026-07-10：tab 过滤用本地 items 状态，绕开 store 状态机
  const [localItems, setLocalItems] = useState<PesticideLibrary[]>([]);

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
    // 2026-07-10：tab 切换用 useState setter 直接 set items（绕开 store 内部状态机）
    const qs = new URLSearchParams();
    qs.append('limit', '10000');
    if (activeTab) qs.append('pesticide_type', activeTab);
    const rawUrl = `/api/pesticide-library?${qs.toString()}`;
    console.log("[FX] before fetch, url=", rawUrl);
    console.log('[PesticideLibraryPage] tab change → direct fetch, activeTab=', JSON.stringify(activeTab));
    fetch(rawUrl)
      .then(r => { console.log("[FX] fetch resolved, status=", r.status); return r.json(); })
      .then(resp => {
        const rawList = resp?.data ?? [];
        // 2026-07-10：把后端返回的 pesticideType（camelCase 单数）解析为 pesticideTypes（复数数组）
        const list: PesticideLibrary[] = rawList.map((row: any) => ({
          ...row,
          pesticideTypes: parsePesticideTypeField(row),
        }));
        console.log('[PesticideLibraryPage] → setLocalItems, count:', list.length);
        setLocalItems(list);
        (usePesticideLibraryStore as any).setState({ items: list, isLoading: false });
      })
      .catch(e => console.error("[PesticideLibraryPage] fetch error:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(() => {
    const keyword = filters.pesticideName || '';
    const tabFilter = activeTab ? { ...filters, pesticide_type: activeTab, keyword } : { ...filters, keyword };
    store.fetchItems(tabFilter);
  }, [filters, activeTab, store]);

  const handleReset = useCallback(() => {
    setFilters({});
    store.fetchItems(activeTab ? { pesticide_type: activeTab } : {});
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

    // 2026-07-10：导出表头改为药剂类型多值（关联 pesticide_type 字典）
    const headers = ['药剂编码', '药剂名称', '药剂类型', '功能说明', '使用禁忌', '防治对象'];

    // 生成导出数据（数组格式）
    // 2026-07-10：树形剪枝——一级被二级覆盖时隐藏一级
    const rows = selectedData.map(record => [
      record.pesticideCode || '',
      record.pesticideName || '',
      // 多个药剂类型用顿号分隔
      renderPesticideTypeLabelsExport(record.pesticideTypes, getDictLabel, dictionaries),
      record.functionDesc || '',
      record.tabooDesc || '',
      record.targetPests || '',
    ]);

    const fileName = `药剂知识库_${todayLocal()}`;

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
    const tabFilter = activeTab ? { pesticide_type: activeTab, ...filters } : filters;
    store.fetchItems(tabFilter);
  }, [activeTab, filters, store]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    const tabFilter = activeTab ? { pesticide_type: activeTab, ...filters } : filters;
    store.fetchItems(tabFilter);
  }, [activeTab, filters, store]);

  // ========== Tab切换时重新加载 ==========
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
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

      {/* 2026-07-10：Tabs 改为按药剂类型一级分类（杀虫剂/杀菌剂/...），不再有化学/生物/物理 */}
      <Tabs defaultValue="" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="">全部</TabsTrigger>
          <TabsTrigger value="insecticide">杀虫剂</TabsTrigger>
          <TabsTrigger value="fungicide">杀菌剂</TabsTrigger>
          <TabsTrigger value="herbicide">除草剂</TabsTrigger>
          <TabsTrigger value="acaricide">杀螨剂</TabsTrigger>
          <TabsTrigger value="protective">保护剂</TabsTrigger>
          <TabsTrigger value="adjuvant">助剂</TabsTrigger>
          {/* 2026-07-10：移除「杀线虫剂」tab（按用户要求） */}
          <TabsTrigger value="other">其他</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 2026-07-10：内容提到 Tabs 外面，避免 TabsContent value="" 不渲染导致 Table 消失 */}
      <div className="space-y-4">
        {/* 2026-07-10：移除 TabsContent 包装，Table 必须在 Tabs 外避免 selectedValue 切换时消失 */}
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
            data={localItems.length > 0 ? localItems : items}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectRow={(id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])}
            onSelectAll={handleExportSelectAll}
          />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddPesticideModal
          isOpen={showAddModal}
          controlType=""
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
