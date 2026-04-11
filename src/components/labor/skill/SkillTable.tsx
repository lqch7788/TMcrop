import React, { useState } from 'react';
import { LaborTable, Column } from '@/components/common/labor/LaborTable';
import { StaffSkill } from './types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SkillTableProps {
  data: StaffSkill[];
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: string[];
  onViewDetail: (skill: StaffSkill) => void;
  onEdit: (skill: StaffSkill) => void;
  onDelete?: (skill: StaffSkill) => void;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatch?: () => void;
  onAddClick?: () => void;
}

export function SkillTable({
  data,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onViewDetail,
  onEdit,
  onDelete,
  onSelectAll,
  onSelectRow,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatch,
  onAddClick,
}: SkillTableProps) {
  // 本地分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 计算分页
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allSelected = selectedRows.length === data.length && data.length > 0;

  // 状态徽章颜色
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '正常':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '即将过期':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case '已过期':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // 等级徽章颜色
  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case '技师':
        return 'bg-purple-100 text-purple-700';
      case '高级':
        return 'bg-blue-100 text-blue-700';
      case '中级':
        return 'bg-amber-100 text-amber-700';
      case '初级':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const columns: Column<StaffSkill>[] = [
    ...(showCheckbox ? [{
      key: 'select',
      title: '',
      width: '50px' as string,
      render: (row: StaffSkill) => (
        <input
          type="checkbox"
          checked={selectedRows.includes(row.id)}
          onChange={() => onSelectRow?.(row.id)}
          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
      ),
    }] : []),
    {
      key: 'staffId',
      title: '工号',
      width: '100px',
      sortable: true,
    },
    {
      key: 'staffName',
      title: '姓名',
      width: '100px',
      sortable: true,
    },
    {
      key: 'department',
      title: '部门',
      width: '100px',
      sortable: true,
    },
    {
      key: 'skills',
      title: '技能标签',
      render: (row: StaffSkill) => (
        <div className="flex flex-wrap gap-1 max-w-md">
          {row.skills.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className={cn(
                'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded',
                getLevelBadgeClass(skill.level)
              )}
            >
              {skill.tag}
            </span>
          ))}
          {row.skills.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
              +{row.skills.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'totalSkills',
      title: '技能数',
      width: '80px',
      sortable: true,
      render: (row: StaffSkill) => (
        <span className="font-medium text-gray-900">{row.totalSkills}</span>
      ),
    },
    {
      key: 'certificationCount',
      title: '证书数',
      width: '80px',
      sortable: true,
      render: (row: StaffSkill) => (
        <span className="text-gray-700">{row.certificationCount}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      sortable: true,
      render: (row: StaffSkill) => (
        <Badge
          variant="outline"
          className={cn('font-medium', getStatusBadgeClass(row.status))}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '180px',
      render: (row: StaffSkill) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetail(row)}
            className="px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
          >
            详情
          </button>
          <button
            onClick={() => onEdit(row)}
            className="px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded transition-colors"
          >
            编辑
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(row)}
              className="px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              删除
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* 表格标题栏 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">员工技能档案</h3>
          <div className="flex gap-2">
            {(batchEditMode || batchDeleteMode || exportMode) ? (
              <>
                {batchEditMode && (
                  <>
                    <button
                      onClick={onBatchEditClick}
                      disabled={selectedRows.length === 0}
                      className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      批量编辑
                    </button>
                    <button
                      onClick={onCancelBatch}
                      className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </>
                )}
                {batchDeleteMode && (
                  <>
                    <button
                      onClick={onBatchDeleteClick}
                      disabled={selectedRows.length === 0}
                      className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      确认删除
                    </button>
                    <button
                      onClick={onCancelBatch}
                      className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </>
                )}
                {exportMode && (
                  <>
                    <button
                      onClick={onBatchExportClick}
                      disabled={selectedRows.length === 0}
                      className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      确认导出
                    </button>
                    <button
                      onClick={onCancelBatch}
                      className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {onAddClick && (
                  <button
                    onClick={onAddClick}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    新增
                  </button>
                )}
                <button
                  onClick={onBatchEditClick}
                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  编辑
                </button>
                {onBatchDeleteClick && (
                  <button
                    onClick={onBatchDeleteClick}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    删除
                  </button>
                )}
                {onBatchExportClick && (
                  <button
                    onClick={onBatchExportClick}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    导出
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {showCheckbox && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={onSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">技能标签</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">技能数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">证书数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-300">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={showCheckbox ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                    暂无员工技能档案
                  </td>
                </tr>
              ) : (
                paginatedData.map((skill) => (
                  <tr key={skill.id} className="hover:bg-blue-100 transition-colors">
                    {showCheckbox && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(skill.id)}
                          onChange={() => onSelectRow?.(skill.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{skill.staffId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">{skill.staffName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{skill.department}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {skill.skills.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded',
                              getLevelBadgeClass(s.level)
                            )}
                          >
                            {s.tag}
                          </span>
                        ))}
                        {skill.skills.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                            +{skill.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{skill.totalSkills}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{skill.certificationCount}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={cn('font-medium', getStatusBadgeClass(skill.status))}
                      >
                        {skill.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewDetail(skill)}
                          className="px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        >
                          详情
                        </button>
                        <button
                          onClick={() => onEdit(skill)}
                          className="px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        >
                          编辑
                        </button>
                        {onDelete && (
                          <button
                            onClick={() => onDelete(skill)}
                            className="px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {data.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SkillTable;
