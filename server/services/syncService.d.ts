/**
 * 同步服务主类
 */
export class SyncService {
    deviceRegistry: DeviceRegistry;
    changeTracker: ChangeTracker;
    conflictResolver: ConflictResolver;
    /**
     * 注册设备
     */
    registerDevice(deviceId: any, deviceInfo: any): any;
    /**
     * 获取同步状态
     */
    getSyncStatus(deviceId: any): {
        deviceId: any;
        lastSync: any;
        pendingChanges: number;
        registeredDevices: any;
        timestamp: string;
    };
    /**
     * 请求同步
     */
    requestSync(deviceId: any, options?: {}): {
        success: boolean;
        data: {
            lastSync: string;
            changes: any[];
            conflicts: {
                tableName: any;
                recordId: any;
                resolution: {
                    resolved: boolean;
                    winner: null;
                    loser?: undefined;
                    merged?: undefined;
                } | {
                    resolved: boolean;
                    winner: any;
                    loser: any;
                    merged?: undefined;
                } | {
                    resolved: boolean;
                    winner: any;
                    loser: null;
                    merged: boolean;
                };
            }[];
            hasMore: boolean;
        };
    };
    /**
     * 提交客户端变更
     */
    submitChanges(deviceId: any, changes: any): {
        success: boolean;
        results: ({
            success: boolean;
            change: any;
            error?: undefined;
        } | {
            success: boolean;
            error: any;
            change: any;
        })[];
        timestamp: string;
    };
    /**
     * 记录服务端变更
     */
    recordServerChange(tableName: any, recordId: any, operation: any, oldValue: any, newValue: any): any;
}
export const syncService: SyncService;
/**
 * 设备注册记录
 */
export class DeviceRegistry {
    devices: any;
    loadDevices(): any;
    saveDevices(): void;
    /**
     * 注册新设备
     */
    registerDevice(deviceId: any, deviceInfo: any): any;
    /**
     * 获取设备列表
     */
    getDevices(userId: any): any;
    /**
     * 更新设备最后同步时间
     */
    updateLastSync(deviceId: any, syncTime: any): void;
    /**
     * 获取设备最后同步时间
     */
    getLastSync(deviceId: any): any;
}
/**
 * 变更记录
 */
export class ChangeTracker {
    changes: any[];
    maxChanges: number;
    /**
     * 记录数据变更
     */
    recordChange(deviceId: any, tableName: any, recordId: any, operation: any, oldValue: any, newValue: any, timestamp: any): any;
    /**
     * 获取未同步的变更
     */
    getUnsyncedChanges(deviceId: any, since: any): any[];
    /**
     * 标记变更已同步
     */
    markSynced(changeIds: any): void;
    /**
     * 获取设备的变更历史
     */
    getDeviceChanges(deviceId: any, tableName: any, since: any): any[];
    generateId(): string;
}
/**
 * 冲突检测与解决
 */
export class ConflictResolver {
    constructor(strategy?: string);
    strategy: string;
    /**
     * 检测冲突
     */
    detectConflict(localChange: any, serverChange: any): boolean;
    /**
     * 解决冲突
     */
    resolve(localChange: any, serverChange: any): {
        resolved: boolean;
        winner: null;
        loser?: undefined;
        merged?: undefined;
    } | {
        resolved: boolean;
        winner: any;
        loser: any;
        merged?: undefined;
    } | {
        resolved: boolean;
        winner: any;
        loser: null;
        merged: boolean;
    };
    /**
     * 合并变更
     */
    mergeChanges(localChange: any, serverChange: any): any;
}
export namespace CONFIG {
    let SYNC_FILE: string;
    namespace CONFLICT_STRATEGIES {
        let LAST_WRITE_WINS: string;
        let SERVER_WINS: string;
        let CLIENT_WINS: string;
        let MERGE: string;
    }
    let defaultConflictStrategy: string;
}
//# sourceMappingURL=syncService.d.ts.map