/**
 * v0.3 P0-R + P0-S：合规报告 API 服务
 *
 * 路径：
 *   GET /api/compliance-report/:batchCode         - 返回完整合规数据 JSON
 *   GET /api/compliance-report/:batchCode/download?format=json|csv - 下载文件
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface ComplianceReport {
  batchCode: string;
  generatedAt: string;
  sections: {
    batchInfo?: Record<string, unknown>;
    tasks?: Array<Record<string, unknown>>;
    operations?: Array<Record<string, unknown>>;
    harvests?: Array<Record<string, unknown>>;
    inspections?: Array<Record<string, unknown>>;
    problems?: Array<Record<string, unknown>>;
    dailyRecords?: Array<Record<string, unknown>>;
    complianceSummary?: ComplianceSummary;
  };
}

export interface ComplianceSummary {
  checksPerformed: number;
  checksPassed: number;
  checksFailed: number;
  warnings: Array<{
    pesticideCode: string;
    pesticideName: string;
    checkType: string;
    severity: 'warning' | 'critical';
    message: string;
    applicationDate?: string;
  }>;
  summary: string;
}

/**
 * 获取批次合规报告（JSON）
 */
export async function getComplianceReport(batchCode: string): Promise<ComplianceReport> {
  return enhancedApiClient.get<ComplianceReport>(
    `/compliance-report/${encodeURIComponent(batchCode)}`
  );
}

/**
 * 触发下载（前端使用 a 标签或 window.open 也可）
 */
export function getComplianceDownloadUrl(batchCode: string, format: 'json' | 'csv' = 'json'): string {
  return `/api/compliance-report/${encodeURIComponent(batchCode)}/download?format=${format}`;
}
