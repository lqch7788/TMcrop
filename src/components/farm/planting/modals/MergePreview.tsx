/**
 * 合并预览组件（2026-07-18 v2）
 * 实时查询合并候选，4 种状态：matched / new / loading / error
 * 用 AbortController 防竞态
 * v2: matched 状态可点击跳转 + 错误态加重试 + 提示文案优化
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui';
import { Button } from '@/components/ui';
import { Layers, Plus, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { findMatchableSeedSource } from '@/services/apiSeedSourceService';

interface Props {
  cropCode: string;
  seedForm: string;
  unit: string;
  generation: string | null;
  newQuantity: number;
}

type MergeState = 'idle' | 'loading' | 'matched' | 'new' | 'error';

export function MergePreview({ cropCode, seedForm, unit, generation, newQuantity }: Props) {
  const [state, setState] = useState<MergeState>('idle');
  const [data, setData] = useState<any>(null);
  const [retryKey, setRetryKey] = useState(0);  // 触发重新查询
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const query = useCallback(async (signal: AbortSignal) => {
    try {
      const result = await findMatchableSeedSource({ cropCode, seedForm, unit, generation });
      if (signal.aborted) return;
      setData(result);
      setState(result ? 'matched' : 'new');
    } catch (e: any) {
      if (signal.aborted) return;
      setState('error');
    }
  }, [cropCode, seedForm, unit, generation]);

  useEffect(() => {
    // 竞态防护：取消上一次未完成的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!cropCode || !seedForm || !unit) {
      setState('idle');
      return;
    }

    setState('loading');
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      query(controller.signal);
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cropCode, seedForm, unit, generation, retryKey, query]);

  // 占位保持高度稳定（避免布局跳动）
  if (state === 'idle' || state === 'loading') {
    return (
      <div className="h-16 flex items-center text-xs text-gray-400">
        <span className="animate-pulse">查询合并候选中...</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <Alert variant="destructive" className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <AlertDescription>
            <div className="font-medium">查询合并候选失败</div>
            <div className="text-xs mt-0.5">请检查网络后重试（不影响提交，会创建新种源）</div>
          </AlertDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRetryKey(k => k + 1)}
          className="ml-2 flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          重试
        </Button>
      </Alert>
    );
  }

  if (state === 'matched') {
    return (
      <Alert className="border-cyan-200 bg-cyan-50">
        <Layers className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
        <AlertDescription>
          <div className="font-medium text-cyan-900">将合并到已有种源</div>
          <div className="mt-1 text-sm text-cyan-700 break-all">
            <code className="font-mono">{data.sourceCode}</code>
            {' · '}当前 {data.availableCount} {data.unit}
            {' · '}已回流 {data.reflowCount ?? 0} 次
          </div>
          <div className="mt-1 text-sm text-cyan-900">
            本次新增 <strong>{newQuantity} {unit}</strong> 后 → 可用数量{' '}
            <strong className="text-lg">{(data.availableCount || 0) + newQuantity} {unit}</strong>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-cyan-700 border-cyan-300 hover:bg-cyan-100"
              onClick={() => navigate(`/seed-source/${data.id}`)}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              查看种源详情
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Plus className="w-4 h-4 text-amber-600" />
      <AlertDescription>
        <div className="font-medium text-amber-900">将创建新的种源记录</div>
        <div className="mt-1 text-sm text-amber-700">
          当前种源库中没有「{cropCode} / {seedForm}{generation ? ` / ${generation}` : ''}」的可合并记录
        </div>
        <div className="mt-1 text-xs text-amber-600">
          提交后系统会生成新种源批号（如 SRC-SS-{`{今天}`}-001）
        </div>
      </AlertDescription>
    </Alert>
  );
}