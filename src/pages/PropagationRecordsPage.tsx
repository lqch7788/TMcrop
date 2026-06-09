/**
 * 繁殖过程记录 — 全量查看页
 * 2026-06-05 新增：跨种源查看所有繁殖过程记录，支持筛选 + 批量导出
 * 2026-06-05 UI 1:1 复刻种源管理：顶部卡片、表格样式、导出流程完全对齐
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ClipboardList, Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui';
import { DatePicker } from '../components/ui/DatePicker';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../components/ui/table';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FilterBar, FilterItem } from '../components/ui/FilterBar';
import { Label } from '../components/ui/label';
import { showAlert } from '../lib/dialogService';
import { ExportFormatModal } from '../components/common/ExportFormatModal';
import {
  getAllPropagationRecords,
  PropagationRecordWithSource,
} from '../services/apiSeedSourceService';

const STAGE_OPTIONS = [
  { value: 'planned', label: '已计划' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
];

// 2026-06-05: 补全 6 个 stage 映射（与 PropagationStageModal STAGE_LABELS 一致），避免 harvested/quality_checked/failed 落英文
const STAGE_LABEL_MAP: Record<string, string> = {
  planned: '已计划',
  in_progress: '进行中',
  harvested: '已采收',
  quality_checked: '已质检',
  completed: '已入库',
  failed: '失败',
};

const PROPAGATION_TYPE_LABEL: Record<string, string> = {
  external: '外购入库',
  breeding: '育种计划产出',
  seed_saving: '种植留种',
  asexual: '无性繁殖',
};

export default function PropagationRecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PropagationRecordWithSource[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // 筛选
  const [seedCodeKeyword, setSeedCodeKeyword] = useState('');
  const [stage, setStage] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 导出模式（与种源管理一致的双层 modal 流程）
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllPropagationRecords({
        stage: stage || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: pageSize,
      });
      let list = res.items;
      if (seedCodeKeyword.trim()) {
        const kw = seedCodeKeyword.trim().toLowerCase();
        list = list.filter((r) => (r.seedCode || '').toLowerCase().includes(kw));
      }
      setRecords(list);
      setTotal(res.total);
    } catch (e) {
      console.error('[繁殖过程记录] 加载失败', e);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [stage, startDate, endDate, seedCodeKeyword, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === 筛选操作（与种源管理一致）===
  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleReset = () => {
    setSeedCodeKeyword('');
    setStage('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // === 导出流程（与种源管理 handleExportClick / handleExportClickConfirm / handleConfirmExport 一致）===
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleExportClickConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的记录');
      return;
    }
    setShowExportModal(true);
  };

  const handleExportCancel = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    const selectedData = records.filter((r) => selectedRows.includes(r.id));

    const headers = [
      '记录日期', '种源批号', '作物名称', '品种', '入库方式', '阶段',
      '温度(℃)', '湿度(%)', '异常', '操作人', '备注',
      '花数', '坐果数', '采收种子数', '种子重量', '采收株数',
      '发芽率(%)', '纯度(%)', '水分(%)', '成活率(%)', '生根率(%)', '嫁接成功率(%)',
    ];

    const exportData = selectedData.map((r) => ({
      '记录日期': r.recordDate,
      '种源批号': r.seedCode,
      '作物名称': r.cropName,
      '品种': r.cropVariety,
      '入库方式': PROPAGATION_TYPE_LABEL[r.propagationType] || r.propagationType,
      '阶段': STAGE_LABEL_MAP[r.stage] || r.stage,
      '温度(℃)': r.temperature ?? '',
      '湿度(%)': r.humidity ?? '',
      '异常': r.abnormality ?? '',
      '操作人': r.operator ?? '',
      '备注': r.remarks ?? '',
      '花数': r.flowerCount ?? '',
      '坐果数': r.fruitSetCount ?? '',
      '采收种子数': r.harvestSeedCount ?? '',
      '种子重量': r.seedWeight ?? '',
      '采收株数': r.harvestPlantCount ?? '',
      '发芽率(%)': r.germinationRate ?? '',
      '纯度(%)': r.purity ?? '',
      '水分(%)': r.moisture ?? '',
      '成活率(%)': r.survivalRate ?? '',
      '生根率(%)': r.rootedRate ?? '',
      '嫁接成功率(%)': r.graftSuccessRate ?? '',
    }));

    const fileName = `繁殖过程记录_${new Date().toISOString().slice(0, 10)}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;

    try {
      if (exportFormat === 'excel') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        ws['!cols'] = headers.map((h) => {
          if (h === '备注' || h === '异常') return { wch: 25 };
          if (h === '种源批号' || h === '作物名称' || h === '品种') return { wch: 18 };
          return { wch: 12 };
        });
        XLSX.utils.book_append_sheet(wb, ws, '繁殖过程记录');
        XLSX.writeFile(wb, fileName);
      } else if (exportFormat === 'csv') {
        const csv = [
          headers.join(','),
          ...exportData.map((row: Record<string, unknown>) =>
            headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
          ),
        ].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Word / 其他：导出 HTML table 兜底（与种源管理一致）
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>繁殖过程记录</title></head><body>
          <table border="1"><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
          ${exportData.map((row: Record<string, unknown>) =>
            `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
          ).join('')}</table></body></html>`;
        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[繁殖过程记录] 导出失败', err);
      showAlert('导出失败：' + (err as Error).message);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 复选框（与种源管理 SeedSourceTable 一致）
  const allCurrentSelected =
    records.length > 0 && records.every((r) => selectedRows.includes(r.id));

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(records.map((r) => r.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleToggleOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, id]);
    } else {
      setSelectedRows(selectedRows.filter((k) => k !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* 标题卡片（1:1 复刻种源管理样式） */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* 返回箭头（在 icon 渐变方块之前） */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/crop/seed-source')}
              className="text-gray-500 hover:text-emerald-600"
              title="返回种源管理"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {/* icon 渐变方块（与种源管理一致：bg-gradient-to-br from-emerald-500 to-green-600） */}
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">繁殖过程记录</h1>
              <p className="text-gray-500">跨种源查看所有繁殖过程记录</p>
            </div>
          </div>
          {/* 右侧操作（与种源管理一致：刷新 + 主操作按钮） */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            {exportMode ? (
              <>
                <Button variant="secondary" size="sm" onClick={handleExportCancel} disabled={loading}>
                  <Download className="w-4 h-4 mr-1" /> 取消导出
                </Button>
                <Button size="sm" onClick={handleExportClickConfirm} disabled={loading}>
                  <Download className="w-4 h-4 mr-1" />
                  确认导出
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleExportClick} disabled={loading}>
                <Download className="w-4 h-4 mr-1" />
                导出 Excel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 筛选区（UI 库标准 FilterBar） */}
      <FilterBar onSearch={handleSearch} onReset={handleReset}>
        <FilterItem label="种源批号">
          <Input
            placeholder="搜索种源批号"
            value={seedCodeKeyword}
            onChange={(e) => setSeedCodeKeyword(e.target.value)}
          />
        </FilterItem>
        <FilterItem label="阶段">
          <Select value={stage || 'all'} onValueChange={(v) => setStage(v === 'all' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="全部阶段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部阶段</SelectItem>
              {STAGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterItem>
        <FilterItem label="开始日期">
          <DatePicker
            className="w-full"
            selected={startDate ? new Date(startDate) : undefined}
            onChange={(d: Date | null) => setStartDate(d ? d.toISOString().slice(0, 10) : '')}
            dateFormat="yyyy-MM-dd"
            placeholderText="不限"
            isClearable
          />
        </FilterItem>
        <FilterItem label="结束日期">
          <DatePicker
            className="w-full"
            selected={endDate ? new Date(endDate) : undefined}
            onChange={(d: Date | null) => setEndDate(d ? d.toISOString().slice(0, 10) : '')}
            dateFormat="yyyy-MM-dd"
            placeholderText="不限"
            isClearable
          />
        </FilterItem>
      </FilterBar>

      {/* 表格卡片（1:1 复刻种源管理：shadow-sm border + overflow-hidden + 列表标题栏） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 列表标题栏（与种源管理 line 215-216 一致） */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">繁殖过程记录列表</h3>
          {exportMode && (
            <span className="text-sm text-gray-600">已选择 {selectedRows.length} 项</span>
          )}
        </div>

        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600">
            <TableRow className="hover:from-blue-500 hover:to-blue-600">
              {exportMode && (
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">序号</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">记录日期</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种源批号</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">入库方式</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">品种</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">阶段</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">温度</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">湿度</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">异常</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">操作人</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">备注</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {loading ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 13 : 12} className="text-center py-8 text-gray-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 13 : 12} className="p-0">
                  <EmptyState
                    type="data"
                    title="暂无繁殖过程记录"
                    description="请先在种源管理页对种源进行过程记录"
                  />
                </TableCell>
              </TableRow>
            ) : (
              records.map((r, idx) => (
                <TableRow key={r.id} className="hover:bg-emerald-50">
                  {exportMode && (
                    <TableCell className="px-4 py-3">
                      <Input
                        type="checkbox"
                        checked={selectedRows.includes(r.id)}
                        onChange={(e) => handleToggleOne(r.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {(page - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.recordDate}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                    {r.seedCode}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    <Badge variant="secondary">
                      {PROPAGATION_TYPE_LABEL[r.propagationType] || r.propagationType || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.cropName || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.cropVariety || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    <Badge variant="info">
                      {STAGE_LABEL_MAP[r.stage] || r.stage || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.temperature ?? '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.humidity ?? '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.abnormality || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.operator || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap max-w-xs truncate" title={r.remarks || ''}>
                    {r.remarks || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页（与种源管理一致：右对齐） */}
      {total > 0 && (
        <div className="flex justify-end">
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* 导出格式选择弹窗（与种源管理 ExportFormatModal 一致） */}
      <ExportFormatModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        selectedCount={selectedRows.length}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
}
