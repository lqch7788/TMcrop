/**
 * 招聘申请表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import ProTable from '../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../components/common/labor/LaborStatusBadge';
import { RecruitmentRecord, RecruitmentStatus } from '../types/recruitment.types';
import { Button } from '@/components/ui/button';

export interface RecruitmentTableProps {
  data: RecruitmentRecord[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onViewDetail: (record: RecruitmentRecord) => void;
  onApprove: (record: RecruitmentRecord) => void;
  onReject: (record: RecruitmentRecord) => void;
}

/** 获取优先级颜色 */
function getPriorityColor(priority: string) {
  switch (priority) {
    case '紧急': return 'text-red-600 bg-red-50';
    case '高': return 'text-orange-600 bg-orange-50';
    case '普通': return 'text-blue-600 bg-blue-50';
    case '低': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

/**
 * 招聘申请表格列定义
 */
const getColumns = (
  onViewDetail: (record: RecruitmentRecord) => void,
  onApprove: (record: RecruitmentRecord) => void,
  onReject: (record: RecruitmentRecord) => void
) => [
  {
    title: '招聘编号',
    dataIndex: 'recruitmentCode',
    key: 'recruitmentCode',
    width: 160,
  },
  {
    title: '申请部门',
    dataIndex: 'deptName',
    key: 'deptName',
    width: 100,
  },
  {
    title: '招聘岗位',
    dataIndex: 'position',
    key: 'position',
    width: 100,
  },
  {
    title: '招聘人数',
    dataIndex: 'headcount',
    key: 'headcount',
    width: 80,
    render: (value: number) => `${value}人`,
  },
  {
    title: '用工类型',
    dataIndex: 'employmentType',
    key: 'employmentType',
    width: 100,
  },
  {
    title: '薪资范围',
    dataIndex: 'salaryRange',
    key: 'salaryRange',
    width: 120,
    render: (_: any, record: RecruitmentRecord) => `${record.salaryMin}-${record.salaryMax}`,
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    render: (value: string) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(value)}`}>
        {value}
      </span>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (value: RecruitmentStatus) => {
      const statusMap: Record<RecruitmentStatus, { label: string; status: string }> = {
        '待审批': { label: '待审批', status: 'pending' },
        '已通过': { label: '已通过', status: 'completed' },
        '已拒绝': { label: '已拒绝', status: 'rejected' },
        '已撤回': { label: '已撤回', status: 'cancelled' },
      };
      const config = statusMap[value] || { label: value, status: 'pending' };
      return <LaborStatusBadge status={config.status} label={config.label} />;
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    render: (_: any, record: RecruitmentRecord) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewDetail(record)}
          title="查看详情"
        >
          <Eye className="w-4 h-4" />
        </Button>
        {record.status === '待审批' && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onApprove(record)}
              title="批准"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onReject(record)}
              title="驳回"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    ),
  },
];

/**
 * 招聘申请表格组件
 */
export function RecruitmentTable({
  data,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  onViewDetail,
  onApprove,
  onReject,
}: RecruitmentTableProps) {
  const columns = getColumns(onViewDetail, onApprove, onReject);

  return (
    <ProTable
      columns={columns}
      dataSource={data}
      headerClassName="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
      rowSelection={
        selectedRowKeys.length > 0
          ? {
              selectedRowKeys,
              onChange: onSelectionChange,
            }
          : undefined
      }
    />
  );
}
