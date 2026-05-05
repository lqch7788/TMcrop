/**
 * 性能监控服务类型声明
 */

interface PerformanceReport {
  summary: {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgResponseTime: number;
  };
  endpointStats: Record<string, unknown>;
  dbStats: Record<string, unknown>;
  performanceLevel: string;
}

interface PerformanceMonitor {
  getReport(): PerformanceReport;
  healthCheck(): Record<string, unknown>;
  reset(): void;
}

interface CircuitBreakerManager {
  getAllStatus(): Record<string, unknown>;
}

declare module '../../services/performanceMonitor' {
  export const performanceMonitor: PerformanceMonitor;
}

declare module '../../middleware/circuitBreaker' {
  export const circuitBreakerManager: CircuitBreakerManager;
}
