/**
 * v0.3 提醒引擎 API 服务
 */
import { enhancedApiClient } from '@/lib/apiClient';

export interface ReminderRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  ruleType: string;
  triggerCondition?: string;
  notificationChannels?: string;
  receiverTemplate?: string;
  isActive?: number;
  priority?: string;
  cooldownMinutes?: number;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  title: string;
  content?: string;
  ruleCode?: string;
  targetId?: string;
  targetType?: string;
  receiver_id?: string;
  priority?: string;
  status?: string;
  payload?: string;
  createdAt?: string;
}

export interface RunResult {
  dryRun: boolean;
  stats: {
    scanned: number;
    triggered: number;
    skipped_cooldown: number;
  };
  sampleReminders: Array<{
    id: string;
    title: string;
    ruleCode: string;
    targetId: string;
    targetType: string;
    receiver_id: string;
    priority: string;
    payload: Record<string, unknown>;
  }>;
}

export async function listRules(): Promise<ReminderRule[]> {
  return enhancedApiClient.get<ReminderRule[]>('/reminders/rules');
}

export async function createRule(rule: {
  rule_code: string;
  rule_name: string;
  rule_type: string;
  priority?: string;
  cooldown_minutes?: number;
  is_active?: number;
  notification_channels?: string;
}): Promise<{ id: string }> {
  // 注意：后端直接读 body 的 snake_case 字段（不经过 camelCase 中间件转换 request）
  return enhancedApiClient.post<{ id: string }>('/reminders/rules', rule);
}

export async function runReminders(dryRun = false): Promise<RunResult> {
  return enhancedApiClient.post<RunResult>(`/reminders/run${dryRun ? '?dryRun=true' : ''}`, {});
}

export async function myReminders(user_id: string, status?: string): Promise<Reminder[]> {
  // enhancedApiClient GET 不支持 params，必须 URLSearchParams 拼 URL
  const qs = new URLSearchParams();
  qs.append('user_id', user_id);
  if (status) qs.append('status', status);
  return enhancedApiClient.get<Reminder[]>(`/reminders/my?${qs.toString()}`);
}

export async function markReminderRead(id: string): Promise<void> {
  await enhancedApiClient.post<void>(`/reminders/${encodeURIComponent(id)}/read`, {});
}
