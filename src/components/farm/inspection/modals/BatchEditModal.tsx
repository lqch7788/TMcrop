import { Modal, FormField, Input, Select } from '../../../ui/Modal';

interface InspectionRecord {
  id: number;
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  inspectorId: string;
  inspectorName: string;
  checkDate: string;
  checkTime: string;
  weather: string;
  temperature: number;
  humidity: number;
  cropStatus: string;
  plantHeight?: number;
  leafCount?: number;
  status: string;
  issues: string[];
  images: string[];
  remarks: string;
}

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  records: InspectionRecord[];
  editedRecordIds: string[];
  editedRecords: Record<string, Partial<InspectionRecord>>;
  selectedRecordId: string;
  onSelectedRecordIdChange: (id: string) => void;
  onEditedRecordsChange: (records: Record<string, Partial<InspectionRecord>>) => void;
  onEditedRecordIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  greenhouses: { id: string; name: string }[];
  users: { id: string; name: string; role: string; roleName: string }[];
  cropTypes: { id: number; name: string }[];
}

const weatherOptions = ['晴', '多云', '阴', '雨', '雪', '雾'];
const cropStatusOptions = ['良好', '一般', '较差', '有病虫害'];

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
  users,
  cropTypes,
}: BatchEditModalProps) {
  const selectedRecords = selectedRows.map(index => records[index]).filter(Boolean) as InspectionRecord[];
  const currentRecord = selectedRecordId ? records.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? editedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof InspectionRecord, value: unknown) => {
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
      title="批量编辑巡田记录"
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
        <FormField label="选择记录编号">
          <Select
            value={selectedRecordId || ''}
            onChange={(e) => onSelectedRecordIdChange(e.target.value)}
            options={[
              { value: '', label: '请选择记录编号' },
              ...selectedRecords.map(r => ({
                value: r.id.toString(),
                label: `${r.id} - ${r.greenhouseName} - ${r.checkDate} ${
                  editedRecordIds.includes(r.id.toString()) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 记录ID - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">记录编号</div>
              <div className="text-sm font-medium text-gray-900">{currentRecord.id}</div>
            </div>

            {/* 巡田区域 - 可编辑 */}
            <FormField label="巡田区域">
              <Select
                value={editedData.greenhouseId ?? currentRecord.greenhouseId}
                onChange={(e) => handleFieldChange('greenhouseId', e.target.value)}
                options={greenhouses.map(g => ({ value: g.id, label: g.name }))}
              />
            </FormField>

            {/* 作物名称 - 可编辑 */}
            <FormField label="作物名称">
              <Select
                value={editedData.cropName ?? currentRecord.cropName}
                onChange={(e) => handleFieldChange('cropName', e.target.value)}
                options={cropTypes.map(c => ({ value: c.name, label: c.name }))}
              />
            </FormField>

            {/* 巡田人员 - 可编辑 */}
            <FormField label="巡田人员">
              <Select
                value={editedData.inspectorId ?? currentRecord.inspectorId}
                onChange={(e) => handleFieldChange('inspectorId', e.target.value)}
                options={users.filter(u => u.role === 'technician' || u.role === 'supervisor').map(u => ({
                  value: u.id,
                  label: u.name,
                }))}
              />
            </FormField>

            {/* 巡田日期 - 可编辑 */}
            <FormField label="巡田日期">
              <Input
                type="date"
                value={editedData.checkDate ?? currentRecord.checkDate}
                onChange={(e) => handleFieldChange('checkDate', e.target.value)}
              />
            </FormField>

            {/* 巡田时间 - 可编辑 */}
            <FormField label="巡田时间">
              <Input
                type="time"
                value={editedData.checkTime ?? currentRecord.checkTime}
                onChange={(e) => handleFieldChange('checkTime', e.target.value)}
              />
            </FormField>

            {/* 天气 - 可编辑 */}
            <FormField label="天气">
              <Select
                value={editedData.weather ?? currentRecord.weather}
                onChange={(e) => handleFieldChange('weather', e.target.value)}
                options={weatherOptions.map(w => ({ value: w, label: w }))}
              />
            </FormField>

            {/* 温度 - 可编辑 */}
            <FormField label="温度(°C)">
              <Input
                type="number"
                step="0.1"
                value={editedData.temperature ?? currentRecord.temperature ?? 0}
                onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            {/* 湿度 - 可编辑 */}
            <FormField label="湿度(%)">
              <Input
                type="number"
                step="0.1"
                value={editedData.humidity ?? currentRecord.humidity ?? 0}
                onChange={(e) => handleFieldChange('humidity', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            {/* 作物状态 - 可编辑 */}
            <FormField label="作物状态">
              <Select
                value={editedData.cropStatus ?? currentRecord.cropStatus}
                onChange={(e) => handleFieldChange('cropStatus', e.target.value)}
                options={cropStatusOptions.map(s => ({ value: s, label: s }))}
              />
            </FormField>

            {/* 株高 - 可编辑 */}
            <FormField label="株高(cm)">
              <Input
                type="number"
                step="0.1"
                value={editedData.plantHeight ?? currentRecord.plantHeight ?? ''}
                onChange={(e) => handleFieldChange('plantHeight', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            {/* 叶片数 - 可编辑 */}
            <FormField label="叶片数">
              <Input
                type="number"
                value={editedData.leafCount ?? currentRecord.leafCount ?? ''}
                onChange={(e) => handleFieldChange('leafCount', parseInt(e.target.value) || 0)}
              />
            </FormField>

            {/* 状态 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                currentRecord.status === 'normal' ? 'bg-emerald-100 text-emerald-700' :
                currentRecord.status === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                currentRecord.status === 'critical' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {currentRecord.status === 'normal' ? '正常' :
                 currentRecord.status === 'attention' ? '需关注' :
                 currentRecord.status === 'critical' ? '异常' : currentRecord.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
