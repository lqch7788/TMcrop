/**
 * 公告详情弹窗组件
 */
import { Eye } from 'lucide-react';
import type { Notice } from '../../../types/announcement.types';
import { getPriorityColor } from '../../../hooks/useAnnouncement';

interface DetailModalProps {
  isOpen: boolean;
  notice: Notice | null;
  onClose: () => void;
}

export default function DetailModal({ isOpen, notice, onClose }: DetailModalProps) {
  if (!isOpen || !notice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5" />
            公告详情
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📢</span>
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
                  <p className="text-sm text-gray-700">{notice.content}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-300">关闭</button>
        </div>
      </div>
    </div>
  );
}
