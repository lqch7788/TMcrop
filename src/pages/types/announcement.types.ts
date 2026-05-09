/**
 * 公告数据类型定义
 * 用于 Announcement.tsx 页面组件的类型声明
 */

// 公告项
export interface Notice {
  id: string;
  code: string;
  title: string;
  type: string;
  category: string;
  priority: '高' | '中' | '低';
  status: '已发布' | '审批中' | '草稿';
  sender: string;
  date: string;
  deadline: string;
  readCount: number;
  recipients: string;
  content: string;
}

// 公告模板
export interface Template {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  usageCount: number;
  status: string;
}

// 审批流程
export interface ApprovalWorkflow {
  id: string;
  code: string;
  name: string;
  type: string;
  steps: number;
  status: string;
}

// 公告类型
export interface NoticeType {
  name: string;
  count: number;
  color: string;
  icon: string;
}

// 弹窗类型
export type AnnouncementModalType = 'add' | 'edit' | 'view' | 'send';

// 标签页类型
export type AnnouncementTab = 'list' | 'type' | 'approval' | 'template';

// 公告筛选器Props
export interface AnnouncementFiltersProps {
  searchKeyword: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (type: string) => void;
}

// 公告表格Props
export interface AnnouncementTableProps {
  notices: Notice[];
  selectedIds: string[];
  expandedRow: string | null;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onView: (item: Notice) => void;
  onSend: (item: Notice) => void;
  onEdit: (item: Notice) => void;
  onDelete: (item: Notice) => void;
}

// 公告弹窗通用Props
export interface AnnouncementModalCommonProps {
  isOpen: boolean;
  onClose: () => void;
}

// 详情弹窗Props
export interface AnnouncementDetailModalProps extends AnnouncementModalCommonProps {
  notice: Notice | null;
}

// 表单弹窗Props（新增/编辑/发送）
export interface AnnouncementFormModalProps extends AnnouncementModalCommonProps {
  notice: Notice | null;
  mode: 'add' | 'edit' | 'send';
  onSave?: () => void;
}

// 删除确认弹窗Props
export interface AnnouncementDeleteModalProps {
  isOpen: boolean;
  item: Notice | null;
  onClose: () => void;
  onConfirm: () => void;
}

// 导出弹窗Props
export interface AnnouncementExportModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  totalCount: number;
  onClose: () => void;
  onFormatChange: (format: string) => void;
  onConfirm: () => void;
}

// 类型管理面板Props
export interface TypePanelProps {
  noticeTypes: NoticeType[];
  notices: Notice[];
  categories: string[];
}

// 审批流程面板Props
export interface ApprovalPanelProps {
  workflows: ApprovalWorkflow[];
  pendingNotices: Notice[];
}

// 模板面板Props
export interface TemplatePanelProps {
  templates: Template[];
}
