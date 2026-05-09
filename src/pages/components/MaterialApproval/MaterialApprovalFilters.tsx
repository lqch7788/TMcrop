// MaterialApprovalFilters 组件
// 物料审批页面的筛选区域组件
import { RefreshCw } from 'lucide-react';
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
          <label className="block text-xs font-medium text-gray-700 mb-1">领料单号</label>
          <input
            type="text"
            placeholder="单号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 申领人 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">申领人</label>
          <input
            type="text"
            placeholder="申请人..."
            value={searchApplicant}
            onChange={(e) => setSearchApplicant(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 部门 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">部门</label>
          <select
            value={searchDepartment}
            onChange={(e) => setSearchDepartment(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="全部">全部</option>
            <option value="生产部">生产部</option>
            <option value="技术部">技术部</option>
            <option value="后勤部">后勤部</option>
            <option value="设备部">设备部</option>
          </select>
        </div>

        {/* 生产批次号 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">生产批次号</label>
          <input
            type="text"
            placeholder="批次号..."
            value={searchBatchCode}
            onChange={(e) => setSearchBatchCode(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 开始日期 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
          <input
            type="date"
            value={searchDateStart}
            onChange={(e) => setSearchDateStart(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 结束日期 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
          <input
            type="date"
            value={searchDateEnd}
            onChange={(e) => setSearchDateEnd(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 状态 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="全部">全部</option>
            <option value="待审批">待审批</option>
            <option value="已通过">已通过</option>
            <option value="已拒绝">已拒绝</option>
          </select>
        </div>

        {/* 按钮区域 */}
        <div className="flex gap-2">
          <button className="flex-1 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-1">
            搜索
          </button>
          <button
            onClick={onReset}
            className="flex-1 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
