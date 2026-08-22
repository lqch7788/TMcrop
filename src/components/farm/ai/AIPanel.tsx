/**
 * AI Panel 统一组件（V2 — 中文友好展示）
 * 2026-08-22：智能任务中心 15 个 AI 模块的统一入口
 *
 * V2 改进：每个模块结果用中文卡片展示（替代 V1 原始 JSON）
 */

import React, { useState } from 'react';
import {
  Sparkles, Clock, Truck, Bug, TrendingUp, MapPin, Image as ImageIcon,
  MessageCircle, FileText, ShieldAlert, Calendar, Bot, X, Loader2,
} from 'lucide-react';
import { aiApi } from '../../../services/aiApi';

interface AIPanelProps {
  cropType?: string;
  taskId?: string;
  taskType?: string;
  compact?: boolean;
}

// 模块定义（含调用函数 + 中文渲染）
const AI_MODULES = [
  {
    key: 'workhour', name: 'AI-06 工时预测', icon: Clock, color: 'blue',
    call: (p: any) => aiApi.workhour.predict({ task_type: p.taskType || '灌溉', priority: 'normal', task_id: p.taskId }),
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
    call: (p: any) => aiApi.dispatch.recommend({ task_type: p.taskType || '灌溉', priority: 'normal' }),
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
    call: (p: any) => aiApi.growth.predict({ crop_type: p.cropType || '番茄', plant_date: '2026-05-01' }),
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
    call: (p: any) => aiApi.pest.alert({ crop_type: p.cropType || '番茄', env_data: { temperature: 22, humidity: 85 } }),
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
    call: () => aiApi.route.optimize({
      worker_start: { lat: 30.27, lng: 120.15 },
      tasks: [
        { task_id: 'T1', lat: 30.28, lng: 120.16, name: 'A温室' },
        { task_id: 'T2', lat: 30.30, lng: 120.18, name: 'B温室' },
        { task_id: 'T3', lat: 30.26, lng: 120.14, name: 'C温室' },
      ],
    }),
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
    call: () => aiApi.image.identify({ image_id: `IMG-${Date.now()}`, image_name: 'demo.jpg' }),
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
    call: (p: any) => aiApi.qa.ask({ question: `关于${p.cropType || '番茄'}种植的最佳实践？` }),
    render: (d: any) => (
      <div className="space-y-2">
        <div className="bg-cyan-50 rounded p-3">
          <p className="text-xs text-gray-600 whitespace-pre-wrap">{d.answer}</p>
        </div>
        <p className="text-[10px] text-gray-400">
          意图：{d.intent === 'operation' ? '操作指导' : d.intent === 'data_query' ? '数据查询' : d.intent === 'terminology' ? '术语解释' : d.intent === 'troubleshooting' ? '故障排查' : '其他'}
          · 置信度 {(d.confidence * 100).toFixed(0)}%
        </p>
        {d.references?.length > 0 && (
          <p className="text-[10px] text-gray-400">📚 引用 {d.references.length} 条知识库记录</p>
        )}
      </div>
    ),
  },
  {
    key: 'report', name: 'AI-13 报告生成', icon: FileText, color: 'indigo',
    call: () => aiApi.report.generate({ report_type: 'weekly' }),
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
    call: () => aiApi.schedule.generate({
      start_date: new Date().toISOString().split('T')[0],
      days: 3,
      employees: [],
      tasks: [{ task_id: 'T1', task_type: '灌溉', estimated_hours: 4 }],
    }),
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
    call: () => aiApi.anomaly.detect({}),
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
    call: (p: any) => aiApi.growthState.identify({ crop_type: p.cropType || '番茄', current_gdd: 900 }),
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
    call: () => aiApi.voice.transcribe({ transcribed_text: '今天上午在2号棚灌溉番茄用了3小时' }),
    render: (d: any) => (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">🎙 转写文本：{d.rawText}</p>
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
    call: () => aiApi.attendance.detect({}),
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
    call: () => aiApi.approval.suggest({ applicant_id: 'E001', approval_type: 'leave', duration_days: 5 }),
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
    call: () => aiApi.resource.optimize({ lookback_days: 30 }),
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
  return <Calendar {...props} />;
}

export function AIPanel({ cropType = '番茄', taskId, taskType, compact = false }: AIPanelProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; data: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allModules = [...AI_MODULES, ...EXTRA_MODULES];

  const callAI = async (key: string) => {
    setLoadingKey(key);
    setError(null);
    setResult(null);
    try {
      const mod = allModules.find(m => m.key === key);
      if (!mod) return;
      const res = await mod.call({ cropType, taskId, taskType });
      // 2026-08-22 修复：enhancedApiClient 已自动解包 data（apiClient.ts:243）
      // → res 可能直接是 data 对象（无 .data 层），兼容两种情况
      const payload = (res as any)?.data ?? res;
      setResult({ key, data: payload });
    } catch (e: any) {
      setError(e?.message || '调用失败');
    } finally {
      setLoadingKey(null);
    }
  };

  // 紧凑模式：仅图标按钮列表
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {allModules.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); callAI(m.key); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
            disabled={loadingKey === m.key}
            title={m.name}
          >
            <m.icon className="w-3 h-3" />
            {loadingKey === m.key ? '调用中' : m.name.replace(/^AI-\d+\s/, '')}
          </button>
        ))}
      </div>
    );
  }

  const activeModule = result ? allModules.find(m => m.key === result.key) : null;

  return (
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

      {/* 模块按钮网格 */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {allModules.map((m) => {
          const Icon = m.icon;
          const isLoading = loadingKey === m.key;
          const isActive = result?.key === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => callAI(m.key)}
              disabled={isLoading}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                isActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              {isLoading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Icon className="w-5 h-5 text-gray-600" />}
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
                {result.data.modelType === 'rule-based' ? '规则引擎' : result.data.modelType === 'mock' ? '演示模型' : result.data.modelType}
                {result.data.modelVersion ? ` · ${result.data.modelVersion}` : ''}
              </span>
            )}
          </div>
          {result.data ? activeModule.render(result.data) : (
            <p className="text-xs text-red-600">⚠️ 返回数据为空，请重试</p>
          )}
        </div>
      )}
    </div>
  );
}

export default AIPanel;
