/**
 * 性能监控服务
 * 监控API响应时间、错误率、数据库性能等指标
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 响应时间阈值（毫秒）
  thresholds: {
    fast: 100,      // < 100ms 优秀
    normal: 300,    // < 300ms 正常
    slow: 500,      // < 500ms 警告
    critical: 1000  // >= 1000ms 严重
  },

  // 错误率阈值
  errorRateThreshold: 0.05, // 5%

  // 时间窗口（毫秒）
  windowSize: 60 * 1000, // 1分钟
};

class PerformanceMonitor {
  constructor() {
    // 请求记录
    this.requests = [];

    // 统计信息
    this.stats = {
      totalRequests: 0,
      totalErrors: 0,
      totalResponseTime: 0,
      byEndpoint: {},
      byMethod: {},
    };

    // 数据库查询统计
    this.dbStats = {
      queries: 0,
      totalTime: 0,
      slowQueries: [],
    };
  }

  /**
   * 记录API请求
   */
  recordRequest(endpoint, method, responseTime, statusCode, error = null) {
    const now = Date.now();

    // 清理过期记录
    this.cleanOldRecords(now);

    // 记录请求
    this.requests.push({
      time: now,
      endpoint,
      method,
      responseTime,
      statusCode,
      error: error ? error.message : null,
    });

    // 更新统计
    this.stats.totalRequests++;
    this.stats.totalResponseTime += responseTime;

    if (statusCode >= 400 || error) {
      this.stats.totalErrors++;
    }

    // 按端点统计
    if (!this.stats.byEndpoint[endpoint]) {
      this.stats.byEndpoint[endpoint] = {
        count: 0,
        totalTime: 0,
        errors: 0,
        slowCount: 0,
      };
    }
    this.stats.byEndpoint[endpoint].count++;
    this.stats.byEndpoint[endpoint].totalTime += responseTime;
    if (statusCode >= 400 || error) {
      this.stats.byEndpoint[endpoint].errors++;
    }
    if (responseTime >= CONFIG.thresholds.slow) {
      this.stats.byEndpoint[endpoint].slowCount++;
    }

    // 按方法统计
    if (!this.stats.byMethod[method]) {
      this.stats.byMethod[method] = {
        count: 0,
        totalTime: 0,
        errors: 0,
      };
    }
    this.stats.byMethod[method].count++;
    this.stats.byMethod[method].totalTime += responseTime;
    if (statusCode >= 400 || error) {
      this.stats.byMethod[method].errors++;
    }
  }

  /**
   * 记录数据库查询
   */
  recordDbQuery(queryTime, queryType = 'SELECT', sql = '') {
    this.dbStats.queries++;
    this.dbStats.totalTime += queryTime;

    if (queryTime >= CONFIG.thresholds.slow) {
      this.dbStats.slowQueries.push({
        time: Date.now(),
        queryTime,
        queryType,
        sql: sql.substring(0, 200), // 截断SQL
      });

      // 保留最近10条慢查询
      if (this.dbStats.slowQueries.length > 10) {
        this.dbStats.slowQueries.shift();
      }
    }
  }

  /**
   * 清理过期记录
   */
  cleanOldRecords(now) {
    const cutoff = now - CONFIG.windowSize;
    this.requests = this.requests.filter(r => r.time > cutoff);
  }

  /**
   * 获取性能报告
   */
  getReport() {
    const now = Date.now();
    this.cleanOldRecords(now);

    // 计算平均响应时间
    const avgResponseTime = this.stats.totalRequests > 0
      ? this.stats.totalResponseTime / this.stats.totalRequests
      : 0;

    // 计算错误率
    const errorRate = this.stats.totalRequests > 0
      ? this.stats.totalErrors / this.stats.totalRequests
      : 0;

    // 按端点计算统计
    const endpointStats = Object.entries(this.stats.byEndpoint).map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      errorRate: data.count > 0 ? (data.errors / data.count * 100).toFixed(1) + '%' : '0%',
      slowRate: data.count > 0 ? (data.slowCount / data.count * 100).toFixed(1) + '%' : '0%',
      status: this.getEndpointStatus(data),
    }));

    // 按方法统计
    const methodStats = Object.entries(this.stats.byMethod).map(([method, data]) => ({
      method,
      count: data.count,
      avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      errorRate: data.count > 0 ? (data.errors / data.count * 100).toFixed(1) + '%' : '0%',
    }));

    // 最近请求分布
    const recentRequests = this.requests.slice(-20).map(r => ({
      time: new Date(r.time).toISOString(),
      endpoint: r.endpoint,
      method: r.method,
      responseTime: r.responseTime,
      status: r.statusCode >= 400 ? 'error' : r.responseTime < CONFIG.thresholds.normal ? 'fast' : 'normal',
    }));

    // 性能等级
    let performanceLevel = '优秀';
    if (avgResponseTime >= CONFIG.thresholds.critical || errorRate >= CONFIG.errorRateThreshold) {
      performanceLevel = '严重';
    } else if (avgResponseTime >= CONFIG.thresholds.slow || errorRate >= CONFIG.errorRateThreshold * 0.5) {
      performanceLevel = '警告';
    } else if (avgResponseTime >= CONFIG.thresholds.normal) {
      performanceLevel = '一般';
    }

    return {
      timestamp: new Date().toISOString(),
      performanceLevel,
      summary: {
        totalRequests: this.stats.totalRequests,
        totalErrors: this.stats.totalErrors,
        errorRate: (errorRate * 100).toFixed(2) + '%',
        avgResponseTime: Math.round(avgResponseTime) + 'ms',
        requestsPerMinute: Math.round(this.stats.totalRequests),
      },
      thresholds: CONFIG.thresholds,
      endpointStats,
      methodStats,
      recentRequests,
      dbStats: {
        totalQueries: this.dbStats.queries,
        avgQueryTime: this.dbStats.queries > 0 ? Math.round(this.dbStats.totalTime / this.dbStats.queries) + 'ms' : '0ms',
        slowQueries: this.dbStats.slowQueries.length,
        recentSlowQueries: this.dbStats.slowQueries.slice(-5),
      },
    };
  }

  /**
   * 获取端点状态
   */
  getEndpointStatus(data) {
    const errorRate = data.errors / data.count;
    const slowRate = data.slowCount / data.count;

    if (errorRate >= CONFIG.errorRateThreshold || slowRate >= 0.3) {
      return 'critical';
    }
    if (errorRate >= CONFIG.errorRateThreshold * 0.5 || slowRate >= 0.15) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * 健康检查
   */
  healthCheck() {
    const errorRate = this.stats.totalRequests > 0
      ? this.stats.totalErrors / this.stats.totalRequests
      : 0;

    const avgResponseTime = this.stats.totalRequests > 0
      ? this.stats.totalResponseTime / this.stats.totalRequests
      : 0;

    const isHealthy = errorRate < CONFIG.errorRateThreshold
      && avgResponseTime < CONFIG.thresholds.slow;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      errorRate: (errorRate * 100).toFixed(2) + '%',
      avgResponseTime: Math.round(avgResponseTime) + 'ms',
      issues: [],
    };
  }

  /**
   * 重置统计
   */
  reset() {
    this.requests = [];
    this.stats = {
      totalRequests: 0,
      totalErrors: 0,
      totalResponseTime: 0,
      byEndpoint: {},
      byMethod: {},
    };
    this.dbStats = {
      queries: 0,
      totalTime: 0,
      slowQueries: [],
    };
    console.log('[PerformanceMonitor] 统计已重置');
  }

  /**
   * 保存报告到文件
   */
  saveReport() {
    const report = this.getReport();
    const reportPath = path.join(__dirname, '../data/performance_report.json');

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      return reportPath;
    } catch (error) {
      console.error('[PerformanceMonitor] 保存报告失败:', error.message);
      return null;
    }
  }
}

// 导出单例
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  performanceMonitor,
};
