/**
 * 公告模板编辑弹窗
 * 支持创建和编辑公告模板
 * - 变量占位符按钮面板
 * - 实时预览面板
 */
import { useState, useEffect } from 'react';
import { Plus, Edit, FileText } from 'lucide-react';
import { useDictionaryStore, getDictItems } from '../../../../stores/useDictionaryStore';
import type { AnnouncementTemplate } from '../../../../stores/useAnnouncementTemplateStore';

interface TemplateEditModalProps {
  isOpen: boolean;
  template: AnnouncementTemplate | null;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: any) => void;
}

// 变量占位符定义
const VARIABLES = [
  { key: '{申请日期}', label: '申请日期' },
  { key: '{申请部门}', label: '申请部门' },
  { key: '{申请人}', label: '申请人' },
  { key: '{截止日期}', label: '截止日期' },
  { key: '{公告编号}', label: '公告编号' },
];

const SAMPLE_VALUES: Record<string, string> = {
  '{申请日期}': '2026-05-19',
  '{申请部门}': '生产部',
  '{申请人}': '陆启闯',
  '{截止日期}': '2026-05-26',
  '{公告编号}': 'GG20260519-001',
};

function getModalTitle(mode: 'add' | 'edit') {
  switch (mode) {
    case 'add': return { icon: <Plus className="w-5 h-5" />, text: '新增模板' };
    case 'edit': return { icon: <Edit className="w-5 h-5" />, text: '编辑模板' };
  }
}

export default function TemplateEditModal({ isOpen, template, mode, onClose, onSave }: TemplateEditModalProps) {
  const titleInfo = getModalTitle(mode);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    titleTemplate: '',
    content: '',
    priority: '中',
  });

  // 拖动
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });

  useEffect(() => {
    useDictionaryStore.getState().loadDictionaries();
  }, []);

  const categoryOptions = getDictItems('announcement_category').filter(d => d.status === 'active');

  // 初始化
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && template) {
        setFormData({
          name: template.name || '',
          category: template.category || (template as any).type || '',
          titleTemplate: (template as any).titleTemplate || (template as any).title_template || '',
          content: (template as any).contentTemplate || (template as any).content_template || '',
          priority: (template as any).priority || '中',
        });
      } else {
        setFormData({ name: '', category: '', titleTemplate: '', content: '', priority: '中' });
      }
    }
  }, [isOpen, template, mode]);

  // 点击变量占位符，插入到当前激活的输入框
  const insertVariable = (variable: string, field: 'titleTemplate' | 'content') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] + variable,
    }));
  };

  // 实时预览：替换变量占位符为示例值
  const getPreview = (text: string) => {
    let preview = text;
    Object.entries(SAMPLE_VALUES).forEach(([key, value]) => {
      preview = preview.split(key).join(value);
    });
    return preview;
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    const id = mode === 'add' ? `TPL_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : template?.id;
    onSave({
      id,
      code: mode === 'add' ? '' : (template?.code || ''),
      name: formData.name,
      category: formData.category,
      titleTemplate: formData.titleTemplate,
      contentTemplate: formData.content,
      priority: formData.priority,
      status: template?.status || '启用',
      usageCount: template?.usageCount || 0,
    });
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('template-edit-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dialog = document.getElementById('template-edit-dialog');
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div
        id="template-edit-dialog"
        className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        style={{ minWidth: '700px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-between cursor-move flex-shrink-0"
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* 模板名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模板名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入模板名称"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* 公告分类 + 默认优先级 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  公告分类 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">请选择分类</option>
                  {categoryOptions.length > 0 ? (
                    categoryOptions.map(opt => (
                      <option key={opt.dictCode} value={opt.dictLabel}>{opt.dictLabel}</option>
                    ))
                  ) : (
                    <>
                      <option value="生产计划">生产计划</option>
                      <option value="技术标准">技术标准</option>
                      <option value="行政通知">行政通知</option>
                      <option value="安全规范">安全规范</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认优先级</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </select>
              </div>
            </div>

            {/* 标题模板 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">标题模板</label>
                <div className="flex items-center gap-1">
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key, 'titleTemplate')}
                      className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formData.titleTemplate}
                onChange={e => setFormData(prev => ({ ...prev, titleTemplate: e.target.value }))}
                placeholder="支持变量占位符，如：关于{申请人}的{申请日期}工作计划"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* 正文模板 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">正文模板</label>
                <div className="flex items-center gap-1">
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key, 'content')}
                      className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={6}
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="支持变量占位符，如：{申请人}提交了一份关于...的公告，申请日期为{申请日期}"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {/* 预览面板 */}
            {((formData.titleTemplate || formData.content) && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">实时预览</span>
                </div>
                <div className="space-y-2">
                  {formData.titleTemplate && (
                    <div>
                      <p className="text-xs text-emerald-500 mb-1">标题预览：</p>
                      <p className="text-sm text-gray-900 font-medium bg-white rounded-lg px-3 py-2 border border-emerald-100">
                        {getPreview(formData.titleTemplate)}
                      </p>
                    </div>
                  )}
                  {formData.content && (
                    <div>
                      <p className="text-xs text-emerald-500 mb-1">正文预览：</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg px-3 py-2 border border-emerald-100">
                        {getPreview(formData.content)}
                      </p>
                    </div>
                  )}
                  {formData.priority && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-500">优先级：</span>
                      <span className="font-medium text-gray-900">{formData.priority}</span>
                    </div>
                  )}
                </div>
              </div>
            )) as any}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-300">取消</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            {mode === 'add' ? '创建模板' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
