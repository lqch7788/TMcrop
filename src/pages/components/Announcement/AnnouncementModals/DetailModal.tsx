/**
 * 公告详情弹窗组件
 * 2026-10-11：迁移到系统标准 Modal（统一头部样式 + 拖动/8向缩放/最大化/ESC 由 Modal 提供）
 */
import { X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import type { Notice } from '../../../types/announcement.types';
import { getPriorityColor } from '../utils';

interface DetailModalProps {
  isOpen: boolean;
  notice: Notice | null;
  onClose: () => void;
}

export default function DetailModal({ isOpen, notice, onClose }: DetailModalProps) {
  if (!isOpen || !notice) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="公告详情"
      size="xl"
      showFooter
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4" /> 关闭</Button>
      }
    >
      <div className="space-y-4">
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 text-lg">📢</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{notice.title}</h4>
              <span className="text-sm text-gray-500 font-mono">{notice.code}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">类型</p>
              <p className="text-sm font-medium text-gray-900">{notice.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">优先级</p>
              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(notice.priority)}`}>{notice.priority}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">发布部门</p>
              <p className="text-sm font-medium text-gray-900">{notice.sender}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">发布日期</p>
              <p className="text-sm font-medium text-gray-900">{notice.date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">接收对象</p>
              <p className="text-sm font-medium text-gray-900">{notice.recipients}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">阅读数</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{notice.readCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">公告内容</p>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{notice.content}</p>
            </div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
