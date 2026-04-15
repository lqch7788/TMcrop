/**
 * 环境异常检测 Hook
 * 基于 IoT 传感器数据检测环境异常，并生成预警和推荐
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { iotSensors } from '../../data/mockData';
import { cropBatches } from '../../data/mockData';
import {
  EnvAlert,
  EnvAlertRule,
  EnvMetricType,
  FarmOperationType,
} from '../../types/farm/common';
import { ENV_ALERT_RULES } from '../../data/recommendationRules';

/**
 * IoT传感器数据类型
 */
interface IoTSensorData {
  id: string;
  sensorId: string;
  greenhouseId: string;
  greenhouseName: string;
  type: string;
  typeName: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: string;
}

/**
 * 温室作物信息
 */
interface GreenhouseCrop {
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  batchId?: string;
  batchCode?: string;
}

/**
 * 环境异常检测 Hook
 */
export function useEnvAlert() {
  const [sensors, setSensors] = useState<IoTSensorData[]>([]);
  const [alerts, setAlerts] = useState<EnvAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // 获取温室作物映射
  const greenhouseCropMap = useMemo(() => {
    const map = new Map<string, GreenhouseCrop>();

    // 从 cropBatches 获取温室作物信息
    cropBatches.forEach(batch => {
      if (!map.has(batch.greenhouseId)) {
        map.set(batch.greenhouseId, {
          greenhouseId: batch.greenhouseId,
          greenhouseName: batch.greenhouseName,
          cropName: batch.cropName,
          batchId: batch.id,
          batchCode: batch.batchCode,
        });
      }
    });

    return map;
  }, []);

  // 加载传感器数据
  const loadSensors = useCallback(() => {
    setIsLoading(true);
    try {
      // 使用 mockData 中的传感器数据
      const sensorData = iotSensors.map(sensor => ({
        id: sensor.id,
        sensorId: sensor.sensorId,
        greenhouseId: sensor.greenhouseId,
        greenhouseName: sensor.greenhouseName,
        type: sensor.type,
        typeName: sensor.typeName,
        value: sensor.value,
        unit: sensor.unit,
        status: sensor.status,
        lastUpdate: sensor.lastUpdate,
      }));
      setSensors(sensorData);
      setLastUpdate(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 检测环境异常
  const detectAlerts = useCallback(() => {
    const detectedAlerts: EnvAlert[] = [];
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // 按温室分组处理传感器数据
    const sensorsByGreenhouse = new Map<string, IoTSensorData[]>();
    sensors.forEach(sensor => {
      if (!sensorsByGreenhouse.has(sensor.greenhouseId)) {
        sensorsByGreenhouse.set(sensor.greenhouseId, []);
      }
      sensorsByGreenhouse.get(sensor.greenhouseId)!.push(sensor);
    });

    // 遍历每个温室的传感器
    sensorsByGreenhouse.forEach((ghSensors, greenhouseId) => {
      const greenhouseInfo = greenhouseCropMap.get(greenhouseId);
      if (!greenhouseInfo) return;

      const cropName = greenhouseInfo.cropName;

      // 遍历每个传感器
      ghSensors.forEach(sensor => {
        // 查找匹配的规则
        const matchingRules = ENV_ALERT_RULES.filter(rule => {
          // 检查类型是否匹配
          if (!typeMatches(rule.type, sensor.type)) return false;
          // 检查作物类型是否匹配
          if (!rule.cropTypes.includes(cropName) && !rule.cropTypes.includes('通用')) {
            return false;
          }
          return true;
        });

        // 检查是否触发预警
        matchingRules.forEach(rule => {
          const isOutOfRange = sensor.value < rule.thresholds.min || sensor.value > rule.thresholds.max;

          if (isOutOfRange) {
            const severity = sensor.status === 'critical' ? 'critical' :
                           sensor.value < rule.thresholds.min * 0.8 || sensor.value > rule.thresholds.max * 1.2
                             ? 'critical' : 'warning';

            detectedAlerts.push({
              id: `ENV-${greenhouseId}-${sensor.type}-${Date.now()}`,
              alertId: `ALERT${format(new Date(), 'yyyyMMdd')}-${String(detectedAlerts.length + 1).padStart(3, '0')}`,
              greenhouseId,
              greenhouseName: sensor.greenhouseName,
              cropName,
              batchId: greenhouseInfo.batchId,
              batchCode: greenhouseInfo.batchCode,
              metricType: rule.type,
              metricTypeName: getMetricTypeName(rule.type),
              currentValue: sensor.value,
              threshold: rule.thresholds,
              unit: sensor.unit,
              severity,
              recommendedActions: rule.action,
              suggestedDate: todayStr,
              latestDate: todayStr,
              source: 'iot_sensor',
              createdAt: new Date().toISOString(),
            });
          }
        });
      });
    });

    // 按严重程度排序
    detectedAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    setAlerts(detectedAlerts);
    return detectedAlerts;
  }, [sensors, greenhouseCropMap]);

  // 刷新数据
  const refresh = useCallback(() => {
    loadSensors();
  }, [loadSensors]);

  // 初始化
  useEffect(() => {
    loadSensors();
  }, [loadSensors]);

  // 检测异常
  useEffect(() => {
    if (sensors.length > 0) {
      detectAlerts();
    }
  }, [sensors, detectAlerts]);

  // 获取特定温室的预警
  const getAlertsByGreenhouse = useCallback((greenhouseId: string) => {
    return alerts.filter(alert => alert.greenhouseId === greenhouseId);
  }, [alerts]);

  // 获取特定作物的预警
  const getAlertsByCrop = useCallback((cropName: string) => {
    return alerts.filter(alert => alert.cropName === cropName);
  }, [alerts]);

  // 获取紧急预警
  const getCriticalAlerts = useCallback(() => {
    return alerts.filter(alert => alert.severity === 'critical');
  }, [alerts]);

  return {
    // 数据
    sensors,
    alerts,

    // 状态
    isLoading,
    lastUpdate,

    // 操作
    refresh,
    detectAlerts,
    getAlertsByGreenhouse,
    getAlertsByCrop,
    getCriticalAlerts,

    // 统计
    stats: {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
    },
  };
}

// 类型匹配辅助函数
function typeMatches(ruleType: EnvMetricType, sensorType: string): boolean {
  const typeMap: Record<string, EnvMetricType[]> = {
    'air_temp': ['temperature'],
    'air_humidity': ['humidity'],
    'soil_temp': ['temperature'],
    'soil_moisture': ['soil_moisture'],
    'soil_ec': ['soil_ec'],
    'soil_ph': ['soil_ph'],
    'light': ['light'],
    'co2': ['co2'],
  };

  const matchedTypes = typeMap[sensorType] || [];
  return matchedTypes.includes(ruleType);
}

// 获取指标类型名称
function getMetricTypeName(type: EnvMetricType): string {
  const names: Record<EnvMetricType, string> = {
    temperature: '温度',
    humidity: '湿度',
    soil_moisture: '土壤湿度',
    soil_ec: '土壤EC值',
    soil_ph: '土壤pH值',
    light: '光照',
    co2: '二氧化碳',
  };
  return names[type] || type;
}

export default useEnvAlert;
