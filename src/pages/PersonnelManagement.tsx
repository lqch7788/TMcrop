import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Edit, Eye, ChevronRight, ClipboardCheck, Calendar, Clock, FileText, ChevronLeft } from 'lucide-react';

const positions = [
  { id: 1, code: 'J001', name: '总经理', dept: '管理层', level: '高层', salary: 15000, staffCount: 1, description: '公司全面管理', status: '启用', statusClass: 'normal' },
  { id: 2, code: 'J002', name: '技术总监', dept: '技术部', level: '高层', salary: 12000, staffCount: 1, description: '技术研发管理', status: '启用', statusClass: 'normal' },
  { id: 3, code: 'J003', name: '技术员', dept: '技术部', level: '中层', salary: 8000, staffCount: 3, description: '农业生产技术指导', status: '启用', statusClass: 'normal' },
  { id: 4, code: 'J004', name: '生产主管', dept: '生产部', level: '中层', salary: 7000, staffCount: 2, description: '生产作业管理', status: '启用', statusClass: 'normal' },
  { id: 5, code: 'J005', name: '普工', dept: '生产部', level: '基层', salary: 4000, staffCount: 15, description: '日常农事操作', status: '启用', statusClass: 'normal' },
  { id: 6, code: 'J006', name: '仓库管理员', dept: '后勤部', level: '基层', salary: 4500, staffCount: 2, description: '物资出入库管理', status: '启用', statusClass: 'normal' },
];

const hrSubItems = [
  { icon: Users, label: '人员管理', path: '/settings/personnel/staff', desc: '组织架构与人员信息管理' },
  { icon: ClipboardCheck, label: '职务管理', path: '/settings/personnel/position', desc: '组织架构与职务岗位设置' },
  { icon: Calendar, label: '员工考勤', path: '/settings/personnel/attendance', desc: '正式员工考勤记录与统计' },
  { icon: Clock, label: '审批单', path: '/settings/personnel/hr-approval', desc: '人事相关审批流程管理' },
  { icon: FileText, label: '考勤单据', path: '/settings/personnel/hr-documents', desc: '考勤异常单据与补录申请' },
];

export default function PersonnelManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(positions.length / pageSize);
  const paginatedPositions = positions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">人事管理</h1>
            <p className="text-gray-500">组织架构与职务岗位设置</p>
          </div>
        </div>
      </div>

      {/* HR Sub Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hrSubItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <item.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">{item.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
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
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positions.reduce((sum, p) => sum + p.staffCount, 0)}</p>
              <p className="text-xs text-gray-500">在职人数</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-end">
          <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新增职务
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">职务列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">职务编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">职务名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">所属部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">职务级别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">基本工资(元)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">岗位人数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">职责描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPositions.map((pos) => (
                <tr key={pos.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{pos.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{pos.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{pos.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{pos.level}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{pos.salary}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{pos.staffCount}人</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{pos.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      pos.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {pos.status}
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
            共 {positions.length} 条记录，第 {currentPage}/{totalPages} 页
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
