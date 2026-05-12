import { Modal, FormField, Input, Select } from '../../../ui/Modal';
import { Button } from '@/components/ui/button';
import { AttendanceRecord } from '../types';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  records: AttendanceRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<AttendanceRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<AttendanceRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext?: () => void;
  departments: string[];
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
  onConfirmNext,
  departments,
}: BatchEditModalProps) {
  const selectedRecords = selectedRows.map(index => records[index]).filter(Boolean) as AttendanceRecord[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof AttendanceRecord, value: unknown) => {
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
      title="批量编辑考勤记录"
      size="xxl"
      onSubmit={onConfirm}
      submitText="保存修改"
      cancelText="取消"
      footer={
        <div className="flex items-center justify-end gap-3">
          {onConfirmNext && (
            <Button onClick={onConfirmNext}>
              确认（下一个）
            </Button>
          )}
          <Button onClick={onClose} variant="outline">
            取消
          </Button>
          <Button onClick={onConfirm}>
            保存修改
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条记录进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        <FormField label="选择记录">
          <Select
            value={selectedRecordId || ''}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            options={[
              { value: '', label: '请选择记录' },
              ...selectedRecords.map(r => ({
                value: r.id.toString(),
                label: `${r.workerId} - ${r.name} - ${r.date} ${
                  editedRecordIds.includes(r.id.toString()) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">工号</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.workerId}</div>
            </div>

            <FormField label="姓名">
              <Input
                value={editedData.name ?? currentRecord.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </FormField>

            <FormField label="部门">
              <Select
                value={editedData.dept ?? currentRecord.dept}
                onChange={(e) => handleFieldChange('dept', e.target.value)}
                options={departments.map(d => ({ value: d, label: d }))}
              />
            </FormField>

            <FormField label="日期">
              <Input
                type="date"
                value={editedData.date ?? currentRecord.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
              />
            </FormField>

            <FormField label="签到时间">
              <Input
                type="time"
                value={editedData.checkIn ?? currentRecord.checkIn}
                onChange={(e) => handleFieldChange('checkIn', e.target.value)}
              />
            </FormField>

            <FormField label="签退时间">
              <Input
                type="time"
                value={editedData.checkOut ?? currentRecord.checkOut}
                onChange={(e) => handleFieldChange('checkOut', e.target.value)}
              />
            </FormField>

            <FormField label="工时">
              <Input
                type="number"
                step="0.1"
                value={editedData.hours ?? currentRecord.hours ?? 0}
                onChange={(e) => handleFieldChange('hours', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="状态">
              <Select
                value={editedData.status ?? currentRecord.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                options={[
                  { value: '正常', label: '正常' },
                  { value: '迟到', label: '迟到' },
                  { value: '早退', label: '早退' },
                  { value: '请假', label: '请假' },
                  { value: '加班', label: '加班' },
                  { value: '旷工', label: '旷工' },
                ]}
              />
            </FormField>
          </div>
        )}
      </div>
    </Modal>
  );
}
