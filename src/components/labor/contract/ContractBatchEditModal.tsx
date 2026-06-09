import React from 'react';
import { Check, X } from 'lucide-react';
import type { Contract, ContractStatus, ContractType } from './types';
import { Button, UnifiedModal, NumberInput, DatePicker, Label } from '@/components/ui';

interface ContractBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: Contract[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<Contract>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<Contract>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const statusOptions: ContractStatus[] = ['生效中', '即将到期', '已到期', '已终止'];
const contractTypes: ContractType[] = ['劳动合同', '实习协议', '劳务合同'];

export function ContractBatchEditModal({
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
}: ContractBatchEditModalProps) {
  // 当弹窗打开且没有选择记录时，自动选择第一条
  React.useEffect(() => {
    if (isOpen && !selectedRecordId && selectedRows.length > 0) {
      onSelectedRecordIdChange(selectedRows[0]);
    }
  }, [isOpen, selectedRecordId, selectedRows, onSelectedRecordIdChange]);

  if (!isOpen) return null;

  const selectedContracts = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as Contract[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof Contract, value: unknown) => {
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
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="批量编辑合同" size="xxl" showFooter={false}>
      <div className="flex flex-col">
        {/* Info Banner */}
        <div className="flex items-center gap-4 mb-2">
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
            已选择 {selectedRows.length} 条
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条合同进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* Record Selector */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <Label className="block text-xs font-medium text-gray-600 mb-1">选择合同记录</Label>
            <select
              value={selectedRecordId}
              onChange={(e) => onSelectedRecordIdChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">请选择记录</option>
              {selectedContracts.map(record => (
                <option key={record.id} value={record.id}>
                  {record.contractCode} - {record.staffName}
                  {editedRecordIds.includes(record.id) && ' - 已编辑'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-4 gap-3">
            {/* 合同编号 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">合同编号</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.contractCode}</div>
            </div>

            {/* 员工姓名 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">员工姓名</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.staffName}</div>
            </div>

            {/* 身份证号 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">身份证号</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.idCard}</div>
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

            {/* 开始日期 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">开始日期</div>
              <div className="text-sm text-gray-700">{currentRecord.startDate}</div>
            </div>

            {/* 结束日期 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">结束日期</div>
              <div className="text-sm text-gray-700">{currentRecord.endDate}</div>
            </div>

            {/* 状态 - 不可编辑（根据日期自动计算） */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <div className="text-sm text-gray-700">根据日期自动计算</div>
            </div>

            {/* 月薪 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">月薪</div>
              <NumberInput
                value={editedData.monthlySalary ?? currentRecord.monthlySalary}
                onChange={(val) => handleFieldChange('monthlySalary', Number(val))}
                placeholder="0"
                decimals={2}
              />
            </div>

            {/* 日工资 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">日工资</div>
              <NumberInput
                value={editedData.dailyWage ?? currentRecord.dailyWage}
                onChange={(val) => handleFieldChange('dailyWage', Number(val))}
                placeholder="0"
                decimals={2}
              />
            </div>

            {/* 签订日期 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">签订日期</div>
              <DatePicker
                selected={(editedData.signingDate ?? currentRecord.signingDate)
                  ? new Date(editedData.signingDate ?? currentRecord.signingDate ?? '')
                  : undefined}
                onChange={(date: Date) => handleFieldChange('signingDate', date.toISOString().slice(0, 10))}
                placeholder="选择日期"
              />
            </div>

            {/* 备注 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2 col-span-2">
              <div className="text-xs text-gray-500 mb-1">备注</div>
              <input
                type="text"
                value={editedData.remarks ?? currentRecord.remarks ?? ''}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button onClick={onConfirmNext}>
            <Check className="w-4 h-4" /> 确认（下一个）
          </Button>
          <Button variant="blue" onClick={onConfirm}>
            <Check className="w-4 h-4" /> 确认保存
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
