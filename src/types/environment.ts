/**
 * 环境数据模块类型定义
 * 包含天气预报、IoT传感器、环境告警等类型
 */

// ============================================
// 天气预报
// ============================================

/** 天气类型 */
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy' | 'snowy';

/** 天气预报数据 */
export interface WeatherForecast {
  date: string;              // 日期
  weather: WeatherType;       // 天气类型
  temperature: number;        // 温度（℃）
  humidity: number;          // 湿度（%）
  windSpeed: number;         // 风速（km/h）
  precipitation: number;      // 降水量（mm）
  uvIndex: number;          // 紫外线指数
  alertLevel: 'none' | 'yellow' | 'orange' | 'red';  // 预警等级
}

/** 天气影响建议 */
export interface WeatherImpact {
  taskType: string;           // 任务类型
  suitable: boolean;          // 是否适合执行
  reason: string;            // 原因
  suggestion: string;         // 建议
}

// ============================================
// IoT传感器
// ============================================

/** 传感器类型 */
export type SensorType =
  | 'air_temp'      // 空气温度
  | 'air_humidity'  // 空气湿度
  | 'soil_temp'     // 土壤温度
  | 'soil_moisture' // 土壤湿度
  | 'soil_ec'       // 土壤EC值
  | 'soil_ph'       // 土壤pH值
  | 'light'         // 光照强度
  | 'co2';         // CO2浓度

/** 传感器告警级别 */
export type SensorAlertLevel = 'normal' | 'warning' | 'critical';

/** 传感器数据 */
export interface SensorData {
  id: string;
  sensorId: string;
  greenhouseId: string;
  greenhouseName: string;
  type: SensorType;
  typeName: string;
  value: number;
  unit: string;
  status: SensorAlertLevel;
  threshold: {
    min?: number;
    max?: number;
  };
  lastUpdate: string;
}

/** 传感器历史记录 */
export interface SensorHistory {
  sensorId: string;
  readings: {
    timestamp: string;
    value: number;
  }[];
}

// ============================================
// 环境告警规则
// ============================================

/** 告警规则类型 */
export interface AlertRule {
  id: string;
  name: string;               // 规则名称
  description: string;        // 规则描述
  sensorType: SensorType;      // 传感器类型
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
  };
  alertLevel: SensorAlertLevel;
  enabled: boolean;
  messageTemplate: string;     // 告警消息模板
}

/** 环境告警 */
export interface EnvironmentAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  greenhouseId: string;
  greenhouseName: string;
  sensorType: SensorType;
  sensorTypeName: string;
  alertLevel: SensorAlertLevel;
  message: string;
  currentValue: number;
  threshold: number;
  createdAt: string;
  acknowledged: boolean;       // 是否已确认
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// ============================================
// 天气影响任务执行判断
// ============================================

/** 任务类型天气影响规则 */
export const WEATHER_IMPACT_RULES: Record<string, {
  suitableWeather: WeatherType[];
  minTemperature: number;
  maxTemperature: number;
  maxWindSpeed: number;
  maxPrecipitation: number;
}> = {
  irrigation: {
    suitableWeather: ['sunny', 'cloudy'],
    minTemperature: 5,
    maxTemperature: 35,
    maxWindSpeed: 20,
    maxPrecipitation: 5,
  },
  spraying: {
    suitableWeather: ['sunny', 'cloudy'],
    minTemperature: 10,
    maxTemperature: 30,
    maxWindSpeed: 10,  // 喷药需要低风速
    maxPrecipitation: 0,
  },
  fertilization: {
    suitableWeather: ['sunny', 'cloudy'],
    minTemperature: 5,
    maxTemperature: 32,
    maxWindSpeed: 15,
    maxPrecipitation: 3,
  },
  harvest: {
    suitableWeather: ['sunny', 'cloudy'],
    minTemperature: 10,
    maxTemperature: 30,
    maxWindSpeed: 25,
    maxPrecipitation: 10,
  },
  pruning: {
    suitableWeather: ['sunny', 'cloudy', 'foggy'],
    minTemperature: 5,
    maxTemperature: 35,
    maxWindSpeed: 20,
    maxPrecipitation: 5,
  },
  scouting: {
    suitableWeather: ['sunny', 'cloudy', 'rainy', 'foggy'],
    minTemperature: 0,
    maxTemperature: 40,
    maxWindSpeed: 30,
    maxPrecipitation: 20,
  },
};

// ============================================
// 默认告警规则配置
// ============================================

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'alert_temp_high',
    name: '高温告警',
    description: '空气温度超过35℃',
    sensorType: 'air_temp',
    condition: { operator: '>', value: 35 },
    alertLevel: 'warning',
    enabled: true,
    messageTemplate: '温室{greenhouseName}空气温度过高：{value}℃',
  },
  {
    id: 'alert_temp_low',
    name: '低温告警',
    description: '空气温度低于5℃',
    sensorType: 'air_temp',
    condition: { operator: '<', value: 5 },
    alertLevel: 'warning',
    enabled: true,
    messageTemplate: '温室{greenhouseName}空气温度过低：{value}℃',
  },
  {
    id: 'alert_soil_moisture_low',
    name: '土壤干旱告警',
    description: '土壤湿度低于30%',
    sensorType: 'soil_moisture',
    condition: { operator: '<', value: 30 },
    alertLevel: 'warning',
    enabled: true,
    messageTemplate: '温室{greenhouseName}土壤干旱：{value}%',
  },
  {
    id: 'alert_soil_moisture_high',
    name: '土壤过湿告警',
    description: '土壤湿度高于80%',
    sensorType: 'soil_moisture',
    condition: { operator: '>', value: 80 },
    alertLevel: 'warning',
    enabled: true,
    messageTemplate: '温室{greenhouseName}土壤过湿：{value}%',
  },
  {
    id: 'alert_humidity_high',
    name: '高湿度告警',
    description: '空气湿度超过90%',
    sensorType: 'air_humidity',
    condition: { operator: '>', value: 90 },
    alertLevel: 'critical',
    enabled: true,
    messageTemplate: '温室{greenhouseName}湿度过高：{value}%，注意病害发生',
  },
  {
    id: 'alert_uv_high',
    name: '高紫外线告警',
    description: '紫外线指数超过8（很强）',
    sensorType: 'light',
    condition: { operator: '>', value: 8 },
    alertLevel: 'warning',
    enabled: true,
    messageTemplate: '温室{greenhouseName}紫外线过强，注意防护',
  },
];
