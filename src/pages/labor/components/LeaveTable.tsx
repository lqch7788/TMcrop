/**
 * 请假申请表格组件
 */
import { Eye, Check, X, Undo2 } from 'lucide-react';
import ProTable from '../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../components/common/labor/LaborStatusBadge';
import { LeaveRecord, LeaveStatus } from '../../../components/labor/leave/types';

export interface LeaveTableProps {
  data: LeaveRecord[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onViewDetail: (record: LeaveRecord) => void;
  onApprove: (record: LeaveRecord) => void;
  onReject: (record: LeaveRecord) => void;
  onWithdraw: (record: LeaveRecord) => void;
}

/**
 * 请假申请表格列定义
 */
const getColumns = (
  onViewDetail: (record: LeaveRecord) => void,
  onApprove: (record: LeaveRecord) => void,
  onReject: (record: LeaveRecord) => void,
  onWithdraw: (record: LeaveRecord) => void
) => [
  {
    title: '员工姓名',
    dataIndex: 'staffName',
    key: 'staffName',
    width: 120,
  },
  {
    title: '请假类型',
    dataIndex: 'leaveType',
    key: 'leaveType',
    width: 100,
  },
  {
    title: '开始日期',
    dataIndex: 'startDate',
    key: 'startDate',
    width: 120,
  },
  {
    title: '结束日期',
    dataIndex: 'endDate',
    key: 'endDate',
    width: 120,
  },
  {
    title: '天数',
    dataIndex: 'days',
    key: 'days',
    width: 80,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (value: LeaveStatus) => {
      const statusMap: Record<LeaveStatus, { label: string; status: string }> = {
        '待审批': { label: '待审批', status: 'pending' },
        '已通过': { label: '已通过', status: 'completed' },
        '已拒绝': { label: '已拒绝', status: 'rejected' },
        '已撤回': { label: '已撤回', status: 'cancelled' },
        '已取消': { label: '已取消', status: 'cancelled' },
      };
      const config = statusMap[value] || { label: value, status: 'pending' };
      return <LaborStatusBadge status={config.status} label={config.label} />;
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    render: (_: any, record: LeaveRecord) => (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onViewDetail(record)}
          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
          title="查看详情"
        >
          <Eye className="w-4 h-4" />
        </button>
        {record.status === '待审批' && (
          <>
            <button
              onClick={() => onApprove(record)}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
              title="批准"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReject(record)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title="驳回"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => onWithdraw(record)}
              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
              title="撤回"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    ),
  },
];

/**
 * 请假申请表格组件
 */
export function LeaveTable({
  data,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  onViewDetail,
  onApprove,
  onReject,
  onWithdraw,
}: LeaveTableProps) {
  const columns = getColumns(onViewDetail, onApprove, onReject, onWithdraw);

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
