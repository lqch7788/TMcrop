/**
 * IoT 摄像头 API Service（2026-08-29）
 */

import { enhancedApiClient } from '../lib/apiClient';

export type CameraStatus = 'running' | 'idle' | 'offline' | 'alarm';

export interface IotCameraRaw {
  id: string;
  deviceCode: string;
  deviceName: string;
  location: string | null;
  base: string | null;
  crop: string | null;
  variety: string | null;
  stage: string | null;
  airTemp: string | null;
  airHumi: string | null;
  soilTemp: string | null;
  soilHumi: string | null;
  light: string | null;
  status: CameraStatus;
  isOnline: number;
  streamStatus: string | null;
  channel: number | null;
  updateTime: string | null;
  createdAt?: string;
}

export interface IotCamera {
  id: string;
  deviceCode: string;
  deviceName: string;
  location: string;
  base: string;
  crop: string;
  variety: string;
  stage: string;
  airTemp: string;
  airHumi: string;
  soilTemp: string;
  soilHumi: string;
  light: string;
  status: CameraStatus;
  isOnline: boolean;
  streamStatus: string;
  channel: number;
  updateTime: string;
}

function normalize(raw: IotCameraRaw): IotCamera {
  return {
    id: raw.id,
    deviceCode: raw.deviceCode,
    deviceName: raw.deviceName,
    location: raw.location ?? '',
    base: raw.base ?? '',
    crop: raw.crop ?? '-',
    variety: raw.variety ?? '-',
    stage: raw.stage ?? '-',
    airTemp: raw.airTemp ?? '-',
    airHumi: raw.airHumi ?? '-',
    soilTemp: raw.soilTemp ?? '-',
    soilHumi: raw.soilHumi ?? '-',
    light: raw.light ?? '-',
    status: raw.status,
    isOnline: raw.isOnline === 1,
    streamStatus: raw.streamStatus ?? 'loading',
    channel: raw.channel ?? 0,
    updateTime: raw.updateTime ?? '',
  };
}

export async function getIotCameras(): Promise<IotCamera[]> {
  const raws = await enhancedApiClient.get<IotCameraRaw[]>('/iot-cameras');
  return raws.map(normalize);
}