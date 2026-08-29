/**
 * IoT 摄像头 Store（2026-08-29）
 */

import { create } from 'zustand';
import { getIotCameras, IotCamera } from '@/services/apiIotCamerasService';

interface IotCameraState {
  cameras: IotCamera[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetchCameras: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const CACHE_TTL = 10 * 60 * 1000;

export const useIotCameraStore = create<IotCameraState>()((set, get) => ({
  cameras: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchCameras: async (force = false) => {
    const { lastFetch, cameras } = get();
    if (!force && lastFetch && cameras.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await getIotCameras();
      set({ cameras: data, loading: false, error: null, lastFetch: Date.now() });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },

  refresh: async () => {
    await get().fetchCameras(true);
  },
}));