/**
 * 实际工时录入组件（V1）
 * 2026-08-22：AI-06 工时预测数据采集入口
 *
 * 轻量组件，可在任务详情/列表/Modal 任意位置挂载。
 * 员工完成农事任务时，填入实际工时 → 自动调 AI-06 后端写入 farm_tasks.actual_hours。
 */

import React, { useState } from 'react';
import { Clock, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { aiApi } from '../../../services/aiApi';
import { Button, Input } from '../../ui';

interface ActualHoursRecorderProps {
  taskId: string;
  taskType: string;
  taskCode?: string;
  estimatedHours?: number;
  predictedHours?: number;        // AI-06 预测值（可选，从预测端点获取）
  onSuccess?: (actualHours: number) => void;
  onError?: (error: string) => void;
  compact?: boolean;             // 紧凑模式（嵌入表格行）
}

export function ActualHoursRecorder({
  taskId,
  taskType,
  taskCode,
  estimatedHours,
  predictedHours,
  onSuccess,
  onError,
  compact = false,
}: ActualHoursRecorderProps) {
  const [hours, setHours] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const value = parseFloat(hours);
    if (isNaN(value) || value <= 0) {
      setError('请输入大于 0 的工时数');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await aiApi.workhour.feedback({
        task_id: taskId,
        actual_hours: value,
        accepted: true,
      });
      if (res.success) {
        setSuccess(true);
        setHours('');
        onSuccess?.(value);
        // 3 秒后清掉成功状态
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const msg = '提交失败';
        setError(msg);
        onError?.(msg);
      }
    } catch (e: any) {
      const msg = e?.message || '网络错误';
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const ratio = hours && estimatedHours && Number(hours) > 0
    ? (Number(hours) / estimatedHours * 100).toFixed(0) + '%'
    : null;

  // 紧凑模式（表格行）
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step={0.1}
          min={0}
          placeholder="实际工时"
          value={hours}
          onChange={e => setHours(e.target.value)}
          className="w-20 h-8 text-sm"
          disabled={submitting}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !hours}
          variant={success ? 'secondary' : 'default'}
        >
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> :
           success ? <CheckCircle2 className="w-3 h-3 text-green-600" /> :
           <Clock className="w-3 h-3" />}
        </Button>
        {error && <AlertTriangle className="w-3 h-3 text-red-500" />}
      </div>
    );
  }

  // 完整模式（任务详情页）
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">实际工时录入（AI 训练数据）</h3>
      </div>

      {taskCode && (
        <p className="text-xs text-gray-500 mb-3">任务：{taskCode}</p>
      )}

      <div className="flex items-center gap-3 mb-3">
        <Input
          type="number"
          step={0.1}
          min={0}
          placeholder="实际工时（小时）"
          value={hours}
          onChange={e => setHours(e.target.value)}
          className="flex-1"
          disabled={submitting}
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !hours}
          variant={success ? 'secondary' : 'default'}
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />提交中</>
          ) : success ? (
            <><CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />已提交</>
          ) : (
            <><Clock className="w-4 h-4 mr-1" />提交</>
          )}
        </Button>
      </div>

      {/* 提示信息 */}
      <div className="space-y-1 text-xs text-gray-500">
        {estimatedHours && (
          <p>📋 预估工时：{estimatedHours}h</p>
        )}
        {predictedHours && (
          <p>🤖 AI 预测工时：{predictedHours}h</p>
        )}
        {ratio && (
          <p className={Number(ratio) > 120 || Number(ratio) < 80 ? 'text-amber-600' : 'text-green-600'}>
            📊 实际/预估：{ratio}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="w-3 h-3" />{error}
        </div>
      )}

      {success && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="w-3 h-3" />工时已记录，正在训练 AI-06 模型
        </div>
      )}
    </div>
  );
}

export default ActualHoursRecorder;
