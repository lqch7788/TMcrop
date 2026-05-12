/**
 * 调薪申请表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import ProTable from '../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../components/common/labor/LaborStatusBadge';
import { SalaryAdjustmentRecord } from '../types/salaryAdjustment.types';
import { Button } from '@/components/ui/button';

export interface SalaryAdjustmentTableProps {
  data: SalaryAdjustmentRecord[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onViewDetail: (record: SalaryAdjustmentRecord) => void;
  onApprove: (record: SalaryAdjustmentRecord) => void;
  onReject: (record: SalaryAdjustmentRecord) => void;
}

/**
 * 调薪申请表格列定义
 */
const getColumns = (
  onViewDetail: (record: SalaryAdjustmentRecord) => void,
  onApprove: (record: SalaryAdjustmentRecord) => void,
  onReject: (record: SalaryAdjustmentRecord) => void
) => [
  {
    title: '员工姓名',
    dataIndex: 'employeeName',
    key: 'employeeName',
    width: 100,
  },
  {
    title: '部门',
    dataIndex: 'department',
    key: 'department',
    width: 100,
  },
  {
    title: '岗位',
    dataIndex: 'position',
    key: 'position',
    width: 100,
  },
  {
    title: '当前薪资',
    dataIndex: 'currentSalary',
    key: 'currentSalary',
    width: 100,
    render: (value: number) => `¥${value.toLocaleString()}`,
  },
  {
    title: '申请薪资',
    dataIndex: 'proposedSalary',
    key: 'proposedSalary',
    width: 100,
    render: (value: number) => `¥${value.toLocaleString()}`,
  },
  {
    title: '调整金额',
    dataIndex: 'adjustmentAmount',
    key: 'adjustmentAmount',
    width: 100,
    render: (value: number) => (
      <span className={value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : ''}>
        {value > 0 ? '+' : ''}¥{value.toLocaleString()}
      </span>
    ),
  },
  {
    title: '调整比例',
    dataIndex: 'adjustmentRatio',
    key: 'adjustmentRatio',
    width: 80,
    render: (value: number) => (
      <span className={value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : ''}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    ),
  },
  {
    title: '调整类型',
    dataIndex: 'adjustmentType',
    key: 'adjustmentType',
    width: 100,
  },
  {
    title: '生效日期',
    dataIndex: 'effectiveDate',
    key: 'effectiveDate',
    width: 110,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (value: string) => {
      const statusMap: Record<string, { label: string; status: string }> = {
        '待审批': { label: '待审批', status: 'pending' },
        '已通过': { label: '已通过', status: 'completed' },
        '已拒绝': { label: '已拒绝', status: 'rejected' },
        '已取消': { label: '已取消', status: 'cancelled' },
      };
      const config = statusMap[value] || { label: value, status: 'pending' };
      return <LaborStatusBadge status={config.status} label={config.label} />;
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    render: (_: any, record: SalaryAdjustmentRecord) => (
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
 * 调薪申请表格组件
 */
export function SalaryAdjustmentTable({
  data,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  onViewDetail,
  onApprove,
  onReject,
}: SalaryAdjustmentTableProps) {
  const columns = getColumns(onViewDetail, onApprove, onReject);

  return (
    <ProTable
      columns={columns}
      dataSource={data}
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
