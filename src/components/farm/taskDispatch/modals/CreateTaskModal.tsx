import { Modal, FormField, Input, Select } from '@/components/ui';
import { DictSelect } from '../../../common/settings/DictSelect';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: {
    taskId: string;
    types: string[];
    typeRemarks: string;
    field: string;
    crop: string;
    cropRemarks: string;
    areaRemarks: string;
    assignee: string;
    planStart: string;
    planEnd: string;
    priority: string;
    estimatedDays: number;
    estimatedHours: number;
  };
  errors: Record<string, string>;
  onFormChange: (field: string, value: any) => void;
  fields: { id: number; name: string; type: string; crop: string; area: number }[];
  staff: { id: number; name: string; status: string }[];
  taskTypes: { value: string; label: string }[];
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  errors,
  onFormChange,
  fields,
  staff,
  taskTypes,
}: CreateTaskModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新建农事任务"
      size="xl"
      onSubmit={onSubmit}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="任务编号" required error={errors.taskId}>
            <Input
              value={formData.taskId}
              onChange={(e) => onFormChange('taskId', e.target.value)}
              placeholder="系统自动生成"
            />
          </FormField>

          <FormField label="任务类型" required error={errors.types}>
            <Select
              value={formData.types[0] || ''}
              onChange={(e) => onFormChange('types', [e.target.value])}
              options={taskTypes.map(t => ({ value: t.value, label: t.label }))}
            />
          </FormField>

          <FormField label="温室/大田" required error={errors.field}>
            <Select
              value={formData.field}
              onChange={(e) => onFormChange('field', e.target.value)}
              options={fields.map(f => ({ value: f.name, label: `${f.name} - ${f.crop}` }))}
            />
          </FormField>

          <FormField label="作物" required error={errors.crop}>
            <Select
              value={formData.crop}
              onChange={(e) => onFormChange('crop', e.target.value)}
              options={fields.map(f => ({ value: f.crop, label: f.crop })).filter((v, i, a) => a.findIndex(t => t.value === v.value) === i)}
            />
          </FormField>

          <FormField label="执行人" required error={errors.assignee}>
            <Select
              value={formData.assignee}
              onChange={(e) => onFormChange('assignee', e.target.value)}
              options={staff.map(s => ({ value: s.name, label: s.name }))}
            />
          </FormField>

          <FormField label="优先级" required error={errors.priority}>
            <DictSelect
              category="task_priority"
              value={formData.priority}
              onChange={(value) => onFormChange('priority', value)}
              placeholder="选择优先级"
            />
          </FormField>

          <FormField label="计划开始时间" required error={errors.planStart}>
            <Input
              type="datetime-local"
              value={formData.planStart}
              onChange={(e) => onFormChange('planStart', e.target.value)}
            />
          </FormField>

          <FormField label="计划结束时间" required error={errors.planEnd}>
            <Input
              type="datetime-local"
              value={formData.planEnd}
              onChange={(e) => onFormChange('planEnd', e.target.value)}
            />
          </FormField>

          <FormField label="预计天数" error={errors.estimatedDays}>
            <Input
              type="number"
              value={formData.estimatedDays}
              onChange={(e) => onFormChange('estimatedDays', parseInt(e.target.value) || 0)}
              min={0}
            />
          </FormField>

          <FormField label="预计小时" error={errors.estimatedHours}>
            <Input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => onFormChange('estimatedHours', parseInt(e.target.value) || 0)}
              min={0}
            />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
