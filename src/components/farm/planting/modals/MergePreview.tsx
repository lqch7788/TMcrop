/**
 * 合并预览组件（2026-07-18 v5）
 *
 * 精确匹配 5 维度（crop_code + seed_form + unit + generation + propagation_method）
 * 两段式优先：同种植批次 → 全库兜底
 * 命中 → 提交时合并累加到已有种源；未命中 → 创建新种源
 *
 * v5：加 linkedPlantingId（同种植优先）+ forceNew checkbox（用户自主选择）
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Layers, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { enhancedApiClient } from '@/lib/apiClient';
import { derivePropagationMethod } from '@/lib/propagationMethod';

interface Props {
  cropCode: string;
  seedForm: string;
  unit: string;
  generation: string | null;
  newQuantity: number;
  /** 当前种植批次 ID（用于同种植优先匹配） */
  linkedPlantingId?: string;
  /** 当找到匹配时通知父组件，自动填充单位字段 */
  onMatchFound?: (matched: { id: string; sourceCode: string; unit: string } | null) => void;
  /** 2026-07-18: 用户选择强制新建（即使有匹配也不合并） */
  forceNew: boolean;
  /** 2026-07-18: 用户切换强制新建 checkbox */
  onForceNewChange: (forceNew: boolean) => void;
}

type MergeState = 'idle' | 'loading' | 'matched' | 'new' | 'error';

interface MatchedRecord {
  id: string;
  sourceCode: string;
  availableCount: number;
  unit: string;
  reflowCount: number;
  lastReflowAt: string | null;
}

export function MergePreview({
  cropCode, seedForm, unit, generation, newQuantity,
  linkedPlantingId, onMatchFound, forceNew, onForceNewChange,
}: Props) {
  const [state, setState] = useState<MergeState>('idle');
  const [matched, setMatched] = useState<MatchedRecord | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const onMatchFoundRef = useRef(onMatchFound);
  useEffect(() => {
    onMatchFoundRef.current = onMatchFound;
  }, [onMatchFound]);

  const queryMatch = useCallback(async (signal: AbortSignal) => {
    try {
      const params = new URLSearchParams({
        cropCode,
        seedForm,
        unit,
        propagationMethod: derivePropagationMethod(seedForm),
      });
      if (generation) params.set('generation', generation);
      // 2026-07-18: 同种植批次优先匹配
      if (linkedPlantingId) params.set('linkedPlantingId', linkedPlantingId);
      const result = await enhancedApiClient.get(`/seed-sources/matchable?${params}`);
      if (signal.aborted) return;
      setMatched(result || null);
      onMatchFoundRef.current?.(result ? { id: result.id, sourceCode: result.sourceCode, unit: result.unit } : null);
      setState(result ? 'matched' : 'new');
      setErrorMessage('');
    } catch (e: any) {
      if (signal.aborted) return;
      setErrorMessage(e?.message || String(e));
      setState('error');
    }
  }, [cropCode, seedForm, unit, generation, linkedPlantingId]);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();

    if (!cropCode || !seedForm || !unit) {
      setState('idle');
      setMatched(null);
      onMatchFoundRef.current?.(null);
      return;
    }

    setState('loading');
    setErrorMessage('');
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      queryMatch(controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cropCode, seedForm, unit, generation, retryKey, queryMatch]);

  // 加载中
  if (state === 'idle' || state === 'loading') {
    return (
      <div className="h-12 flex items-center text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-4">
        <span className="animate-pulse">查询合并候选中...</span>
      </div>
    );
  }

  // 错误态
  if (state === 'error') {
    return (
      <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
        <div className="flex items-start gap-2 flex-1">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-red-900">查询合并候选失败</div>
            {errorMessage && (
              <div className="text-xs mt-0.5 text-red-700 font-mono break-all">{errorMessage}</div>
            )}
            <div className="text-xs mt-0.5 text-red-700">不影响提交，会创建新种源</div>
          </div>
        </div>
        <button onClick={() => setRetryKey(k => k + 1)} className="ml-2 flex-shrink-0 text-xs text-red-700 hover:text-red-900 underline">
          重试
        </button>
      </div>
    );
  }

  // 匹配态（含 forceNew 覆盖）
  if (state === 'matched' && matched) {
    const isEffective = !forceNew;  // 勾选强制新建后匹配不再生效
    return (
      <div className={`p-4 rounded-lg border ${isEffective ? 'border-cyan-200 bg-cyan-50' : 'border-gray-200 bg-gray-50 line-through opacity-60'}`}>
        <div className="flex gap-3">
          <Layers className={`w-5 h-5 ${isEffective ? 'text-cyan-600' : 'text-gray-400'} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 space-y-1 text-sm">
            <div className={`font-medium ${isEffective ? 'text-cyan-900' : 'text-gray-600'}`}>
              {isEffective ? '✅ 将合并到已有种源' : '⏸ 已找到匹配，但您选择单独存储'}
            </div>
            <div className={`break-all ${isEffective ? 'text-cyan-700' : 'text-gray-500'}`}>
              <code className="font-mono">{matched.sourceCode}</code>
              {' · '}当前 {matched.availableCount} {matched.unit}
              {' · '}已回流 {matched.reflowCount ?? 0} 次
            </div>
            {isEffective && (
              <div className="text-cyan-900">
                本次新增 <strong>{newQuantity} {unit}</strong> 后 → 可用数量{' '}
                <strong className="text-lg">{(matched.availableCount || 0) + newQuantity} {unit}</strong>
              </div>
            )}
            {/* 2026-07-18: 用户自主选择是否合并 */}
            <label className="flex items-center gap-1.5 text-xs cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={forceNew}
                onChange={(e) => onForceNewChange(e.target.checked)}
                className="rounded border-gray-400"
              />
              <span className={forceNew ? 'text-amber-700 font-medium' : 'text-gray-600'}>
                单独存储（不合并）。适用于采收间隔久、需独立追溯的场景
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // 新建态
  return (
    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
      <div className="flex gap-3">
        <Plus className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1 text-sm">
          <div className="font-medium text-amber-900">📝 将创建新的种源记录</div>
          <div className="text-amber-700">
            当前种源库中没有「{cropCode} / {seedForm}{generation ? ` / ${generation}` : ''} / {unit}」的可合并记录
          </div>
          <div className="text-xs text-amber-600">
            提交后系统会生成新种源批号（如 SRC-SS-xxxx）
          </div>
        </div>
      </div>
    </div>
  );
}