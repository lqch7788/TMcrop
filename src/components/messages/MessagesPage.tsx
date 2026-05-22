import { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle, AlertTriangle, ClipboardList, Info, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useAnnouncementStore, type ApiAnnouncement } from '../../stores/useAnnouncementStore';

export interface Message {
  id: number | string;
  type: string;
  title: string;
  content: string;
  sendTime: string;
  isRead: boolean;
}

/** 将 API 公告数据转换为消息展示格式 */
function announcementToMessage(a: ApiAnnouncement): Message {
  return {
    id: a.id,
    type: 'notice',
    title: a.title,
    content: a.content || '',
    sendTime: a.create_time || a.date || '',
    isRead: a.status === '已发布',
  };
}

export function MessagesPage() {
  const [filter, setFilter] = useState('all');

  // 从 Zustand Store 获取公告数据
  const announcements = useAnnouncementStore((s) => s.announcements);
  const isLoading = useAnnouncementStore((s) => s.isLoading);
  const fetchAnnouncements = useAnnouncementStore((s) => s.fetchAnnouncements);

  // 组件挂载时从 API 获取公告
  useEffect(() => {
    if (announcements.length === 0) {
      fetchAnnouncements();
    }
  }, []);

  // 将公告转为消息列表（当前仅包含公告类型，后续可扩展任务/审批/告警）
  const messages = useMemo<Message[]>(() => announcements.map(announcementToMessage), [announcements]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <ClipboardList className="w-5 h-5 text-emerald-500" />;
      case 'approval': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'alert': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'notice': return <Info className="w-5 h-5 text-amber-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task': return '任务';
      case 'approval': return '审批';
      case 'alert': return '告警';
      case 'notice': return '公告';
      case 'system': return '系统';
      default: return '其他';
    }
  };

  const filteredMessages = messages.filter(m => filter === 'all' || m.type === filter);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(filteredMessages.length / pageSize);
  const paginatedMessages = filteredMessages.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">消息中心</h1>
              <p className="text-gray-500">查看系统通知和提醒</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {[
          { value: 'all', label: '全部' },
          { value: 'task', label: '任务' },
          { value: 'approval', label: '审批' },
          { value: 'alert', label: '告警' },
          { value: 'notice', label: '公告' },
        ].map(item => (
          <Button
            key={item.value}
            onClick={() => setFilter(item.value)}
            variant={filter === item.value ? 'default' : 'ghost'}
            size="sm"
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Messages List */}
      <div className="space-y-2">
        {paginatedMessages.map(message => (
          <div
            key={message.id}
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all ${!message.isRead ? 'border-l-4 border-l-emerald-500' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-50 rounded-lg">
                {getIcon(message.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{message.title}</h3>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{getTypeLabel(message.type)}</span>
                  {!message.isRead && <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>}
                </div>
                <p className="text-sm text-gray-600 mt-1">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">{message.sendTime}</p>
                  <div className="flex gap-2">
                    {!message.isRead && (
                      <Button variant="ghost" size="sm" className="text-xs">标为已读</Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3" /> 删除
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredMessages.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                size="sm"
              >
                {i + 1}
              </Button>
            ))}
            <Button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
