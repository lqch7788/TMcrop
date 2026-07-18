/**
 * 合并预览组件（2026-07-18）
 * 实时查询合并候选，4 种状态：matched / new / loading / error
 * 用 AbortController 防竞态
 */

import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui';
import { Layers, Plus, AlertCircle } from 'lucide-react';
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
  const abortRef = useRef<AbortController | null>(null);

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

    const timer = setTimeout(async () => {
      try {
        const result = await findMatchableSeedSource({
          cropCode, seedForm, unit, generation,
        });
        if (controller.signal.aborted) return;
        setData(result);
        setState(result ? 'matched' : 'new');
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setState('error');
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cropCode, seedForm, unit, generation]);

  // 占位保持高度稳定
  if (state === 'idle' || state === 'loading') return <div className="h-16" />;

  if (state === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>查询合并候选失败（不影响提交）</AlertDescription>
      </Alert>
    );
  }

  if (state === 'matched') {
    return (
      <Alert className="border-cyan-200 bg-cyan-50">
        <Layers className="w-4 h-4 text-cyan-600" />
        <AlertDescription>
          <div className="font-medium text-cyan-900">将合并到已有种源</div>
          <div className="mt-1 text-sm text-cyan-700">
            <code className="font-mono">{data.sourceCode}</code>
            {' · '}当前 {data.availableCount} {data.unit}
            {' · '}已回流 {data.reflowCount ?? 0} 次
          </div>
          <div className="mt-1 text-sm text-cyan-900">
            本次新增 <strong>{newQuantity} {unit}</strong> 后 → 可用数量{' '}
            <strong className="text-lg">{(data.availableCount || 0) + newQuantity} {unit}</strong>
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
      </AlertDescription>
    </Alert>
  );
}