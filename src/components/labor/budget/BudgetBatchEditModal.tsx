import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NumberInput, Label } from '@/components/ui';
import type { MonthlyBudget } from '../types';

interface BudgetBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: MonthlyBudget[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<MonthlyBudget>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<MonthlyBudget>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function BudgetBatchEditModal({
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
}: BudgetBatchEditModalProps) {
  const selectedRecords = selectedRows
    .map(id => records.find(r => r.month === id))
    .filter(Boolean) as MonthlyBudget[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.month === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  // 当弹窗打开且没有选择记录时，自动选择第一条
  useEffect(() => {
    if (isOpen && !selectedRecordId && selectedRows.length > 0) {
      onSelectedRecordIdChange(selectedRows[0]);
    }
  }, [isOpen, selectedRecordId, selectedRows, onSelectedRecordIdChange]);

  const handleFieldChange = (field: keyof MonthlyBudget, value: unknown) => {
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
      title="批量编辑月度预算"
      size="lg"
      onSubmit={onConfirm}
      submitText="确认保存"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条月度预算进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* 选择要编辑的记录 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">选择要编辑的月份</Label>
          <select
            value={selectedRecordId}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择...</option>
            {selectedRecords.map((record) => (
              <option key={record.month} value={record.month}>
                {record.month} - 总成本{(record.laborCost / 10000).toFixed(2)}万元
                {editedRecordIds.includes(record.month) && ' ✅ 已编辑'}
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
              <div className="text-sm font-medium text-gray-900">{currentRecord.month}</div>
            </div>

            {/* 用工人数 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">用工人数</div>
              <NumberInput
                value={editedData.headcount ?? currentRecord.headcount}
                onChange={(val) => handleFieldChange('headcount', Number(val))}
                placeholder="0"
                decimals={0}
              />
            </div>

            {/* 预计采收量 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">预计采收量(万斤)</div>
              <NumberInput
                value={editedData.yieldPrediction !== undefined
                  ? (editedData.yieldPrediction / 10000)
                  : (currentRecord.yieldPrediction / 10000)}
                onChange={(val) => handleFieldChange('yieldPrediction', Number(val) * 10000)}
                placeholder="0"
                decimals={2}
              />
            </div>

            {/* 总成本 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">总成本(万元)</div>
              <div className="text-sm font-medium text-emerald-600">
                {(currentRecord.laborCost / 10000).toFixed(2)}
              </div>
            </div>

            {/* 正式工成本 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">正式工成本(万元)</div>
              <div className="text-sm font-medium text-gray-700">
                {(currentRecord.formalWorkerCost / 10000).toFixed(2)}
              </div>
            </div>

            {/* 临时工成本 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">临时工成本(万元)</div>
              <div className="text-sm font-medium text-gray-700">
                {(currentRecord.tempWorkerCost / 10000).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {selectedRecords.length > 0 && !selectedRecordId && (
          <p className="text-sm text-amber-600">请选择一个月份进行编辑</p>
        )}
      </div>
    </Modal>
  );
}

export default BudgetBatchEditModal;