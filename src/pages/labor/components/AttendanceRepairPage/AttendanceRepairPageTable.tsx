/**
 * 考勤补录页面 - 表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import { Button } from '@/components/ui';
import ProTable from '../../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import type { AttendanceRepairRecord, PaginationState, BatchMode } from './types/attendanceRepairPage.types';

interface AttendanceRepairPageTableProps {
  records: AttendanceRepairRecord[];
  pagination: PaginationState;
  batchMode: BatchMode;
  selectedRowKeys: React.Key[];
  onPaginationChange: (page: number, size: number) => void;
  onSelectedRowKeysChange: (keys: React.Key[]) => void;
  onOpenDetailModal: (record: AttendanceRepairRecord) => void;
  onApprove: (record: AttendanceRepairRecord) => void;
  onReject: (record: AttendanceRepairRecord) => void;
}

export function AttendanceRepairPageTable({
  records,
  pagination,
  batchMode,
  selectedRowKeys,
  onPaginationChange,
  onSelectedRowKeysChange,
  onOpenDetailModal,
  onApprove,
  onReject,
}: AttendanceRepairPageTableProps) {
  // 表格列定义
  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 120,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: '补录日期',
      dataIndex: 'repairDate',
      key: 'repairDate',
      width: 120,
    },
    {
      title: '上班时间',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      width: 100,
    },
    {
      title: '下班时间',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      width: 100,
    },
    {
      title: '补录原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: AttendanceRepairRecord['status']) => {
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
      width: 150,
      render: (_: any, record: AttendanceRepairRecord) => (
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onOpenDetailModal(record)}
            variant="ghost"
            size="icon"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {record.status === '待审批' && (
            <>
              <Button
                onClick={() => onApprove(record)}
                variant="ghost"
                size="icon"
                title="批准"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => onReject(record)}
                variant="ghost"
                size="icon"
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

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <ProTable
        columns={columns}
        dataSource={records}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: onPaginationChange,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        rowSelection={
          batchMode !== 'none'
            ? {
                selectedRowKeys,
                onChange: onSelectedRowKeysChange,
              }
            : undefined
        }
      />
    </div>
  );
}
