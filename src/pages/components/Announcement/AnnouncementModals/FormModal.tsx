/**
 * 公告表单弹窗组件
 * 用于新增、编辑、发送公告
 */
import { useState, useEffect } from 'react';
import { Plus, Edit, Send, AlertTriangle } from 'lucide-react';
import type { Notice } from '../../../types/announcement.types';

interface FormModalProps {
  isOpen: boolean;
  notice: Notice | null;
  mode: 'add' | 'edit' | 'send';
  onClose: () => void;
  onSave: (data: Partial<Notice>) => void;
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

export default function FormModal({ isOpen, notice, mode, onClose, onSave }: FormModalProps) {
  const titleInfo = getModalTitle(mode);
  const showWarning = mode === 'add' || mode === 'send';

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    type: '生产公告',
    priority: '中',
    recipients: '',
    deadline: '',
    content: '',
  });

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (notice) {
        setFormData({
          title: notice.title || '',
          type: notice.type || '生产公告',
          priority: notice.priority || '中',
          recipients: notice.recipients || '',
          deadline: notice.deadline || '',
          content: notice.content || '',
        });
      } else {
        setFormData({
          title: '',
          type: '生产公告',
          priority: '中',
          recipients: '',
          deadline: '',
          content: '',
        });
      }
    }
  }, [isOpen, notice]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-between">
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
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="请输入公告标题"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  公告类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={e => handleChange('type', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
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
                  value={formData.priority}
                  onChange={e => handleChange('priority', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
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
                  value={formData.recipients}
                  onChange={e => handleChange('recipients', e.target.value)}
                  placeholder="请输入接收对象"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={e => handleChange('deadline', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公告内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={6}
                value={formData.content}
                onChange={e => handleChange('content', e.target.value)}
                placeholder="请输入公告内容"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
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
          <button onClick={handleSubmit} className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            {mode === 'send' ? '确认发布' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
