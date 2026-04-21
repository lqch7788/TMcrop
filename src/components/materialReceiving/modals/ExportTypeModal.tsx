import React from 'react';
import { X } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* 内容区域 */}
        <div className="p-6">
          <div className="space-y-3">
            {[
              { value: 'xlsx', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
              { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
              { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
            ].map((format) => (
              <label
                key={format.value}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  exportFileType === format.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value={format.value}
                  checked={exportFileType === format.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">{format.label}</span>
                  <span className="block text-xs text-gray-500">{format.desc}</span>
                </div>
              </label>
            ))}
          </div>
          {/* 底部按钮 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 h-10 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              确认导出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportTypeModal;
console.log('组件创建成功: ExportTypeModal');
