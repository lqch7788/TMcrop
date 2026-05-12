/**
 * 公告状态 Store - Zustand 替代 useAnnouncementStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新公告状态为已发布
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AnnouncementStatusUpdate {
  announcementId: string;
  status: 'draft' | 'pending' | 'published' | 'archived';
  updatedAt: string;
  publishedBy?: string;
}

export interface Announcement {
  id: string;
  code: string;
  title: string;
  content: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'pending' | 'published' | 'archived';
  publishTime?: string;
  expiryTime?: string;
  createdBy?: string;
  createdAt?: string;
}

interface AnnouncementStore {
  statusUpdates: Record<string, AnnouncementStatusUpdate>;
  updateAnnouncementStatus: (announcementId: string, status: AnnouncementStatusUpdate['status'], publishedBy?: string) => void;
  getAnnouncementWithStatus: (announcement: Announcement) => Announcement;
  getStatusUpdates: () => Record<string, AnnouncementStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useAnnouncementStore = create<AnnouncementStore>()(
  persist(
    (set, get) => ({
      statusUpdates: {},

      updateAnnouncementStatus: (announcementId, status, publishedBy) => {
        const update: AnnouncementStatusUpdate = {
          announcementId,
          status,
          updatedAt: new Date().toISOString(),
          publishedBy,
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [announcementId]: update },
        }));
      },

      getAnnouncementWithStatus: (announcement) => {
        const update = get().statusUpdates[announcement.id];
        return update ? { ...announcement, status: update.status } : announcement;
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    }),
    {
      name: 'announcement_status_updates',
    }
  )
);
