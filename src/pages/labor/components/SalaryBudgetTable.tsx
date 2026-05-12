/**
 * 工资预算表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import { Button } from '@/components/ui';
import ProTable from '../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../components/common/labor/LaborStatusBadge';
import { SalaryBudgetRecord } from '../types/salaryBudget.types';
import { ApprovalStatus, getApprovalStatusName } from '../../../types/approval';
import { ApprovalStatusLabels } from '../../../types/labor/approval';

export interface SalaryBudgetTableProps {
  data: SalaryBudgetRecord[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onViewDetail: (record: SalaryBudgetRecord) => void;
  onApprove: (record: SalaryBudgetRecord) => void;
  onReject: (record: SalaryBudgetRecord) => void;
}

/**
 * 工资预算表格列定义
 */
const getColumns = (
  onViewDetail: (record: SalaryBudgetRecord) => void,
  onApprove: (record: SalaryBudgetRecord) => void,
  onReject: (record: SalaryBudgetRecord) => void
) => [
  {
    title: '预算编号',
    dataIndex: 'budgetCode',
    key: 'budgetCode',
    width: 160,
  },
  {
    title: '部门',
    dataIndex: 'deptName',
    key: 'deptName',
    width: 100,
  },
  {
    title: '预算月份',
    dataIndex: 'budgetMonth',
    key: 'budgetMonth',
    width: 100,
    render: (value: string) => {
      if (!value) return '-';
      const [year, month] = value.split('-');
      return `${year}年${parseInt(month)}月`;
    },
  },
  {
    title: '基本工资总额',
    dataIndex: 'totalBaseSalary',
    key: 'totalBaseSalary',
    width: 120,
    render: (value: number) => value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '¥0.00',
  },
  {
    title: '加班费总额',
    dataIndex: 'totalOvertimePay',
    key: 'totalOvertimePay',
    width: 120,
    render: (value: number) => value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '¥0.00',
  },
  {
    title: '奖金总额',
    dataIndex: 'totalBonus',
    key: 'totalBonus',
    width: 100,
    render: (value: number) => value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '¥0.00',
  },
  {
    title: '总计',
    dataIndex: 'grandTotal',
    key: 'grandTotal',
    width: 130,
    render: (value: number) => (
      <span className="font-medium text-emerald-600">
        ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (value: ApprovalStatus) => {
      const config = ApprovalStatusLabels[value];
      return (
        <LaborStatusBadge
          status={value === ApprovalStatus.APPROVED ? 'completed' : value === ApprovalStatus.PENDING ? 'pending' : value === ApprovalStatus.REJECTED ? 'rejected' : value === ApprovalStatus.CANCELLED ? 'cancelled' : 'draft'}
          label={config?.label || getApprovalStatusName(value)}
        />
      );
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    render: (_: any, record: SalaryBudgetRecord) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onViewDetail(record)} title="查看详情">
          <Eye className="w-4 h-4" />
        </Button>
        {record.status === ApprovalStatus.PENDING && (
          <>
            <Button variant="ghost" size="icon" onClick={() => onApprove(record)} title="批准">
              <Check className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onReject(record)} title="驳回">
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    ),
  },
];

/**
 * 工资预算表格组件
 */
export function SalaryBudgetTable({
  data,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  onViewDetail,
  onApprove,
  onReject,
}: SalaryBudgetTableProps) {
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
