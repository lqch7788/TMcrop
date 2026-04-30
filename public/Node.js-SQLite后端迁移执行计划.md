# Node.js + SQLite 后端迁移执行计划

## Context

**问题背景：**
- 当前系统使用 LocalStorage 做数据持久化，数据量受限（5MB限制）
- 系统有 935 个文件、143,000+ 行代码，包含 10+ 个业务模块
- 演示数据无法完整展示系统功能
- 需要为后续对接真实数据库和 API 做准备

**迁移目标：**
- 将 LocalStorage 存储改为 Node.js + SQLite 后端
- 保留所有现有功能和页面（零删改原则）
- mockData.ts 作为种子数据，演示功能完全保留
- 为未来扩展到 PostgreSQL/MySQL 留好路径

**约束条件：**
- 不能删除任何现有页面
- 不能改变任何现有功能
- 演示模式必须继续工作

---

## 核心迁移策略

### 数据层分离架构

```
当前架构                          目标架构
┌─────────────────┐              ┌─────────────────┐
│   前端组件       │              │   前端组件       │
│  (不改变!)      │              │  (不改变!)      │
└────────┬────────┘              └────────┬────────┘
         │                                │
┌────────▼────────┐              ┌────────▼────────┐
│  服务层 (改)     │      →       │  服务层 (改)     │
│  LocalStorage    │              │  API 调用        │
└─────────────────┘              └────────┬────────┘
                                         │
                                 ┌────────▼────────┐
                                 │  Node.js API    │
                                 └────────┬────────┘
                                         │
                                 ┌────────▼────────┐
                                 │  SQLite DB     │
                                 └─────────────────┘
```

### 渐进式迁移（不破坏现有功能）

1. **Phase 1**: 创建后端骨架 + SQLite 数据库
2. **Phase 2**: 实现 API 路由（与现有服务层一一对应）
3. **Phase 3**: 修改服务层，从 LocalStorage 切换到 API 调用
4. **Phase 4**: 种子数据初始化 + 验证演示功能

---

## 实施步骤

### Phase 1: 后端骨架搭建

#### 1.1 项目结构

```
server/
├── src/
│   ├── index.ts              # Express 服务入口
│   ├── db/
│   │   ├── index.ts          # SQLite 连接池
│   │   ├── schema.ts         # 数据库表结构
│   │   └── seedData.ts       # 种子数据导入
│   ├── routes/
│   │   ├── index.ts          # 路由汇总
│   │   ├── cropVariety.ts   # 作物品种相关 API
│   │   ├── inventory.ts      # 库存相关 API
│   │   ├── labor.ts         # 人工管理 API
│   │   ├── farm.ts           # 农事管理 API
│   │   └── ...
│   └── middleware/
│       └── cors.ts           # CORS 配置
├── package.json
└── tsconfig.json
```

#### 1.2 安装依赖

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.21",
    "@types/better-sqlite3": "^7.6.8"
  }
}
```

#### 1.3 SQLite 数据库初始化

**表结构设计原则：**
- 每个现有 LocalStorage 键对应一个数据库表
- 表名与 `useLocalStorage.ts` 中的 `STORAGE_KEYS` 常量对应
- 支持 CRUD 操作和基础查询

**示例表结构：**

```sql
-- 作物品种表
CREATE TABLE crop_varieties (
  id TEXT PRIMARY KEY,
  crop_code TEXT NOT NULL,
  category_code TEXT,
  category_name TEXT,
  type_code TEXT,
  type_name TEXT,
  variety_code TEXT,
  variety_name TEXT,
  sub_variety1_code TEXT,
  sub_variety1_name TEXT,
  detail_variety_code TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT,
  update_time TEXT
);

-- 库存表
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  harvest_record_id TEXT,
  product_code TEXT,
  crop_name TEXT,
  variety TEXT,
  quantity REAL,
  unit TEXT,
  grade TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  storage_location TEXT,
  harvest_date TEXT,
  storage_date TEXT,
  expiration_date TEXT,
  batch_code TEXT,
  greenhouse_name TEXT,
  planting_mode TEXT,
  status TEXT,
  alert_settings TEXT,  -- JSON 存储
  inbound_records TEXT, -- JSON 存储
  outbound_records TEXT  -- JSON 存储
);

