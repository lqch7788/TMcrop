/**
 * AI Panel 统一组件（V2 — 中文友好展示）
 * 2026-08-22：智能任务中心 15 个 AI 模块的统一入口
 *
 * V2 改进：每个模块结果用中文卡片展示（替代 V1 原始 JSON）
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Clock, Truck, Bug, TrendingUp, MapPin, Image as ImageIcon,
  MessageCircle, FileText, ShieldAlert, Calendar, Bot, X, Loader2,
  CheckSquare,
} from 'lucide-react';
import { aiApi } from '../../../services/aiApi';
import { useGreenhouseStore } from '../../../stores/useGreenhouseStore';

interface AIPanelProps {
  cropType?: string;
  taskId?: string;
  taskType?: string;
  compact?: boolean;
  // 2026-08-24 PR1 新增：上下文注入字段（用于真实数据接入，向后兼容）
  greenhouseId?: string;                                       // 优先级：task.greenhouseId > batch.greenhouse_id > store
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  requiredSkills?: string[];                                   // 任务技能要求（AI-01 用）
  estimatedHours?: number;                                     // 任务预计工时
  batchId?: string;                                            // 当前批次 ID（AI-04/10 用）
  batchCode?: string;
  plantDate?: string;                                          // 批次种植日期（AI-04 用，移除硬编码 '2026-05-01'）
  expectedHarvestDate?: string;
  variety?: string;
  workerId?: string;                                           // 当前工人 ID（AI-08 路径优化起点）
  workerLat?: number;
  workerLng?: number;
  employeeId?: string;                                         // 当前用户员工 ID（AI-03 审批辅助）
  approvalType?: 'leave' | 'material' | 'contract' | 'farm_task';
  approvalAmount?: number;
  approvalDurationDays?: number;
  context?: string;                                            // 当前页面路径（AI-12 问答上下文）
  lookbackDays?: number;                                       // 历史窗口（AI-07/14/15 用）
  teamIds?: string[];                                          // 班组过滤（AI-01 用，从 SmartDispatch 顶部 TeamChipMultiSelect 透传）
  anomalyCheckDimension?: 'task_duration' | 'yield' | 'inventory_change' | 'attendance' | 'all';  // AI-14 检查维度
  thresholdSigma?: number;                                     // AI-14 Z-score 阈值（默认 2.0）
  reportType?: 'daily' | 'weekly' | 'monthly' | 'custom';    // AI-13 报告类型
  reportStartDate?: string;                                    // AI-13 报告起始日期
  reportEndDate?: string;                                      // AI-13 报告结束日期
  teamId?: string;                                             // AI-15 出勤异常班组过滤（PR5）
  // 自动化触发（PR1 基础设施）
  autoTrigger?: boolean;                                       // 默认 false；true 时关键 props 变化自动调用
  autoTriggerKeys?: Array<
    'workhour' | 'dispatch' | 'pest' | 'growth' | 'growthState' | 'attendance' | 'approval' | 'resource'
  >;
}

// 模块定义（含调用函数 + 中文渲染）
const AI_MODULES = [
  {
    key: 'workhour', name: 'AI-06 工时预测', icon: Clock, color: 'blue',
    // 2026-08-24 PR2：移除硬编码 task_type='灌溉' / priority='normal'，全部读 buildCallParams() 透传值
    // → task_id 关键：传了走 ML 模型真实特征，不传后端才 fallback 到"同类型平均"
    call: (p: any) => {
      if (!p.taskType && !p.taskId) {
        throw new Error('AI-06 工时预测需要任务类型或任务 ID（taskType / taskId 至少一个）');
      }
      return aiApi.workhour.predict({
        task_type: p.taskType,
        priority: p.priority,
        greenhouse_id: p.greenhouseId,
        assignee_id: p.workerId,
        task_id: p.taskId,
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-blue-600">{d.predictedHours}h</span>
          <span className="text-sm text-gray-500">预计工时</span>
        </div>
        <p className="text-xs text-gray-500">
          置信区间：{d.confidenceLow}h - {d.confidenceHigh}h
          {d.fallbackUsed && <span className="ml-2 text-amber-600">（降级模式）</span>}
        </p>
        <p className="text-xs text-gray-400">基于 {d.sampleCount} 条历史样本 · 模型 {d.modelVersion}</p>
        <div className="bg-blue-50 rounded p-2">
          <p className="text-xs font-medium text-blue-700 mb-1">🔍 推理依据：</p>
          {d.xaiReasons?.map((r: string, i: number) => (
            <p key={i} className="text-xs text-blue-600">• {r}</p>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'dispatch', name: 'AI-01 派工推荐', icon: Sparkles, color: 'emerald',
    // 2026-08-24 PR2：移除硬编码 task_type='灌溉' / priority='normal'，全部读 buildCallParams() 透传值
    call: (p: any) => {
      if (!p.taskType) {
        throw new Error('AI-01 派工推荐需要选定任务（taskType 必填），请先在左侧任务池选择任务');
      }
      if (!p.greenhouseId) {
        throw new Error('AI-01 派工推荐需要任务所属温室（greenhouseId 必填），当前任务未关联温室');
      }
      return aiApi.dispatch.recommend({
        task_type: p.taskType,
        required_skills: p.requiredSkills,
        greenhouse_id: p.greenhouseId,
        priority: p.priority || 'normal',
        batch_id: p.batchId,
        estimated_hours: p.estimatedHours,
        team_ids: p.teamIds,
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">候选员工：{d.totalCandidates} 人</p>
        {d.recommendations?.slice(0, 3).map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-emerald-50 rounded p-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{i + 1}. {r.workerName}</p>
              <p className="text-[10px] text-gray-500">{r.xaiReasons?.[0] || ''}</p>
            </div>
            <span className="text-lg font-bold text-emerald-600">{r.matchScore}分</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'growth', name: 'AI-04 生长预测', icon: TrendingUp, color: 'green',
    // 2026-08-24 PR3：移除 plant_date='2026-05-01' 硬编码，全部读 buildCallParams() 透传值
    // → crop_type / greenhouse_id / plant_date 全部由前端透传，缺 greenhouse_id 后端会抛错（Fail Loud）
    call: (p: any) => {
      if (!p.cropType) {
        throw new Error('AI-04 生长预测需要作物类型（cropType 必填），请先选中任务或批次');
      }
      if (!p.greenhouseId) {
        throw new Error('AI-04 生长预测需要任务所属温室（greenhouseId 必填），当前任务未关联温室');
      }
      return aiApi.growth.predict({
        crop_type: p.cropType,
        batch_id: p.batchId,
        greenhouse_id: p.greenhouseId,
        plant_date: p.plantDate,             // 从 plantings.planting_date 透传
        expected_harvest_date: p.expectedHarvestDate,
        variety: p.variety,
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-sm font-medium">{d.currentStage}</span>
          <span className="text-xs text-gray-500">当前阶段</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-800">{d.daysToHarvest}天</p>
            <p className="text-[10px] text-gray-500">距采收</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-800">{d.yieldPredictionKg}kg</p>
            <p className="text-[10px] text-gray-500">预估产量</p>
          </div>
        </div>
        {d.alerts?.length > 0 && (
          <div className="bg-amber-50 rounded p-2">
            {d.alerts.map((a: string, i: number) => <p key={i} className="text-xs text-amber-700">⚠️ {a}</p>)}
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'pest', name: 'AI-05 病虫害预警', icon: Bug, color: 'red',
    // 2026-08-24 PR3：greenhouseId 优先级 props.greenhouseId > store.active > store[0]；缺时抛错
    // → 后端 pestAlert 已支持从 greenhouses.crop / plantings 当前批次反查作物类型（不再硬编码 '番茄'）
    call: (p: any) => {
      let greenhouseId = p.greenhouseId;
      if (!greenhouseId) {
        const store = useGreenhouseStore.getState();
        const active = store.greenhouses.find(g => g.status === 'active');
        greenhouseId = active?.id || store.greenhouses[0]?.id;
      }
      if (!greenhouseId) {
        throw new Error(
          'AI-05 病虫害预警需要指定温室（greenhouseId 必填）。\n' +
          '当前 props / useGreenhouseStore 都未找到温室，请先选中任务或激活温室。',
        );
      }
      return aiApi.pest.alert({
        crop_type: p.cropType,   // 不再 || '番茄'：后端 fallback 到 greenhouse/plantings 反查
        greenhouse_id: greenhouseId,
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-sm font-medium ${
            d.overallRisk === 'critical' ? 'bg-red-100 text-red-700' :
            d.overallRisk === 'high' ? 'bg-amber-100 text-amber-700' :
            d.overallRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}>
            {d.overallRisk === 'critical' ? '🔴 严重' : d.overallRisk === 'high' ? '🟠 高风险' : d.overallRisk === 'medium' ? '🟡 中等' : '🟢 低风险'}
          </span>
          <span className="text-xs text-gray-500">评分 {d.overallRiskScore}/100</span>
        </div>
        <p className="text-[10px] text-gray-400">环境：{d.envSnapshot?.temperature}℃ / 湿度 {d.envSnapshot?.humidity}%</p>
        {d.alerts?.map((a: any, i: number) => (
          <div key={i} className="bg-red-50 rounded p-2">
            <p className="text-xs font-medium text-red-700">{a.pestName}（提前 {a.alertDaysAhead} 天）</p>
            <p className="text-[10px] text-red-500">{a.recommendedActions?.join('；')}</p>
          </div>
        ))}
        {!d.alerts?.length && <p className="text-xs text-green-600">✅ 当前无病虫害风险</p>}
      </div>
    ),
  },
  {
    key: 'route', name: 'AI-08 路径优化', icon: MapPin, color: 'orange',
    // 2026-08-24 PR4：调 /api/dispatch/worker-tasks-and-location 获取真实工人位置+今日任务
    // → 移除硬编码 lat 30.27/120.15 + 假任务 T1/T2/T3
    call: async (p: any) => {
      if (!p.workerId) {
        throw new Error('AI-08 路径优化需要指定工人（workerId 必填），请先在中间列选中推荐员工');
      }
      // 调后端新端点取工人位置 + 今日任务
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enhancedApiClient } = require('../lib/apiClient');
      const date = new Date().toISOString().split('T')[0];
      const resp = await enhancedApiClient.post('/dispatch/worker-tasks-and-location', {
        worker_id: p.workerId,
        date,
      });
      const data = (resp as any)?.data ?? resp;
      const worker = data?.worker;
      const tasks = data?.tasks || [];
      if (!worker || (worker.lat === 0 && worker.lng === 0)) {
        throw new Error(`工人 ${p.workerId} 无可用坐标，无法启动路径优化`);
      }
      if (tasks.length === 0) {
        throw new Error(`工人 ${worker.name} 今日无可执行任务，无需优化路径`);
      }
      return aiApi.route.optimize({
        worker_start: { lat: worker.lat, lng: worker.lng },
        tasks: tasks.map((t: any) => ({
          task_id: t.id,
          lat: t.lat,
          lng: t.lng,
          name: t.name,
        })),
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-orange-600">{d.savingsPercent}%</span>
          <span className="text-sm text-gray-500">距离节省</span>
        </div>
        <p className="text-xs text-gray-500">
          {d.originalDistanceKm}km → {d.totalDistanceKm}km（优化后）
        </p>
        <div className="bg-orange-50 rounded p-2">
          <p className="text-xs font-medium text-orange-700 mb-1">最优执行顺序：</p>
          {d.optimizedSteps?.map((s: any, i: number) => (
            <p key={i} className="text-xs text-orange-600">
              {i + 1}. {s.name || s.taskId}（距上站 {s.distanceFromPrevKm}km）
            </p>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'image', name: 'AI-09 图像识别', icon: ImageIcon, color: 'purple',
    // 2026-08-24 PR6：点击按钮触发文件选择 → 上传 → 识别（详见 handleImageUpload）
    // → 此处的 call 仅作为 fallback（手动传入 image_id 时使用）；UI 走特殊流程
    call: (p: any) => {
      if (!p.imageId) {
        throw new Error(
          'AI-09 图像识别需要图片：请点击"AI-09 图像识别"按钮选择本地图片上传（base64）',
        );
      }
      return aiApi.image.identify({ image_id: p.imageId });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">识别耗时：{d.inferenceTimeMs}ms</p>
        {d.topPredictions?.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-purple-50 rounded p-2">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Top{i + 1}. {p.pestName}
                <span className={`ml-1 text-[10px] ${p.pestType === 'disease' ? 'text-red-500' : 'text-amber-600'}`}>
                  {p.pestType === 'disease' ? '病害' : '虫害'}
                </span>
              </p>
              <p className="text-[10px] text-gray-500">{p.recommendedTreatment?.join('；')}</p>
            </div>
            <span className="text-lg font-bold text-purple-600">{(p.confidence * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'qa', name: 'AI-12 问答助手', icon: MessageCircle, color: 'cyan',
    // 2026-08-24 PR5：改为交互式（用户输入 question），移除硬编码模板问题
    // → p.question 来自 UI 输入框（结果区域下方的"再问一个问题"输入框）
    // → 缺 question 抛错（不允许模板化假问题）
    call: (p: any) => {
      const q = (p.question || '').trim();
      if (!q) {
        throw new Error('AI-12 问答助手需要用户输入问题（question 必填），请在下方输入框填写');
      }
      return aiApi.qa.ask({
        question: q,
        context: p.context || '智能派工',
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="bg-cyan-50 rounded p-3">
          <p className="text-xs text-gray-600 whitespace-pre-wrap">{d.answer}</p>
        </div>
        <p className="text-[10px] text-gray-400">
          意图：{d.intent === 'operation' ? '操作指导' : d.intent === 'data_query' ? '数据查询' : d.intent === 'terminology' ? '术语解释' : d.intent === 'troubleshooting' ? '故障排查' : '其他'}
          · 置信度 {(d.confidence * 100).toFixed(0)}%
          {!d.llmConfigured && <span className="ml-1 text-amber-600">（LLM 未配置，本地知识库检索）</span>}
        </p>
        {d.references?.length > 0 && (
          <p className="text-[10px] text-gray-400">📚 引用 {d.references.length} 条知识库记录</p>
        )}
      </div>
    ),
  },
  {
    key: 'report', name: 'AI-13 报告生成', icon: FileText, color: 'indigo',
    // 2026-08-24 PR5：透传 reportType/startDate/endDate/cropType/greenhouseId；移除硬编码 weekly
    call: (p: any) => aiApi.report.generate({
      report_type: p.reportType || 'weekly',
      ...(p.reportStartDate ? { start_date: p.reportStartDate } : {}),
      ...(p.reportEndDate ? { end_date: p.reportEndDate } : {}),
      crop_type: p.cropType,
      greenhouse_id: p.greenhouseId,
    }),
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">📄 {d.summary}</p>
        {d.sections?.map((s: any, i: number) => (
          <div key={i} className="bg-indigo-50 rounded p-2">
            <p className="text-xs font-medium text-indigo-700">{s.title}</p>
            <p className="text-[10px] text-indigo-600 mt-0.5">{s.content}</p>
          </div>
        ))}
        {d.recommendations?.map((r: string, i: number) => (
          <p key={i} className="text-[10px] text-indigo-500">💡 {r}</p>
        ))}
      </div>
    ),
  },
  {
    key: 'schedule', name: 'AI-02 智能排班', icon: Calendar, color: 'pink',
    // 2026-08-24 PR4：从 useWorkerStore + useDispatchStore 取真实员工+任务，移除硬编码
    call: (p: any) => {
      // 从 store 取真实数据（延迟导入避免循环依赖）
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useWorkerStore } = require('../stores/useWorkerStore');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useDispatchStore } = require('../stores/useDispatchStore');
      const workers = useWorkerStore.getState().workers;
      const dispatchState = useDispatchStore.getState() as any;
      const pendingTasks = dispatchState.unassignedTasks
        || dispatchState.pendingTasks
        || dispatchState.tasks
        || [];

      // 2026-08-24 PR4：Fail Loud —— 空池子直接抛错（不静默用 mock 任务）
      if (!workers || workers.length === 0) {
        throw new Error(
          'AI-02 智能排班需要员工池：请先在员工管理中维护员工数据，' +
          '或检查 useWorkerStore 是否已加载（loadWorkers 未调用）',
        );
      }

      return aiApi.schedule.generate({
        start_date: new Date().toISOString().split('T')[0],
        days: 7,                                            // 一周排班
        employees: workers.map((w: any) => ({
          employee_id: w.id,
          name: w.name,
          skills: w.skills || [],
          current_load: w.currentLoad ?? 0,
          max_consecutive_days: 6,
          preferred_off_days: w.preferredOffDays || [0],
        })),
        // tasks 可为空（生成空排班表），不抛错
        tasks: pendingTasks.map((t: any) => ({
          task_id: t.id,
          task_type: t.taskType || t.type || '其他',
          estimated_hours: t.estimatedHours || 4,
          priority: t.priority || 'normal',
          required_skills: t.requiredSkills,
        })),
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 bg-pink-50 rounded p-2 text-center">
            <p className="text-lg font-bold text-pink-600">{(d.complianceRate * 100).toFixed(0)}%</p>
            <p className="text-[10px] text-gray-500">合规率</p>
          </div>
          <div className="flex-1 bg-pink-50 rounded p-2 text-center">
            <p className="text-lg font-bold text-pink-600">{d.workloadCv}</p>
            <p className="text-[10px] text-gray-500">均衡度 CV</p>
          </div>
        </div>
        {d.dailySchedule?.slice(0, 3).map((day: any, i: number) => (
          <div key={i} className="bg-pink-50 rounded p-2">
            <p className="text-xs font-medium text-pink-700">{day.date}（{day.assignments.length} 个任务 / {day.totalHours}h）</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'anomaly', name: 'AI-14 异常检测', icon: ShieldAlert, color: 'amber',
    // 2026-08-24 PR4：透传 checkDimension / lookbackDays / thresholdSigma
    // → 移除空参默认；后端已支持 task_duration / yield / inventory_change / attendance / all
    call: (p: any) => aiApi.anomaly.detect({
      check_dimension: p.anomalyCheckDimension || p.checkDimension || 'all',
      lookback_days: p.lookbackDays || 30,
      threshold_sigma: p.thresholdSigma || 2.0,
    }),
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">检测项：{d.totalChecks} · 异常 {d.anomalies.length} 个</p>
        {d.anomalies?.slice(0, 3).map((a: any, i: number) => (
          <div key={i} className="bg-amber-50 rounded p-2">
            <p className="text-xs font-medium text-amber-700">
              {a.anomalyType === 'duration_too_long' ? '⏱ 耗时过长' : a.anomalyType === 'duration_too_short' ? '⏱ 耗时过短' : a.anomalyType === 'yield_drop' ? '📉 产量下降' : a.anomalyType === 'yield_spike' ? '📈 产量突增' : a.anomalyType}
              <span className={`ml-1 ${a.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                {a.severity === 'critical' ? '严重' : '警告'}
              </span>
            </p>
            <p className="text-[10px] text-amber-600">{a.description}</p>
          </div>
        ))}
        {!d.anomalies?.length && <p className="text-xs text-green-600">✅ 未检测到异常</p>}
      </div>
    ),
  },
];

const EXTRA_MODULES = [
  {
    key: 'growthState', name: 'AI-10 生长状态', icon: Bot, color: 'teal',
    // 2026-08-24 PR3：移除 current_gdd=900 默认值；后端从 iot_sensor_readings 累积真实 GDD
    // → 仅透传 cropType/batchId/greenhouseId，无数据时后端明确抛错（Fail Loud）
    call: (p: any) => {
      if (!p.cropType) {
        throw new Error('AI-10 生长状态识别需要作物类型（cropType 必填），请先选中任务或批次');
      }
      return aiApi.growthState.identify({
        crop_type: p.cropType,
        batch_id: p.batchId,
        greenhouse_id: p.greenhouseId,
        // current_gdd 不再前端传：后端从 iot_sensor_readings 真实计算
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-sm font-medium">{d.growthStage}</span>
          <span className="text-xs text-gray-500">
            {d.healthStatus === 'excellent' ? '🟢 优秀' : d.healthStatus === 'good' ? '🟢 良好' : d.healthStatus === 'fair' ? '🟡 一般' : d.healthStatus === 'poor' ? '🟠 较差' : '🔴 危急'}
          </span>
        </div>
        <p className="text-xs text-gray-500">生长指数：{d.growthRateIndex}/100 · 产量指数：{d.estimatedYieldIndex}/100</p>
        {d.deficiencies?.map((df: any, i: number) => (
          <div key={i} className="bg-amber-50 rounded p-2">
            <p className="text-xs font-medium text-amber-700">缺素：{df.nutrientName}（{df.remedy}）</p>
          </div>
        ))}
        {!d.deficiencies?.length && <p className="text-xs text-green-600">✅ 无缺素症状</p>}
      </div>
    ),
  },
  {
    key: 'voice', name: 'AI-11 语音录入', icon: MessageCircle, color: 'sky',
    // 2026-08-24 PR6：移除硬编码 transcribed_text；复用 AI-12 交互模式（结果区下方输入框）
    // → 文本路径走真实 NLP 规则；音频路径需 whisper.onnx 模型部署（暂未启用）
    call: (p: any) => {
      const text = (p.voiceText || '').trim();
      if (!text) {
        throw new Error('AI-11 语音录入需要文本内容（voiceText 必填），请在下方输入框填写');
      }
      return aiApi.voice.transcribe({
        transcribed_text: text,
        context: p.context,
        submitter_id: p.employeeId,
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">🎙 转写文本：{d.rawText}</p>
        <p className="text-[10px] text-gray-400">
          来源：{d.modelType === 'whisper-asr' ? 'Whisper ASR 音频转写' : '文本解析（ASR 模型未部署，audio_url 不可用）'}
        </p>
        <div className="bg-sky-50 rounded p-2">
          <p className="text-sm font-medium text-gray-800">📋 {d.structuredOutput?.title}</p>
          <p className="text-[10px] text-sky-600">动作：{d.structuredOutput?.action}</p>
          <p className="text-[10px] text-sky-600">
            优先级：{d.structuredOutput?.priority === 'urgent' ? '紧急' : d.structuredOutput?.priority === 'high' ? '高' : d.structuredOutput?.priority === 'normal' ? '普通' : '低'}
            · 转写准确率 {(d.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'attendance', name: 'AI-15 出勤异常', icon: Calendar, color: 'rose',
    // 2026-08-24 PR5：透传 lookbackDays + teamId；后端 attendance.ts 支持按班组过滤
    call: (p: any) => aiApi.attendance.detect({
      lookback_days: p.lookbackDays || 30,
      z_threshold: 2.0,
      ...(p.teamId ? { team_id: p.teamId } : {}),
    }),
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">扫描员工：{d.totalEmployees} 人</p>
        {d.anomalies?.slice(0, 3).map((a: any, i: number) => (
          <div key={i} className="bg-rose-50 rounded p-2">
            <p className="text-xs font-medium text-rose-700">
              {a.employeeName}：{a.anomalyType === 'consecutive_absence' ? `连续缺勤 ${a.metrics?.consecutiveAbsenceDays} 天` :
                a.anomalyType === 'frequent_lateness' ? `迟到 ${a.metrics?.lateCount} 次` :
                a.anomalyType === 'leave_abuse' ? `请假 ${a.metrics?.leaveCount} 次` : `缺勤率 ${a.metrics?.absenceRatePercent}%`}
            </p>
            <p className="text-[10px] text-rose-500">{a.recommendedAction}</p>
          </div>
        ))}
        {!d.anomalies?.length && <p className="text-xs text-green-600">✅ 无出勤异常</p>}
      </div>
    ),
  },
  {
    key: 'approval', name: 'AI-03 审批辅助', icon: CheckSquareIcon, color: 'violet',
    // 2026-08-24 PR5：移除硬编码 applicant_id='E001' / approval_type='leave' / duration_days=5
    // → 全部读 buildCallParams() 透传值；缺 employeeId 抛错（审批详情页调用）
    call: (p: any) => {
      if (!p.employeeId) {
        throw new Error('AI-03 审批辅助需要申请人 ID（employeeId 必填），请在审批详情页调用');
      }
      if (!p.approvalType) {
        throw new Error('AI-03 审批辅助需要审批类型（approvalType 必填），如 leave/material/contract/farm_task');
      }
      return aiApi.approval.suggest({
        applicant_id: p.employeeId,
        applicant_role: (p as any).applicantRole,
        approval_type: p.approvalType,
        amount: p.approvalAmount,
        duration_days: p.approvalDurationDays,
        reason: (p as any).reason,
      });
    },
    render: (d: any) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-sm font-medium ${
            d.decision === 'approve' ? 'bg-green-100 text-green-700' :
            d.decision === 'reject' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {d.decision === 'approve' ? '✅ 建议通过' : d.decision === 'reject' ? '❌ 建议拒绝' : '🤔 建议人工复核'}
          </span>
          <span className="text-xs text-gray-500">风险：{d.riskLevel === 'high' ? '高' : d.riskLevel === 'medium' ? '中' : '低'}</span>
        </div>
        {d.reasoning?.map((r: string, i: number) => (
          <p key={i} className="text-xs text-gray-600">• {r}</p>
        ))}
        {d.suggestedConditions?.map((c: string, i: number) => (
          <p key={i} className="text-[10px] text-violet-600">📌 {c}</p>
        ))}
      </div>
    ),
  },
  {
    key: 'resource', name: 'AI-07 资源优化', icon: Truck, color: 'lime',
    // 2026-08-24 PR4：透传 lookbackDays / forecastDays / cropType / warehouseId，移除空参
    call: (p: any) => aiApi.resource.optimize({
      lookback_days: p.lookbackDays || 30,
      forecast_days: 14,
      // 可选过滤：material_name 模糊匹配 inventory_stock.crop_name
      ...(p.cropType ? { material_name: p.cropType } : {}),
      ...(p.warehouseId ? { warehouse_id: p.warehouseId } : {}),
    }),
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">扫描物料：{d.totalMaterials} 种 · 预警 {d.alerts?.length} 种</p>
        {d.alerts?.slice(0, 3).map((a: any, i: number) => (
          <div key={i} className="bg-lime-50 rounded p-2">
            <p className="text-xs font-medium text-lime-700">
              {a.materialName}：{a.alertLevel === 'out' ? '已用完' : a.alertLevel === 'critical' ? '告急' : '库存偏低'}
              （剩 {a.daysRemaining === -1 ? '无消耗记录' : `${a.daysRemaining} 天`}）
            </p>
            <p className="text-[10px] text-lime-600">建议采购 {a.recommendedPurchase}{a.unit} · 约 {a.estimatedCost} 元</p>
          </div>
        ))}
        {!d.alerts?.length && <p className="text-xs text-green-600">✅ 库存充足，无需采购</p>}
      </div>
    ),
  },
];

function CheckSquareIcon(props: any) {
  // 2026-08-24 PR-D：修复 icon 复用 bug（之前实现是返回 <Calendar />，导致 AI-03 显示错误）
  // → 改用 lucide-react 的 CheckSquare 真实图标（ESM 静态 import，避免浏览器 require 报错）
  return <CheckSquare {...props} />;
}

// 模块彩色图标配色（与模块定义 color 字段对应，Tailwind 完整类名不可动态拼接）
const MODULE_COLORS: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  green:   { bg: 'bg-green-100',   text: 'text-green-600' },
  red:     { bg: 'bg-red-100',     text: 'text-red-600' },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-600' },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-600' },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-600' },
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-600' },
  pink:    { bg: 'bg-pink-100',    text: 'text-pink-600' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-600' },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-600' },
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-600' },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-600' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-600' },
  lime:    { bg: 'bg-lime-100',    text: 'text-lime-600' },
};

export function AIPanel(props: AIPanelProps) {
  const {
    cropType = '番茄',
    taskId,
    taskType,
    compact = false,
    // 2026-08-24 PR1：上下文注入字段（向后兼容，默认值保持旧行为）
    greenhouseId,
    priority,
    requiredSkills,
    estimatedHours,
    batchId,
    batchCode,
    plantDate,
    expectedHarvestDate,
    variety,
    workerId,
    workerLat,
    workerLng,
    employeeId,
    approvalType,
    approvalAmount,
    approvalDurationDays,
    context,
    lookbackDays,
    teamIds,
    anomalyCheckDimension,
    thresholdSigma,
    reportType,
    reportStartDate,
    reportEndDate,
    teamId,
    autoTrigger = false,
    autoTriggerKeys,
  } = props;

  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; data: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 2026-08-24 PR5：AI-12 问答助手交互式输入（用户提问文本）
  const [qaQuestion, setQaQuestion] = useState<string>('');
  // 2026-08-24 PR6：AI-11 语音录入交互式输入（用户文本）
  const [voiceText, setVoiceText] = useState<string>('');
  // 2026-08-24 PR6：AI-09 图像识别——文件输入 ref（点击 AI-09 按钮触发文件选择对话框）
  const imageInputRef = useRef<HTMLInputElement>(null);
  // 2026-08-24 PR-C：AI 模型部署状态（顶部横幅）
  const [aiConfigStatus, setAiConfigStatus] = useState<{
    deployed: number;
    total: number;
    percent: number;
    modules: { code: string; name: string; deployed: boolean; setupGuide?: string }[];
  } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState<string | null>(null);

  // 按 AI-序号 排列（AI-01 ~ AI-15），与定义顺序解耦
  const allModules = [...AI_MODULES, ...EXTRA_MODULES].sort((a, b) => {
    const na = Number(a.name.match(/AI-(\d+)/)?.[1] || 0);
    const nb = Number(b.name.match(/AI-(\d+)/)?.[1] || 0);
    return na - nb;
  });

  // 2026-08-24 PR1：构造模块调用参数对象（统一传递所有上下文）
  // → 模块内部 call 函数读取需要的字段，不再各自 || '灌溉' 兜底
  const buildCallParams = () => ({
    cropType,
    taskId,
    taskType,
    greenhouseId,
    priority,
    requiredSkills,
    estimatedHours,
    batchId,
    batchCode,
    plantDate,
    expectedHarvestDate,
    variety,
    workerId,
    workerLat,
    workerLng,
    employeeId,
    approvalType,
    approvalAmount,
    approvalDurationDays,
    context,
    lookbackDays,
    teamIds,
    anomalyCheckDimension,
    thresholdSigma,
    reportType,
    reportStartDate,
    reportEndDate,
    teamId,
    question: qaQuestion,                                     // PR5：AI-12 问答用户输入
    voiceText,                                                // PR6：AI-11 语音录入文本
  });

  const callAI = async (key: string, isAuto = false) => {
    setLoadingKey(key);
    if (!isAuto) {
      // 手动点击：清空旧结果 + 清除错误
      setError(null);
      setResult(null);
    }
    try {
      const mod = allModules.find(m => m.key === key);
      if (!mod) return;
      const res = await mod.call(buildCallParams());
      // 2026-08-22 修复：enhancedApiClient 已自动解包 data（apiClient.ts:243）
      // → res 可能直接是 data 对象（无 .data 层），兼容两种情况
      const payload = (res as any)?.data ?? res;
      if (isAuto) {
        // 2026-08-24 PR1：自动触发不覆盖用户手动点击的结果（用户的主动选择优先）
        setResult((prev) => (prev ? prev : { key, data: payload }));
      } else {
        setResult({ key, data: payload });
      }
    } catch (e: any) {
      if (isAuto) {
        // 自动触发失败：仅 console.warn，不打扰用户（避免错误条闪烁）
        console.warn(`[AIPanel autoTrigger] ${key} 失败:`, e?.message);
      } else {
        setError(e?.message || '调用失败');
      }
    } finally {
      setLoadingKey(null);
    }
  };

  // 2026-08-24 PR6：AI-09 图像识别——文件选择 → 上传 → 识别
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 value 以便选同一文件再次触发
    e.target.value = '';
    if (!file) return;

    setLoadingKey('image');
    setError(null);
    setResult(null);
    try {
      // 读 base64
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // 上传获取真实 image_id
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enhancedApiClient } = require('../lib/apiClient');
      const uploadRes = await enhancedApiClient.post('/ai/image/upload', {
        filename: file.name,
        data: dataUrl,
      });
      const uploadData = (uploadRes as any)?.data ?? uploadRes;
      const imageId = uploadData?.image_id;
      if (!imageId) {
        throw new Error('图片上传成功但未返回 image_id，请检查后端 upload 端点');
      }
      // 调识别（后端模型未部署时会抛"模型未部署"——Fail Loud）
      const res = await aiApi.image.identify({ image_id: imageId });
      const payload = (res as any)?.data ?? res;
      setResult({ key: 'image', data: { ...payload, uploaded_filename: file.name } });
    } catch (err: any) {
      setError(err?.message || '图像识别失败');
    } finally {
      setLoadingKey(null);
    }
  };

  // 2026-08-24 PR1：autoTrigger 自动触发
  // - 监听关键上下文字段变化（任务/温室/批次/工人/优先级）
  // - 200ms debounce 防抖（连续点击/快速切换不重复请求）
  // - cleanup 取消未完成的 setTimeout（避免组件卸载后仍触发 setState）
  // - 仅触发 autoTriggerKeys 列出的模块（节省资源）
  useEffect(() => {
    if (!autoTrigger || !autoTriggerKeys || autoTriggerKeys.length === 0) return;
    const timer = setTimeout(() => {
      autoTriggerKeys.forEach((key) => {
        void callAI(key, true);
      });
    }, 200);
    return () => clearTimeout(timer);
    // 故意只依赖关键触发字段，避免其他 props 变化触发重复请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTrigger, taskId, greenhouseId, batchId, batchCode, workerId, priority]);

  // 2026-08-24 PR-C：加载 AI 模型部署状态（仅加载一次，不重试）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { enhancedApiClient } = require('../lib/apiClient');
        const resp = await enhancedApiClient.get('/ai/config/status');
        const data = (resp as any)?.data ?? resp;
        if (!cancelled && data?.overall) {
          setAiConfigStatus(data);
        }
      } catch {
        // 静默失败：部署状态是辅助信息，不影响主功能
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 紧凑模式：仅图标按钮列表
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {allModules.map((m) => {
          const c = MODULE_COLORS[m.color] || MODULE_COLORS.blue;
          return (
            <button
              key={m.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); callAI(m.key); }}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs ${c.bg} ${c.text} rounded hover:opacity-80 disabled:opacity-50`}
              disabled={loadingKey === m.key}
              title={m.name}
            >
              <m.icon className="w-3 h-3" />
              {loadingKey === m.key ? '调用中' : m.name.replace(/^AI-\d+\s/, '')}
            </button>
          );
        })}
      </div>
    );
  }

  const activeModule = result ? allModules.find(m => m.key === result.key) : null;

  return (
    <>
      {/* 2026-08-24 PR6：隐藏的文件输入框（AI-09 图像上传用） */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">AI 智能助手（{allModules.length} 模块）</h3>
        </div>
        {result && (
          <button onClick={() => setResult(null)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X className="w-3 h-3" /> 关闭结果
          </button>
        )}
      </div>

      {/* 2026-08-24 PR-C：AI 模型部署状态横幅 */}
      {aiConfigStatus && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${
          aiConfigStatus.percent === 100 ? 'bg-green-50 border border-green-200' :
          aiConfigStatus.percent >= 70 ? 'bg-amber-50 border border-amber-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-gray-700">
              AI 模型部署：{aiConfigStatus.deployed}/{aiConfigStatus.total} 已就绪 ({aiConfigStatus.percent}%)
            </span>
            {aiConfigStatus.percent < 100 && (
              <span className="text-gray-500">点击 ❌ 查看部署</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {aiConfigStatus.modules.map((m) => (
              <button
                key={m.code}
                onClick={() => !m.deployed && setShowSetupGuide(showSetupGuide === m.code ? null : m.code)}
                title={m.deployed ? `${m.name}：已部署` : `${m.name}：未部署（点击查看部署指南）`}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  m.deployed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer'
                }`}
              >
                {m.deployed ? '✅' : '❌'} {m.name.replace(/^AI-\d+\s/, '')}
              </button>
            ))}
          </div>
          {showSetupGuide && (() => {
            const m = aiConfigStatus.modules.find((x) => x.code === showSetupGuide);
            return m?.setupGuide ? (
              <div className="mt-2 p-2 bg-white border border-amber-300 rounded text-[11px] text-gray-700 whitespace-pre-wrap">
                <div className="font-medium text-amber-700 mb-1">📖 {m.name} 部署指南：</div>
                {m.setupGuide}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* 模块按钮网格 */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {allModules.map((m) => {
          const Icon = m.icon;
          const isLoading = loadingKey === m.key;
          const isActive = result?.key === m.key;
          const c = MODULE_COLORS[m.color] || MODULE_COLORS.blue;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                // 2026-08-24 PR6：AI-09 走特殊文件上传流程（不是直接 callAI）
                if (m.key === 'image') {
                  imageInputRef.current?.click();
                } else {
                  callAI(m.key);
                }
              }}
              disabled={isLoading}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                isActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              {/* 彩色图标：淡色圆底 + 彩色图标 */}
              <span className={`w-9 h-9 rounded-full flex items-center justify-center ${c.bg}`}>
                {isLoading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Icon className={`w-5 h-5 ${c.text}`} />}
              </span>
              <span className="text-[11px] text-gray-700 text-center">{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* 错误 */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">⚠️ {error}</p>
        </div>
      )}

      {/* 结果：中文友好展示 */}
      {result && activeModule && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <activeModule.icon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-800">{activeModule.name} 结果</span>
            {result.data?.modelType && (
              <span className="text-[10px] text-gray-400 ml-auto">
                {result.data.modelType === 'rule-based' ? '规则引擎' :
                 result.data.modelType === 'onnx-mlp' ? 'MLP 神经网络' :
                 result.data.modelType === 'data-driven' ? '真实数据驱动' :
                 result.data.modelType === 'iot_sensors' ? 'IoT 实时数据' : result.data.modelType}
                {result.data.modelVersion ? ` · ${result.data.modelVersion}` : ''}
              </span>
            )}
          </div>
          {result.data ? activeModule.render(result.data) : (
            <p className="text-xs text-red-600">⚠️ 返回数据为空，请重试</p>
          )}
          {/* 2026-08-24 PR5：AI-12 问答助手交互式输入框（仅当结果为 AI-12 时显示） */}
          {result.key === 'qa' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="再问一个问题..."
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-cyan-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && qaQuestion.trim()) {
                    callAI('qa');
                  }
                }}
              />
              <button
                onClick={() => callAI('qa')}
                disabled={loadingKey === 'qa' || !qaQuestion.trim()}
                className="px-2 py-1 text-xs bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50"
              >
                提问
              </button>
            </div>
          )}
          {/* 2026-08-24 PR6：AI-11 语音录入交互式输入框（仅当结果为 AI-11 时显示） */}
          {result.key === 'voice' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="输入语音转写文本（如：今天上午在2号棚灌溉番茄用了3小时）"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-sky-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && voiceText.trim()) {
                    callAI('voice');
                  }
                }}
              />
              <button
                onClick={() => callAI('voice')}
                disabled={loadingKey === 'voice' || !voiceText.trim()}
                className="px-2 py-1 text-xs bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50"
              >
                解析
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

export default AIPanel;
