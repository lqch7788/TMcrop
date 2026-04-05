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
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1600px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">班组</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">岗位</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">技能等级</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系方式</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">合同状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">入职日期</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{worker.workerId}</td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-sm text-gray-600">{worker.department}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{worker.team}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{worker.position}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${SKILL_LEVEL_CONFIG[worker.skillLevel].badge}`}>
                    {SKILL_LEVEL_CONFIG[worker.skillLevel].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{worker.phone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    worker.contractStatus === '新签' ? 'bg-blue-100 text-blue-700' :
                    worker.contractStatus === '续签' ? 'bg-green-100 text-green-700' :
                    worker.contractStatus === '到期' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {worker.contractStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{worker.hireDate}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${WORKER_STATUS_CONFIG[worker.status].badge}`}>
                    {WORKER_STATUS_CONFIG[worker.status].label}
                  </span>
                </td>
                <td className="px-4 py-3">
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
      </div>
    </div>
  );
}

export default PersonnelTable;
