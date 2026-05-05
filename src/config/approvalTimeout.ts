// ============================================================
// 审批超时与委托配置
// 文件路径：src/config/approvalTimeout.ts
// 功能：配置审批超时时间、自动升级规则和委托机制
// 所有配置从数据字典加载，禁止硬编码
// ============================================================

import { ApprovalType } from '../types/approval';

// ============================================================
// 数据字典存储键（与 dictionaryService.ts 保持一致）
// ============================================================

const DICTIONARY_STORAGE_KEY = 'yuanxingtu_dictionaries';
const TIMEOUT_CONFIG_CACHE_KEY = 'approval_timeout_config';
const DELEGATION_RULES_CACHE_KEY = 'approval_delegation_rules';

// ============================================================
// 超时阈值配置（单位：小时）
// ============================================================

export interface TimeoutConfig {
  /** 超时时间（小时） */
  timeoutHours: number;
  /** 升级时间（小时）- 超过此时间自动升级 */
  escalationHours?: number;
  /** 是否启用自动升级 */
  autoEscalation: boolean;
  /** 升级类型 */
  escalationType?: 'urgent' | 'skip_to_next' | 'notify_manager';
}

// ============================================================
// 默认超时配置（仅作为兜底，数据字典优先）
// ============================================================

const DEFAULT_TIMEOUT_CONFIGS: Record<string, TimeoutConfig> = {
  urgent: {
    timeoutHours: 4,
    escalationHours: 2,
    autoEscalation: true,
    escalationType: 'urgent',
  },
  normal: {
    timeoutHours: 48,
    escalationHours: 24,
    autoEscalation: true,
    escalationType: 'notify_manager',
  },
  hr: {
    timeoutHours: 24,
    escalationHours: 12,
    autoEscalation: true,
    escalationType: 'urgent',
  },
  finance: {
    timeoutHours: 72,
    escalationHours: 48,
    autoEscalation: true,
    escalationType: 'notify_manager',
  },
  exempt: {
    timeoutHours: 1,
    escalationHours: 0.5,
    autoEscalation: false,
  },
};

// ============================================================
// 从数据字典加载超时配置
// ============================================================

export interface LoadedTimeoutConfig {
  urgent: TimeoutConfig;
  normal: TimeoutConfig;
  hr: TimeoutConfig;
  finance: TimeoutConfig;
  exempt: TimeoutConfig;
  ultimateTimeoutHours: number;
  ultimateAction: 'auto_approve' | 'auto_reject';
}

function loadTimeoutConfigFromDictionary(): LoadedTimeoutConfig {
  try {
    const stored = localStorage.getItem(DICTIONARY_STORAGE_KEY);
    if (!stored) {
      console.warn('【超时配置】数据字典未初始化，使用默认配置');
      return getDefaultTimeoutConfig();
    }

    const dictionaries = JSON.parse(stored);
    // 统一使用 category 字段（与 dictionaryService.ts 保持一致）
    const timeoutItems = dictionaries.filter((d: any) => d.category === 'timeout_config');

    if (timeoutItems.length === 0) {
      console.warn('【超时配置】数据字典中没有超时配置，使用默认配置');
      return getDefaultTimeoutConfig();
    }

    // 转换为配置对象（统一使用 code 字段作为键，name 字段作为值）
    const configMap: Record<string, string> = {};
    timeoutItems.forEach((item: any) => {
      configMap[item.code] = item.name;
    });

    return {
      urgent: {
        timeoutHours: parseInt(configMap['urgent_timeout'] || '4', 10),
        escalationHours: parseInt(configMap['urgent_escalation'] || '2', 10),
        autoEscalation: true,
        escalationType: 'urgent',
      },
      normal: {
        timeoutHours: parseInt(configMap['normal_timeout'] || '48', 10),
        escalationHours: parseInt(configMap['normal_escalation'] || '24', 10),
        autoEscalation: true,
        escalationType: 'notify_manager',
      },
      hr: {
        timeoutHours: parseInt(configMap['hr_timeout'] || '24', 10),
        escalationHours: parseInt(configMap['hr_escalation'] || '12', 10),
        autoEscalation: true,
        escalationType: 'urgent',
      },
      finance: {
        timeoutHours: parseInt(configMap['finance_timeout'] || '72', 10),
        escalationHours: parseInt(configMap['finance_escalation'] || '48', 10),
        autoEscalation: true,
        escalationType: 'notify_manager',
      },
      exempt: {
        timeoutHours: 1,
        escalationHours: 0.5,
        autoEscalation: false,
      },
      ultimateTimeoutHours: parseInt(configMap['ultimate_timeout'] || '168', 10),
      ultimateAction: (configMap['ultimate_action'] as 'auto_approve' | 'auto_reject') || 'auto_approve',
    };
  } catch (error) {
    console.error('【超时配置】加载超时配置失败，使用默认配置', error);
    return getDefaultTimeoutConfig();
  }
}

