/**
 * AI 工时预测展示组件（V1）
 * 2026-08-22：AI-06 工时预测展示 UI
 *
 * 派工推荐卡 / 任务详情页挂载：
 * - 显示"预计 X 小时（置信区间 Y-Z）"
 * - 点击展开 XAI 推理依据（3-5 条人类可读解释）
 * - 失败时显示降级提示
 */

import React, { useEffect, useState } from 'react';
import { Clock, Sparkles, ChevronDown, ChevronUp, Loader2, AlertTriangle, Info } from 'lucide-react';
import { aiApi, WorkhourPredictResult } from '../../../services/aiApi';
import { Button } from '../../ui';

interface WorkhourPredictorProps {
  taskType: string;
  priority?: string;
  greenhouseId?: string;
  assigneeId?: string;
  taskId?: string;
  estimatedHours?: number;
  /** 紧凑模式：只显示"预计 X 小时"标签（用于派工卡）*/
  compact?: boolean;
  /** 加载后自动调用预测 */
  autoLoad?: boolean;
}

export function WorkhourPredictor({
  taskType,
  priority,
  greenhouseId,
  assigneeId,
  taskId,
  estimatedHours,
  compact = false,
  autoLoad = true,
}: WorkhourPredictorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkhourPredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadPrediction = async () => {
    if (!taskType) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.workhour.predict({
        task_type: taskType,
        priority,
        greenhouse_id: greenhouseId,
        assignee_id: assigneeId,
        task_id: taskId,
      });
      if (res.success) {
        setResult(res.data);
      } else {
        setError('预测失败');
      }
    } catch (e: any) {
      setError(e?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) loadPrediction();
  }, [taskType, priority, greenhouseId, assigneeId, taskId]);

  // 紧凑模式：标签 + 点击展开
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        {loading ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
            <Loader2 className="w-3 h-3 animate-spin" />
            预测中
          </span>
        ) : error ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
            <AlertTriangle className="w-3 h-3" />
            暂无预测
          </span>
        ) : result ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 cursor-pointer"
            title="点击查看 AI 推理依据"
          >
            <Sparkles className="w-3 h-3" />
            预计 {result.predictedHours.toFixed(1)}h
            {result.fallbackUsed && <span className="text-[10px] text-gray-500">(降级)</span>}
          </button>
        ) : null}
        {expanded && result && (
          <PredictorDetail result={result} estimatedHours={estimatedHours} />
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-900">AI-06 工时预测</h3>
          {result?.fallbackUsed && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">降级模式</span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={loadPrediction} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : '重新预测'}
        </Button>
      </div>

      {loading && (
        <p className="text-xs text-blue-700">⏳ AI 推理中...</p>
      )}

      {error && !result && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />{error}
        </p>
      )}

      {result && (
        <PredictorDetail result={result} estimatedHours={estimatedHours} />
      )}
    </div>
  );
}

function PredictorDetail({ result, estimatedHours }: { result: WorkhourPredictResult; estimatedHours?: number }) {
  return (
    <div className="mt-2 space-y-1 text-xs text-blue-900 bg-white rounded p-3">
      <p>
        🤖 <strong>预计 {result.predictedHours.toFixed(1)} 小时</strong>
        <span className="text-blue-600 ml-1">
          (置信区间 {result.confidenceLow.toFixed(1)} - {result.confidenceHigh.toFixed(1)}h)
        </span>
      </p>
      {estimatedHours && (
        <p className="text-gray-600">
          📋 预估工时：{estimatedHours}h（实际/预估 = {(result.predictedHours / estimatedHours * 100).toFixed(0)}%）
        </p>
      )}
      <p className="text-gray-500">
        🔬 基于 {result.sampleCount} 条历史样本 · 模型 {result.modelType} v{result.modelVersion}
      </p>
      {result.xaiReasons && result.xaiReasons.length > 0 && (
        <details className="mt-2">
          <summary className="text-blue-700 cursor-pointer flex items-center gap-1">
            <Info className="w-3 h-3" /> 查看推理依据
          </summary>
          <ul className="mt-1 ml-4 space-y-0.5 text-gray-600">
            {result.xaiReasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default WorkhourPredictor;
