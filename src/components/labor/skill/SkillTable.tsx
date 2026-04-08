import React, { useState } from 'react';
import { LaborTable, Column } from '@/components/common/labor/LaborTable';
import { StaffSkill } from './types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SkillTableProps {
  data: StaffSkill[];
  onViewDetail: (skill: StaffSkill) => void;
  onEdit: (skill: StaffSkill) => void;
}

export function SkillTable({ data, onViewDetail, onEdit }: SkillTableProps) {
  // 本地分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 计算分页
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
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
      render: (row) => (
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
      render: (row) => (
        <span className="font-medium text-gray-900">{row.totalSkills}</span>
      ),
    },
    {
      key: 'certificationCount',
      title: '证书数',
      width: '80px',
      sortable: true,
      render: (row) => (
        <span className="text-gray-700">{row.certificationCount}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      sortable: true,
      render: (row) => (
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
      width: '120px',
      render: (row) => (
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
        </div>
      ),
    },
  ];

  return (
    <LaborTable
      columns={columns}
      data={paginatedData}
      rowKey="id"
      emptyText="暂无员工技能档案"
      title="员工技能档案"
      pagination={{
        page: currentPage,
        pageSize,
        total: data.length,
      }}
      onPageChange={setCurrentPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setCurrentPage(1);
      }}
    />
  );
}

export default SkillTable;
