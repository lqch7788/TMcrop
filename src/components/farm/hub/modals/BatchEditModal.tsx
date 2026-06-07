import { Modal, FormField, Input, Select } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { ISSUE_CATEGORIES, COMPLETION_TIME_OPTIONS, WEATHER_OPTIONS } from '../../../../types/farm/common';

interface InspectionRecord {
  id: string;
  recordCode: string;
  inspectionType: 'farm' | 'equipment' | 'infrastructure' | 'other';
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  equipmentId?: string;
  equipmentName?: string;
  infrastructureId?: string;
  infrastructureName?: string;
  inspectorId: string;
  inspectorName: string;
  checkDate: string;
  checkTime?: string;
  weather: string;
  temperature: number;
  humidity: number;
  cropStatus?: string;
  plantHeight?: number;
  leafCount?: number;
  status: string;
  issues: string[];
  images: string[];
  remarks?: string;
  issueStatus?: 'pending' | 'processing' | 'resolved';
  duration?: number;
  // 新增字段
  issueCategories?: string[];
  issuePresets?: string[];
  issueText?: string;
  issuePhotos?: string[];
  feedbackUsers?: string[];
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
  equipmentRecords: { id: string; name: string }[];
  infrastructureRecords: { id: string; name: string; type: string }[];
}

// 天气选项（从常量文件导入）
const weatherOptions = WEATHER_OPTIONS;
const inspectionTypeOptions = [
  { value: 'farm', label: '种植区域巡查' },
  { value: 'equipment', label: '设备保养巡查' },
  { value: 'infrastructure', label: '基础设施巡检' },
  { value: 'other', label: '其他' },
];
const issueCategoryOptions = ISSUE_CATEGORIES.map(c => ({ value: c.value, label: c.label }));
const completionTimeOptions = COMPLETION_TIME_OPTIONS.map(t => ({ value: t.value, label: t.label }));

