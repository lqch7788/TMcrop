import { Modal, FormField, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { DatePicker } from '@/components/ui';
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
      size="xl"
      onSubmit={onSubmit}
    >
      <div className="space-y-4">
        <FormField label="选择员工" required>
          <Select
            value={formData.staffId}
            onValueChange={(val) => {
              const staff = staffList.find(s => s.id === val);
              onFormChange('staffId', val);
              onFormChange('staffName', staff?.name || '');
              onFormChange('workZone', staff?.workZone || '');
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择员工" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">请选择员工</SelectItem>
              {staffList.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} - {s.workZone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="选择班次" required>
          <Select
            value={formData.shift}
            onValueChange={(val) => onFormChange('shift', val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择班次" />
            </SelectTrigger>
            <SelectContent>
              {shiftConfigs.map(config => (
                <SelectItem key={config.name} value={config.name}>
                  {config.name} ({config.startTime}-{config.endTime})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="排班日期" required>
          <DatePicker
            selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
            onChange={(date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              onFormChange('date', `${year}-${month}-${day}`);
            }}
            className="w-full"
          />
        </FormField>
      </div>
    </Modal>
  );
}
