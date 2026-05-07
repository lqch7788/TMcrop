export class CircuitBreaker {
    constructor(name: any, options?: {});
    name: any;
    config: {
        failureRateThreshold: number;
        responseTimeThreshold: number;
        consecutiveFailureThreshold: number;
        circuitDuration: number;
        halfOpenRequests: number;
        windowSize: number;
        minimumRequests: number;
    };
    state: string;
    successCount: number;
    lastFailureTime: number | null;
    halfOpenRequestsAllowed: number;
    halfOpenRequestsSucceeded: number;
    stats: {
        totalRequests: number;
        totalFailures: number;
        totalSuccesses: number;
        averageResponseTime: number;
        totalResponseTime: number;
        rejectedRequests: number;
        stateChanges: never[];
    };
    requestWindow: any[];
    stateChangeTimers: {};
    /**
     * 记录请求结果
     * @param {boolean} success - 是否成功
     * @param {number} responseTime - 响应时间(毫秒)
     */
    recordRequest(success: boolean, responseTime: number): void;
    failureCount: number | undefined;
    /**
     * 清理过期记录
     */
    cleanOldRecords(now: any): void;
    /**
     * 评估熔断器状态
     */
    evaluateState(): void;
    /**
     * 判断是否应该打开熔断器
     */
    shouldOpen(): boolean;
    /**
     * 切换状态
     */
    transitionTo(newState: any): void;
    /**
     * 获取状态转换原因
     */
    getTransitionReason(from: any, to: any): "" | "失败率过高或响应过慢" | "熔断时间结束，尝试恢复" | "健康检查通过" | "健康检查失败";
    /**
     * 检查是否允许请求
     */
    canExecute(): boolean;
    /**
     * 获取健康状态
     */
    isHealthy(): boolean;
    /**
     * 获取状态摘要
     */
    getStatus(): {
        name: any;
        state: string;
        stats: {
            totalRequests: number;
            totalFailures: number;
            totalSuccesses: number;
            averageResponseTime: number;
            rejectedRequests: number;
            recentRequests: number;
            recentFailures: number;
            failureRate: string;
        };
        lastFailureTime: string | null;
        stateChanges: never[];
    };
    /**
     * 重置熔断器
     */
    reset(): void;
}
export class CircuitBreakerManager {
    breakers: Map<any, any>;
    /**
     * 获取或创建熔断器
     */
    getBreaker(name: any, options: any): any;
    /**
     * 获取所有熔断器状态
     */
    getAllStatus(): {};
    /**
     * 健康检查
     */
    healthCheck(): {
        status: string;
        timestamp: string;
        breakers: {};
    };
    /**
     * 重置所有熔断器
     */
    resetAll(): void;
}
export const circuitBreakerManager: CircuitBreakerManager;
export namespace STATES {
    let CLOSED: string;
    let OPEN: string;
    let HALF_OPEN: string;
}
//# sourceMappingURL=circuitBreaker.d.ts.map