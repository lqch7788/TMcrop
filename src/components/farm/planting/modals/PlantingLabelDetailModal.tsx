/**
 * 种植标签详情弹窗
 * 展示标签列表和标签履历两个标签页
 */
import React, { useState, useMemo } from 'react';
import { X, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Tabs, TabsList, TabsTrigger, TabsContent,
  LabelResumeTimeline, Pagination, Input
} from '../../../ui';
import type { LabelResumeEntry } from '../../../ui/LabelResumeTimeline';
// ========== 数据接口 ==========
export interface PlantLabel {
  id: number;
  labelNumber: string;
  plantingId: number;
  moveInAreaName: string;
  moveInDate: string;
  moveOutAreaName: string;
  moveOutDate: string;
  markName?: string;
  markColor?: string;
}

export interface PlantLabelResume {
  id: number;
  labelId: number;
  operationType: 'move_in' | 'move_out' | 'mark';
  fromAreaName?: string;
  toAreaName?: string;
  markName?: string;
  markColor?: string;
  operationDate: string;
  operatorName?: string;
}

const PAGE_SIZE = 20;

interface PlantingLabelDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 标签列表数据 */
  labels: PlantLabel[];
  /** 标签履历数据（按labelId索引） */
  resumeMap?: Record<number, PlantLabelResume[]>;
}

export default function PlantingLabelDetailModal({
  isOpen,
  onClose,
  labels,
  resumeMap = {}
}: PlantingLabelDetailModalProps) {
  // 搜索状态
  const [searchText, setSearchText] = useState('');
  // 标签列表分页
  const [labelPage, setLabelPage] = useState(1);
  // 标签履历分页
  const [resumePage, setResumePage] = useState(1);
  // 当前选中的标签（用于显示履历）
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);

  // 过滤标签
  const filteredLabels = useMemo(() => {
    if (!searchText) return labels;
    return labels.filter((l) =>
      l.labelNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [labels, searchText]);

  // 标签分页
  const paginatedLabels = useMemo(() => {
    const start = (labelPage - 1) * PAGE_SIZE;
    return filteredLabels.slice(start, start + PAGE_SIZE);
  }, [filteredLabels, labelPage]);

  // 标签分页总数
  const labelTotalPages = Math.max(1, Math.ceil(filteredLabels.length / PAGE_SIZE));

  // 当前标签的履历
  const currentResumes = useMemo(() => {
    if (selectedLabelId === null) return [];
    return resumeMap[selectedLabelId] || [];
  }, [selectedLabelId, resumeMap]);

  // 履历分页
  const paginatedResumes = useMemo(() => {
    const start = (resumePage - 1) * PAGE_SIZE;
    return currentResumes.slice(start, start + PAGE_SIZE);
  }, [currentResumes, resumePage]);

  const resumeTotalPages = Math.max(1, Math.ceil(currentResumes.length / PAGE_SIZE));

  // 搜索变化时重置分页
  const handleSearchChange = (val: string) => {
    setSearchText(val);
    setLabelPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">标签管理详情</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-emerald-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchText}
              onChange={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
              placeholder="搜索二维码ID..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="labels">
            <TabsList>
              <TabsTrigger value="labels">标签列表</TabsTrigger>
              <TabsTrigger value="resume">标签履历</TabsTrigger>
            </TabsList>

            {/* TAB 1: 标签列表 */}
            <TabsContent value="labels">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>二维码ID</TableHead>
                    <TableHead>移入位置</TableHead>
                    <TableHead>移入日期</TableHead>
                    <TableHead>移出位置</TableHead>
                    <TableHead>移出日期</TableHead>
                    <TableHead>标记状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLabels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        暂无标签数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLabels.map((label) => (
                      <TableRow
                        key={label.id}
                        className={`cursor-pointer ${
                          selectedLabelId === label.id ? 'bg-emerald-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedLabelId(label.id);
                          setResumePage(1);
                        }}
                      >
                        <TableCell className="font-mono text-sm">{label.labelNumber}</TableCell>
                        <TableCell>{label.moveInAreaName || '-'}</TableCell>
                        <TableCell>{label.moveInDate || '-'}</TableCell>
                        <TableCell>{label.moveOutAreaName || '-'}</TableCell>
                        <TableCell>{label.moveOutDate || '-'}</TableCell>
                        <TableCell>
                          {label.markName ? (
                            <Badge
                              variant={label.markColor === 'red' ? 'destructive' :
                                       label.markColor === 'yellow' ? 'warning' :
                                       label.markColor === 'blue' ? 'info' : 'success'}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {label.markName}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">未标记</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* 分页 */}
              {filteredLabels.length > 0 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    currentPage={labelPage}
                    totalPages={labelTotalPages}
                    onPageChange={setLabelPage}
                  />
                </div>
              )}
            </TabsContent>

            {/* TAB 2: 标签履历 */}
            <TabsContent value="resume">
              {selectedLabelId === null ? (
                <div className="py-12 text-center text-gray-400">
                  <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>请先在"标签列表"中选中一个标签，查看其履历</p>
                </div>
              ) : currentResumes.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>该标签暂无履历记录</p>
                </div>
              ) : (
                <>
                  {/* 选中的标签信息 */}
                  {(() => {
                    const selLabel = labels.find((l) => l.id === selectedLabelId);
                    return selLabel ? (
                      <div className="mb-4 p-3 bg-emerald-50 rounded-lg flex items-center gap-2">
                        <span className="text-sm font-medium text-emerald-700">
                          标签: {selLabel.labelNumber}
                        </span>
                        {selLabel.markName && (
                          <Badge variant="info">
                            <Tag className="w-3 h-3 mr-1" />
                            {selLabel.markName}
                          </Badge>
                        )}
                      </div>
                    ) : null;
                  })()}

                  <LabelResumeTimeline
                    entries={paginatedResumes.map((r): LabelResumeEntry => ({
                      id: r.id,
                      operationType: r.operationType,
                      fromAreaName: r.fromAreaName,
                      toAreaName: r.toAreaName,
                      operationDate: r.operationDate,
                      markName: r.markName,
                      markColor: r.markColor,
                      operatorName: r.operatorName,
                    }))}
                    currentLabel={(() => {
                      const sel = labels.find((l) => l.id === selectedLabelId);
                      return sel?.labelNumber;
                    })()}
                    currentMark={(() => {
                      const sel = labels.find((l) => l.id === selectedLabelId);
                      return sel?.markName ? { name: sel.markName, color: sel.markColor || '#9ca3af' } : undefined;
                    })()}
                  />

                  {/* 履历分页 */}
                  {currentResumes.length > PAGE_SIZE && (
                    <div className="flex justify-center mt-4">
                      <Pagination
                        currentPage={resumePage}
                        totalPages={resumeTotalPages}
                        onPageChange={setResumePage}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" /> 关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
