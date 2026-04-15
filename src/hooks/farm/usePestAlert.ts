/**
 * 病虫害预警 Hook
 * 基于巡查记录检测病虫害问题，并生成预警和推荐
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { farmInspectionRecords } from '../../data/farmMockData';
import { cropBatches } from '../../data/mockData';
import {
  PestAlert,
  PestAlertRule,
  FarmOperationType,
  InspectionRecord,
} from '../../types/farm/common';
import { PEST_ALERT_RULES } from '../../data/recommendationRules';

/**
 * 巡田记录数据类型
 */
interface InspectionRecordData {
  id: string;
  recordCode: string;
  inspectorId: string;
  inspectorName: string;
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  batchId?: string;
  batchCode?: string;
  checkDate: string;
  cropStatus: string;
  issues: string[];
  status: 'normal' | 'attention' | 'critical';
  weather?: string;
  temperature?: number;
  humidity?: number;
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
 * 巡田记录温室ID到标准温室ID的映射
 * farmInspectionRecords 使用 GH001/GH002 等格式
 * cropBatches 使用 G001/G002 等格式
 */
const INSPECTION_GREENHOUSE_ID_MAP: Record<string, string> = {
  'GH001': 'G001',
  'GH002': 'G002',
  'GH003': 'G003',
  'GH004': 'G004',
  'GH005': 'G005',
  'GH006': 'G006',
  'GH007': 'G007',
  'GH008': 'G008',
  'GH009': 'G009',
  'GH010': 'G010',
};

/**
 * 病虫害预警 Hook
 */
export function usePestAlert(daysBack: number = 7) {
  const [inspections, setInspections] = useState<InspectionRecordData[]>([]);
  const [alerts, setAlerts] = useState<PestAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // 获取温室作物映射
  const greenhouseCropMap = useMemo(() => {
    const map = new Map<string, GreenhouseCrop>();

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

  // 加载巡田记录
  const loadInspections = useCallback(() => {
    setIsLoading(true);
    try {
      // 使用 farmMockData 中的巡田记录
      const inspectionData: InspectionRecordData[] = farmInspectionRecords.map(record => ({
        id: record.id,
        recordCode: record.recordCode,
        inspectorId: record.inspectorId,
        inspectorName: record.inspectorName,
        greenhouseId: record.greenhouseId,
        greenhouseName: record.greenhouseName,
        cropName: record.cropName,
        batchId: record.batchId,
        batchCode: record.batchCode,
        checkDate: record.checkDate,
        cropStatus: record.cropStatus,
        issues: record.issues,
        status: record.status as 'normal' | 'attention' | 'critical',
        weather: record.weather,
        temperature: record.temperature,
        humidity: record.humidity,
      }));
      setInspections(inspectionData);
      setLastUpdate(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 检测病虫害预警
  const detectAlerts = useCallback(() => {
    const detectedAlerts: PestAlert[] = [];
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const cutoffDate = subDays(today, daysBack);

    // 只处理近期的巡田记录
    const recentInspections = inspections.filter(inspection => {
      const checkDate = new Date(inspection.checkDate);
      return checkDate >= cutoffDate;
    });

    // 遍历巡田记录
    recentInspections.forEach(inspection => {
      // 检查是否有问题记录
      if (!inspection.issues || inspection.issues.length === 0) return;

      // 获取温室作物信息（使用温室ID映射表将GH001转换为G001）
      const mappedGreenhouseId = INSPECTION_GREENHOUSE_ID_MAP[inspection.greenhouseId] || inspection.greenhouseId;
      const greenhouseInfo = greenhouseCropMap.get(mappedGreenhouseId);
      const cropName = inspection.cropName || greenhouseInfo?.cropName || '';

      // 遍历每个问题
      inspection.issues.forEach(issue => {
        // 查找匹配的问题规则
        const matchingRules = PEST_ALERT_RULES.filter(rule => {
          // 检查关键词是否匹配
          const keywordMatch = rule.keywords.some(keyword =>
            issue.toLowerCase().includes(keyword.toLowerCase())
          );
          if (!keywordMatch) return false;

          // 检查作物类型是否匹配
          if (!rule.cropTypes.includes(cropName) && !rule.cropTypes.includes('通用')) {
            return false;
          }

          return true;
        });

        // 生成预警
        matchingRules.forEach(rule => {
          // 计算紧急程度
          let urgencyLevel = rule.urgencyLevel;

          // 如果巡田记录本身状态是 critical，增加紧急度
          if (inspection.status === 'critical') {
            urgencyLevel = Math.min(urgencyLevel + 2, 5);
          }

          detectedAlerts.push({
            id: `PEST-${inspection.id}-${issue}-${Date.now()}`,
            alertId: `ALERT${format(new Date(), 'yyyyMMdd')}-${String(detectedAlerts.length + 1).padStart(3, '0')}`,
            greenhouseId: inspection.greenhouseId,
            greenhouseName: inspection.greenhouseName,
            cropName,
            batchId: inspection.batchId || greenhouseInfo?.batchId,
            batchCode: inspection.batchCode || greenhouseInfo?.batchCode,
            issueType: issue,
            severity: rule.severity,
            recommendedActions: rule.action,
            urgencyLevel,
            suggestedDate: todayStr,
            latestDate: inspection.checkDate,
            source: 'inspection',
            sourceRecordId: inspection.id,
            sourceRecordCode: inspection.recordCode,
            createdAt: new Date().toISOString(),
          });
        });

        // 如果没有匹配到特定规则，但问题包含病虫害关键词，生成通用预警
        if (matchingRules.length === 0) {
          const pestKeywords = ['病', '虫', '害', '菌', '霉', '腐烂', '斑点', '枯萎', '黄化'];
          const isPestRelated = pestKeywords.some(keyword =>
            issue.toLowerCase().includes(keyword.toLowerCase())
          );

          if (isPestRelated) {
            detectedAlerts.push({
              id: `PEST-GEN-${inspection.id}-${issue}-${Date.now()}`,
              alertId: `ALERT${format(new Date(), 'yyyyMMdd')}-${String(detectedAlerts.length + 1).padStart(3, '0')}`,
              greenhouseId: inspection.greenhouseId,
              greenhouseName: inspection.greenhouseName,
              cropName,
              batchId: inspection.batchId || greenhouseInfo?.batchId,
              batchCode: inspection.batchCode || greenhouseInfo?.batchCode,
              issueType: issue,
              severity: inspection.status === 'critical' ? 'critical' : 'attention',
              recommendedActions: ['pest_control'],
              urgencyLevel: inspection.status === 'critical' ? 4 : 2,
              suggestedDate: todayStr,
              latestDate: inspection.checkDate,
              source: 'inspection',
              sourceRecordId: inspection.id,
              sourceRecordCode: inspection.recordCode,
              createdAt: new Date().toISOString(),
            });
          }
        }
      });
    });

    // 按紧急程度排序
    detectedAlerts.sort((a, b) => b.urgencyLevel - a.urgencyLevel);

    setAlerts(detectedAlerts);
    return detectedAlerts;
  }, [inspections, greenhouseCropMap, daysBack]);

  // 刷新数据
  const refresh = useCallback(() => {
    loadInspections();
  }, [loadInspections]);

  // 初始化
  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  // 检测预警
  useEffect(() => {
    if (inspections.length > 0) {
      detectAlerts();
    }
  }, [inspections, detectAlerts]);

  // 获取特定温室的预警
  const getAlertsByGreenhouse = useCallback((greenhouseId: string) => {
    return alerts.filter(alert => alert.greenhouseId === greenhouseId);
  }, [alerts]);

  // 获取特定作物的预警
  const getAlertsByCrop = useCallback((cropName: string) => {
    return alerts.filter(alert => alert.cropName === cropName);
  }, [alerts]);

  // 获取紧急预警（紧急度 >= 4）
  const getCriticalAlerts = useCallback(() => {
    return alerts.filter(alert => alert.urgencyLevel >= 4);
  }, [alerts]);

  // 获取预警统计
  const stats = useMemo(() => ({
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    attention: alerts.filter(a => a.severity === 'attention').length,
    urgent: alerts.filter(a => a.urgencyLevel >= 4).length,
  }), [alerts]);

  return {
    // 数据
    inspections,
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
    stats,
  };
}

export default usePestAlert;
