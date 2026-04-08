/**
 * 职务管理页面组件
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardCheck, Plus, Edit, Eye } from 'lucide-react';

interface Position {
  id: number;
  code: string;
  name: string;
  dept: string;
  level: string;
  salary: number;
  staffCount: number;
  description: string;
  status: string;
  statusClass: string;
}

const initialPositions: Position[] = [
  { id: 1, code: 'J001', name: '总经理', dept: '管理层', level: '高层', salary: 15000, staffCount: 1, description: '公司全面管理', status: '启用', statusClass: 'normal' },
  { id: 2, code: 'J002', name: '技术总监', dept: '技术部', level: '高层', salary: 12000, staffCount: 1, description: '技术研发管理', status: '启用', statusClass: 'normal' },
  { id: 3, code: 'J003', name: '技术员', dept: '技术部', level: '中层', salary: 8000, staffCount: 3, description: '农业生产技术指导', status: '启用', statusClass: 'normal' },
  { id: 4, code: 'J004', name: '生产主管', dept: '生产部', level: '中层', salary: 7000, staffCount: 2, description: '生产作业管理', status: '启用', statusClass: 'normal' },
  { id: 5, code: 'J005', name: '普工', dept: '生产部', level: '基层', salary: 4000, staffCount: 15, description: '日常农事操作', status: '启用', statusClass: 'normal' },
  { id: 6, code: 'J006', name: '仓库管理员', dept: '后勤部', level: '基层', salary: 4500, staffCount: 2, description: '物资出入库管理', status: '启用', statusClass: 'normal' },
];

export function PositionManagementPage() {
  const [positions] = useState<Position[]>(initialPositions);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(positions.length / pageSize);
  const paginatedPositions = positions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings/personnel" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">职务管理</h1>
            <p className="text-gray-500">组织架构与职务岗位设置</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
              <p className="text-xs text-gray-500">职务总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positions.filter(p => p.status === '启用').length}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-end">
          <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新增职务
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">职务列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务级别</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">基本工资(元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">岗位人数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职责描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-300">
              {paginatedPositions.map((pos) => (
                <tr key={pos.id} className="hover:bg-blue-100 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{pos.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pos.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.level}</td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.salary}</td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.staffCount}人</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate whitespace-nowrap">{pos.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      pos.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {pos.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
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
        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => setCurrentPage(1)}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-emerald-600">{currentPage}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;&gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PositionManagementPage;
