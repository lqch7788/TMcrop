import React from 'react';

interface ExportTypeModalProps {
  exportFileType: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExportTypeModal: React.FC<ExportTypeModalProps> = ({
  exportFileType,
  onChange,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">选择导出文件类型</h3>
        </div>
        <div className="p-6">
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
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
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
      </div>
    </div>
  );
};

export default ExportTypeModal;
console.log('组件创建成功: ExportTypeModal');
