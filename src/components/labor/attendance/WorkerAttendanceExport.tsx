/**
 * 工人考勤 - 导出功能组件
 */
import { X } from 'lucide-react';
import { ExportFormat, EXPORT_FORMAT_OPTIONS } from './types';

interface WorkerAttendanceExportProps {
  show: boolean;
  selectedCount: number;
  exportFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onConfirm: () => void;
  onCancel: () => void;
  // 权限控制props
  canExport?: boolean;
}

export function WorkerAttendanceExport({
  show,
  selectedCount,
  exportFormat,
  onFormatChange,
  onConfirm,
  onCancel,
  canExport = true,
}: WorkerAttendanceExportProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50" onClick={onCancel}></div>

      {/* 模态框 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
            <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 内容 */}
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
            <div className="space-y-3">
              {EXPORT_FORMAT_OPTIONS.map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === format.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => onFormatChange(e.target.value as ExportFormat)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{format.label}</p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            {canExport && (
              <button
                onClick={onConfirm}
                className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                导出
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
