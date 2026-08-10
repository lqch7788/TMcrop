import type { ScheduleRecord, ShiftType } from '../types';
import { Check, Edit2, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { Input } from '@/components/ui';

interface ScheduleBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: ScheduleRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<ScheduleRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<ScheduleRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
  shiftConfigs: { name: ShiftType; startTime: string; endTime: string }[];
}

export function ScheduleBatchEditModal({
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
  shiftConfigs,
}: ScheduleBatchEditModalProps) {
  if (!isOpen) return null;

  const selectedRecords = selectedRows.map(id => records.find(r => r.id === id)).filter(Boolean) as ScheduleRecord[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof ScheduleRecord, value: unknown) => {
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

  const content = (
    <div>
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 条排班记录进行批量编辑，
          已编辑 <strong>{editedRecordIds.length}</strong> 条
        </p>
      </div>

      {/* Record Selector */}
      <div className="mb-3">
        <Label className="block text-xs font-medium text-gray-600 mb-1">选择排班记录</Label>
        <Select
          value={selectedRecordId || ''}
          onValueChange={onSelectedRecordIdChange}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="请选择记录" />
          </SelectTrigger>
          <SelectContent>
            {selectedRecords.map(record => (
              <SelectItem key={record.id} value={record.id.toString()}>
                {record.date} - {record.staffName} - {record.shift}
                {editedRecordIds.includes(record.id.toString()) ? ' ✅ 已编辑' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {selectedRecordId && currentRecord && (
        <div className="grid grid-cols-4 gap-3">
          {/* 日期 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">日期</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.date}</div>
          </div>

          {/* 员工姓名 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">员工</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.staffName}</div>
          </div>

          {/* 班次 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">班次</div>
            <Select
              value={editedData.shift ?? currentRecord.shift}
              onValueChange={(val) => handleFieldChange('shift', val)}
            >
              <SelectTrigger className="w-full h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shiftConfigs.map(config => (
                  <SelectItem key={config.name} value={config.name}>
                    {config.name} ({config.startTime}-{config.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 工作区域 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">工作区域</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.workZone}</div>
          </div>

          {/* 状态 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">状态</div>
            <Select
              value={editedData.status ?? currentRecord.status}
              onValueChange={(val) => handleFieldChange('status', val)}
            >
              <SelectTrigger className="w-full h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="已排班">已排班</SelectItem>
                <SelectItem value="已执行">已执行</SelectItem>
                <SelectItem value="已取消">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 签到时间 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">签到时间</div>
            <Input
              type="time"
              value={editedData.checkIn ?? currentRecord.checkIn ?? ''}
              onChange={(e) => handleFieldChange('checkIn', e.target.value)}
              className="w-full h-7"
            />
          </div>

          {/* 签退时间 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">签退时间</div>
            <Input
              type="time"
              value={editedData.checkOut ?? currentRecord.checkOut ?? ''}
              onChange={(e) => handleFieldChange('checkOut', e.target.value)}
              className="w-full h-7"
            />
          </div>
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <Button onClick={onConfirmNext}>
        <Check className="w-4 h-4" /> 确认（下一个）
      </Button>
      <Button variant="secondary" onClick={onClose}>
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button variant="blue" onClick={onConfirm}>
        <Edit2 className="w-4 h-4" /> 保存修改
      </Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="批量编辑排班记录" size="xxl" showFooter={true} footer={footer} showMaximize={true}>
      {content}
    </UnifiedModal>
  );
}
