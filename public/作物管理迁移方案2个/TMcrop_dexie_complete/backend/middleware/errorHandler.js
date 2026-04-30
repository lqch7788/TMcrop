/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.stack || err.message || err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: message,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
}
module.exports = errorHandler;
