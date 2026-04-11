import { Modal, FormField, Input, Select } from '../../../ui/Modal';

interface HarvestRecord {
  id: number;
  harvestCode: string;
  batchCode: string;
  cropName: string;
  greenhouseId: string;
  greenhouseName: string;
  harvestDate: string;
  harvestQuantity: number;
  unit: string;
  grade: string;
  warehouseId: string;
  warehouseName: string;
  harvesterIds: string[];
  harvesterNames: string[];
  status: string;
  remarks: string;
}

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  records: HarvestRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<HarvestRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<HarvestRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  greenhouses: { id: string; name: string }[];
  warehouses: { id: string; name: string }[];
  users: { id: string; name: string; role: string }[];
  cropBatches: { id: number; batchCode: string; cropName: string }[];
}

const gradeOptions = [
  { value: 'A', label: 'A级 (优质)' },
  { value: 'B', label: 'B级 (良好)' },
  { value: 'C', label: 'C级 (一般)' },
];

const statusOptions = [
  { value: 'harvested', label: '已采收' },
  { value: 'graded', label: '已分级' },
  { value: 'stored', label: '已入库' },
];

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
  greenhouses,
  warehouses,
  users,
  cropBatches,
}: BatchEditModalProps) {
  const selectedRecords = selectedRows.map(index => records[index]).filter(Boolean) as HarvestRecord[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof HarvestRecord, value: unknown) => {
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
      title="批量编辑采收记录"
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
        <FormField label="选择采收单号">
          <Select
            value={selectedRecordId || ''}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            options={[
              { value: '', label: '请选择采收单号' },
              ...selectedRecords.map(r => ({
                value: r.id.toString(),
                label: `${r.harvestCode} - ${r.cropName} - ${r.harvestDate} ${
                  editedRecordIds.includes(r.id.toString()) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 采收单号 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">采收单号</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.harvestCode}</div>
            </div>

            {/* 批次信息 - 可编辑 */}
            <FormField label="批次信息">
              <Select
                value={editedData.batchCode ?? currentRecord.batchCode}
                onChange={(e) => handleFieldChange('batchCode', e.target.value)}
                options={cropBatches.map(b => ({ value: b.batchCode, label: `${b.batchCode} - ${b.cropName}` }))}
              />
            </FormField>

            {/* 采收区域 - 可编辑 */}
            <FormField label="采收区域">
              <Select
                value={editedData.greenhouseId ?? currentRecord.greenhouseId}
                onChange={(e) => handleFieldChange('greenhouseId', e.target.value)}
                options={greenhouses.map(g => ({ value: g.id, label: g.name }))}
              />
            </FormField>

            {/* 作物名称 - 不可编辑（随批次） */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">作物名称</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.cropName}</div>
            </div>

            {/* 采收日期 - 可编辑 */}
            <FormField label="采收日期">
              <Input
                type="date"
                value={editedData.harvestDate ?? currentRecord.harvestDate}
                onChange={(e) => handleFieldChange('harvestDate', e.target.value)}
              />
            </FormField>

            {/* 采收量 - 可编辑 */}
            <FormField label="采收量(kg)">
              <Input
                type="number"
                step="0.1"
                min="0"
                value={editedData.harvestQuantity ?? currentRecord.harvestQuantity ?? 0}
                onChange={(e) => handleFieldChange('harvestQuantity', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            {/* 品质等级 - 可编辑 */}
            <FormField label="品质等级">
              <Select
                value={editedData.grade ?? currentRecord.grade}
                onChange={(e) => handleFieldChange('grade', e.target.value)}
                options={gradeOptions}
              />
            </FormField>

            {/* 入库仓库 - 可编辑 */}
            <FormField label="入库仓库">
              <Select
                value={editedData.warehouseId ?? currentRecord.warehouseId}
                onChange={(e) => handleFieldChange('warehouseId', e.target.value)}
                options={warehouses.map(w => ({ value: w.id, label: w.name }))}
              />
            </FormField>

            {/* 状态 - 可编辑 */}
            <FormField label="状态">
              <Select
                value={editedData.status ?? currentRecord.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                options={statusOptions}
              />
            </FormField>

            {/* 采收人员 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3 md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">采收人员</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.harvesterNames.join(', ')}</div>
            </div>

            {/* 备注 - 可编辑 */}
            <FormField label="备注" className="md:col-span-4">
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
