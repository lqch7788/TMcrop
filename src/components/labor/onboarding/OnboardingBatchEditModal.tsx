import React from 'react';
import { Check } from 'lucide-react';

import type { OnboardingRecord, OnboardingStatus, ContractType } from './types';
import { Button, UnifiedModal, Label } from '@/components/ui';
import { useDepartmentStore } from '../../../stores';

interface OnboardingBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: OnboardingRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<OnboardingRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<OnboardingRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const statusOptions: OnboardingStatus[] = ['待入职', '办理中', '已入职'];
const contractTypes: ContractType[] = ['劳动合同', '实习协议', '劳务合同'];

function getDepartmentOptions(): string[] {
  return useDepartmentStore.getState().departments.map(d => d.name);
}

export function OnboardingBatchEditModal({
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
  onConfirmNext,
}: OnboardingBatchEditModalProps) {
  // 当弹窗打开且没有选择记录时，自动选择第一条
  React.useEffect(() => {
    if (isOpen && !selectedRecordId && selectedRows.length > 0) {
      onSelectedRecordIdChange(selectedRows[0]);
    }
  }, [isOpen, selectedRecordId, selectedRows, onSelectedRecordIdChange]);

  if (!isOpen) return null;

  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as OnboardingRecord[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof OnboardingRecord, value: unknown) => {
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
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="批量编辑入职记录" size="xxl" showFooter={false}>
      <div className="flex flex-col">
        {/* Info Banner */}
        <div className="flex items-center gap-4 mb-2">
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
            已选择 {selectedRows.length} 条
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条入职记录进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* Record Selector */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <Label className="text-xs font-medium text-gray-600 mb-1">选择入职记录</Label>
            <select
              value={selectedRecordId}
              onChange={(e) => onSelectedRecordIdChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">请选择记录</option>
              {selectedRecords.map(record => (
                <option key={record.id} value={record.id}>
                  {record.name} - {record.position}
                  {editedRecordIds.includes(record.id) && (
                    <span className="bg-green-100 text-green-700">✅ 已编辑</span>
                  )}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedRecordId && currentRecord && (
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              {/* 姓名 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">姓名</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.name}</div>
              </div>

              {/* 身份证号 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">身份证号</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.idCard}</div>
              </div>

              {/* 联系电话 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">联系电话</div>
                <input
                  type="text"
                  value={editedData.phone ?? currentRecord.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 岗位 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">岗位</div>
                <input
                  type="text"
                  value={editedData.position ?? currentRecord.position}
                  onChange={(e) => handleFieldChange('position', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 部门 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">部门</div>
                <select
                  value={editedData.department ?? currentRecord.department}
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {getDepartmentOptions().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* 合同类型 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">合同类型</div>
                <select
                  value={editedData.contractType ?? currentRecord.contractType}
                  onChange={(e) => handleFieldChange('contractType', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {contractTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* 入职日期 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">入职日期</div>
                <div className="text-sm text-gray-700">{currentRecord.joinDate}</div>
              </div>

              {/* 状态 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">状态</div>
                <select
                  value={editedData.status ?? currentRecord.status}
                  onChange={(e) => handleFieldChange('status', e.target.value as OnboardingStatus)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button onClick={onConfirmNext}><Check className="w-4 h-4" /> 确认（下一个）</Button>
          <Button variant="blue" onClick={onConfirm}><Check className="w-4 h-4" /> 确认保存</Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
