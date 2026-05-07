export class PerformanceMonitor {
    requests: any[];
    stats: {
        totalRequests: number;
        totalErrors: number;
        totalResponseTime: number;
        byEndpoint: {};
        byMethod: {};
    };
    dbStats: {
        queries: number;
        totalTime: number;
        slowQueries: never[];
    };
    /**
     * 记录API请求
     */
    recordRequest(endpoint: any, method: any, responseTime: any, statusCode: any, error?: null): void;
    /**
     * 记录数据库查询
     */
    recordDbQuery(queryTime: any, queryType?: string, sql?: string): void;
    /**
     * 清理过期记录
     */
    cleanOldRecords(now: any): void;
    /**
     * 获取性能报告
     */
    getReport(): {
        timestamp: string;
        performanceLevel: string;
        summary: {
            totalRequests: number;
            totalErrors: number;
            errorRate: string;
            avgResponseTime: string;
            requestsPerMinute: number;
        };
        thresholds: {
            fast: number;
            normal: number;
            slow: number;
            critical: number;
        };
        endpointStats: {
            endpoint: string;
            count: any;
            avgTime: number;
            errorRate: string;
            slowRate: string;
            status: string;
        }[];
        methodStats: {
            method: string;
            count: any;
            avgTime: number;
            errorRate: string;
        }[];
        recentRequests: {
            time: string;
            endpoint: any;
            method: any;
            responseTime: any;
            status: string;
        }[];
        dbStats: {
            totalQueries: number;
            avgQueryTime: string;
            slowQueries: number;
            recentSlowQueries: never[];
        };
    };
    /**
     * 获取端点状态
     */
    getEndpointStatus(data: any): "normal" | "warning" | "critical";
    /**
     * 健康检查
     */
    healthCheck(): {
        status: string;
        errorRate: string;
        avgResponseTime: string;
        issues: never[];
    };
    /**
     * 重置统计
     */
    reset(): void;
    /**
     * 保存报告到文件
     */
    saveReport(): string | null;
}
export const performanceMonitor: PerformanceMonitor;
//# sourceMappingURL=performanceMonitor.d.ts.map