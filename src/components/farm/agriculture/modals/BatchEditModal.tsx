import { Modal, FormField, Input, Select } from '../../../ui/Modal';

interface OperationRecord {
  id: number;
  code: string;
  type: string;
  cropName: string;
  variety: string;
  greenhouse: string;
  area: number;
  operator: string;
  operatorId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  workload: number;
  unit: string;
  materials: string[];
  status: string;
  remarks: string;
}

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  records: OperationRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<OperationRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<OperationRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  typeOptions: string[];
  statusOptions: { value: string; label: string }[];
  greenhouseOptions: string[];
  operatorOptions: string[];
  unitOptions: string[];
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
  typeOptions,
  statusOptions,
  greenhouseOptions,
  operatorOptions,
  unitOptions,
}: BatchEditModalProps) {
  const selectedRecords = selectedRows.map(id => records.find(r => r.id.toString() === id)).filter(Boolean) as OperationRecord[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof OperationRecord, value: unknown) => {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑农事操作记录"
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
            已编辑 <strong>{editedRecordIds.length}</strong> 条
          </p>
        </div>

        {/* 记录选择器 */}
        <FormField label="选择操作单号">
          <Select
            value={selectedRecordId || ''}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            options={[
              { value: '', label: '请选择操作单号' },
              ...selectedRecords.map(r => ({
                value: r.id.toString(),
                label: `${r.code} - ${r.type} - ${r.cropName} ${
                  editedRecordIds.includes(r.id.toString()) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 操作单号 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">操作单号</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.code}</div>
            </div>

            {/* 操作类型 - 可编辑 */}
            <FormField label="操作类型">
              <Select
                value={editedData.type ?? currentRecord.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                options={typeOptions.map(t => ({ value: t, label: t }))}
              />
            </FormField>

            {/* 作物名称 - 可编辑 */}
            <FormField label="作物名称">
              <Input
                value={editedData.cropName ?? currentRecord.cropName}
                onChange={(e) => handleFieldChange('cropName', e.target.value)}
                placeholder="请输入作物名称"
              />
            </FormField>

            {/* 品种 - 可编辑 */}
            <FormField label="品种">
              <Input
                value={editedData.variety ?? currentRecord.variety}
                onChange={(e) => handleFieldChange('variety', e.target.value)}
                placeholder="请输入品种"
              />
            </FormField>

            {/* 操作区域 - 可编辑 */}
            <FormField label="操作区域">
              <Select
                value={editedData.greenhouse ?? currentRecord.greenhouse}
                onChange={(e) => handleFieldChange('greenhouse', e.target.value)}
                options={greenhouseOptions.map(g => ({ value: g, label: g }))}
              />
            </FormField>

            {/* 操作人员 - 可编辑 */}
            <FormField label="操作人员">
              <Select
                value={editedData.operator ?? currentRecord.operator}
                onChange={(e) => handleFieldChange('operator', e.target.value)}
                options={operatorOptions.map(o => ({ value: o, label: o }))}
              />
            </FormField>

            {/* 操作日期 - 可编辑 */}
            <FormField label="操作日期">
              <Input
                type="date"
                value={editedData.date ?? currentRecord.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
              />
            </FormField>

            {/* 开始时间 - 可编辑 */}
            <FormField label="开始时间">
              <Input
                type="time"
                value={editedData.startTime ?? currentRecord.startTime}
                onChange={(e) => handleFieldChange('startTime', e.target.value)}
              />
            </FormField>

            {/* 结束时间 - 可编辑 */}
            <FormField label="结束时间">
              <Input
                type="time"
                value={editedData.endTime ?? currentRecord.endTime}
                onChange={(e) => handleFieldChange('endTime', e.target.value)}
              />
            </FormField>

            {/* 操作数量 - 可编辑 */}
            <FormField label="操作数量">
              <Input
                type="number"
                value={editedData.workload ?? currentRecord.workload ?? 0}
                onChange={(e) => handleFieldChange('workload', parseInt(e.target.value) || 0)}
              />
            </FormField>

            {/* 单位 - 可编辑 */}
            <FormField label="单位">
              <Select
                value={editedData.unit ?? currentRecord.unit}
                onChange={(e) => handleFieldChange('unit', e.target.value)}
                options={unitOptions.map(u => ({ value: u, label: u }))}
              />
            </FormField>

            {/* 状态 - 可编辑 */}
            <FormField label="状态">
              <Select
                value={editedData.status ?? currentRecord.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                options={statusOptions.filter(s => s.value !== '').map(s => ({ value: s.value, label: s.label }))}
              />
            </FormField>

            {/* 备注 - 可编辑 */}
            <FormField label="备注" className="md:col-span-2">
              <Input
                value={editedData.remarks ?? currentRecord.remarks ?? ''}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                placeholder="请输入备注"
              />
            </FormField>
          </div>
        )}
      </div>
    </Modal>
  );
}
