import { Search } from 'lucide-react';
import { Worker } from '../../../types';

interface PersonnelFiltersProps {
  searchTerm: string;
  departmentFilter: string;
  statusFilter: string;
  departments: string[];
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function PersonnelFilters({
  searchTerm,
  departmentFilter,
  statusFilter,
  departments,
  onSearchChange,
  onDepartmentChange,
  onStatusChange,
}: PersonnelFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 搜索 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索姓名或工号..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* 部门筛选 */}
        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[140px]"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        {/* 状态筛选 */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[120px]"
        >
          <option value="全部">全部状态</option>
          <option value="在职">在职</option>
          <option value="离职">离职</option>
          <option value="退休">退休</option>
        </select>
      </div>
    </div>
  );
}

export default PersonnelFilters;
