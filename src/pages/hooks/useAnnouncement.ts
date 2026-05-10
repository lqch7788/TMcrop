/**
 * 公告数据管理 Hook
 * 封装 Announcement.tsx 的状态管理和业务逻辑
 * 支持 API 调用和 localStorage 降级
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import type {
  Notice,
  Template,
  ApprovalWorkflow,
  NoticeType,
  AnnouncementModalType,
  AnnouncementTab
} from '../types/announcement.types';
import * as apiService from '../../services/apiAnnouncementService';

// 初始模板数据
const INITIAL_TEMPLATES: Template[] = [
  { id: '1', code: 'T001', name: '生产计划通知模板', type: '生产公告', category: '生产计划', usageCount: 45, status: '启用' },
  { id: '2', code: 'T002', name: '技术标准更新模板', type: '生产公告', category: '技术标准', usageCount: 38, status: '启用' },
  { id: '3', code: 'T003', name: '行政通知模板', type: '行政公告', category: '行政通知', usageCount: 56, status: '启用' },
  { id: '4', code: 'T004', name: '培训通知模板', type: '行政公告', category: '培训通知', usageCount: 28, status: '启用' },
  { id: '5', code: 'T005', name: '安全规范模板', type: '生产公告', category: '安全规范', usageCount: 22, status: '启用' },
  { id: '6', code: 'T006', name: '活动通知模板', type: '行政公告', category: '活动通知', usageCount: 18, status: '启用' },
];

// 初始审批流程数据
const INITIAL_WORKFLOWS: ApprovalWorkflow[] = [
  { id: '1', code: 'W001', name: '生产公告审批流程', type: '生产公告', steps: 3, status: '启用' },
  { id: '2', code: 'W002', name: '行政公告审批流程', type: '行政公告', steps: 2, status: '启用' },
  { id: '3', code: 'W003', name: '高优先级公告审批流程', type: '全部', steps: 4, status: '启用' },
  { id: '4', code: 'W004', name: '紧急公告审批流程', type: '全部', steps: 1, status: '启用' },
];

// 公告类型数据
const NOTICE_TYPES: NoticeType[] = [
  { name: '生产公告', count: 6, color: 'from-blue-500 to-blue-600', icon: '🌱' },
  { name: '行政公告', count: 4, color: 'from-purple-500 to-purple-600', icon: '📋' },
];

// 分类选项
const CATEGORIES = ['全部', '生产计划', '技术标准', '行政通知', '培训通知', '安全规范', '采购通知', '设备维护', '活动通知', '制度修订'];

// 工具函数：获取状态颜色
export const getStatusColor = (status: string): string => {
  switch (status) {
    case '已发布': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case '审批中': return 'bg-amber-50 text-amber-700 border-amber-200';
    case '草稿': return 'bg-gray-50 text-gray-600 border-gray-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

// 工具函数：获取优先级颜色
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case '高': return 'bg-red-50 text-red-700 border-red-200';
    case '中': return 'bg-amber-50 text-amber-700 border-amber-200';
    case '低': return 'bg-green-50 text-green-700 border-green-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

/**
 * 公告数据管理 Hook
 */
