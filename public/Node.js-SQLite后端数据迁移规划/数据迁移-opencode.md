# TMcrop 智慧种植生产管理系统 V1.1
# LocalStorage + IndexedDB → SQLite 数据迁移方案
# 含安全策略与回滚机制

**方案编号**：MCrop-V1.1-Migration-001
**制定日期**：2026-05-02
**版本**：V1.0（含安全策略版）
**制定人**：OpenCode AI

---

## 一、现状分析

### 1.1 当前存储架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          前端浏览器层                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  IndexedDB (Dexie.js) - CropManagementDB                                │
│  ├─ orders              (订单)         - 0条                            │
│  ├─ instances           (作物实例)    - 0条                            │
│  ├─ seedSources        (种源)        - 0条                            │
│  ├─ seedlings           (育苗)        - 0条                            │
│  ├─ plantings           (种植)        - 0条                            │
│  └─ harvestRecords      (采收)        - 0条                            │
│                                                                          │
│  IndexedDB (Dexie.js) - SQLite后端API缓存                                │
│  └─ api_* tables       (API缓存)     - 存在但为空                      │
│                                                                          │
│  LocalStorage (700+ 处读写)                                              │
│  ├─ crop_orders         订单数据                                        │
│  ├─ crop_instances      作物实例                                        │
│  ├─ crop_seed_sources   种源数据                                        │
│  ├─ crop_seedlings      育苗数据                                        │
│  ├─ crop_plantings      种植数据                                        │
│  ├─ harvest_records     采收数据                                        │
│  ├─ yuanxingtu_tasks    农事任务                                        │
│  ├─ yuanxingtu_inspections     巡田记录                                 │
│  ├─ yuanxingtu_attendance     考勤记录                                  │
│  ├─ yuanxingtu_daily_problems 每日问题                                  │
│  ├─ yuanxingtu_worklogs       工作日志                                  │
│  ├─ yuanxingtu_dispatch_records 派工记录                                │
│  ├─ yuanxingtu_my_tasks        我的任务                                  │
│  ├─ approvals            审批数据（Context管理）                        │
│  ├─ crop_data_initialized 数据初始化标记                                 │
│  ├─ username/userId/realName/department  用户信息                       │
│  └─ 其他系统配置数据                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                          后端 SQLite 层                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  已有表（12张，已创建但为空）                                            │
│  ├─ crop_varieties        作物品种库（11位编码）                       │
│  ├─ inventory             库存数据                                      │
│  ├─ crop_instances        作物实例（追溯单元）                         │
│  ├─ seed_sources          种源记录                                     │
│  ├─ seedlings             育苗记录                                      │
│  ├─ plantings             种植记录                                      │
│  ├─ harvest_records       采收记录                                     │
│  ├─ suppliers             供应商                                        │
│  ├─ farm_tasks            农事任务                                      │
│  ├─ inspections           巡查记录                                     │
│  ├─ problems              问题记录                                      │
│  └─ labor_records         人工记录                                      │
│                                                                          │
│  缺失表（20+张，需创建）                                                │
│  ├─ company_groups        公司/基地                                    │
│  ├─ greenhouses          温室/大棚                                    │
│  ├─ plant_areas          种植区域                                      │
│  ├─ departments           部门                                         │
│  ├─ positions             职位                                         │
│  ├─ staff                 员工                                         │
│  ├─ warehouses            仓库                                         │
│  ├─ materials             物料                                         │
│  ├─ material_receiving_records  物料领用记录                           │
│  ├─ material_returns      物料归还                                     │
│  ├─ produce_inventories   产品库存                                     │
│  ├─ production_plans      生产计划                                     │
│  ├─ daily_plans           日计划                                       │
│  ├─ attendance_records    考勤记录                                     │
│  ├─ attendance_repairs    考勤补卡                                     │
│  ├─ leave_records         请假记录                                     │
│  ├─ overtime_records      加班记录                                     │
│  ├─ recruitment_records   招聘记录                                    │
│  ├─ contracts             合同                                         │
│  ├─ onboardings           入职                                         │
│  ├─ resignations         离职                                         │
│  ├─ salary_adjustments   调薪                                         │
│  ├─ salary_budgets       薪资预算                                     │
│  ├─ task_center_records   任务中心                                     │
│  ├─ approvals             审批                                         │
│  └─ daily_records         育苗每日记录                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据孤岛问题

| 问题 | 现状 | 理想状态 |
|------|------|---------|
| 种源→育苗 | `sourceId` 硬编码引用，无级联更新 | 外键关联 + 触发器同步 |
| 育苗→种植 | `sourceId` 引用，但数量不自动同步 | 事务自动扣减/增加 |
| 种植→采收 | `batchCode` 字符串匹配，易出错 | 外键关联到 plantings.id |
| 采收→库存 | `warehouseId` 写入，但库存表独立 | 采收自动触发入库 |
| 实例→全链路 | 各模块操作不更新实例数量 | 所有操作围绕实例自动同步 |
| 订单→实例 | `instanceIds` 数组不同步 | 自动创建/绑定实例 |
| 人员→操作 | `createBy` 是字符串"李明辉" | 关联 staff.id，支持历史追溯 |
| 基地→种植 | `areaName` 是字符串"一棚>01区" | 关联 greenhouse/plant_area 表 |
| 审批→业务 | 审批与业务数据分离 | 审批关联具体业务记录 |
| 考勤→人员 | 考勤独立，无人员档案关联 | 关联 staff 表的完整在职状态 |

### 1.3 LocalStorage 键名清单（18+个）

| 键名 | 数据类型 | 数据量 | 说明 |
|------|---------|--------|------|
| `crop_orders` | 订单数组 | 6条 | 订单主数据 |
| `crop_instances` | 实例数组 | 12条 | 作物实例 |
| `crop_seed_sources` | 种源数组 | 24条 | 种源记录 |
| `crop_seedlings` | 育苗数组 | 12条 | 育苗记录 |
| `crop_plantings` | 种植数组 | 12条 | 种植记录 |
| `harvest_records` | 采收数组 | 6条 | 采收记录 |
| `crop_varieties` | 品种数组 | 自动生成 | 品种库（6种） |
| `yuanxingtu_tasks` | 任务数组 | - | 农事任务 |
| `yuanxingtu_inspections` | 巡查数组 | - | 巡田记录 |
| `yuanxingtu_attendance` | 考勤数组 | - | 考勤数据 |
| `yuanxingtu_daily_problems` | 问题数组 | - | 每日问题 |
| `yuanxingtu_worklogs` | 日志数组 | - | 工作日志 |
| `yuanxingtu_dispatch_records` | 派工数组 | - | 派工记录 |
| `yuanxingtu_my_tasks` | 任务数组 | - | 我的任务 |
| `yuanxingtu_tempTasks` | 临时任务 | - | 临时任务 |
| `approvals` | 审批数组 | - | 审批数据 |
| `username/userId/realName/department` | 用户信息 | 4项 | 登录信息 |
| `crop_data_initialized` | 标记 | v3.1 | 初始化标记 |
| `WORKERS` | 工人数组 | - | 工人数据 |
| `yuanxingtu_batches` | 批次数组 | - | 批次数据 |

