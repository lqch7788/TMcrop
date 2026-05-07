# V1.1 种植管理系统 - 代码审查完整报告

**审查日期**: 2026-05-05
**审查版本**: V1.0 (opencode深度审核版)
**审查范围**: 全系统深度代码审查（8个专业代理并行深度审核）
**核心问题**: localStorage 与 SQLite 双数据源混乱，数据迁移严重不完整

---

## 📊 总体评分汇总

| 模块 | 数据一致性 | 代码质量 | API完整性 | 关键问题数 |
|------|-----------|---------|----------|-----------|
| 仓储库存模块 | **0/10** | 2/10 | 0/10 | CRITICAL×6 |
| 人力资源模块 | **1/10** | 3/10 | 0/10 | CRITICAL×5 |
| 生产计划模块 | **1/10** | 2/10 | 0/10 | CRITICAL×4 |
| 农场种植模块 | **2/10** | 3/10 | 1/10 | CRITICAL×6 |
| 采收模块 | **2/10** | 3/10 | 1/10 | CRITICAL×5 |
| 订单模块 | **3/10** | 4/10 | 2/10 | CRITICAL×4 |
| 农事任务模块 | **1/10** | 3/10 | 1/10 | CRITICAL×4 |
| 审批工作流 | **4/10** | 5/10 | 5/10 | HIGH×4 |

---

## 🚨 问题严重程度定义

| 级别 | 含义 | 要求 |
|------|------|------|
| CRITICAL | 安全漏洞、数据丢失风险、核心功能完全不可用 | **必须立即修复** |
| HIGH | Bug或重大质量问题、功能部分失效 | **应尽快修复** |
| MEDIUM | 可维护性问题、数据一致性问题 | **建议修复** |
| LOW | 风格或次要建议 | **可选** |

---

## 🔴 CRITICAL 问题清单（共34个）

### 【种植模块】6个 CRITICAL

#### 1. EditModal 编辑后不保存数据
- **文件**: `src/components/farm/planting/modals/EditModal.tsx:38-41`
- **问题**: `handleSubmit` 只打印日志不调用 API 保存
```typescript
const handleSubmit = () => {
  console.log('Update:', formData, record.id);
  onClose();  // ❌ 没有调用 API！
};
```
- **影响**: 用户编辑内容丢失

#### 2. 后端缺少采收路由
- **文件**: `server/src/routes/planting.ts`
- **问题**: 前端调用 `/plantings/:id/harvest`，后端未实现
- **影响**: 采收功能完全不可用

#### 3. 批量删除路由未实现
- **文件**: `server/src/routes/planting.ts`
- **问题**: 前端调用 `DELETE /plantings/batch`，后端未实现
- **影响**: 批量删除功能失效

#### 4. handleDelete 缺少 await
- **文件**: `src/components/farm/planting/PlantingPage.tsx:177-183`
- **问题**: 异步删除未等待完成就刷新数据
- **影响**: 数据不一致

#### 5. 字段映射严重错误
- **文件**: `server/src/routes/planting.ts:17-56`
- **问题**: 后端 SELECT 大量硬编码空字符串，字段名错误映射
```sql
source_name AS sourceCode,  -- ❌ 错误映射
'' AS cropCode,            -- ❌ 硬编码为空
'' AS areaId,              -- ❌ 硬编码为空
```
- **影响**: 前端收到大量空值

#### 6. 后端 PUT 路由字段名不匹配
- **文件**: `server/src/routes/planting.ts:139-160`
- **问题**: 直接使用前端 camelCase 字段名作为数据库列名
- **影响**: 数据库更新失败

---

### 【采收模块】5个 CRITICAL

#### 7. 采收记录创建调用错误的 Service
- **文件**: `src/components/farm/harvest/HarvestPage.tsx:550`
- **问题**: 使用 `harvestService` (localStorage版) 而非 `apiHarvestService` (API版)
```typescript
const newRecord = harvestService.addHarvestRecord(record);  // ❌ 错误的 service
```
- **影响**: 数据只保存在 localStorage，不同步后端

