/**
 * 公告管理页面（V2.1 架构）
 * 双TAB：公告列表 + 公告模板
 * 数据流：useAnnouncementDataStore / useAnnouncementTemplateStore → 组件
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Download, Edit, Edit2, FileText, Megaphone, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { useAnnouncementDataStore } from '../stores/useAnnouncementDataStore';
import { useAnnouncementTemplateStore, type AnnouncementTemplate } from '../stores/useAnnouncementTemplateStore';
import { useDictionaryStore, getDictItems } from '../stores/useDictionaryStore';
import { useToast } from '../contexts/ToastContext';
import { logger } from '../lib/logger';
import AnnouncementFilters from './components/Announcement/AnnouncementFilters';
import AnnouncementTable from './components/Announcement/AnnouncementTable';
import DetailModal from './components/Announcement/AnnouncementModals/DetailModal';
import FormModal from './components/Announcement/AnnouncementModals/FormModal';
import DeleteModal from './components/Announcement/AnnouncementModals/DeleteModal';
import ExportModal from './components/Announcement/AnnouncementModals/ExportModal';
import TemplateEditModal from './components/Announcement/AnnouncementModals/TemplateEditModal';
import type { Notice } from './types/announcement.types';

export default function Announcement() {
  const { toast } = useToast();
  const noticeStore = useAnnouncementDataStore();
  const templateStore = useAnnouncementTemplateStore();
  const { items, isLoading } = noticeStore;
  const { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, isLoading: templateLoading } = templateStore;

  // TAB 状态
  const [activeTab, setActiveTab] = useState('list');

  // 公告列表数据加载
  useEffect(() => {
    noticeStore.fetchItems();
  }, []);

  // 模板数据加载（切换到模板TAB时）
  useEffect(() => {
    if (activeTab === 'template') {
      fetchTemplates();
      useDictionaryStore.getState().loadDictionaries();
    }
  }, [activeTab, fetchTemplates]);

  // === 公告列表状态 ===
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'send'>('view');
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportMode, setExportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // === 模板TAB状态 ===
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('全部');
  const [templateCatFilter, setTemplateCatFilter] = useState('全部');
  const [showTemplateEdit, setShowTemplateEdit] = useState(false);
  const [templateEditMode, setTemplateEditMode] = useState<'add' | 'edit'>('add');
  const [selectedTemplate, setSelectedTemplate] = useState<AnnouncementTemplate | null>(null);

  // === 公告列表计算 ===
  const stats = useMemo(() => {
    const total = items.length;
    const published = items.filter(i => i.status === '已发布').length;
    const pending = items.filter(i => i.status === '审批中').length;
    const draft = items.filter(i => i.status === '草稿').length;
    return { total, published, pending, draft };
  }, [items]);

  const filteredNotices = useMemo(() => {
    return items.filter((n: any) => {
      const matchType = typeFilter === '全部' || n.type === typeFilter;
      const matchSearch = !searchKeyword ||
        (n.title || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (n.code || '').toLowerCase().includes(searchKeyword.toLowerCase());
      return matchType && matchSearch;
    });
  }, [items, typeFilter, searchKeyword]);

  const totalPages = useMemo(() => Math.ceil(filteredNotices.length / pageSize), [filteredNotices.length, pageSize]);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedNotices = useMemo(() =>
    filteredNotices.slice(startIndex, startIndex + pageSize),
    [filteredNotices, startIndex, pageSize]
  );

  // === 模板TAB计算 ===
  const typeOptions = getDictItems('announcement_type').filter(d => d.status === 'active');
  const categoryOptions = getDictItems('announcement_category').filter(d => d.status === 'active');
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchType = templateTypeFilter === '全部' || t.type === templateTypeFilter;
      const matchCat = templateCatFilter === '全部' || t.category === templateCatFilter;
      const matchSearch = !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase());
      return matchType && matchCat && matchSearch;
    });
  }, [templates, templateTypeFilter, templateCatFilter, templateSearch]);

  const allTypes = useMemo(() => {
    const set = new Set<string>(['全部']);
    typeOptions.forEach(opt => set.add(opt.dictLabel));
    templates.forEach(t => { if (t.type) set.add(t.type); });
    return Array.from(set);
  }, [typeOptions, templates]);

  const allCategories = useMemo(() => {
    const set = new Set<string>(['全部']);
    categoryOptions.forEach(opt => set.add(opt.dictLabel));
    templates.forEach(t => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [categoryOptions, templates]);

  // === 公告列表操作 ===
  const handleView = useCallback((item: any) => { setSelectedNotice(item); setModalType('view'); setShowModal(true); }, []);
  const handleEdit = useCallback((item: any) => { setSelectedNotice(item); setModalType('edit'); setShowModal(true); }, []);
  const handleSend = useCallback((item: any) => { setSelectedNotice(item); setModalType('send'); setShowModal(true); }, []);
  const handleAdd = useCallback(() => { setSelectedNotice(null); setModalType('add'); setShowModal(true); }, []);
  const handleCloseModal = useCallback(() => { setShowModal(false); setSelectedNotice(null); }, []);

  const handleSave = useCallback(async (noticeData: Partial<Notice>) => {
    try {
      if (modalType === 'add') {
        await noticeStore.createItem(noticeData);
        toast.success('创建成功');
      } else if (modalType === 'edit' && selectedNotice) {
        await noticeStore.updateItem(selectedNotice.id, noticeData);
        toast.success('保存成功');
      } else if (modalType === 'send' && selectedNotice) {
        await noticeStore.updateItem(selectedNotice.id, { ...noticeData, status: '已发布' });
        toast.success('发布成功');
      }
      handleCloseModal();
    } catch { toast.error('保存失败'); }
  }, [modalType, selectedNotice, handleCloseModal, toast, noticeStore]);

  const handleDelete = useCallback((item: any) => { setDeleteItem(item); setShowDeleteModal(true); }, []);
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteItem) return;
    try { await noticeStore.deleteItem(deleteItem.id); toast.success('删除成功'); }
    catch { toast.error('删除失败'); }
    finally { setShowDeleteModal(false); setDeleteItem(null); }
  }, [deleteItem, toast, noticeStore]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) { toast.error('请先选择要删除的公告'); return; }
    try { await noticeStore.deleteItems(selectedIds); setSelectedIds([]); setExportMode(false); toast.success(`已删除 ${selectedIds.length} 条公告`); }
    catch { toast.error('批量删除失败'); }
  }, [selectedIds, toast, noticeStore]);

  const handleExport = useCallback(() => { setExportMode(true); setSelectedIds([]); }, []);
  const handleExportConfirm = useCallback(() => { setShowExportModal(true); }, []);

  const handleDoExport = useCallback(async () => {
    const dataToExport = selectedIds.length > 0 ? items.filter((n: any) => selectedIds.includes(n.id)) : items;
    const headers = ['公告编号', '公告标题', '类型', '分类', '优先级', '状态', '发布部门', '发布日期', '截止日期', '阅读数', '接收对象'];
    const rows = dataToExport.map((n: any) => [n.code, n.title, n.type, n.category, n.priority, n.status, n.sender, n.date, n.deadline, n.readCount, n.recipients]);
    let content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    rows.forEach((row: any) => { content += `<tr>${row.map((cell: any) => `<td>${cell ?? ''}</td>`).join('')}</tr>`; });
    content += '</table></body></html>';
    const mimeType = 'application/vnd.ms-excel;charset=utf-8';
    const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'word' ? 'doc' : 'xls';
    const fileName = `公告汇总表_${new Date().toISOString().slice(0, 10)}.${ext}`;
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Excel Files', accept: { [mimeType]: ['.' + ext] } }] });
        const writable = await handle.createWritable(); await writable.write(content); await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url);
      }
    } catch (err) { if ((err as Error).name !== 'AbortError') logger.error('导出失败', err); }
    setShowExportModal(false); setExportMode(false); setSelectedIds([]);
    toast.success('导出成功');
  }, [selectedIds, items, exportFormat, toast]);

  const handleToggleExpand = useCallback((id: string) => { setExpandedRow(prev => prev === id ? null : id); }, []);
  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === paginatedNotices.length) setSelectedIds([]);
    else setSelectedIds(paginatedNotices.map((n: any) => n.id));
  }, [selectedIds.length, paginatedNotices]);
  const handleToggleSelect = useCallback((id: string) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }, []);

  // === 模板TAB操作 ===
  const handleTemplateAdd = () => { setSelectedTemplate(null); setTemplateEditMode('add'); setShowTemplateEdit(true); };
  const handleTemplateEdit = (t: AnnouncementTemplate) => { setSelectedTemplate(t); setTemplateEditMode('edit'); setShowTemplateEdit(true); };
  const handleTemplateDelete = async (t: AnnouncementTemplate) => {
    try { await deleteTemplate(t.id); toast.success('模板删除成功'); }
    catch { toast.error('删除失败'); }
  };
  const handleTemplateSave = async (data: any) => {
    try {
      if (templateEditMode === 'add') { await createTemplate(data); toast.success('模板创建成功'); }
      else if (selectedTemplate) { await updateTemplate(selectedTemplate.id, data); toast.success('模板更新成功'); }
      setShowTemplateEdit(false);
    } catch (err) {
      toast.error((err as Error)?.message || '保存失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header - 页面头部，与基地总览页面保持一致 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
              <p className="text-gray-500">管理和发布各类生产与行政公告</p>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-xl p-1 shadow-sm">
        <TabsList className="grid w-full grid-cols-2 gap-1 p-1 bg-gray-100/80 rounded-xl">
          <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Megaphone className="w-4 h-4" />公告列表
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4" />公告模板
          </TabsTrigger>
        </TabsList>

        {/* 公告列表 TAB */}
        <TabsContent value="list" className="mt-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: '公告总数', value: stats.total, color: 'from-blue-500 to-blue-600', icon: <Megaphone className="w-5 h-5 text-white" /> },
              { label: '已发布', value: stats.published, color: 'from-emerald-500 to-emerald-600', icon: <Download className="w-5 h-5 text-white" /> },
              { label: '审批中', value: stats.pending, color: 'from-amber-500 to-amber-600', icon: <FileText className="w-5 h-5 text-white" /> },
              { label: '草稿', value: stats.draft, color: 'from-gray-500 to-gray-600', icon: <FileText className="w-5 h-5 text-white" /> },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow`}>{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 筛选栏 + 表格 */}
          <AnnouncementFilters searchKeyword={searchKeyword} typeFilter={typeFilter} onSearchChange={setSearchKeyword} onTypeChange={v => { setTypeFilter(v); setCurrentPage(1); }}>
            {exportMode ? (
              <>
                <Button size="sm" onClick={handleExportConfirm}><Download className="w-4 h-4" />确认导出{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</Button>
                <Button size="sm" variant="outline" onClick={() => { setExportMode(false); setSelectedIds([]); }}><X className="w-4 h-4" /> 取消</Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={handleExport}><Download className="w-4 h-4" />导出</Button>
                <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4" />发布公告</Button>
              </>
            )}
          </AnnouncementFilters>
          <AnnouncementTable
            notices={paginatedNotices} selectedIds={selectedIds} exportMode={exportMode} expandedRow={expandedRow}
            currentPage={currentPage} pageSize={pageSize} totalPages={totalPages} totalCount={filteredNotices.length}
            onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
            onSelectAll={handleSelectAll} onToggleSelect={handleToggleSelect} onToggleExpand={handleToggleExpand}
            onView={handleView} onSend={handleSend} onEdit={handleEdit} onDelete={handleDelete}
          />
        </TabsContent>

        {/* 公告模板 TAB */}
        <TabsContent value="template" className="mt-4">
          {/* 筛选栏 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">类型：</span>
                <select value={templateTypeFilter} onChange={e => setTemplateTypeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white">
                  {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">分类：</span>
                <select value={templateCatFilter} onChange={e => setTemplateCatFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white">
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-56">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={templateSearch} onChange={e => setTemplateSearch(e.target.value)}
                    placeholder="搜索模板名称..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-green-500 transition-colors" />
                </div>
              </div>
              <div className="ml-auto">
                <Button size="sm" onClick={handleTemplateAdd}><Plus className="w-4 h-4" />新增模板</Button>
              </div>
            </div>
          </div>

          {/* 模板卡片网格 */}
          {templateLoading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" /></div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">暂无模板</p>
              <p className="text-gray-400 text-sm mb-6">创建模板后可以快速生成标准化公告</p>
              <Button size="sm" onClick={handleTemplateAdd}><Plus className="w-4 h-4" />创建第一个模板</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-green-300 transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex-1 mr-2">{template.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${template.status === '启用' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                      {template.status === '启用' ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-100">{template.type}</span>
                    {template.category && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-600 border border-purple-100">{template.category}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <FileText className="w-3.5 h-3.5" /><span>使用次数：{template.usageCount || 0} 次</span>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <Button variant="outline" size="sm" className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleTemplateEdit(template)}>
                      <Edit className="w-3.5 h-3.5" /><Edit2 className="w-4 h-4" /> 编辑
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleTemplateDelete(template)}>
                      <Trash2 className="w-3.5 h-3.5" />删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 公告弹窗 */}
      <DetailModal isOpen={showModal && modalType === 'view'} notice={selectedNotice} onClose={handleCloseModal} />
      <FormModal isOpen={showModal && (modalType === 'add' || modalType === 'edit' || modalType === 'send')} notice={selectedNotice} mode={modalType === 'add' ? 'add' : modalType === 'edit' ? 'edit' : 'send'} onClose={handleCloseModal} onSave={handleSave} />
      <DeleteModal isOpen={showDeleteModal} item={deleteItem} onClose={() => { setShowDeleteModal(false); setDeleteItem(null); }} onConfirm={handleDeleteConfirm} />
      <ExportModal isOpen={showExportModal} exportFormat={exportFormat} selectedCount={selectedIds.length} totalCount={filteredNotices.length} onClose={() => setShowExportModal(false)} onFormatChange={setExportFormat} onConfirm={handleDoExport} />

      {/* 模板编辑弹窗 */}
      <TemplateEditModal isOpen={showTemplateEdit} template={selectedTemplate} mode={templateEditMode} onClose={() => setShowTemplateEdit(false)} onSave={handleTemplateSave} />
    </div>
  );
}
