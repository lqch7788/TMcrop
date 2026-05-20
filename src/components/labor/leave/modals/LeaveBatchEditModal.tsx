import { UnifiedModal } from '@/components/ui/UnifiedModal';
import type { LeaveRecord, LeaveType } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/NumberInput';
import { DatePicker } from '@/components/ui/DatePicker';

interface LeaveBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: LeaveRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<LeaveRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<LeaveRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const leaveTypes: LeaveType[] = ['事假', '病假', '年假', '婚假', '产假', '陪产假', '丧假', '工伤假'];
const leaveStatuses = ['待审批', '已通过', '已拒绝', '已取消'];

export function LeaveBatchEditModal({
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
}: LeaveBatchEditModalProps) {
  if (!isOpen) return null;

  const selectedRecords = selectedRows.map(id => records.find(r => r.id.toString() === id)).filter(Boolean) as LeaveRecord[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof LeaveRecord, value: string | number) => {
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

  const footer = (
    <div className="flex gap-3">
      <Button onClick={onConfirmNext}>确认（下一个）</Button>
      <Button variant="ghost" onClick={onClose}>取消</Button>
      <Button variant="blue" onClick={onConfirm}>保存修改</Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑请假记录"
      size="xxl"
      showFooter={true}
      footer={footer}
    >
      <div className="space-y-4">
        {/* 信息横幅 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条请假记录进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* 记录选择器 */}
        <div>
          <Label className="block text-xs font-medium text-gray-600 mb-1">选择请假记录</Label>
          <select
            value={selectedRecordId || ''}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">请选择记录</option>
            {selectedRecords.map(record => (
              <option key={record.id} value={record.id.toString()}>
                {record.startDate} - {record.staffName} - {record.leaveType}{' '}
                {editedRecordIds.includes(record.id.toString()) && '✅ 已编辑'}
              </option>
            ))}
          </select>
        </div>

        {/* 编辑内容 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-4 gap-3">
            {/* 员工姓名 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">员工姓名</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.staffName}</div>
            </div>

            {/* 请假类型 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">请假类型</div>
              <select
                value={String(editedData.leaveType ?? currentRecord.leaveType)}
                onChange={(e) => handleFieldChange('leaveType', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              >
                {leaveTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* 开始日期 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">开始日期</div>
              <DatePicker
                selected={(editedData.startDate ?? currentRecord.startDate) ? new Date(String(editedData.startDate ?? currentRecord.startDate)) : undefined}
                onChange={(date) => handleFieldChange('startDate', date.toISOString().split('T')[0])}
                className="w-full"
              />
            </div>

            {/* 结束日期 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">结束日期</div>
              <DatePicker
                selected={(editedData.endDate ?? currentRecord.endDate) ? new Date(String(editedData.endDate ?? currentRecord.endDate)) : undefined}
                onChange={(date) => handleFieldChange('endDate', date.toISOString().split('T')[0])}
                className="w-full"
              />
            </div>

            {/* 天数 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">天数</div>
              <NumberInput
                value={editedData.days ?? currentRecord.days}
                onChange={(val) => handleFieldChange('days', val === '' ? 0 : Number(val))}
                decimals={0}
                className="w-full h-8"
              />
            </div>

            {/* 状态 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <select
                value={String(editedData.status ?? currentRecord.status)}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              >
                {leaveStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* 请假原因 - 可编辑 */}
            <div className="col-span-2 bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">请假原因</div>
              <input
                type="text"
                value={String(editedData.reason ?? currentRecord.reason)}
                onChange={(e) => handleFieldChange('reason', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 备注 - 可编辑 */}
            <div className="col-span-2 bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">备注</div>
              <input
                type="text"
                value={String(editedData.remarks ?? currentRecord.remarks ?? '')}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
