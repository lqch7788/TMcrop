/**
 * 采购计划筛选表单组件
 */
import { Search } from 'lucide-react';
import type { PurchasePlan } from '../../types/purchase';

interface PurchasePlanFiltersProps {
  // 筛选状态
  relatedBatchCode: string;
  purchaseType: string;
  status: string;
  alertFilter: string;
  applicant: string;
  applicantDepartment: string;
  priority: string;
  requiredStartDate: string;
  requiredEndDate: string;
  // 状态更新函数
  onRelatedBatchCodeChange: (value: string) => void;
  onPurchaseTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAlertFilterChange: (value: string) => void;
  onApplicantChange: (value: string) => void;
  onApplicantDepartmentChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onRequiredStartDateChange: (value: string) => void;
  onRequiredEndDateChange: (value: string) => void;
  // 操作函数
  onReset: () => void;
  onSearch: () => void;
}

/**
 * 采购计划筛选表单组件
 */
export function PurchasePlanFilters({
  relatedBatchCode,
  purchaseType,
  status,
  alertFilter,
  applicant,
  applicantDepartment,
  priority,
  requiredStartDate,
  requiredEndDate,
  onRelatedBatchCodeChange,
  onPurchaseTypeChange,
  onStatusChange,
  onAlertFilterChange,
  onApplicantChange,
  onApplicantDepartmentChange,
  onPriorityChange,
  onRequiredStartDateChange,
  onRequiredEndDateChange,
  onReset,
  onSearch,
}: PurchasePlanFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">关联生产批次</label>
          <input
            type="text"
            value={relatedBatchCode}
            onChange={(e) => onRelatedBatchCodeChange(e.target.value)}
            placeholder="请输入"
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="min-w-[90px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
          <input
            type="text"
            value={applicant}
            onChange={(e) => onApplicantChange(e.target.value)}
            placeholder="请输入"
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="min-w-[90px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">申请部门</label>
          <input
            type="text"
            value={applicantDepartment}
            onChange={(e) => onApplicantDepartmentChange(e.target.value)}
            placeholder="请输入"
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="min-w-[70px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option>全部</option>
            <option>紧急</option>
            <option>高</option>
            <option>中</option>
            <option>低</option>
          </select>
        </div>
        <div className="min-w-[90px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option>全部</option>
            <option>草稿</option>
            <option>待审批</option>
            <option>已通过</option>
            <option>采购中</option>
            <option>已完成</option>
            <option>已取消</option>
          </select>
        </div>
        <div className="min-w-[100px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">预警状态</label>
          <select
            value={alertFilter}
            onChange={(e) => onAlertFilterChange(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option>全部</option>
            <option>已逾期</option>
            <option>即将到期</option>
          </select>
        </div>
        <div className="min-w-[110px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">需求开始日期</label>
          <input
            type="date"
            value={requiredStartDate}
            onChange={(e) => onRequiredStartDateChange(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="min-w-[110px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">需求结束日期</label>
          <input
            type="date"
            value={requiredEndDate}
            onChange={(e) => onRequiredEndDateChange(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2 items-end ml-auto">
          <button onClick={onReset} className="h-9 px-4 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600">
            重置
          </button>
          <button onClick={onSearch} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchasePlanFilters;
