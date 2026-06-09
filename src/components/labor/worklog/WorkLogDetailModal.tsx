import { X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import type { WorkLogDetailModalProps } from './types';
import { Label } from '@/components/ui';

/**
 * 工作日志详情弹窗组件
 */
export function WorkLogDetailModal({ log, open, onClose }: WorkLogDetailModalProps) {
  if (!open || !log) return null;

  const content = (
    <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">日志编号</Label>
          <p className="text-sm text-gray-900">{log.code}</p>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">日期</Label>
          <p className="text-sm text-gray-900">{log.date}</p>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">工人姓名</Label>
          <p className="text-sm text-gray-900">{log.worker}</p>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">天气</Label>
          <p className="text-sm text-gray-900">{log.weather}</p>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">温度</Label>
          <p className="text-sm text-gray-900">{log.temperature}</p>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">作物</Label>
          <p className="text-sm text-gray-900">{log.crop}</p>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">大棚</Label>
          <p className="text-sm text-gray-900">{log.greenhouse}</p>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-500 mb-1">生长状况</Label>
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
          <Label className="block text-sm font-medium text-gray-500 mb-1">工作内容</Label>
          <p className="text-sm text-gray-900">{log.tasks}</p>
        </div>
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-500 mb-1">问题描述</Label>
          <p className="text-sm text-gray-900">{log.problems}</p>
        </div>
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-500 mb-1">处理措施</Label>
          <p className="text-sm text-gray-900">{log.solutions}</p>
        </div>
      </div>
    </div>
  );

  const footer = (
    <Button variant="secondary" onClick={onClose}>
      <X className="w-4 h-4" /> 关闭
    </Button>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="日志详情"
      size="md"
      showFooter={true}
      headerAction={
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
