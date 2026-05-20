import type { TempWorker, StaffStatus } from './types';
import { Button } from '@/components/ui/button';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Label } from '@/components/ui/label';

interface TempWorkerBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: TempWorker[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<TempWorker>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<TempWorker>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const statusOptions: StaffStatus[] = ['在职', '离职', '停薪留职', '试用期'];
const workZoneOptions = ['A区', 'B区', 'C区', 'D区'];

export function TempWorkerBatchEditModal({
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
}: TempWorkerBatchEditModalProps) {
  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as TempWorker[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof TempWorker, value: unknown) => {
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
      <Button variant="blue" onClick={onConfirm}>确认保存</Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑临时工记录"
      size="xxl"
      showFooter={true}
      footer={footer}
    >
      {/* Info Banner */}
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 条临时工记录进行批量编辑，
          已编辑 <strong>{editedRecordIds.length}</strong> 条
        </p>
      </div>

      {/* Record Selector */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <Label className="block text-xs font-medium text-gray-600 mb-1">选择临时工记录</Label>
          <select
            value={selectedRecordId}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">请选择记录</option>
            {selectedRecords.map(record => (
              <option key={record.id} value={record.id}>
                {record.employeeCode} - {record.name}
                {editedRecordIds.includes(record.id) && (
                  <span className="bg-green-100 text-green-700"> 已编辑</span>
                )}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {selectedRecordId && currentRecord && (
        <div className="grid grid-cols-4 gap-3">
          {/* 工号 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">工号</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.employeeCode}</div>
          </div>

          {/* 姓名 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">姓名</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.name}</div>
          </div>

          {/* 状态 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">状态</div>
            <select
              value={editedData.status ?? currentRecord.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
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

          {/* 工人类型 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">工人类型</div>
            <select
              value={editedData.workerType ?? currentRecord.workerType}
              onChange={(e) => handleFieldChange('workerType', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="正式工">正式工</option>
              <option value="临时工">临时工</option>
              <option value="季节工">季节工</option>
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
              <option value="劳动合同">劳动合同</option>
              <option value="劳务合同">劳务合同</option>
              <option value="实习协议">实习协议</option>
              <option value="无合同">无合同</option>
            </select>
          </div>

          {/* 保险类型 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">保险类型</div>
            <select
              value={editedData.insuranceType ?? currentRecord.insuranceType ?? ''}
              onChange={(e) => handleFieldChange('insuranceType', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">请选择</option>
              <option value="工伤险">工伤险</option>
              <option value="综合险">综合险</option>
              <option value="无保险">无保险</option>
            </select>
          </div>

          {/* 入职日期 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">入职日期</div>
            <div className="text-sm text-gray-700">{currentRecord.joinDate}</div>
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}
