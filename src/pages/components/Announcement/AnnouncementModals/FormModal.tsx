/**
 * 公告表单弹窗组件
 * 用于新增、编辑、发送公告
 * - 公告分类/优先级从数据字典读取
 * - 支持从模板快速创建（选用模板 → 标题/正文/优先级自动填入）
 *
 * 2026-10-11 重构：迁移系统标准 Modal（拖动/8向缩放/最大化/ESC 由 Modal 提供）
 */
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { TextArea } from '../../../../components/ui/TextArea';
import { Label } from '../../../../components/ui/label';
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import type { Notice } from '../../../types/announcement.types';
import type { AnnouncementTemplate } from '../../../../stores/useAnnouncementTemplateStore';
import { useDictionaryStore, getDictItems } from '../../../../stores/useDictionaryStore';
import TemplateSelectModal from './TemplateSelectModal';

interface FormModalProps {
  isOpen: boolean;
  notice: Notice | null;
  /** 从模板卡片"使用模板"进入时携带的模板（打开弹窗时预填） */
  templateToApply?: AnnouncementTemplate | null;
  mode: 'add' | 'edit' | 'send';
  onClose: () => void;
  onSave: (data: Partial<Notice>) => void;
}

/** 弹窗标题（按模式） */
const MODAL_TITLE: Record<'add' | 'edit' | 'send', string> = {
  add: '发布公告',
  edit: '编辑公告',
  send: '发布公告',
};

/** 分类字典未加载时的兜底选项（与系统字典 announcement_category 保持一致） */
const CATEGORY_FALLBACK = ['行政通知', '培训通知', '采购通知', '活动通知', '制度修订', '生产公告'];

/** 空表单初始值 */
const EMPTY_FORM = { title: '', category: '', priority: '中', recipients: '', deadline: '', content: '' };

/** 模板内容 → 公告表单字段（模板值为空时保留 base 原值）；"使用模板"与"从模板选择"共用 */
function applyTemplateToForm(template: AnnouncementTemplate, base: typeof EMPTY_FORM) {
  return {
    ...base,
    title: template.titleTemplate || template.name || base.title,
    category: template.category || base.category,
    priority: template.defaultPriority || base.priority,
    content: template.content || base.content,
  };
}

export default function FormModal({ isOpen, notice, templateToApply, mode, onClose, onSave }: FormModalProps) {
  const showWarning = mode === 'add' || mode === 'send';
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // 确保字典已加载
  useEffect(() => {
    useDictionaryStore.getState().loadDictionaries();
  }, []);

  // 从字典获取公告分类选项
  const categoryOptions = getDictItems('announcement_category').filter(d => d.status === 'active');
  // 历史数据的分类值可能不在字典中（如"生产计划""技术标准"），补一个当前值选项，避免编辑时分类框显示为空
  const categoryLabels = categoryOptions.length > 0 ? categoryOptions.map(o => o.dictLabel) : CATEGORY_FALLBACK;
  const customCategory = formData.category && !categoryLabels.includes(formData.category) ? formData.category : null;

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (templateToApply) {
        // 从模板卡片"使用模板"进入：模板内容预填，接收对象/截止日期留空由用户补充
        setFormData(applyTemplateToForm(templateToApply, { ...EMPTY_FORM }));
      } else if (notice) {
        setFormData({
          title: notice.title || '',
          category: notice.category || notice.type || '',
          priority: notice.priority || '中',
          recipients: notice.recipients || '',
          deadline: notice.deadline || '',
          content: notice.content || '',
        });
      } else {
        setFormData({ ...EMPTY_FORM });
      }
    }
  }, [isOpen, notice, templateToApply]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 从模板选择后回填表单（模板 = 预设文本，直接填入；可再编辑）
  const handleTemplateSelect = useCallback((template: AnnouncementTemplate) => {
    setFormData(prev => applyTemplateToForm(template, prev));
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

  // 模板选择弹窗打开时，忽略本弹窗的关闭请求（ESC 会同时触发两层 Modal 的关闭）
  const handleClose = useCallback(() => {
    if (showTemplateModal) return;
    onClose();
  }, [showTemplateModal, onClose]);

  return (
    <>
      <UnifiedModal
        isOpen={isOpen}
        onClose={handleClose}
        title={MODAL_TITLE[mode]}
        size="lg"
        showFooter
        onSubmit={handleSubmit}
        submitText={mode === 'send' ? '确认发布' : '保存'}
      >
        <div className="space-y-4">
          {/* 公告标题 */}
          <div>
            <Label className="text-gray-700">公告标题 <span className="text-red-500">*</span></Label>
            <Input
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="请输入公告标题"
            />
          </div>

          {/* 公告分类 + 优先级 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">公告分类 <span className="text-red-500">*</span></Label>
              <Select
                value={formData.category}
                onValueChange={val => handleChange('category', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.length > 0
                    ? categoryOptions.map(opt => (
                        <SelectItem key={opt.dictCode} value={opt.dictLabel}>{opt.dictLabel}</SelectItem>
                      ))
                    : CATEGORY_FALLBACK.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                  {customCategory && <SelectItem value={customCategory}>{customCategory}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">优先级 <span className="text-red-500">*</span></Label>
              <Select
                value={formData.priority}
                onValueChange={val => handleChange('priority', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="高">高</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="低">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 从模板选择（仅新增模式） */}
          {mode === 'add' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
              className="w-full"
            >
              <FileText className="w-4 h-4" />
              从模板选择
            </Button>
          )}

          {/* 接收对象 + 截止日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">接收对象</Label>
              <Input
                value={formData.recipients}
                onChange={e => handleChange('recipients', e.target.value)}
                placeholder="请输入接收对象"
              />
            </div>
            <div>
              <Label className="text-gray-700">截止日期</Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={e => handleChange('deadline', e.target.value)}
              />
            </div>
          </div>

          {/* 公告内容 */}
          <div>
            <Label className="text-gray-700">公告内容 <span className="text-red-500">*</span></Label>
            <TextArea
              minRows={6}
              value={formData.content}
              onChange={e => handleChange('content', e.target.value)}
              placeholder="请输入公告内容"
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
      </UnifiedModal>

      {/* 模板选择弹窗 */}
      <TemplateSelectModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
    </>
  );
}