export function useAnnouncement() {
  const { toast } = useToast();

  // 公告数据状态
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');

  // 标签页状态
  const [activeTab, setActiveTab] = useState<AnnouncementTab>('list');

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<AnnouncementModalType>('view');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  // 删除弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Notice | null>(null);

  // 导出弹窗状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportMode, setExportMode] = useState(false);

  // 展开行状态
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 静态数据
  const templates = INITIAL_TEMPLATES;
  const workflows = INITIAL_WORKFLOWS;
  const noticeTypes = NOTICE_TYPES;
  const categories = CATEGORIES;

  // 初始化加载数据
  useEffect(() => {
    const loadNotices = async () => {
      try {
        setLoading(true);
        const data = await apiService.getNotices();
        setNotices(data);
      } catch (error) {
        console.error('加载公告数据失败:', error);
        toast.error('加载公告数据失败');
      } finally {
        setLoading(false);
      }
    };
    loadNotices();
  }, [toast]);

  // 筛选后的公告数据
  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      const matchesType = typeFilter === '全部' || n.type === typeFilter;
      const matchesSearch = !searchKeyword ||
        n.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        n.code.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [notices, typeFilter, searchKeyword]);

  // 待审批公告
  const pendingNotices = useMemo(() => {
    return notices.filter(n => n.status === '审批中');
  }, [notices]);

  // 分页数据
  const totalPages = useMemo(() => Math.ceil(filteredNotices.length / pageSize), [filteredNotices.length, pageSize]);
  const startIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const paginatedNotices = useMemo(() =>
    filteredNotices.slice(startIndex, startIndex + pageSize),
    [filteredNotices, startIndex, pageSize]
  );

  // 重置分页
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // 刷新数据
  const refreshNotices = useCallback(async () => {
    try {
      const data = await apiService.getNotices();
      setNotices(data);
    } catch (error) {
      console.error('刷新公告数据失败:', error);
    }
  }, []);

  // 弹窗操作
  const handleView = useCallback((item: Notice) => {
    setSelectedNotice(item);
    setModalType('view');
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((item: Notice) => {
    setSelectedNotice(item);
    setModalType('edit');
    setShowModal(true);
  }, []);

  const handleSend = useCallback((item: Notice) => {
    setSelectedNotice(item);
    setModalType('send');
    setShowModal(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedNotice(null);
    setModalType('add');
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedNotice(null);
  }, []);

  // 保存操作（新增/编辑）
  const handleSave = useCallback(async (noticeData: Partial<Notice>) => {
    try {
      if (modalType === 'add') {
        const newNotice = await apiService.createNotice(noticeData as Omit<Notice, 'id' | 'code'>);
        setNotices(prev => [newNotice, ...prev]);
        toast.success('创建成功');
      } else if (modalType === 'edit' && selectedNotice) {
        const updated = await apiService.updateNotice(selectedNotice.id, noticeData);
        if (updated) {
          setNotices(prev => prev.map(n => n.id === selectedNotice.id ? { ...n, ...noticeData } : n));
          toast.success('保存成功');
        }
      } else if (modalType === 'send' && selectedNotice) {
        const updated = await apiService.updateNotice(selectedNotice.id, { ...noticeData, status: '已发布' });
        if (updated) {
          setNotices(prev => prev.map(n => n.id === selectedNotice.id ? { ...n, ...noticeData, status: '已发布' } : n));
          toast.success('发布成功');
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error('保存公告失败:', error);
      toast.error('保存失败');
    }
  }, [modalType, selectedNotice, handleCloseModal, toast]);

  // 删除操作
  const handleDelete = useCallback((item: Notice) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteItem) return;
    try {
      await apiService.deleteNotice(deleteItem.id);
      setNotices(prev => prev.filter(n => n.id !== deleteItem.id));
      toast.success('删除成功');
    } catch (error) {
      console.error('删除公告失败:', error);
      toast.error('删除失败');
    } finally {
      setShowDeleteModal(false);
      setDeleteItem(null);
    }
  }, [deleteItem, toast]);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  }, []);

  // 导出操作
  const handleExport = useCallback(() => {
    setExportMode(true);
    setSelectedIds([]);
  }, []);

  const handleExportConfirm = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleDoExport = useCallback(async () => {
    const dataToExport = selectedIds.length > 0
      ? notices.filter(n => selectedIds.includes(n.id))
      : notices;

    // 生成Excel HTML内容
    const headers = ['公告编号', '公告标题', '类型', '分类', '优先级', '状态', '发布部门', '发布日期', '截止日期', '阅读数', '接收对象'];
    const rows = dataToExport.map(n => [
      n.code, n.title, n.type, n.category, n.priority, n.status,
      n.sender, n.date, n.deadline, n.readCount, n.recipients
    ]);

    let content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    rows.forEach(row => {
      content += `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`;
    });
    content += '</table></body></html>';

    const mimeType = 'application/vnd.ms-excel;charset=utf-8';
    const extension = exportFormat === 'csv' ? 'csv' : exportFormat === 'word' ? 'doc' : 'xls';
    const fileName = `公告汇总表_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Excel Files',
              accept: { [mimeType]: ['.' + extension] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Export failed:', err);
      }
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedIds([]);
    toast.success('导出成功');
  }, [selectedIds, notices, exportFormat, toast]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedIds([]);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  // 选择操作
  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === paginatedNotices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedNotices.map(n => n.id));
    }
  }, [selectedIds.length, paginatedNotices]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  // 展开行操作
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  }, []);

  // 分页操作
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    resetPagination();
  }, [resetPagination]);

  return {
    // 数据
    notices,
    templates,
    workflows,
    noticeTypes,
    categories,
    loading,

    // 筛选状态
    searchKeyword,
    typeFilter,
    setSearchKeyword,
    setTypeFilter,

    // 标签页状态
    activeTab,
    setActiveTab,

    // 弹窗状态
    showModal,
    modalType,
    selectedNotice,
    handleView,
    handleEdit,
    handleSend,
    handleAdd,
    handleCloseModal,
    handleSave,

    // 删除弹窗状态
    showDeleteModal,
    deleteItem,
    handleDelete,
    handleDeleteConfirm,
    handleCloseDeleteModal,

    // 导出弹窗状态
    exportMode,
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExport,
    handleExportConfirm,
    handleDoExport,
    handleCancelExport,
    handleCloseExportModal,

    // 展开行状态
    expandedRow,
    handleToggleExpand,

    // 选择状态
    selectedIds,
    handleSelectAll,
    handleToggleSelect,

    // 分页状态
    currentPage,
    pageSize,
    totalPages,
    paginatedNotices,
    filteredNotices,
    pendingNotices,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,

    // 刷新数据
    refreshNotices,
  };
}
