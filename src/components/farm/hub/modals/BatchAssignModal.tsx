/**
 * 批量任务分配弹窗（2026-09-15 Phase 4-4b - #9 批量任务分配）
 *
 * 用法：传入已创建的任务（task）+ 工人池 + 已有排班参考，填日期范围后批量分配
 * 提交：POST /api/farm-task-schedules/batch-assign
 */
import { useState, useMemo, useEffect } from 'react';
import { Calendar, Loader2, Send, X } from 'lucide-react';
import { Button, DatePicker, UnifiedModal, Checkbox } from '@/components/ui';
import { enhancedApiClient } from '@/lib/apiClient';

interface BatchAssignModalProps {
  open: boolean;
  onClose: () => void;
  task: { id: string; taskName?: string; taskType?: string } | null;
  workers: Array<{ id: string; name: string; departmentName?: string }>;
}

interface AssignmentResult {
  created: number;
  skipped: number;
  errors: number;
  details: { skipped: Array<{ workerId: string; date: string; reason: string }>; errors: string[] };
}

export function BatchAssignModal({ open, onClose, task, workers }: BatchAssignModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 打开时默认全选工人 + 默认日期为今天到 +7 天
  useEffect(() => {
    if (!open) return;
    setSelectedWorkerIds(new Set(workers.map((w) => w.id)));
    const today = new Date();
    const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartDate(formatDate(today));
    setEndDate(formatDate(in7));
    setResult(null);
    setError(null);
  }, [open, workers]);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    return Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }, [startDate, endDate]);

  const expectedSchedules = selectedWorkerIds.size * days;

  const toggleWorker = (id: string) => {
    setSelectedWorkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedWorkerIds((prev) => {
      if (prev.size === workers.length) return new Set();
      return new Set(workers.map((w) => w.id));
    });
  };

  const handleSubmit = async () => {
    if (!task) return;
    if (!startDate || !endDate) {
      setError('请填写开始和结束日期');
      return;
    }
    if (selectedWorkerIds.size === 0) {
      setError('请至少选择 1 个工人');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const selectedWorkers = workers
        .filter((w) => selectedWorkerIds.has(w.id))
        .map((w) => ({ workerId: w.id, workerName: w.name }));
      const res = await enhancedApiClient.post<AssignmentResult>(
        '/farm-task-schedules/batch-assign',
        {
          taskId: task.id,
          startDate,
          endDate,
          workers: selectedWorkers,
        },
      );
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !task) return null;

  const allSelected = workers.length > 0 && selectedWorkerIds.size === workers.length;

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={`批量分配 - ${task.taskName || task.id}`}
      size="lg"
      showFooter={true}
      footer={result ? (
        <Button variant="default" onClick={onClose}>
          <X className="w-4 h-4" /> 关闭
        </Button>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || days === 0 || selectedWorkerIds.size === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> 提交中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> 生成 {expectedSchedules} 条排班
              </>
            )}
          </Button>
        </>
      )}
    >
      {result ? (
        // 结果展示
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{result.created}</div>
              <div className="text-xs text-green-700 mt-1">成功创建</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
              <div className="text-xs text-yellow-700 mt-1">跳过冲突</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{result.errors}</div>
              <div className="text-xs text-red-700 mt-1">失败</div>
            </div>
          </div>
          {result.details.skipped.length > 0 && (
            <div className="text-xs bg-yellow-50 p-2 rounded">
              <div className="font-medium text-yellow-800 mb-1">跳过原因：</div>
              <ul className="list-disc pl-4 text-yellow-700">
                {result.details.skipped.slice(0, 5).map((s, i) => (
                  <li key={i}>{s.workerId} @ {s.date}: {s.reason}</li>
                ))}
                {result.details.skipped.length > 5 && <li>... 共 {result.details.skipped.length} 条</li>}
              </ul>
            </div>
          )}
          {result.details.errors.length > 0 && (
            <div className="text-xs bg-red-50 p-2 rounded">
              <div className="font-medium text-red-800 mb-1">错误：</div>
              <ul className="list-disc pl-4 text-red-700">
                {result.details.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        // 输入表单
        <div className="space-y-4">
          {/* 任务信息 */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <div className="font-medium text-blue-800">任务</div>
            <div className="text-blue-700 mt-1">
              ID：<code>{task.id}</code>
              {task.taskName && <span className="ml-3">名称：{task.taskName}</span>}
              {task.taskType && <span className="ml-3">类型：{task.taskType}</span>}
            </div>
          </div>

          {/* 日期范围 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {days > 0 && (
            <div className="text-xs text-gray-500">
              共 <strong>{days}</strong> 天，预计生成 <strong className="text-blue-600">{expectedSchedules}</strong> 条排班（{selectedWorkerIds.size} 工人 × {days} 天）
            </div>
          )}
          {days === 0 && startDate && endDate && (
            <div className="text-xs text-red-500">结束日期必须 ≥ 开始日期</div>
          )}

          {/* 工人多选 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                选择工人 ({selectedWorkerIds.size}/{workers.length})
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-blue-600 hover:underline"
              >
                {allSelected ? '清空' : '全选'}
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {workers.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">暂无可分配工人</p>
              ) : workers.map((w) => (
                <label
                  key={w.id}
                  className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={selectedWorkerIds.has(w.id)}
                    onCheckedChange={() => toggleWorker(w.id)}
                  />
                  <span className="text-sm">{w.name}</span>
                  {w.departmentName && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {w.departmentName}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-xs bg-red-50 text-red-700 p-2 rounded">{error}</div>
          )}
        </div>
      )}
    </UnifiedModal>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default BatchAssignModal;