export function BatchEditModal({
  isOpen,
  selectedRows = [],
  records = [],
  editedRecordIds = [],
  editedRecords = {},
  selectedRecordId,
  onSelectedRecordIdChange,
  onEditedRecordsChange,
  onEditedRecordIdsChange,
  onClose,
  onConfirm,
  greenhouses = [],
  users = [],
  equipmentRecords = [],
  infrastructureRecords = [],
}: BatchEditModalProps) {
  const safeSelectedRows: number[] = selectedRows;
  const safeRecords: InspectionRecord[] = records;
  const safeEditedRecordIds: string[] = editedRecordIds;
  const safeEditedRecords: Record<string, Partial<InspectionRecord>> = editedRecords;

  const selectedRecords = safeSelectedRows.map(index => safeRecords[index]).filter(Boolean) as InspectionRecord[];
  const currentRecord = selectedRecordId ? safeRecords.find(r => r.id.toString() === selectedRecordId) : null;
  const editedData = selectedRecordId ? safeEditedRecords[selectedRecordId] || {} : {};

  const handleFieldChange = (field: keyof InspectionRecord, value: unknown) => {
    if (!selectedRecordId) return;
    const updated = {
      ...safeEditedRecords,
      [selectedRecordId]: { ...safeEditedRecords[selectedRecordId], [field]: value },
    };
    onEditedRecordsChange(updated);
    if (!safeEditedRecordIds.includes(selectedRecordId)) {
      onEditedRecordIdsChange([...safeEditedRecordIds, selectedRecordId]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑巡查记录"
      size="xxl"
      onSubmit={onConfirm}
      submitText="保存修改"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 信息提示 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{safeSelectedRows.length}</strong> 条记录进行批量编辑，
            已编辑 <strong>{safeEditedRecordIds.length}</strong> 条
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
                label: `${r.recordCode} - ${r.inspectorName} ${
                  safeEditedRecordIds.includes(r.id.toString()) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedRecordId && currentRecord && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 巡查编号 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">巡查编号</div>
              <div className="text-sm font-medium text-blue-600">{currentRecord.recordCode}</div>
            </div>

            {/* 巡查类型 - 可编辑 */}
            <FormField label="巡查类型">
              <Select
                value={editedData.inspectionType ?? currentRecord.inspectionType}
                onChange={(e) => handleFieldChange('inspectionType', e.target.value)}
                options={inspectionTypeOptions}
              />
            </FormField>

            {/* 巡查人员 - 可编辑 */}
            <FormField label="巡查人员">
              <Select
                value={editedData.inspectorId ?? currentRecord.inspectorId}
                onChange={(e) => handleFieldChange('inspectorId', e.target.value)}
                options={users.filter(u => u.role === 'technician' || u.role === 'supervisor').map(u => ({
                  value: u.id,
                  label: u.name,
                }))}
              />
            </FormField>

            {/* 巡查日期 - 可编辑 */}
            <FormField label="巡查日期">
              <DatePicker
                selected={(editedData.checkDate ?? currentRecord.checkDate) ? new Date((editedData.checkDate ?? currentRecord.checkDate)!) : undefined}
                onChange={(date) => handleFieldChange('checkDate', date.toISOString().split('T')[0])}
                placeholder="选择日期"
              />
            </FormField>

            {/* 天气 - 可编辑 */}
            <FormField label="天气">
              <Select
                value={editedData.weather ?? currentRecord.weather}
                onChange={(e) => handleFieldChange('weather', e.target.value)}
                options={weatherOptions}
              />
            </FormField>

            {/* 温度 - 可编辑 */}
            <FormField label="温度(°C)">
              <NumberInput
                value={editedData.temperature ?? currentRecord.temperature ?? ''}
                onChange={(val) => handleFieldChange('temperature', val)}
                onBlur={(val) => handleFieldChange('temperature', val)}
                placeholder="0.00"
              />
            </FormField>

            {/* 湿度 - 可编辑 */}
            <FormField label="湿度(%)">
              <NumberInput
                value={editedData.humidity ?? currentRecord.humidity ?? ''}
                onChange={(val) => handleFieldChange('humidity', val)}
                onBlur={(val) => handleFieldChange('humidity', val)}
                placeholder="0.00"
              />
            </FormField>

            {/* 巡查结果 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">巡查结果</div>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                currentRecord.status === 'normal' ? 'bg-emerald-100 text-emerald-700' :
                'bg-red-100 text-red-700'
              }`}>
                {currentRecord.status === 'normal' ? '正常' : '异常'}
              </span>
            </div>

            {/* 问题分类 - 可编辑 */}
            <FormField label="问题分类">
              <Select
                value={(editedData.issueCategories ?? currentRecord.issueCategories ?? [''])[0] || ''}
                onChange={(e) => handleFieldChange('issueCategories', e.target.value ? [e.target.value] : [])}
                options={[{ value: '', label: '请选择' }, ...issueCategoryOptions]}
              />
            </FormField>

            {/* 反馈人员 - 可编辑 */}
            <FormField label="反馈人员">
              <Select
                value={(editedData.feedbackUsers ?? currentRecord.feedbackUsers ?? [''])[0] || ''}
                onChange={(e) => handleFieldChange('feedbackUsers', e.target.value ? [e.target.value] : [])}
                options={[
                  { value: '', label: '请选择' },
                  ...users.filter(u => u.role === 'technician' || u.role === 'supervisor' || u.role === 'manager').map(u => ({
                    value: u.id,
                    label: u.name,
                  }))
                ]}
              />
            </FormField>

            {/* 问题描述 - 可编辑 */}
            <div className="col-span-2">
              <FormField label="问题描述">
                <Input
                  value={editedData.issueText ?? currentRecord.issueText ?? ''}
                  onChange={(e) => handleFieldChange('issueText', e.target.value)}
                  placeholder="请输入问题描述"
                />
              </FormField>
            </div>

            {/* 备注 - 可编辑 */}
            <div className="col-span-2">
              <FormField label="备注">
                <Input
                  value={editedData.remarks ?? currentRecord.remarks ?? ''}
                  onChange={(e) => handleFieldChange('remarks', e.target.value)}
                  placeholder="请输入备注"
                />
              </FormField>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
