import { useState } from 'react';
import { Search, Package, Leaf, Truck, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const traceabilityData = [
  { id: 'TR20260310001', product: '番茄-品种A', batch: 'B20260301', farm: '1号温室', plantDate: '2026-01-15', harvestDate: '2026-03-01', status: '已完成' },
  { id: 'TR20260310002', product: '黄瓜-品种B', batch: 'B20260302', farm: '2号温室', plantDate: '2026-01-20', harvestDate: '2026-03-05', status: '已完成' },
  { id: 'TR20260310003', product: '番茄-品种A', batch: 'B20260303', farm: '1号温室-B区', plantDate: '2026-02-01', harvestDate: '待采收', status: '生长中' },
];

export default function Traceability() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(traceabilityData.length / pageSize);
  const paginatedData = traceabilityData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">产品溯源档案</h1>
            <p className="text-gray-500">追踪农产品全生命周期信息</p>
          </div>
        </div>
      </div>
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="输入批次号、产品名称或溯源码查询" className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">查询</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Package className="w-5 h-5 text-green-500" /></div><div><p className="text-2xl font-bold text-gray-900">156</p><p className="text-xs text-gray-500">总批次</p></div></div></div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Leaf className="w-5 h-5 text-blue-500" /></div><div><p className="text-2xl font-bold text-gray-900">42</p><p className="text-xs text-gray-500">生长中</p></div></div></div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Truck className="w-5 h-5 text-amber-500" /></div><div><p className="text-2xl font-bold text-gray-900">108</p><p className="text-xs text-gray-500">已采收</p></div></div></div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-purple-500" /></div><div><p className="text-2xl font-bold text-gray-900">98%</p><p className="text-xs text-gray-500">溯源覆盖率</p></div></div></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">溯源档案列表</h3></div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">溯源码</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">产品名称</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">批次号</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">种植区域</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">定植日期</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">预计采收</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">状态</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-blue-600">{item.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{item.product}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.batch}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.farm}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.plantDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.harvestDate}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${item.status==='已完成'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {traceabilityData.length} 条记录，第 {currentPage}/{totalPages} 页
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