-- 更多表...
-- tasks, inspections, problems, labor_records 等
```

---

### Phase 2: API 路由实现

#### 2.1 RESTful API 设计

每个服务对应一组 API：

| 服务文件 | API 路由 | 操作 |
|---------|---------|------|
| `cropVarietyService.ts` | `/api/crop-varieties` | GET, POST, PUT, DELETE |
| `seedlingService.ts` | `/api/seedlings` | GET, POST, PUT, DELETE |
| `harvestService.ts` | `/api/harvest` | GET, POST, PUT, DELETE |
| `inventoryService.ts` | `/api/inventory` | GET, POST, PUT, DELETE |
| `taskService.ts` | `/api/tasks` | GET, POST, PUT, DELETE |
| `laborService.ts` | `/api/labor/*` | 人工管理相关 |
| ... | ... | ... |

#### 2.2 API 响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

---

### Phase 3: 服务层改造

#### 3.1 创建 API 客户端服务

```typescript
// src/services/apiClient.ts
class ApiClient {
  private baseUrl = 'http://localhost:3001/api';

  async get<T>(path: string): Promise<T>
  async post<T>(path: string, data: any): Promise<T>
  async put<T>(path: string, data: any): Promise<T>
  async delete<T>(path: string): Promise<T>
}

export const apiClient = new ApiClient();
```

#### 3.2 服务层改造模式

**现有代码（LocalStorage）：**
```typescript
// src/services/cropVarietyService.ts
function getAllVarieties(): CropVariety[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}
```

**改造后（API 调用）：**
```typescript
// src/services/apiCropVarietyService.ts
export async function getAllVarieties(): Promise<CropVariety[]> {
  const response = await apiClient.get<CropVariety[]>('/crop-varieties');
  return response.data || [];
}
```

**关键点：** 保持相同的函数签名，组件层完全不需要改动！

#### 3.3 需要改造的服务文件清单

| 序号 | 文件路径 | 说明 |
|-----|---------|------|
| 1 | `src/services/cropVarietyService.ts` | 作物品种服务 |
| 2 | `src/services/seedlingService.ts` | 育苗服务 |
| 3 | `src/services/harvestService.ts` | 采收服务 |
| 4 | `src/services/cropInstanceService.ts` | 作物实例服务 |
| 5 | `src/services/seedSourceService.ts` | 种源服务 |
| 6 | `src/services/plantingService.ts` | 种植服务 |
| 7 | `src/services/supplierService.ts` | 供应商服务 |
| 8 | `src/services/cropOrderService.ts` | 订单服务 |
| 9 | `src/hooks/useLocalStorage.ts` | 本地存储 Hook |

**人工管理模块（可后续）：**
- `src/components/labor/*/hooks/use*.ts`

---

### Phase 4: 种子数据初始化

#### 4.1 从 mockData 导入

```typescript
// server/src/db/seedData.ts
import { cropVarieties } from '../../src/data/cropVarietyData';
import { produceInventory } from '../../src/data/mockData';
import { seedSources } from '../../src/data/mockData';
// ... 其他模拟数据