---

## 二、迁移目标

### 2.1 最终状态

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          前端浏览器层                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  所有数据通过 SQLite 后端 API 统一存储                                    │
│  IndexedDB 仅作为离线缓存（可选）                                         │
│  LocalStorage 仅保留：                                                   │
│  ├─ 用户会话信息（username, userId, realName, department）              │
│  └─ 系统配置（UI偏好、主题等非业务数据）                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                          后端 SQLite                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  45+ 张表，完整覆盖：                                                    │
│  ├─ 组织架构（基地/温室/区域/部门/职位/员工）                           │
│  ├─ 供应链（供应商/物料/仓库）                                           │
│  ├─ 作物管理（品种/订单/实例/种源/育苗/种植/采收）                      │
│  ├─ 生产执行（农事任务/巡查/问题/生产计划）                             │
│  ├─ 人工管理（考勤/请假/加班/招聘/合同/入职/离职/调薪）                  │
│  └─ 审批中心（统一审批）                                                │
│                                                                          │
│  表间完整外键关联，数据一致性自动保障                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 迁移原则

1. **数据完整性**：所有历史数据必须完整迁移，不丢失任何业务记录
2. **关联可追溯**：通过外键关联实现端到端追溯
3. **灰度迁移**：分模块渐进迁移，每步可回滚
4. **业务连续性**：迁移期间系统不中断，所有功能正常可用
5. **零风险回滚**：任何阶段失败可一键回退到迁移前状态

---

## 三、安全策略（最高优先级）

### 3.1 核心安全原则

```
⚠️  三大铁律（违反即中止迁移）：
1. 【禁止删除原始数据】迁移过程绝对不能删除任何 LocalStorage/IndexedDB 数据
2. 【双写保险】迁移期间同时写入新旧数据源，确保数据可回溯
3. 【一键回滚】任何阶段失败，必须能立即恢复到迁移前状态
```

### 3.2 多级备份策略

#### 3.2.1 备份类型

| 备份级别 | 时机 | 内容 | 存储位置 | 保留时间 |
|---------|------|------|---------|---------|
| **Level 0 - 自动快照** | 每次迁移步骤开始前 | 所有 LocalStorage 数据 | IndexedDB `backup_*` 表 | 迁移完成前 |
| **Level 1 - 步骤快照** | 每个 Phase 完成 | 该 Phase 迁移的表数据 | SQLite `migration_backup` 表 | 迁移完成后7天 |
| **Level 2 - 完整镜像** | 迁移开始前 | 全部45+张表结构+数据 | 文件系统 `backup_migration/` | 迁移完成后30天 |
| **Level 3 - 紧急回滚点** | 关键检查点 | 完整数据库镜像 | IndexedDB 独立 DB | 回滚完成前 |

#### 3.2.2 备份脚本示例

```typescript
// 备份管理模块 - 在迁移开始前执行
class MigrationBackupManager {
  
  // 创建迁移前完整快照
  async createPreMigrationSnapshot(): Promise<string> {
    const snapshotId = `SNAP_${Date.now()}`;
    const allData: Record<string, any> = {};
    
    // 备份所有 LocalStorage 数据
    const localStorageKeys = [
      'crop_orders', 'crop_instances', 'crop_seed_sources',
      'crop_seedlings', 'crop_plantings', 'harvest_records',
      'yuanxingtu_tasks', 'yuanxingtu_inspections', 
      'yuanxingtu_attendance', 'approvals', // ... 所有键
    ];
    
    for (const key of localStorageKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        allData[`ls_${key}`] = JSON.parse(data);
      }
    }
    
    // 备份所有 IndexedDB 表
    const db = new Dexie('CropManagementDB');
    const tables = ['orders', 'instances', 'seedSources', 'seedlings', 'plantings', 'harvestRecords'];
    for (const table of tables) {
      allData[`idb_${table}`] = await db.table(table).toArray();
    }
    
    // 存储快照
    await db.table('migration_snapshots').add({
      id: snapshotId,
      type: 'pre_migration',
      data: allData,
      timestamp: new Date().toISOString(),
      description: '迁移前完整快照'
    });
    
    console.log(`✅ 迁移前快照已创建: ${snapshotId}`);
    return snapshotId;
  }
  
  // 恢复快照
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const db = new Dexie('CropManagementDB');
    const snapshot = await db.table('migration_snapshots').get(snapshotId);
    
    if (!snapshot) {
      throw new Error(`快照不存在: ${snapshotId}`);
    }
    
    console.log(`🔄 开始恢复快照: ${snapshotId}`);
    
    // 恢复 LocalStorage
    for (const [key, value] of Object.entries(snapshot.data)) {
      if (key.startsWith('ls_')) {
        const storageKey = key.substring(3);
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    }
    
    // 恢复 IndexedDB
    for (const [key, value] of Object.entries(snapshot.data)) {
      if (key.startsWith('idb_')) {
        const tableName = key.substring(4);
        const table = db.table(tableName);
        await table.clear();
        if (Array.isArray(value) && value.length > 0) {
          await table.bulkAdd(value);
        }
      }
    }
    
    console.log('✅ 快照恢复完成');
  }
}
```

### 3.3 灰度迁移策略

#### 3.3.1 三层架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           灰度切换层                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐             │
│   │  Feature    │     │   Canary    │     │   Full      │             │
│   │  Flag      │ →   │   Release   │ →   │   Rollout   │             │
│   │  1%用户     │     │   10%用户    │     │   100%用户   │             │
│   └─────────────┘     └─────────────┘     └─────────────┘             │
│                                                                          │
│   每次切换后观察 24 小时，无异常再继续                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 灰度步骤

| 阶段 | 用户比例 | 数据源 | 验证重点 | 通过标准 |
|------|---------|--------|---------|---------|
| **灰度1** | 1% | 全部走 LocalStorage | 核心 CRUD 操作正常 | 无 JS Error |
| **灰度2** | 5% | 读走 SQLite，写双写 | 数据一致性 | 读、写数据匹配 |
| **灰度3** | 20% | 读走 SQLite，写走 SQLite | 性能无明显下降 | 响应时间 < 500ms |
| **灰度4** | 50% | 全部走 SQLite | 大数据量操作 | 无超时、无崩溃 |
| **灰度5** | 100% | 全部走 SQLite | 全功能验证 | 完整业务闭环验证 |

