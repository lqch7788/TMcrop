/**
 * 月报批量编辑弹窗
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NumberInput, Label } from '@/components/ui';
import { MonthlyReport } from './types';

interface MonthlyReportBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: MonthlyReport[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<MonthlyReport>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<MonthlyReport>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function MonthlyReportBatchEditModal({
  isOpen,
  selectedRows,
  records,
  editedRecordIds,
  editedRecords,
  selectedRecordId,
  onSelectedRecordIdChange,
  onEditedRecordsChange,
  onEditedRecordIdsChange,
  onClose,
  onConfirm,
}: MonthlyReportBatchEditModalProps) {
  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id.toString() === id))
    .filter(Boolean) as MonthlyReport[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id.toString() === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  // 当弹窗打开且没有选择记录时，自动选择第一条
  useEffect(() => {
    if (isOpen && !selectedRecordId && selectedRows.length > 0) {
      onSelectedRecordIdChange(selectedRows[0]);
    }
  }, [isOpen, selectedRecordId, selectedRows, onSelectedRecordIdChange]);

  const handleFieldChange = (field: keyof MonthlyReport, value: unknown) => {
    if (!selectedRecordId) return;
    const updated = {
      ...editedRecords,
      [selectedRecordId]: { ...editedRecords[selectedRecordId], [field]: value },
    };
    onEditedRecordsChange(updated);
    if (!editedRecordIds.includes(selectedRecordId)) {
      onEditedRecordIdsChange([...editedRecordIds, selectedRecordId]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑月报"
      size="lg"
      onSubmit={onConfirm}
      submitText="确认保存"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条月报进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* 选择要编辑的记录 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">选择要编辑的月报（按报表编号）</Label>
          <select
            value={selectedRecordId}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择...</option>
            {selectedRecords.map((record) => (
              <option key={record.id} value={record.id}>
                {record.code} - {record.month} - {record.dept}
                {editedRecordIds.includes(record.id.toString()) && ' ✅ 已编辑'}
              </option>
            ))}
          </select>
        </div>

        {/* 编辑字段 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* 报表编号 - 只读，突出显示 */}
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <div className="text-xs text-emerald-600 mb-1">报表编号</div>
              <div className="text-sm font-bold text-emerald-700">{currentRecord.code}</div>
            </div>

            {/* 月份 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">月份</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.month}</div>
            </div>

            {/* 部门 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">部门</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.dept}</div>
            </div>

            {/* 已完成任务 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">已完成任务</div>
              <NumberInput
                value={editedData.completedTasks ?? currentRecord.completedTasks}
                onChange={(val) => handleFieldChange('completedTasks', Number(val))}
                placeholder="0"
                decimals={0}
              />
            </div>

            {/* 待办任务 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">待办任务</div>
              <NumberInput
                value={editedData.pendingTasks ?? currentRecord.pendingTasks}
                onChange={(val) => handleFieldChange('pendingTasks', Number(val))}
                placeholder="0"
                decimals={0}
              />
            </div>

            {/* 质量率 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">质量率</div>
              <input
                type="text"
                value={(editedData.qualityRate ?? currentRecord.qualityRate) as string}
                onChange={(e) => handleFieldChange('qualityRate', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 考勤率 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">考勤率</div>
              <input
                type="text"
                value={(editedData.attendanceRate ?? currentRecord.attendanceRate) as string}
                onChange={(e) => handleFieldChange('attendanceRate', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 状态 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <select
                value={(editedData.status ?? currentRecord.status) as string}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="草稿">草稿</option>
                <option value="已发布">已发布</option>
              </select>
            </div>
          </div>
        )}

        {selectedRecords.length > 0 && !selectedRecordId && (
          <p className="text-sm text-amber-600">请选择一个记录进行编辑</p>
        )}
      </div>
    </Modal>
  );
}

export default MonthlyReportBatchEditModal;
