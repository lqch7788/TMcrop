/**
 * 公告工具函数
 * 供 AnnouncementTable、DetailModal 等组件使用
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case '已发布': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case '审批中': return 'bg-amber-50 text-amber-700 border-amber-200';
    case '草稿': return 'bg-gray-50 text-gray-600 border-gray-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case '高': return 'bg-red-50 text-red-700 border-red-200';
    case '中': return 'bg-amber-50 text-amber-700 border-amber-200';
    case '低': return 'bg-green-50 text-green-700 border-green-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};
