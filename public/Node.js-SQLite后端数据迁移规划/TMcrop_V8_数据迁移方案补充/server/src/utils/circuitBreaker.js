/**
 * 熔断机制（Circuit Breaker）
 * 当 API 连续失败达到一定次数时，自动熔断并返回降级响应
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenRequests?: number;
}

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: State = 'CLOSED';
  private failures = 0;
  private lastFailureTime?: number;
  private nextAttempt = Date.now();

  private failureThreshold: number;
  private resetTimeoutMs: number;
  private halfOpenRequests: number;

  constructor(private readonly name: string, options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.halfOpenRequests = options.halfOpenRequests || 3;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
      console.warn(`[CircuitBreaker] '${this.name}' OPENED, next attempt at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getState(): State {
    return this.state;
  }
}

// 全局熔断器实例
export const circuitBreakers = {
  database: new CircuitBreaker('database', { failureThreshold: 3, resetTimeoutMs: 10000 }),
  externalApi: new CircuitBreaker('external-api', { failureThreshold: 5, resetTimeoutMs: 60000 }),
};

export default CircuitBreaker;
