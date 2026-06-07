import { Modal, FormField, Input, Select } from '@/components/ui';
import { Worker } from '../../../../types';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  workers: Worker[];
  editedWorkerIds: string[];
  editedWorkers: Record<string, Partial<Worker>>;
  selectedWorkerId: string;
  onSelectedWorkerIdChange: (id: string) => void;
  onEditedWorkersChange: (workers: Record<string, Partial<Worker>>) => void;
  onEditedWorkerIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  departments: string[];
  positions: string[];
  teams: string[];
}

export function BatchEditModal({
  isOpen,
  selectedRows,
  workers,
  editedWorkerIds,
  editedWorkers,
  selectedWorkerId,
  onSelectedWorkerIdChange,
  onEditedWorkersChange,
  onEditedWorkerIdsChange,
  onClose,
  onConfirm,
  departments,
  positions,
  teams,
}: BatchEditModalProps) {
  const selectedWorkers = selectedRows.map(index => workers[index]).filter(Boolean) as Worker[];
  const currentWorker = selectedWorkerId ? workers.find(w => w.id.toString() === selectedWorkerId) : null;
  const editedData = selectedWorkerId ? editedWorkers[selectedWorkerId] || {} : {};

  const handleFieldChange = (field: keyof Worker, value: unknown) => {
    if (!selectedWorkerId) return;
    const updated = {
      ...editedWorkers,
      [selectedWorkerId]: { ...editedWorkers[selectedWorkerId], [field]: value },
    };
    onEditedWorkersChange(updated);
    if (!editedWorkerIds.includes(selectedWorkerId)) {
      onEditedWorkerIdsChange([...editedWorkerIds, selectedWorkerId]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑员工信息"
      size="xxl"
      onSubmit={onConfirm}
      submitText="保存修改"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 信息提示 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条记录进行批量编辑，
            已编辑 <strong>{editedWorkerIds.length}</strong> 条
          </p>
        </div>

        {/* 记录选择器 */}
        <FormField label="选择员工">
          <Select
            value={selectedWorkerId || ''}
            onChange={(e) => onSelectedWorkerIdChange(e.target.value)}
            options={[
              { value: '', label: '请选择员工' },
              ...selectedWorkers.map(w => ({
                value: w.id.toString(),
                label: `${w.workerId} - ${w.name} - ${w.department} ${
                  editedWorkerIds.includes(w.id.toString()) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedWorkerId && currentWorker && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 工号 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">工号</div>
              <div className="text-sm font-medium text-gray-900">{currentWorker.workerId}</div>
            </div>

            {/* 姓名 - 可编辑 */}
            <FormField label="姓名">
              <Input
                value={editedData.name ?? currentWorker.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="请输入姓名"
              />
            </FormField>

            {/* 部门 - 可编辑 */}
            <FormField label="部门">
              <Select
                value={editedData.department ?? currentWorker.department}
                onChange={(e) => handleFieldChange('department', e.target.value)}
                options={departments.map(d => ({ value: d, label: d }))}
              />
            </FormField>

            {/* 班组 - 可编辑 */}
            <FormField label="班组">
              <Select
                value={editedData.team ?? currentWorker.team}
                onChange={(e) => handleFieldChange('team', e.target.value)}
                options={teams.map(t => ({ value: t, label: t }))}
              />
            </FormField>

            {/* 岗位 - 可编辑 */}
            <FormField label="岗位">
              <Select
                value={editedData.position ?? currentWorker.position}
                onChange={(e) => handleFieldChange('position', e.target.value)}
                options={positions.map(p => ({ value: p, label: p }))}
              />
            </FormField>

            {/* 技能等级 - 可编辑 */}
            <FormField label="技能等级">
              <Select
                value={editedData.skillLevel ?? currentWorker.skillLevel}
                onChange={(e) => handleFieldChange('skillLevel', e.target.value)}
                options={[
                  { value: '初级', label: '初级' },
                  { value: '中级', label: '中级' },
                  { value: '高级', label: '高级' },
                  { value: '特级', label: '特级' },
                ]}
              />
            </FormField>

            {/* 联系方式 - 可编辑 */}
            <FormField label="联系方式">
              <Input
                value={editedData.phone ?? currentWorker.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="请输入联系方式"
              />
            </FormField>

            {/* 合同状态 - 可编辑 */}
            <FormField label="合同状态">
              <Select
                value={editedData.contractStatus ?? currentWorker.contractStatus}
                onChange={(e) => handleFieldChange('contractStatus', e.target.value)}
                options={[
                  { value: '新签', label: '新签' },
                  { value: '续签', label: '续签' },
                  { value: '到期', label: '到期' },
                  { value: '解除', label: '解除' },
                ]}
              />
            </FormField>

            {/* 状态 - 可编辑 */}
            <FormField label="状态">
              <Select
                value={editedData.status ?? currentWorker.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                options={[
                  { value: '在职', label: '在职' },
                  { value: '离职', label: '离职' },
                  { value: '退休', label: '退休' },
                ]}
              />
            </FormField>
          </div>
        )}
      </div>
    </Modal>
  );
}
