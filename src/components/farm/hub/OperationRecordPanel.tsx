/**
 * 农事任务中心 - 操作记录面板
 * 样式与现有弹窗统一
 */

import React, { useState } from 'react';
import { UnifiedOperationRecord } from '../../../hooks/useFarmHub';
import { exportTaskRecords } from '../../../services/apiFarmTaskService';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface OperationRecordPanelProps {
  records: UnifiedOperationRecord[];
  onClose: () => void;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  create: { label: '创建', color: 'bg-blue-100 text-blue-700' },
  assign: { label: '分派', color: 'bg-purple-100 text-purple-700' },
  accept: { label: '接受', color: 'bg-green-100 text-green-700' },
  reject: { label: '拒绝', color: 'bg-red-100 text-red-700' },
  progress: { label: '进度', color: 'bg-orange-100 text-orange-700' },
  submit: { label: '提交', color: 'bg-cyan-100 text-cyan-700' },
  verify: { label: '验收', color: 'bg-teal-100 text-teal-700' },
  report: { label: '上报', color: 'bg-yellow-100 text-yellow-700' },
  inspect: { label: '巡查', color: 'bg-indigo-100 text-indigo-700' },
};

// 操作类型中文映射（用于导出）
const ACTION_TYPE_LABELS: Record<string, string> = {
  create: '创建',
  assign: '分派',
  accept: '接受',
  reject: '拒绝',
  progress: '进度更新',
  submit: '提交',
  verify: '验收',
  report: '上报',
  inspect: '巡查',
  withdraw: '撤回',
  overtime_continue: '超时继续',
  overtime_abandon: '超时放弃',
  extend_deadline: '延期',
  reassign: '重新分派',
  cancel: '取消',
  abandon: '放弃',
};

// 状态中文映射（用于导出）
const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待接受',
  in_progress: '进行中',
  waiting_acceptance: '待验收',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已驳回',
  pending_reassign: '待重新派发',
  published: '已发布',
  withdrawn: '已撤回',
  accepted: '已接受',
  overtime: '超时',
};

const ACTION_TYPE_OPTIONS = [
  { value: 'all', label: '全部操作' },
  ...Object.entries(ACTION_TYPE_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
  })),
];

/**
 * 导出任务操作记录到文件
 */
async function handleExportTaskRecords(format: 'xlsx' | 'csv' | 'xls') {
  try {
    const data = await exportTaskRecords();

    const headers = ['任务编号', '任务标题', '操作人', '操作类型', '操作名称', '原状态', '新状态', '进度', '备注', '原因', '操作时间', '创建时间'];
    const exportData = (data || []).map((record: any) => ({
      '任务编号': record.task_code || '',
      '任务标题': record.task_title || '',
      '操作人': record.operator_name || '',
      '操作类型': ACTION_TYPE_LABELS[record.action] || record.action || '',
      '操作名称': record.action_name || '',
      '原状态': STATUS_LABELS[record.from_status] || record.from_status || '',
      '新状态': STATUS_LABELS[record.to_status] || record.to_status || '',
      '进度': record.progress !== null ? `${record.progress}%` : '',
      '备注': record.comment || '',
      '原因': record.reason || '',
      '操作时间': record.action_time || '',
      '创建时间': record.create_time || '',
    }));

    let content = '';
    let mimeType = '';
    let extension = format;

    if (format === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
    } else {
      // Excel 格式
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    }

    const fileName = `任务操作记录_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob(['﻿' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // logger.info('[导出] 任务操作记录导出成功，共', exportData.length, '条');
  } catch (error) {
    // logger.error('[导出] 任务操作记录导出失败:', error);
  }
}

export function OperationRecordPanel({ records, onClose }: OperationRecordPanelProps) {
  const [filterType, setFilterType] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 筛选后的记录
  const filteredRecords = records.filter((record) => {
    if (filterType !== 'all' && record.actionType !== filterType) return false;
    // 时间段筛选
    if (filterStartDate && record.timestamp < filterStartDate) return false;
    if (filterEndDate) {
      const endDateWithTime = filterEndDate + 'T23:59:59';
      if (record.timestamp > endDateWithTime) return false;
    }
    return true;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 重置页码当筛选变化时
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // 筛选变化时重置页码
  const handleFilterTypeChange = (val: string) => {
    setFilterType(val);
    setCurrentPage(1);
  };

  const handleFilterStartDateChange = (val: string) => {
    setFilterStartDate(val);
    setCurrentPage(1);
  };

  const handleFilterEndDateChange = (val: string) => {
    setFilterEndDate(val);
    setCurrentPage(1);
  };

  const handleExport = (format: 'xlsx' | 'csv' | 'xls') => {
    // 只导出任务操作记录（操作日志在系统设置的操作日志页面导出）
    handleExportTaskRecords(format);
    setExportMenuOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            操作记录
          </h2>
          <div className="flex items-center gap-2 relative">
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
            {/* 导出菜单 */}
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => handleExport('xlsx')}
                >
                  导出为 Excel
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => handleExport('csv')}
                >
                  导出为 CSV
                </button>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">操作类型:</span>
            <Select
              value={filterType}
              onValueChange={handleFilterTypeChange}
            >
              <SelectTrigger className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-auto">
                <SelectValue placeholder="全部操作" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">时间段:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => handleFilterStartDateChange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="开始日期"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => handleFilterEndDateChange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="结束日期"
            />
          </div>
          {(filterType !== 'all' || filterStartDate || filterEndDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterType('all'); setFilterStartDate(''); setFilterEndDate(''); }}
            >
              重置
            </Button>
          )}
        </div>

        {/* 记录列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>暂无操作记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedRecords.map((record) => {
                const actionConfig = ACTION_TYPE_CONFIG[record.actionType] || { label: record.actionType, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xs text-gray-400 whitespace-nowrap min-w-[60px]">
                      {new Date(record.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${record.operatorType === 'system' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {record.operatorType === 'system' ? '系统' : record.operatorName}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${actionConfig.color}`}>
                      {actionConfig.label}
                    </span>
                    <span className="text-sm text-gray-600 flex-1">{record.content}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">共 {filteredRecords.length} 条记录</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              上一页
            </Button>
            <span className="px-3 py-1 text-sm">第 {currentPage}/{totalPages} 页</span>
            <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OperationRecordPanel;