#### 8. 批量编辑不调用后端 API
- **文件**: `src/components/farm/harvest/HarvestPage.tsx:312-355`
- **问题**: `handleConfirmBatchEdit` 只更新本地 state
```typescript
setHarvestRecords(updatedRecords);  // ❌ 没有调用 API
```
- **影响**: 批量编辑数据丢失

#### 9. 批量删除不调用后端 API
- **文件**: `src/components/farm/harvest/HarvestPage.tsx:367-379`
- **问题**: `handleConfirmBatchDelete` 只过滤本地数据
- **影响**: 批量删除数据丢失

#### 10. 异步操作未 await
- **文件**: `src/components/farm/harvest/HarvestPage.tsx:525-577`
- **问题**: `productRecords.forEach` 中未 await
```typescript
productRecords.forEach((product) => {
  const newRecord = harvestService.addHarvestRecord(record);  // ❌ 没有 await
});
```
- **影响**: 数据添加顺序不确定，可能丢失

#### 11. 后端 API 字段不完整
- **文件**: `server/src/routes/harvest.ts:73-98`
- **问题**: 后端 INSERT 期望的字段比前端传递的多
- **影响**: 部分字段为 NULL

---

### 【育苗模块】6个 CRITICAL

#### 12. 后端 API 严重不完整 (20个接口缺失)
- **文件**: `server/src/routes/seedling.ts`
- **问题**: 后端只有5个基础CRUD，缺少：
  - `POST /:id/daily-records` (每日记录)
  - `POST /:id/transplant-records` (定植记录)
  - `POST /:id/print` (打印)
  - `GET /transplant-ready` 等20个接口
- **影响**: 育苗的每日记录、定植、打印功能完全失效

#### 13. 数据库字段严重缺失
- **文件**: `server/src/db/schema.ts:420-444`
- **问题**: seedlings 表缺少：
  - `crop_code` - 无法关联品种库
  - `planted_count` - 定植数量丢失
  - `pictures` - 图片无法存储
  - `quality_grade` - 品质等级丢失
  - `daily_records`、`print_records`、`transplant_records` 表完全缺失
- **影响**: 核心业务数据无法存储

#### 14. SeedlingPage 筛选逻辑有 bug
- **文件**: `src/components/farm/seedling/SeedlingPage.tsx:179-180`
- **问题**: return 语句使用未定义的 `result` 变量
```typescript
return result;  // ❌ 'result' 未定义！应该是 'return seedlings.filter(...)'
```
- **影响**: 页面崩溃

#### 15. DailyRecord API 映射缺失
- **文件**: `src/services/apiSeedlingService.ts:241-247`
- **问题**: 调用后端 `/seedlings/:id/daily-records`，后端未实现
- **影响**: 每日记录功能失效

#### 16. 定植功能后端依赖缺失
- **文件**: `src/components/farm/seedling/modals/TransplantModal.tsx:86-87`
- **问题**: `increasePlantedCount` 调用的后端接口未实现
- **影响**: 定植操作无法完成

#### 17. 定植结束功能逻辑问题
- **文件**: `src/components/farm/seedling/SeedlingPage.tsx:241-275`
- **问题**: 无生产计划的育苗无法结束，使用 `window.location.reload()`
- **影响**: 功能不完整，用户体验差

---

### 【订单模块】4个 CRITICAL

#### 18. 订单删除缺少 await
- **文件**: `src/components/farm/order/OrderPage.tsx:113-119`
- **问题**: 异步删除未等待完成
```typescript
cropOrderService.deleteOrders(ids);  // ❌ 没有 await
refreshData();
```
- **影响**: 数据不一致

