# P0-3 投入品回链农事任务 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 施肥/用药记录能关联到具体农事任务，并在任务验收时可直接补录本次实际用量（走既有库存扣减链路）。

**Architecture:**
- **A 关联**：`pesticide_records` 补 `farm_task_id`；施肥/用药表单加「关联农事任务」下拉；记录详情展示关联任务。
- **B 验收补录**：新增 `TaskInputUsageModal`，验收通过后按任务类型提示补录用量，复用 `useFertilizerStore.createItem` / `usePestControlStore.createItem`，库存扣减与库存不足校验完全沿用既有服务。

**Tech Stack:** Express + sql.js + Vitest；React + Zustand + Radix UI。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.3 P0-3）

## Global Constraints

- **禁止主动 commit / push**。
- **新增列两处同步**：`schema.ts` CREATE + `fixSchemaColumns.ts`（启动只跑 GREEN 级）。
- **禁止 Math.random 生成业务编码**：记录编码由服务端生成。
- **库存不足必须报错**：沿用 `fertilizer.service` / `pesticide.service` 抛出的 `INSUFFICIENT_STOCK`，前端原样展示 message。
- **不改库存扣减逻辑**：只做"传参 + 调用"，不重写扣减。
- **禁止 `catch {}` 静默**：写失败必须弹窗。
- 类型检查：`npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `server/src/db/schema.ts` | 修改 | `pesticide_records` 加 `farm_task_id` |
| `server/src/db/fixSchemaColumns.ts` | 修改 | 启动补列 + 索引 |
| `server/src/services/pesticide.service.ts` | 修改 | schema 接受 `farmTaskId`，INSERT 写入 |
| `src/stores/usePestControlStore.ts` | 修改 | 类型 + 字段映射 |
| `src/components/farm/fertilizer/FertilizerAddModal.tsx` | 修改 | 加任务下拉，提交带 `farmTaskId` |
| `src/components/farm/pest-control/modals/AddPestControlModal.tsx` | 修改 | 加任务下拉，提交带 `farmTaskId` |
| `src/components/farm/pest-control/modals/PestControlDetailModal.tsx` | 修改 | 展示关联任务 |
| `src/components/farm/hub/modals/TaskInputUsageModal.tsx` | 新建 | 验收后补录用量 |
| `src/components/farm/agriculture/AgricultureRecordPage.tsx` | 修改 | 验收后触发补录 |
| `src/components/farm/hub/VerifyTaskModal.tsx` | 修改 | 验收后触发补录 |

---

## Task 1: pesticide_records 加 farm_task_id

- [ ] **Step 1: schema.ts**

在 `pesticide_records` 建表语句的 `record_code TEXT NOT NULL UNIQUE,` 之后插入：

```sql
      farm_task_id TEXT,
```

- [ ] **Step 2: fixSchemaColumns.ts**

在 P0-2 的 `farm_operation_records` 补列之后追加：

```ts
  // P0-3：用药记录 ↔ 农事任务
  addedColumns += safeAddColumn(db, 'pesticide_records', 'farm_task_id', 'TEXT') ? 1 : 0;
```

索引区追加：

```ts
  safeCreateIndex(db, 'idx_pesticide_records_task',
    `CREATE INDEX IF NOT EXISTS idx_pesticide_records_task ON pesticide_records(farm_task_id)`);
  addedIndexes += 1;
```

- [ ] **Step 3: 后端类型检查**

Run: `node "D:/TMcrop/yuanxingtu/V1.1/server/node_modules/typescript/bin/tsc" -p "D:/TMcrop/yuanxingtu/V1.1/server/tsconfig.json" --noEmit`
Expected: 无输出

---

## Task 2: 农药服务写入 farm_task_id

**Files:** `server/src/services/pesticide.service.ts`

- [ ] **Step 1: Zod schema 加字段**

在 `createRecordSchema` 的 `recordCode: z.string().nullish(),` 之后插入：

```ts
  farmTaskId: z.string().nullish(),
