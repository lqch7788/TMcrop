/**
 * 从 V1.3 100% 一致复制
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Search, RefreshCw, Home, ArrowLeft, Download, TrendingUp, Clock } from 'lucide-react';

const historyData = [
  { id: 'H-001', sensorId: 'ENV-001', sensorName: '1号温室-A区环境', dataType: '温湿度', temp: 24.5, humidity: 62, co2: 415, timestamp: '2025-01-15 08:00:00' },
  { id: 'H-002', sensorId: 'ENV-001', sensorName: '1号温室-A区环境', dataType: '温湿度', temp: 25.2, humidity: 65, co2: 420, timestamp: '2025-01-15 12:00:00' },
  { id: 'H-003', sensorId: 'ENV-001', sensorName: '1号温室-A区环境', dataType: '温湿度', temp: 26.1, humidity: 68, co2: 425, timestamp: '2025-01-15 14:00:00' },
  { id: 'H-004', sensorId: 'SW-001', sensorName: '1号大棚-1区土壤', dataType: '土壤', soilMoisture: 42, soilTemp: 18.2, ph: 6.8, ec: 2.2, timestamp: '2025-01-15 08:00:00' },
  { id: 'H-005', sensorId: 'SW-001', sensorName: '1号大棚-1区土壤', dataType: '土壤', soilMoisture: 45, soilTemp: 18.5, ph: 6.8, ec: 2.2, timestamp: '2025-01-15 14:00:00' },
  { id: 'H-006', sensorId: 'WX-001', sensorName: '北京顺义基地气象', dataType: '气象', temp: -1, humidity: 48, windSpeed: 10, timestamp: '2025-01-15 08:00:00' },
  { id: 'H-007', sensorId: 'WX-001', sensorName: '北京顺义基地气象', dataType: '气象', temp: -2, humidity: 45, windSpeed: 12, timestamp: '2025-01-15 14:00:00' },
  { id: 'H-008', sensorId: 'EN-001', sensorName: '1号温室空调系统', dataType: '能耗', power: 42.5, voltage: 380, current: 64.5, timestamp: '2025-01-15 08:00:00' },
  { id: 'H-009', sensorId: 'EN-001', sensorName: '1号温室空调系统', dataType: '能耗', power: 45.2, voltage: 380, current: 68.5, timestamp: '2025-01-15 14:00:00' },
  { id: 'H-010', sensorId: 'ENV-002', sensorName: '1号温室-B区环境', dataType: '温湿度', temp: 24.0, humidity: 64, co2: 410, timestamp: '2025-01-14 14:00:00' },
  { id: 'H-011', sensorId: 'ENV-002', sensorName: '1号温室-B区环境', dataType: '温湿度', temp: 24.8, humidity: 68, co2: 415, timestamp: '2025-01-14 20:00:00' },
  { id: 'H-012', sensorId: 'SW-002', sensorName: '1号大棚-2区土壤', dataType: '土壤', soilMoisture: 35, soilTemp: 19.0, ph: 6.5, ec: 2.5, timestamp: '2025-01-14 14:00:00' },
];

const statistics = { totalRecords: 12580, todayRecords: 3256, avgRecordsPerDay: 2850, dataSize: '2.8GB' };

export default function HistoryData() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const dataTypes = ['温湿度', '土壤', '气象', '能耗'];

  const filteredData = historyData.filter(item => {
    const matchSearch = item.sensorName.toLowerCase().includes(searchKeyword.toLowerCase()) || item.sensorId.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchType = dataTypeFilter === 'all' || item.dataType === dataTypeFilter;
    return matchSearch && matchType;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/iot-monitor')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">历史数据</h1>
            <p className="text-gray-500 mt-1">监测历史数据查询</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: Database, bg: 'bg-blue-100', text: 'text-blue-600', label: '总记录数', value: statistics.totalRecords.toLocaleString(), valColor: 'text-gray-800' },
          { Icon: Clock, bg: 'bg-green-100', text: 'text-green-600', label: '今日记录', value: statistics.todayRecords.toLocaleString(), valColor: 'text-green-600' },
          { Icon: TrendingUp, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '日均记录', value: statistics.avgRecordsPerDay.toLocaleString(), valColor: 'text-cyan-600' },
          { Icon: Database, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '数据总量', value: statistics.dataSize, valColor: 'text-indigo-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-xl font-bold ${card.valColor}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="搜索传感器名称或ID..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={dataTypeFilter} onChange={e => setDataTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部类型</option>
            {dataTypes.map(type => (<option key={type} value={type}>{type}</option>))}
          </select>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="today">今日</option><option value="yesterday">昨日</option><option value="week">本周</option><option value="month">本月</option><option value="custom">自定义</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"><Download size={16} />导出</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">记录ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">传感器</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">数据类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">温度(°C)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">湿度(%)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">CO₂/其他</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间戳</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.id}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-800">{item.sensorName}</div>
                  <div className="text-xs text-gray-500">{item.sensorId}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.dataType === '温湿度' ? 'bg-blue-100 text-blue-700' :
                    item.dataType === '土壤' ? 'bg-amber-100 text-amber-700' :
                    item.dataType === '气象' ? 'bg-cyan-100 text-cyan-700' :
                    'bg-indigo-100 text-indigo-700'
                  }`}>{item.dataType}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.temp !== undefined ? item.temp : item.soilTemp !== undefined ? item.soilTemp : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.humidity !== undefined ? item.humidity : item.soilMoisture !== undefined ? item.soilMoisture : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.co2 !== undefined ? `${item.co2}ppm` :
                   item.ec !== undefined ? `EC:${item.ec}` :
                   item.windSpeed !== undefined ? `${item.windSpeed}km/h` :
                   item.power !== undefined ? `${item.power}kW` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-500">显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} 条，共 {filteredData.length} 条</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded ${currentPage === page ? 'bg-[#6366F1] text-white' : 'border hover:bg-gray-50'}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