#### 19. 订单编号生成格式不一致
- **文件**: `src/services/cropOrderService.ts:16-33` vs `server/src/routes/cropOrder.ts:26-34`
- **问题**:
  - 本地: `DD20240505001` (DD前缀+日期+3位流水号)
  - 后端: `OR202455OR00001` (OR前缀+随机数) ❌ 使用随机数！
- **影响**: 订单编号可能重复，并发问题

#### 20. 批量删除 API 路由缺失
- **文件**: `server/src/routes/cropOrder.ts`
- **问题**: 前端调用 `DELETE /crop-orders/batch`，后端未实现
- **影响**: 批量删除失效

#### 21. 后端删除权限与前端不一致
- **文件**: `server/src/routes/cropOrder.ts:304-307`
- **问题**: 后端只允许删除草稿/已取消订单，前端无校验
- **影响**: 用户看到删除失败但无提示

---

### 【仓储库存模块】6个 CRITICAL

#### 22. 入库操作不调用后端 API
- **文件**: `src/components/warehouse/WarehouseMaterialsPage.tsx:659-667`
- **问题**: `handleSaveNewInbound` 只更新本地 state
```typescript
setInboundRecords(prev => [newRecord, ...prev]);  // ❌ 没有调用 API
```
- **影响**: 入库数据刷新丢失

#### 23. 批量删除/编辑不调用 API
- **文件**: `src/components/warehouse/WarehouseMaterialsPage.tsx:572-629`
- **问题**: `handleConfirmDelete`、`handleBatchSaveRecord` 等都只操作本地 state
- **影响**: 数据操作不持久化

#### 24. 硬编码 Mock 数据 (13种物料+12条入库记录)
- **文件**: `src/components/warehouse/WarehouseMaterialsPage.tsx:185-345`
- **问题**: 13种物料和12条入库记录全部硬编码
```typescript
const warehouseMaterials: Material[] = [
  { id: 1, code: 'SP0101001', name: '水稻种子', ... },
  // 共13种硬编码
];
```
- **影响**: 系统实际上是"假系统"，无真实数据

#### 25. API 服务定义了但未使用
- **文件**: `src/services/apiInventoryService.ts`
- **问题**: 完整的 API 服务已定义，但 `WarehouseMaterialsPage.tsx` 完全没有导入
- **影响**: 代码冗余，维护困难

#### 26. 数据加载静默降级到 Mock
- **文件**: `src/components/warehouse/WarehouseMaterialsPage.tsx:407-460`
- **问题**: API 返回空或异常时自动降级到 mock，无用户提示
```typescript
if (materialsData && materialsData.length > 0) {
  setWarehouseData(materialsData);
} else {
  setWarehouseData(warehouseMaterials);  // ❌ 静默降级
}
```
- **影响**: 用户不知道数据是假的

#### 27. 编码生成是假的
- **文件**: `src/components/warehouse/MaterialInboundTab.tsx:211-218`
- **问题**: 编码生成总是返回 `SP0101001`
```typescript
setCodeGen({ ...codeGen, generatedCode: 'SP0101001' });  // ❌ 硬编码返回
```
- **影响**: 无法生成唯一编码

---

### 【人力资源模块】5个 CRITICAL

#### 28. 请假额度使用硬编码模拟数据
- **文件**: `src/pages/labor/LeavePage.tsx:60-68`
- **问题**: `getLeaveQuota` 返回硬编码的3个员工数据
```typescript
const quotaMap: Record<string, LeaveQuota> = {
  'EMP20240001': { staffId: 'EMP20240001', staffName: '张伟民', ... },
  'EMP20240002': { staffId: 'EMP20240002', staffName: '李秀英', ... },
  'EMP20240003': { staffId: 'EMP20240003', staffName: '王建国', ... },
};
```
- **影响**: 新员工无法获取请假额度

