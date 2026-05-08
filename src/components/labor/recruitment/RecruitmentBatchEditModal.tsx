import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecruitmentRequest, RecruitmentStatus, RecruitmentSource } from './types';

interface RecruitmentBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: RecruitmentRequest[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<RecruitmentRequest>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<RecruitmentRequest>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

const statusOptions: RecruitmentStatus[] = ['待审批', '招聘中', '已完成', '已取消'];
const sourceOptions: RecruitmentSource[] = ['劳务公司', '个人零工', '学生实习', '内部推荐'];
const departmentOptions = ['生产部', '采收部', '技术部', '设备部', '仓储部', '包装部', '质量部', '安全部', '行政部', '财务部'];

export function RecruitmentBatchEditModal({
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
}: RecruitmentBatchEditModalProps) {
  if (!isOpen) return null;

  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as RecruitmentRequest[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof RecruitmentRequest, value: unknown) => {
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
            <h3 className="text-lg font-semibold text-white">批量编辑招聘申请</h3>
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
              已选择 <strong>{selectedRows.length}</strong> 条招聘申请进行批量编辑，
              已编辑 <strong>{editedRecordIds.length}</strong> 条
            </p>
          </div>

          {/* Record Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">选择招聘申请记录</label>
              <select
                value={selectedRecordId}
                onChange={(e) => onSelectedRecordIdChange(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择记录</option>
                {selectedRecords.map(record => (
                  <option key={record.id} value={record.id}>
                    {record.requestCode} - {record.position}
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
              {/* 招聘编号 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">招聘编号</div>
                <div className="text-sm font-medium text-gray-900">{currentRecord.requestCode}</div>
              </div>

              {/* 招聘岗位 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">招聘岗位</div>
                <input
                  type="text"
                  value={editedData.position ?? currentRecord.position}
                  onChange={(e) => handleFieldChange('position', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 需求部门 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">需求部门</div>
                <select
                  value={editedData.department ?? currentRecord.department}
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* 招聘人数 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">招聘人数</div>
                <input
                  type="number"
                  value={editedData.quantity ?? currentRecord.quantity}
                  onChange={(e) => handleFieldChange('quantity', Number(e.target.value))}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 来源 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">来源</div>
                <select
                  value={editedData.source ?? currentRecord.source}
                  onChange={(e) => handleFieldChange('source', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {sourceOptions.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              {/* 期望到岗日期 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">期望到岗日期</div>
                <input
                  type="date"
                  value={editedData.expectedDate ?? currentRecord.expectedDate}
                  onChange={(e) => handleFieldChange('expectedDate', e.target.value)}
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

              {/* 申请人 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">申请人</div>
                <div className="text-sm text-gray-700">{currentRecord.applicantName}</div>
              </div>

              {/* 申请日期 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">申请日期</div>
                <div className="text-sm text-gray-700">{currentRecord.applyDate}</div>
              </div>

              {/* 招聘原因 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                <div className="text-xs text-gray-500 mb-1">招聘原因</div>
                <input
                  type="text"
                  value={editedData.reason ?? currentRecord.reason}
                  onChange={(e) => handleFieldChange('reason', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 岗位要求 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                <div className="text-xs text-gray-500 mb-1">岗位要求</div>
                <input
                  type="text"
                  value={editedData.requirements ?? currentRecord.requirements}
                  onChange={(e) => handleFieldChange('requirements', e.target.value)}
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
            <Button variant="blue" onClick={onConfirm}>确认保存</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
