/**
 * 药剂知识库表格组件
 * 列：编码、药剂名称、防治类型Badge、规格数、生产厂家、功能说明、操作（编辑/删除）
 * 支持折叠展开规格明细
 */
import React from 'react';
import { Eye, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { PesticideLibrary } from '@/stores';
// 2026-07-10：用 store 内置的 getDictLabel（兼容多种字段名 + 模糊匹配）
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';

interface PesticideLibraryTableProps {
  data: PesticideLibrary[];
  isLoading: boolean;
  onDetail: (record: PesticideLibrary) => void;
  onEdit: (record: PesticideLibrary) => void;
  onDelete: (id: string) => void;
  // 导出模式相关
  exportMode?: boolean;
  selectedRows?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
}

// 2026-07-10：药剂类型列显示中文 label（useDictionaryStore 必须移到组件内调用）
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
  exportMode = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
}: PesticideLibraryTableProps) {
  // 2026-07-10：触发字典加载（store 内置 getDictLabel 会在字典未加载时返回原值）
  useDictionaryStore((s) => s.dictionaries);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  // 切换展开/折叠
  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <TableRow className="hover:bg-transparent">
              {exportMode && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 text-white border-white rounded focus:ring-white"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-8"></TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">编码</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂成分</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">作用机制</TableHead>
              {/* 2026-07-10：药剂类型列（关联 pesticide_type 字典） */}
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">防治类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">功能说明</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">规格数</TableHead>
              {!exportMode && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  暂无药剂记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => (
                <React.Fragment key={record.id}>
                  {/* 主数据行 */}
                  <TableRow
                    className={`hover:bg-emerald-50 transition-colors ${selectedRows.includes(record.id) ? 'bg-emerald-50' : ''}`}
                  >
                    {exportMode && (
                      <TableCell className="px-4 py-3 whitespace-nowrap w-10">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(record.id)}
                          onChange={() => onSelectRow?.(record.id)}
                          className="w-4 h-4 text-emerald-600 border-gray-400 rounded focus:ring-emerald-500"
                        />
                      </TableCell>
                    )}
                    {/* 展开/折叠按钮 */}
                    <TableCell className="px-4 py-3 whitespace-nowrap w-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(record.id)}
                        className="text-gray-500 hover:text-emerald-600"
                        title={expandedRows.has(record.id) ? '收起' : '展开'}
                      >
                        {expandedRows.has(record.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
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
                    {/* 药剂成分 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                      {record.ingredient || '-'}
                    </TableCell>
                    {/* 作用机制 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[100px] truncate">
                      {record.mechanism || '-'}
                    </TableCell>
                    {/* 2026-07-10：药剂类型列（关联 pesticide_type 字典，用 store 内置 getDictLabel 自动转中文） */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {getDictLabel('pesticide_type', record.pesticideType || '') || '-'}
                    </TableCell>
                    {/* 防治类型 - Badge */}
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {getControlTypeBadge(record.controlType)}
                    </TableCell>
                    {/* 功能说明 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                      {record.functionDesc || '-'}
                    </TableCell>
                    {/* 规格数 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.specs?.length || 0}
                    </TableCell>
                    {!exportMode && (
                      /* 操作区 */
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
                    )}
                  </TableRow>
                  {/* 展开行 - 规格明细 */}
                  {expandedRows.has(record.id) && (
                    <TableRow key={`${record.id}-expanded`} className="bg-emerald-50/50">
                      <TableCell colSpan={9} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-semibold text-emerald-800 mb-2">规格明细</div>
                          {(record.specs && record.specs.length > 0) ? (
                            <table className="w-full border border-emerald-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#ECFDF5]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">品牌名称</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">含量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">剂型</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">生产厂家</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">建议用量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">单位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">稀释比例</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-emerald-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-emerald-100">
                                {record.specs.map((spec, idx) => (
                                  <tr key={idx} className="hover:bg-emerald-100/30">
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.brandName || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.specContent || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.formulation || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.manufacturer || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.suggestedDosage || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.dosageUnit || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.suggestedRatio || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-emerald-700">{spec.remark || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-emerald-600 text-center py-4">暂无规格明细</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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
