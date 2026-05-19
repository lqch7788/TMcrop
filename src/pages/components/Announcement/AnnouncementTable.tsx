/**
 * 公告表格组件
 * 显示公告列表，支持展开行、分页和操作
 */
import { Megaphone, Eye, Edit, Trash2, Send, ChevronLeft, ChevronRight, ChevronRight as DoubleRight, ChevronLeft as DoubleLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { Notice } from '../../types/announcement.types';
import { getStatusColor, getPriorityColor } from './utils';

interface AnnouncementTableProps {
  notices: Notice[];
  selectedIds: string[];
  exportMode: boolean;
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

// 渲染分页按钮
function renderPagination(currentPage: number, totalPages: number, onPageChange: (page: number) => void) {
  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(
      <Button
        key={i}
        variant={i === currentPage ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPageChange(i)}
      >
        {i}
      </Button>
    );
  }
  return pages;
}

export default function AnnouncementTable({
  notices,
  selectedIds,
  exportMode,
  expandedRow,
  currentPage,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onSelectAll,
  onToggleSelect,
  onToggleExpand,
  onView,
  onSend,
  onEdit,
  onDelete,
}: AnnouncementTableProps) {
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-3 py-3 text-left text-sm font-semibold w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === notices.length && notices.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="px-3 py-3 text-left text-sm font-semibold w-10"></th>
              <th className="px-3 py-3 text-left text-sm font-semibold">公告编号</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">公告标题</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">类型</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">优先级</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">状态</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">发布日期</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">阅读数</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {notices.map((notice) => (
              <>
                <tr
                  key={notice.id}
                  className={`hover:bg-blue-50 transition-all duration-300 ${selectedIds.includes(notice.id) ? 'bg-blue-50' : ''}`}
                >
                  {exportMode && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(notice.id)}
                        onChange={() => onToggleSelect(notice.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleExpand(notice.id)}
                    >
                      {expandedRow === notice.id ? (
                        <ChevronLeft className="w-4 h-4 rotate-90" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 font-mono">{notice.code}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">{notice.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200`}>
                      {notice.type}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(notice.priority)}`}>
                      {notice.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(notice.status)}`}>
                      {notice.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{notice.date}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 font-mono">{notice.readCount}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView(notice)} title="查看">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {notice.status === '草稿' && (
                        <Button variant="ghost" size="icon" onClick={() => onSend(notice)} title="发送">
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onEdit(notice)} title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(notice)} title="删除">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedRow === notice.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={10} className="px-6 py-4">
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-blue-600" />
                          公告详情
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">发布部门：</span>
                            <span className="text-gray-900 font-medium">{notice.sender}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">接收对象：</span>
                            <span className="text-gray-900 font-medium">{notice.recipients}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">截止日期：</span>
                            <span className="text-gray-900 font-medium">{notice.deadline}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">分类：</span>
                            <span className="text-gray-900 font-medium">{notice.category}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700">{notice.content}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {notices.length === 0 && (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {notices.length > 0 && (
        <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              共 <span className="text-blue-600 font-medium">{totalCount}</span> 条记录
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">每页</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-600">条</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              <DoubleLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {renderPagination(currentPage, totalPages, onPageChange)}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <DoubleRight className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 ml-2">
              第 <span className="text-blue-600 font-medium">{currentPage}</span> / {totalPages} 页
            </span>
          </div>
        </div>
      )}
    </>
  );
}
