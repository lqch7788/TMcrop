import { X } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { SalarySlipModalProps } from './types';

/**
 * 工资条详情弹窗
 */
export function SalarySlipModal({ record, open, onClose }: SalarySlipModalProps) {
  if (!open || !record) return null;

  // 计算应发合计
  const grossSalary = record.baseSalary + record.overtimePay + record.bonuses;

  // 计算扣款合计
  const totalDeductions =
    record.deductions +
    record.lateDeductions +
    record.absenceDeductions +
    record.socialSecurity +
    record.housingFund +
    record.personalTax;

  const content = (
    <div>
      {/* 基本信息 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-500">员工信息</h4>
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              record.status === '已发放'
                ? 'bg-green-100 text-green-700'
                : record.status === '已确认'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {record.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">姓名</p>
            <p className="text-sm font-medium text-gray-900">{record.staffName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">月份</p>
            <p className="text-sm font-medium text-gray-900">{record.month}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">工号</p>
            <p className="text-sm font-medium text-gray-900">{record.staffId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">计算方式</p>
            <p className="text-sm font-medium text-gray-900">{record.calcType}</p>
          </div>
        </div>
      </div>

      {/* 应发项目 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-500 mb-3">应发项目</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">基本工资</span>
            <span className="text-gray-900">¥{record.baseSalary.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">加班费</span>
            <span className="text-gray-900">¥{record.overtimePay.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">奖金</span>
            <span className="text-gray-900">¥{record.bonuses.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-2">
            <span className="text-gray-700">应发合计</span>
            <span className="text-emerald-600">¥{grossSalary.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 扣款项目 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-500 mb-3">扣款项目</h4>
        <div className="space-y-2">
          {record.deductions > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">扣款</span>
              <span className="text-red-600">-¥{record.deductions.toLocaleString()}</span>
            </div>
          )}
          {record.lateDeductions > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">迟到扣款</span>
              <span className="text-red-600">-¥{record.lateDeductions.toLocaleString()}</span>
            </div>
          )}
          {record.absenceDeductions > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">缺勤扣款</span>
              <span className="text-red-600">-¥{record.absenceDeductions.toLocaleString()}</span>
            </div>
          )}
          {record.socialSecurity > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">社保</span>
              <span className="text-red-600">-¥{record.socialSecurity.toLocaleString()}</span>
            </div>
          )}
          {record.housingFund > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">公积金</span>
              <span className="text-red-600">-¥{record.housingFund.toLocaleString()}</span>
            </div>
          )}
          {record.personalTax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">个税</span>
              <span className="text-red-600">-¥{record.personalTax.toLocaleString()}</span>
            </div>
          )}
          {totalDeductions === 0 && (
            <div className="text-sm text-gray-400">无扣款</div>
          )}
          <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-2">
            <span className="text-gray-700">扣款合计</span>
            <span className="text-red-600">-¥{totalDeductions.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 实发工资 */}
      <div className="bg-emerald-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-emerald-700">实发工资</span>
          <span className="text-xl font-bold text-emerald-600">
            ¥{record.netSalary.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  const footer = (
    <button
      onClick={onClose}
      className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
    >
      关闭
    </button>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="工资条详情"
      size="md"
      showFooter={true}
      headerAction={
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
