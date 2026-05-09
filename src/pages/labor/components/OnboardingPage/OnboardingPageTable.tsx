/**
 * 入职办理页面表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import ProTable from '../../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import { OnboardingRecord, STATUS_CONFIG_MAP } from '../../types/onboardingPage.types';

interface OnboardingPageTableProps {
  dataSource: OnboardingRecord[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  batchMode: 'none' | 'approve' | 'reject' | 'export';
  onOpenDetail: (record: OnboardingRecord) => void;
  onApprove: (record: OnboardingRecord) => void;
  onReject: (record: OnboardingRecord) => void;
}

/**
 * 入职办理页面表格组件
 */
export function OnboardingPageTable({
  dataSource,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  batchMode,
  onOpenDetail,
  onApprove,
  onReject,
}: OnboardingPageTableProps) {
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
      title: '岗位',
      dataIndex: 'position',
      key: 'position',
      width: 100,
    },
    {
      title: '预计入职日期',
      dataIndex: 'expectedStartDate',
      key: 'expectedStartDate',
      width: 130,
    },
    {
      title: '实际入职日期',
      dataIndex: 'actualStartDate',
      key: 'actualStartDate',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: OnboardingRecord['status']) => {
        const config = STATUS_CONFIG_MAP[value] || { label: value, status: 'pending' };
        return <LaborStatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: OnboardingRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenDetail(record)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === '待入职' && (
            <>
              <button
                onClick={() => onApprove(record)}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="批准入职"
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
