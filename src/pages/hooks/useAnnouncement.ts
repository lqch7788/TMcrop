/**
 * 公告数据管理 Hook
 * 封装 Announcement.tsx 的状态管理和业务逻辑
 */
import { useState, useMemo, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import type {
  Notice,
  Template,
  ApprovalWorkflow,
  NoticeType,
  AnnouncementModalType,
  AnnouncementTab
} from '../types/announcement.types';

// 初始公告数据
const INITIAL_NOTICES: Notice[] = [
  { id: '1', code: 'N20260401', title: '关于2026年春季种植计划的通知', type: '生产公告', category: '生产计划', priority: '高', status: '已发布', sender: '生产管理部', date: '2026-04-15', deadline: '2026-05-15', readCount: 156, recipients: '全体基地', content: '为确保2026年春季种植工作顺利开展，现将种植计划通知如下...' },
  { id: '2', code: 'N20260402', title: '温室环境控制标准更新', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '技术部', date: '2026-04-18', deadline: '2026-05-01', readCount: 142, recipients: '温室管理人员', content: '根据最新研究成果，现对温室环境控制标准进行更新...' },
  { id: '3', code: 'N20260403', title: '劳动节放假安排通知', type: '行政公告', category: '行政通知', priority: '中', status: '已发布', sender: '行政人事部', date: '2026-04-20', deadline: '2026-05-10', readCount: 234, recipients: '全体员工', content: '根据国家法定节假日安排，现将劳动节放假事宜通知如下...' },
  { id: '4', code: 'N20260404', title: '新员工入职培训通知', type: '行政公告', category: '培训通知', priority: '中', status: '审批中', sender: '行政人事部', date: '2026-04-22', deadline: '2026-05-05', readCount: 0, recipients: '新入职员工', content: '欢迎新员工加入公司，现将入职培训安排通知如下...' },
  { id: '5', code: 'N20260405', title: '农药使用安全规范', type: '生产公告', category: '安全规范', priority: '高', status: '已发布', sender: '安全生产部', date: '2026-04-25', deadline: '2026-06-01', readCount: 128, recipients: '生产人员', content: '为确保农药使用安全，特制定本规范...' },
  { id: '6', code: 'N20260406', title: '办公设备采购通知', type: '行政公告', category: '采购通知', priority: '低', status: '草稿', sender: '行政部', date: '2026-04-28', deadline: '2026-05-15', readCount: 0, recipients: '各部门负责人', content: '根据公司需求，现计划采购一批办公设备...' },
  { id: '7', code: 'N20260501', title: '采收标准更新通知', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '质量管理部', date: '2026-05-01', deadline: '2026-05-15', readCount: 98, recipients: '采收人员', content: '为提高产品质量，现对采收标准进行更新...' },
  { id: '8', code: 'N20260502', title: '安全生产月活动通知', type: '行政公告', category: '活动通知', priority: '中', status: '已发布', sender: '安全生产部', date: '2026-05-05', deadline: '2026-06-05', readCount: 187, recipients: '全体员工', content: '为提高全员安全意识，现将安全生产月活动安排通知如下...' },
  { id: '9', code: 'N20260503', title: '灌溉系统维护通知', type: '生产公告', category: '设备维护', priority: '中', status: '审批中', sender: '设备管理部', date: '2026-05-08', deadline: '2026-05-20', readCount: 0, recipients: '设备维护人员', content: '为确保灌溉系统正常运行，现将维护计划通知如下...' },
  { id: '10', code: 'N20260504', title: '考勤管理制度修订', type: '行政公告', category: '制度修订', priority: '高', status: '已发布', sender: '行政人事部', date: '2026-05-10', deadline: '2026-06-01', readCount: 210, recipients: '全体员工', content: '为规范考勤管理，现对考勤管理制度进行修订...' },
];

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

  // 展开行状态
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 静态数据
  const notices = INITIAL_NOTICES;
  const templates = INITIAL_TEMPLATES;
  const workflows = INITIAL_WORKFLOWS;
  const noticeTypes = NOTICE_TYPES;
  const categories = CATEGORIES;

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

  // 删除操作
  const handleDelete = useCallback((item: Notice) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteItem(null);
    toast.success('删除成功');
  }, [toast]);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  }, []);

  // 导出操作
  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleExportConfirm = useCallback(() => {
    setShowExportModal(false);
    setSelectedIds([]);
    toast.success('导出成功');
  }, [toast]);

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

    // 删除弹窗状态
    showDeleteModal,
    deleteItem,
    handleDelete,
    handleDeleteConfirm,
    handleCloseDeleteModal,

    // 导出弹窗状态
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExport,
    handleExportConfirm,
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
  };
}
