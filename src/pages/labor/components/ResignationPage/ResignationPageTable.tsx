/**
 * 离职申请页面表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import ProTable from '../../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import { ResignationRecord, RESIGNATION_STATUS_CONFIG_MAP } from '../../types/resignationPage.types';

interface ResignationPageTableProps {
  dataSource: ResignationRecord[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  batchMode: 'none' | 'approve' | 'reject' | 'export';
  onOpenDetail: (record: ResignationRecord) => void;
  onApprove: (record: ResignationRecord) => void;
  onReject: (record: ResignationRecord) => void;
}

/**
 * 离职申请页面表格组件
 */
export function ResignationPageTable({
  dataSource,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  batchMode,
  onOpenDetail,
  onApprove,
  onReject,
}: ResignationPageTableProps) {
  // 表格列定义
  const columns = [
    {
      title: '离职编号',
      dataIndex: 'resignationCode',
      key: 'resignationCode',
      width: 180,
    },
    {
      title: '申请人',
      dataIndex: 'workerName',
      key: 'workerName',
      width: 100,
    },
    {
      title: '离职类型',
      dataIndex: 'resignationType',
      key: 'resignationType',
      width: 100,
    },
    {
      title: '离职原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
      ellipsis: true,
    },
    {
      title: '预计最后工作日',
      dataIndex: 'expectedLastDay',
      key: 'expectedLastDay',
      width: 130,
    },
    {
      title: '交接人',
      dataIndex: 'handoverUserName',
      key: 'handoverUserName',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: ResignationRecord['status']) => {
        const config = RESIGNATION_STATUS_CONFIG_MAP[value] || { label: value, status: 'pending' };
        return <LaborStatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ResignationRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenDetail(record)}
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
        dataSource={dataSource}
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
          batchMode !== 'none'
            ? {
                selectedRowKeys,
                onChange: onSelectionChange,
              }
            : undefined
        }
      />
    </div>
  );
}
