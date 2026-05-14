/**
 * 劳动风险预警 Zustand Store
 *
 * 架构：mock种子数据 + persist（无后端API）
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RiskAlert, RiskFilters, AlertLevel } from '../components/labor/risk/types';
import { AlertTypeNames } from '../components/labor/risk/types';

// ========== Mock 种子数据 ==========
// 从 src/components/labor/risk/hooks/useRisk.ts 的 mockAlerts 复制

const MOCK_ALERTS: RiskAlert[] = [
  {
    id: '1', alertType: 'overtime', alertTypeName: AlertTypeNames.overtime,
    level: 'warning', title: '单日加班超时预警',
    content: '员工张伟今日加班时长达到10.5小时，超过规定上限10小时，请注意休息安排。',
    staffId: 'W001', staffName: '张伟', department: '生产部',
    createTime: '2026-04-04 08:30:00', status: 'pending',
  },
  {
    id: '2', alertType: 'high_temp', alertTypeName: AlertTypeNames.high_temp,
    level: 'danger', title: '高温作业预警',
    content: '温室A区当前温度36.5°C，超过35°C高温警戒线，建议减少作业时长。',
    department: '温室A区', createTime: '2026-04-04 13:00:00', status: 'pending',
  },
  {
    id: '3', alertType: 'schedule_gap', alertTypeName: AlertTypeNames.schedule_gap,
    level: 'critical', title: '排班空缺告警',
    content: '4月5日夜间班组无人排班，影响正常生产作业，请尽快安排人员。',
    department: '包装车间', createTime: '2026-04-04 14:20:00', status: 'pending',
  },
  {
    id: '4', alertType: 'contract_expiry', alertTypeName: AlertTypeNames.contract_expiry,
    level: 'warning', title: '劳动合同即将到期',
    content: '员工李娜劳动合同将于2026-05-01到期，请提前30天处理续签事宜。',
    staffId: 'W002', staffName: '李娜', department: '质检部',
    createTime: '2026-04-03 09:00:00', status: 'pending',
  },
  {
    id: '5', alertType: 'certificate_expiry', alertTypeName: AlertTypeNames.certificate_expiry,
    level: 'danger', title: '健康证即将过期',
    content: '员工王强健康证将于2026-04-10到期，请督促完成体检续期。',
    staffId: 'W003', staffName: '王强', department: '生产部',
    createTime: '2026-04-02 10:00:00', status: 'pending',
  },
  {
    id: '6', alertType: 'turnover', alertTypeName: AlertTypeNames.turnover,
    level: 'critical', title: '月离职率过高预警',
    content: '本月累计离职15人，离职率达到12.5%，超过10%警戒线，请关注人员稳定性。',
    department: '全厂', createTime: '2026-04-04 08:00:00', status: 'pending',
  },
  {
    id: '7', alertType: 'overtime', alertTypeName: AlertTypeNames.overtime,
    level: 'danger', title: '连续加班预警',
    content: '员工赵敏已连续加班5天，日均工作时长11小时，建议安排调休。',
    staffId: 'W004', staffName: '赵敏', department: '包装车间',
    createTime: '2026-04-04 17:00:00', status: 'pending',
  },
  {
    id: '8', alertType: 'certificate_expiry', alertTypeName: AlertTypeNames.certificate_expiry,
    level: 'warning', title: '特种作业证即将过期',
    content: '员工陈龙电工特种作业证将于2026-04-20到期，请及时参加复训。',
    staffId: 'W005', staffName: '陈龙', department: '设备部',
    createTime: '2026-04-01 11:00:00', status: 'handled',
    handleTime: '2026-04-02 09:00:00', handler: '刘经理',
    remarks: '已通知员工参加4月15日复训课程。',
  },
  {
    id: '9', alertType: 'contract_expiry', alertTypeName: AlertTypeNames.contract_expiry,
    level: 'danger', title: '劳动合同到期提醒',
    content: '员工孙华劳动合同将于2026-04-20到期，当前剩余20天，请尽快处理。',
    staffId: 'W006', staffName: '孙华', department: '仓储部',
    createTime: '2026-04-03 14:00:00', status: 'pending',
  },
  {
    id: '10', alertType: 'schedule_gap', alertTypeName: AlertTypeNames.schedule_gap,
    level: 'warning', title: '周末排班空缺',
    content: '4月6日-7日周末期间，质检部缺少2人排班，需协调支援。',
    department: '质检部', createTime: '2026-04-04 15:30:00', status: 'pending',
  },
  {
    id: '11', alertType: 'high_temp', alertTypeName: AlertTypeNames.high_temp,
    level: 'warning', title: '高温作业提示',
    content: '温室B区当前温度35.2°C，达到高温作业警戒线，请做好防暑措施。',
    department: '温室B区', createTime: '2026-04-04 12:00:00', status: 'handled',
    handleTime: '2026-04-04 12:30:00', handler: '值班长',
    remarks: '已开启通风设备，并安排作业人员轮换休息。',
  },
  {
    id: '12', alertType: 'turnover', alertTypeName: AlertTypeNames.turnover,
    level: 'warning', title: '部门离职率上升',
    content: '生产部本月离职率8%，较上月上升3个百分点，请关注团队稳定性。',
    department: '生产部', createTime: '2026-04-04 10:00:00', status: 'pending',
  },
];

// ========== 统计数据类型 ==========

export interface RiskStats {
  todayCount: number;
  weekCount: number;
  pendingCount: number;
  totalCount: number;
  byLevel: Record<AlertLevel, number>;
}

// ========== Store 类型 ==========

interface RiskState {
  /** 预警数据列表 */
  alerts: RiskAlert[];
  /** 筛选条件 */
  filters: RiskFilters;
  /** 加载状态 */
  isLoading: boolean;
  error: string | null;

  // 数据操作
  fetchAlerts: () => void;
  addAlert: (alert: Omit<RiskAlert, 'id'>) => void;
  handleAlert: (alertId: string, remarks: string) => void;
  updateFilters: (newFilters: Partial<RiskFilters>) => void;
  clearFilters: () => void;
}

// ========== Store 实现 ==========

export const useRiskStore = create<RiskState>()(
  persist(
    (set, get) => ({
      alerts: [],
      filters: {},
      isLoading: false,
      error: null,

      /** 初始化/刷新数据 */
      fetchAlerts: () => {
        const { alerts } = get();
        if (alerts.length === 0) {
          set({ alerts: MOCK_ALERTS });
          console.log('[RiskStore] 已初始化种子数据:', MOCK_ALERTS.length, '条预警记录');
        }
      },

      /** 新增预警 */
      addAlert: (alert) => {
        const newId = `RISK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newAlert: RiskAlert = { ...alert, id: newId };
        set((state) => ({ alerts: [...state.alerts, newAlert] }));
      },

      /** 处理预警（标记为已处理） */
      handleAlert: (alertId, remarks) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  status: 'handled' as const,
                  handleTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
                  remarks,
                }
              : alert
          ),
        }));
      },

      /** 更新筛选条件 */
      updateFilters: (newFilters) => {
        set((state) => ({ filters: { ...state.filters, ...newFilters } }));
      },

      /** 清除筛选条件 */
      clearFilters: () => {
        set({ filters: {} });
      },
    }),
    {
      name: 'risk-storage',
      partialize: (state) => ({ alerts: state.alerts }),
    }
  )
);