function getDefaultTimeoutConfig(): LoadedTimeoutConfig {
  return {
    ...DEFAULT_TIMEOUT_CONFIGS,
    ultimateTimeoutHours: 168,
    ultimateAction: 'auto_approve',
  } as LoadedTimeoutConfig;
}

// ============================================================
// 获取超时配置（带缓存）
// ============================================================

let cachedTimeoutConfig: LoadedTimeoutConfig | null = null;

export function getTimeoutConfig(): LoadedTimeoutConfig {
  if (!cachedTimeoutConfig) {
    cachedTimeoutConfig = loadTimeoutConfigFromDictionary();
  }
  return cachedTimeoutConfig;
}

/**
 * 刷新超时配置缓存
 */
export function refreshTimeoutConfig(): void {
  cachedTimeoutConfig = loadTimeoutConfigFromDictionary();
}

// ============================================================
// 根据审批类型获取超时配置
// ============================================================

export function getTimeoutConfigByType(type: ApprovalType): TimeoutConfig {
  const config = getTimeoutConfig();

  // HR相关审批类型
  const hrTypes = [
    'leave', 'overtime', 'resignation', 'recruitment', 'onboarding',
    'attendance_repair', 'salary_adjustment', 'contract_renewal', 'salary_budget', 'transfer',
  ];

  // 财务相关审批类型
  const financeTypes = [
    'budget_create', 'budget_adjust',
  ];

  if (hrTypes.includes(type)) {
    return config.hr;
  }

  if (financeTypes.includes(type)) {
    return config.finance;
  }

  return config.normal;
}

// ============================================================
// 获取最终超时配置
// ============================================================

export function getUltimateTimeoutConfig(): {
  hours: number;
  action: 'auto_approve' | 'auto_reject';
} {
  const config = getTimeoutConfig();
  return {
    hours: config.ultimateTimeoutHours,
    action: config.ultimateAction,
  };
}

// ============================================================
// 超时级别
// ============================================================

export enum TimeoutLevel {
  NORMAL = 'normal',           // 正常
  WARNING = 'warning',         // 警告（超过升级时间）
  OVERDUE = 'overdue',        // 超时（超过总超时时间）
  ULTIMATE = 'ultimate',       // 最终超时（超过7天直接通过）
}

// ============================================================
// 超时检测结果
// ============================================================

export interface TimeoutCheckResult {
  /** 是否超时 */
  isTimeout: boolean;
  /** 超时级别 */
  level: TimeoutLevel;
  /** 剩余时间（小时） */
  remainingHours: number;
  /** 已等待时间（小时） */
  waitedHours: number;
  /** 是否已升级 */
  escalated: boolean;
  /** 升级原因 */
  escalationReason?: string;
}

// ============================================================
// 委托配置
// ============================================================

export interface DelegationConfig {
  /** 是否启用委托 */
  enabled: boolean;
  /** 委托人ID */
  delegatorId: string;
  /** 委托人名称 */
  delegatorName: string;
  /** 受托人ID */
  delegateeId: string;
  /** 受托人名称 */
  delegateeName: string;
  /** 委托生效日期 */
  startDate?: string;
  /** 委托结束日期 */
  endDate?: string;
  /** 委托的审批类型（为空表示全部） */
  allowedTypes?: ApprovalType[];
  /** 委托原因 */
  reason?: string;
}

// ============================================================
// 委托规则
// ============================================================

export interface DelegationRule {
  /** 委托人角色 */
  fromRole: string;
  /** 受托人角色 */
  toRole: string;
  /** 是否启用 */
  enabled: boolean;
  /** 备注 */
  remark?: string;
}

