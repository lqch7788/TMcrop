// 物料入库记录表格组件
import { Eye, Edit, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight, Plus } from 'lucide-react';
import { Button } from '../ui/button';

// 入库记录类型
interface InboundRecord {
  id: number;
  code: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string;
  inboundDate: string;
  operator: string;
  status: 'completed' | 'pending';
}

interface InboundTableProps {
  records: InboundRecord[];
  currentPage: number;
  pageSize: number;
  canCreate: boolean;
  canEdit: boolean;
  can: (module: string, action: string) => boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onAddClick: () => void;
}

export default function InboundTable({
  records,
  currentPage,
  pageSize,
  canCreate,
  canEdit,
  can,
  onPageChange,
  onPageSizeChange,
  onAddClick,
}: InboundTableProps) {
  const totalPages = Math.ceil(records.length / pageSize) || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格头部 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
        {canCreate && (
          <Button size="sm" onClick={onAddClick}>
            <Plus className="w-4 h-4" /> 新增入库
          </Button>
        )}
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库单号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作员</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.materialCode}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.materialName}</td>
                <td className="px-4 py--3 text-sm text-gray-900">
                  {record.quantity}
                  {record.unit}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.inboundDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.operator}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {record.status === 'completed' ? '已完成' : '待审核'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {can('PROC_MATERIALS', 'view') && (
                      <Button variant="ghost" size="icon" title="查看">
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            共 {records.length} 条，第 {currentPage} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            {/* 首页 */}
            <Button variant="ghost" size="icon" onClick={() => onPageChange(1)} disabled={currentPage === 1} title="首页">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            {/* 上一页 */}
            <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {/* 下一页 */}
            <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {/* 末页 */}
            <Button variant="ghost" size="icon" onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages} title="末页">
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
