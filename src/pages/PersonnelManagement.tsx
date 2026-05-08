import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Edit, Eye, ChevronRight, ClipboardCheck, Calendar, Clock, FileText, ChevronLeft } from 'lucide-react';
import { usePositions } from '../components/common/settings/SettingsDataProvider';
import { Button } from '../components/ui/button';

const hrSubItems = [
  { icon: Users, label: '人员管理', path: '/settings/personnel/staff', desc: '园区员工信息管理' },
  { icon: ClipboardCheck, label: '职务管理', path: '/settings/personnel/position', desc: '组织架构与职务岗位设置' },
  { icon: Calendar, label: '员工考勤', path: '/settings/personnel/attendance', desc: '正式员工考勤记录与统计' },
  { icon: Clock, label: '审批单', path: '/settings/personnel/hr-approval', desc: '人事相关审批流程管理' },
  { icon: FileText, label: '考勤单据', path: '/settings/personnel/hr-documents', desc: '考勤异常单据与补录申请' },
];

export default function PersonnelManagement() {
  // 从 SettingsDataProvider 获取职位数据
  const { positions } = usePositions();

  // 将 API 返回的 positions 数据转换为页面期望的格式
  // API level: 1=高层, 2=中层, 3=基层; UI level: '高层'/'中层'/'基层'
  const levelMap: Record<number, string> = { 1: '高层', 2: '中层', 3: '基层' };
  const transformedPositions = positions.map(pos => ({
    id: pos.id,
    code: pos.code,
    name: pos.name,
    dept: pos.departmentName || '',
    level: levelMap[pos.level] || '未知',
    salary: 0,  // API 数据中无此字段
    staffCount: 0,  // API 数据中无此字段
    description: '',  // API 数据中无此字段
    status: pos.status === 'active' ? '启用' : '停用',
    statusClass: pos.status === 'active' ? 'normal' : 'disabled'
  }));

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(transformedPositions.length / pageSize);
  const paginatedPositions = transformedPositions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
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
              <p className="text-2xl font-bold text-gray-900">{transformedPositions.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{transformedPositions.filter(p => p.status === '启用').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{transformedPositions.reduce((sum, p) => sum + p.staffCount, 0)}</p>
              <p className="text-xs text-gray-500">在职人数</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-end">
          <Button variant="default">
            <Plus className="w-4 h-4" />
            新增职务
          </Button>
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
                      <Button size="icon" variant="ghost" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="查看">
                        <Eye className="w-4 h-4" />
                      </Button>
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
            共 {transformedPositions.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
