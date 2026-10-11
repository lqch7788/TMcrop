/**
 * 公告模板编辑弹窗
 * 支持创建和编辑公告模板
 *
 * 设计（2026-10-11 重构）：
 * - 模板 = 预设文本：选用模板时，标题/正文/优先级直接填入新公告，用户可再修改
 * - 已移除旧的变量占位符机制（{申请部门} 等：语义错位、无填值 UI、选用时不替换）
 * - 使用系统标准 Modal：拖动 / 8向缩放 / 最大化 / ESC 关闭
 */
import { useState, useEffect } from 'react';
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { Input } from '../../../../components/ui/input';
import { TextArea } from '../../../../components/ui/TextArea';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useDictionaryStore, getDictItems } from '../../../../stores/useDictionaryStore';
import type { AnnouncementTemplate } from '../../../../stores/useAnnouncementTemplateStore';

interface TemplateEditModalProps {
  isOpen: boolean;
  template: AnnouncementTemplate | null;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: any) => void;
}

/** 分类字典未加载时的兜底选项（与系统字典 announcement_category 保持一致） */
const CATEGORY_FALLBACK = ['行政通知', '培训通知', '采购通知', '活动通知', '制度修订', '生产公告'];

/** 默认优先级可选项（与公告 priority 取值一致） */
const PRIORITY_OPTIONS = ['高', '中', '低'];

export default function TemplateEditModal({ isOpen, template, mode, onClose, onSave }: TemplateEditModalProps) {
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    defaultPriority: '中',
    titleTemplate: '',
    content: '',
  });

  useEffect(() => {
    useDictionaryStore.getState().loadDictionaries();
  }, []);

  const categoryOptions = getDictItems('announcement_category').filter(d => d.status === 'active');
  // 历史模板的分类值可能不在字典中，补一个当前值选项，避免编辑时分类框显示为空
  const categoryLabels = categoryOptions.length > 0 ? categoryOptions.map(o => o.dictLabel) : CATEGORY_FALLBACK;
  const customCategory = formData.category && !categoryLabels.includes(formData.category) ? formData.category : null;

  // 初始化：编辑时回填模板数据
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && template) {
        setFormData({
          name: template.name || '',
          category: template.category || template.type || '',
          // 历史数据 default_priority 存的是 'normal' 等英文值，非法值统一回退为 '中'
          defaultPriority: PRIORITY_OPTIONS.includes(template.defaultPriority || '')
            ? (template.defaultPriority as string)
            : '中',
          titleTemplate: template.titleTemplate || '',
          content: template.content || '',
        });
      } else {
        setFormData({ name: '', category: '', defaultPriority: '中', titleTemplate: '', content: '' });
      }
    }
  }, [isOpen, template, mode]);

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSave({
      name: formData.name,
      category: formData.category,
      titleTemplate: formData.titleTemplate,
      content: formData.content,
      defaultPriority: formData.defaultPriority,
      status: template?.status || '启用',
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? '新增模板' : '编辑模板'}
      size="lg"
      showFooter
      onSubmit={handleSubmit}
      submitText={mode === 'add' ? '创建模板' : '保存修改'}
    >
      <div className="space-y-4">
        {/* 用途说明：让用户一眼看懂模板怎么用 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
          模板是预设的公告草稿。在「公告列表」发布公告时选用模板，标题与正文会自动填入，可再修改。
        </div>

        {/* 模板名称 */}
        <div>
          <Label className="text-gray-700">模板名称 <span className="text-red-500">*</span></Label>
          <Input
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="如：班前安全通知"
          />
        </div>

        {/* 公告分类 + 默认优先级 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">公告分类 <span className="text-red-500">*</span></Label>
            <Select
              value={formData.category}
              onValueChange={val => setFormData(prev => ({ ...prev, category: val }))}
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
            <Label className="text-gray-700">默认优先级</Label>
            <Select
              value={formData.defaultPriority}
              onValueChange={val => setFormData(prev => ({ ...prev, defaultPriority: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 公告标题预设 */}
        <div>
          <Label className="text-gray-700">公告标题</Label>
          <Input
            value={formData.titleTemplate}
            onChange={e => setFormData(prev => ({ ...prev, titleTemplate: e.target.value }))}
            placeholder="选用模板时填入新公告的标题，如：关于本周安全巡检的通知"
          />
        </div>

        {/* 公告正文预设 */}
        <div>
          <Label className="text-gray-700">公告正文</Label>
          <TextArea
            minRows={8}
            value={formData.content}
            onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="选用模板时填入新公告的正文内容"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
