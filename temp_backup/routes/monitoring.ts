/**
 * 性能监控路由
 * 提供性能数据和监控指标
 */

import { Router } from 'express';
import { performanceMonitor } from '../../services/performanceMonitor';
import { circuitBreakerManager } from '../../middleware/circuitBreaker';

const router = Router();

/**
 * GET /api/monitoring/performance
 * 获取性能报告
 */
router.get('/performance', (req, res) => {
  try {
    const report = performanceMonitor.getReport();
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/monitoring/health
 * 健康检查
 */
router.get('/health', (req, res) => {
  try {
    const health = performanceMonitor.healthCheck();
    const circuitBreakers = circuitBreakerManager.getAllStatus();

    res.json({
      success: true,
      data: {
        performance: health,
        circuitBreakers,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/monitoring/stats
 * 获取简要统计
 */
router.get('/stats', (req, res) => {
  try {
    const report = performanceMonitor.getReport();
    res.json({
      success: true,
      data: {
        totalRequests: report.summary.totalRequests,
        totalErrors: report.summary.totalErrors,
        errorRate: report.summary.errorRate,
        avgResponseTime: report.summary.avgResponseTime,
        performanceLevel: report.performanceLevel,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/monitoring/reset
 * 重置统计数据
 */
router.post('/reset', (req, res) => {
  try {
    performanceMonitor.reset();
    res.json({
      success: true,
      message: '统计数据已重置',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/monitoring/endpoints
 * 获取各端点统计
 */
router.get('/endpoints', (req, res) => {
  try {
    const report = performanceMonitor.getReport();
    res.json({
      success: true,
      data: report.endpointStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/monitoring/db
 * 获取数据库查询统计
 */
router.get('/db', (req, res) => {
  try {
    const report = performanceMonitor.getReport();
    res.json({
      success: true,
      data: report.dbStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
