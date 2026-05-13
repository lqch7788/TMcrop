import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, Edit, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDepartmentStore } from '../stores';

// 部门列表数据结构
interface DepartmentData {
  id: number;
  code: string;
  name: string;
  parent: string;
  manager: string;
  staffCount: number;
  description: string;
  establishDate: string;
  status: string;
  statusClass: string;
}

export default function DepartmentSettings() {
  const departments = useDepartmentStore((state) => state.departments);
  const loading = useDepartmentStore((state) => state.loading);
  const loadDepartments = useDepartmentStore((state) => state.loadDepartments);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (departments.length === 0 && !loading) {
      loadDepartments();
    }
  }, [departments.length, loading, loadDepartments]);

  // 将API数据转换为页面需要的格式
  const departmentList: DepartmentData[] = departments.map((dept, index) => ({
    id: index + 1,
    code: dept.oid || `D${String(index + 1).padStart(3, '0')}`,
    name: dept.name,
    parent: '-',
    manager: dept.managerName || '-',
    staffCount: 0,
    description: '-',
    establishDate: '-',
    status: dept.status === 'active' ? '正常' : '停用',
    statusClass: dept.status === 'active' ? 'normal' : 'inactive',
  }));

  const totalPages = Math.ceil(departmentList.length / pageSize);
  const paginatedDepartments = departmentList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 分页状态重置
  useEffect(() => {
    setCurrentPage(1);
  }, [departments.length]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">部门设置</h1>
            <p className="text-gray-500">组织架构与部门信息管理</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              <p className="text-xs text-gray-500">部门总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.filter(d => d.status === '正常').length}</p>
              <p className="text-xs text-gray-500">正常</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.reduce((sum, d) => sum + d.staffCount, 0)}</p>
              <p className="text-xs text-gray-500">员工总数</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-end">
          <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新增部门
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">部门列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">上级部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门负责人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门人数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">职能描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">成立日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedDepartments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{dept.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{dept.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{dept.parent}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{dept.manager}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{dept.staffCount}人</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{dept.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{dept.establishDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      dept.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {dept.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {departments.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === i + 1
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
