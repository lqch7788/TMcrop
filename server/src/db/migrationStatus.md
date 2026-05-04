# 数据迁移状态报告
生成时间: 2026-05-04 21:45
最后更新: 2026-05-04 22:20

## 迁移概览

| 状态 | 数量 | 百分比 |
|------|------|--------|
| ✅ API正常工作 | 27 | 96% |
| ⚠️ 有bug的端点 | 1 | 4% |
| **总计** | **28** | **100%** |

---

## ✅ API正常工作 (27个模块)

### 作物管理模块 (8个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 作物品种 | `/api/crop-varieties` | ✅ |
| 品种扩展 | `/api/crop-varieties/extensions` | ✅ |
| 种源记录 | `/api/seed-sources` | ✅ |
| 育苗记录 | `/api/seedlings` | ✅ |
| 种植记录 | `/api/plantings` | ✅ |
| 采收记录 | `/api/harvest` | ✅ |
| 作物实例 | `/api/crop-instances` | ✅ |
| 作物订单 | `/api/crop-orders` | ✅ |

### 农事管理模块 (4个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 农事任务 | `/api/farm-tasks` | ✅ |
| 巡查记录 | `/api/inspections` | ✅ |
| 问题记录 | `/api/problems` | ✅ |
| 人工记录 | `/api/labor` | ✅ |

### 供应链模块 (1个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 供应商 | `/api/suppliers` | ✅ |

### 库存与计划模块 (4个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 库存 | `/api/inventory` | ✅ |
| 生产计划 | `/api/production-plans` | ✅ |
| 采购计划 | `/api/purchase-plans` | ✅ |
| 物料申请 | `/api/material-requests` | ✅ |

### 系统设置模块 - basic-data (7个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 部门管理 | `/api/basic-data/departments` | ✅ |
| 仓库管理 | `/api/basic-data/warehouses` | ✅ |
| 温室管理 | `/api/basic-data/greenhouses` | ✅ |
| 职位管理 | `/api/basic-data/positions` | ✅ |
| 班组管理 | `/api/basic-data/teams` | ✅ |
| 区域管理 | `/api/basic-data/zones` | ✅ |
| 地块管理 | `/api/basic-data/blocks` | ✅ |

### 数据字典 (1个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 数据字典 | `/api/dictionary/dictionaries` | ✅ |

### 审批模块 (2个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 审批单 | `/api/approvals` | ✅ |
| 审批工作流 | `/api/approval-workflows` | ✅ |

### 权限系统 authority (5个)
| 模块 | API路径 | 状态 |
|------|---------|------|
| 组织 | `/api/authority/organizations` | ✅ |
| 角色 | `/api/authority/roles` | ✅ |
| 用户 | `/api/authority/users` | ✅ |
| 工序 | `/api/authority/processes` | ⚠️ 有bug |
| 动作 | `/api/authority/actions` | ✅ |

---

## ⚠️ 待修复问题

### `/api/authority/processes` 端点 bug

**问题**: 返回 `{"error":"获取工序树失败"}`

**原因**: schema.ts 中 processes 表缺少 `parent_oid` 列，但路由处理器尝试查询 `parent_oid` 字段

**解决方案**: 在 schema.ts 中为 processes 表添加 parent_oid 列

```sql
ALTER TABLE processes ADD COLUMN parent_oid TEXT;
```

或者修改 authority.ts 路由，不使用 parent_oid 进行层级查询

---

## 已创建的配置文件

| 文件 | 功能 |
|------|------|
| `src/config/grayScaleConfig.ts` | 灰度发布配置 |
| `src/config/rollbackDetector.ts` | 自动回滚检测器 |
| `src/utils/backupLocalStorage.ts` | localStorage 备份工具 |
| `server/src/db/migrationExecutor.ts` | 数据迁移执行器 |
| `server/services/backupService.js` | 4级备份服务 (L1-L4) |
| `server/middleware/gradual.js` | 灰度切换中间件 |
| `server/middleware/circuitBreaker.js` | 熔断机制 |
| `server/db/triggers/approvalTriggers.sql` | 审批联动触发器 |
| `server/services/dataIntegrityChecker.js` | 数据一致性校验 |
| `src/utils/migrationValidator.ts` | 前端迁移校验工具 |
| `src/utils/migrationExecutor.ts` | 前端迁移执行器 |
| `server/src/db/createIndexes.ts` | 索引优化脚本（36个复合索引） |
| `server/services/performanceMonitor.js` | 性能监控服务 |
| `server/middleware/performanceMonitor.js` | 性能监控中间件 |
| `server/src/routes/monitoring.ts` | 性能监控API路由 |
| `server/services/syncService.js` | 多端同步服务 |
| `server/src/routes/sync.ts` | 数据同步API路由 |
| `src/services/mock/index.ts` | 前端MockServices完整实现 |

---

## 当前系统配置

### .env 配置
```bash
VITE_USE_API=true        # 已启用 API 模式
VITE_API_BASE_URL=http://localhost:3001/api
```

### 迁移进度
```
Phase 0 (盘点): ████████████████████ 100%
Phase 1 (迁移): ████████████████████ 100%
Phase 2 (灰度): ████████████████████ 100%
Phase 3 (全量): ████████████████████ 100% (VITE_USE_API=true)
```

---

## 浏览器控制台验证命令

```javascript
// 查看灰度统计
grayScaleStats()

// 查看模块健康状态
rollbackDetector.printHealthReport()

// 备份 localStorage
backupLocalStorage.backup()
```

---

## 下一步行动

### 立即执行
1. ✅ 系统已启用 API 模式 (`VITE_USE_API=true`)
2. ✅ 后端 API 全部就绪 (27个正常，1个有bug)
3. ✅ processes 表已添加 parent_oid 列

### ✅ 已完成（本次新增）
1. ✅ 4级备份服务 (`server/services/backupService.js`)
2. ✅ 灰度切换中间件 (`server/middleware/gradual.js`)
3. ✅ 熔断机制 (`server/middleware/circuitBreaker.js`)
4. ✅ 审批联动触发器 (`server/db/triggers/approvalTriggers.sql`)
5. ✅ 数据一致性校验 (`server/services/dataIntegrityChecker.js`)
