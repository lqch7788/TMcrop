/**
 * 性能监控中间件
 * 自动记录所有API请求的响应时间和状态
 */

const { performanceMonitor } = require('../services/performanceMonitor');

/**
 * 性能监控中间件
 */
function performanceMiddleware(req, res, next) {
  const startTime = Date.now();
  const endpoint = req.route?.path || req.path;
  const method = req.method;

  // 拦截响应
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;

    // 记录请求
    performanceMonitor.recordRequest(endpoint, method, responseTime, statusCode);

    return originalSend.call(this, body);
  };

  next();
}

/**
 * 创建带计时的数据库查询包装器
 */
function wrapDbQuery(db, queryName = 'query') {
  const originalRun = db.run.bind(db);
  const originalAll = db.all.bind(db);
  const originalGet = db.get.bind(db);

  db.run = function(sql, ...args) {
    const startTime = Date.now();
    const callback = args[args.length - 1];

    if (typeof callback === 'function') {
      args[args.length - 1] = function(err) {
        const queryTime = Date.now() - startTime;
        performanceMonitor.recordDbQuery(queryTime, 'RUN', sql);
        return callback.apply(this, arguments);
      };
      return originalRun.call(this, sql, ...args);
    } else {
      const result = originalRun.call(this, sql, ...args);
      const queryTime = Date.now() - startTime;
      performanceMonitor.recordDbQuery(queryTime, 'RUN', sql);
      return result;
    }
  };

  db.all = function(sql, ...args) {
    const startTime = Date.now();
    const callback = args[args.length - 1];

    if (typeof callback === 'function') {
      args[args.length - 1] = function(err, rows) {
        const queryTime = Date.now() - startTime;
        performanceMonitor.recordDbQuery(queryTime, 'ALL', sql);
        return callback.apply(this, arguments);
      };
      return originalAll.call(this, sql, ...args);
    } else {
      const result = originalAll.call(this, sql, ...args);
      const queryTime = Date.now() - startTime;
      performanceMonitor.recordDbQuery(queryTime, 'ALL', sql);
      return result;
    }
  };

  db.get = function(sql, ...args) {
    const startTime = Date.now();
    const callback = args[args.length - 1];

    if (typeof callback === 'function') {
      args[args.length - 1] = function(err, row) {
        const queryTime = Date.now() - startTime;
        performanceMonitor.recordDbQuery(queryTime, 'GET', sql);
        return callback.apply(this, arguments);
      };
      return originalGet.call(this, sql, ...args);
    } else {
      const result = originalGet.call(this, sql, ...args);
      const queryTime = Date.now() - startTime;
      performanceMonitor.recordDbQuery(queryTime, 'GET', sql);
      return result;
    }
  };

  return db;
}

module.exports = {
  performanceMiddleware,
  wrapDbQuery,
};
