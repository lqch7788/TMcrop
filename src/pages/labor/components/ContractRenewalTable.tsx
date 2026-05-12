/**
 * 合同续签表格组件
 */
import { Eye, Check, X } from 'lucide-react';
import ProTable from '../../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../../components/common/labor/LaborStatusBadge';
import { Button } from '@/components/ui';
import { ContractRenewalRecord, ContractRenewalStatus } from '../types/contractRenewal.types';

export interface ContractRenewalTableProps {
  data: ContractRenewalRecord[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onViewDetail: (record: ContractRenewalRecord) => void;
  onApprove: (record: ContractRenewalRecord) => void;
  onReject: (record: ContractRenewalRecord) => void;
}

/**
 * 合同续签表格列定义
 */
const getColumns = (
  onViewDetail: (record: ContractRenewalRecord) => void,
  onApprove: (record: ContractRenewalRecord) => void,
  onReject: (record: ContractRenewalRecord) => void
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
    title: '当前合同到期日',
    dataIndex: 'currentContractEnd',
    key: 'currentContractEnd',
    width: 130,
  },
  {
    title: '新合同开始日期',
    dataIndex: 'newContractStart',
    key: 'newContractStart',
    width: 130,
  },
  {
    title: '新合同到期日',
    dataIndex: 'newContractEnd',
    key: 'newContractEnd',
    width: 130,
  },
  {
    title: '续签期限',
    dataIndex: 'renewalPeriod',
    key: 'renewalPeriod',
    width: 90,
    render: (value: number) => `${value}个月`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (value: ContractRenewalStatus) => {
      const statusMap: Record<ContractRenewalStatus, { label: string; status: string }> = {
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
    render: (_: any, record: ContractRenewalRecord) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewDetail(record)}
          className="text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
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
              className="text-gray-500 hover:text-green-600 hover:bg-green-50"
              title="批准"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onReject(record)}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
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
 * 合同续签表格组件
 */
export function ContractRenewalTable({
  data,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  onViewDetail,
  onApprove,
  onReject,
}: ContractRenewalTableProps) {
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