#### 29. 加班记录未持久化
- **文件**: `src/pages/labor/OvertimePage.tsx:260-323`
- **问题**: `handleSubmit` 只更新本地 state，未调用 `overtimeCalculationService`
```typescript
setOvertimeRecords(prev => [newRecord, ...prev]);  // ❌ 没有持久化
```
- **影响**: 加班数据刷新丢失，薪资计算无数据

#### 30. 审批通过后未更新加班状态
- **文件**: `src/pages/labor/OvertimePage.tsx:326-334`
- **问题**: 审批通过时未调用 `overtimeCalculationService.updateRecordStatus()`
- **影响**: 加班状态不更新

#### 31. 薪资模块无后端支持
- **文件**: `src/services/salaryCalculationService.ts`
- **问题**: 所有数据操作只读写 LocalStorage，无 API 调用
- **影响**: 薪资数据无法跨设备同步，无后端备份

#### 32. 多处 await 缺失 (7+ 处)
- **文件**: `src/pages/labor/LeavePage.tsx` (第350, 367, 380, 402行)
- **文件**: `src/pages/labor/OvertimePage.tsx` (第318, 329, 340行)
- **问题**: `addApproval`、`approve`、`reject` 等 async 函数调用未 await
- **影响**: 数据不一致，用户界面响应与实际 API 状态不同步

---

### 【生产计划模块】4个 CRITICAL

#### 33. 创建生产计划不调用后端 API
- **文件**: `src/components/production/ProductionPage.tsx:166-219`
- **问题**: `handleSubmit` 只更新本地 state
```typescript
setBatches([newBatch, ...batches]);  // ❌ 没有调用 API
```
- **影响**: 创建的计划刷新丢失

#### 34. 批次数据回退到 mock
- **文件**: `src/components/production/ProductionPage.tsx:42-78`
- **问题**: API 返回空时使用 `cropBatches` mock
```typescript
if (apiData && apiData.length > 0) {
  setBatches(apiData);
} else {
  setBatches(cropBatches);  // ❌ 回退到 mock
}
```
- **影响**: 用户创建的数据不显示

---

## 🟠 HIGH 问题清单（共42个）

### 种植模块 - 4个
1. PrintLabelModal 使用本地服务而非 API 服务
2. createBy 硬编码为"当前用户"
3. SQL 注入风险 (分页参数)
4. 采收计算逻辑重复

### 采收模块 - 5个
1. 后端缺少批量更新 API
2. 后端缺少批量删除 API
3. 批量删除逻辑有 bug (索引不一致)
4. 权限检查被禁用
5. productCode 生成使用随机数

### 育苗模块 - 5个
1. 每日记录 API 后端未实现
2. 定植记录 API 后端未实现
3. 打印记录 API 后端未实现
4. 用户信息硬编码
5. 字段映射临时补救措施

### 订单模块 - 5个
1. createBy 硬编码为"系统"
2. 订单状态选项重复定义
3. API 响应数据未充分利用
4. 字段映射不完整
5. 导出功能表头重复

### 仓储库存模块 - 6个
1. 字段命名不一致 (Material vs InventoryRecord)
2. 后端 INSERT 存在 SQL 注入风险
3. 代码耦合严重 (1000+ 行 monolithic)
4. 硬编码价格单位
5. 入库审核流程未实现
6. 出库功能缺失

### 人力资源模块 - 6个
1. leaveQuotaService 配置硬编码
2. 员工数据从 localStorage 读取
3. 审批操作后 UI 立即更新但 API 可能失败
4. 请假额度与 leaveQuotaService 不同步
5. 加班计算使用默认工资 6000
6. 加班类型选项硬编码

### 生产计划模块 - 5个
1. 每日/月度规划直接读取 localStorage
2. 后端 API 已实现但未被使用
3. 字段映射不一致
4. 作物阶段任务配置硬编码 (只支持3种作物)
5. 成本计算硬编码

### 农事任务模块 - 6个
1. 任务派发不调用后端 API
2. updateSeedling 缺少 await
3. API 数据合并可能丢失本地数据
4. useFarmHub 与 useTasks 数据竞争
5. recentRecords 数据源混乱
6. 操作记录与任务记录不同步

