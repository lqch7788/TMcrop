/**
 * 人效数据批量编辑弹窗
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Label } from '@/components/ui';
import { EfficiencyMetrics } from './types';

interface EfficiencyBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: EfficiencyMetrics[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<EfficiencyMetrics>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<EfficiencyMetrics>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function EfficiencyBatchEditModal({
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
}: EfficiencyBatchEditModalProps) {
  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as EfficiencyMetrics[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  // 当弹窗打开且没有选择记录时，自动选择第一条
  useEffect(() => {
    if (isOpen && !selectedRecordId && selectedRows.length > 0) {
      onSelectedRecordIdChange(selectedRows[0]);
    }
  }, [isOpen, selectedRecordId, selectedRows, onSelectedRecordIdChange]);

  const handleFieldChange = (field: keyof EfficiencyMetrics, value: unknown) => {
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

  const handleConfirmNext = () => {
    if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
      onEditedRecordIdsChange([...editedRecordIds, selectedRecordId]);
    }
    const currentIndex = selectedRows.findIndex(r => r === selectedRecordId);
    const nextRecord = selectedRows[currentIndex + 1];
    if (nextRecord) {
      onSelectedRecordIdChange(nextRecord);
    } else {
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑人效记录"
      size="lg"
      onSubmit={onConfirm}
      submitText="确认保存"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条人效记录进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* 选择要编辑的记录 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">选择要编辑的记录</Label>
          <select
            value={selectedRecordId}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择...</option>
            {selectedRecords.map((record) => (
              <option key={record.id} value={record.id}>
                {record.date} - {record.department} - 人均产出{record.avgOutputPerWorker.toFixed(1)}
                {editedRecordIds.includes(record.id) && ' ✅ 已编辑'}
              </option>
            ))}
          </select>
        </div>

        {/* 编辑字段 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* 月份 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">月份</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.date}</div>
            </div>

            {/* 部门 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">部门</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.department}</div>
            </div>

            {/* 总人数 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">总人数</div>
              <NumberInput
                value={editedData.totalWorkers ?? currentRecord.totalWorkers ?? ''}
                onChange={(val) => handleFieldChange('totalWorkers', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 总产出 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">总产出</div>
              <NumberInput
                value={editedData.totalOutput ?? currentRecord.totalOutput ?? ''}
                onChange={(val) => handleFieldChange('totalOutput', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 总工时 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">总工时</div>
              <NumberInput
                value={editedData.totalHours ?? currentRecord.totalHours ?? ''}
                onChange={(val) => handleFieldChange('totalHours', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 任务达成率 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">任务达成率</div>
              <NumberInput
                value={editedData.taskCompletionRate ?? currentRecord.taskCompletionRate ?? ''}
                onChange={(val) => handleFieldChange('taskCompletionRate', Number(val))}
                decimals={2}
                className="w-full"
              />
            </div>

            {/* 出勤率 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">出勤率</div>
              <NumberInput
                value={editedData.attendanceRate ?? currentRecord.attendanceRate ?? ''}
                onChange={(val) => handleFieldChange('attendanceRate', Number(val))}
                decimals={2}
                className="w-full"
              />
            </div>

            {/* 人工成本率 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">人工成本率</div>
              <NumberInput
                value={editedData.laborCostRate ?? currentRecord.laborCostRate ?? ''}
                onChange={(val) => handleFieldChange('laborCostRate', Number(val))}
                decimals={2}
                className="w-full"
              />
            </div>

            {/* 技能覆盖率 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">技能覆盖率</div>
              <NumberInput
                value={editedData.skillCoverage ?? currentRecord.skillCoverage ?? ''}
                onChange={(val) => handleFieldChange('skillCoverage', Number(val))}
                decimals={2}
                className="w-full"
              />
            </div>
          </div>
        )}

        {selectedRecords.length > 0 && !selectedRecordId && (
          <p className="text-sm text-amber-600">请选择一条记录进行编辑</p>
        )}
      </div>
    </Modal>
  );
}

export default EfficiencyBatchEditModal;
