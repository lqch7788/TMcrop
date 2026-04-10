import React from 'react';
import { UnifiedModal } from '../../ui/UnifiedModal';

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
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出文件类型"
      size="sm"
      showFooter={false}
    >
      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="exportType"
            value="xlsx"
            checked={exportFileType === 'xlsx'}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 text-emerald-600"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Excel 文件 (.xlsx)</span>
          </div>
        </label>
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="exportType"
            value="csv"
            checked={exportFileType === 'csv'}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 text-emerald-600"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">CSV 文件 (.csv)</span>
          </div>
        </label>
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="exportType"
            value="word"
            checked={exportFileType === 'word'}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 text-emerald-600"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Word 文件 (.doc)</span>
          </div>
        </label>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          确认导出
        </button>
      </div>
    </UnifiedModal>
  );
};

export default ExportTypeModal;
console.log('组件创建成功: ExportTypeModal');
