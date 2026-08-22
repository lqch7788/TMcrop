# V1.1 生产部署指南

> **日期**: 2026-08-22
> **目标读者**: 运维工程师 / DevOps
> **预计部署时间**: 30 分钟

---

## 一、部署前准备

### 硬件要求

| 环境 | CPU | 内存 | 磁盘 |
|---|---|---|---|
| 开发 | 2 核 | 4GB | 20GB |
| 生产（小型农场）| 4 核 | 8GB | 50GB |
| 生产（中型农场）| 8 核 | 16GB | 100GB |

### 软件要求

- **Docker** 20.10+ & **Docker Compose** 2.0+
- **Node.js** 20+（仅开发环境需要）
- **Git**
- **可选**: Nginx（反向代理）

---

## 二、部署步骤

### 1. 克隆代码

```bash
git clone https://github.com/lqch7788/TMcrop.git
cd TMcrop
git checkout planting-management
```

### 2. 配置环境变量（生产）

```bash
# 创建 .env 文件
cat > .env << EOF
JWT_SECRET=<改成强随机字符串>
NODE_ENV=production
EOF
chmod 600 .env
```

### 3. 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 4. 初始化数据库（首次部署）

```bash
# 进入容器执行迁移
docker-compose exec app npx tsx scripts/run-migration-2026-08-22.ts

# 可选：生成 synthetic 数据（用于 AI 训练）
docker-compose exec app python tools/ml/synthesize_historical_tasks.py --count 500
```

### 5. 健康检查

```bash
# 检查 API
curl http://localhost:3001/api/health

# 检查 AI 端点
curl -X POST http://localhost:3001/api/ai/workhour/predict \
  -H "Content-Type: application/json" \
  -d '{"task_type":"灌溉","priority":"normal"}'
```

### 6. 反向代理（Nginx 示例）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 三、运维

### 备份

```bash
# 手动触发备份
docker-compose exec backup tar czf /backups/db_manual_$(date +%Y%m%d).tgz -C /data .

# 列出备份
ls -lh ./backups/

# 恢复
docker-compose stop app
docker cp ./backups/db_xxx.tgz v11-app:/tmp/
docker-compose exec app tar xzf /tmp/db_xxx.tgz -C /app/data
docker-compose start app
```

### 日志

```bash
# 应用日志（结构化 JSON）
tail -f ./server/logs/combined.log

# Docker 日志
docker-compose logs --tail=100 app
```

### 监控关键指标

| 指标 | 阈值 | 命令 |
|---|---|---|
| CPU 使用率 | <80% | `docker stats v11-app` |
| 内存使用 | <2GB | `docker stats v11-app` |
| DB 文件大小 | <500MB | `ls -lh ./server/data/yuanxingtu.db` |
| API 响应时间 | p95 <500ms | UAT 测试 |
| 系统可用率 | ≥99.5% | 监控服务 |

---

## 四、升级流程

```bash
# 1. 备份（自动）
docker-compose exec backup tar czf /backups/pre_upgrade_$(date +%Y%m%d).tgz -C /data .

# 2. 拉取新代码
git pull origin planting-management

# 3. 重新构建并启动
docker-compose up -d --build app

# 4. 验证
curl http://localhost:3001/api/health
```

---

## 五、故障排除

| 问题 | 排查 |
|---|---|
| **容器启动失败** | `docker-compose logs app` 看具体错误 |
| **DB 锁定** | 检查是否有其他进程占用 yuanxingtu.db |
| **AI 端点 404** | server 重启了吗？ts 编译了吗？ |
| **性能慢** | 看 DB 大小 + AI 推理时间（PPT <3s） |
| **磁盘满** | 检查 backups 目录，清理旧备份 |

---

## 六、安全清单

- [ ] JWT_SECRET 已改为强随机字符串
- [ ] DB 文件权限 600
- [ ] 防火墙仅开放 80/443
- [ ] 定期备份（自动）
- [ ] HTTPS 证书（Let's Encrypt）
- [ ] 日志审计开启
- [ ] rate limit 配置（默认 100 req/15min）

---

## 七、相关文件

```
server/Dockerfile                    # Node 后端镜像
docker-compose.yml                   # 多服务编排（含备份）
server/docs/deployment/DEPLOYMENT.md # 本文档
.github/workflows/ci.yml             # CI pipeline
server/scripts/run-migration-2026-08-22.ts  # 数据库迁移
```

---

**部署完成**！如有问题，参考故障排除章节或联系开发团队。
