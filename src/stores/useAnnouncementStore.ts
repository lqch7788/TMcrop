/**
 * 公告 Store - 统一管理公告数据和审批联动状态
 * 数据获取：从 /api/announcements 获取公告列表
 * 审批联动：审批通过后更新公告状态为已发布
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

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

/** API 返回的原始公告数据结构（snake_case，从 SQLite announcements 表） */
export interface ApiAnnouncement {
  id: string;
  code: string;
  title: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  sender: string;
  date: string;
  deadline: string;
  read_count: number;
  recipients: string;
  content: string;
  create_time: string;
  update_time: string;
}

interface AnnouncementStore {
  // 公告数据列表（从API获取）
  announcements: ApiAnnouncement[];
  isLoading: boolean;
  error: string | null;

  // 审批联动状态
  statusUpdates: Record<string, AnnouncementStatusUpdate>;

  // Actions - 数据获取
  fetchAnnouncements: () => Promise<void>;

  // Actions - 审批联动
  updateAnnouncementStatus: (announcementId: string, status: AnnouncementStatusUpdate['status'], publishedBy?: string) => void;
  getAnnouncementWithStatus: (announcement: Announcement) => Announcement;
  getStatusUpdates: () => Record<string, AnnouncementStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useAnnouncementStore = create<AnnouncementStore>()(
  (set, get)=> ({
      // 公告数据
      announcements: [],
      isLoading: false,
      error: null,

      // 审批联动状态
      statusUpdates: {},

      // 从API获取公告列表
      fetchAnnouncements: async () => {
        set({ isLoading: true, error: null });
        try {
          // enhancedApiClient.get 返回 result.data（数组），不是完整的 { success, data } 响应
          const data = await enhancedApiClient.get<ApiAnnouncement[]>(
            '/announcements',
            {}
          );
          if (Array.isArray(data)) {
            set({ announcements: data, isLoading: false });
          } else {
            set({ isLoading: false });
            console.warn('[AnnouncementStore] API返回数据无效');
          }
        } catch (err) {
          console.warn('[AnnouncementStore] 获取公告失败，API 失败抛错（V2.1 铁律：无缓存兜底）:', err);
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      // 审批联动：更新公告状态
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
    })
);
