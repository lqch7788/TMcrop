import { useState } from 'react';
import {
  Thermometer, Droplets, Sun, Wind, CloudRain, Compass, Gauge, CloudSnow, RefreshCw
} from 'lucide-react';

export function WeatherWidget() {
  const [weatherTab, setWeatherTab] = useState<'forecast' | 'station'>('station');

  // 外部气象站参数（不含PM2.5和紫外线）
  const stationParams = [
    { id: 1, name: '大气温度', value: 18.5, unit: '°C', icon: Thermometer, color: 'bg-red-500' },
    { id: 2, name: '大气湿度', value: 65, unit: '%RH', icon: Droplets, color: 'bg-blue-500' },
    { id: 3, name: '光照强度', value: 35000, unit: 'Lux', icon: Sun, color: 'bg-amber-500' },
    { id: 4, name: '风速', value: 2.1, unit: 'm/s', icon: Wind, color: 'bg-cyan-500' },
    { id: 5, name: '风向', value: '东南风', unit: '', icon: Compass, color: 'bg-teal-500' },
    { id: 6, name: '降雨量', value: 0, unit: 'mm', icon: CloudRain, color: 'bg-indigo-500' },
    { id: 7, name: '大气压力', value: 1013.2, unit: 'hPa', icon: Gauge, color: 'bg-purple-500' },
    { id: 8, name: '雨雪状态', value: '无', unit: '', icon: CloudSnow, color: 'bg-cyan-400' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 overflow-hidden">
      {/* Tab 选择 */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setWeatherTab('forecast')}
          className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${
            weatherTab === 'forecast'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          天气预报
        </button>
        <button
          onClick={() => setWeatherTab('station')}
          className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${
            weatherTab === 'station'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          本地气象站
        </button>
      </div>

      {/* 天气预报内容 */}
      {weatherTab === 'forecast' && (
        <div className="bg-[#F2F6FA] p-3 text-gray-900">
          {/* 当天天气 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">18°</p>
              <p className="text-sm text-gray-600">晴转多云</p>
              <p className="text-xs text-gray-500 mt-1">上海市崇明区 · 3月18日</p>
            </div>
            <div className="flex items-start gap-2 -mt-2">
              <Sun className="w-10 h-10 text-yellow-500" />
              <button className="p-1 hover:bg-gray-200 rounded">
                <RefreshCw className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 mt-3 pt-3 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">今天</p>
              <Sun className="w-5 h-5 mx-auto text-yellow-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">18°</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">明天</p>
              <CloudRain className="w-5 h-5 mx-auto text-blue-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">15°</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">周四</p>
              <CloudRain className="w-5 h-5 mx-auto text-gray-400 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">12°</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">周五</p>
              <Sun className="w-5 h-5 mx-auto text-yellow-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">16°</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">周六</p>
              <Sun className="w-5 h-5 mx-auto text-yellow-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">19°</p>
            </div>
          </div>
        </div>
      )}

      {/* 本地气象站内容 */}
      {weatherTab === 'station' && (
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {stationParams.map((param) => (
              <div key={param.id} className="bg-[#F2F6FA] rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded ${param.color} flex items-center justify-center`}>
                    <param.icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs text-gray-600">{param.name}</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">
                    {param.value}<span className="text-xs font-normal text-gray-500 ml-1">{param.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
