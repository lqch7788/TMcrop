/**
 * 农事任务中心 - 问题分派弹窗
 * 样式与现有弹窗统一
 */

import React, { useState, useEffect } from 'react';
import { ProblemEntry } from '../../../hooks/usePersistentProblems';
import { STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { useUsers } from '../../common/settings';
import type { User } from '../../../types';
import { X } from 'lucide-react';

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

type Worker = User & {
  skills?: string[];
  currentLoad?: number;
};

export function ProblemDispatchModal({ problemId, onClose, onDispatched }: ProblemDispatchModalProps) {
  // 从SettingsDataProvider获取用户列表
  const { users: workers } = useUsers();

  const [problem, setProblem] = useState<ProblemEntry | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [priority, setPriority] = useState<'高' | '中' | '低'>('中');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [requireCheckin, setRequireCheckin] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const storedProblems = localStorage.getItem(STORAGE_KEYS.DAILY_PROBLEMS);
      if (storedProblems) {
        const parsed = JSON.parse(storedProblems);
        const problemsList = Array.isArray(parsed) ? parsed : [];
        const foundProblem = problemsList.find((p: ProblemEntry) => p.id === problemId);
        if (foundProblem) {
          setProblem(foundProblem);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setExpectedDate(tomorrow.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      // 加载数据失败，无需额外处理
    }
  }, [problemId]);

  const availableWorkers = workers.filter(w => w.id !== problem?.handlerId);

  const handleSubmit = async () => {
    if (!problem || !selectedWorkerId) return;
    setIsSubmitting(true);
    try {
      const storedProblems = localStorage.getItem(STORAGE_KEYS.DAILY_PROBLEMS);
      if (storedProblems) {
        const parsed = JSON.parse(storedProblems);
        const problemsList = Array.isArray(parsed) ? parsed : [];
        const problemIndex = problemsList.findIndex((p: ProblemEntry) => p.id === problemId);

        if (problemIndex !== -1) {
          const selectedWorker = workers.find(w => w.id === selectedWorkerId);

          problemsList[problemIndex] = {
            ...problemsList[problemIndex],
            status: '处理中',
            handler: selectedWorker?.name || '',
            handlerId: selectedWorkerId,
            dispatchTime: new Date().toISOString(),
            priority,
            expectedDate,
            requireCheckin,
            requirePhoto,
          };

          localStorage.setItem(STORAGE_KEYS.DAILY_PROBLEMS, JSON.stringify(problemsList));
          onDispatched();
        }
      }
    } catch (error) {
      // 提交分派失败
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

  const severityConfig = SEVERITY_CONFIG[problem.issueSeverity] || SEVERITY_CONFIG['轻微'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">问题分派</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-emerald-500">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 问题信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">问题信息</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">问题描述:</span>
                <p className="mt-1 text-gray-900">{problem.issueText}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-500">问题编号:</span>
                  <span className="ml-2 text-gray-900">{problem.problemCode}</span>
                </div>
                <div>
                  <span className="text-gray-500">来源:</span>
                  <span className="ml-2 text-gray-900">{problem.sourceModule === 'inspection' ? '巡查' : '手动录入'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-500">温室区域:</span>
                  <span className="ml-2 text-gray-900">{problem.greehouseName || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">严重程度:</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${severityConfig.bg} ${severityConfig.text}`}>
                    {problem.issueSeverity}
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
                <label
                  key={worker.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedWorkerId === worker.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="worker"
                    value={worker.id}
                    checked={selectedWorkerId === worker.id}
                    onChange={() => setSelectedWorkerId(worker.id)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                    {worker.department && (
                      <p className="text-xs text-gray-500">{worker.department}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 分派设置 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">分派设置</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">优先级:</label>
                <div className="flex gap-2">
                  {(['高', '中', '低'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setPriority(level)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        priority === level
                          ? level === '高' ? 'bg-red-600 text-white' : level === '中' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">期望完成日期:</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">必填项:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireCheckin}
                      onChange={(e) => setRequireCheckin(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-gray-700">位置打卡</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirePhoto}
                      onChange={(e) => setRequirePhoto(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-gray-700">作业照片</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedWorkerId || isSubmitting}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? '分派中...' : '确认分派'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProblemDispatchModal;