### 3.4 回滚机制

#### 3.4.1 回滚触发条件

| 严重级别 | 触发条件 | 回滚方式 | 回滚时间 |
|---------|---------|---------|---------|
| **P0 - 紧急** | 系统无法打开、页面崩溃 | 立即切换回 LocalStorage | < 1分钟 |
| **P1 - 严重** | 数据丢失、数据显示错误 | 恢复到最近快照 | < 5分钟 |
| **P2 - 中等** | 性能下降 > 30% | 暂停迁移，排查问题 | < 30分钟 |
| **P3 - 轻微** | UI 显示问题、非核心功能异常 | 记录问题，继续观察 | 不回滚 |

#### 3.4.2 回滚操作流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         紧急回滚流程                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. 立即止血（< 1分钟）                                                 │
│     ├─ 关闭 SQLite 写入开关                                             │
│     ├─ 打开 LocalStorage 回退开关                                       │
│     └─ 确认所有数据读写回到 LocalStorage                                │
│                                                                          │
│  2. 数据恢复（< 5分钟）                                                  │
│     ├─ 识别最后有效的快照ID                                              │
│     ├─ 执行 restoreSnapshot(snapshotId)                                 │
│     └─ 验证 LocalStorage 数据完整性                                     │
│                                                                          │
│  3. 用户通知                                                             │
│     ├─ 发送系统通知（受影响用户）                                        │
│     ├─ 记录事故报告                                                     │
│     └─ 48小时内提供事故分析                                             │
│                                                                          │
│  4. 问题排查                                                             │
│     ├─ 分析错误日志                                                     │
│     ├─ 识别问题根因                                                     │
│     └─ 制定修复计划                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.4.3 自动回滚脚本

```typescript
// 自动回滚检测器
class AutoRollbackDetector {
  
  private checkInterval = 5000; // 5秒检测一次
  private errorCount = 0;
  private maxErrors = 3; // 连续3次错误触发回滚
  
  startMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }
  
  private async performHealthCheck() {
    try {
      // 检查1: SQLite 连接是否正常
      const sqliteHealth = await this.checkSQLiteHealth();
      
      // 检查2: 关键数据是否存在
      const dataIntegrity = await this.checkDataIntegrity();
      
      // 检查3: 页面是否正常响应
      const pageResponsive = this.checkPageResponsive();
      
      if (!sqliteHealth || !dataIntegrity || !pageResponsive) {
        this.errorCount++;
        console.warn(`⚠️ 健康检查失败 (${this.errorCount}/${this.maxErrors})`);
        
        if (this.errorCount >= this.maxErrors) {
          console.error('🚨 连续失败达到阈值，触发自动回滚');
          await this.triggerAutoRollback();
        }
      } else {
        this.errorCount = 0;
      }
    } catch (error) {
      this.errorCount++;
      console.error('🚨 健康检查异常:', error);
    }
  }
  
  private async triggerAutoRollback() {
    // 1. 立即切换数据源
    window.__DATA_SOURCE__ = 'localStorage';
    
    // 2. 恢复最近快照
    const latestSnapshot = await this.findLatestValidSnapshot();
    if (latestSnapshot) {
      await new MigrationBackupManager().restoreSnapshot(latestSnapshot.id);
    }
    
    // 3. 通知用户
    alert('检测到数据异常，系统已自动回滚到安全模式。请刷新页面。');
    
    // 4. 刷新页面
    window.location.reload();
  }
}
```

### 3.5 数据一致性校验

#### 3.5.1 校验时机

| 校验点 | 时机 | 校验内容 |
|--------|------|---------|
| **迁移前** | 迁移开始前 | LocalStorage 数据量统计 |
| **每批次迁移后** | 每个数据表迁移完成后 | 数据条数、关键字段完整性 |
| **每日凌晨** | 每日 0:00 | 全量数据校验 |
| **灰度切换前** | 切换用户比例前 | 前后数据对比 |
| **回滚恢复后** | 回滚完成后 | 数据完整性确认 |

#### 3.5.2 校验脚本

```typescript
// 数据一致性校验服务
class DataIntegrityValidator {
  
  // 迁移前基线校验
  async captureBaseline(): Promise<DataBaseline> {
    const baseline = {
      timestamp: new Date().toISOString(),
      localStorage: {} as Record<string, { count: number; checksum: string }>,
      indexedDB: {} as Record<string, { count: number; checksum: string }>
    };
    
    // LocalStorage 基线
    const lsKeys = ['crop_orders', 'crop_instances', 'crop_seed_sources', 
                    'crop_seedlings', 'crop_plantings', 'harvest_records'];
    for (const key of lsKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        baseline.localStorage[key] = {
          count: Array.isArray(parsed) ? parsed.length : 0,
          checksum: this.simpleChecksum(parsed)
        };
      }
    }
    
    return baseline;
  }
  
  // 迁移后对比校验
  async validateMigration(baseline: DataBaseline): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      differences: []
    };
    
    // 对比 LocalStorage
    for (const [key, original] of Object.entries(baseline.localStorage)) {
      const current = localStorage.getItem(key);
      const currentData = current ? JSON.parse(current) : [];
      const currentCount = Array.isArray(currentData) ? currentData.length : 0;
      
      if (currentCount !== original.count) {
        result.passed = false;
        result.differences.push({
          source: 'localStorage',
          key,
          type: 'count_mismatch',
          expected: original.count,
          actual: currentCount
        });
      }
    }
    
    // 对比 IndexedDB/SQLite
    const db = new Dexie('CropManagementDB');
    for (const [table, original] of Object.entries(baseline.indexedDB)) {
      const records = await db.table(table).toArray();
      if (records.length !== original.count) {
        result.passed = false;
        result.differences.push({
          source: 'indexedDB',
          table,
          type: 'count_mismatch',
          expected: original.count,
          actual: records.length
        });
      }
    }
    
    return result;
  }
  
  // 关键关联校验
  async validateRelations(): Promise<RelationValidationResult> {
    const issues: RelationIssue[] = [];
    
    // 1. 订单-实例关系
    const orders = JSON.parse(localStorage.getItem('crop_orders') || '[]');
    const instances = JSON.parse(localStorage.getItem('crop_instances') || '[]');
    
    for (const order of orders) {
      if (order.instanceIds) {
        for (const instId of order.instanceIds) {
          const exists = instances.find(i => i.id === instId);
          if (!exists) {
            issues.push({
              type: 'orphaned_reference',
              from: `orders:${order.id}`,
              to: `instances:${instId}`,
              description: `订单 ${order.orderCode} 引用了不存在的实例 ${instId}`
            });
          }
        }
      }
    }
    
    // 2. 实例-种源关系
    const seedSources = JSON.parse(localStorage.getItem('crop_seed_sources') || '[]');
    for (const inst of instances) {
      if (inst.seedSourceIds) {
        for (const ssId of inst.seedSourceIds) {
          const exists = seedSources.find(s => s.id === ssId);
          if (!exists) {
            issues.push({
              type: 'orphaned_reference',
              from: `instances:${inst.id}`,
              to: `seedSources:${ssId}`,
              description: `实例 ${inst.instanceCode} 引用了不存在的种源 ${ssId}`
            });
          }
        }
      }
    }
    
    return { valid: issues.length === 0, issues };
  }
}
```

