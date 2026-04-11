import { useState, useEffect } from 'react';
import { Modal } from '../../../ui/Modal';
import { Pencil } from 'lucide-react';
import { SalaryRecord } from '../types';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: SalaryRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<SalaryRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<SalaryRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  departments?: string[];
}

export function BatchEditModal({
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
}: BatchEditModalProps) {
  const [localEditedRecords, setLocalEditedRecords] = useState<Record<string, Partial<SalaryRecord>>>({});

  useEffect(() => {
    if (isOpen) {
      setLocalEditedRecords({ ...editedRecords });
    }
  }, [isOpen, editedRecords]);

  const selectedRecords = selectedRows
    .map((id) => records.find((r) => r.id === id))
    .filter((r): r is SalaryRecord => !!r);

  const handleFieldChange = (field: keyof SalaryRecord, value: unknown) => {
    if (!selectedRecordId) return;
    const updated = {
      ...localEditedRecords,
      [selectedRecordId]: {
        ...localEditedRecords[selectedRecordId],
        [field]: value,
      },
    };
    setLocalEditedRecords(updated);
  };

  const handleConfirm = () => {
    onEditedRecordsChange(localEditedRecords);
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑工资记录"
      size="lg"
      onSubmit={handleConfirm}
      submitText="确认保存"
      cancelText="取消"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">已选择 {selectedRows.length} 条工资记录</p>

        {/* 选择要编辑的记录 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择要编辑的记录</label>
          <select
            value={selectedRecordId}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择...</option>
            {selectedRecords.map((record) => (
              <option key={record.id} value={record.id}>
                {record.staffName} - {record.month} - {record.netSalary}元
              </option>
            ))}
          </select>
        </div>

        {/* 编辑字段 */}
        {selectedRecordId && localEditedRecords[selectedRecordId] && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs text-gray-500 mb-1">基本工资</label>
              <input
                type="number"
                value={localEditedRecords[selectedRecordId].baseSalary ?? ''}
                onChange={(e) => handleFieldChange('baseSalary', Number(e.target.value))}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">加班费</label>
              <input
                type="number"
                value={localEditedRecords[selectedRecordId].overtimePay ?? ''}
                onChange={(e) => handleFieldChange('overtimePay', Number(e.target.value))}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">奖金</label>
              <input
                type="number"
                value={localEditedRecords[selectedRecordId].bonuses ?? ''}
                onChange={(e) => handleFieldChange('bonuses', Number(e.target.value))}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">扣款</label>
              <input
                type="number"
                value={localEditedRecords[selectedRecordId].deductions ?? ''}
                onChange={(e) => handleFieldChange('deductions', Number(e.target.value))}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select
                value={localEditedRecords[selectedRecordId].status ?? ''}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择...</option>
                <option value="待确认">待确认</option>
                <option value="已确认">已确认</option>
                <option value="已发放">已发放</option>
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