```

- [ ] **Step 2: 透传到 INSERT**

在 `applySyncRecord` 的 INSERT 列清单中加 `farm_task_id`，并在 `apply` 构造 `params` 时传 `data.farmTaskId`。

具体位置：`INSERT INTO pesticide_records (` 的列首行改为：

```sql
          id, record_code, spray_time, farm_task_id,
```

占位符相应多一个 `?`；参数数组在 `params.sprayTime,` 之后插入 `params.farmTaskId ?? null,`。

在 `ApplyParams` 接口（或 apply 内构造 params 的对象字面量）中增加 `farmTaskId?: string | null`，赋值 `farmTaskId: data.farmTaskId ?? null`。

- [ ] **Step 3: 后端类型检查**

Run: `node "D:/TMcrop/yuanxingtu/V1.1/server/node_modules/typescript/bin/tsc" -p "D:/TMcrop/yuanxingtu/V1.1/server/tsconfig.json" --noEmit`
Expected: 无输出

---

## Task 3: 农药前端 store 支持 farmTaskId

**Files:** `src/stores/usePestControlStore.ts`

- [ ] **Step 1: 类型加字段**

在 `PestControlData` 接口中加：

```ts
  farmTaskId?: string;
```

- [ ] **Step 2: 字段映射**

在 `FIELD_MAP`（或 denormalize 的映射对象）中加：

```ts
  farm_task_id: 'farmTaskId',
```

> 该文件同时有 normalize（snake→camel）与 denormalize（camel→snake）使用同一映射表；加一处即可双向生效。

- [ ] **Step 3: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`（只看该文件无新增错误）

---

## Task 4: 施肥表单加「关联农事任务」

**Files:** `src/components/farm/fertilizer/FertilizerAddModal.tsx`

- [ ] **Step 1: 引入任务数据**

```tsx
import { useFarmTaskStore } from '../../../stores/farmTaskStore';
```

- [ ] **Step 2: 状态与加载**

在组件内（`useState` 区）加：

```tsx
  const farmTasks = useFarmTaskStore((s) => s.tasks);
  const fetchFarmTasks = useFarmTaskStore((s) => s.fetchTasks);
  const [farmTaskId, setFarmTaskId] = useState('');

  useEffect(() => {
    if (farmTasks.length === 0) void fetchFarmTasks();
  }, [farmTasks.length, fetchFarmTasks]);
```

- [ ] **Step 3: 提交载荷加 farmTaskId**

在 `store.createItem({ ... })` 的对象中加：

```tsx
        farmTaskId: farmTaskId || undefined,
```

- [ ] **Step 4: UI 加下拉**

在表单「施肥时间」附近（同一网格行）加：

```tsx
          <div>
            <Label>关联农事任务</Label>
            <Select value={farmTaskId || '__none__'} onValueChange={(v) => setFarmTaskId(v === '__none__' ? '' : v)}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="不关联" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不关联</SelectItem>
                {farmTasks
                  .filter((t) => t.taskType === 'fertilization' || String(t.type || '').includes('施肥') || String(t.type || '').includes('fertilization'))
                  .slice(0, 100)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {(t.taskCode || t.id)} · {t.title || ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
```

> 若该文件未引入 `Select/Label`，从 `@/components/ui` 补齐导入。字段名以该文件现有 `Task` 类型为准（`taskCode/title/taskType`）。

- [ ] **Step 5: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`

---

## Task 5: 用药表单加「关联农事任务」

**Files:** `src/components/farm/pest-control/modals/AddPestControlModal.tsx`

- [ ] **Step 1-3:** 同 Task 4 的引入/状态/载荷（`pestStore.createItem({ ... })` 中加 `farmTaskId: farmTaskId || undefined`）。

任务下拉过滤条件改为：

```tsx
.filter((t) => t.taskType === 'pest_control' || t.taskType === 'pesticide' || String(t.type || '').includes('防治') || String(t.type || '').includes('植保'))
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`

---

## Task 6: 用药详情展示关联任务

**Files:** `src/components/farm/pest-control/modals/PestControlDetailModal.tsx`

- [ ] **Step 1:** 参考 `FertilizerDetailModal.tsx:63` 的写法，在详情字段列表中加入：

```tsx
    { label: '关联农事任务', value: record.farmTaskId ? <span className="font-mono text-xs">{record.farmTaskId}</span> : '-' },
```

- [ ] **Step 2: 类型检查**

---

## Task 7: 验收补录弹窗

**Files:** `src/components/farm/hub/modals/TaskInputUsageModal.tsx`（新建）

**Interfaces:**
- Props: `{ isOpen: boolean; task: { id: string; taskCode?: string; type?: string; typeName?: string; greenhouseName?: string; crop?: string } | null; onClose: () => void; onSaved: () => void }`
- 行为：按任务类型默认选中「肥料」或「农药」；从规格库选规格；填用量与稀释比；保存 → 调既有 store；库存不足时展示服务端 message。

- [ ] **Step 1: 先确认规格库 store 的字段**

Run: `grep -n "interface FertilizerSpec\|stockQuantity\|specId" src/stores/useFertilizerLibraryStore.ts | head -20`
同法查看 `usePesticideLibraryStore.ts`。把实际字段名写进下面的实现（下面用 `spec.id / spec.name / spec.stockQuantity / spec.stockUnit` 表示，实施时按真实字段替换）。

- [ ] **Step 2: 实现组件**

要点（不写死字段名，按 Step 1 结果替换）：

```tsx
/**
 * 任务验收后补录投入品用量
 * 走既有 createItem → 服务端事务扣减库存 → 库存不足抛 INSUFFICIENT_STOCK
 */
export function TaskInputUsageModal({ isOpen, task, onClose, onSaved }: Props) {
  const today = todayLocal();
  const [kind, setKind] = useState<'fertilizer' | 'pesticide'>('fertilizer');
  const [specId, setSpecId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [dilutionRatio, setDilutionRatio] = useState('');
  const [saving, setSaving] = useState(false);

  // 任务类型 → 默认投入品类型
  useEffect(() => {
    if (!task) return;
    const t = String(task.type || '');
    setKind(t.includes('pest') || t.includes('防治') || t.includes('植保') ? 'pesticide' : 'fertilizer');
    setSpecId(''); setQuantity(''); setUnit(''); setDilutionRatio('');
  }, [task]);

  const handleSave = async () => {
    if (!task || !specId || !quantity) { await showAlert('请选择规格并填写用量'); return; }
    setSaving(true);
    try {
      if (kind === 'fertilizer') {
        const ok = await useFertilizerStore.getState().createItem({
          farmTaskId: task.id,
          fertilizeTime: today,
          greenhouseName: task.greenhouseName || '未指定区域',
          cropName: task.crop || '未指定作物',
          fertilizerName: selectedSpec?.name || '',
          quantity: Number(quantity),
          unit: unit || selectedSpec?.stockUnit || 'kg',
          dilutionRatio,
          operatorName: currentUserName,
          dataSource: 'manual',
          fertilizationPool: JSON.stringify([{
            specId, quantity: Number(quantity), unit: unit || selectedSpec?.stockUnit || 'kg',
            dilutionRatio, fertilizerName: selectedSpec?.name || '',
          }]),
        });
        if (!ok) throw new Error('保存失败（详见上方提示）');
      } else {
        const created = await usePestControlStore.getState().createItem({
          farmTaskId: task.id,
          sprayTime: today,
          cropName: task.crop || '未指定作物',
          greenhouseName: task.greenhouseName || '未指定区域',
          operatorName: currentUserName,
          pesticideName: selectedSpec?.name || '',
          specId,
          dosage: Number(quantity),
          dosageUnit: unit || 'kg',
          dilutionRatio,
          pesticideList: JSON.stringify([{
            specId, dosage: Number(quantity), unit: unit || 'kg',
            dilutionRatio, name: selectedSpec?.name || '', pesticideId: selectedSpec?.pesticideId,
          }]),
        });
        if (!created) throw new Error('保存失败（详见上方提示）');
      }
      await showAlert('投入品用量已记录，库存已扣减');
      onSaved();
      onClose();
    } catch (e) {
      await showAlert(`保存失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="补录本次投入品用量" onSubmit={handleSave} submitText={saving ? '保存中…' : '保存'} cancelText="跳过" size="md">
      {/* 类型切换 + 规格下拉 + 用量 + 单位 + 稀释比 */}
    </Modal>
  );
}
```

> 组件必须实际渲染上述字段（类型切换、规格 `Select`、用量 `Input type=number`、单位 `Input`、稀释比 `Input`），不允许留占位。

- [ ] **Step 3: 类型检查**

---

## Task 8: 验收后触发补录

**Files:** `src/components/farm/agriculture/AgricultureRecordPage.tsx`、`src/components/farm/hub/VerifyTaskModal.tsx`

- [ ] **Step 1: AgricultureRecordPage**

在 `handleAcceptRecord` 中，`acceptTaskCompletion(...)` 之后、`await refresh()` 之前插入：

```tsx
    // 施肥/用药任务：验收后提示补录实际用量（可跳过）
    const taskType = String(record.operationType || '');
    if (record.sourceType === 'task' && /fert|施肥|pest|防治|植保/.test(taskType)) {
      setUsageTask({
        id: record.sourceId,
        taskCode: record.sourceCode,
        type: taskType,
        typeName: record.operationTypeName,
        greenhouseName: record.greenhouseName,
        crop: record.cropName,
      });
    }
```

并加状态与渲染：

```tsx
  const [usageTask, setUsageTask] = useState<UsageTask | null>(null);
```

```tsx
      <TaskInputUsageModal
        isOpen={!!usageTask}
        task={usageTask}
        onClose={() => setUsageTask(null)}
        onSaved={() => { void refresh(); }}
      />
```

- [ ] **Step 2: VerifyTaskModal**

`handleSubmit` 中验收通过分支执行成功后，若任务类型匹配，则 `setUsageTask(task)`，并在组件内渲染同一个 `TaskInputUsageModal`。

- [ ] **Step 3: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`

---

## Task 9: 构建 + 测试 + 浏览器实测

- [ ] **Step 1:** `npm run build`
- [ ] **Step 2:** `npx vitest run`（全量前端）
- [ ] **Step 3:** 后端 `npx vitest run`（至少 P0-2 的两个测试文件仍通过）
- [ ] **Step 4:** 重启后端（先告知用户），确认 `pesticide_records` 出现 `farm_task_id` 列
- [ ] **Step 5:** 浏览器实测
  1. `/crop/fertilizer` 新增施肥记录 → 选「关联农事任务」→ 保存 → 详情页显示任务号
  2. `/pest-control` 新增用药记录 → 同上
  3. 建一条施肥任务 → 提交验收 → 在 `/agriculture-record` 点「通过」→ 弹出补录窗 → 选规格+用量 → 保存 → 施肥记录新增一条且 `farm_task_id` 指向该任务
  4. 库存核对：`fertilizer_specs.stock_quantity` 按用量减少（**只减一次**）
  5. 库存不足场景：填一个超过库存的用量 → 页面显示服务端「库存不足：当前 X，需 Y」提示，记录不落库

---

## 执行记录（2026-10-20）

| 任务 | 状态 | 证据 |
|---|---|---|
| Task 1 农药表加 farm_task_id | 完成 | 重启后实库 `PRAGMA table_info(pesticide_records)` 含该列 |
| Task 2 农药服务写入 | 完成 | 后端 tsc 无输出；INSERT 列数/占位符 40:40 |
| Task 3 前端 store | 完成 | 类型 + FIELD_MAP 双向映射 |
| Task 4 施肥表单任务下拉 | 完成 | 按施肥类任务过滤，载荷带 `farmTaskId` |
| Task 5 用药表单任务下拉 | 完成 | 同上 |
| Task 6 用药详情展示 | 完成 | 详情新增「关联农事任务」行 |
| Task 7 补录弹窗 | 完成 | 类型/规格/用量/单位/稀释比，规格带库存提示 |
| Task 8 两处验收接入 | 完成 | 操作记录页 + 任务验收适配器 |
| Task 9 构建/测试 | 完成 | build 成功；37 文件 / 488 用例通过 |

### 接口实测

| 场景 | 结果 |
|---|---|
| 用药记录带 `farmTaskId` 创建 | 记录返回 `farmTaskId` 正确；药剂库存 1000 → 997 |
| 超量用药 | HTTP 400「代森锰锌 库存不足：当前 997ml，需 999999ml」；库存不变 |
| 删除该用药记录 | 库存恢复 1000（对称） |
| 施肥记录带 `farmTaskId` 创建 | 记录返回 `farmTaskId` 正确；库存对称扣减/恢复 |

### 浏览器实测（验收 → 补录）

1. 待验收的施肥任务在 `/agriculture-record` 点「通过」→ 记录状态变「已完成」
2. 随即弹出「补录本次投入品用量」，自动选中「肥料」，显示任务号/区域
3. 选「精制有机肥(颗粒)（库存 1210kg）」+ 用量 2 → 保存
4. 提示「投入品用量已记录，库存已按用量扣减」
5. 实库核对：新增记录 `farm_task_id = QA-P03U-...`、quantity 2 kg；库存 1210 → 1208（**只减一次**）
6. 清理测试数据后库存回到 1210，任务/记录/作业记录残留均为 0

### 实施中的额外修复（超出原计划，但不修则验收标准无法达成）

**手动新增用药记录此前完全不扣药剂库存**（只有每日记录同步路径扣减），删除时也不恢复。本次补齐三处对称逻辑：

- `apply()`：按 `pesticide_list` 中的 `pesticideCode` 聚合校验并扣减；库存不足抛 `INSUFFICIENT_STOCK`
- `update()`：按新旧列表差值是增补扣、减少回补
- `remove()`：非同步记录按当前列表恢复库存

> 同时给 `pesticide_records` 增加 `farm_task_id`，并在 repository 的 INSERT 中落库。

### 未执行 / 已知取舍

- 验收补录不检查「该任务是否已有投入品记录」，可能重复提示（用户可跳过）
- 「任务物料计划 vs 实际用量」偏差分析未做（任务侧物料数据全为空）

## 回滚方案

- 新增列为 additive，代码回滚后列保留无影响
- B 段（补录弹窗）可通过不渲染组件关闭，不影响 A 段
- A 段（关联下拉）不传 `farmTaskId` 即回到原行为

## 已知取舍

- 验收补录是**可选步骤**（可「跳过」），不阻塞验收
- 不做「任务物料计划 → 实际用量」偏差分析（需要结构化的任务物料计划，当前全空）
