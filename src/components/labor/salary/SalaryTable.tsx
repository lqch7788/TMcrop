import { Eye, Calculator, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SalaryTableProps } from './types';

/**
 * 工资状态徽章
 */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    '待确认': { bg: 'bg-amber-100', text: 'text-amber-700' },
    '已确认': { bg: 'bg-blue-100', text: 'text-blue-700' },
    '已发放': { bg: 'bg-green-100', text: 'text-green-700' },
  };
  const { bg, text } = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {status}
    </span>
  );
}

/**
 * 工资表格组件
 */
export function SalaryTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onCalculate,
  onExport,
}: SalaryTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">工资记录</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">员工姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计算方式</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">基本工资</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">加班费</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">奖金</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">扣款合计</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">实发工资</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.map((record) => (
                <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.staffName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.month}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.calcType}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    ¥{record.baseSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    ¥{record.overtimePay.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    ¥{record.bonuses.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    -¥{(record.deductions + record.lateDeductions + record.absenceDeductions + record.socialSecurity + record.housingFund + record.personalTax).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-emerald-600 text-right">
                    ¥{record.netSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onViewDetail(record)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="查看工资条"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(record.calcType === '日薪制' || record.calcType === '时薪制') && (
                        <button
                          onClick={() => onCalculate?.(record)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="工资计算"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                      )}
                      {record.status === '已发放' && (
                        <button
                          onClick={() => onExport?.(record)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="导出工资条"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {total} 条</span>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
    </div>
  );
}
