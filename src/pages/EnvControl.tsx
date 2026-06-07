import { useState } from 'react';
import { Settings, Play } from 'lucide-react';
import { Pagination } from '@/components/ui';

const strategies = [
  { id: 1, name: '高温预警通风', area: '1号温室', condition: '温度>28°C', action: '开启通风扇', status: '运行中' },
  { id: 2, name: '低温保温', area: '2号温室', condition: '温度<15°C', action: '开启保温幕', status: '运行中' },
  { id: 3, name: '高湿除湿', area: '1号温室', condition: '湿度>85%', action: '开启除湿机', status: '待机' },
];

export default function EnvControl() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages = Math.ceil(strategies.length / pageSize);
  const paginatedData = strategies.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">环控策略管理</h1>
            <p className="text-gray-500">配置温室环境自动化控制规则</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Play className="w-5 h-5 text-blue-500" /></div><div><p className="text-2xl font-bold text-gray-900">12</p><p className="text-xs text-gray-500">运行中策略</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Settings className="w-5 h-5 text-amber-500" /></div><div><p className="text-2xl font-bold text-gray-900">3</p><p className="text-xs text-gray-500">今日触发</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Settings className="w-5 h-5 text-green-500" /></div><div><p className="text-2xl font-bold text-gray-900">98.5%</p><p className="text-xs text-gray-500">执行成功率</p></div></div></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">环控策略列表</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">新建策略</button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">策略名称</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">适用区域</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">触发条件</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">状态</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.area}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.condition}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.status==='运行中'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">共 {strategies.length} 条记录</div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[5, 10, 20, 50]}
            showPageSize
          />
        </div>
      </div>
    </div>
  );
}
