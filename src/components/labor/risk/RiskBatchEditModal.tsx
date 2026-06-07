/**
 * 劳动风险预警批量编辑弹窗
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { RiskAlert } from './types';
import { Label } from '@/components/ui';

interface RiskBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: RiskAlert[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<RiskAlert>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<RiskAlert>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function RiskBatchEditModal({
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
}: RiskBatchEditModalProps) {
  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as RiskAlert[];

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

  const handleFieldChange = (field: keyof RiskAlert, value: unknown) => {
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
      title="批量编辑风险预警"
      size="lg"
      onSubmit={onConfirm}
      submitText="确认保存"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条风险预警进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* 选择要编辑的记录 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">选择要编辑的预警（按预警编号）</Label>
          <select
            value={selectedRecordId}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择...</option>
            {selectedRecords.map((record, index) => {
              const baseDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const alertNumber = `${baseDate}${String(selectedRows.indexOf(record.id) + 1).padStart(3, '0')}`;
              return (
                <option key={record.id} value={record.id}>
                  {alertNumber} - {record.title} - {record.department || record.staffName || '未知'}
                  {editedRecordIds.includes(record.id) && ' ✅ 已编辑'}
                </option>
              );
            })}
          </select>
        </div>

        {/* 编辑字段 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* 预警编号 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">预警编号</div>
              <div className="text-sm font-bold text-emerald-600">
                {(() => {
                  const baseDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                  const idx = selectedRows.indexOf(currentRecord.id);
                  return `${baseDate}${String(idx + 1).padStart(3, '0')}`;
                })()}
              </div>
            </div>

            {/* 预警标题 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3 col-span-2">
              <div className="text-xs text-gray-500 mb-1">预警标题</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.title}</div>
            </div>

            {/* 状态 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <select
                value={editedData.status ?? currentRecord.status ?? ''}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="pending">待处理</option>
                <option value="handled">已处理</option>
              </select>
            </div>

            {/* 处理人 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">处理人</div>
              <input
                type="text"
                value={editedData.handler ?? currentRecord.handler ?? ''}
                onChange={(e) => handleFieldChange('handler', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                placeholder="请输入处理人"
              />
            </div>

            {/* 处理备注 - 可编辑 */}
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">处理备注</div>
              <input
                type="text"
                value={editedData.remarks ?? currentRecord.remarks ?? ''}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                placeholder="请输入备注"
              />
            </div>
          </div>
        )}

        {selectedRecords.length > 0 && !selectedRecordId && (
          <p className="text-sm text-amber-600">请选择一个预警进行编辑</p>
        )}
      </div>
    </Modal>
  );
}

export default RiskBatchEditModal;
