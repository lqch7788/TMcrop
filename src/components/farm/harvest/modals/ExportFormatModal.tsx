/**
 * 采收入库导出格式选择弹窗组件
 * 参照物料入库导出弹窗设计
 */

import React from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';

interface ExportFormatModalProps {
  isOpen: boolean;
  exportFileType: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount?: number;
}

export const ExportFormatModal: React.FC<ExportFormatModalProps> = ({
  isOpen,
  exportFileType,
  onChange,
  onClose,
  onConfirm,
  selectedCount = 0,
}) => {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="sm"
      showFooter={false}
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <div className="px-2">
        <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条采收入库记录</p>
        <div className="space-y-3">
          <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="exportType"
              value="xlsx"
              checked={exportFileType === 'xlsx'}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-emerald-600"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Excel (.xlsx)</p>
              <p className="text-xs text-gray-500">适用于数据分析和处理</p>
            </div>
          </label>
          <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="exportType"
              value="csv"
              checked={exportFileType === 'csv'}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-emerald-600"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">CSV (.csv)</p>
              <p className="text-xs text-gray-500">适用于数据交换</p>
            </div>
          </label>
          <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="exportType"
              value="word"
              checked={exportFileType === 'word'}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-emerald-600"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Word (.docx)</p>
              <p className="text-xs text-gray-500">适用于文档编辑和分享</p>
            </div>
          </label>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 px-2 flex justify-end gap-3">
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

export default ExportFormatModal;
