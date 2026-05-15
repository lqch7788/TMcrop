/**
 * 智能推荐引擎 Hook
 * 整合环境预警、病虫害预警、作物阶段任务等多数据源，生成智能任务推荐
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { useEnvAlert } from './useEnvAlert';
import { usePestAlert } from './usePestAlert';
import { useWorkerMatch } from './useWorkerMatch';
import { useFarmTaskStore } from '../../stores/farmTaskStore';
import { useProductionPlanStore } from '../../stores/useProductionPlanStore';
import { useGreenhouseStore } from '../../stores/useGreenhouseStore';
import {
  SmartRecommendation,
  EnvAlert,
  PestAlert,
  StageTaskRecommendation,
  RecommendationFilters,
  RecommendationSourceType,
  RecommendationPriority,
  FarmOperationType,
  RecommendationEvidence,
} from '../../types/farm/common';
import {
  CROP_STAGE_TASK_MAP,
  RECOMMENDATION_RULES,
} from '../../data/recommendationRules';

/**
 * 任务历史记录
 */
interface TaskHistory {
  id: string;
  taskCode: string;
  type: string;
  field: string;
  assigneeId: string;
  assigneeName: string;
  status: string;
  planEnd: string;
  completedAt?: string;
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
  stage?: string;
}

/**
 * 温室名称映射：将 taskDispatchTasks 的温室名称映射到 cropBatches 的温室名称
 * 用于解决不同数据源使用不同温室命名的问题
 *
 * taskDispatchFields 中的温室与 cropBatches 的对应关系：
 * - 1-3号棚 -> 玻璃温室A区 (G001) - 番茄
 * - 4-5号棚 -> 玻璃温室B区 (G002) - 黄瓜
 * - 6-7号棚 -> 日光温室1号 (G004) - 草莓
 * - 8号棚   -> 玻璃温室C区 (G003) - 辣椒
 * - 9号棚   -> 日光温室2号 (G005) - 生菜
 * - 11号棚  -> 日光温室4号 (G007) - 茄子
 */
const GREENHOUSE_NAME_MAP: Record<string, string> = {
  // 温室大棚
  '1号棚': '玻璃温室A区',   // G001 - 番茄
  '2号棚': '玻璃温室A区',   // G001 - 番茄
  '3号棚': '玻璃温室A区',   // G001 - 番茄
  '4号棚': '玻璃温室B区',   // G002 - 黄瓜
  '5号棚': '玻璃温室B区',   // G002 - 黄瓜
  '6号棚': '日光温室1号',   // G004 - 草莓 (注意：不是玻璃温室C区)
  '7号棚': '日光温室1号',   // G004 - 草莓
  '8号棚': '玻璃温室C区',   // G003 - 辣椒
  '9号棚': '日光温室2号',   // G005 - 生菜
  '10号棚': '日光温室3号',  // 假设
  '11号棚': '日光温室4号',  // G007 - 茄子
  '12号棚': '日光温室5号',  // 假设
  // 大田
  'A1地块': '大田A区',
  'A2地块': '大田A区',
  'A3地块': '大田A区',
  'B1地块': '大田B区',
  'B2地块': '大田B区',
  'C1地块': '大田C区',
  'C2地块': '大田C区',
  'D1地块': '大田D区',
  // 其他可能的名称变体（直接映射）
  '日光温室1号': '日光温室1号',
  '日光温室2号': '日光温室2号',
  '日光温室3号': '日光温室3号',
  '日光温室4号': '日光温室4号',
  '日光温室5号': '日光温室5号',
  '玻璃温室A区': '玻璃温室A区',
  '玻璃温室B区': '玻璃温室B区',
  '玻璃温室C区': '玻璃温室C区',
  '塑料大棚1号': '塑料大棚1号',
};

/**
 * 获取标准温室名称
 */
function normalizeGreenhouseName(name: string): string {
  return GREENHOUSE_NAME_MAP[name] || name;
}

/**
 * 智能推荐 Hook
 */
