/**
 * 同步服务类型声明
 */

interface SyncService {
  registerDevice(deviceId: string, deviceInfo: Record<string, unknown>): unknown;
  getSyncStatus(deviceId: string): unknown;
  requestSync(deviceId: string, options: {
    since?: string;
    tables?: string[];
    conflictStrategy?: string;
  }): unknown;
  submitChanges(deviceId: string, changes: unknown[]): unknown;
}

declare module '../../services/syncService' {
  export const syncService: SyncService;
}
