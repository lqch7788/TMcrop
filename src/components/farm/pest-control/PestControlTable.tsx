/**
 * 病虫害防治记录表格组件
 * V12.0 新增
 * 列：勾选框、编号、防治日期、防治类型（彩色Badge）、作物、温室、药剂名称、用药量、稀释比例、操作（详情/编辑/删除）
 */
import React from 'react';
import { Eye, Edit2, Trash2, Plus, Download } from 'lucide-react';
import { PestControlData } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';

interface PestControlTableProps {
  data: PestControlData[];
  isLoading: boolean;
  operationMode: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDetail: (record: PestControlData) => void;
  onEdit: (record: PestControlData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onBatchDeleteMode: () => void;
  onBatchDelete: () => void;
  onBatchDeleteConfirm: () => void;
  onExportMode: () => void;
}

// 防治类型 Badge 颜色
const getControlTypeBadgeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'chemical': 'bg-red-100 text-red-700',
    'bio': 'bg-green-100 text-green-700',
    'physical': 'bg-blue-100 text-blue-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

// 防治类型显示名
const getControlTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'chemical': '化学防治',
    'bio': '生物防治',
    'physical': '物理防治',
  };
  return labels[type] || type;
};

export function PestControlTable({
  data,
  isLoading,
  operationMode,
  selectedIds,
  onSelectionChange,
  onDetail,
  onEdit,
  onDelete,
  onAdd,
  onBatchDeleteMode,
  onBatchDelete,
  onBatchDeleteConfirm,
  onExportMode,
}: PestControlTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const showCheckbox = operationMode === 'delete';
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  // 全选/取消
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(data.map((it) => it.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((k) => k !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头操作栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">防治记录列表</h3>
        </div>
        {/* 批量删除模式：显示确认栏 */}
        {operationMode === 'delete' && selectedIds.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">已选择 {selectedIds.length} 条记录</span>
            <Button variant="destructive" size="sm" onClick={onBatchDeleteConfirm}>
              <Trash2 className="w-4 h-4" />确认删除
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchDeleteMode}>取消</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBatchDeleteMode}
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </Button>
            <Button size="sm" onClick={onExportMode}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow className="hover:bg-transparent">
              {showCheckbox && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">编号</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">防治日期</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">防治类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">作物</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">温室</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂/方法</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">用药量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">稀释比例</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">目标害虫</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 11 : 10} className="px-4 py-12 text-center text-gray-400">
                  暂无防治记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-emerald-50 transition-colors"
                >
                  {showCheckbox && (
                    <TableCell className="px-4 py-3">
                      <Input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                      />
                    </TableCell>
                  )}
                  {/* 编号 - 蓝色链接 */}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(record)}
                      className="font-mono p-0 h-auto"
                      title="查看详情"
                    >
                      {record.recordCode}
                    </Button>
                  </TableCell>
                  {/* 防治日期 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.sprayTime || '-'}
                  </TableCell>
                  {/* 防治类型 - Badge */}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getControlTypeBadgeColor(record.controlType)}`}>
                      {getControlTypeLabel(record.controlType)}
                    </span>
                  </TableCell>
                  {/* 作物 */}
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {record.cropName || '-'}
                  </TableCell>
                  {/* 温室 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.greenhouseName || '-'}
                  </TableCell>
                  {/* 药剂/方法 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.pesticideName || record.bioAgentName || record.equipmentName || '-'}
                  </TableCell>
                  {/* 用药量 */}
                  <TableCell className="px-4 py-3 text-sm font-medium text-orange-600 whitespace-nowrap">
                    {record.dosage ? `${record.dosage} ${record.dosageUnit || ''}` : '-'}
                  </TableCell>
                  {/* 稀释比例 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.dilutionRatio || '-'}
                  </TableCell>
                  {/* 目标害虫 */}
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.targetPest || '-'}
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
