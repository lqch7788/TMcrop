# V1.1 弘智耘种植管理系统后端 Dockerfile
# 2026-08-22：生产部署镜像（基于 Node 20-alpine）

FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖（含 ai 模块 + dev deps）
COPY package*.json ./
RUN npm ci --include=dev

# TypeScript 编译
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npx tsc

# 生产运行时镜像
FROM node:20-alpine AS runtime

WORKDIR /app

# 只安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 编译产物 + 运行时文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/src/services ./src/services
COPY --from=builder /app/src/routes ./src/routes
COPY --from=builder /app/src/middleware ./src/middleware
COPY --from=builder /app/src/utils ./src/utils
COPY --from=builder /app/src/constants ./src/constants
COPY --from=builder /app/src/validators ./src/validators
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/index.ts ./src/index.ts

# 数据目录（运行时挂载）
RUN mkdir -p /app/data /app/logs

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

EXPOSE 3001

# 启动
CMD ["node", "dist/index.js"]
