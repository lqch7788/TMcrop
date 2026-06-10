import { useEffect, useMemo } from 'react';
import { Modal, FormField, Input, Select } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { useGreenhouseStore, useDictionaryStore, getDictItems } from '../../../../stores';
import { TextArea } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface CreateProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: {
    greenhouseId: string;
    greenhouseName: string;
    cropName: string;
    inspectorId: string;
    inspectorName: string;
    checkDate: string;
    checkTime: string;
    issueText: string;
    issueSeverity: '轻微' | '中等' | '严重';
  };
  errors: Record<string, string>;
  onFormChange: (field: string, value: string) => void;
}

export function CreateProblemModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  errors,
  onFormChange,
}: CreateProblemModalProps) {
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [greenhouses.length, loadGreenhouses, dictionaries.length, loadDictionaries]);

  // 作物类型选项（从字典获取）
  const cropTypeOptions = useMemo(() => {
    return getDictItems('crop_category').map(d => ({ value: d.dictLabel, label: d.dictLabel }));
  }, [dictionaries]);

  const handleGreenhouseChange = (greenhouseId: string) => {
    const greenhouse = greenhouses.find(g => g.id === greenhouseId);
    onFormChange('greenhouseId', greenhouseId);
    onFormChange('greenhouseName', greenhouse?.name || '');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增问题记录"
      size="xl"
      onSubmit={onSubmit}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="温室区域" required error={errors.greenhouseId}>
            <Select
              value={formData.greenhouseId}
              onChange={(e) => handleGreenhouseChange(e.target.value)}
              options={greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name }))}
            />
          </FormField>

          <FormField label="作物名称" required error={errors.cropName}>
            <Select
              value={formData.cropName}
              onChange={(e) => onFormChange('cropName', e.target.value)}
              options={cropTypeOptions}
            />
          </FormField>

          <FormField label="巡检人员" required error={errors.inspectorName}>
            <Input
              value={formData.inspectorName}
              onChange={(e) => onFormChange('inspectorName', e.target.value)}
              placeholder="输入巡检人员姓名"
            />
          </FormField>

          <FormField label="巡检日期" required error={errors.checkDate}>
            <DatePicker
              selected={formData.checkDate ? new Date(formData.checkDate) : undefined}
              onChange={(date) => onFormChange('checkDate', todayLocal(date))}
            />
          </FormField>

          <FormField label="巡检时间" required error={errors.checkTime}>
            <Input
              type="time"
              value={formData.checkTime}
              onChange={(e) => onFormChange('checkTime', e.target.value)}
            />
          </FormField>

          <FormField label="问题严重程度" required error={errors.issueSeverity}>
            <Select
              value={formData.issueSeverity}
              onChange={(e) => onFormChange('issueSeverity', e.target.value)}
              options={[
                { value: '轻微', label: '轻微' },
                { value: '中等', label: '中等' },
                { value: '严重', label: '严重' },
              ]}
            />
          </FormField>

          <div className="md:col-span-3">
            <FormField label="问题描述" required error={errors.issueText}>
              <TextArea
                value={formData.issueText}
                onChange={(e) => onFormChange('issueText', e.target.value)}
                placeholder="详细描述发现的问题..."
                className={`${deepInputClass} resize-none`}
                rows={3}
              />
            </FormField>
          </div>
        </div>
      </div>
    </Modal>
  );
}
