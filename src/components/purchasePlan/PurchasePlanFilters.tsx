/**
 * 采购计划筛选表单组件
 */
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

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
          <Label className="text-gray-700">关联生产批次</Label>
          <Input
            value={relatedBatchCode}
            onChange={(e) => onRelatedBatchCodeChange(e.target.value)}
            placeholder="请输入"
          />
        </div>
        <div className="min-w-[90px]">
          <Label className="text-gray-700">申请人</Label>
          <Input
            value={applicant}
            onChange={(e) => onApplicantChange(e.target.value)}
            placeholder="请输入"
          />
        </div>
        <div className="min-w-[90px]">
          <Label className="text-gray-700">申请部门</Label>
          <Input
            value={applicantDepartment}
            onChange={(e) => onApplicantDepartmentChange(e.target.value)}
            placeholder="请输入"
          />
        </div>
        <div className="min-w-[70px]">
          <Label className="text-gray-700">优先级</Label>
          <Select value={priority} onValueChange={(v) => onPriorityChange(v)}>
            <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="urgent">紧急</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="normal">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[90px]">
          <Label className="text-gray-700">状态</Label>
          <Select value={status} onValueChange={(v) => onStatusChange(v)}>
            <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="pending">待审批</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="purchasing">采购中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[100px]">
          <Label className="text-gray-700">预警状态</Label>
          <Select value={alertFilter} onValueChange={(v) => onAlertFilterChange(v)}>
            <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="overdue">已逾期</SelectItem>
              <SelectItem value="warning">即将到期</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[110px]">
          <Label className="text-gray-700">需求开始日期</Label>
          <Input
            type="date"
            value={requiredStartDate}
            onChange={(e) => onRequiredStartDateChange(e.target.value)}
          />
        </div>
        <div className="min-w-[110px]">
          <Label className="text-gray-700">需求结束日期</Label>
          <Input
            type="date"
            value={requiredEndDate}
            onChange={(e) => onRequiredEndDateChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-end ml-auto">
          <Button size="sm" variant="warning" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button size="sm" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PurchasePlanFilters;
