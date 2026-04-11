import React from 'react';
import { X } from 'lucide-react';
import type { PieceRate } from './types';

interface PieceworkBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: PieceRate[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<PieceRate>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<PieceRate>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const statusOptions: PieceRate['status'][] = ['待确认', '已确认', '已发放'];

export function PieceworkBatchEditModal({
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
}: PieceworkBatchEditModalProps) {
  // 当弹窗打开且没有选择记录时，自动选择第一条
  React.useEffect(() => {
    if (isOpen && !selectedRecordId && selectedRows.length > 0) {
      onSelectedRecordIdChange(selectedRows[0]);
    }
  }, [isOpen, selectedRecordId, selectedRows, onSelectedRecordIdChange]);

  if (!isOpen) return null;

  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as PieceRate[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof PieceRate, value: unknown) => {
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
            <h3 className="text-lg font-semibold text-white">批量编辑计件工资</h3>
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
              已选择 {selectedRows.length} 条
            </span>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 条计件工资记录进行批量编辑，
              已编辑 <strong>{editedRecordIds.length}</strong> 条
            </p>
          </div>

          {/* Record Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">选择计件记录</label>
              <select
                value={selectedRecordId}
                onChange={(e) => onSelectedRecordIdChange(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择记录</option>
                {selectedRecords.map(record => (
                  <option key={record.id} value={record.id}>
                    {record.workerName} - {record.taskName} - {record.workDate}
                    {editedRecordIds.includes(record.id) && (
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
              {/* 员工姓名 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">员工姓名</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.workerName}</div>
              </div>

              {/* 任务名称 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">任务名称</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.taskName}</div>
              </div>

              {/* 工作日期 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">工作日期</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.workDate}</div>
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

              {/* 单位 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">单位</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.unit}</div>
              </div>

              {/* 数量 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">数量</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.quantity}</div>
              </div>

              {/* 单价 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">单价</div>
                <div className="text-sm font-medium text-gray-900">¥{currentRecord.unitPrice.toFixed(2)}</div>
              </div>

              {/* 合计 - 只读 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">合计</div>
                <div className="text-sm font-medium text-emerald-600">¥{currentRecord.total.toFixed(2)}</div>
              </div>

              {/* 备注 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                <div className="text-xs text-gray-500 mb-1">备注</div>
                <input
                  type="text"
                  value={editedData.remarks ?? currentRecord.remarks ?? ''}
                  onChange={(e) => handleFieldChange('remarks', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                  placeholder="请输入备注"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onConfirmNext}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              确认（下一个）
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              确认保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PieceworkBatchEditModal;