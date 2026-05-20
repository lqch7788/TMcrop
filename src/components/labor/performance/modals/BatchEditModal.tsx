import { useState, useEffect } from 'react';
import { Modal } from '../../../ui/Modal';
import { NumberInput } from '@/components/ui/NumberInput';
import { Label } from '@/components/ui/label';
import { PerformanceRecord } from '../types';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: PerformanceRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<PerformanceRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<PerformanceRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
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
  const [localEditedRecords, setLocalEditedRecords] = useState<Record<string, Partial<PerformanceRecord>>>({});

  // 每次打开弹窗时，用已编辑的数据初始化
  useEffect(() => {
    if (isOpen) {
      setLocalEditedRecords({ ...editedRecords });
    }
  }, [isOpen, editedRecords]);

  // 当选择的记录改变时，初始化该记录的编辑数据
  useEffect(() => {
    if (selectedRecordId && !localEditedRecords[selectedRecordId]) {
      const record = records.find(r => r.id === selectedRecordId);
      if (record) {
        setLocalEditedRecords(prev => ({
          ...prev,
          [selectedRecordId]: {
            taskCompletionRate: record.taskCompletionRate,
            attendanceRate: record.attendanceRate,
            workQuality: record.workQuality,
            safetyCompliance: record.safetyCompliance,
            teamworkAttitude: record.teamworkAttitude,
          }
        }));
      }
    }
  }, [selectedRecordId, records, localEditedRecords]);

  const selectedRecords = selectedRows
    .map((id) => records.find((r) => r.id === id))
    .filter((r): r is PerformanceRecord => !!r);

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? localEditedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof PerformanceRecord, value: unknown) => {
    if (!selectedRecordId) return;
    const updated = {
      ...localEditedRecords,
      [selectedRecordId]: {
        ...localEditedRecords[selectedRecordId],
        [field]: value,
      },
    };
    setLocalEditedRecords(updated);
    if (!editedRecordIds.includes(selectedRecordId)) {
      onEditedRecordIdsChange([...editedRecordIds, selectedRecordId]);
    }
  };

  const handleConfirm = () => {
    onEditedRecordsChange(localEditedRecords);
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑考核记录"
      size="lg"
      onSubmit={handleConfirm}
      submitText="确认保存"
      cancelText="取消"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">已选择 {selectedRows.length} 条考核记录，已编辑 {editedRecordIds.length} 条</p>

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
                {record.staffId} - {record.staffName} - {record.month}
                {editedRecordIds.includes(record.id) && ' ✅ 已编辑'}
              </option>
            ))}
          </select>
        </div>

        {/* 编辑字段 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* 员工信息 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">工号</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.staffId}</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">姓名</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.staffName}</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">部门</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.department}</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">月份</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.month}</div>
            </div>

            {/* 任务完成率 */}
            <div>
              <Label className="block text-xs text-gray-500 mb-1">任务完成率</Label>
              <NumberInput
                value={editedData.taskCompletionRate ?? currentRecord.taskCompletionRate ?? ''}
                onChange={(val) => handleFieldChange('taskCompletionRate', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 出勤率 */}
            <div>
              <Label className="block text-xs text-gray-500 mb-1">出勤率</Label>
              <NumberInput
                value={editedData.attendanceRate ?? currentRecord.attendanceRate ?? ''}
                onChange={(val) => handleFieldChange('attendanceRate', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 工作质量 */}
            <div>
              <Label className="block text-xs text-gray-500 mb-1">工作质量</Label>
              <NumberInput
                value={editedData.workQuality ?? currentRecord.workQuality ?? ''}
                onChange={(val) => handleFieldChange('workQuality', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 安全规范 */}
            <div>
              <Label className="block text-xs text-gray-500 mb-1">安全规范</Label>
              <NumberInput
                value={editedData.safetyCompliance ?? currentRecord.safetyCompliance ?? ''}
                onChange={(val) => handleFieldChange('safetyCompliance', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 协作态度 */}
            <div>
              <Label className="block text-xs text-gray-500 mb-1">协作态度</Label>
              <NumberInput
                value={editedData.teamworkAttitude ?? currentRecord.teamworkAttitude ?? ''}
                onChange={(val) => handleFieldChange('teamworkAttitude', Number(val))}
                decimals={0}
                className="w-full"
              />
            </div>

            {/* 综合得分 - 只读计算 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">综合得分（计算）</div>
              <div className="text-sm font-bold text-emerald-600">
                {Math.round(
                  (editedData.taskCompletionRate ?? currentRecord.taskCompletionRate ?? 0) * 0.3 +
                  (editedData.attendanceRate ?? currentRecord.attendanceRate ?? 0) * 0.2 +
                  (editedData.workQuality ?? currentRecord.workQuality ?? 0) * 0.25 +
                  (editedData.safetyCompliance ?? currentRecord.safetyCompliance ?? 0) * 0.15 +
                  (editedData.teamworkAttitude ?? currentRecord.teamworkAttitude ?? 0) * 0.1
                )}
              </div>
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
