/**
 * 公告表单弹窗组件
 * 用于新增、编辑、发送公告
 */
import { Plus, Edit, Send, AlertTriangle } from 'lucide-react';
import type { Notice } from '../../../types/announcement.types';
import { useToast } from '../../../../contexts/ToastContext';

interface FormModalProps {
  isOpen: boolean;
  notice: Notice | null;
  mode: 'add' | 'edit' | 'send';
  onClose: () => void;
}

// 获取弹窗标题
function getModalTitle(mode: 'add' | 'edit' | 'send'): { icon: JSX.Element; text: string } {
  switch (mode) {
    case 'add':
      return { icon: <Plus className="w-5 h-5" />, text: '发布公告' };
    case 'edit':
      return { icon: <Edit className="w-5 h-5" />, text: '编辑公告' };
    case 'send':
      return { icon: <Send className="w-5 h-5" />, text: '发布公告' };
    default:
      return { icon: <Plus className="w-5 h-5" />, text: '发布公告' };
  }
}

export default function FormModal({ isOpen, notice, mode, onClose }: FormModalProps) {
  const { toast } = useToast();

  if (!isOpen) return null;

  const titleInfo = getModalTitle(mode);
  const showWarning = mode === 'add' || mode === 'send';

  const handleSave = () => {
    onClose();
    toast.success(mode === 'send' ? '发布成功' : '保存成功');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            {titleInfo.icon}
            {titleInfo.text}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公告标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                defaultValue={notice?.title || ''}
                placeholder="请输入公告标题"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  公告类型 <span className="text-red-500">*</span>
                </label>
                <select
                  defaultValue={notice?.type || '生产公告'}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="生产公告">生产公告</option>
                  <option value="行政公告">行政公告</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  优先级 <span className="text-red-500">*</span>
                </label>
                <select
                  defaultValue={notice?.priority || '中'}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接收对象</label>
                <input
                  type="text"
                  defaultValue={notice?.recipients || ''}
                  placeholder="请输入接收对象"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                <input
                  type="date"
                  defaultValue={notice?.deadline || ''}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公告内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={6}
                defaultValue={notice?.content || ''}
                placeholder="请输入公告内容"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>
            {showWarning && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-700">发布公告后将立即推送给所有接收对象，请确认内容无误</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-300">取消</button>
          <button onClick={handleSave} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            {mode === 'send' ? '确认发布' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
