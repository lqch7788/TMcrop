/**
 * 育苗标签管理弹窗
 * 对标 iAGS seedlingManagement.ejs 第577-770行 + 第1654-1706行
 * 标签列表 + 标签履历时间线 + 标签数据导出(1000/2000/全部)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search, Tag, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { LabelResumeTimeline, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '../../../ui';
import type { LabelResumeEntry } from '../../../ui/LabelResumeTimeline';
import { usePlantLabelStore } from '../../../../stores';
import type { PlantLabel, PlantLabelResume } from '../../../../stores/usePlantLabelStore';
import { Input } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

const PAGE_SIZE = 20;
const EXPORT_SIZES = [1000, 2000, 0]; // 0 = 全部

interface SeedlingLabelManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedlingId: string;
  seedlingCode: string;
}

export default function SeedlingLabelManageModal({
  isOpen,
  onClose,
  seedlingId,
  seedlingCode,
}: SeedlingLabelManageModalProps) {
  const { labels, labelsLoading, resumeMap, resumeLoading, loadLabels, loadResumesForLabels } = usePlantLabelStore();

  const [searchText, setSearchText] = useState('');
  const [labelPage, setLabelPage] = useState(1);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);

  // 加载标签数据 — P1: 传 seedlingId 给后端直接过滤（避免前端分页漏数据）
  useEffect(() => {
    if (isOpen && seedlingId) {
      loadLabels({ seedlingId });
    }
  }, [isOpen, seedlingId, loadLabels]);

  // 标签列表已是后端按 seedlingId 过滤后的结果，直接使用
  const seedlingLabels = labels;

  // 搜索过滤
  const filteredLabels = useMemo(() => {
    if (!searchText) return seedlingLabels;
    return seedlingLabels.filter((l) =>
      l.labelNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [seedlingLabels, searchText]);

  // 分页
  const paginatedLabels = useMemo(() => {
    const start = (labelPage - 1) * PAGE_SIZE;
    return filteredLabels.slice(start, start + PAGE_SIZE);
  }, [filteredLabels, labelPage]);

  const labelTotalPages = Math.max(1, Math.ceil(filteredLabels.length / PAGE_SIZE));

  // 选中标签的履历
  const selectedResumes = useMemo(() => {
    if (selectedLabelId === null) return [];
    return resumeMap[selectedLabelId] || [];
  }, [selectedLabelId, resumeMap]);

  // 选中标签时加载履历
  const handleSelectLabel = useCallback(async (labelId: number) => {
    setSelectedLabelId(labelId);
    await loadResumesForLabels([labelId]);
  }, [loadResumesForLabels]);

  // 导出标签数据
  const handleExport = useCallback((size: number) => {
    const toExport = size === 0 ? filteredLabels : filteredLabels.slice(0, size);
    if (toExport.length === 0) { showAlert('无数据可导出'); return; }

    const headers = ['标签编号', '移入位置', '移入日期', '移出位置', '移出日期', '创建时间'];
    const rows = toExport.map((l) => [
      l.labelNumber,
      l.moveInAreaName || '',
      l.moveInDate || '',
      l.moveOutAreaName || '',
      l.moveOutDate || '',
      l.createTime || '',
    ]);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>育苗标签数据</title>
<style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 10px}th{background:#059669;color:#fff}</style>
</head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;

    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `育苗标签_${seedlingCode}_${todayLocal()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLabels, seedlingCode]);

  if (!isOpen) return null;

  const selectedLabel = seedlingLabels.find((l) => l.id === selectedLabelId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-xl max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">
            育苗标签管理 - {seedlingCode}
          </h3>
          <Button onClick={onClose} variant="ghost" size="icon" className="text-white hover:bg-emerald-700">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 工具栏: 搜索 + 导出 */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setLabelPage(1); }}
              placeholder="搜索标签编号..."
              className="pl-9 pr-3 py-2 border border-gray-400 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">导出:</span>
            {EXPORT_SIZES.map((size) => (
              <Button
                key={size}
                onClick={() => handleExport(size)}
                variant="outline"
                size="sm"
                className="text-xs hover:bg-emerald-50 hover:border-emerald-300"
              >
                <Download className="w-4 h-4" />
                {size === 0 ? '全部' : `${size}条`}
              </Button>
            ))}
          </div>
        </div>

        {/* 主体：左侧标签列表 + 右侧履历时间线 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：标签列表 */}
          <div className="w-2/5 border-r border-gray-200 overflow-y-auto">
            {labelsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredLabels.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Tag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">暂无标签数据</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead className="px-3 py-2 text-xs">标签编号</TableHead>
                      <TableHead className="px-3 py-2 text-xs">移入位置</TableHead>
                      <TableHead className="px-3 py-2 text-xs">移入日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {paginatedLabels.map((label) => (
                      <TableRow
                        key={label.id}
                        className={`cursor-pointer ${
                          selectedLabelId === label.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''
                        }`}
                        onClick={() => handleSelectLabel(label.id)}
                      >
                        <TableCell className="px-3 py-2 font-mono text-xs">{label.labelNumber}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-gray-600">{label.moveInAreaName || '-'}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-gray-600">{label.moveInDate || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* 分页 */}
                {labelTotalPages > 1 && (
                  <div className="flex justify-center p-3 border-t">
                    <Pagination
                      currentPage={labelPage}
                      totalPages={labelTotalPages}
                      onPageChange={setLabelPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 右侧：标签履历时间线 */}
          <div className="w-3/5 overflow-y-auto p-4">
            {selectedLabelId === null ? (
              <div className="py-12 text-center text-gray-400">
                <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>请在左侧选择一个标签查看履历</p>
              </div>
            ) : resumeLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <LabelResumeTimeline
                entries={selectedResumes.map((r): LabelResumeEntry => ({
                  id: r.id,
                  operationType: r.operationType,
                  fromAreaName: r.fromAreaName || undefined,
                  toAreaName: r.toAreaName || undefined,
                  operationDate: r.operationDate,
                  markName: r.markName || undefined,
                  markColor: r.markColor || undefined,
                  operatorName: r.operatorName || undefined,
                }))}
                currentLabel={selectedLabel?.labelNumber}
                currentMark={undefined}
              />
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-gray-400">
            共 {filteredLabels.length} 个标签
          </span>
          <Button onClick={onClose} variant="secondary" size="sm">
            <X className="w-4 h-4" /> 关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