### 3.6 性能与稳定性保障

#### 3.6.1 性能基线

| 指标 | 当前 LocalStorage | 迁移后 SQLite | 告警阈值 |
|------|------------------|----------------|---------|
| 列表查询 | < 100ms | < 200ms | > 500ms |
| 单条查询 | < 50ms | < 100ms | > 200ms |
| 新增操作 | < 50ms | < 150ms | > 300ms |
| 更新操作 | < 50ms | < 150ms | > 300ms |
| 删除操作 | < 50ms | < 150ms | > 300ms |
| 大数据量查询(1000+条) | < 200ms | < 500ms | > 1000ms |

#### 3.6.2 性能监控

```typescript
// 性能监控中间件
class PerformanceMonitor {
  
  private slowQueryThreshold = 300; // ms
  
  async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    // 记录性能指标
    this.recordMetric({
      operation,
      duration,
      timestamp: Date.now(),
      success: true
    });
    
    // 超过阈值告警
    if (duration > this.slowQueryThreshold) {
      console.warn(`⚠️ 慢查询告警: ${operation} 耗时 ${duration.toFixed(2)}ms`);
      this.sendAlert({
        type: 'slow_query',
        operation,
        duration
      });
    }
    
    return result;
  }
  
  // 生成性能报告
  generateReport(): PerformanceReport {
    return {
      avgQueryTime: this.calculateAverage(),
      p95QueryTime: this.calculatePercentile(95),
      p99QueryTime: this.calculatePercentile(99),
      slowQueries: this.getSlowQueries(),
      recommendations: this.getRecommendations()
    };
  }
}
```

---

## 四、完整 SQLite Schema 设计

### 4.1 系统设置层（基础数据）

```sql
-- ============================================
-- 1. 组织架构
-- ============================================

-- 公司/基地
CREATE TABLE company_groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 温室/大棚
CREATE TABLE greenhouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_id TEXT,
  area REAL DEFAULT 0,
  type TEXT DEFAULT 'glass' CHECK (type IN ('glass', 'solar', 'net', 'open')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (company_id) REFERENCES company_groups(id) ON DELETE SET NULL
);

-- 种植区域/分区
CREATE TABLE plant_areas (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  greenhouse_id TEXT NOT NULL,
  area REAL DEFAULT 0,
  soil_type TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE CASCADE
);

-- 部门
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT,
  manager_id TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (manager_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 职位
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id TEXT,
  level INTEGER DEFAULT 1,
  description TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 人员/员工
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  department_id TEXT,
  position_id TEXT,
  id_card TEXT,
  entry_date TEXT,
  leave_date TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned', 'on_leave')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
);

-- ============================================
-- 2. 供应商与仓库
-- ============================================

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  address TEXT,
  supplier_type TEXT DEFAULT 'seed' CHECK (supplier_type IN ('seed', 'equipment', 'fertilizer', 'pesticide', 'other')),
  status TEXT DEFAULT 'active',
  remarks TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'cold', 'seed', 'tool')),
  address TEXT,
  manager_id TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (manager_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 3. 作物品种库
-- ============================================

CREATE TABLE crop_varieties (
  id TEXT PRIMARY KEY,
  crop_code TEXT NOT NULL UNIQUE,
  category_code TEXT NOT NULL,
  category_name TEXT,
  type_code TEXT NOT NULL,
  type_name TEXT,
  variety_code TEXT NOT NULL,
  variety_name TEXT,
  sub_variety1_code TEXT,
  sub_variety1_name TEXT,
  detail_variety_code TEXT DEFAULT '00',
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime'))
);
```

### 4.2 作物管理核心层

