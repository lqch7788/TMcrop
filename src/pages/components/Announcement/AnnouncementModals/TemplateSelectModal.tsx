/**
 * 公告模板选择弹窗
 * 从模板库中选择模板快速创建公告
 * - 卡片式展示模板列表
 * - 支持按类型/分类筛选
 * - 点击选择后回填到公告表单
 */
import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useAnnouncementTemplateStore } from '../../../../stores/useAnnouncementTemplateStore';
import { useDictionaryStore, getDictItems } from '../../../../stores/useDictionaryStore';

interface TemplateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: any) => void;
}

export default function TemplateSelectModal({ isOpen, onClose, onSelect }: TemplateSelectModalProps) {
  const { templates, fetchTemplates, isLoading } = useAnnouncementTemplateStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');

  // 加载模板和字典数据
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      useDictionaryStore.getState().loadDictionaries();
    }
  }, [isOpen, fetchTemplates]);

  // 字典类型选项
  const typeOptions = getDictItems('announcement_type').filter(d => d.status === 'active');

  // 筛选
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchType = typeFilter === '全部' || t.type === typeFilter;
      const matchSearch = !searchKeyword ||
        t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (t.type || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(searchKeyword.toLowerCase());
      return matchType && matchSearch;
    });
  }, [templates, typeFilter, searchKeyword]);

  // 类型选项（合并字典 + 模板实际类型）
  const allTypes = useMemo(() => {
    const set = new Set<string>(['全部']);
    typeOptions.forEach(opt => set.add(opt.dictLabel));
    templates.forEach(t => { if (t.type) set.add(t.type); });
    return Array.from(set);
  }, [typeOptions, templates]);

  const handleSelect = (template: any) => {
    onSelect(template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            从模板选择
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索模板名称..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={val => setTypeFilter(val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 模板卡片列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
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
                  className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer"
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
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      {template.type}
                    </span>
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

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>取消</Button>
        </div>
      </div>
    </div>
  );
}
