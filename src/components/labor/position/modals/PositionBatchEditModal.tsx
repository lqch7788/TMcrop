import { X } from 'lucide-react';
import type { Position } from '../PositionManagementPage';
import { Button } from '@/components/ui/button';
import { useDepartmentStore } from '../../../../stores';

interface PositionBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: Position[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<Position>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<Position>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const levelOptions = ['高层', '中层', '基层'];
const statusOptions = ['启用', '停用'];

function getDeptOptions(): string[] {
  return useDepartmentStore.getState().departments.map(d => d.name);
}

export function PositionBatchEditModal({
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
}: PositionBatchEditModalProps) {
  if (!isOpen) return null;

  const selectedRecords = selectedRows.map(id => records.find(r => r.id.toString() === id)).filter(Boolean) as Position[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof Position, value: string | number) => {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">批量编辑职务记录</h3>
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
              已选择 {selectedRows.length} 条
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 条职务记录进行批量编辑，
              已编辑 <strong>{editedRecordIds.length}</strong> 条
            </p>
          </div>

          {/* Record Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">选择职务记录</label>
              <select
                value={selectedRecordId || ''}
                onChange={(e) => onSelectedRecordIdChange(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择记录</option>
                {selectedRecords.map(record => (
                  <option key={record.id} value={record.id.toString()}>
                    {record.code} - {record.name}{' '}
                    {editedRecordIds.includes(record.id.toString()) && (
                      <span className="bg-green-100 text-green-700">✅ 已编辑</span>
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {selectedRecordId && currentRecord && (
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              {/* 职务编号 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">职务编号</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.code}</div>
              </div>

              {/* 职务名称 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">职务名称</div>
                <input
                  type="text"
                  value={editedData.name ?? currentRecord.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 所属部门 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">所属部门</div>
                <select
                  value={editedData.dept ?? currentRecord.dept}
                  onChange={(e) => handleFieldChange('dept', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {getDeptOptions().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* 职务级别 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">职务级别</div>
                <select
                  value={editedData.level ?? currentRecord.level}
                  onChange={(e) => handleFieldChange('level', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {levelOptions.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* 基本工资 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">基本工资(元)</div>
                <input
                  type="number"
                  value={editedData.salary ?? currentRecord.salary}
                  onChange={(e) => handleFieldChange('salary', Number(e.target.value))}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
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

              {/* 职责描述 - 可编辑 */}
              <div className="col-span-2 bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">职责描述</div>
                <input
                  type="text"
                  value={editedData.description ?? currentRecord.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <div className="flex gap-3">
            <Button onClick={onConfirmNext}>确认（下一个）</Button>
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button variant="blue" onClick={onConfirm}>保存修改</Button>
          </div>
        </div>
      </div>
    </div>
  );
}