```sql
-- ============================================
-- 4. 作物订单
-- ============================================

CREATE TABLE crop_orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  order_type TEXT DEFAULT 'production' CHECK (order_type IN ('production', 'seed', 'research', 'other')),
  order_name TEXT,
  crop_category TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT,
  planned_quantity REAL DEFAULT 0,
  actual_quantity REAL DEFAULT 0,
  unit TEXT,
  unit_price REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_production', 'harvesting', 'delivering', 'completed', 'cancelled')),
  customer_id TEXT,
  customer_name TEXT,
  customer_contact TEXT,
  delivery_date TEXT,
  delivery_address TEXT,
  fulfill_mode TEXT DEFAULT 'mixed' CHECK (fulfill_mode IN ('stock_reserve', 'plan_driven', 'order_driven', 'mixed')),
  plan_id TEXT,
  reserved_inventory_ids TEXT,
  delivered_quantity REAL DEFAULT 0,
  delivery_records TEXT,
  remarks TEXT,
  pictures TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- 订单-实例关联表
CREATE TABLE order_instances (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  assigned_quantity REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_id) REFERENCES crop_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE CASCADE,
  UNIQUE(order_id, instance_id)
);

-- ============================================
-- 5. 作物实例（核心追溯单元）
-- ============================================

CREATE TABLE crop_instances (
  id TEXT PRIMARY KEY,
  instance_code TEXT NOT NULL UNIQUE,
  order_id TEXT,
  order_code TEXT,
  crop_category TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT NOT NULL,
  category_code TEXT,
  type_code TEXT,
  sub_code TEXT,
  source_origin TEXT,
  source_description TEXT,
  source_instance_id TEXT,
  initial_quantity INTEGER DEFAULT 0,
  current_quantity INTEGER DEFAULT 0,
  planted_quantity INTEGER DEFAULT 0,
  harvested_quantity INTEGER DEFAULT 0,
  loss_quantity INTEGER DEFAULT 0,
  fulfilled_quantity INTEGER DEFAULT 0,
  status TEXT DEFAULT 'seedling' CHECK (status IN ('seedling', 'planted', 'growing', 'harvested', 'outbound', 'cancelled')),
  seed_entry_date TEXT,
  seedling_start_date TEXT,
  planting_date TEXT,
  harvest_date TEXT,
  current_location TEXT,
  location_history TEXT,
  loss_records TEXT,
  last_validation_time TEXT,
  validation_errors TEXT,
  print_count INTEGER DEFAULT 0,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_id) REFERENCES crop_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (source_instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 6. 种源管理
-- ============================================

CREATE TABLE seed_sources (
  id TEXT PRIMARY KEY,
  seed_code TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('seed', 'seedling', 'cutting', 'grafting', 'tissue_culture', 'split', 'bulb', 'other')),
  source_origin TEXT NOT NULL CHECK (source_origin IN ('internal_seed', 'external_purchase', 'tissue_culture', 'grafting', 'seedling_split', 'cutting', 'direct_seedling', 'direct_planting', 'external_harvest')),
  crop_category TEXT,
  type_name TEXT,
  variety_name TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT NOT NULL,
  supplier_id TEXT,
  purchase_date TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT,
  unit_price REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  initial_count INTEGER DEFAULT 0,
  available_count INTEGER DEFAULT 0,
  pictures TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'sufficient' CHECK (status IN ('sufficient', 'low', 'depleted')),
  traceability_code TEXT,
  print_count INTEGER DEFAULT 0,
  instance_id TEXT,
  production_plan_id TEXT,
  production_plan_code TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 7. 育苗管理
-- ============================================

CREATE TABLE seedlings (
  id TEXT PRIMARY KEY,
  seedling_code TEXT NOT NULL UNIQUE,
  source_id TEXT,
  source_code TEXT,
  crop_code TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  seedling_type TEXT,
  greenhouse_id TEXT,
  area_id TEXT,
  start_date TEXT,
  end_date TEXT,
  expected_end_date TEXT,
  initial_count INTEGER DEFAULT 0,
  survival_count INTEGER DEFAULT 0,
  planted_count INTEGER DEFAULT 0,
  survival_rate REAL DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  loss_rate REAL DEFAULT 0,
  is_finished INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'transplant_ready', 'completed', 'abnormal')),
  quality_grade TEXT,
  print_count INTEGER DEFAULT 0,
  pictures TEXT,
  remarks TEXT,
  instance_id TEXT,
  production_plan_id TEXT,
  production_plan_code TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (source_id) REFERENCES seed_sources(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- 育苗每日记录
CREATE TABLE daily_records (
  id TEXT PRIMARY KEY,
  seedling_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  temperature REAL,
  humidity REAL,
  watering INTEGER DEFAULT 0,
  ph_value REAL,
  ec_value REAL,
  abnormality TEXT,
  survival_count_change INTEGER DEFAULT 0,
  planted_count_change INTEGER DEFAULT 0,
  loss_count_change INTEGER DEFAULT 0,
  remarks TEXT,
  operator_id TEXT,
  create_time TEXT DEFAULT (datetime('now', 'now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (seedling_id) REFERENCES seedlings(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 8. 种植管理
-- ============================================

CREATE TABLE plantings (
  id TEXT PRIMARY KEY,
  planting_code TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('seed', 'seedling', 'cutting', 'grafting', 'tissue_culture', 'split', 'bulb', 'other')),
  source_id TEXT,
  source_code TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT NOT NULL,
  greenhouse_id TEXT,
  area_id TEXT,
  planting_count INTEGER DEFAULT 0,
  planting_date TEXT,
  soil_ph REAL,
  soil_ec REAL,
  transplant_count INTEGER DEFAULT 0,
  transplant_date TEXT,
  survival_count INTEGER DEFAULT 0,
  survival_rate REAL DEFAULT 0,
  is_harvest INTEGER DEFAULT 0,
  harvest_date TEXT,
  expected_harvest_date TEXT,
  harvest_quantity INTEGER DEFAULT 0,
  attrition_rate REAL DEFAULT 0,
  traceability_code TEXT,
  print_count INTEGER DEFAULT 0,
  pictures TEXT,
  status TEXT DEFAULT 'planted' CHECK (status IN ('planted', 'growing', 'harvested', 'cancelled')),
  remarks TEXT,
  instance_id TEXT,
  production_plan_id TEXT,
  production_plan_code TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 9. 采收管理
-- ============================================

CREATE TABLE harvest_records (
  id TEXT PRIMARY KEY,
  harvest_code TEXT NOT NULL UNIQUE,
  planting_id TEXT,
  batch_code TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT,
  greenhouse_id TEXT,
  harvest_date TEXT NOT NULL,
  harvest_area REAL DEFAULT 0,
  harvest_quantity REAL DEFAULT 0,
  unit TEXT DEFAULT '公斤',
  quality TEXT,
  grade TEXT,
  harvester_ids TEXT,
  warehouse_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'stored', 'graded', 'outbound')),
  auditor_id TEXT,
  target_yield REAL DEFAULT 0,
  related_task_id TEXT,
  planting_mode TEXT,
  pictures TEXT,
  remarks TEXT,
  instance_id TEXT,
  production_plan_id TEXT,
  production_plan_code TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (auditor_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);
```

### 4.3 库存与物料层

```sql
-- ============================================
-- 10. 物料管理
-- ============================================

CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  supplier_id TEXT,
  stock_quantity REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 物料领用记录
CREATE TABLE material_receiving_records (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  applicant_id TEXT,
  approver_id TEXT,
  use_purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (applicant_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 物料归还记录
CREATE TABLE material_returns (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL,
  receiving_record_id TEXT,
  quantity REAL DEFAULT 0,
  return_date TEXT,
  returner_id TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (receiving_record_id) REFERENCES material_receiving_records(id) ON DELETE SET NULL,
  FOREIGN KEY (returner_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 11. 产品库存
-- ============================================

CREATE TABLE produce_inventories (
  id TEXT PRIMARY KEY,
  product_code TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT,
  quantity REAL DEFAULT 0,
  unit TEXT DEFAULT '公斤',
  grade TEXT,
  warehouse_id TEXT NOT NULL,
  storage_location TEXT,
  harvest_date TEXT,
  storage_date TEXT,
  expiration_date TEXT,
  batch_code TEXT,
  source_instance_id TEXT,
  source_harvest_id TEXT,
  reservation_status TEXT DEFAULT 'available' CHECK (reservation_status IN ('available', 'reserved', 'outbound')),
  reserved_for_order_id TEXT,
  alert_settings TEXT,
  inbound_records TEXT,
  outbound_records TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (source_harvest_id) REFERENCES harvest_records(id) ON DELETE SET NULL,
  FOREIGN KEY (reserved_for_order_id) REFERENCES crop_orders(id) ON DELETE SET NULL
);
```

