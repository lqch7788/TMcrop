/**
 * 病虫害字典表格组件
 * 列：编码、名称、类型（虫害/病害Badge）、适用作物、描述、操作（详情/编辑/删除）
 * 类型Badge：pest(虫害-橙色)、disease(病害-紫色)
 */
import React, { useState } from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { PestDiseaseDict } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';

interface PestDiseaseDictTableProps {
  data: PestDiseaseDict[];
  isLoading: boolean;
  onDetail: (record: PestDiseaseDict) => void;
  onEdit: (record: PestDiseaseDict) => void;
  onDelete: (id: string) => void;
}

export function PestDiseaseDictTable({
  data,
  isLoading,
  onDetail,
  onEdit,
  onDelete,
}: PestDiseaseDictTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  // 类型Badge颜色
  const getTypeBadge = (type: 'pest' | 'disease') => {
    if (type === 'pest') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          虫害
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        病害
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">编码</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">适用作物</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">描述</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-blue-100 transition-colors duration-150"
                >
                  {/* 编码 - 蓝色链接 */}
                  <TableCell className="px-4 py-2 whitespace-nowrap">
                    <span className="font-mono text-sm text-blue-600">{record.dictCode}</span>
                  </TableCell>
                  {/* 名称 - 加粗 */}
                  <TableCell className="px-4 py-2 text-sm font-bold text-gray-900 whitespace-nowrap">
                    {record.dictName}
                  </TableCell>
                  {/* 类型 - Badge */}
                  <TableCell className="px-4 py-2 whitespace-nowrap">
                    {getTypeBadge(record.dictType)}
                  </TableCell>
                  {/* 适用作物 */}
                  <TableCell className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                    {record.targetCrops || '-'}
                  </TableCell>
                  {/* 描述 */}
                  <TableCell className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                    {record.description || '-'}
                  </TableCell>
                  {/* 操作区 */}
                  <TableCell className="px-4 py-2 whitespace-nowrap">
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
