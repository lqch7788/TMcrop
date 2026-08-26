/**
 * 从 V1.3 100% 一致复制
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Cloud, Wind, Droplets, Snowflake, Thermometer, Search, RefreshCw, Home, Download, Eye } from 'lucide-react';

const weatherData = [
  { id: 'WX-001', location: '北京顺义基地', temp: -2, feelsLike: -6, humidity: 45, windSpeed: 12, windDir: '北风', pressure: 1025, visibility: 10, condition: 'sunny', updateTime: '2025-01-15 14:30:00' },
  { id: 'WX-002', location: '河北沧州基地', temp: 0, feelsLike: -4, humidity: 52, windSpeed: 8, windDir: '东北风', pressure: 1023, visibility: 8, condition: 'cloudy', updateTime: '2025-01-15 14:30:00' },
  { id: 'WX-003', location: '天津武清基地', temp: 1, feelsLike: -3, humidity: 58, windSpeed: 15, windDir: '西北风', pressure: 1020, visibility: 6, condition: 'windy', updateTime: '2025-01-15 14:29:00' },
  { id: 'WX-004', location: '山东寿光基地', temp: 3, feelsLike: 0, humidity: 65, windSpeed: 10, windDir: '南风', pressure: 1018, visibility: 5, condition: 'foggy', updateTime: '2025-01-15 14:30:00' },
  { id: 'WX-005', location: '江苏南京基地', temp: 8, feelsLike: 6, humidity: 72, windSpeed: 5, windDir: '东风', pressure: 1015, visibility: 4, condition: 'rainy', updateTime: '2025-01-15 14:30:00' },
  { id: 'WX-006', location: '云南昆明基地', temp: 15, feelsLike: 14, humidity: 55, windSpeed: 3, windDir: '西南风', pressure: 1012, visibility: 15, condition: 'sunny', updateTime: '2025-01-15 14:28:00' },
  { id: 'WX-007', location: '黑龙江基地', temp: -15, feelsLike: -22, humidity: 35, windSpeed: 20, windDir: '西风', pressure: 1030, visibility: 12, condition: 'snowy', updateTime: '2025-01-15 14:30:00' },
  { id: 'WX-008', location: '新疆和田基地', temp: 5, feelsLike: 2, humidity: 25, windSpeed: 18, windDir: '东风', pressure: 1010, visibility: 8, condition: 'dusty', updateTime: '2025-01-15 14:30:00' },
];

const statistics = { totalStations: 8, avgTemp: 0.6, avgHumidity: 50, avgWindSpeed: 11, extremeWeather: 2 };

const conditionMap: Record<string, { icon: React.ReactNode; bg: string; label: string }> = {
  sunny: { icon: <Sun size={16} />, bg: 'bg-yellow-100 text-yellow-700', label: '晴' },
  cloudy: { icon: <Cloud size={16} />, bg: 'bg-gray-100 text-gray-700', label: '多云' },
  windy: { icon: <Wind size={16} />, bg: 'bg-blue-100 text-blue-700', label: '大风' },
  foggy: { icon: <Cloud size={16} />, bg: 'bg-slate-100 text-slate-700', label: '雾' },
  rainy: { icon: <Droplets size={16} />, bg: 'bg-indigo-100 text-indigo-700', label: '雨' },
  snowy: { icon: <Snowflake size={16} />, bg: 'bg-cyan-100 text-cyan-700', label: '雪' },
  dusty: { icon: <Wind size={16} />, bg: 'bg-amber-100 text-amber-700', label: '沙尘' },
};

export default function WeatherMonitoring() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');

  const filteredData = weatherData.filter(item => {
    const matchSearch = item.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchCondition = conditionFilter === 'all' || item.condition === conditionFilter;
    return matchSearch && matchCondition;
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">气象监测</h1>
            <p className="text-gray-500 mt-1">气象数据监测</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {[
          { Icon: Eye, bg: 'bg-blue-100', text: 'text-blue-600', label: '监测站', value: statistics.totalStations, valColor: 'text-gray-800' },
          { Icon: Thermometer, bg: 'bg-orange-100', text: 'text-orange-600', label: '平均温度', value: `${statistics.avgTemp}°C`, valColor: 'text-orange-600' },
          { Icon: Droplets, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '平均湿度', value: `${statistics.avgHumidity}%`, valColor: 'text-cyan-600' },
          { Icon: Wind, bg: 'bg-blue-100', text: 'text-blue-600', label: '平均风速', value: `${statistics.avgWindSpeed}km/h`, valColor: 'text-blue-600' },
          { Icon: Cloud, bg: 'bg-red-100', text: 'text-red-600', label: '极端天气', value: statistics.extremeWeather, valColor: 'text-red-600' },
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
              <input type="text" placeholder="搜索监测站点..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部天气</option>
            <option value="sunny">晴</option><option value="cloudy">多云</option><option value="windy">大风</option>
            <option value="foggy">雾</option><option value="rainy">雨</option><option value="snowy">雪</option><option value="dusty">沙尘</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Download size={16} />导出</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">站点ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">位置</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">天气</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">温度(°C)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">体感温度(°C)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">湿度(%)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">风速(km/h)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">风向</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">气压(hPa)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">能见度(km)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${conditionMap[item.condition]?.bg}`}>
                    {conditionMap[item.condition]?.icon}{conditionMap[item.condition]?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`font-medium ${item.temp < 0 ? 'text-blue-600' : item.temp > 30 ? 'text-red-600' : 'text-gray-800'}`}>{item.temp}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.feelsLike}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.humidity}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.windSpeed}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.windDir}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.pressure}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.visibility}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
