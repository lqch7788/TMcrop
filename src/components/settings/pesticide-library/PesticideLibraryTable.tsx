/**
 * 药剂知识库表格组件
 * 列：编码、药剂名称、防治类型Badge、规格数、生产厂家、功能说明、操作（编辑/删除）
 */
import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { PesticideLibrary } from '@/stores';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';

interface PesticideLibraryTableProps {
  data: PesticideLibrary[];
  isLoading: boolean;
  onDetail: (record: PesticideLibrary) => void;
  onEdit: (record: PesticideLibrary) => void;
  onDelete: (id: string) => void;
}

// 防治类型 Badge 颜色
const getControlTypeBadge = (type: string) => {
  switch (type) {
    case 'chemical':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          化学防治
        </span>
      );
    case 'bio':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          生物防治
        </span>
      );
    case 'physical':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          物理防治
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {type}
        </span>
      );
  }
};

export function PesticideLibraryTable({
  data,
  isLoading,
  onDetail,
  onEdit,
  onDelete,
}: PesticideLibraryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">药剂列表</h3>
        <p className="text-sm text-gray-500 mt-1">共 {data.length} 条记录</p>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">编码</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">防治类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">规格数</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">生产厂家</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">功能说明</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  暂无药剂记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-emerald-50 transition-colors"
                >
                  {/* 编码 */}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(record)}
                      className="font-mono p-0 h-auto text-blue-600"
                      title="查看详情"
                    >
                      {record.pesticideCode || '-'}
                    </Button>
                  </TableCell>
                  {/* 药剂名称 - 加粗 */}
                  <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                    {record.pesticideName || '-'}
                  </TableCell>
                  {/* 防治类型 - Badge */}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    {getControlTypeBadge(record.controlType)}
                  </TableCell>
                  {/* 规格数 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.specs?.length || 0}
                  </TableCell>
                  {/* 生产厂家 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.specs?.[0]?.manufacturer || '-'}
                  </TableCell>
                  {/* 功能说明 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                    {record.functionDesc || '-'}
                  </TableCell>
                  {/* 操作区 */}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDetail(record)}
                        className="text-gray-500 hover:text-blue-600"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(record)}
                        className="text-gray-500 hover:text-amber-600"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(record.id)}
                        className="text-gray-500 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
