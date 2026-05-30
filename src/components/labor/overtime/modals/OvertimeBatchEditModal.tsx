import { UnifiedModal } from '@/components/ui/UnifiedModal';
import type { OvertimeRecord, OvertimeType } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/NumberInput';

interface OvertimeBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: OvertimeRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<OvertimeRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<OvertimeRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const overtimeTypes: OvertimeType[] = ['普通加班', '周末加班', '节假日加班'];
const overtimeStatuses = ['待审批', '已审批', '已驳回', '已取消'];

export function OvertimeBatchEditModal({
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
}: OvertimeBatchEditModalProps) {
  if (!isOpen) return null;

  const selectedRecords = selectedRows.map(id => records.find(r => r.id.toString() === id)).filter(Boolean) as OvertimeRecord[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof OvertimeRecord, value: string | number) => {
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
      title="批量编辑加班记录"
      size="xxl"
      showFooter={true}
      footer={footer}
    >
      <div className="space-y-4">
        {/* 信息横幅 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条加班记录进行批量编辑，
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* 记录选择器 */}
        <div>
          <Label className="block text-xs font-medium text-gray-600 mb-1">选择加班记录</Label>
          <select
            value={selectedRecordId || ''}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
          >
            <option value="">请选择记录</option>
            {selectedRecords.map(record => (
              <option key={record.id} value={record.id.toString()}>
                {record.date} - {record.staffName} - {record.type}{' '}
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

            {/* 日期 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">日期</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.date}</div>
            </div>

            {/* 加班类型 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">加班类型</div>
              <select
                value={String(editedData.type ?? currentRecord.type)}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                className="w-full h-8 px-2 border border-gray-400 rounded text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
              >
                {overtimeTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* 时长 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">时长(小时)</div>
              <NumberInput
                value={editedData.hours ?? currentRecord.hours}
                onChange={(val) => handleFieldChange('hours', val === '' ? 0 : Number(val))}
                decimals={1}
                className="w-full h-8"
              />
            </div>

            {/* 状态 - 可编辑 */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <select
                value={String(editedData.status ?? currentRecord.status)}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full h-8 px-2 border border-gray-400 rounded text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
              >
                {overtimeStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* 加班费 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">加班费(元)</div>
              <div className="text-sm font-medium text-gray-900">
                {currentRecord.totalPay ? `¥${currentRecord.totalPay.toFixed(2)}` : '-'}
              </div>
            </div>

            {/* 原因 - 可编辑 */}
            <div className="col-span-2 bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">原因</div>
              <input
                type="text"
                value={String(editedData.reason ?? currentRecord.reason)}
                onChange={(e) => handleFieldChange('reason', e.target.value)}
                className="w-full h-8 px-2 border border-gray-400 rounded text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
              />
            </div>

            {/* 备注 - 可编辑 */}
            <div className="col-span-2 bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">备注</div>
              <input
                type="text"
                value={String(editedData.remarks ?? currentRecord.remarks ?? '')}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                className="w-full h-8 px-2 border border-gray-400 rounded text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
              />
            </div>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
