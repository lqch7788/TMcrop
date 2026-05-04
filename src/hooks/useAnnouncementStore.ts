// ============================================================
// 公告状态管理Store
// 文件路径：src/hooks/useAnnouncementStore.ts
// 用于审批联动：审批通过后更新公告状态为已发布
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'announcement_status_updates';

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

function getStatusUpdates(): Record<string, AnnouncementStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatusUpdate(update: AnnouncementStatusUpdate): void {
  const updates = getStatusUpdates();
  updates[update.announcementId] = update;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

export function updateAnnouncementStatus(
  announcementId: string,
  status: AnnouncementStatusUpdate['status'],
  publishedBy?: string
): void {
  const update: AnnouncementStatusUpdate = {
    announcementId,
    status,
    updatedAt: new Date().toISOString(),
    publishedBy,
  };
  saveStatusUpdate(update);
  window.dispatchEvent(new CustomEvent('announcementStatusChanged', {
    detail: { announcementId, status }
  }));
}

export function getAnnouncementWithStatus(announcement: Announcement): Announcement {
  const updates = getStatusUpdates();
  const update = updates[announcement.id];
  if (update) {
    return { ...announcement, status: update.status };
  }
  return announcement;
}

export function useAnnouncementStore() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleChange = () => refresh();
    window.addEventListener('announcementStatusChanged', handleChange);
    return () => window.removeEventListener('announcementStatusChanged', handleChange);
  }, [refresh]);

  return {
    updateAnnouncementStatus,
    getAnnouncementWithStatus,
    getStatusUpdates,
    refresh,
    refreshKey,
  };
}