// ============================================================
// 从数据字典加载委托规则
// ============================================================

function loadDelegationRulesFromDictionary(): DelegationRule[] {
  try {
    const stored = localStorage.getItem(DICTIONARY_STORAGE_KEY);
    if (!stored) {
      console.warn('【委托规则】数据字典未初始化，使用默认规则');
      return getDefaultDelegationRules();
    }

    const dictionaries = JSON.parse(stored);
    // 统一使用 category 字段（与 dictionaryService.ts 保持一致）
    const delegationItems = dictionaries.filter((d: any) => d.category === 'delegation_rule');

    if (delegationItems.length === 0) {
      console.warn('【委托规则】数据字典中没有委托规则，使用默认规则');
      return getDefaultDelegationRules();
    }

    // 转换为规则对象（使用 code 字段作为规则标识，name 字段作为描述）
    return delegationItems.map((item: any) => {
      // code 格式为 "from_role:to_role"
      const [fromRole, toRole] = item.code.split(':');
      return {
        fromRole,
        toRole,
        enabled: true,
        remark: item.name,
      };
    });
  } catch (error) {
    console.error('【委托规则】加载委托规则失败，使用默认规则', error);
    return getDefaultDelegationRules();
  }
}

function getDefaultDelegationRules(): DelegationRule[] {
  return [
    { fromRole: 'manager', toRole: 'department_head', enabled: true, remark: '经理外出时委托给部门主管' },
    { fromRole: 'department_head', toRole: 'manager', enabled: true, remark: '部门主管外出时委托给经理' },
    { fromRole: 'director', toRole: 'manager', enabled: true, remark: '总监外出时委托给经理' },
    { fromRole: 'hr', toRole: 'hr_manager', enabled: true, remark: '人事专员外出时委托给人事经理' },
  ];
}

// ============================================================
// 获取委托规则（带缓存）
// ============================================================

let cachedDelegationRules: DelegationRule[] | null = null;

export function getDelegationRules(): DelegationRule[] {
  if (!cachedDelegationRules) {
    cachedDelegationRules = loadDelegationRulesFromDictionary();
  }
  return cachedDelegationRules;
}

/**
 * 刷新委托规则缓存
 */
export function refreshDelegationRules(): void {
  cachedDelegationRules = loadDelegationRulesFromDictionary();
}

// ============================================================
// 超时自动处理策略
// ============================================================

export enum TimeoutAction {
  ESCALATE = 'escalate',           // 升级给更高层级
  AUTO_APPROVE = 'auto_approve',  // 自动通过
  AUTO_REJECT = 'auto_reject',    // 自动拒绝
  NOTIFY = 'notify',               // 发送通知
  SKIP = 'skip',                  // 跳过当前审批人
}

// ============================================================
// 检查是否应该执行超时动作
// ============================================================

export function shouldExecuteTimeoutAction(
  waitedHours: number,
  config: TimeoutConfig,
  action: TimeoutAction
): boolean {
  const ultimateConfig = getUltimateTimeoutConfig();

  switch (action) {
    case TimeoutAction.ESCALATE:
      return config.autoEscalation && config.escalationHours !== undefined
        && waitedHours >= config.escalationHours;
    case TimeoutAction.AUTO_APPROVE:
      return waitedHours >= ultimateConfig.hours;
    case TimeoutAction.NOTIFY:
      return config.autoEscalation;
    default:
      return false;
  }
}

// ============================================================
// 获取超时动作配置
// ============================================================

export function getUltimateTimeoutAction(): TimeoutAction {
  const ultimateConfig = getUltimateTimeoutConfig();
  return ultimateConfig.action === 'auto_approve' ? TimeoutAction.AUTO_APPROVE : TimeoutAction.AUTO_REJECT;
}

// ============================================================
// 获取HR审批类型列表（用于判断）
// ============================================================

export function getHrApprovalTypes(): string[] {
  return [
    'leave', 'overtime', 'resignation', 'recruitment', 'onboarding',
    'attendance_repair', 'salary_adjustment', 'contract_renewal', 'salary_budget', 'transfer',
  ];
}

// ============================================================
// 获取财务审批类型列表（用于判断）
// ============================================================

export function getFinanceApprovalTypes(): string[] {
  return ['budget_create', 'budget_adjust'];
}
