import React, { useEffect } from 'react';
import { StaffSkill, SkillLevel } from './types';
import { useDepartmentStore, useDictionaryStore, getDictItems } from '../../../stores';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Label } from '@/components/ui';

interface SkillBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: StaffSkill[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<StaffSkill>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<StaffSkill>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmNext: () => void;
}

// 技能等级列表 - 从字典获取
const skillLevels: SkillLevel[] = ['初级', '中级', '高级', '技师'];

export function SkillBatchEditModal({
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
}: SkillBatchEditModalProps) {
  // 从Zustand stores获取部门列表和字典数据
  const departments = useDepartmentStore((state) => state.departments);
  const loadDepartments = useDepartmentStore((state) => state.loadDepartments);
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (departments.length === 0) {
      loadDepartments();
    }
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [departments.length, loadDepartments, dictionaries.length, loadDictionaries]);

  // 获取技能状态字典
  const statusOptions = getDictItems('skill_status').map(item => item.dictLabel);

  // 当弹窗打开且没有选择记录时，自动选择第一条
  React.useEffect(() => {
    if (isOpen && !selectedRecordId && selectedRows.length > 0) {
      onSelectedRecordIdChange(selectedRows[0]);
    }
  }, [isOpen, selectedRecordId, selectedRows, onSelectedRecordIdChange]);

  const selectedRecords = selectedRows
    .map(id => records.find(r => r.id === id))
    .filter(Boolean) as StaffSkill[];

  const currentRecord = selectedRecordId
    ? records.find(r => r.id === selectedRecordId)
    : null;

  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof StaffSkill, value: unknown) => {
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
    <div className="flex justify-end gap-3">
      <Button onClick={onConfirmNext}>
        确认（下一个）
      </Button>
      <Button variant="blue" onClick={onConfirm}>
        确认保存
      </Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑技能档案"
      size="xxl"
      showFooter={true}
      footer={footer}
    >
      {/* Info Banner */}
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 条技能档案进行批量编辑，
          已编辑 <strong>{editedRecordIds.length}</strong> 条
        </p>
      </div>

      {/* Record Selector */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <Label className="block text-xs font-medium text-gray-600 mb-1">选择技能档案记录</Label>
          <select
            value={selectedRecordId}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">请选择记录</option>
            {selectedRecords.map(record => (
              <option key={record.id} value={record.id}>
                {record.staffId} - {record.staffName}
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
            <div className="text-sm font-medium text-gray-900">{currentRecord.staffId}</div>
          </div>

          {/* 姓名 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">姓名</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.staffName}</div>
          </div>

          {/* 部门 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">部门</div>
            <select
              value={editedData.department ?? currentRecord.department}
              onChange={(e) => handleFieldChange('department', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              {departments.map(dept => (
                <option key={dept.oid || dept.name} value={dept.name}>{dept.name}</option>
              ))}
            </select>
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

          {/* 技能数 - 只读 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">技能数</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.totalSkills}</div>
          </div>

          {/* 证书数 - 只读 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">证书数</div>
            <div className="text-sm font-medium text-gray-900">{currentRecord.certificationCount}</div>
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}
