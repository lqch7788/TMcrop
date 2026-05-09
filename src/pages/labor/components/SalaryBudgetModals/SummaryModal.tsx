/**
 * 工资预算汇总弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import ProTable from '../../../../components/common/table/ProTable';
import { BudgetSummary } from '../../types/salaryBudget.types';

export interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: BudgetSummary[];
}

/**
 * 汇总表格列定义
 */
const summaryColumns = [
  {
    title: '月份',
    dataIndex: 'month',
    key: 'month',
    width: 120,
    render: (value: string) => {
      const [year, month] = value.split('-');
      return `${year}年${parseInt(month)}月`;
    },
  },
  {
    title: '部门数',
    dataIndex: 'count',
    key: 'count',
    width: 80,
  },
  {
    title: '基本工资总额',
    dataIndex: 'totalBaseSalary',
    key: 'totalBaseSalary',
    width: 150,
    render: (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
  },
  {
    title: '加班费总额',
    dataIndex: 'totalOvertimePay',
    key: 'totalOvertimePay',
    width: 150,
    render: (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
  },
  {
    title: '奖金总额',
    dataIndex: 'totalBonus',
    key: 'totalBonus',
    width: 120,
    render: (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
  },
  {
    title: '汇总总计',
    dataIndex: 'grandTotal',
    key: 'grandTotal',
    width: 150,
    render: (value: number) => (
      <span className="font-medium text-emerald-600">
        ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
];

/**
 * 工资预算汇总弹窗组件
 * 按月份汇总所有部门的工资预算数据
 */
export function SummaryModal({
  isOpen,
  onClose,
  summaryData,
}: SummaryModalProps) {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="预算汇总"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-500 mb-4">
          按月份汇总所有部门的工资预算数据
        </div>

        <ProTable
          columns={summaryColumns}
          dataSource={summaryData}
          pagination={false}
        />

        {/* 合计行 */}
        {summaryData.length > 0 && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-gray-500">汇总部门数：</span>
                <span className="font-medium">{summaryData.reduce((sum, item) => sum + item.count, 0)}</span>
              </div>
              <div>
                <span className="text-gray-500">基本工资：</span>
                <span className="font-medium text-emerald-600">
                  ¥{summaryData.reduce((sum, item) => sum + item.totalBaseSalary, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">加班费：</span>
                <span className="font-medium text-emerald-600">
                  ¥{summaryData.reduce((sum, item) => sum + item.totalOvertimePay, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">奖金：</span>
                <span className="font-medium text-emerald-600">
                  ¥{summaryData.reduce((sum, item) => sum + item.totalBonus, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">总计：</span>
                <span className="font-bold text-emerald-700">
                  ¥{summaryData.reduce((sum, item) => sum + item.grandTotal, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}
