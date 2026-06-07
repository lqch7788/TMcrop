import React from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';

interface ExportTypeModalProps {
  isOpen: boolean;
  exportFileType: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const ExportTypeModal: React.FC<ExportTypeModalProps> = ({
  isOpen,
  exportFileType,
  onChange,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const formats = [
    { value: 'xlsx', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onConfirm}>
            确认导出
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {formats.map((format) => (
          <div
            key={format.value}
            onClick={() => onChange(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFileType === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                exportFileType === format.value ? 'border-emerald-500' : 'border-gray-400'
              }`}
            >
              {exportFileType === format.value && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-900">{format.label}</span>
              <span className="block text-xs text-gray-500">{format.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </UnifiedModal>
  );
};

export default ExportTypeModal;
