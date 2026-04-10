import { X } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { WorkLogDetailModalProps } from './types';

/**
 * 工作日志详情弹窗组件
 */
export function WorkLogDetailModal({ log, open, onClose }: WorkLogDetailModalProps) {
  if (!open || !log) return null;

  const content = (
    <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">日志编号</label>
          <p className="text-sm text-gray-900">{log.code}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">日期</label>
          <p className="text-sm text-gray-900">{log.date}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">工人姓名</label>
          <p className="text-sm text-gray-900">{log.worker}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">天气</label>
          <p className="text-sm text-gray-900">{log.weather}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">温度</label>
          <p className="text-sm text-gray-900">{log.temperature}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">作物</label>
          <p className="text-sm text-gray-900">{log.crop}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">大棚</label>
          <p className="text-sm text-gray-900">{log.greenhouse}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">生长状况</label>
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              log.growthStatus === '良好'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {log.growthStatus}
          </span>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-500 mb-1">工作内容</label>
          <p className="text-sm text-gray-900">{log.tasks}</p>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-500 mb-1">问题描述</label>
          <p className="text-sm text-gray-900">{log.problems}</p>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-500 mb-1">处理措施</label>
          <p className="text-sm text-gray-900">{log.solutions}</p>
        </div>
      </div>
    </div>
  );

  const footer = (
    <button
      onClick={onClose}
      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
    >
      关闭
    </button>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="日志详情"
      size="md"
      showFooter={true}
      headerAction={
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
