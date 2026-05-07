/**
 * CORS 跨域配置
 */

import cors from 'cors';

export const corsOptions: cors.CorsOptions = {
  origin: [
    'http://localhost:5173',  // Vite 开发服务器
    'http://localhost:5188',  // 备用端口
    'http://localhost:5189',  // 当前前端端口
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5188',
    'http://127.0.0.1:5189'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

export default cors(corsOptions);