### 4.4 农事与生产计划层

```sql
-- ============================================
-- 12. 农事任务
-- ============================================

CREATE TABLE farm_tasks (
  id TEXT PRIMARY KEY,
  task_code TEXT NOT NULL UNIQUE,
  task_title TEXT NOT NULL,
  task_type TEXT,
  task_content TEXT,
  assignee_id TEXT,
  greenhouse_id TEXT,
  area_id TEXT,
  plan_date TEXT,
  plan_time TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completion_date TEXT,
  completion_note TEXT,
  planting_id TEXT,
  related_materials TEXT,
  required_feedback TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 13. 巡查记录
-- ============================================

CREATE TABLE inspections (
  id TEXT PRIMARY KEY,
  record_code TEXT NOT NULL UNIQUE,
  inspection_type TEXT,
  inspector_id TEXT,
  greenhouse_id TEXT,
  check_date TEXT,
  check_time TEXT,
  check_result TEXT,
  issue_severity TEXT,
  issue_text TEXT,
  images TEXT,
  status TEXT DEFAULT 'pending',
  related_task_id TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (inspector_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (related_task_id) REFERENCES farm_tasks(id) ON DELETE SET NULL
);

-- ============================================
-- 14. 问题记录
-- ============================================

CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  problem_code TEXT NOT NULL UNIQUE,
  problem_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  greenhouse_id TEXT,
  reporter_id TEXT,
  assignee_id TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  related_task_id TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (reporter_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (related_task_id) REFERENCES farm_tasks(id) ON DELETE SET NULL
);

-- ============================================
-- 15. 生产计划
-- ============================================

CREATE TABLE production_plans (
  id TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL UNIQUE,
  plan_name TEXT,
  plan_type TEXT,
  crop_name TEXT,
  crop_variety TEXT,
  crop_code TEXT,
  planned_quantity REAL DEFAULT 0,
  planned_area REAL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
  greenhouse_id TEXT,
  area_id TEXT,
  order_id TEXT,
  remarks TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES crop_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- 日计划
CREATE TABLE daily_plans (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  plan_date TEXT NOT NULL,
  task_type TEXT,
  task_content TEXT,
  greenhouse_id TEXT,
  area_id TEXT,
  assignee_id TEXT,
  status TEXT DEFAULT 'pending',
  completion_note TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (plan_id) REFERENCES production_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL
);
```

### 4.5 人工管理与审批层

```sql
-- ============================================
-- 16. 考勤
-- ============================================

CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'late', 'early_leave', 'absent', 'on_leave', 'overtime')),
  work_hours REAL DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  remarks TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE(employee_id, date)
);

-- 考勤补卡
CREATE TABLE attendance_repairs (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'check_in' CHECK (type IN ('check_in', 'check_out')),
  reason TEXT,
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 17. 请假
-- ============================================

CREATE TABLE leave_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  days REAL DEFAULT 0,
  reason TEXT,
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 18. 加班
-- ============================================

CREATE TABLE overtime_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT,
  hours REAL DEFAULT 0,
  reason TEXT,
  compensatory_type TEXT DEFAULT 'pay',
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 19. 招聘
-- ============================================

CREATE TABLE recruitment_records (
  id TEXT PRIMARY KEY,
  position_id TEXT,
  department_id TEXT,
  headcount INTEGER DEFAULT 1,
  requirements TEXT,
  status TEXT DEFAULT 'open',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ============================================
-- 20. 合同
-- ============================================

CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  contract_type TEXT,
  start_date TEXT,
  end_date TEXT,
  salary REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- ============================================
-- 21. 入职
-- ============================================

CREATE TABLE onboardings (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  join_date TEXT,
  mentor_id TEXT,
  training_status TEXT DEFAULT 'in_progress',
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 22. 离职
-- ============================================

CREATE TABLE resignations (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  resign_date TEXT,
  reason TEXT,
  handover_status TEXT DEFAULT 'pending',
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 23. 调薪
-- ============================================

CREATE TABLE salary_adjustments (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  old_salary REAL DEFAULT 0,
  new_salary REAL DEFAULT 0,
  adjustment_type TEXT,
  effective_date TEXT,
  reason TEXT,
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 24. 任务中心
-- ============================================

CREATE TABLE task_center_records (
  id TEXT PRIMARY KEY,
  task_code TEXT NOT NULL UNIQUE,
  task_title TEXT NOT NULL,
  task_type TEXT,
  assignee_id TEXT,
  assigner_id TEXT,
  greenhouse_id TEXT,
  plan_date TEXT,
  due_date TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  completion_note TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (assigner_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL
);

-- ============================================
-- 25. 审批中心
-- ============================================

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  applicant_id TEXT NOT NULL,
  approver_id TEXT,
  cc_ids TEXT,
  content TEXT,
  attachments TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  result TEXT,
  apply_date TEXT,
  approve_date TEXT,
  related_record_type TEXT,
  related_record_id TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (applicant_id) REFERENCES staff(id) ON DELETE RESTRICT,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);
```

---

## 五、迁移实施计划

### 5.1 总体时间规划

```
Phase 1: 基础准备（第1-2天）
├── 创建所有 SQLite 表结构
├── 编写迁移脚本
├── 编写备份/回滚脚本
└── 搭建测试环境

Phase 2: 基础数据迁移（第3-4天）
├── 迁移 crop_varieties（品种库）
├── 迁移 departments/positions/staff（组织架构）
├── 迁移 suppliers（供应商）
├── 迁移 greenhouses/plant_areas（温室/区域）
└── 迁移 warehouses（仓库）

Phase 3: 作物管理迁移（第5-7天）
├── 迁移 crop_orders（订单）
├── 迁移 crop_instances（实例）
├── 迁移 seed_sources（种源）
├── 迁移 seedlings（育苗）
├── 迁移 plantings（种植）
└── 迁移 harvest_records（采收）

Phase 4: 业务模块迁移（第8-12天）
├── 迁移 farm_tasks（农事任务）
├── 迁移 inspections（巡查）
├── 迁移 problems（问题）
├── 迁移 materials（物料）
├── 迁移 material_receiving_records（领用）
└── 迁移 production_plans（生产计划）

Phase 5: 人工管理迁移（第13-15天）
├── 迁移 attendance_records（考勤）
├── 迁移 leave_records（请假）
├── 迁移 overtime_records（加班）
├── 迁移 approvals（审批）
└── 迁移其他 HR 相关表

Phase 6: 灰度上线（第16-20天）
├── 灰度1: 1% 用户测试
├── 灰度2: 5% 用户测试
├── 灰度3: 20% 用户测试
├── 灰度4: 50% 用户测试
└── 灰度5: 100% 用户切换

Phase 7: 清理与优化（第21-25天）
├── 清理 LocalStorage 旧数据
├── 优化查询性能
├── 完善监控告警
└── 编写迁移总结报告
```

