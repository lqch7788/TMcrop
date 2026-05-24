/**
 * 离职申请页面表格组件
 */
import { Eye, Check, X, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onOpenFormModal?: () => void;
  onBatchApprove?: () => void;
  onBatchReject?: () => void;
  onBatchExport?: () => void;
  onConfirmBatchApprove?: () => void;
  onConfirmBatchReject?: () => void;
  onConfirmBatchExport?: () => void;
  onCancelBatch?: () => void;
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
  onOpenFormModal,
  onBatchApprove,
  onBatchReject,
  onBatchExport,
  onConfirmBatchApprove,
  onConfirmBatchReject,
  onConfirmBatchExport,
  onCancelBatch,
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
          <Button
            onClick={() => onOpenDetail(record)}
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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">离职申请记录</h3>
        <div className="flex gap-2">
          {batchMode === 'none' ? (
            <>
              {onOpenFormModal && (
                <Button variant="default" size="sm" onClick={onOpenFormModal}>
                  <Plus className="w-4 h-4" />
                  新增离职
                </Button>
              )}
              {onBatchApprove && (
                <Button variant="blue" size="sm" onClick={onBatchApprove}>
                  批量通过
                </Button>
              )}
              {onBatchReject && (
                <Button variant="destructive" size="sm" onClick={onBatchReject}>
                  批量驳回
                </Button>
              )}
              {onBatchExport && (
                <Button variant="default" size="sm" onClick={onBatchExport}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </>
          ) : (
            <>
              {batchMode === 'approve' && onConfirmBatchApprove && (
                <Button
                  variant="blue"
                  size="sm"
                  onClick={onConfirmBatchApprove}
                  disabled={selectedRowKeys.length === 0}
                >
                  确认通过 ({selectedRowKeys.length})
                </Button>
              )}
              {batchMode === 'reject' && onConfirmBatchReject && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onConfirmBatchReject}
                  disabled={selectedRowKeys.length === 0}
                >
                  确认驳回 ({selectedRowKeys.length})
                </Button>
              )}
              {batchMode === 'export' && onConfirmBatchExport && (
                <Button variant="default" size="sm" onClick={onConfirmBatchExport}>
                  确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
                </Button>
              )}
              {onCancelBatch && (
                <Button variant="outline" size="sm" onClick={onCancelBatch}>
                  取消
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <ProTable
        columns={columns}
        dataSource={dataSource}
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
