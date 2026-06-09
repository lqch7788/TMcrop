import React from 'react';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';

interface StatMaterialTableProps {
  activeTab: 'monthly' | 'material';
  data: any[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewDetail: (record: any) => void;
}

export const StatMaterialTable: React.FC<StatMaterialTableProps> = ({
  activeTab,
  data,
  currentPage,
  pageSize,
  onPageChange,
  onViewDetail,
}) => {
  if (activeTab !== 'material') return null;

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">领料统计表</h3>
      </div>
      <Table className="w-full">
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold">物料编码</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold">物料名称</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold">物料分类</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold">规格</TableHead>
            <TableHead className="px-4 py-3 text-center text-sm font-semibold">单位</TableHead>
            <TableHead className="px-4 py-3 text-right text-sm font-semibold">领料次数</TableHead>
            <TableHead className="px-4 py-3 text-right text-sm font-semibold">总数量</TableHead>
            <TableHead className="px-4 py-3 text-right text-sm font-semibold">总金额(元)</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold">主要仓库</TableHead>
            <TableHead className="px-4 py-3 text-center text-sm font-semibold">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100">
          {data.slice(startIdx, endIdx).map((item, idx) => (
            <TableRow key={idx} className="hover:bg-blue-100 transition-colors">
              <TableCell className="px-4 py-3 text-sm font-mono text-blue-600">{item.materialCode}</TableCell>
              <TableCell className="px-4 py-3 text-sm font-medium text-gray-900">{item.materialName}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-gray-600">{item.category}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-gray-600">{item.spec}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-center text-gray-600">{item.unit}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-right font-medium text-blue-600">{item.requisitionCount}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.totalQuantity.toLocaleString()}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{item.totalAmount.toLocaleString()}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-gray-600">{item.mainWarehouse}</TableCell>
              <TableCell className="px-4 py-3 text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onViewDetail(item)}
                >
                  <Eye className="w-4 h-4" /> 查看明细
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* 分页 */}
      <div className="px-4 pb-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={(size) => onPageChange(1)}
          showPageSize={true}
        />
      </div>
    </div>
  );
};

export default StatMaterialTable;
