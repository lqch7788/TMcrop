/**
 * 农事任务中心 - 操作记录面板
 * 样式与现有弹窗统一
 */

import React, { useState } from 'react';
import { UnifiedOperationRecord } from '../../../hooks/useFarmHub';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const ACTION_TYPE_OPTIONS = [
  { value: 'all', label: '全部操作' },
  ...Object.entries(ACTION_TYPE_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
  })),
];

export function OperationRecordPanel({ records, onClose }: OperationRecordPanelProps) {
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const filteredRecords = records.filter((record) => {
    if (filterType !== 'all' && record.actionType !== filterType) return false;
    if (filterDate && !record.timestamp.startsWith(filterDate)) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            操作记录
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              导出
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">操作类型:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {ACTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">日期:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {(filterType !== 'all' || filterDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterType('all'); setFilterDate(''); }}
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
              {filteredRecords.map((record) => {
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
            <Button variant="ghost" size="sm" disabled>
              上一页
            </Button>
            <span className="px-3 py-1 text-sm">第 1/1 页</span>
            <Button variant="ghost" size="sm" disabled>
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OperationRecordPanel;
