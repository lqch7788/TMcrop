import { useState } from 'react';
import { ClipboardCheck, Plus, Search, Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

const workOrders = [
  { id: 1, code: 'WO20240301', name: '张伟民', workerId: 'W001', area: '1号棚', process: '授粉', workload: '500株', date: '2024-03-01', status: '已完成', statusClass: 'normal' },
  { id: 2, code: 'WO20240302', name: '李明轩', workerId: 'W002', area: '2号棚', process: '浇水', workload: '800㎡', date: '2024-03-01', status: '进行中', statusClass: 'pending' },
  { id: 3, code: 'WO20240303', name: '王建国', workerId: 'W003', area: '3号棚', process: '施肥', workload: '200kg', date: '2024-03-01', status: '已完成', statusClass: 'normal' },
  { id: 4, code: 'WO20240304', name: '赵俊杰', workerId: 'W004', area: '1号棚', process: '疏果', workload: '300株', date: '2024-03-02', status: '待开始', statusClass: 'draft' },
  { id: 5, code: 'WO20240305', name: '钱文涛', workerId: 'W005', area: '2号棚', process: '病虫害防治', workload: '600㎡', date: '2024-03-02', status: '进行中', statusClass: 'pending' },
];

export default function WorkOrders() {
  const [workOrderMode, setWorkOrderMode] = useState('glass');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工单管理</h1>
            <p className="text-gray-500">工单列表与发布 - 支持玻璃温室/日光温室/大田三种模式</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-1 shadow-sm">
        <div className="flex gap-1 p-1">
          <button
            onClick={() => setWorkOrderMode('glass')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              workOrderMode === 'glass' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            模式一（玻璃温室）
          </button>
          <button
            onClick={() => setWorkOrderMode('solar')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              workOrderMode === 'solar' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            模式二（日光温室）
          </button>
          <button
            onClick={() => setWorkOrderMode('field')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              workOrderMode === 'field' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            模式三（大田）
          </button>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">工单编号</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入工单编号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">工人姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新建工单
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{workOrderMode === 'glass' ? '玻璃温室' : workOrderMode === 'solar' ? '日光温室' : '大田'}工单列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工单编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工人姓名</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作区域</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工序</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.workerId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.area}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.process}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.workload}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      order.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      order.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">每页</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-200 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">共 {workOrders.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(workOrders.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(workOrders.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(workOrders.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
