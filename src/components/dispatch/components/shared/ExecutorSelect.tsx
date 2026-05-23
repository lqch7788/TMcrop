/**
 * 执行人选择器组件
 * 支持手动选择执行人和智能推荐排序
 */

import React, { useState, useEffect } from 'react';
import { Search, Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useSmartRecommend } from '../../hooks/useSmartRecommend';
import { RecommendIndicator } from './RecommendIndicator';
import type { RecommendedExecutor } from '../../types/dispatch';

export interface ExecutorSelectProps {
  value: string;
  onChange: (executorId: string, executorName: string, recommendScore?: number) => void;
  mode?: 'farm' | 'smart';
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 执行人选项配置
 */
const EXECUTOR_OPTIONS = [
  { value: 'W001', label: '萧峰', workerType: '正式工', workZone: 'A区' },
  { value: 'W002', label: '虚竹', workerType: '季节工', workZone: 'C区' },
  { value: 'W003', label: '狄云', workerType: '正式工', workZone: 'A区' },
  { value: 'W004', label: '石破天', workerType: '临时工', workZone: 'B区' },
  { value: 'W005', label: '胡斐', workerType: '季节工', workZone: 'D区' },
  { value: 'W006', label: '袁承志', workerType: '正式工', workZone: 'A区' },
];

/**
 * 执行人选择器组件
 */
export const ExecutorSelect: React.FC<ExecutorSelectProps> = ({
  value,
  onChange,
  mode = 'farm',
  placeholder = '请选择执行人',
  disabled = false,
}) => {
  const { getRecommendations, workers } = useSmartRecommend({ mode });

  const [isOpen, setIsOpen] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendedExecutor[]>([]);

  // 根据搜索过滤选项
  const filteredOptions = EXECUTOR_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(searchText.toLowerCase())
  );

  // 获取当前选中的执行人
  const selectedExecutor = EXECUTOR_OPTIONS.find((opt) => opt.value === value);

  // 切换显示推荐
  const toggleRecommendations = () => {
    if (showRecommendations) {
      setShowRecommendations(false);
    } else {
      // 获取推荐
      const taskInput = {
        taskName: '选择执行人',
        workZone: 'A区',
        priority: 'normal' as const,
        requiredSkills: [],
        estimatedHours: 2,
      };
      const recs = getRecommendations(taskInput);
      setRecommendations(recs);
      setShowRecommendations(true);
    }
  };

  // 选择执行人
  const handleSelect = (executorId: string, executorName: string, score?: number) => {
    onChange(executorId, executorName, score);
    setIsOpen(false);
    setShowRecommendations(false);
    setSearchText('');
  };

  // 评分样式
  const getScoreStyle = (score: number): { bg: string; text: string } => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700' };
    if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700' };
    if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700' };
    return { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  return (
    <div className="relative">
      {/* 选择框 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 flex-1">
          {selectedExecutor ? (
            <>
              <span className="font-medium text-gray-900">{selectedExecutor.label}</span>
              <span className="text-xs text-gray-500">{selectedExecutor.workerType}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedExecutor && (
            <span className="text-xs text-gray-400">{selectedExecutor.workZone}</span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索执行人..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* 手动选择列表 */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">未找到匹配的执行人</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value, option.label)}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                    value === option.value ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">
                      {option.workerType} · {option.workZone}
                    </div>
                  </div>
                  {value === option.value && <Check className="w-4 h-4 text-blue-600" />}
                </div>
              ))
            )}
          </div>

          {/* 智能推荐按钮 */}
          {mode === 'smart' && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRecommendations();
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {showRecommendations ? '收起推荐' : '查看智能推荐'}
              </button>
            </div>
          )}

          {/* 智能推荐列表 */}
          {showRecommendations && recommendations.length > 0 && (
            <div className="max-h-64 overflow-y-auto border-t border-gray-200">
              <div className="p-2 bg-purple-50">
                <div className="text-xs font-medium text-purple-700 mb-2">智能推荐排序</div>
                {recommendations.slice(0, 5).map((executor, index) => (
                  <div
                    key={executor.workerId}
                    onClick={() =>
                      handleSelect(executor.workerId, executor.workerName, executor.matchScore)
                    }
                    className={`flex items-center justify-between p-2 mb-1 rounded-lg cursor-pointer transition-colors ${
                      value === executor.workerId
                        ? 'bg-purple-200'
                        : 'bg-white hover:bg-purple-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${getScoreStyle(
                          executor.matchScore
                        ).bg} ${getScoreStyle(executor.matchScore).text}`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{executor.workerName}</div>
                        <div className="text-xs text-gray-500">
                          {executor.workerType} · {executor.currentWorkZone}
                        </div>
                      </div>
                    </div>
                    <RecommendIndicator score={executor.matchScore} showLabel />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
