/**
 * 同步管理器 - SyncManager
 *
 * 后台运行，检测API可用性并执行数据同步
 * 仅在SYNC模式下启用
 */

import { DATA_SOURCE_CONFIG, DataMode } from '../config/dataSourceConfig';
import { dataRouter } from './dataRouter';
import { logger } from '../lib/logger';

class SyncManager {
  private apiAvailable = false;
  private syncing = false;
  private checkTimer: number | null = null;
  private syncTimer: number | null = null;

  /**
   * 启动同步管理器
   */
  start(): void {
    if (DATA_SOURCE_CONFIG.mode === DataMode.OFFLINE) {
      console.log('[SyncManager] OFFLINE模式，不启动同步');
      return;
    }

    if (DATA_SOURCE_CONFIG.mode === DataMode.API_ONLY) {
      console.log('[SyncManager] API_ONLY模式，不启动同步');
      return;
    }

    console.log('[SyncManager] 启动 (SYNC模式)');
    this.checkApiAvailability();
    this.startTimers();
  }

  /**
   * 停止同步管理器
   */
  stop(): void {
    this.stopTimers();
    console.log('[SyncManager] 已停止');
  }

  private startTimers(): void {
    // API可用性检测
    this.checkTimer = window.setInterval(
      () => this.checkApiAvailability(),
      DATA_SOURCE_CONFIG.apiCheckInterval
    );

    // 定期同步
    this.syncTimer = window.setInterval(
      () => this.syncIfNeeded(),
      DATA_SOURCE_CONFIG.syncInterval
    );

    // 网络状态变化监听
    window.addEventListener('online', () => this.onNetworkOnline());
    window.addEventListener('offline', () => this.onNetworkOffline());
  }

  private stopTimers(): void {
    if (this.checkTimer) {
      window.clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.syncTimer) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    window.removeEventListener('online', () => this.onNetworkOnline());
    window.removeEventListener('offline', () => this.onNetworkOffline());
  }

  private async checkApiAvailability(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${DATA_SOURCE_CONFIG.apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (!this.apiAvailable) {
          console.log('[SyncManager] API已恢复');
          this.apiAvailable = true;
          // API恢复时立即同步
          this.syncIfNeeded();
        }
      } else {
        this.setApiUnavailable();
      }
    } catch {
      this.setApiUnavailable();
    }
  }

  private setApiUnavailable(): void {
    if (this.apiAvailable) {
      console.log('[SyncManager] API不可用');
      this.apiAvailable = false;
    }
  }

  private onNetworkOnline(): void {
    console.log('[SyncManager] 网络恢复');
    this.checkApiAvailability();
  }

  private onNetworkOffline(): void {
    console.log('[SyncManager] 网络断开');
    this.apiAvailable = false;
  }

  private async syncIfNeeded(): Promise<void> {
    if (!this.apiAvailable || this.syncing) {
      return;
    }

    const pending = dataRouter.getPendingChanges();
    if (pending.length === 0) {
      return;
    }

    await this.performSync(pending.map(p => p.id));
  }

  private async performSync(changeIds: string[]): Promise<void> {
    this.syncing = true;

    try {
      console.log(`[SyncManager] 同步 ${changeIds.length} 条变更`);

      // TODO: 实现实际的API同步逻辑
      // 目前模拟同步成功
      await new Promise(resolve => setTimeout(resolve, 500));

      dataRouter.markSynced(changeIds);
      console.log(`[SyncManager] 同步成功`);
    } catch (error) {
      logger.error('[SyncManager] 同步失败', error);
    } finally {
      this.syncing = false;
    }
  }

  /**
   * 强制触发同步
   */
  async forceSync(): Promise<void> {
    if (!navigator.onLine) {
      console.warn('[SyncManager] 网络不可用，无法同步');
      return;
    }

    await this.checkApiAvailability();

    if (this.apiAvailable) {
      await this.syncIfNeeded();
    }
  }

  /**
   * 获取同步状态
   */
  getStatus() {
    return {
      apiAvailable: this.apiAvailable,
      syncing: this.syncing,
      pendingCount: dataRouter.getPendingChanges().length,
      online: navigator.onLine,
      mode: DATA_SOURCE_CONFIG.mode,
    };
  }
}

export const syncManager = new SyncManager();
