/**
 * 加班申请页面 - 表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import { Button } from '@/components/ui';
import ProTable from '../../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import type { OvertimeRecord, PaginationState, BatchMode } from './types/overtimePage.types';

interface OvertimePageTableProps {
  records: OvertimeRecord[];
  pagination: PaginationState;
  batchMode: BatchMode;
  selectedRowKeys: React.Key[];
  onPaginationChange: (page: number, size: number) => void;
  onSelectedRowKeysChange: (keys: React.Key[]) => void;
  onOpenDetailModal: (record: OvertimeRecord) => void;
  onApprove: (record: OvertimeRecord) => void;
  onReject: (record: OvertimeRecord) => void;
}

export function OvertimePageTable({
  records,
  pagination,
  batchMode,
  selectedRowKeys,
  onPaginationChange,
  onSelectedRowKeysChange,
  onOpenDetailModal,
  onApprove,
  onReject,
}: OvertimePageTableProps) {
  // 表格列定义
  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 120,
    },
    {
      title: '加班类型',
      dataIndex: 'overtimeType',
      key: 'overtimeType',
      width: 120,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 180,
    },
    {
      title: '时长(小时)',
      dataIndex: 'hours',
      key: 'hours',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: OvertimeRecord['status']) => {
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
      render: (_: any, record: OvertimeRecord) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenDetailModal(record)}
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
