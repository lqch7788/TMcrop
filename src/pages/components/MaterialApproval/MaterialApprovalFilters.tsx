// MaterialApprovalFilters 组件
// 物料审批页面的筛选区域组件
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import type { UseMaterialApprovalReturn } from '../../types/materialApproval.types';

interface MaterialApprovalFiltersProps {
  // 筛选状态
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchApplicant: string;
  setSearchApplicant: (applicant: string) => void;
  searchBatchCode: string;
  setSearchBatchCode: (code: string) => void;
  searchDepartment: string;
  setSearchDepartment: (dept: string) => void;
  searchDateStart: string;
  setSearchDateStart: (date: string) => void;
  searchDateEnd: string;
  setSearchDateEnd: (date: string) => void;
  // 重置函数
  onReset: () => void;
}

/**
 * MaterialApprovalFilters 组件
 * 物料审批页面的筛选区域，包含单号、申请人、部门、批次号、日期、状态筛选
 */
export function MaterialApprovalFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  searchApplicant,
  setSearchApplicant,
  searchBatchCode,
  setSearchBatchCode,
  searchDepartment,
  setSearchDepartment,
  searchDateStart,
  setSearchDateStart,
  searchDateEnd,
  setSearchDateEnd,
  onReset,
}: MaterialApprovalFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-8 gap-3 items-end">
        {/* 领料单号 */}
        <div>
          <Label className="text-xs text-gray-700">领料单号</Label>
          <Input
            placeholder="单号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10"
          />
        </div>

        {/* 申领人 */}
        <div>
          <Label className="text-xs text-gray-700">申领人</Label>
          <Input
            placeholder="申请人..."
            value={searchApplicant}
            onChange={(e) => setSearchApplicant(e.target.value)}
            className="w-full h-10"
          />
        </div>

        {/* 部门 */}
        <div>
          <Label className="text-xs text-gray-700">部门</Label>
          <Select value={searchDepartment} onValueChange={(v) => setSearchDepartment(v)}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              <SelectItem value="生产部">生产部</SelectItem>
              <SelectItem value="技术部">技术部</SelectItem>
              <SelectItem value="后勤部">后勤部</SelectItem>
              <SelectItem value="设备部">设备部</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 生产批次号 */}
        <div>
          <Label className="text-xs text-gray-700">生产批次号</Label>
          <Input
            placeholder="批次号..."
            value={searchBatchCode}
            onChange={(e) => setSearchBatchCode(e.target.value)}
            className="w-full h-10"
          />
        </div>

        {/* 开始日期 */}
        <div>
          <Label className="text-xs text-gray-700">开始日期</Label>
          <DatePicker
            selected={searchDateStart ? new Date(searchDateStart) : undefined}
            onChange={(date) => setSearchDateStart(date.toISOString().slice(0, 10))}
          />
        </div>

        {/* 结束日期 */}
        <div>
          <Label className="text-xs text-gray-700">结束日期</Label>
          <DatePicker
            selected={searchDateEnd ? new Date(searchDateEnd) : undefined}
            onChange={(date) => setSearchDateEnd(date.toISOString().slice(0, 10))}
          />
        </div>

        {/* 状态 */}
        <div>
          <Label className="text-xs text-gray-700">状态</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              <SelectItem value="待审批">待审批</SelectItem>
              <SelectItem value="已通过">已通过</SelectItem>
              <SelectItem value="已拒绝">已拒绝</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 按钮区域 */}
        <div className="flex gap-2">
          <Button variant="default" className="h-8 px-4">
            搜索
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            className="h-8 px-4"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            重置
          </Button>
        </div>
      </div>
    </div>
  );
}