---

## 🟡 MEDIUM 问题清单（共28个）

### 通用问题 - 8个
1. grayScaleConfig 缺少模块默认配置处理
2. 多处使用 localStorage.getItem 未做空值处理
3. 缺少统一请求/响应拦截器
4. 缺少 API 错误统一处理机制
5. 多处 console.log 调试代码未清理
6. 缺少 API 请求超时处理
7. 缺少请求重试机制
8. 某些组件缺少 React.memo 优化

### 种植模块 - 3个
1. DetailModal 来源类型显示不完整
2. 采收接口参数传递不完整
3. API 服务 loading 状态缺失

### 采收模块 - 4个
1. 品质等级硬编码
2. BatchEditModal 类型不匹配
3. generateHarvestCode 重复定义
4. 列表查询 loading/error 状态不完善

### 育苗模块 - 3个
1. EditModal 缺失多个字段编辑
2. 生产计划关联代码问题
3. handleEnd 使用 window.location.reload()

### 订单模块 - 4个
1. 类型导入路径不规范
2. 后端 stats 路由前端无感知
3. localStorage 并发问题
4. 未使用的导入

### 仓储库存模块 - 3个
1. 物料新增功能未实现
2. 库存预警数据是 mock
3. 库存统计数据是 mock

### 人力资源模块 - 3个
1. 加班工资计算逻辑简化
2. 请假申请表单验证不完整
3. 审批流程 UI 状态同步问题

---

## 🟢 LOW 问题清单（共19个）

1. 删除操作没有等待完成 - SeedlingPage.tsx
2. useEffect 缺少依赖 - OrderPage.tsx
3. 筛选逻辑使用 includes 可能误匹配 - 多处
4. 类型断言过于宽松 - 多处
5. 导出功能未调用 API - HarvestPage.tsx
6. 库存服务导出但未使用 - inventoryService.ts
7. OvertimePage 默认工资硬编码 - 6000
8. 批次数据无后端 API - cropBatchService.ts
9. API 缺少请求超时配置
10. 缺少统一错误提示组件
11. 某些 modal 关闭后状态未清理
12. 表格排序使用本地状态而非 URL 参数
13. 缺少请求取消机制 (AbortController)
14. 日期选择器格式不统一
15. 缺少空状态组件
16. 加载状态 UX 不友好 (无骨架屏)
17. 移动端适配不完整
18. 缺少键盘快捷键支持
19. 缺少数据导出进度提示

---

## 📋 数据流混乱分布图

```
模块                    localStorage    后端API     问题数     状态
────────────────────────────────────────────────────────────────────
库存(Warehouse)         ⚠️ Shadow     ❌ 未调用   6 CRITICAL 🔴 危险
薪资(Salary)            ✅ 100%       ❌ 无表     2 CRITICAL 🔴 危险
加班(Overtime)         ✅ 100%       ❌ 无表     3 CRITICAL 🔴 危险
请假(Leave)             ✅ 100%       ⚠️ 部分     3 CRITICAL 🔴 危险
批次(Batch)            ⚠️ 回退       ❌ 无API    4 CRITICAL 🔴 危险
物料(Material)         ⚠️ 全部      ❌ 未调用   6 CRITICAL 🔴 危险
育苗(Seedling)         ⚠️ 回退       ⚠️ 部分     6 CRITICAL 🔴 危险
种植(Planting)         ⚠️ 回退       ⚠️ 部分     6 CRITICAL 🔴 危险
采收(Harvest)         ⚠️ 回退       ⚠️ 部分     5 CRITICAL 🔴 危险
订单(Order)            ⚠️ 回退       ⚠️ 部分     4 CRITICAL 🔴 危险
农事任务(Task)         ✅ 100%       ❌ 未调用   4 CRITICAL 🔴 危险
部门(Department)       ✅ Shadow     ⚠️ 部分     -         🟡 混乱
仓库(Warehouse)        ✅ Shadow     ⚠️ 部分     -         🟡 混乱
温室(Greenhouse)       ✅ Shadow     ⚠️ 部分     -         🟡 混乱
权限(Authority)        ✅ Shadow     ⚠️ 部分     -         🟡 混乱
────────────────────────────────────────────────────────────────────
总计                   6个模块       7个模块     34 CRITICAL
                        100%依赖LS    API未调用
```

