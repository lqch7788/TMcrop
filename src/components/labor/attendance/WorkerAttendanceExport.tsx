/**
 * 工人考勤 - 导出功能组件
 */
import { UnifiedModal } from '@/components/ui';
import { Download, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { ExportFormat, EXPORT_FORMAT_OPTIONS } from './types';
import { Label } from '@/components/ui';

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
    <UnifiedModal
      isOpen={show}
      onClose={onCancel}
      title="选择导出格式"
      size="sm"
      showFooter={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">已选择 {selectedCount} 条数据</p>
        <div className="space-y-3">
          {EXPORT_FORMAT_OPTIONS.map((format) => (
            <Label
              key={format.value}
              onClick={() => onFormatChange(format.value)}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                exportFormat === format.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-400'}`}>
                {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{format.label}</p>
                <p className="text-xs text-gray-500">{format.desc}</p>
              </div>
            </Label>
          ))}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button size="sm" variant="secondary" onClick={onCancel}>
          <X className="w-4 h-4" /> 取消
        </Button>
        {canExport && (
          <Button size="sm" variant="default" onClick={onConfirm}>
            <Download className="w-4 h-4" /> 导出
          </Button>
        )}
      </div>
    </UnifiedModal>
  );
}
