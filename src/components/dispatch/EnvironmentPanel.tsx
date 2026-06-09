/**
 * 环境信息面板组件
 * 显示天气预报、传感器数据、环境告警等信息
 */

import React from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, AlertTriangle, Thermometer, Lightbulb, Check } from 'lucide-react';
import type { WeatherForecast, SensorData, EnvironmentAlert } from '../../types/environment';
import { Button } from '@/components/ui';

interface EnvironmentPanelProps {
  todayWeather: WeatherForecast | null;
  weatherForecasts: WeatherForecast[];
  sensors: SensorData[];
  alerts: EnvironmentAlert[];
  unacknowledgedAlerts: EnvironmentAlert[];
  onAcknowledgeAlert?: (alertId: string) => void;
  getCurrentWeatherRecommendation: () => string;
}

/** 天气图标映射 */
const WeatherIcon: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-5 h-5 text-amber-500" />,
  cloudy: <Cloud className="w-5 h-5 text-gray-500" />,
  rainy: <CloudRain className="w-5 h-5 text-blue-500" />,
  stormy: <CloudRain className="w-5 h-5 text-purple-500" />,
  foggy: <Cloud className="w-5 h-5 text-gray-400" />,
  snowy: <Cloud className="w-5 h-5 text-blue-300" />,
};

/** 获取天气标签 */
function getWeatherLabel(weather: string): string {
  const labels: Record<string, string> = {
    sunny: '晴',
    cloudy: '多云',
    rainy: '雨',
    stormy: '暴风雨',
    foggy: '雾',
    snowy: '雪',
  };
  return labels[weather] || weather;
}

/** 获取预警颜色 */
function getAlertColor(level: string): string {
  switch (level) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200';
    case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export const EnvironmentPanel: React.FC<EnvironmentPanelProps> = ({
  todayWeather,
  weatherForecasts,
  sensors,
  alerts,
  unacknowledgedAlerts,
  onAcknowledgeAlert,
  getCurrentWeatherRecommendation,
}) => {
  // 获取关键告警的传感器
  const criticalSensors = sensors.filter(s => s.status === 'critical');
  const warningSensors = sensors.filter(s => s.status === 'warning');

  return (
    <div className="space-y-4">
      {/* 天气预报卡片 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" />
          天气预报
        </h3>

        {/* 今日天气 */}
        {todayWeather && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {WeatherIcon[todayWeather.weather]}
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {todayWeather.temperature}℃
                  </div>
                  <div className="text-sm text-gray-600">
                    {getWeatherLabel(todayWeather.weather)}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  湿度 {todayWeather.humidity}%
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-4 h-4 text-gray-500" />
                  风速 {todayWeather.windSpeed}km/h
                </div>
              </div>
            </div>

            {/* 预警标识 */}
            {todayWeather.alertLevel !== 'none' && (
              <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${
                todayWeather.alertLevel === 'red' ? 'bg-red-100 text-red-700' :
                todayWeather.alertLevel === 'orange' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {todayWeather.alertLevel === 'red' ? '🔴 红色预警' :
                 todayWeather.alertLevel === 'orange' ? '🟠 橙色预警' :
                 '🟡 黄色预警'}
              </div>
            )}
          </div>
        )}

        {/* 天气预报建议 */}
        <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
          {getCurrentWeatherRecommendation()}
        </div>

        {/* 未来7天预报 */}
        <div className="mt-3 grid grid-cols-7 gap-2">
          {weatherForecasts.slice(0, 7).map((forecast, index) => (
            <div
              key={forecast.date}
              className={`text-center p-2 rounded ${
                index === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
              }`}
            >
              <div className="text-xs text-gray-500">
                {index === 0 ? '今天' : new Date(forecast.date).getDate() + '日'}
              </div>
              <div className="my-1">
                {WeatherIcon[forecast.weather]}
              </div>
              <div className="text-xs font-medium">{forecast.temperature}°</div>
            </div>
          ))}
        </div>
      </div>

      {/* 环境告警 */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            环境告警 ({unacknowledgedAlerts.length})
          </h3>
          <div className="space-y-2">
            {unacknowledgedAlerts.slice(0, 5).map(alert => (
              <div
                key={alert.id}
                className={`p-2 rounded border text-sm ${getAlertColor(alert.alertLevel)}`}
              >
                <div className="font-medium">{alert.greenhouseName}</div>
                <div>{alert.message}</div>
                {onAcknowledgeAlert && (
                  <Button variant="link" size="sm" onClick={() => onAcknowledgeAlert(alert.id)} className="mt-1 h-6 p-0">
                    确认
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 关键传感器状态 */}
      {(criticalSensors.length > 0 || warningSensors.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
            传感器监控
          </h3>

          {/* 严重告警 */}
          {criticalSensors.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-red-600 mb-1">严重告警</div>
              <div className="flex flex-wrap gap-2">
                {criticalSensors.map(sensor => (
                  <div
                    key={sensor.id}
                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                  >
                    {sensor.greenhouseName} - {sensor.typeName}: {sensor.value}{sensor.unit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 警告 */}
          {warningSensors.length > 0 && (
            <div>
              <div className="text-xs font-medium text-yellow-600 mb-1">需要注意</div>
              <div className="flex flex-wrap gap-2">
                {warningSensors.map(sensor => (
                  <div
                    key={sensor.id}
                    className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs"
                  >
                    {sensor.greenhouseName} - {sensor.typeName}: {sensor.value}{sensor.unit}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnvironmentPanel;
