import { Eye, Edit, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { RecruitmentRequest, RecruitmentStatus } from './types';

interface RecruitmentTableProps {
  recruitments: RecruitmentRequest[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (recruitment: RecruitmentRequest) => void;
  onEdit: (recruitment: RecruitmentRequest) => void;
  onDelete: (recruitment: RecruitmentRequest) => void;
  onApprove: (recruitment: RecruitmentRequest) => void;
  onComplete: (recruitment: RecruitmentRequest) => void;
  onCancel: (recruitment: RecruitmentRequest) => void;
}

// 状态标签组件
function StatusBadge({ status }: { status: RecruitmentStatus }) {
  const styles: Record<RecruitmentStatus, { bg: string; text: string; label: string }> = {
    '待审批': { bg: 'bg-amber-100', text: 'text-amber-700', label: '待审批' },
    '招聘中': { bg: 'bg-blue-100', text: 'text-blue-700', label: '招聘中' },
    '已完成': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成' },
    '已取消': { bg: 'bg-gray-100', text: 'text-gray-500', label: '已取消' },
  };
  const style = styles[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export function RecruitmentTable({
  recruitments,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onComplete,
  onCancel,
}: RecruitmentTableProps) {
  const totalPages = Math.ceil(recruitments.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, recruitments.length);
  const paginatedData = recruitments.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">招聘编号</th>
              <th className="px-4 py-3">招聘岗位</th>
              <th className="px-4 py-3">需求部门</th>
              <th className="px-4 py-3">人数</th>
              <th className="px-4 py-3">来源</th>
              <th className="px-4 py-3">期望到岗</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">申请人</th>
              <th className="px-4 py-3">申请日期</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              paginatedData.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{rec.requestCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{rec.position}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{rec.department}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{rec.quantity}人</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{rec.source}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{rec.expectedDate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                        {rec.applicantName.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-700">{rec.applicantName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{rec.applyDate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onView(rec)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {rec.status === '待审批' && (
                        <>
                          <button
                            onClick={() => onApprove(rec)}
                            className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="审批通过"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onCancel(rec)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="取消"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {rec.status === '招聘中' && (
                        <button
                          onClick={() => onComplete(rec)}
                          className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title="完成招聘"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {rec.status === '待审批' && (
                        <button
                          onClick={() => onEdit(rec)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(rec)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {recruitments.length} 条</span>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">{currentPage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecruitmentTable;
