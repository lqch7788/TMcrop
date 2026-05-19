/**
 * 公告详情弹窗组件
 * 支持：绿色标题栏、鼠标拖动、右下角缩放、最大化/还原
 */
import { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { Notice } from '../../../types/announcement.types';
import { getPriorityColor } from '../utils';

interface DetailModalProps {
  isOpen: boolean;
  notice: Notice | null;
  onClose: () => void;
}

export default function DetailModal({ isOpen, notice, onClose }: DetailModalProps) {
  // 弹窗大小调整状态
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  // 弹窗拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });

  // 鼠标按下准备拖动弹窗（仅标题栏）
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('announcement-detail-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  };

  // 鼠标移动拖动弹窗
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const dialog = document.getElementById('announcement-detail-dialog');
      if (dialog) {
        dialog.style.position = 'fixed';
        dialog.style.left = `${dragStart.left + deltaX}px`;
        dialog.style.top = `${dragStart.top + deltaY}px`;
        dialog.style.margin = '0';
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // 鼠标按下准备调整大小（右下角）
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const dialog = document.getElementById('announcement-detail-dialog');
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: dialog?.clientWidth || 0,
      height: dialog?.clientHeight || 0,
    });
  };

  // 鼠标移动调整大小
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(640, resizeStart.width + deltaX);
      const newHeight = Math.max(400, resizeStart.height + deltaY);
      const dialog = document.getElementById('announcement-detail-dialog');
      if (dialog) {
        dialog.style.width = `${newWidth}px`;
        dialog.style.maxWidth = 'none';
        dialog.style.height = `${newHeight}px`;
        dialog.style.maxHeight = 'none';
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart]);

  // 最大化/还原切换
  const toggleMaximize = () => {
    const dialog = document.getElementById('announcement-detail-dialog');
    if (!isMaximized && dialog) {
      dialog.style.width = '100vw';
      dialog.style.height = '100vh';
      dialog.style.maxWidth = 'none';
      dialog.style.maxHeight = 'none';
      dialog.style.borderRadius = '0';
    } else if (dialog) {
      dialog.style.width = '';
      dialog.style.height = '';
      dialog.style.maxWidth = '';
      dialog.style.maxHeight = '';
      dialog.style.borderRadius = '';
    }
    setIsMaximized(!isMaximized);
  };

  if (!isOpen || !notice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div
        id="announcement-detail-dialog"
        className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[85vh] flex flex-col relative"
        style={{ minWidth: '640px', minHeight: '400px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 右下角缩放拖动条 */}
        {!isMaximized && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-10"
            onMouseDown={handleResizeStart}
          >
            <svg className="w-full h-full text-gray-300 hover:text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>
        )}

        {/* 头部 — 绿色渐变，可拖动 */}
        <div
          className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-between rounded-t-xl cursor-move flex-shrink-0"
          onMouseDown={handleDragStart}
        >
          <h3 className="font-semibold flex items-center gap-2 select-none">
            <Eye className="w-5 h-5" />
            公告详情
          </h3>
          <div className="flex items-center gap-1">
            {/* 最大化/还原按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMaximize}
              className="text-white/80 hover:text-white hover:bg-white/10"
              title={isMaximized ? '还原' : '最大化'}
            >
              {isMaximized ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 4v2a2 2 0 002 2h2m8 0h2a2 2 0 002-2v-2m0-4V6a2 2 0 00-2-2h-2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </Button>
            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto flex-1">
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
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0 rounded-b-xl">
          <Button variant="secondary" size="sm" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}
