/**
 * CORS 跨域配置
 * 生产环境只允许正式域名，开发环境允许多个本地端口
 */

import cors from 'cors';

// 根据环境配置允许的来源
const getAllowedOrigins = (): string[] => {
  // 生产环境只允许配置的正式域名
  if (process.env.NODE_ENV === 'production') {
    const productionOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [];
    if (productionOrigins.length > 0) {
      return productionOrigins;
    }
    // 如果未配置生产环境域名，默认拒绝所有（安全优先）
    console.warn('警告: 生产环境未配置 CORS_ALLOWED_ORIGINS，默认仅允许内置域名');
    return [
      'https://yourdomain.com',  // 需替换为实际域名
    ];
  }

  // 开发环境允许多个本地端口
  return [
    'http://localhost:5173',  // Vite 开发服务器
    'http://localhost:5188',  // 备用端口
    'http://localhost:5189',  // 备用端口
    'http://localhost:5190',  // 当前前端端口
    'http://localhost:5191',  // 当前前端端口
    'http://localhost:5192',  // 当前前端端口
    'http://localhost:4174',  // Vite preview 端口
    'http://localhost:4173',  // Vite preview 备用端口
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5188',
    'http://127.0.0.1:5189',
    'http://127.0.0.1:5190',
    'http://127.0.0.1:5191',
    'http://127.0.0.1:5192',
    'http://127.0.0.1:4174',
    'http://127.0.0.1:4173',
  ];
};

export const corsOptions: cors.CorsOptions = {
  origin: getAllowedOrigins(),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

export default cors(corsOptions);