### 5.2 每日里程碑

| Day | 里程碑 | 完成标准 |
|-----|--------|---------|
| Day 1 | 表结构创建完成 | 45+ 张表全部创建，外键关系正确 |
| Day 2 | 备份系统验证通过 | 可成功创建快照、恢复快照 |
| Day 3 | 品种库迁移完成 | 6 条品种数据正确迁移 |
| Day 4 | 组织架构迁移完成 | 部门、职位、员工数据完整 |
| Day 5 | 订单+实例迁移完成 | 6 订单、12 实例数据一致 |
| Day 6 | 种源+育苗迁移完成 | 24 种源、12 育苗数据完整 |
| Day 7 | 种植+采收迁移完成 | 全链路追溯数据验证通过 |
| Day 10 | 农事+巡查+物料迁移 | 业务数据完整性验证 |
| Day 15 | 人工+审批全迁移 | HR 全流程数据闭环 |
| Day 20 | 灰度上线完成 | 100% 用户切换，无异常 |
| Day 25 | 迁移项目验收 | 性能基线达标，无数据丢失 |

---

## 六、数据迁移脚本设计

### 6.1 迁移执行器架构

```typescript
// 迁移执行器
class MigrationExecutor {
  private backupManager: MigrationBackupManager;
  private validator: DataIntegrityValidator;
  private featureFlag: FeatureFlag;
  
  constructor() {
    this.backupManager = new MigrationBackupManager();
    this.validator = new DataIntegrityValidator();
    this.featureFlag = new FeatureFlag();
  }
  
  // 执行单个表的迁移
  async migrateTable(
    tableName: string,
    sourceDataGetter: () => Promise<any[]>,
    transformer: (data: any) => any,
    validator?: (data: any[]) => Promise<boolean>
  ): Promise<MigrationResult> {
    const stepSnapshot = await this.backupManager.createStepSnapshot(tableName);
    
    try {
      // 1. 读取源数据
      console.log(`📖 读取 ${tableName} 源数据...`);
      const sourceData = await sourceDataGetter();
      
      // 2. 数据转换
      console.log(`🔄 转换 ${tableName} 数据...`);
      const transformedData = sourceData.map(transformer);
      
      // 3. 写入 SQLite
      console.log(`💾 写入 ${tableName} 到 SQLite...`);
      await this.writeToSQLite(tableName, transformedData);
      
      // 4. 校验
      if (validator) {
        const isValid = await validator(transformedData);
        if (!isValid) {
          throw new Error(`数据校验失败: ${tableName}`);
        }
      }
      
      // 5. 双写保持（迁移期间）
      if (this.featureFlag.isEnabled('dual_write')) {
        await this.writeToLocalStorage(tableName, sourceData);
      }
      
      return {
        success: true,
        tableName,
        migratedCount: transformedData.length,
        snapshotId: stepSnapshot
      };
      
    } catch (error) {
      // 回滚
      console.error(`❌ ${tableName} 迁移失败，执行回滚...`);
      await this.backupManager.restoreStepSnapshot(stepSnapshot);
      
      return {
        success: false,
        tableName,
        error: error.message
      };
    }
  }
  
  // 迁移特定数据（带关联）
  async migrateCropManagementData(): Promise<void> {
    // 1. 迁移品种库（无依赖）
    await this.migrateTable(
      'crop_varieties',
      () => this.getCropVarietiesFromLocalStorage(),
      (item) => this.transformCropVariety(item)
    );
    
    // 2. 迁移订单（无依赖）
    await this.migrateTable(
      'crop_orders',
      () => this.getOrdersFromLocalStorage(),
      (item) => this.transformOrder(item)
    );
    
    // 3. 迁移实例（依赖订单）
    await this.migrateTable(
      'crop_instances',
      () => this.getInstancesFromLocalStorage(),
      (item) => this.transformInstance(item),
      async (data) => this.validateInstanceRelations(data)
    );
    
    // 4. 迁移种源（依赖实例）
    await this.migrateTable(
      'seed_sources',
      () => this.getSeedSourcesFromLocalStorage(),
      (item) => this.transformSeedSource(item)
    );
    
    // 5. 迁移育苗（依赖种源、实例）
    await this.migrateTable(
      'seedlings',
      () => this.getSeedlingsFromLocalStorage(),
      (item) => this.transformSeedling(item)
    );
    
    // 6. 迁移种植（依赖育苗、实例）
    await this.migrateTable(
      'plantings',
      () => this.getPlantingsFromLocalStorage(),
      (item) => this.transformPlanting(item)
    );
    
    // 7. 迁移采收（依赖种植、实例）
    await this.migrateTable(
      'harvest_records',
      () => this.getHarvestsFromLocalStorage(),
      (item) => this.transformHarvest(item)
    );
  }
}
```

### 6.2 数据转换示例