---

## 📊 统计汇总

| 严重程度 | 数量 |
|---------|------|
| CRITICAL | 34 |
| HIGH | 42 |
| MEDIUM | 28 |
| LOW | 19 |
| **总计** | **123** |

---

## 🔧 修复优先级建议

### 阶段一：止血（1-2天）P0

| 优先级 | 模块 | 任务 | 涉及文件 |
|--------|------|------|---------|
| P0 | 种植 | 修复 EditModal.handleSubmit | EditModal.tsx |
| P0 | 种植 | 实现后端采收路由 | planting.ts |
| P0 | 采收 | 修复 harvestService 调用 | HarvestPage.tsx:550 |
| P0 | 采收 | 实现批量编辑/删除 API | harvest.ts |
| P0 | 育苗 | 修复 SeedlingPage 筛选 bug | SeedlingPage.tsx:180 |
| P0 | 育苗 | 实现每日/定植/打印 API | seedling.ts |
| P0 | 库存 | 实现入库 API 调用 | WarehouseMaterialsPage.tsx |
| P0 | 人力 | 实现加班记录持久化 | OvertimePage.tsx |
| P0 | 人力 | 修复所有 await 缺失 | LeavePage.tsx, OvertimePage.tsx |
| P0 | 生产 | 实现生产计划 API 调用 | ProductionPage.tsx |

### 阶段二：数据迁移（3-5天）P1

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P1 | 创建缺失的后端表 | daily_records, print_records, transplant_records |
| P1 | 补充后端业务 API | seedling (20+), planting (5), harvest (3) |
| P1 | 统一数据源 | 移除 USE_API 开关，强制使用后端 API |
| P1 | 创建种子数据脚本 | 为所有表填充初始数据 |
| P1 | 迁移 shadow 模式模块 | department, warehouse, greenhouse |

### 阶段三：清理（1-2天）P2

| 优先级 | 任务 |
|--------|------|
| P2 | 移除硬编码 Mock 数据 |
| P2 | 完善错误处理和 loading 状态 |
| P2 | 清理废弃的 localStorage 服务 |
| P2 | 实现统一的数据获取 hook |
| P2 | 添加 API 请求拦截器和错误处理 |
| P2 | 拆分 monolithic 组件 |

---

## 🎯 核心结论

### 系统当前状态：无法用于生产

1. **数据持久化严重缺失**：大部分模块的操作只更新内存状态，不调用后端 API
2. **双数据源混乱**：localStorage 和后端 API 同时存在，但不同步
3. **后端 API 不完整**：已实现的 API 只有 30%，70% 的业务 API 缺失
4. **硬编码数据泛滥**：系统依赖大量 mock 数据和硬编码值

### 最高优先修复项

1. **修复 harvestService vs apiHarvestService 调用错误** (影响所有采收操作)
2. **修复 EditModal.handleSubmit** (影响种植编辑)
3. **实现后端缺失的 20+ API** (影响育苗核心功能)
4. **修复 OvertimePage 加班记录持久化** (影响薪资计算)
5. **修复 WarehouseMaterialsPage 入库 API** (影响库存管理)

---

**报告生成时间**: 2026-05-05
**审查执行**: opencode 8个专业代码审核代理并行深度审核
**审核文件数**: 60+ 个核心文件
**下次审查建议**: 修复 CRITICAL 问题后进行复查
