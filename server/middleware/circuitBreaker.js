/**
 * 熔断机制 (Circuit Breaker)
 * Phase 2: 防止故障蔓延，保护系统稳定性
 *
 * 熔断器状态：
 * - CLOSED: 正常状态，所有请求通过
 * - OPEN: 熔断状态，所有请求被拒绝
 * - HALF_OPEN: 半开状态，允许部分请求通过
 *
 * 触发条件：
 * - 失败率超过阈值 (默认 50%)
 * - 响应时间超过阈值 (默认 5000ms)
 * - 连续失败次数超过阈值 (默认 5次)
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 失败率阈值 (0-1)
  failureRateThreshold: 0.5,

  // 响应时间阈值 (毫秒)
  responseTimeThreshold: 5000,

  // 连续失败次数阈值
  consecutiveFailureThreshold: 5,

  // 熔断持续时间 (毫秒)
  circuitDuration: 60000, // 1分钟

  // 半开状态允许的请求数
  halfOpenRequests: 3,

  // 监控时间窗口 (毫秒)
  windowSize: 60000, // 1分钟

  // 最小请求数
  minimumRequests: 10
};

// 熔断器状态
const STATES = {
  CLOSED: 'CLOSED',   // 正常
  OPEN: 'OPEN',       // 熔断
  HALF_OPEN: 'HALF_OPEN' // 半开
};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.config = { ...CONFIG, ...options };

    // 状态
    this.state = STATES.CLOSED;
    thisfailureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenRequestsAllowed = 0;
    this.halfOpenRequestsSucceeded = 0;

    // 统计
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      rejectedRequests: 0,
      stateChanges: []
    };

    // 时间窗口内的请求记录
    this.requestWindow = [];

    // 定时器
    this.stateChangeTimers = {};
  }

  /**
   * 记录请求结果
   * @param {boolean} success - 是否成功
   * @param {number} responseTime - 响应时间(毫秒)
   */
  recordRequest(success, responseTime) {
    const now = Date.now();

    // 清理过期记录
    this.cleanOldRecords(now);

    // 记录请求
    this.requestWindow.push({
      time: now,
      success,
      responseTime
    });

    // 更新统计
    this.stats.totalRequests++;
    this.stats.totalResponseTime += responseTime;
    this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalRequests;

    if (success) {
      this.stats.totalSuccesses++;
      this.successCount++;
      this.failureCount = 0;
    } else {
      this.stats.totalFailures++;
      this.failureCount++;
      this.successCount = 0;
      this.lastFailureTime = now;
    }

    // 检查是否需要切换状态
    this.evaluateState();
  }

  /**
   * 清理过期记录
   */
  cleanOldRecords(now) {
    const cutoff = now - this.config.windowSize;
    this.requestWindow = this.requestWindow.filter(r => r.time > cutoff);
  }

  /**
   * 评估熔断器状态
   */
  evaluateState() {
    if (this.state === STATES.OPEN) {
      // 检查是否应该转换到半开状态
      if (Date.now() - this.lastFailureTime >= this.config.circuitDuration) {
        this.transitionTo(STATES.HALF_OPEN);
      }
    } else if (this.state === STATES.HALF_OPEN) {
      // 半开状态：检查请求结果
      if (this.halfOpenRequestsSucceeded >= this.config.halfOpenRequests) {
        this.transitionTo(STATES.CLOSED);
      }
    } else {
      // 关闭状态：检查是否应该打开
      if (this.shouldOpen()) {
        this.transitionTo(STATES.OPEN);
      }
    }
  }

  /**
   * 判断是否应该打开熔断器
   */
  shouldOpen() {
    // 连续失败次数检查
    if (this.failureCount >= this.config.consecutiveFailureThreshold) {
      return true;
    }

    // 失败率检查
    if (this.requestWindow.length >= this.config.minimumRequests) {
      const failures = this.requestWindow.filter(r => !r.success).length;
      const failureRate = failures / this.requestWindow.length;

      if (failureRate >= this.config.failureRateThreshold) {
        return true;
      }
    }

    // 响应时间检查
    const slowRequests = this.requestWindow.filter(
      r => r.responseTime > this.config.responseTimeThreshold
    );
    if (slowRequests.length / this.requestWindow.length >= this.config.failureRateThreshold) {
      return true;
    }

    return false;
  }

  /**
   * 切换状态
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    const transition = {
      from: oldState,
      to: newState,
      time: new Date().toISOString(),
      reason: this.getTransitionReason(oldState, newState)
    };

    this.stats.stateChanges.push(transition);
    console.log(`[CircuitBreaker] ${this.name}: ${oldState} -> ${newState}`);

    if (newState === STATES.HALF_OPEN) {
      this.halfOpenRequestsAllowed = this.config.halfOpenRequests;
      this.halfOpenRequestsSucceeded = 0;
    }

    if (newState === STATES.CLOSED) {
      // 重置计数器
      this.failureCount = 0;
      this.successCount = 0;
      this.requestWindow = [];
    }
  }

  /**
   * 获取状态转换原因
   */
  getTransitionReason(from, to) {
    if (from === STATES.CLOSED && to === STATES.OPEN) {
      return `失败率过高或响应过慢`;
    }
    if (from === STATES.OPEN && to === STATES.HALF_OPEN) {
      return `熔断时间结束，尝试恢复`;
    }
    if (from === STATES.HALF_OPEN && to === STATES.CLOSED) {
      return `健康检查通过`;
    }
    if (from === STATES.HALF_OPEN && to === STATES.OPEN) {
      return `健康检查失败`;
    }
    return '';
  }

  /**
   * 检查是否允许请求
   */
  canExecute() {
    if (this.state === STATES.CLOSED) {
      return true;
    }

    if (this.state === STATES.HALF_OPEN) {
      if (this.halfOpenRequestsAllowed > 0) {
        this.halfOpenRequestsAllowed--;
        return true;
      }
      return false;
    }

    // OPEN 状态
    this.stats.rejectedRequests++;
    return false;
  }

  /**
   * 获取健康状态
   */
  isHealthy() {
    return this.state === STATES.CLOSED;
  }

  /**
   * 获取状态摘要
   */
  getStatus() {
    const now = Date.now();
    this.cleanOldRecords(now);

    const recentRequests = this.requestWindow.length;
    const recentFailures = this.requestWindow.filter(r => !r.success).length;

    return {
      name: this.name,
      state: this.state,
      stats: {
        totalRequests: this.stats.totalRequests,
        totalFailures: this.stats.totalFailures,
        totalSuccesses: this.stats.totalSuccesses,
        averageResponseTime: Math.round(this.stats.averageResponseTime),
        rejectedRequests: this.stats.rejectedRequests,
        recentRequests,
        recentFailures,
        failureRate: recentRequests > 0 ? (recentFailures / recentRequests * 100).toFixed(1) + '%' : '0%'
      },
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      stateChanges: this.stats.stateChanges.slice(-5)
    };
  }

  /**
   * 重置熔断器
   */
  reset() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.requestWindow = [];
    this.halfOpenRequestsAllowed = 0;
    this.halfOpenRequestsSucceeded = 0;

    console.log(`[CircuitBreaker] ${this.name}: 已重置`);
  }
}

// 熔断器管理器
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * 获取或创建熔断器
   */
  getBreaker(name, options) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  /**
   * 获取所有熔断器状态
   */
  getAllStatus() {
    const status = {};
    this.breakers.forEach((breaker, name) => {
      status[name] = breaker.getStatus();
    });
    return status;
  }

  /**
   * 健康检查
   */
  healthCheck() {
    const allHealthy = Array.from(this.breakers.values()).every(b => b.isHealthy());
    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      breakers: this.getAllStatus()
    };
  }

  /**
   * 重置所有熔断器
   */
  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

// 导出单例
const circuitBreakerManager = new CircuitBreakerManager();

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  STATES
};