export function seedDatabase() {
  // 清空并重新导入
  db.exec('DELETE FROM crop_varieties');
  cropVarieties.forEach(v => {
    db.prepare('INSERT INTO crop_varieties (...) VALUES (...)').run(v);
  });
  // ... 其他表
}
```

#### 4.2 启动时自动初始化

```typescript
// server/src/index.ts
app.listen(3001, () => {
  console.log('API 服务启动在 http://localhost:3001');
  seedDatabase();  // 首次运行导入种子数据
});
```

---

## 关键文件修改清单

### 后端新建文件

| 文件 | 用途 |
|------|------|
| `server/src/index.ts` | Express 服务入口 |
| `server/src/db/index.ts` | SQLite 连接 |
| `server/src/db/schema.ts` | 数据库表结构 |
| `server/src/db/seedData.ts` | 种子数据 |
| `server/src/routes/*.ts` | API 路由 |
| `server/src/middleware/cors.ts` | 跨域配置 |
| `server/package.json` | 后端依赖 |
| `server/tsconfig.json` | TypeScript 配置 |

### 前端修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/services/apiClient.ts` | 新建 API 客户端 |
| `src/services/*.ts` | 改造为 API 调用（保持接口不变） |

### 前端不修改的文件（零改动）

```
所有组件文件（src/components/*）
所有页面文件（src/pages/*）
所有类型定义（src/types/*）
mockData.ts（保留作为种子数据源）
```

---

## 验证步骤

### 验证清单

- [ ] `npm run build` 构建成功
- [ ] 后端 `npm start` 能正常启动
- [ ] 访问 `http://localhost:3001/api/crop-varieties` 返回作物品种数据
- [ ] 前端页面能正常加载
- [ ] 所有菜单页面能正常打开（不能有页面报错）
- [ ] 库存管理页面数据正确显示
- [ ] 人工管理页面数据正确显示
- [ ] 农事管理页面数据正确显示
- [ ] 导出功能正常工作
- [ ] 搜索功能正常工作

### 回归测试

1. **逐个模块验证**
   - [ ] 作物品种管理
   - [ ] 库存管理（入库、出库、汇总表）
   - [ ] 人工管理（员工、排班、考勤）
   - [ ] 农事管理（任务、巡查、问题）
   - [ ] 采购管理
   - [ ] 供应商管理

2. **功能验证**
   - [ ] 新增数据能保存
   - [ ] 编辑数据能保存
   - [ ] 删除数据能生效
   - [ ] 搜索筛选正常工作
   - [ ] 导出 Excel 正常

---

## 风险与缓解

### 风险 1：CORS 问题
**缓解：** 配置 `cors` 中间件允许前端开发服务器访问

### 风险 2：API 响应延迟
**缓解：** SQLite 用better-sqlite3 是同步 API，无需异步开销

### 风险 3：服务层改造影响组件
**缓解：** 保持函数签名完全一致，组件无感知

### 风险 4：种子数据导入丢失
**缓解：** mockData.ts 不删除，作为后端导入源

---

## 执行顺序

```
Step 1: 创建 server/ 目录结构
Step 2: 安装后端依赖
Step 3: 实现 SQLite 连接和表结构
Step 4: 实现种子数据导入
Step 5: 实现基础 API 路由
Step 6: 创建 API 客户端 (src/services/apiClient.ts)
Step 7: 改造 cropVarietyService.ts
Step 8: 改造其他核心服务
Step 9: 启动后端服务
Step 10: 验证前端页面
Step 11: 回归测试
Step 12: 完成迁移
```

---

## 后续扩展路径

### SQLite → PostgreSQL

```typescript
// 只需改这一行连接代码
// 当前
import Database from 'better-sqlite3';
const db = new Database('database.sqlite');

// 未来切换
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

### 添加用户认证

```typescript
// 在 Express 中添加 JWT 中间件
app.use('/api', authenticateJWT);
```

---

## ADR（架构决策记录）

**Decision:** 采用 Node.js + SQLite 替代 LocalStorage

**Drivers:**
1. LocalStorage 5MB 限制无法支撑演示数据量
2. 未来需要对接真实后端 API
3. 系统规模（935 文件）需要可持续演进的架构

**Alternatives Considered:**
1. Dexie.js (IndexedDB) - 无法支持多用户，无法对接真实 API
2. 纯 LocalStorage - 数据量受限，无法扩展

**Why Chosen:**
- SQLite 是嵌入式数据库，零部署成本
- Node.js + SQLite 与现有前端完全解耦
- 未来一行配置可切换到 PostgreSQL
- 前端服务层代码迁移成本最低

**Consequences:**
- 需要运行 Node.js 服务（轻量级）
- 数据存储从浏览器移到服务端

**Follow-ups:**
- 考虑添加用户认证支持多用户
- 考虑添加数据迁移脚本
