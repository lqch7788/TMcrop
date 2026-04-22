/**
 * 环境数据 Hook
 * 提供天气预报、IoT传感器数据、环境告警等功能
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  WeatherForecast,
  WeatherType,
  SensorData,
  SensorType,
  EnvironmentAlert,
  AlertRule,
  WeatherImpact,
  SensorAlertLevel,
} from '../types/environment';
import { DEFAULT_ALERT_RULES, WEATHER_IMPACT_RULES } from '../types/environment';
import { cropBatches } from '../data/mockData';

// ============================================
// 模拟数据生成
// ============================================

/** 生成7天天气预报（模拟数据） */
function generateWeatherForecast(): WeatherForecast[] {
  const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'sunny', 'cloudy', 'rainy', 'sunny'];
  const forecasts: WeatherForecast[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const weather = weatherTypes[i];

    // 根据天气类型生成温度
    let baseTemp = 25;
    if (weather === 'sunny') baseTemp = 28 + Math.random() * 5;
    if (weather === 'cloudy') baseTemp = 24 + Math.random() * 4;
    if (weather === 'rainy') baseTemp = 20 + Math.random() * 4;

    const temperature = Math.round(baseTemp * 10) / 10;
    const humidity = weather === 'rainy' ? 70 + Math.random() * 20 : 40 + Math.random() * 30;
    const windSpeed = weather === 'stormy' ? 30 + Math.random() * 20 : 5 + Math.random() * 15;
    const precipitation = weather === 'rainy' ? 10 + Math.random() * 20 : 0;
    const uvIndex = weather === 'sunny' ? 7 + Math.random() * 4 : 3 + Math.random() * 4;

    let alertLevel: WeatherForecast['alertLevel'] = 'none';
    if (temperature > 38 || precipitation > 30) alertLevel = 'red';
    else if (temperature > 35 || precipitation > 15 || windSpeed > 25) alertLevel = 'orange';
    else if (temperature > 32 || precipitation > 5 || windSpeed > 15) alertLevel = 'yellow';

    forecasts.push({
      date: date.toISOString().split('T')[0],
      weather,
      temperature,
      humidity: Math.round(humidity),
      windSpeed: Math.round(windSpeed),
      precipitation: Math.round(precipitation * 10) / 10,
      uvIndex: Math.round(uvIndex),
      alertLevel,
    });
  }

  return forecasts;
}

/** 生成IoT传感器数据（模拟数据） */
function generateSensorData(): SensorData[] {
  const greenhouses = [
    { id: 'GH001', name: 'A区1号温室' },
    { id: 'GH002', name: 'A区2号温室' },
    { id: 'GH003', name: 'B区1号温室' },
    { id: 'GH004', name: 'B区2号温室' },
    { id: 'GH005', name: 'C区1号温室' },
  ];

  const sensorTypes: { type: SensorType; name: string; unit: string; baseValue: number; variance: number }[] = [
    { type: 'air_temp', name: '空气温度', unit: '℃', baseValue: 26, variance: 8 },
    { type: 'air_humidity', name: '空气湿度', unit: '%', baseValue: 65, variance: 20 },
    { type: 'soil_temp', name: '土壤温度', unit: '℃', baseValue: 24, variance: 5 },
    { type: 'soil_moisture', name: '土壤湿度', unit: '%', baseValue: 55, variance: 25 },
    { type: 'soil_ec', name: '土壤EC值', unit: 'mS/cm', baseValue: 2.5, variance: 1 },
    { type: 'soil_ph', name: '土壤pH值', unit: '', baseValue: 6.5, variance: 1 },
    { type: 'light', name: '光照强度', unit: 'lux', baseValue: 35000, variance: 20000 },
    { type: 'co2', name: 'CO2浓度', unit: 'ppm', baseValue: 450, variance: 150 },
  ];

  const sensors: SensorData[] = [];

  greenhouses.forEach(gh => {
    sensorTypes.forEach(st => {
      const value = st.baseValue + (Math.random() - 0.5) * 2 * st.variance;
      const roundedValue = st.type === 'soil_ph' || st.type === 'soil_ec'
        ? Math.round(value * 10) / 10
        : Math.round(value);

      let status: SensorAlertLevel = 'normal';
      let threshold = { min: undefined as number | undefined, max: undefined as number | undefined };

      // 根据传感器类型设置阈值和状态
      switch (st.type) {
        case 'air_temp':
          threshold = { min: 10, max: 35 };
          if (roundedValue > 35 || roundedValue < 10) status = 'critical';
          else if (roundedValue > 32 || roundedValue < 15) status = 'warning';
          break;
        case 'air_humidity':
          threshold = { min: 30, max: 90 };
          if (roundedValue > 90 || roundedValue < 30) status = 'critical';
          else if (roundedValue > 85 || roundedValue < 40) status = 'warning';
          break;
        case 'soil_moisture':
          threshold = { min: 30, max: 80 };
          if (roundedValue > 80 || roundedValue < 30) status = 'critical';
          else if (roundedValue > 75 || roundedValue < 40) status = 'warning';
          break;
        case 'soil_temp':
          threshold = { min: 15, max: 30 };
          if (roundedValue > 30 || roundedValue < 15) status = 'critical';
          else if (roundedValue > 28 || roundedValue < 18) status = 'warning';
          break;
        default:
          threshold = {};
      }

      sensors.push({
        id: `${gh.id}_${st.type}`,
        sensorId: `${gh.id}_${st.type}`.toUpperCase(),
        greenhouseId: gh.id,
        greenhouseName: gh.name,
        type: st.type,
        typeName: st.name,
        value: roundedValue,
        unit: st.unit,
        status,
        threshold,
        lastUpdate: new Date().toISOString(),
      });
    });
  });

  return sensors;
}

