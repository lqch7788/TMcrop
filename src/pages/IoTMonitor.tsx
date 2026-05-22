import { useState } from 'react';
import { Wifi, Thermometer, Sun, Wind, Droplets, Leaf, ChevronLeft, ChevronRight } from 'lucide-react';

const sensorData = [
  { id: 'S001', location: '1号温室-A区', temp: 25.2, humidity: 65, light: 48000, co2: 410, status: '正常', updateTime: '2026-03-14 10:30' },
  { id: 'S002', location: '1号温室-B区', temp: 24.8, humidity: 68, light: 46000, co2: 425, status: '正常', updateTime: '2026-03-14 10:30' },
  { id: 'S003', location: '2号温室-A区', temp: 26.1, humidity: 72, light: 42000, co2: 438, status: '偏高', updateTime: '2026-03-14 10:29' },
];

export default function IoTMonitor() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(sensorData.length / pageSize);
  const paginatedData = sensorData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物联网监控中心</h1>
            <p className="text-gray-500">实时监测温室环境数据与设备状态</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Thermometer className="w-5 h-5 text-amber-500" /></div>
            <div><p className="text-2xl font-bold text-gray-900">24.5°C</p><p className="text-xs text-gray-500">平均温度</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Droplets className="w-5 h-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold text-gray-900">68%</p><p className="text-xs text-gray-500">平均湿度</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center"><Sun className="w-5 h-5 text-yellow-500" /></div>
            <div><p className="text-2xl font-bold text-gray-900">45000</p><p className="text-xs text-gray-500">光照强度(Lux)</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Wind className="w-5 h-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold text-gray-900">420</p><p className="text-xs text-gray-500">CO₂(ppm)</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><Droplets className="w-5 h-5 text-purple-500" /></div>
            <div><p className="text-2xl font-bold text-gray-900">35%</p><p className="text-xs text-gray-500">土壤湿度</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center"><Leaf className="w-5 h-5 text-pink-500" /></div>
            <div><p className="text-2xl font-bold text-gray-900">6.8</p><p className="text-xs text-gray-500">土壤pH</p></div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">传感器实时数据</h3></div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">传感器ID</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">位置</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">温度</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">湿度</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">状态</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.location}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{s.temp}°C</td>
                <td className="px-4 py-3 text-sm text-gray-900">{s.humidity}%</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.status==='正常'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {sensorData.length} 条记录，第 {currentPage}/{totalPages} 页
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
