/**
 * v0.3 P0-B：纸单兜底 API 服务
 *
 * 路径：
 *   POST /api/paper-report          - 单条纸单
 *   POST /api/paper-report/batch    - 批量纸单
 *   GET  /api/paper-report/templates - 纸单模板
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface PaperReportItem {
  operationType: string;
  operationDate: string;
  operatorName: string;
  greenhouseName?: string;
  batchCode?: string;
  duration?: number;
  workload?: number;
  unit?: string;
  workers?: number;
  pesticideCode?: string;
  pesticideName?: string;
  dosage?: string;
  remarks?: string;
  paperBatchNo: string;
  paperReporterId: string;
}

export interface PaperReportResult {
  recordId: string;
  recordCode: string;
  message: string;
}

export interface PaperBatchResult {
  results: Array<{
    paperBatchNo: string;
    success: boolean;
    recordId?: string;
    error?: string;
  }>;
  totalSubmitted: number;
  totalSuccess: number;
  totalFailed: number;
}

export interface PaperTemplate {
  operationType: string;
  operationTypeName: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'date' | 'text' | 'number' | 'textarea';
    required: boolean;
  }>;
}

/**
 * 单条纸单录入
 */
export async function submitPaperReport(item: PaperReportItem): Promise<PaperReportResult> {
  return enhancedApiClient.post<PaperReportResult>('/paper-report', item);
}

/**
 * 批量纸单录入
 */
export async function submitBatchPaperReports(
  items: PaperReportItem[]
): Promise<PaperBatchResult> {
  return enhancedApiClient.post<PaperBatchResult>('/paper-report/batch', { items });
}

/**
 * 获取纸单模板
 * 注意：enhancedApiClient 已自动解包 data，不能 .data 二层访问（api-client-response-unwrapping 教训）
 */
export async function getPaperTemplates(): Promise<PaperTemplate[]> {
  return enhancedApiClient.get<PaperTemplate[]>('/paper-report/templates');
}
