// ============================================================
// 公告状态管理Store
// 文件路径：src/hooks/useAnnouncementStore.ts
// 用于审批联动：审批通过后更新公告状态为已发布
// 已迁移到 Zustand Store (src/stores/useAnnouncementStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { useAnnouncementStore as useZustandAnnouncementStore } from '../stores/useAnnouncementStore';

export type { AnnouncementStatusUpdate, Announcement } from '../stores/useAnnouncementStore';

export function useAnnouncementStore() {
  const store = useZustandAnnouncementStore();

  return {
    updateAnnouncementStatus: store.updateAnnouncementStatus,
    getAnnouncementWithStatus: store.getAnnouncementWithStatus,
    getStatusUpdates: store.getStatusUpdates,
    refresh: () => {},
    refreshKey: 0,
  };
}

export { updateAnnouncementStatus, getAnnouncementWithStatus, getStatusUpdates } from '../stores/useAnnouncementStore';
