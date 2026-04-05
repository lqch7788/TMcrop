import { useState } from 'react';
import { BookMarked, Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const workLogs = [
  { id: 1, code: 'WL20240301', date: '2024-03-14', worker: '张伟民', weather: '晴', temperature: '25°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '授粉、浇水', problems: '无', solutions: '-' },
  { id: 2, code: 'WL20240302', date: '2024-03-14', worker: '李明轩', weather: '晴', temperature: '26°C', crop: '黄瓜', greenhouse: '2号棚', growthStatus: '良好', tasks: '施肥、病虫害防治', problems: '发现少量蚜虫', solutions: '已喷洒吡虫啉' },
  { id: 3, code: 'WL20240303', date: '2024-03-14', worker: '王建国', weather: '晴', temperature: '24°C', crop: '草莓', greenhouse: '3号棚', growthStatus: '一般', tasks: '疏果、浇水', problems: '部分叶片发黄', solutions: '补充氮肥' },
  { id: 4, code: 'WL20240304', date: '2024-03-13', worker: '赵俊杰', weather: '多云', temperature: '22°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '整枝、授粉', problems: '无', solutions: '-' },
  { id: 5, code: 'WL20240305', date: '2024-03-13', worker: '钱文涛', weather: '多云', temperature: '23°C', crop: '辣椒', greenhouse: '4号棚', growthStatus: '良好', tasks: '浇水、施肥', problems: '无', solutions: '-' },
];

export default function WorkLog() {
  const [date, setDate] = useState('');
  const [worker, setWorker] = useState('');
  const [greenhouse, setGreenhouse] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <BookMarked className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工作日志</h1>
            <p className="text-gray-500">工人每日工作记录与问题反馈</p>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">工人</label>
            <input
              type="text"
              value={worker}
              onChange={(e) => setWorker(e.target.value)}
              placeholder="请输入姓名"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">大棚</label>
            <select
              value={greenhouse}
              onChange={(e) => setGreenhouse(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>1号棚</option>
              <option>2号棚</option>
              <option>3号棚</option>
              <option>4号棚</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新建日志
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">日志编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工人姓名</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">天气</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">温度</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">大棚</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生长状况</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作内容</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">问题描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">处理措施</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.worker}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.weather}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.temperature}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.greenhouse}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      log.growthStatus === '良好' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {log.growthStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{log.tasks}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate">{log.problems}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate">{log.solutions}</td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                      <Eye className="w-4 h-4" />
                    </button>
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
              <span className="text-sm text-gray-500">共 {workLogs.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(workLogs.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(workLogs.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(workLogs.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
