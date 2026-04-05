import { useState, useRef, useEffect } from 'react';
import { Megaphone, Plus, Edit, Eye, Trash2, Calendar, Target, DollarSign, TrendingUp, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

const announcements = [
  { id: 1, title: '2024年度经营方向与产量目标', type: '经营方向', year: '2024年', quarter: '全年', publishDate: '2024-01-05', publisher: '张建华', status: '已发布', statusClass: 'normal', views: 256 },
  { id: 2, title: '2024年第一季度产量目标设定', type: '产量目标', year: '2024年', quarter: '第一季度', publishDate: '2024-01-10', publisher: '李建国', status: '已发布', statusClass: 'normal', views: 189 },
  { id: 3, title: '2024年度成本控制指标', type: '成本控制', year: '2024年', quarter: '全年', publishDate: '2024-01-15', publisher: '张建华', status: '已发布', statusClass: 'normal', views: 142 },
  { id: 4, title: '2024年第一季度效益分析预测', type: '效益分析', year: '2024年', quarter: '第一季度', publishDate: '2024-02-01', publisher: '王志刚', status: '已发布', statusClass: 'normal', views: 98 },
  { id: 5, title: '2024年度技术创新目标', type: '经营方向', year: '2024年', quarter: '全年', publishDate: '2024-02-10', publisher: '李建国', status: '草稿', statusClass: 'draft', views: 0 },
  { id: 6, title: '2024年上半年成本控制指标调整', type: '成本控制', year: '2024年', quarter: '上半年', publishDate: '2024-06-15', publisher: '张建华', status: '已发布', statusClass: 'normal', views: 76 },
];

export default function Announcement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
  };

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setModalPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleOpenModal = () => {
    setModalPosition({ x: 0, y: 0 });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewAnnouncement({
      title: '',
      type: '经营方向',
      year: '2024年',
      quarter: '全年',
      publisher: '',
      content: '',
      status: '草稿'
    });
  };

  // Form state
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    type: '经营方向',
    year: '2024年',
    quarter: '全年',
    publisher: '',
    content: '',
    status: '草稿'
  });

  const handleSubmit = () => {
    setShowModal(false);
    setNewAnnouncement({
      title: '',
      type: '经营方向',
      year: '2024年',
      quarter: '全年',
      publisher: '',
      content: '',
      status: '草稿'
    });
  };

  // View Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<typeof announcements[0] | null>(null);

  // Detail Modal State (larger modal for title click)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState<typeof announcements[0] | null>(null);

  const handleTitleClick = (item: typeof announcements[0]) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<typeof announcements[0] | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    type: '经营方向',
    year: '2024年',
    quarter: '全年',
    publisher: '',
    content: '',
    status: '草稿'
  });

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<typeof announcements[0] | null>(null);

  const handleViewClick = (item: typeof announcements[0]) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const handleEditClick = (item: typeof announcements[0]) => {
    setEditingItem(item);
    setEditForm({
      title: item.title,
      type: item.type,
      year: item.year,
      quarter: item.quarter,
      publisher: item.publisher,
      content: '',
      status: item.status
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (item: typeof announcements[0]) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const handleEditSubmit = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    setDeletingItem(null);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case '经营方向':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">经营方向</span>;
      case '产量目标':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">产量目标</span>;
      case '成本控制':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">成本控制</span>;
      case '效益分析':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">效益分析</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string, statusClass: string) => {
    switch (statusClass) {
      case 'normal':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{status}</span>;
      case 'draft':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
      default:
        return null;
    }
  };

  const filteredAnnouncements = announcements.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    const matchStartDate = !startDate || item.publishDate >= startDate;
    const matchEndDate = !endDate || item.publishDate <= endDate;
    return matchSearch && matchType && matchStartDate && matchEndDate;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">公告发布</h1>
            <p className="text-gray-500">发布年度或季度的经营方向、产量目标、成本控制指标、效益分析预测等信息</p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={handleCloseModal}></div>
          <div
            ref={modalRef}
            className="fixed bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            style={{
              left: modalPosition.x > 0 ? modalPosition.x : '50%',
              top: modalPosition.y > 0 ? modalPosition.y : '50%',
              transform: modalPosition.x <= 0 && modalPosition.y <= 0 ? 'translate(-50%, -50%)' : 'none'
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6 border-b border-gray-100 cursor-move"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">新增公告</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公告标题</label>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="请输入公告标题"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公告类型</label>
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="经营方向">经营方向</option>
                    <option value="产量目标">产量目标</option>
                    <option value="成本控制">成本控制</option>
                    <option value="效益分析">效益分析</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发布人</label>
                  <input
                    type="text"
                    value={newAnnouncement.publisher}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, publisher: e.target.value })}
                    placeholder="请输入发布人"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年度</label>
                  <select
                    value={newAnnouncement.year}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, year: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="2024年">2024年</option>
                    <option value="2025年">2025年</option>
                    <option value="2026年">2026年</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">季度</label>
                  <select
                    value={newAnnouncement.quarter}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, quarter: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="全年">全年</option>
                    <option value="上半年">上半年</option>
                    <option value="下半年">下半年</option>
                    <option value="第一季度">第一季度</option>
                    <option value="第二季度">第二季度</option>
                    <option value="第三季度">第三季度</option>
                    <option value="第四季度">第四季度</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公告内容</label>
                <textarea
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  placeholder="请输入公告内容"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={newAnnouncement.status}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, status: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="草稿">草稿</option>
                  <option value="已发布">已发布</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={handleCloseModal}
                className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewModal(false)}></div>
          <div className="fixed bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">查看公告</h2>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">公告标题</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{viewingItem.title}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">公告类型</label>
                  <div className="mt-1">{getTypeBadge(viewingItem.type)}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">年度/季度</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{viewingItem.year} {viewingItem.quarter}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">发布日期</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{viewingItem.publishDate}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">发布人</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{viewingItem.publisher}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">状态</label>
                  <div className="mt-1">{getStatusBadge(viewingItem.status, viewingItem.statusClass)}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">阅读量</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{viewingItem.views}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowViewModal(false)} className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (larger) */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDetailModal(false)}></div>
          <div className="fixed bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">公告详情</h2>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="text-center pb-6 border-b border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900">{detailItem.title}</h3>
              </div>

              <div className="grid grid-cols-4 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs text-gray-500 uppercase">公告类型</label>
                  <div className="mt-2">{getTypeBadge(detailItem.type)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs text-gray-500 uppercase">年度/季度</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{detailItem.year} {detailItem.quarter}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs text-gray-500 uppercase">发布日期</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{detailItem.publishDate}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs text-gray-500 uppercase">发布人</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{detailItem.publisher}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs text-gray-500 uppercase">状态</label>
                  <div className="mt-2">{getStatusBadge(detailItem.status, detailItem.statusClass)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs text-gray-500 uppercase">阅读量</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{detailItem.views} 次</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <label className="text-xs text-gray-500 uppercase mb-3 block">公告内容</label>
                <div className="text-gray-700 text-base leading-relaxed">
                  {detailItem.content || '暂无内容'}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowDetailModal(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditModal(false)}></div>
          <div className="fixed bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">编辑公告</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公告标题</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公告类型</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="经营方向">经营方向</option>
                    <option value="产量目标">产量目标</option>
                    <option value="成本控制">成本控制</option>
                    <option value="效益分析">效益分析</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发布人</label>
                  <input
                    type="text"
                    value={editForm.publisher}
                    onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年度</label>
                  <select
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="2024年">2024年</option>
                    <option value="2025年">2025年</option>
                    <option value="2026年">2026年</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">季度</label>
                  <select
                    value={editForm.quarter}
                    onChange={(e) => setEditForm({ ...editForm, quarter: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="全年">全年</option>
                    <option value="上半年">上半年</option>
                    <option value="下半年">下半年</option>
                    <option value="第一季度">第一季度</option>
                    <option value="第二季度">第二季度</option>
                    <option value="第三季度">第三季度</option>
                    <option value="第四季度">第四季度</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公告内容</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  placeholder="请输入公告内容"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="草稿">草稿</option>
                  <option value="已发布">已发布</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowEditModal(false)} className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
              <button onClick={handleEditSubmit} className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingItem && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)}></div>
          <div className="fixed bg-white rounded-2xl shadow-xl w-full max-w-md" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">删除公告</h2>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                确定要删除公告 <span className="font-medium text-gray-900">"{deletingItem.title}"</span> 吗？
              </p>
              <p className="text-sm text-gray-500 mt-2">此操作无法撤销，请谨慎操作。</p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowDeleteModal(false)} className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
              <button onClick={handleDeleteConfirm} className="h-10 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{announcements.length}</p>
              <p className="text-xs text-gray-500">公告总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{announcements.filter(a => a.status === '已发布').length}</p>
              <p className="text-xs text-gray-500">已发布</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{announcements.filter(a => a.type === '成本控制').length}</p>
              <p className="text-xs text-gray-500">成本控制</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{announcements.filter(a => a.type === '效益分析').length}</p>
              <p className="text-xs text-gray-500">效益分析</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">公告标题</label>
            <input
              type="text"
              placeholder="搜索公告标题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">公告类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">全部类型</option>
              <option value="经营方向">经营方向</option>
              <option value="产量目标">产量目标</option>
              <option value="成本控制">成本控制</option>
              <option value="效益分析">效益分析</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              重置
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button
              onClick={handleOpenModal}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              新增公告
            </button>
          </div>
        </div>
      </div>

      {/* Announcement List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">公告列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">公告标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">公告类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">年度/季度</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">发布日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">发布人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">阅读量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAnnouncements.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold text-green-700 hover:text-green-900 cursor-pointer" onClick={() => handleTitleClick(item)}>{item.title}</td>
                  <td className="px-4 py-3">{getTypeBadge(item.type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.year} {item.quarter}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.publishDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.publisher}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.status, item.statusClass)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.views}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewClick(item)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredAnnouncements.length} 条</span>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {Math.ceil(filteredAnnouncements.length / pageSize)}</span>
            <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredAnnouncements.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredAnnouncements.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
