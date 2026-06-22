/**
 * 育苗标签管理弹窗
 * 对标 iAGS seedlingManagement.ejs 第577-770行 + 第1654-1706行
 * 标签列表 + 标签履历时间线 + 标签数据导出(1000/2000/全部)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search, Tag, Download, Plus, ArrowRight, ArrowLeft, MapPin, Stamp, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui';
import { LabelResumeTimeline, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '../../../ui';
import type { LabelResumeEntry } from '../../../ui/LabelResumeTimeline';
import { usePlantLabelStore } from '../../../../stores';
import type { PlantLabel, PlantLabelResume } from '../../../../stores/usePlantLabelStore';
import { Input } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { enhancedApiClient } from '@/lib/apiClient';
import { useAuthStore } from '../../../../stores/useAuthStore';

// 标记选项（与后端 plant_marks 默认数据一致）
const MARK_OPTIONS = [
  { id: 1, name: '正常', color: '#22c55e' },
  { id: 2, name: '关注', color: '#f59e0b' },
  { id: 3, name: '问题', color: '#ef4444' },
  { id: 4, name: '优质', color: '#3b82f6' },
];

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

  // ========== 新增履历表单（行内表单，无独立 Modal） ==========
  const [showAddResume, setShowAddResume] = useState(false);
  const [addOpType, setAddOpType] = useState<'move_in' | 'move_out' | 'mark'>('move_in');
  const [addOpDate, setAddOpDate] = useState(todayLocal());
  const [addAreaName, setAddAreaName] = useState('');
  const [addMarkId, setAddMarkId] = useState<number>(2);
  const [addRemarks, setAddRemarks] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  // 2026-06-22: 履历现场拍照（Base64 内嵌）
  const [addPhotoBase64, setAddPhotoBase64] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // 选择图片 → FileReader → Base64 预览
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showAlert('图片不能超过 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAddPhotoBase64((ev.target?.result as string) || null);
    reader.readAsDataURL(file);
    e.target.value = ''; // 允许选同一张图
  };

  // 切换标签时收起表单
  useEffect(() => {
    setShowAddResume(false);
  }, [selectedLabelId]);

  const handleSubmitResume = async () => {
    if (!selectedLabelId) { showAlert('请先选择左侧标签'); return; }
    if (addOpType !== 'mark' && !addAreaName.trim()) { showAlert('请输入区域名称'); return; }
    setAddSubmitting(true);
    try {
      const operatorName =
        useAuthStore.getState().currentUser?.realName ||
        useAuthStore.getState().currentUser?.username ||
        'system';

      if (addOpType === 'mark') {
        // 打标记（后端 mark 接口只接 mark_id + label_ids）
        const res: any = await enhancedApiClient.post('/plant-labels/marks/assign', {
          mark_id: addMarkId,
          label_ids: [selectedLabelId],
        });
        const ok = res?.success !== false; // apiClient 已解包，res 可能是数据或 {success, data}
        if (ok) {
          await loadResumesForLabels([selectedLabelId]);
          setShowAddResume(false);
          setAddAreaName('');
          setAddRemarks('');
        } else {
          showAlert('标记失败：' + (res?.error || '未知错误'));
        }
      } else {
        // 移入/移出
        const res: any = await enhancedApiClient.post(`/plant-labels/${selectedLabelId}/resumes`, {
          operation_type: addOpType,
          to_area_name: addAreaName.trim(),
          operation_date: addOpDate,
          operator_name: operatorName,
          remarks: addRemarks.trim() || null,
          image_base64: addPhotoBase64,
        });
        const ok = res?.success !== false;
        if (ok) {
          await loadResumesForLabels([selectedLabelId]);
          setShowAddResume(false);
          setAddAreaName('');
          setAddRemarks('');
          setAddPhotoBase64(null);
        } else {
          showAlert('录入失败：' + (res?.error || '未知错误'));
        }
      }
    } catch (e) {
      showAlert('网络错误：' + (e as Error).message);
    } finally {
      setAddSubmitting(false);
    }
  };

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
                  imageBase64: r.imageBase64 || undefined,
                }))}
                currentLabel={selectedLabel?.labelNumber}
                currentMark={undefined}
              />
            )}
          </div>
        </div>

        {/* 新增履历行内表单（B 方案补的录入入口） */}
        {showAddResume && (
          <div className="px-4 py-3 border-t border-emerald-200 bg-emerald-50 flex-shrink-0">
            <div className="text-xs font-semibold text-emerald-900 mb-2">
              新增履历 — 当前标签：{selectedLabel?.labelNumber || '-'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* 操作类型 Tab */}
              {([
                { v: 'move_in', label: '移入', icon: <ArrowRight className="w-3 h-3" />, cls: 'bg-emerald-100 text-emerald-700' },
                { v: 'move_out', label: '移出', icon: <ArrowLeft className="w-3 h-3" />, cls: 'bg-orange-100 text-orange-700' },
                { v: 'mark', label: '打标记', icon: <Stamp className="w-3 h-3" />, cls: 'bg-purple-100 text-purple-700' },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setAddOpType(opt.v)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    addOpType === opt.v ? opt.cls + ' ring-2 ring-offset-1 ring-emerald-400' : 'bg-white text-gray-600 border border-gray-300'
                  }`}
                >
                  {opt.icon}{opt.label}
                </button>
              ))}
              {/* 日期 */}
              <Input
                type="date"
                value={addOpDate}
                onChange={(e) => setAddOpDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs h-7"
              />
              {/* 区域输入（移入/移出用）*/}
              {addOpType !== 'mark' && (
                <Input
                  type="text"
                  value={addAreaName}
                  onChange={(e) => setAddAreaName(e.target.value)}
                  placeholder={addOpType === 'move_in' ? '移入到哪个区域（如：东区-A区）' : '移出到哪个区域（如：隔离区）'}
                  className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-48"
                />
              )}
              {/* 标记选择 */}
              {addOpType === 'mark' && (
                <div className="flex gap-1">
                  {MARK_OPTIONS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAddMarkId(m.id)}
                      className={`px-2 py-1 rounded text-xs font-medium text-white ${
                        addMarkId === m.id ? 'ring-2 ring-offset-1 ring-emerald-400' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
              {/* 备注 */}
              <Input
                type="text"
                value={addRemarks}
                onChange={(e) => setAddRemarks(e.target.value)}
                placeholder="备注（可选）"
                className="px-2 py-1 border border-gray-300 rounded text-xs h-7 flex-1 min-w-[160px]"
              />
              {/* 拍照按钮（移动端会调起相机，PC 端是文件选择器） */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                onClick={() => photoInputRef.current?.click()}
                variant="outline"
                size="sm"
                title="拍照/选择图片"
              >
                <Camera className="w-4 h-4" />
                {addPhotoBase64 ? '已附图' : '拍照'}
              </Button>
              <Button onClick={handleSubmitResume} disabled={addSubmitting} size="sm">
                {addSubmitting ? '提交中...' : '确认'}
              </Button>
              <Button onClick={() => { setShowAddResume(false); setAddPhotoBase64(null); }} variant="secondary" size="sm">
                取消
              </Button>
            </div>
            {/* 图片预览 */}
            {addPhotoBase64 && (
              <div className="mt-2 flex items-center gap-2">
                <img src={addPhotoBase64} alt="预览" className="w-16 h-16 object-cover rounded border border-gray-300" />
                <button
                  type="button"
                  onClick={() => setAddPhotoBase64(null)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  删除图片
                </button>
              </div>
            )}
          </div>
        )}

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-gray-400">
            共 {filteredLabels.length} 个标签
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddResume((v) => !v)}
              disabled={!selectedLabelId}
              variant="default"
              size="sm"
              title={!selectedLabelId ? '请先在左侧选择一个标签' : '为当前标签新增履历'}
            >
              <Plus className="w-4 h-4" /> 新增履历
            </Button>
            <Button onClick={onClose} variant="secondary" size="sm">
              <X className="w-4 h-4" /> 关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
