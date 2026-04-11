import { Modal, FormField, Input, Select } from '../../../ui/Modal';
import type { ShiftType } from '../types';

interface ScheduleAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: {
    staffId: string;
    staffName: string;
    date: string;
    shift: ShiftType;
    workZone: string;
  };
  staffList: { id: string; name: string; workZone: string }[];
  shiftConfigs: { name: ShiftType; startTime: string; endTime: string }[];
  onFormChange: (field: string, value: unknown) => void;
}

export function ScheduleAddModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  staffList,
  shiftConfigs,
  onFormChange,
}: ScheduleAddModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增排班"
      size="md"
      onSubmit={onSubmit}
    >
      <div className="space-y-4">
        <FormField label="选择员工" required>
          <Select
            value={formData.staffId}
            onChange={(e) => {
              const staff = staffList.find(s => s.id === e.target.value);
              onFormChange('staffId', e.target.value);
              onFormChange('staffName', staff?.name || '');
              onFormChange('workZone', staff?.workZone || '');
            }}
            options={[
              { value: '', label: '请选择员工' },
              ...staffList.map(s => ({ value: s.id, label: `${s.name} - ${s.workZone}` })),
            ]}
          />
        </FormField>

        <FormField label="选择班次" required>
          <Select
            value={formData.shift}
            onChange={(e) => onFormChange('shift', e.target.value)}
            options={shiftConfigs.map(config => ({
              value: config.name,
              label: `${config.name} (${config.startTime}-${config.endTime})`,
            }))}
          />
        </FormField>

        <FormField label="排班日期" required>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => onFormChange('date', e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}