/** 根据告警规则检查传感器数据，生成告警 */
function generateAlerts(sensors: SensorData[], rules: AlertRule[]): EnvironmentAlert[] {
  const alerts: EnvironmentAlert[] = [];

  sensors.forEach(sensor => {
    rules.filter(rule => rule.enabled && rule.sensorType === sensor.type).forEach(rule => {
      let triggered = false;
      const value = sensor.value;

      switch (rule.condition.operator) {
        case '>': triggered = value > rule.condition.value; break;
        case '<': triggered = value < rule.condition.value; break;
        case '>=': triggered = value >= rule.condition.value; break;
        case '<=': triggered = value <= rule.condition.value; break;
        case '==': triggered = value === rule.condition.value; break;
        case '!=': triggered = value !== rule.condition.value; break;
      }

      if (triggered) {
        alerts.push({
          id: `alert_${rule.id}_${sensor.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          greenhouseId: sensor.greenhouseId,
          greenhouseName: sensor.greenhouseName,
          sensorType: sensor.type,
          sensorTypeName: sensor.typeName,
          alertLevel: rule.alertLevel,
          message: rule.messageTemplate
            .replace('{greenhouseName}', sensor.greenhouseName)
            .replace('{value}', value.toString()),
          currentValue: value,
          threshold: rule.condition.value,
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    });
  });

  return alerts;
}

// ============================================
// 环境告警触发任务类型
// ============================================

/**
 * 环境告警触发的预测任务（用于避免循环依赖）
 */
export interface EnvAlertPredictedTask {
  id: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  greenhouseName: string;
  taskType: string;
  typeName: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  reason: string;
  source: 'env_alert';
  estimatedHours: number;
  requiredSkills: string[];
  status: 'alert';
}

// ============================================
// 环境告警触发任务生成函数
// ============================================

/**
 * 根据传感器数据生成环境告警触发的任务
 * 当土壤湿度低于40%时，自动生成灌溉任务
 * @param sensors 传感器数据列表
 * @param batches 作物批次数据列表
 * @returns 环境告警触发的任务列表
 */
export function generateAlertTriggeredTasks(
  sensors: SensorData[],
  batches: { id: string; batchCode: string; cropName: string; greenhouseName: string; greenhouseId: string }[]
): EnvAlertPredictedTask[] {
  const tasks: EnvAlertPredictedTask[] = [];

  // 土壤湿度告警阈值
  const SOIL_MOISTURE_LOW_THRESHOLD = 40;

  // 查找土壤湿度低于阈值的传感器
  const lowMoistureSensors = sensors.filter(s =>
    s.type === 'soil_moisture' && s.value < SOIL_MOISTURE_LOW_THRESHOLD
  );

  lowMoistureSensors.forEach(sensor => {
    // 查找对应的作物批次
    const batch = batches.find(b => b.greenhouseId === sensor.greenhouseId);
    if (batch) {
      tasks.push({
        id: `env_alert_${sensor.id}_${Date.now()}`,
        batchId: batch.id,
        batchCode: batch.batchCode,
        cropName: batch.cropName,
        greenhouseName: batch.greenhouseName,
        taskType: 'irrigation',
        typeName: '灌溉',
        priority: 'high',
        dueDate: new Date().toISOString().split('T')[0],
        reason: `土壤湿度低于${SOIL_MOISTURE_LOW_THRESHOLD}%告警（当前${sensor.value}%），需要立即灌溉`,
        source: 'env_alert',
        estimatedHours: 1.5,
        requiredSkills: ['微喷灌溉', '滴灌操作'],
        status: 'alert',
      });
    }
  });

  return tasks;
}

// ============================================
// Hook
// ============================================

export interface UseEnvironmentDataReturn {
  // 天气预报
  weatherForecasts: WeatherForecast[];
  todayWeather: WeatherForecast | null;
  getWeatherByDate: (date: string) => WeatherForecast | undefined;

  // 传感器数据
  sensors: SensorData[];
  getSensorsByGreenhouse: (greenhouseId: string) => SensorData[];
  getSensorsByType: (type: SensorType) => SensorData[];
  criticalSensors: SensorData[];
  warningSensors: SensorData[];

  // 环境告警
  alerts: EnvironmentAlert[];
  unacknowledgedAlerts: EnvironmentAlert[];
  criticalAlerts: EnvironmentAlert[];
  acknowledgeAlert: (alertId: string, userId: string) => void;

  // 环境告警触发的任务
  alertTriggeredTasks: EnvAlertPredictedTask[];

  // 天气影响评估
  assessWeatherImpact: (taskType: string) => WeatherImpact;
  getCurrentWeatherRecommendation: () => string;

  // 告警规则
  alertRules: AlertRule[];
  updateAlertRule: (ruleId: string, updates: Partial<AlertRule>) => void;
}

export function useEnvironmentData(): UseEnvironmentDataReturn {
  // 天气预报数据
  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecast[]>([]);

  // 传感器数据
  const [sensors, setSensors] = useState<SensorData[]>([]);

  // 告警列表
  const [alerts, setAlerts] = useState<EnvironmentAlert[]>([]);

  // 告警规则
  const [alertRules, setAlertRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES);

  // 环境告警触发的任务
  const [alertTriggeredTasks, setAlertTriggeredTasks] = useState<EnvAlertPredictedTask[]>([]);

  // 初始化模拟数据
  useEffect(() => {
    // 生成天气预报
    setWeatherForecasts(generateWeatherForecast());

    // 生成传感器数据
    const sensorData = generateSensorData();
    setSensors(sensorData);

    // 生成告警
    setAlerts(generateAlerts(sensorData, DEFAULT_ALERT_RULES));

    // 生成环境告警触发的任务（土壤湿度低于40%时生成灌溉任务）
    setAlertTriggeredTasks(generateAlertTriggeredTasks(sensorData, cropBatches));
  }, []);

  // 模拟实时更新传感器数据（每30秒更新一次）
  useEffect(() => {
    const interval = setInterval(() => {
      const newSensors = sensors.map(sensor => {
        const variance = sensor.type === 'soil_ph' || sensor.type === 'soil_ec' ? 0.5 : 5;
        const newValue = sensor.value + (Math.random() - 0.5) * variance;
        const roundedValue = sensor.type === 'soil_ph' || sensor.type === 'soil_ec'
          ? Math.round(newValue * 10) / 10
          : Math.round(newValue);

        return { ...sensor, value: roundedValue, lastUpdate: new Date().toISOString() };
      });

      setSensors(newSensors);
      setAlerts(generateAlerts(newSensors, alertRules));
      // 更新环境告警触发的任务
      setAlertTriggeredTasks(generateAlertTriggeredTasks(newSensors, cropBatches));
    }, 30000);

    return () => clearInterval(interval);
  }, [sensors, alertRules]);

  // 今日天气
  const todayWeather = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return weatherForecasts.find(w => w.date === today) || null;
  }, [weatherForecasts]);

  // 获取指定日期的天气
  const getWeatherByDate = useCallback((date: string) => {
    return weatherForecasts.find(w => w.date === date);
  }, [weatherForecasts]);

  // 按温室筛选传感器
  const getSensorsByGreenhouse = useCallback((greenhouseId: string) => {
    return sensors.filter(s => s.greenhouseId === greenhouseId);
  }, [sensors]);

  // 按类型筛选传感器
  const getSensorsByType = useCallback((type: SensorType) => {
    return sensors.filter(s => s.type === type);
  }, [sensors]);

  // 关键告警传感器
  const criticalSensors = useMemo(() => {
    return sensors.filter(s => s.status === 'critical');
  }, [sensors]);

  // 警告级别传感器
  const warningSensors = useMemo(() => {
    return sensors.filter(s => s.status === 'warning');
  }, [sensors]);

  // 未确认的告警
  const unacknowledgedAlerts = useMemo(() => {
    return alerts.filter(a => !a.acknowledged);
  }, [alerts]);

  // 严重告警
  const criticalAlerts = useMemo(() => {
    return alerts.filter(a => a.alertLevel === 'critical');
  }, [alerts]);

  // 确认告警
  const acknowledgeAlert = useCallback((alertId: string, userId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? { ...alert, acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date().toISOString() }
        : alert
    ));
  }, []);

  // 评估天气对任务的影响
  const assessWeatherImpact = useCallback((taskType: string): WeatherImpact => {
    const rule = WEATHER_IMPACT_RULES[taskType];
    const weather = todayWeather;

    if (!rule || !weather) {
      return {
        taskType,
        suitable: true,
        reason: '天气数据不可用',
        suggestion: '请查看实际天气情况后决定',
      };
    }

    const { suitableWeather, minTemperature, maxTemperature, maxWindSpeed, maxPrecipitation } = rule;

    // 检查天气类型
    if (!suitableWeather.includes(weather.weather)) {
      return {
        taskType,
        suitable: false,
        reason: `当前天气为${getWeatherLabel(weather.weather)}，不适合执行此任务`,
        suggestion: '建议在天气好转后执行，或选择其他合适的时间段',
      };
    }

    // 检查温度
    if (weather.temperature < minTemperature || weather.temperature > maxTemperature) {
      return {
        taskType,
        suitable: false,
        reason: `当前温度${weather.temperature}℃超出适宜范围(${minTemperature}-${maxTemperature}℃)`,
        suggestion: '建议在温度适宜时执行',
      };
    }

    // 检查风速
    if (weather.windSpeed > maxWindSpeed) {
      return {
        taskType,
        suitable: false,
        reason: `当前风速${weather.windSpeed}km/h过高`,
        suggestion: '风速降低后再执行，尤其是喷药作业',
      };
    }

    // 检查降水
    if (weather.precipitation > maxPrecipitation) {
      return {
        taskType,
        suitable: false,
        reason: `当前降水量${weather.precipitation}mm可能影响作业`,
        suggestion: '降水停止后再执行',
      };
    }

    return {
      taskType,
      suitable: true,
      reason: '当前天气条件适合执行此任务',
      suggestion: '可以正常执行',
    };
  }, [todayWeather]);

  // 获取当前天气建议
  const getCurrentWeatherRecommendation = useCallback(() => {
    if (!todayWeather) return '天气数据加载中...';

    const { weather, temperature, humidity, windSpeed, alertLevel } = todayWeather;

    let recommendation = `今日天气${getWeatherLabel(weather)}，气温${temperature}℃，湿度${humidity}%`;

    if (alertLevel !== 'none') {
      recommendation += `，${getAlertLevelLabel(alertLevel)}预警`;
    }

    if (weather === 'rainy') {
      recommendation += '。建议减少户外作业，优先安排室内工作';
    } else if (weather === 'sunny' && temperature > 32) {
      recommendation += '。高温天气，建议安排在早晨或傍晚执行户外作业';
    } else if (windSpeed > 20) {
      recommendation += '。风速较大，喷药作业应暂停';
    }

    return recommendation;
  }, [todayWeather]);

  // 更新告警规则
  const updateAlertRule = useCallback((ruleId: string, updates: Partial<AlertRule>) => {
    setAlertRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  }, []);

  return {
    weatherForecasts,
    todayWeather,
    getWeatherByDate,

    sensors,
    getSensorsByGreenhouse,
    getSensorsByType,
    criticalSensors,
    warningSensors,

    alerts,
    unacknowledgedAlerts,
    criticalAlerts,
    acknowledgeAlert,

    alertTriggeredTasks,

    assessWeatherImpact,
    getCurrentWeatherRecommendation,

    alertRules,
    updateAlertRule,
  };
}

// 辅助函数：获取天气类型标签
function getWeatherLabel(weather: WeatherType): string {
  const labels: Record<WeatherType, string> = {
    sunny: '晴',
    cloudy: '多云',
    rainy: '雨',
    stormy: '暴风雨',
    foggy: '雾',
    snowy: '雪',
  };
  return labels[weather] || weather;
}

// 辅助函数：获取预警等级标签
function getAlertLevelLabel(level: WeatherForecast['alertLevel']): string {
  const labels: Record<string, string> = {
    none: '无',
    yellow: '黄色',
    orange: '橙色',
    red: '红色',
  };
  return labels[level] || level;
}
