/**
 * 农事任务中心 - 问题分派弹窗
 * V2.0: 补齐 Task 创建 + 流转记录写入
 */

import React, { useState, useEffect } from 'react';
import { useUserStore, useProblemStore } from '../../../stores';
import type { ProblemData } from '../../../stores/useProblemStore';
import { useProblemDispatch, type ProblemFlowRecord } from '../../../hooks/useProblemDispatch';
import type { User } from '../../../types';
import { X } from 'lucide-react';
import { Button, Label, DatePicker } from '@/components/ui';
import { Input } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface ProblemDispatchModalProps {
  problemId: number;
  onClose: () => void;
  onDispatched: () => void;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; color: string }> = {
  '轻微': { bg: 'bg-green-100', text: 'text-green-700', color: 'green' },
  '中等': { bg: 'bg-yellow-100', text: 'text-yellow-700', color: 'yellow' },
  '严重': { bg: 'bg-red-100', text: 'text-red-700', color: 'red' },
};

const STATUS_CN_MAP: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '处理中',
  'waiting_acceptance': '待验收',
  'completed': '已处理',
};

export function ProblemDispatchModal({ problemId, onClose, onDispatched }: ProblemDispatchModalProps) {
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  const storeProblems = useProblemStore((state) => state.problems);
  const updateProblemInStore = useProblemStore((state) => state.updateProblem);

  // V2.0: 使用统一的 dispatch engine
  const { dispatchProblem, workerList } = useProblemDispatch();

  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [priority, setPriority] = useState<'高' | '中' | '低'>('中');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [requireCheckin, setRequireCheckin] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const found = storeProblems.find(p => p.id === problemId);
    if (found) {
      setProblem(found);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setExpectedDate(todayLocal(tomorrow));
    }
  }, [problemId, storeProblems]);

  const availableWorkers = workerList;

  const handleSubmit = async () => {
    if (!problem || !selectedWorkerId) return;
    setIsSubmitting(true);
    try {
      const selectedWorker = workerList.find(w => w.id === selectedWorkerId);

      const requiredFeedback: string[] = [];
      if (requireCheckin) requiredFeedback.push('gps');
      if (requirePhoto) { requiredFeedback.push('photo_before'); requiredFeedback.push('photo_after'); }

      const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
        '高': 'high', '中': 'medium', '低': 'low',
      };

      // V2.0: 通过统一的 dispatchProblem 创建任务 + 流转记录 + 写入API
      const task = dispatchProblem(
        problemId as number,
        selectedWorkerId,
        selectedWorker?.name || '',
        'U001',
        '系统管理员',
        expectedDate,
        requiredFeedback,
        priorityMap[priority] || 'medium'
      );

      if (task) {
        onDispatched();
      }
    } catch {
      // 分派失败
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!problem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl p-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  const issueText = problem.issueText || problem.description || problem.title || '';
  const severity = problem.issueSeverity || '中等';
  const severityConfig = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG['轻微'];
  const statusLabel = problem.statusLabel || STATUS_CN_MAP[problem.status || ''] || problem.status || '';
  const greenhouseName = problem.greenhouseName || '';
  const problemCode = problem.problemCode || `PD${problemId}`;
  const sourceModule = problem.sourceModule || 'manual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">问题分派</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4 text-white" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 问题信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">问题信息</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">问题描述:</span>
                <p className="mt-1 text-gray-900">{issueText}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-500">问题编号:</span>
                  <span className="ml-2 text-gray-900">{problemCode}</span>
                </div>
                <div>
                  <span className="text-gray-500">状态:</span>
                  <span className="ml-2 text-gray-900">{statusLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-500">温室区域:</span>
                  <span className="ml-2 text-gray-900">{greenhouseName || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">严重程度:</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${severityConfig.bg} ${severityConfig.text}`}>
                    {severity}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 执行人选择 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">执行人选择</h4>
            <div className="space-y-2">
              {availableWorkers.map((worker) => (
                <Label
                  key={worker.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedWorkerId === worker.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Input
                    type="radio"
                    name="worker"
                    value={worker.id}
                    checked={selectedWorkerId === worker.id}
                    onChange={() => setSelectedWorkerId(worker.id)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{worker.name}（{worker.position}）</p>
                  </div>
                </Label>
              ))}
            </div>
          </div>

          {/* 分派设置 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">分派设置</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-600 mb-2">优先级:</Label>
                <div className="flex gap-2">
                  {(['高', '中', '低'] as const).map((level) => (
                    <Button
                      key={level}
                      onClick={() => setPriority(level)}
                      size="sm"
                      className={`
                        ${priority === level
                          ? level === '高' ? 'bg-red-600 hover:bg-red-700 text-white' : level === '中' ? 'bg-yellow-600 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}
                      `}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-gray-600 mb-2">期望完成日期:</Label>
                <DatePicker
                  selected={expectedDate ? new Date(expectedDate) : undefined}
                  onChange={(date) => setExpectedDate(todayLocal(date))}
                  placeholder="选择日期"
                />
              </div>
              <div>
                <Label className="text-gray-600 mb-2">必填项:</Label>
                <div className="flex gap-4">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={requireCheckin}
                      onChange={(e) => setRequireCheckin(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-gray-700">位置打卡</span>
                  </Label>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={requirePhoto}
                      onChange={(e) => setRequirePhoto(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-gray-700">作业照片</span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!selectedWorkerId || isSubmitting}
          >
            {isSubmitting ? '分派中...' : '确认分派'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProblemDispatchModal;
