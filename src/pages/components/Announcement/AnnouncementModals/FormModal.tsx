/**
 * 公告表单弹窗组件（增强版）
 * 用于新增、编辑、发送公告
 * - 公告类型/分类从数据字典读取
 * - 支持从模板快速创建
 * - 头部支持鼠标拖动
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Send, AlertTriangle, FileText } from 'lucide-react';
import type { Notice } from '../../../types/announcement.types';
import { useDictionaryStore, getDictItems } from '../../../../stores/useDictionaryStore';
import TemplateSelectModal from './TemplateSelectModal';

interface FormModalProps {
  isOpen: boolean;
  notice: Notice | null;
  mode: 'add' | 'edit' | 'send';
  onClose: () => void;
  onSave: (data: Partial<Notice>) => void;
}

function getModalTitle(mode: 'add' | 'edit' | 'send'): { icon: JSX.Element; text: string } {
  switch (mode) {
    case 'add': return { icon: <Plus className="w-5 h-5" />, text: '发布公告' };
    case 'edit': return { icon: <Edit className="w-5 h-5" />, text: '编辑公告' };
    case 'send': return { icon: <Send className="w-5 h-5" />, text: '发布公告' };
    default: return { icon: <Plus className="w-5 h-5" />, text: '发布公告' };
  }
}

export default function FormModal({ isOpen, notice, mode, onClose, onSave }: FormModalProps) {
  const titleInfo = getModalTitle(mode);
  const showWarning = mode === 'add' || mode === 'send';
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    priority: '中',
    recipients: '',
    deadline: '',
    content: '',
  });

  // 拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });

  // 确保字典已加载
  useEffect(() => {
    useDictionaryStore.getState().loadDictionaries();
  }, []);

  // 从字典获取公告分类选项
  const categoryOptions = getDictItems('announcement_category').filter(d => d.status === 'active');

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (notice) {
        setFormData({
          title: notice.title || '',
          category: notice.category || notice.type || '',
          priority: notice.priority || '中',
          recipients: notice.recipients || '',
          deadline: notice.deadline || '',
          content: notice.content || '',
        });
      } else {
        setFormData({ title: '', category: '', priority: '中', recipients: '', deadline: '', content: '' });
      }
    }
  }, [isOpen, notice]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 从模板选择后回填表单
  const handleTemplateSelect = useCallback((template: any) => {
    setFormData(prev => ({
      ...prev,
      title: template.titleTemplate || template.title || template.name || prev.title,
      category: template.category || prev.category,
      priority: template.priority || prev.priority,
      content: template.contentTemplate || template.content || prev.content,
    }));
    setShowTemplateModal(false);
  }, []);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const sender = localStorage.getItem('username') || '陆启闯';
    onSave({
      id: mode === 'add' ? `ANN_${Date.now()}` : notice?.id,
      ...formData,
      sender,
      date: notice?.date || today,
      status: notice?.status || '草稿',
      readCount: notice?.readCount || 0,
    });
  };

  // 拖动事件
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('announcement-form-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dialog = document.getElementById('announcement-form-dialog');
      if (dialog) {
        dialog.style.position = 'fixed';
        dialog.style.left = `${dragStart.left + e.clientX - dragStart.x}px`;
        dialog.style.top = `${dragStart.top + e.clientY - dragStart.y}px`;
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
        <div
          id="announcement-form-dialog"
          className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
          style={{ minWidth: '640px', minHeight: '400px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 — 可拖动 */}
          <div
            className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-between cursor-move"
            onMouseDown={handleDragStart}
          >
            <h3 className="font-semibold flex items-center gap-2 select-none">
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
              {/* 公告标题 */}
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

              {/* 公告分类 + 优先级 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公告分类 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => handleChange('category', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">请选择分类</option>
                    {categoryOptions.length > 0 ? (
                      categoryOptions.map(opt => (
                        <option key={opt.dictCode} value={opt.dictLabel}>{opt.dictLabel}</option>
                      ))
                    ) : (
                      <>
                        <option value="行政通知">行政通知</option>
                        <option value="培训通知">培训通知</option>
                        <option value="采购通知">采购通知</option>
                        <option value="活动通知">活动通知</option>
                        <option value="制度修订">制度修订</option>
                        <option value="生产公告">生产公告</option>
                      </>
                    )}
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

              {/* 从模板选择（仅新增模式） */}
              {mode === 'add' && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="w-full px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    从模板选择
                  </button>
                </div>
              )}

              {/* 接收对象 + 截止日期 */}
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

              {/* 公告内容 */}
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

              {/* 发布警告 */}
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

      {/* 模板选择弹窗 */}
      <TemplateSelectModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
    </>
  );
}
