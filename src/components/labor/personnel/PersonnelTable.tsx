import { Eye, Edit, Trash2 } from 'lucide-react';
import { Worker, WORKER_STATUS_CONFIG, SKILL_LEVEL_CONFIG } from '../../../types';

interface PersonnelTableProps {
  workers: Worker[];
  onViewWorker: (worker: Worker) => void;
  onEditWorker: (worker: Worker) => void;
  onDeleteWorker: (worker: Worker) => void;
}

export function PersonnelTable({
  workers,
  onViewWorker,
  onEditWorker,
  onDeleteWorker,
}: PersonnelTableProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">员工信息</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1600px]">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">班组</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">岗位</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">技能等级</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">联系方式</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">合同状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入职日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-blue-100 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{worker.workerId}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                      <p className="text-xs text-gray-500">{worker.gender} {worker.age}岁</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.department}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.team}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.position}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${SKILL_LEVEL_CONFIG[worker.skillLevel].badge}`}>
                    {SKILL_LEVEL_CONFIG[worker.skillLevel].label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.phone}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    worker.contractStatus === '新签' ? 'bg-blue-100 text-blue-700' :
                    worker.contractStatus === '续签' ? 'bg-green-100 text-green-700' :
                    worker.contractStatus === '到期' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {worker.contractStatus}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.hireDate}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${WORKER_STATUS_CONFIG[worker.status].badge}`}>
                    {WORKER_STATUS_CONFIG[worker.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewWorker(worker)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditWorker(worker)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteWorker(worker)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {workers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            没有找到符合条件的员工信息
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={10}
              onChange={(e) => {}}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {workers.length} 条</span>
            <button
              onClick={() => {}}
              disabled={true}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">1/1</span>
            <button
              onClick={() => {}}
              disabled={true}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonnelTable;
