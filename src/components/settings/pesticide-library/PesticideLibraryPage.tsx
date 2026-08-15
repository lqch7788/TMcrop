/**
 * 药剂知识库页面组件（V2 扁平化 2026-07-12）
 * 布局：PageHeader → Tabs(按药剂类型) + 搜索框 → 工具栏 → Table → Modals
 * 对齐肥料库 FertilizerLibraryPage 模式
 * 每个 item = 一条完整的药剂规格，无折叠/展开
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, Bug, Download, Plus, X, Search, RotateCcw, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { usePesticideLibraryStore, useToastStore, PesticideSpec } from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { PesticideLibraryFilter } from './PesticideLibraryFilter';
import { PesticideLibraryTable } from './PesticideLibraryTable';
import { AddPesticideModal } from './modals/AddPesticideModal';
import { EditPesticideModal } from './modals/EditPesticideModal';
import { PesticideDetailModal } from './modals/PesticideDetailModal';
import { PesticideStockInModal } from './modals/PesticideStockInModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { showAlert, showConfirm } from '@/lib/dialogService';
import * as XLSX from 'xlsx';

/**
 * 药剂类型中文 label 渲染（树形剪枝 + 多值用顿号分隔）
 */
function renderPesticideTypeLabels(
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

export default function PesticideLibraryPage() {
  const navigate = useNavigate();

  // ========== Store（H22 修复：拆 selector 避免全 store 订阅触发整组件重渲染）==========
  const items = usePesticideLibraryStore((s) => s.items);
  const isLoading = usePesticideLibraryStore((s) => s.isLoading);
  const error = usePesticideLibraryStore((s) => s.error);
  const clearError = usePesticideLibraryStore((s) => s.clearError);
  const fetchItems = usePesticideLibraryStore((s) => s.fetchItems);
  const fetchItemById = usePesticideLibraryStore((s) => s.fetchItemById);
  const deleteItem = usePesticideLibraryStore((s) => s.deleteItem);
  const toast = useToastStore((s) => s.toast);
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const lastShownErrorRef = useRef<string | null>(null);

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PesticideSpec | null>(null);
  const [detailTarget, setDetailTarget] = useState<PesticideSpec | null>(null);
  const [stockInTarget, setStockInTarget] = useState<PesticideSpec | null>(null);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // ========== 2026-08-15 O3/O4：库存状态 + 有效期本地筛选 ==========
  const [stockFilter, setStockFilter] = useState<string>('all');     // all | low | zero
  const [expiryFilter, setExpiryFilter] = useState<string>('all');   // all | nearby | expired

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      // 库存筛选：低库存（0<量<50）/ 零库存
      const stock = r.stockQuantity ?? 0;
      if (stockFilter === 'zero' && stock > 0) return false;
      if (stockFilter === 'low' && !(stock > 0 && stock < 50)) return false;
      // 有效期筛选：临期（0~30 天）/ 已过期
      if (expiryFilter !== 'all') {
        if (!r.expirationDate) return false;
        const exp = new Date(r.expirationDate);
        exp.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((exp.getTime() - today.getTime()) / 86400000);
        if (expiryFilter === 'expired' && diffDays >= 0) return false;
        if (expiryFilter === 'nearby' && (diffDays < 0 || diffDays > 30)) return false;
      }
      return true;
    });
  }, [items, stockFilter, expiryFilter]);

  // ========== 数据加载 ==========
  // TOP1+C2 修复：依赖数组补全 filters，filters 变化也能触发重拉；
  //               fetchItems 为 Zustand 稳定 action 引用，依赖稳定不会引发无限循环
  useEffect(() => {
    const typeFilter = activeTab
      ? { ...filters, pesticide_type: activeTab }
      : filters;
    fetchItems(typeFilter);
  }, [activeTab, filters, fetchItems]);

  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载药剂库数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(() => {
    const typeFilter = activeTab
      ? { ...filters, pesticide_type: activeTab }
      : filters;
    fetchItems(typeFilter);
  }, [filters, activeTab, fetchItems]);

  const handleReset = useCallback(() => {
    setFilters({});
    fetchItems(activeTab ? { pesticide_type: activeTab } : {});
  }, [activeTab, fetchItems]);

  const updateFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ========== CRUD 处理 ==========
  const handleAdd = useCallback(() => setShowAddModal(true), []);

  const handleEdit = useCallback(async (record: PesticideSpec) => {
    // 2026-08-15 O2：详情加载失败时明确提示（原静默降级为列表不完整记录，用户无感知）
    const fullRecord = await fetchItemById(record.id);
    if (!fullRecord) {
      toast.error('药剂详情加载失败，请刷新后重试');
      return;
    }
    setEditTarget(fullRecord);
  }, [fetchItemById, toast]);

  const handleDetail = useCallback(async (record: PesticideSpec) => {
    // 2026-08-15 O2：同上
    const fullRecord = await fetchItemById(record.id);
    if (!fullRecord) {
      toast.error('药剂详情加载失败，请刷新后重试');
      return;
    }
    setDetailTarget(fullRecord);
  }, [fetchItemById, toast]);

  const handleDelete = useCallback(async (id: string) => {
    const confirmed = await showConfirm('确认删除该药剂记录？此操作不可恢复。');
    if (!confirmed) return;
    // 2026-08-15 O9：await 结果并显式提示失败（原实现不 await，失败仅靠间接 toast）
    const ok = await deleteItem(id);
    if (ok === false) {
      toast.error('删除药剂失败，请重试');
    }
  }, [deleteItem, toast]);

  const handleStockIn = useCallback((record: PesticideSpec) => {
    setStockInTarget(record);
  }, []);

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    const typeFilter = activeTab ? { pesticide_type: activeTab, ...filters } : filters;
    fetchItems(typeFilter);
  }, [activeTab, filters, fetchItems]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    const typeFilter = activeTab ? { pesticide_type: activeTab, ...filters } : filters;
    fetchItems(typeFilter);
  }, [activeTab, filters, fetchItems]);

  const handleStockInSaved = useCallback(() => {
    setStockInTarget(null);
    const typeFilter = activeTab ? { pesticide_type: activeTab, ...filters } : filters;
    fetchItems(typeFilter);
  }, [activeTab, filters, fetchItems]);

  // ========== Tab 切换 ==========
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

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
      '药剂编码', '药剂名称', '药剂成分', '含量', '品牌', '药剂类型', '剂型', '功能说明',
      '使用禁忌', '包装规格', '库存量', '库存单位', '单价', '生产厂家', '建议用量', '单位',
      '稀释比例', '产品批次', '生产日期', '过期日期', '作用机制', '防治对象', '备注',
    ];

    const rows = selectedData.map((record) => [
      record.pesticideCode || '',
      record.pesticideName || '',
      record.ingredient || '',
      record.specContent || '',
      record.brandName || '',
      renderPesticideTypeLabels(record.pesticideTypes, getDictLabel, dictionaries),
      record.formulation || '',
      record.functionDesc || '',
      record.tabooDesc || '',
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
      record.mechanism || '',
      record.targetPests || '',
      record.remark || '',
    ]);

    const fileName = `药剂知识库_${todayLocal()}`;

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
      XLSX.utils.book_append_sheet(workbook, worksheet, '药剂知识库');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  }, [items, selectedRows, exportFormat, dictionaries]);

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
              <p className="text-gray-500">管理药剂信息、规格参数和库存信息</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + 搜索框（同行布局，对齐肥料库） */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <TabsList selectedValue={activeTab} onValueChange={handleTabChange}>
            <TabsTrigger value="">全部</TabsTrigger>
            {/* 2026-07-17：从 pesticide_type 字典动态生成 Tab（去除硬编码，自动包含调节剂）
                只显示一级分类（parentId 为空），按 sort_order 排序
                「其他」兜底分类强制排到最后（不动 DB sort_order） */}
            {dictionaries
              .filter((d: any) => {
                const cat = d.categoryCode || d.category_code || d.category;
                const code = d.dictCode || d.dict_code;
                const parentId = d.parentId || d.parent_id;
                // 2026-08-15 O8：删除硬编码排除 nematicide — 分类 Tab 全部从字典动态生成
                return cat === 'pesticide_type' && !parentId && code;
              })
              .sort((a: any, b: any) => {
                const codeA = a.dictCode || a.dict_code;
                const codeB = b.dictCode || b.dict_code;
                // 「其他」兜底永远排最后
                if (codeA === 'other') return 1;
                if (codeB === 'other') return -1;
                const sa = a.sortOrder ?? a.sort_order ?? 0;
                const sb = b.sortOrder ?? b.sort_order ?? 0;
                return sa - sb;
              })
              .map((d: any) => {
                const code = d.dictCode || d.dict_code;
                const label = d.dictLabel || d.name;
                return (
                  <TabsTrigger key={code} value={code}>
                    {label}
                  </TabsTrigger>
                );
              })}
          </TabsList>

          {/* 搜索框 + 重置 + 搜索按键 */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-[280px] max-w-[480px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={filters.pesticideName || ''}
                onChange={(e) => updateFilter('pesticideName', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索药剂名称"
                className="w-full h-10 pl-10 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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

        <TabsContent value={activeTab} forceMount>
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          {/* 表头工具栏 */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">药剂列表</h3>
              <span className="text-sm text-gray-500">
                共 {items.length} 条记录{filteredItems.length !== items.length ? `（当前筛选 ${filteredItems.length} 条）` : ''}
              </span>
              {/* 2026-08-15 O3/O4：库存状态 + 有效期筛选 */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="h-8 px-2 border border-gray-300 rounded-md text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                title="按库存状态筛选"
              >
                <option value="all">库存：全部</option>
                <option value="low">库存：低库存(&lt;50)</option>
                <option value="zero">库存：零库存</option>
              </select>
              <select
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
                className="h-8 px-2 border border-gray-300 rounded-md text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                title="按有效期筛选"
              >
                <option value="all">有效期：全部</option>
                <option value="nearby">有效期：临期(30天)</option>
                <option value="expired">有效期：已过期</option>
              </select>
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

          {/* 表格（2026-08-15：data 改为过滤后列表） */}
          <PesticideLibraryTable
            data={filteredItems}
            isLoading={isLoading}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStockIn={handleStockIn}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectRow={(id) =>
              setSelectedRows((prev) =>
                prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
              )
            }
            onSelectAll={handleExportSelectAll}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showAddModal && (
        <AddPesticideModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSaved={handleAddSaved}
        />
      )}
      {editTarget && (
        <EditPesticideModal
          // 2026-08-15 O1：key 按药剂强制重挂载（修复切换药剂后表单残留）
          key={editTarget.id}
          isOpen={!!editTarget}
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
      {detailTarget && (
        <PesticideDetailModal
          // 2026-08-15 O1：key 按药剂强制重挂载
          key={detailTarget.id}
          isOpen={!!detailTarget}
          record={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
      {stockInTarget && (
        <PesticideStockInModal
          // 2026-08-15 O1：key 按药剂强制重挂载
          key={stockInTarget.id}
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
