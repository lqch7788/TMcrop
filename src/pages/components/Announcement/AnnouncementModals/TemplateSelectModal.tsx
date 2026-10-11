/**
 * 公告模板选择弹窗
 * 从模板库中选择模板快速创建公告（选用后标题/正文/优先级自动填入公告表单）
 *
 * 2026-10-11 重构：
 * - 迁移系统标准 Modal（拖动/缩放/最大化/ESC）
 * - 筛选由"类型"改为"分类"（模板的 type 与 category 是同一值，原双筛选属重复）
 * - 选用模板时调用 recordTemplateUsage 递增使用次数
 */
import { useState, useEffect, useMemo } from 'react';
import { FileText, Search } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useAnnouncementTemplateStore } from '../../../../stores/useAnnouncementTemplateStore';
import { useDictionaryStore, getDictItems } from '../../../../stores/useDictionaryStore';

interface TemplateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: any) => void;
}

export default function TemplateSelectModal({ isOpen, onClose, onSelect }: TemplateSelectModalProps) {
  const templates = useAnnouncementTemplateStore(s => s.templates);
  const fetchTemplates = useAnnouncementTemplateStore(s => s.fetchTemplates);
  const recordTemplateUsage = useAnnouncementTemplateStore(s => s.recordTemplateUsage);
  const isLoading = useAnnouncementTemplateStore(s => s.isLoading);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');

  // 加载模板和字典数据
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      useDictionaryStore.getState().loadDictionaries();
    }
  }, [isOpen, fetchTemplates]);

  // 分类选项（字典 + 模板实际分类合并）
  const categoryDictOptions = getDictItems('announcement_category').filter(d => d.status === 'active');
  const allCategories = useMemo(() => {
    const set = new Set<string>(['全部']);
    categoryDictOptions.forEach(opt => set.add(opt.dictLabel));
    templates.forEach(t => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [categoryDictOptions, templates]);

  // 筛选
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchCategory = categoryFilter === '全部' || t.category === categoryFilter;
      const matchSearch = !searchKeyword ||
        t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(searchKeyword.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [templates, categoryFilter, searchKeyword]);

  const handleSelect = (template: any) => {
    onSelect(template);
    // 选用即记一次使用（失败不阻塞主流程，store 内部已记录日志）
    recordTemplateUsage(template.id);
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="从模板选择"
      size="xl"
      showFooter
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>取消</Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* 筛选栏 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索模板名称..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <Select value={categoryFilter} onValueChange={val => setCategoryFilter(val)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 模板卡片列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mb-4" />
            <p className="text-sm">暂无可用模板</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => handleSelect(template)}
                className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-emerald-400 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">{template.name}</h4>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    template.status === '启用' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {template.status === '启用' ? '启用' : '停用'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {template.category && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                      {template.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  使用次数：{template.usageCount || 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
