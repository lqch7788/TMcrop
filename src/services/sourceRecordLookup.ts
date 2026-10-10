/**
 * 补录入库"源行"查找服务（2026-10-10）
 *
 * 背景：AddStockModal（补录入库模式）需要列出"已结束"的育苗/种植行供选择。
 *   此前组件内直接动态 import enhancedApiClient 直连 /seedlings、/plantings（违反 V2.1 铁律：
 *   组件 → Store/Service → enhancedApiClient → API）。现抽到 service 层，行为保持不变：
 *   - 仍请求 /seedlings?page=1&pageSize=200 与 /plantings?page=1&pageSize=200
 *   - 仍按"行级流程已关闭"过滤（育苗 completed/transplanted；种植 ended/cancelled）
 *   - 返回后端原始行（raw），UI 侧按需读取字段（与抽取前完全一致）
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface EndedSourceRow {
  /** 来源模块（决定后续读 seedlingCode 还是 plantCode） */
  module: 'seedling' | 'planting';
  /** 后端原始行（字段保持后端口径） */
  raw: Record<string, any>;
}

/** 拉取"已结束"的育苗/种植源行（供补录下拉） */
export async function fetchEndedSourceRows(): Promise<EndedSourceRow[]> {
  const query = new URLSearchParams({ page: '1', pageSize: '200' }).toString();
  const [seedlingRes, plantingRes] = await Promise.all([
    enhancedApiClient.get<any[]>(`/seedlings?${query}`),
    enhancedApiClient.get<any[]>(`/plantings?${query}`),
  ]);
  // enhancedApiClient 已自动解包 result.data（per memory api-client-response-unwrapping）
  const extractItems = (res: any): any[] =>
    Array.isArray(res) ? res : ((res as any)?.data?.items || (res as any)?.data || []);

  // 过滤：只保留流程已关闭的（育苗表与种植表枚举不同）
  const isEnded = (it: any, module: string) =>
    module === 'seedling'
      ? (it.status === 'completed' || it.status === 'transplanted')
      : (it.status === 'ended' || it.status === 'cancelled');

  const out: EndedSourceRow[] = [];
  for (const it of extractItems(seedlingRes)) {
    if (isEnded(it, 'seedling')) out.push({ module: 'seedling', raw: it });
  }
  for (const it of extractItems(plantingRes)) {
    if (isEnded(it, 'planting')) out.push({ module: 'planting', raw: it });
  }
  return out;
}