```typescript
// 转换器示例
class DataTransformer {
  
  // 转换订单
  transformOrder(order: any): CropOrder {
    return {
      id: order.id || this.generateId('ORD'),
      order_code: order.orderCode,
      order_type: order.orderType || 'production',
      order_name: order.orderName,
      crop_name: order.cropName,
      crop_variety: order.cropVariety,
      crop_code: order.cropCode,
      planned_quantity: order.plannedQuantity || 0,
      actual_quantity: order.actualQuantity || 0,
      unit: order.unit,
      status: this.normalizeOrderStatus(order.status),
      customer_name: order.customerName,
      delivery_date: order.deliveryDate,
      instance_ids: order.instanceIds || [],
      create_by: this.resolveStaffId(order.createBy),
      create_time: order.createTime || new Date().toISOString(),
      update_time: order.updateTime || new Date().toISOString()
    };
  }
  
  // 转换作物实例
  transformInstance(instance: any): CropInstance {
    return {
      id: instance.id || this.generateId('INS'),
      instance_code: instance.instanceCode,
      order_id: instance.orderId,
      order_code: instance.orderCode,
      crop_category: instance.cropCategory,
      crop_name: instance.cropName,
      crop_variety: instance.cropVariety,
      crop_code: instance.cropCode,
      category_code: instance.categoryCode,
      type_code: instance.typeCode,
      sub_code: instance.subCode,
      source_origin: instance.sourceOrigin,
      source_description: instance.sourceDescription,
      initial_quantity: instance.initialQuantity || 0,
      current_quantity: instance.currentQuantity || 0,
      planted_quantity: instance.plantedQuantity || 0,
      harvested_quantity: instance.harvestedQuantity || 0,
      loss_quantity: instance.lossQuantity || 0,
      status: this.normalizeInstanceStatus(instance.status),
      seed_entry_date: instance.seedEntryDate,
      planting_date: instance.plantingDate,
      harvest_date: instance.harvestDate,
      create_by: this.resolveStaffId(instance.createBy),
      create_time: instance.createTime || new Date().toISOString(),
      update_time: instance.updateTime || new Date().toISOString()
    };
  }
  
  // 状态标准化
  normalizeOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'planned': 'confirmed',
      'in_production': 'in_production',
      'harvesting': 'harvesting',
      'delivering': 'delivering',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }
  
  // 人员名称转ID（兼容旧数据）
  private staffNameToIdCache: Map<string, string> = new Map();
  
  resolveStaffId(createBy: string): string | null {
    if (!createBy) return null;
    
    // 先查缓存
    if (this.staffNameToIdCache.has(createBy)) {
      return this.staffNameToIdCache.get(createBy);
    }
    
    // 从 staff 表查询
    // 实际实现会查询 SQLite，这里简化处理
    return null; // 旧数据中 createBy 是字符串名称，迁移后应关联 staff 表
  }
}
```

---

## 七、字段映射对照表

### 7.1 LocalStorage → SQLite 映射

| LocalStorage 字段 | SQLite 字段 | 转换说明 |
|------------------|-------------|---------|
| `crop_orders` | `crop_orders` | 主数据不变 |
| `crop_instances` | `crop_instances` | 主数据不变 |
| `crop_seed_sources` | `seed_sources` | 键名变化 |
| `crop_seedlings` | `seedlings` | 键名变化 |
| `crop_plantings` | `plantings` | 键名变化 |
| `harvest_records` | `harvest_records` | 主数据不变 |
| `instanceIds[]` | `order_instances` | 一对多转关联表 |
| `harvesterIds[]` | `harvester_ids` (JSON) | 数组转 JSON 字符串 |
| `harvesterNames[]` | (移除) | 通过 harvester_ids 关联查询 |
| `createBy: "李明辉"` | `create_by: "ST001"` | 字符串转外键 |
| `siteName: "育苗温室A区"` | `greenhouse_id: "GH001"` | 字符串转外键 |
| `areaName: "01区"` | `area_id: "PA001"` | 字符串转外键 |
| `warehouseName: "冷库1号"` | `warehouse_id: "WH001"` | 字符串转外键 |
| `auditor: "陆启闯"` | `auditor_id: "ST002"` | 字符串转外键 |

### 7.2 关键字段变更说明

**1. `createBy` 从字符串 → 外键关联**

```
旧：createBy: '李明辉'（字符串，人员改名后所有历史记录失效）
新：create_by: 'ST001'（staff.id 外键，人员改名不影响历史记录）
```

**2. `siteName` / `greenhouseName` / `areaName` 从字符串 → 外键查询**

```
旧：siteName: '育苗温室A区'（字符串，温室改名后所有记录失效）
新：greenhouse_id: 'GH001'（查询 greenhouses 表获取当前名称）
```

**3. 采收人员从名称数组 → ID 数组**

```
旧：harvesterNames: ['张三', '李四']（无法关联到人员表）
新：harvester_ids: '["ST003", "ST004"]'（JSON 数组，通过 staff 表查询获取名称）
```

---

## 八、验证检查清单

### 8.1 迁移前检查

- [ ] 所有 LocalStorage 键值已统计
- [ ] 数据基线快照已创建
- [ ] SQLite 表结构已验证
- [ ] 外键关系已验证
- [ ] 备份恢复流程已测试

### 8.2 迁移后检查

- [ ] 数据条数一致（源 vs SQLite）
- [ ] 关键字段完整性（无 null 必填字段）
- [ ] 关联关系正确（无孤儿记录）
- [ ] 时间戳合理性（create_time < update_time）
- [ ] 状态值有效（符合 CHECK 约束）

### 8.3 业务闭环验证

- [ ] 订单 → 实例 → 种源 → 育苗 → 种植 → 采收 全链路追溯
- [ ] 采收 → 产品库存 自动入库
- [ ] 库存 → 领用/归还 闭环
- [ ] 审批 → 业务记录 关联

### 8.4 性能验证

- [ ] 列表查询响应时间 < 200ms
- [ ] 单条查询响应时间 < 100ms
- [ ] 写入操作响应时间 < 150ms
- [ ] 无内存泄漏
- [ ] 无连接池耗尽

---

## 九、风险与应对

### 9.1 已知风险

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|---------|
| 数据丢失 | 低 | 极高 | 多级备份 + 回滚机制 |
| 性能下降 | 中 | 高 | 灰度上线 + 性能监控 |
| 兼容性问题 | 中 | 高 | 双写保险 + Feature Flag |
| 外键约束冲突 | 低 | 高 | 迁移前数据清洗 |
| 超大数据量迁移超时 | 中 | 中 | 分批迁移 + 进度显示 |

### 9.2 应急联系

| 角色 | 职责 | 联系方式 |
|------|------|---------|
| 迁移负责人 | 整体协调 | - |
| 后端开发 | SQLite 问题 | - |
| 前端开发 | LocalStorage 兼容 | - |
| 测试 | 验收测试 | - |

---

## 十、附录

### 10.1 迁移相关文件清单

| 文件路径 | 说明 |
|---------|------|
| `src/db/database.ts` | IndexedDB 数据库定义 |
| `src/utils/dataInitializer.ts` | 数据初始化模块 |
| `src/hooks/useLocalStorage.ts` | LocalStorage Hook |
| `src/services/*Service.ts` | 各模块 Service |
| `src/types/*.ts` | 类型定义 |
| `src/data/mockData.ts` | 模拟数据 |
| `public/数据迁移-opencode.md` | 本方案文档 |

### 10.2 参考文档

- SQLite 官方文档：https://www.sqlite.org/docs.html
- Dexie.js 文档：https://dexie.org/docs/
- 现有迁移方案：`public/TMcrop_SQLite全量迁移方案.md`

---

**文档结束**

**下一步行动**：
1. 审查并批准本方案
2. 准备测试环境
3. 开始 Phase 1：表结构创建

---

*本方案由 OpenCode AI 制定，如有问题请联系开发团队*
