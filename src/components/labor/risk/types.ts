// 劳动风险预警类型定义

export type AlertLevel = 'warning' | 'danger' | 'critical';

export type AlertType =
  | 'overtime'           // 超时加班
  | 'high_temp'          // 高温作业
  | 'schedule_gap'       // 排班空缺
  | 'contract_expiry'    // 合同到期
  | 'certificate_expiry' // 证件过期
  | 'turnover';          // 频繁离职

export interface RiskAlert {
  id: string;
  alertType: AlertType;
  alertTypeName: string;
  level: AlertLevel;
  title: string;
  content: string;
  staffId?: string;
  staffName?: string;
  department?: string;
  createTime: string;
  status: 'pending' | 'handled';
  handleTime?: string;
  handler?: string;
  remarks?: string;
}

// 预警类型名称映射
export const AlertTypeNames: Record<AlertType, string> = {
  overtime: '超时加班',
  high_temp: '高温作业',
  schedule_gap: '排班空缺',
  contract_expiry: '合同到期',
  certificate_expiry: '证件过期',
  turnover: '频繁离职',
};

// 预警等级名称映射
export const AlertLevelNames: Record<AlertLevel, string> = {
  warning: '一般提醒',
  danger: '需要注意',
  critical: '紧急处理',
};

// 预警等级颜色映射
export const AlertLevelColors: Record<AlertLevel, string> = {
  warning: 'warning',   // 黄色
  danger: 'destructive', // 橙色/红色
  critical: 'destructive', // 红色
};

// 筛选器类型
export interface RiskFilters {
  alertType?: AlertType;
  level?: AlertLevel;
  status?: 'pending' | 'handled';
  keyword?: string;
}