export function useSmartRecommendation() {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecommendationFilters>({});

  // 集成环境预警 Hook
  const {
    alerts: envAlerts,
    refresh: refreshEnvAlerts,
    stats: envStats,
  } = useEnvAlert();

  // 集成病虫害预警 Hook
  const {
    alerts: pestAlerts,
    refresh: refreshPestAlerts,
    stats: pestStats,
  } = usePestAlert(3000); // 扩展到30天以包含历史巡田记录

  // 集成人员匹配 Hook
  const {
    findBestMatch,
    findAlternativeMatches,
    getAvailableWorkers,
  } = useWorkerMatch();

  // 获取温室作物映射
  const greenhouseCropMap = useMemo(() => {
    const map = new Map<string, GreenhouseCrop>();

    // 从 useProductionPlanStore 获取温室作物信息
    const plans = useProductionPlanStore.getState().plans;
    plans.forEach(batch => {
      if (!map.has(batch.greenhouseId)) {
        map.set(batch.greenhouseId, {
          greenhouseId: batch.greenhouseId,
          greenhouseName: batch.greenhouseName,
          cropName: batch.cropName,
          batchId: batch.id,
          batchCode: batch.batchCode,
          stage: batch.stage,
        });
      }
    });

    return map;
  }, []);

  // 获取任务历史
  const taskHistory = useMemo((): TaskHistory[] => {
    // 从 useFarmTaskStore 获取任务历史
    const storeTasks = useFarmTaskStore.getState().tasks;
    return storeTasks.map(task => ({
      id: task.id,
      taskCode: task.taskCode || task.id,
      type: task.type,
      field: task.field || '',
      assigneeId: task.assigneeId || '',
      assigneeName: task.assigneeName || '',
      status: task.status,
      planEnd: task.planEnd || task.dueDate,
      completedAt: task.completedAt,
    }));
  }, []);

  /**
   * 获取上次任务时间
   */
  const getLastTaskDate = useCallback((
    field: string,
    taskType: FarmOperationType
  ): { date: string | null; daysSince: number } => {
    const today = new Date();
    const normalizedField = normalizeGreenhouseName(field);
    const fieldTasks = taskHistory.filter(t => {
      const normalizedTaskField = normalizeGreenhouseName(t.field);
      return normalizedTaskField === normalizedField && t.type === taskType && t.status === 'completed';
    });

    if (fieldTasks.length === 0) {
      return { date: null, daysSince: 999 };
    }

    // 按完成时间排序
    fieldTasks.sort((a, b) => {
      const dateA = a.completedAt || a.planEnd;
      const dateB = b.completedAt || b.planEnd;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    const lastTask = fieldTasks[0];
    const lastDate = new Date(lastTask.completedAt || lastTask.planEnd);
    const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    return { date: format(lastDate, 'yyyy-MM-dd'), daysSince };
  }, [taskHistory]);

  /**
   * 检查是否有活跃任务
   */
  const hasActiveTask = useCallback((
    field: string,
    taskType?: FarmOperationType
  ): boolean => {
    // 标准化温室名称
    const normalizedField = normalizeGreenhouseName(field);
    return taskHistory.some(t => {
      const normalizedTaskField = normalizeGreenhouseName(t.field);
      return normalizedTaskField === normalizedField &&
        (t.status === 'in_progress' || t.status === 'pending') &&
        (!taskType || t.type === taskType);
    });
  }, [taskHistory]);

  /**
   * 生成环境异常推荐
   */
  const generateEnvRecommendations = useCallback((): SmartRecommendation[] => {
    const results: SmartRecommendation[] = [];

    envAlerts.forEach(alert => {
      // 跳过已有活跃任务的
      if (hasActiveTask(alert.greenhouseName, alert.recommendedActions[0])) {
        return;
      }

      const primaryAction = alert.recommendedActions[0] || 'irrigation';
      const workerMatch = findBestMatch({ type: primaryAction, field: alert.greenhouseName });
      const alternatives = findAlternativeMatches({ type: primaryAction, field: alert.greenhouseName }, 3, workerMatch ? [workerMatch.workerId] : []);

      results.push({
        id: `REC-ENV-${alert.id}`,
        recommendId: `REC${format(new Date(), 'yyyyMMdd')}-${String(results.length + 1).padStart(3, '0')}`,
        source: {
          type: 'env_alert',
          description: `${alert.metricTypeName}异常：${alert.currentValue}${alert.unit}（阈值：${alert.threshold.min}-${alert.threshold.max}${alert.unit}）`,
          dataReference: alert.id,
        },
        task: {
          types: alert.recommendedActions,
          typeLabels: alert.recommendedActions.map(getOperationLabel),
          field: alert.greenhouseName,
          fieldId: alert.greenhouseId,
          crop: alert.cropName,
          batchId: alert.batchId,
          batchCode: alert.batchCode,
          suggestedDate: alert.suggestedDate,
          latestDate: alert.latestDate,
        },
        reason: {
          primary: `环境参数${alert.severity === 'critical' ? '严重' : ''}异常，需要及时处理`,
          secondary: [
            `${alert.greenhouseName}当前${alert.metricTypeName}为${alert.currentValue}${alert.unit}`,
            `超出正常范围（${alert.threshold.min}-${alert.threshold.max}${alert.unit}）`,
          ],
          evidence: [
            { type: 'sensor', label: '当前值', value: `${alert.currentValue}${alert.unit}` },
            { type: 'threshold', label: '阈值范围', value: `${alert.threshold.min}-${alert.threshold.max}${alert.unit}` },
            { type: 'severity', label: '严重程度', value: alert.severity === 'critical' ? '严重' : '警告' },
          ],
        },
        assignment: {
          recommendedWorkerId: workerMatch?.workerId || '',
          recommendedWorkerName: workerMatch?.workerName || '待分配',
          matchScore: workerMatch?.matchScore || 0,
          skillsMatch: workerMatch?.factors.skillMatch || [],
          alternatives: alternatives.map(alt => ({
            workerId: alt.workerId,
            workerName: alt.workerName,
            matchScore: alt.matchScore,
          })),
        },
        priority: {
          level: alert.severity === 'critical' ? 'urgent' : 'high',
          score: alert.severity === 'critical' ? 95 : 75,
          factors: [
            { name: '环境异常', weight: 30, value: alert.severity === 'critical' ? 100 : 60 },
            { name: '紧急程度', weight: 30, value: alert.severity === 'critical' ? 100 : 50 },
            { name: '作物影响', weight: 20, value: 70 },
            { name: '处理时效', weight: 20, value: 80 },
          ],
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: alert.latestDate,
      });
    });

    return results;
  }, [envAlerts, hasActiveTask, findBestMatch, findAlternativeMatches]);

  /**
   * 生成病虫害预警推荐
   */
  const generatePestRecommendations = useCallback((): SmartRecommendation[] => {
    const results: SmartRecommendation[] = [];

    pestAlerts.forEach(alert => {
      // 跳过已有活跃任务的
      if (hasActiveTask(alert.greenhouseName, 'pest_control')) {
        return;
      }

      const workerMatch = findBestMatch({ type: 'pest_control', field: alert.greenhouseName });
      const alternatives = findAlternativeMatches({ type: 'pest_control', field: alert.greenhouseName }, 3, workerMatch ? [workerMatch.workerId] : []);

      results.push({
        id: `REC-PEST-${alert.id}`,
        recommendId: `REC${format(new Date(), 'yyyyMMdd')}-${String(results.length + 1).padStart(3, '0')}`,
        source: {
          type: 'pest_alert',
          description: `巡田发现${alert.issueType}，${alert.severity === 'critical' ? '需要紧急处理' : '需要关注'}`,
          dataReference: alert.sourceRecordId || alert.id,
        },
        task: {
          types: alert.recommendedActions,
          typeLabels: alert.recommendedActions.map(getOperationLabel),
          field: alert.greenhouseName,
          fieldId: alert.greenhouseId,
          crop: alert.cropName,
          batchId: alert.batchId,
          batchCode: alert.batchCode,
          suggestedDate: alert.suggestedDate,
          latestDate: alert.latestDate,
        },
        reason: {
          primary: `病虫害预警：${alert.issueType}`,
          secondary: [
            `来源：巡田记录${alert.sourceRecordCode || ''}`,
            `紧急程度：${alert.urgencyLevel >= 4 ? '紧急' : alert.urgencyLevel >= 3 ? '中等' : '一般'}`,
          ],
          evidence: [
            { type: 'issue', label: '问题类型', value: alert.issueType },
            { type: 'urgency', label: '紧急程度', value: String(alert.urgencyLevel) },
            { type: 'source', label: '数据来源', value: '巡田记录' },
          ],
        },
        assignment: {
          recommendedWorkerId: workerMatch?.workerId || '',
          recommendedWorkerName: workerMatch?.workerName || '待分配',
          matchScore: workerMatch?.matchScore || 0,
          skillsMatch: workerMatch?.factors.skillMatch || [],
          alternatives: alternatives.map(alt => ({
            workerId: alt.workerId,
            workerName: alt.workerName,
            matchScore: alt.matchScore,
          })),
        },
        priority: {
          level: alert.urgencyLevel >= 5 ? 'urgent' : alert.urgencyLevel >= 4 ? 'high' : alert.urgencyLevel >= 3 ? 'medium' : 'low',
          score: Math.min(alert.urgencyLevel * 18, 100),
          factors: [
            { name: '病虫害类型', weight: 30, value: alert.urgencyLevel >= 4 ? 100 : 60 },
            { name: '发现时间', weight: 20, value: 80 },
            { name: '处理紧迫性', weight: 30, value: alert.urgencyLevel >= 4 ? 100 : 50 },
            { name: '作物状态', weight: 20, value: 70 },
          ],
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: alert.latestDate,
      });
    });

    return results;
  }, [pestAlerts, hasActiveTask, findBestMatch, findAlternativeMatches]);

  /**
   * 生成作物阶段任务推荐
   */
  const generateStageRecommendations = useCallback((): SmartRecommendation[] => {
    const results: SmartRecommendation[] = [];
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // 遍历所有温室和作物批次（从 useProductionPlanStore 获取）
    const plans = useProductionPlanStore.getState().plans;
    plans.forEach(batch => {
      const greenhouseInfo = greenhouseCropMap.get(batch.greenhouseId);
      if (!greenhouseInfo) return;

      const stage = batch.stage as string;
      const stageTasks = CROP_STAGE_TASK_MAP[batch.cropName]?.[stage];
      if (!stageTasks) return;

      // 检查是否有活跃任务
      if (hasActiveTask(batch.greenhouseName)) {
        return;
      }

      // 检查每个任务类型是否需要推荐
      stageTasks.tasks.forEach(taskType => {
        const { date: lastDate, daysSince } = getLastTaskDate(batch.greenhouseName, taskType);
        const intervalDays = stageTasks.intervalDays || 7;

        // 如果超过间隔天数，推荐任务
        if (daysSince >= intervalDays) {
          const workerMatch = findBestMatch({ type: taskType, field: batch.greenhouseName });
          const alternatives = findAlternativeMatches({ type: taskType, field: batch.greenhouseName }, 3, workerMatch ? [workerMatch.workerId] : []);

          // 计算优先级
          let priority: RecommendationPriority = 'medium';
          let priorityScore = 50;

          if (daysSince >= intervalDays * 2) {
            priority = 'high';
            priorityScore = 75;
          } else if (daysSince >= intervalDays * 1.5) {
            priority = 'medium';
            priorityScore = 60;
          }

          results.push({
            id: `REC-STAGE-${batch.id}-${taskType}`,
            recommendId: `REC${format(new Date(), 'yyyyMMdd')}-${String(results.length + 1).padStart(3, '0')}`,
            source: {
              type: 'stage_task',
              description: `${batch.cropName}当前处于${getStageLabel(stage)}阶段，建议进行${getOperationLabel(taskType)}`,
              dataReference: batch.id,
            },
            task: {
              types: [taskType],
              typeLabels: [getOperationLabel(taskType)],
              field: batch.greenhouseName,
              fieldId: batch.greenhouseId,
              crop: batch.cropName,
              batchId: batch.id,
              batchCode: batch.batchCode,
              suggestedDate: todayStr,
              latestDate: format(addDays(today, intervalDays - daysSince), 'yyyy-MM-dd'),
            },
            reason: {
              primary: `${getOperationLabel(taskType)}任务周期提醒`,
              secondary: [
                `上次${getOperationLabel(taskType)}：${lastDate || '从未'}（${daysSince >= 999 ? '从未执行' : `${daysSince}天前`}）`,
                `建议间隔：${intervalDays}天`,
              ],
              evidence: [
                { type: 'stage', label: '生长阶段', value: getStageLabel(stage) },
                { type: 'last_task', label: '上次任务', value: lastDate || '无记录' },
                { type: 'interval', label: '建议间隔', value: `${intervalDays}天` },
              ],
            },
            assignment: {
              recommendedWorkerId: workerMatch?.workerId || '',
              recommendedWorkerName: workerMatch?.workerName || '待分配',
              matchScore: workerMatch?.matchScore || 0,
              skillsMatch: workerMatch?.factors.skillMatch || [],
              alternatives: alternatives.map(alt => ({
                workerId: alt.workerId,
                workerName: alt.workerName,
                matchScore: alt.matchScore,
              })),
            },
            priority: {
              level: priority,
              score: priorityScore,
              factors: [
                { name: '任务周期', weight: 40, value: daysSince >= intervalDays * 2 ? 100 : daysSince >= intervalDays ? 60 : 30 },
                { name: '作物阶段', weight: 30, value: 70 },
                { name: '历史表现', weight: 30, value: 80 },
              ],
            },
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
        }
      });
    });

    return results;
  }, [greenhouseCropMap, hasActiveTask, getLastTaskDate, findBestMatch, findAlternativeMatches]);

  /**
   * 生成例行任务推荐
   */
  const generatePeriodicRecommendations = useCallback((): SmartRecommendation[] => {
    const results: SmartRecommendation[] = [];
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // 获取所有温室
    const todayTasks = taskHistory.filter(t => {
      const taskDate = new Date(t.planEnd).toDateString();
      return taskDate === today.toDateString();
    });

    // 如果今天没有灌溉任务，生成灌溉推荐
    const hasTodayIrrigation = todayTasks.some(t => t.type === 'irrigation');
    if (!hasTodayIrrigation) {
      // 从 useGreenhouseStore 获取温室列表
      const storeGreenhouses = useGreenhouseStore.getState().greenhouses;
      storeGreenhouses.forEach(gh => {
        if (hasActiveTask(gh.name, 'irrigation')) return;

        const workerMatch = findBestMatch({ type: 'irrigation', field: gh.name });
        if (!workerMatch) return;

        results.push({
          id: `REC-PERIODIC-${gh.id}-${todayStr}`,
          recommendId: `REC${format(new Date(), 'yyyyMMdd')}-${String(results.length + 1).padStart(3, '0')}`,
          source: {
            type: 'periodic',
            description: '每日例行灌溉检查',
            dataReference: gh.id,
          },
          task: {
            types: ['irrigation'],
            typeLabels: ['灌溉'],
            field: gh.name,
            fieldId: gh.id,
            crop: greenhouseCropMap.get(gh.id)?.cropName || '',
            suggestedDate: todayStr,
          },
          reason: {
            primary: '每日例行任务：灌溉检查',
            secondary: [
              '今天还没有灌溉任务安排',
              '保持土壤湿度适宜',
            ],
            evidence: [
              { type: 'task_type', label: '任务类型', value: '例行' },
              { type: 'frequency', label: '建议频率', value: '每日' },
            ],
          },
          assignment: {
            recommendedWorkerId: workerMatch.workerId,
            recommendedWorkerName: workerMatch.workerName,
            matchScore: workerMatch.matchScore,
            skillsMatch: workerMatch.factors.skillMatch,
            alternatives: [],
          },
          priority: {
            level: 'low',
            score: 30,
            factors: [
              { name: '例行任务', weight: 50, value: 50 },
              { name: '作物需求', weight: 50, value: 40 },
            ],
          },
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      });
    }

    return results;
  }, [greenhouseCropMap, taskHistory, hasActiveTask, findBestMatch]);

  /**
   * 生成演示用推荐数据（固定10条）
   * 实际生产中应替换为真实数据驱动逻辑
   */
  const generateDemoRecommendations = useCallback((): SmartRecommendation[] => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    return [
      // 1. 环境异常 - 温度过高
      {
        id: 'REC-DEMO-001',
        recommendId: `REC${format(today, 'yyyyMMdd')}-001`,
        source: {
          type: 'env_alert' as const,
          description: '玻璃温室C区空气温度32.1℃，超出阈值25-30℃',
          dataReference: 'S010',
        },
        task: {
          types: ['irrigation', 'ventilation'] as FarmOperationType[],
          typeLabels: ['灌溉', '通风'],
          field: '玻璃温室C区',
          fieldId: 'G003',
          crop: '辣椒',
          batchId: 'B005',
          batchCode: 'FQ2026-005',
          suggestedDate: todayStr,
          latestDate: todayStr,
        },
        reason: {
          primary: '环境参数严重异常：温度超过阈值',
          secondary: ['当前温度32.1℃', '阈值范围25-30℃', '建议进行通风和灌溉降温'],
          evidence: [
            { type: 'sensor', label: '传感器', value: 'S010' },
            { type: 'current', label: '当前值', value: '32.1℃' },
            { type: 'threshold', label: '阈值', value: '25-30℃' },
            { type: 'severity', label: '严重程度', value: '严重' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U004',
          recommendedWorkerName: '赵文静',
          matchScore: 92,
          skillsMatch: [
            { required: '微喷灌溉', workerHas: true },
            { required: '通风管理', workerHas: true },
          ],
          alternatives: [
            { workerId: 'U007', workerName: '周志强', matchScore: 88 },
            { workerId: 'U005', workerName: '刘大海', matchScore: 85 },
          ],
        },
        priority: { level: 'urgent' as const, score: 95, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 2. 病虫害预警 - 灰霉病
      {
        id: 'REC-DEMO-002',
        recommendId: `REC${format(today, 'yyyyMMdd')}-002`,
        source: {
          type: 'pest_alert' as const,
          description: '巡田发现灰霉病初期症状，需要紧急处理',
          dataReference: 'INS004',
        },
        task: {
          types: ['pest_control'] as FarmOperationType[],
          typeLabels: ['病虫害防治'],
          field: '玻璃温室B区',
          fieldId: 'G002',
          crop: '番茄',
          batchId: 'B001',
          batchCode: 'FQ2026-001',
          suggestedDate: todayStr,
          latestDate: todayStr,
        },
        reason: {
          primary: '病虫害预警：发现灰霉病初期症状',
          secondary: ['来源：巡田记录INS20260312-001', '紧急程度：紧急'],
          evidence: [
            { type: 'issue', label: '问题类型', value: '灰霉病初期症状' },
            { type: 'urgency', label: '紧急程度', value: '5级' },
            { type: 'source', label: '数据来源', value: '巡田记录' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U002',
          recommendedWorkerName: '李明辉',
          matchScore: 95,
          skillsMatch: [
            { required: '农药配制', workerHas: true },
            { required: '喷雾操作', workerHas: true },
            { required: '病害识别', workerHas: true },
          ],
          alternatives: [
            { workerId: 'U004', workerName: '赵文静', matchScore: 90 },
          ],
        },
        priority: { level: 'urgent' as const, score: 90, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 3. 阶段任务 - 番茄结果期施肥
      {
        id: 'REC-DEMO-003',
        recommendId: `REC${format(today, 'yyyyMMdd')}-003`,
        source: {
          type: 'stage_task' as const,
          description: '番茄当前处于结果期阶段，建议进行施肥管理',
          dataReference: 'B001',
        },
        task: {
          types: ['fertilization'] as FarmOperationType[],
          typeLabels: ['施肥'],
          field: '玻璃温室A区',
          fieldId: 'G001',
          crop: '番茄',
          batchId: 'B001',
          batchCode: 'FQ2026-001',
          suggestedDate: todayStr,
          latestDate: format(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        },
        reason: {
          primary: '施肥任务周期提醒',
          secondary: ['上次施肥：2026-03-10（3天前）', '建议间隔：7天'],
          evidence: [
            { type: 'stage', label: '生长阶段', value: '结果期' },
            { type: 'last_task', label: '上次任务', value: '2026-03-10' },
            { type: 'interval', label: '建议间隔', value: '7天' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U006',
          recommendedWorkerName: '陈小芳',
          matchScore: 88,
          skillsMatch: [
            { required: '基肥施用', workerHas: true },
            { required: '追肥操作', workerHas: true },
          ],
          alternatives: [
            { workerId: 'U007', workerName: '周志强', matchScore: 85 },
          ],
        },
        priority: { level: 'high' as const, score: 78, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 4. 环境异常 - 湿度过低
      {
        id: 'REC-DEMO-004',
        recommendId: `REC${format(today, 'yyyyMMdd')}-004`,
        source: {
          type: 'env_alert' as const,
          description: '玻璃温室C区空气湿度45%，低于阈值50-70%',
          dataReference: 'S026',
        },
        task: {
          types: ['irrigation'] as FarmOperationType[],
          typeLabels: ['灌溉'],
          field: '玻璃温室C区',
          fieldId: 'G003',
          crop: '辣椒',
          batchId: 'B005',
          batchCode: 'FQ2026-005',
          suggestedDate: todayStr,
        },
        reason: {
          primary: '环境参数异常：湿度过低',
          secondary: ['当前湿度45%', '阈值范围50-70%'],
          evidence: [
            { type: 'sensor', label: '传感器', value: 'S026' },
            { type: 'current', label: '当前值', value: '45%' },
            { type: 'threshold', label: '阈值', value: '50-70%' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U004',
          recommendedWorkerName: '赵文静',
          matchScore: 92,
          skillsMatch: [{ required: '微喷灌溉', workerHas: true }],
          alternatives: [],
        },
        priority: { level: 'high' as const, score: 82, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 5. 阶段任务 - 黄瓜生长期灌溉
      {
        id: 'REC-DEMO-005',
        recommendId: `REC${format(today, 'yyyyMMdd')}-005`,
        source: {
          type: 'stage_task' as const,
          description: '黄瓜当前处于生长期阶段，建议进行灌溉',
          dataReference: 'B002',
        },
        task: {
          types: ['irrigation'] as FarmOperationType[],
          typeLabels: ['灌溉'],
          field: '玻璃温室B区',
          fieldId: 'G002',
          crop: '黄瓜',
          batchId: 'B002',
          batchCode: 'FQ2026-002',
          suggestedDate: todayStr,
        },
        reason: {
          primary: '灌溉任务周期提醒',
          secondary: ['上次灌溉：2026-03-08（5天前）', '建议间隔：3天'],
          evidence: [
            { type: 'stage', label: '生长阶段', value: '生长期' },
            { type: 'last_task', label: '上次任务', value: '2026-03-08' },
            { type: 'interval', label: '建议间隔', value: '3天' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U007',
          recommendedWorkerName: '周志强',
          matchScore: 85,
          skillsMatch: [{ required: '微喷灌溉', workerHas: true }],
          alternatives: [],
        },
        priority: { level: 'medium' as const, score: 65, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 6. 病虫害预警 - 蚜虫
      {
        id: 'REC-DEMO-006',
        recommendId: `REC${format(today, 'yyyyMMdd')}-006`,
        source: {
          type: 'pest_alert' as const,
          description: '巡田发现少量蚜虫，需要关注',
          dataReference: 'INS002',
        },
        task: {
          types: ['pest_control'] as FarmOperationType[],
          typeLabels: ['病虫害防治'],
          field: '日光温室1号',
          fieldId: 'G004',
          crop: '黄瓜',
          batchId: 'B002',
          batchCode: 'FQ2026-002',
          suggestedDate: todayStr,
        },
        reason: {
          primary: '病虫害预警：发现少量蚜虫',
          secondary: ['来源：巡田记录INS20260314-001', '紧急程度：中等'],
          evidence: [
            { type: 'issue', label: '问题类型', value: '少量蚜虫' },
            { type: 'urgency', label: '紧急程度', value: '3级' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U004',
          recommendedWorkerName: '赵文静',
          matchScore: 88,
          skillsMatch: [{ required: '虫害识别', workerHas: true }],
          alternatives: [],
        },
        priority: { level: 'medium' as const, score: 58, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 7. 阶段任务 - 草莓采收期采收
      {
        id: 'REC-DEMO-007',
        recommendId: `REC${format(today, 'yyyyMMdd')}-007`,
        source: {
          type: 'stage_task' as const,
          description: '草莓当前处于采收期阶段，建议进行采收',
          dataReference: 'B003',
        },
        task: {
          types: ['harvest'] as FarmOperationType[],
          typeLabels: ['采收'],
          field: '日光温室1号',
          fieldId: 'G004',
          crop: '草莓',
          batchId: 'B003',
          batchCode: 'FQ2026-003',
          suggestedDate: todayStr,
        },
        reason: {
          primary: '采收任务周期提醒',
          secondary: ['上次采收：2026-03-11（2天前）', '建议间隔：2天'],
          evidence: [
            { type: 'stage', label: '生长阶段', value: '采收期' },
            { type: 'last_task', label: '上次任务', value: '2026-03-11' },
            { type: 'interval', label: '建议间隔', value: '2天' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U008',
          recommendedWorkerName: '吴美丽',
          matchScore: 90,
          skillsMatch: [{ required: '果蔬采收', workerHas: true }],
          alternatives: [],
        },
        priority: { level: 'high' as const, score: 75, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 8. 例行任务 - 每日灌溉检查
      {
        id: 'REC-DEMO-008',
        recommendId: `REC${format(today, 'yyyyMMdd')}-008`,
        source: {
          type: 'periodic' as const,
          description: '每日例行灌溉检查',
          dataReference: 'G005',
        },
        task: {
          types: ['irrigation'] as FarmOperationType[],
          typeLabels: ['灌溉'],
          field: '日光温室2号',
          fieldId: 'G005',
          crop: '生菜',
          batchId: 'B004',
          batchCode: 'FQ2026-004',
          suggestedDate: todayStr,
        },
        reason: {
          primary: '每日例行任务：灌溉检查',
          secondary: ['今天还没有灌溉任务安排', '保持土壤湿度适宜'],
          evidence: [
            { type: 'task_type', label: '任务类型', value: '例行' },
            { type: 'frequency', label: '建议频率', value: '每日' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U006',
          recommendedWorkerName: '陈小芳',
          matchScore: 82,
          skillsMatch: [{ required: '微喷灌溉', workerHas: true }],
          alternatives: [],
        },
        priority: { level: 'low' as const, score: 30, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 9. 阶段任务 - 生菜采收期采收
      {
        id: 'REC-DEMO-009',
        recommendId: `REC${format(today, 'yyyyMMdd')}-009`,
        source: {
          type: 'stage_task' as const,
          description: '生菜当前处于采收期阶段，建议进行采收',
          dataReference: 'B004',
        },
        task: {
          types: ['harvest'] as FarmOperationType[],
          typeLabels: ['采收'],
          field: '日光温室2号',
          fieldId: 'G005',
          crop: '生菜',
          batchId: 'B004',
          batchCode: 'FQ2026-004',
          suggestedDate: todayStr,
        },
        reason: {
          primary: '采收任务周期提醒',
          secondary: ['上次采收：2026-03-12（1天前）', '建议间隔：3天'],
          evidence: [
            { type: 'stage', label: '生长阶段', value: '采收期' },
            { type: 'last_task', label: '上次任务', value: '2026-03-12' },
            { type: 'interval', label: '建议间隔', value: '3天' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U008',
          recommendedWorkerName: '吴美丽',
          matchScore: 88,
          skillsMatch: [{ required: '果蔬采收', workerHas: true }],
          alternatives: [],
        },
        priority: { level: 'medium' as const, score: 60, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      // 10. 环境异常 - 光照过强
      {
        id: 'REC-DEMO-010',
        recommendId: `REC${format(today, 'yyyyMMdd')}-010`,
        source: {
          type: 'env_alert' as const,
          description: '玻璃温室C区光照强度1500lux，超出阈值500-1000lux',
          dataReference: 'S028',
        },
        task: {
          types: ['other'] as FarmOperationType[],
          typeLabels: ['遮阳'],
          field: '玻璃温室C区',
          fieldId: 'G003',
          crop: '辣椒',
          batchId: 'B005',
          batchCode: 'FQ2026-005',
          suggestedDate: todayStr,
        },
        reason: {
          primary: '环境参数异常：光照过强',
          secondary: ['当前光照1500lux', '阈值范围500-1000lux'],
          evidence: [
            { type: 'sensor', label: '传感器', value: 'S028' },
            { type: 'current', label: '当前值', value: '1500lux' },
            { type: 'threshold', label: '阈值', value: '500-1000lux' },
          ],
        },
        assignment: {
          recommendedWorkerId: 'U005',
          recommendedWorkerName: '刘大海',
          matchScore: 80,
          skillsMatch: [{ required: '遮阳管理', workerHas: true }],
          alternatives: [],
        },
        priority: { level: 'medium' as const, score: 55, factors: [] },
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
    ];
  }, []);

  /**
   * 生成所有推荐
   */
  const generateAllRecommendations = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用演示数据（固定10条）
      const demoRecs = generateDemoRecommendations();

      // 按优先级排序
      const priorityOrder: Record<RecommendationPriority, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      demoRecs.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority.level] - priorityOrder[b.priority.level];
        if (priorityDiff !== 0) return priorityDiff;
        return b.priority.score - a.priority.score;
      });

      setRecommendations(demoRecs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成推荐失败');
    } finally {
      setIsLoading(false);
    }
  }, [generateDemoRecommendations]);

  /**
   * 接受推荐
   */
  const acceptRecommendation = useCallback((id: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === id ? { ...rec, status: 'accepted' as const } : rec
      )
    );
  }, []);

  /**
   * 拒绝推荐
   */
  const rejectRecommendation = useCallback((id: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === id ? { ...rec, status: 'rejected' as const } : rec
      )
    );
  }, []);

  /**
   * 批量接受推荐
   */
  const acceptAll = useCallback((ids: string[]) => {
    setRecommendations(prev =>
      prev.map(rec =>
        ids.includes(rec.id) ? { ...rec, status: 'accepted' as const } : rec
      )
    );
  }, []);

  /**
   * 刷新数据并重新生成推荐
   */
  const refresh = useCallback(() => {
    refreshEnvAlerts();
    refreshPestAlerts();
    generateAllRecommendations();
  }, [refreshEnvAlerts, refreshPestAlerts, generateAllRecommendations]);

  // 初始化时生成推荐
  useEffect(() => {
    generateAllRecommendations();
  }, [generateAllRecommendations]);

  // 过滤后的推荐
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      // 按来源类型过滤
      if (filters.sourceTypes?.length && !filters.sourceTypes.includes(rec.source.type)) {
        return false;
      }
      // 按优先级过滤
      if (filters.priorityLevels?.length && !filters.priorityLevels.includes(rec.priority.level)) {
        return false;
      }
      // 按温室过滤
      if (filters.fieldIds?.length && !filters.fieldIds.includes(rec.task.fieldId)) {
        return false;
      }
      // 按作物类型过滤
      if (filters.cropTypes?.length && !filters.cropTypes.includes(rec.task.crop)) {
        return false;
      }
      // 仅显示紧急
      if (filters.onlyUrgent && rec.priority.level !== 'urgent') {
        return false;
      }
      return true;
    });
  }, [recommendations, filters]);

  // 统计数据
  const stats = useMemo(() => {
    const pending = recommendations.filter(r => r.status === 'pending');
    return {
      total: pending.length,
      urgent: pending.filter(r => r.priority.level === 'urgent').length,
      high: pending.filter(r => r.priority.level === 'high').length,
      medium: pending.filter(r => r.priority.level === 'medium').length,
      low: pending.filter(r => r.priority.level === 'low').length,
    };
  }, [recommendations]);

  return {
    // 数据
    recommendations: filteredRecommendations,
    envAlerts,
    pestAlerts,

    // 状态
    isLoading,
    error,

    // 筛选
    filters,
    setFilters,

    // 操作
    refresh,
    acceptRecommendation,
    rejectRecommendation,
    acceptAll,
    generateAllRecommendations,

    // 统计
    stats,
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取操作类型标签
 */
function getOperationLabel(type: FarmOperationType | string): string {
  const labels: Record<string, string> = {
    irrigation: '灌溉',
    fertilization: '施肥',
    pest_control: '病虫害防治',
    pruning: '修剪',
    harvest: '采收',
    weeding: '中耕除草',
    planting: '定植',
    ventilation: '通风',
    shading: '遮阳',
    drainage: '排水',
    soil_amendment: '土壤改良',
    supplemental_lighting: '补光',
    co2_enrichment: 'CO2补充',
    other: '其他',
  };
  return labels[type] || type;
}

/**
 * 获取生长阶段标签
 */
function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    seedling: '苗期',
    vegetative: '营养生长期',
    flowering: '开花期',
    fruiting: '结果期',
    harvest: '采收期',
  };
  return labels[stage] || stage;
}

export default useSmartRecommendation;
