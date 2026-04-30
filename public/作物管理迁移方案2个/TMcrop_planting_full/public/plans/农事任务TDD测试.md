# 农事任务流程 TDD 测试验证方案

## 一、项目背景

种植管理系统 `D:\TMcrop\yuanxingtu\V1.1` 中的农事任务模块需要验证一个完整的任务安排-接受-提交-审核流程。该系统使用 React + TypeScript + localStorage 构建原型，数据存储在本地。

## 二、现有代码结构

### 2.1 核心文件清单

| 文件路径 | 说明 |
|---------|------|
| `src/hooks/useTasks.ts` | 任务状态管理 Hook（1118行） |
| `src/config/taskConfig.ts` | 状态转换规则、权限矩阵、超时配置 |
| `src/types/task.ts` | Task、TaskStatus、TaskRecord 类型定义 |
| `src/components/farm/taskDispatch/TaskDispatchPage.tsx` | 任务派发页面 |
| `src/components/dispatch/components/dispatch/FarmTaskTable.tsx` | 任务表格组件 |
| `src/components/farm/taskDispatch/modals/VerifyTaskModal.tsx` | 验收弹窗 |

### 2.2 任务状态定义（10种）

```
draft           // 草稿
pending         // 已发布（待接受）
accepted        // 已接受
in_progress     // 处理中
waiting_acceptance  // 待验收
completed       // 已完成
rejected        // 返工中（验收驳回）
failed          // 任务失败（超过2次返工）
cancelled       // 已取消
abandoned       // 已放弃
```

### 2.3 状态流转图

```
draft ──────────────────┬─────────────────► pending
  │ (创建草稿)           │ (发布)              │
  │                     ▼                     │
  │              ┌──────────────┐              │
  │              │   accepted   │              │
  │              │   (已接受)   │              │
  │              └──────┬───────┘              │
  │                     │                     │
  │                     ▼                     │
  │              ┌──────────────┐              │
  │              │ in_progress  │              │
  │              │   (处理中)   │              │
  │              └──────┬───────┘              │
  │                     │                     │
  │         ┌───────────┴───────────┐         │
  │         ▼                       ▼         │
  │  ┌─────────────┐        ┌─────────────┐  │
  │  │waiting_acc-  │        │  abandoned  │  │
  │  │  eptance    │        │   (已放弃)  │  │
  │  │  (待验收)   │        └─────────────┘  │
  │  └──────┬──────┘                         │
  │         │                                │
  │    ┌────┴────┐                           │
  │    ▼         ▼                           │
  │ ┌──────┐  ┌──────┐                      │
  │ │  com │  │rejec │                      │
  │ │ -plet│  │ ted  │                      │
  │ │ ed   │  │(返工中)                      │
  │ └──┬───┘  └──┬───┘                      │
  │    │         │                          │
  │    │         └──────► ┌─────────────┐    │
  │    │                  │   failed    │    │
  │    │                  │ (任务失败)  │    │
  │    │                  └──────┬─────┘    │
  │    │                         │          │
  │    │                         ▼          │
  │    └──────────────────► pending         │
  │                             (重新派发)   │
  │                                            │
  └──────────────────────────────────────────► cancelled
```

### 2.4 核心操作函数

| 函数名 | 状态变化 | 调用场景 |
|--------|----------|----------|
| `createTask()` | → draft | 创建草稿任务 |
| `publishTask()` | draft → pending | 发布任务 |
| `withdrawTask()` | pending → cancelled | 撤回任务（仅管理员） |
| `cancelTask()` | accepted/in_progress → cancelled | 取消任务（仅管理员） |
| `acceptTask()` | pending → accepted | 执行人接受任务 |
| `submitProgress()` | accepted/in_progress → in_progress/waiting_acceptance | 提交进度/申请验收 |
| `handleOvertime()` | in_progress → in_progress/abandoned | 超时处理 |
| `acceptCompletion()` | waiting_acceptance → completed | 验收通过 |
| `rejectForRework()` | waiting_acceptance → rejected (max 2次后→failed) | 验收驳回 |
| `continueExecution()` | rejected → in_progress | 继续执行（返工后） |
| `reassignTask()` | failed/abandoned → pending | 重新派发 |

### 2.5 状态转换规则（来源 taskConfig.ts）

```typescript
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['waiting_acceptance', 'cancelled', 'abandoned'],
  waiting_acceptance: ['completed', 'rejected'],
  rejected: ['in_progress', 'failed'],
  failed: ['pending'],
  abandoned: ['pending'],
  cancelled: [],
  completed: [],
};
```

### 2.6 操作权限矩阵

```typescript
export const TASK_PERMISSIONS = {
  withdraw: { roles: ['admin'], statuses: ['pending'] },
  cancel: { roles: ['admin'], statuses: ['accepted', 'in_progress'] },
  reassign: { roles: ['admin'], statuses: ['failed', 'abandoned'] },
  accept: { roles: ['assignee'], statuses: ['pending'] },
  verify: { roles: ['assigner', 'admin'], statuses: ['waiting_acceptance'] },
  continue: { roles: ['assignee'], statuses: ['rejected'] },
  submitProgress: { roles: ['assignee'], statuses: ['accepted', 'in_progress'] },
  remind: { roles: ['admin'], statuses: ['*'] },
};
```

### 2.7 返工规则

```typescript
export const REWORK_CONFIG = {
  maxReworkCount: 2,  // 最多驳回2次，第2次驳回后变为 failed
};
```

### 2.8 超时配置

```typescript
export const OVERTIME_CONFIG = {
  acceptWarningHours: 12,      // 接受超时预警
  acceptCriticalHours: 24,     // 接受超时危急
  executionWarningHours: 24,   // 执行超时预警
  executionCriticalHours: 48,  // 执行超时危急
  acceptanceWarningHours: 24,   // 验收超时预警
  acceptanceCriticalHours: 48,  // 验收超时危急
};
```

## 三、测试方案设计

### 3.1 测试策略

**推荐方案：Playwright E2E 测试 + Jest 单元测试**

原因：
1. 系统无真实后端，所有数据存 localStorage
2. 需要验证完整用户流程（UI 操作）
3. 状态流转逻辑需要单元测试覆盖

### 3.2 测试类型与覆盖率目标

| 测试类型 | 覆盖率目标 | 文件位置 |
|----------|-----------|----------|
| 单元测试 | 状态流转函数 100% | `src/hooks/useTasks.test.ts` |
| 组件测试 | TaskDispatchPage | `src/components/__tests__/` |
| E2E 测试 | 关键用户流程 | `e2e/farm-task.spec.ts` |

## 四、单元测试用例

### 4.1 文件位置
`src/hooks/useTasks.test.ts`

### 4.2 测试用例设计

#### 用例1：正常完成流程

```typescript
describe('农事任务状态流转 - 正常完成流程', () => {
  it('完整流程: 创建→发布→接受→执行→申请验收→验收通过', () => {
    // 1. createTask → draft
    const task = createTask({ title: '测试施肥任务', assigneeId: 'W001', assigneeName: '张三' });
    expect(task.status).toBe('draft');

    // 2. publishTask → pending
    publishTask(task.id);
    expect(getTask(task.id).status).toBe('pending');

    // 3. acceptTask → accepted
    acceptTask(task.id);
    expect(getTask(task.id).status).toBe('accepted');

    // 4. submitProgress(50%) → in_progress
    submitProgress(task.id, 50);
    expect(getTask(task.id).status).toBe('in_progress');
    expect(getTask(task.id).progress).toBe(50);

    // 5. submitProgress(100%, isFinal=true) → waiting_acceptance
    submitProgress(task.id, 100, { isFinal: true });
    expect(getTask(task.id).status).toBe('waiting_acceptance');

    // 6. acceptCompletion → completed
    acceptCompletion(task.id);
    expect(getTask(task.id).status).toBe('completed');
    expect(getTask(task.id).progress).toBe(100);
  });
});
```

#### 用例2：驳回重做流程

```typescript
describe('农事任务状态流转 - 驳回重做流程', () => {
  it('驳回流程: 申请验收→驳回→继续执行→再次验收→通过', () => {
    // 前置：创建→发布→接受→执行→申请验收 → waiting_acceptance
    const task = createAndAdvanceToWaitingAcceptance();

    // 6. rejectForRework → rejected
    rejectForRework(task.id, '作业质量不达标');
    expect(getTask(task.id).status).toBe('rejected');
    expect(getTask(task.id).reworkCount).toBe(1);

    // 7. continueExecution → in_progress
    continueExecution(task.id);
    expect(getTask(task.id).status).toBe('in_progress');

    // 8. submitProgress(100%, isFinal=true) → waiting_acceptance
    submitProgress(task.id, 100, { isFinal: true });
    expect(getTask(task.id).status).toBe('waiting_acceptance');

    // 9. acceptCompletion → completed
    acceptCompletion(task.id);
    expect(getTask(task.id).status).toBe('completed');
  });
});
```

#### 用例3：两次驳回后任务失败

```typescript
describe('农事任务状态流转 - 失败与重新派发', () => {
  it('两次驳回后任务失败，需重新派发', () => {
    const task = createAndAdvanceToWaitingAcceptance();

    // 第一次驳回 → rejected
    rejectForRework(task.id, '第一次不合格');
    expect(getTask(task.id).status).toBe('rejected');

    // 继续执行
    continueExecution(task.id);
    submitProgress(task.id, 100, { isFinal: true });

    // 第二次驳回 → failed
    rejectForRework(task.id, '第二次仍不合格');
    expect(getTask(task.id).status).toBe('failed');
    expect(getTask(task.id).reworkCount).toBe(2);

    // 重新派发 → pending
    reassignTask(task.id, 'W002', '李四');
    expect(getTask(task.id).status).toBe('pending');
    expect(getTask(task.id).assigneeName).toBe('李四');
    expect(getTask(task.id).reworkCount).toBe(0); // 重置驳回计数
  });
});
```

#### 用例4：取消流程

```typescript
describe('农事任务状态流转 - 取消流程', () => {
  it('待接受状态下可取消任务', () => {
    const task = createTask({ title: '待取消任务' });
    publishTask(task.id);
    expect(getTask(task.id).status).toBe('pending');

    // cancelTask → cancelled
    cancelTask(task.id, '任务取消原因');
    expect(getTask(task.id).status).toBe('cancelled');
    expect(getTask(task.id).cancelledReason).toBe('任务取消原因');
  });

  it('执行中状态也可取消任务', () => {
    const task = createAndAdvanceToInProgress();

    cancelTask(task.id, '紧急取消');
    expect(getTask(task.id).status).toBe('cancelled');
  });
});
```

#### 用例5：超时放弃与重新派发

```typescript
describe('农事任务状态流转 - 超时处理', () => {
  it('执行中超时放弃后可重新派发', () => {
    const task = createAndAdvanceToInProgress();

    // handleOvertime('abandon') → abandoned
    handleOvertime(task.id, 'abandon', { reason: '超时无法完成' });
    expect(getTask(task.id).status).toBe('abandoned');

    // reassignTask → pending
    reassignTask(task.id, 'W003', '王五');
    expect(getTask(task.id).status).toBe('pending');
  });

  it('执行中超时可选择继续执行', () => {
    const task = createAndAdvanceToInProgress();

    handleOvertime(task.id, 'continue', {
      reason: '申请延期',
      newDeadline: '2026-04-25'
    });
    expect(getTask(task.id).status).toBe('in_progress');
    expect(getTask(task.id).dueDate).toBe('2026-04-25');
  });
});
```

#### 用例6：边界条件测试

```typescript
describe('边界条件测试', () => {
  it('状态转换校验：pending状态不能直接进入completed', () => {
    const task = createTask();
    publishTask(task.id);
    // 尝试直接验收（应该无效）
    acceptCompletion(task.id);
    // 状态应该不变
    expect(getTask(task.id).status).toBe('pending');
  });

  it('驳回次数校验：超过2次驳回自动变为failed', () => {
    const task = createAndAdvanceToWaitingAcceptance();

    // 第一次驳回
    rejectForRework(task.id, '第1次');
    expect(getTask(task.id).status).toBe('rejected');

    // 继续执行
    continueExecution(task.id);
    submitProgress(task.id, 100, { isFinal: true });

    // 第二次驳回 → failed
    rejectForRework(task.id, '第2次');
    expect(getTask(task.id).status).toBe('failed');

    // 第三次驳回不应该发生（failed状态无法验收）
  });

  it('任务创建后自动生成任务编号', () => {
    const task = createTask({ title: '测试任务' });
    expect(task.taskCode).toMatch(/^NS\d{8}-\d{3}$/);
  });

  it('操作记录完整记录每次状态变更', () => {
    const task = createTask();
    publishTask(task.id);
    acceptTask(task.id);

    const records = getTaskRecordsByTaskId(task.id);
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(records[0].action).toBe('accept');
    expect(records[1].action).toBe('publish');
  });
});
```

## 五、E2E 测试用例

### 5.1 文件位置
`e2e/farm-task.spec.ts`

### 5.2 测试配置

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
});
```

### 5.3 测试用例设计

#### 用例1：农事任务完整生命周期

```typescript
test('农事任务完整生命周期 E2E', async ({ page }) => {
  // 1. 打开系统首页
  await page.goto('/');

  // 2. 进入 种植管理系统 → 农事管理 → 任务派发
  await page.click('text=种植管理系统');
  await page.click('text=农事管理');
  await page.click('text=任务派发');

  // 3. 验证页面加载农事任务表
  await expect(page.locator('h1:has-text("任务派发")')).toBeVisible();

  // 4. 点击"新建任务"按钮
  await page.click('button:has-text("新建任务")');

  // 5. 填写任务表单
  await page.fill('input[name="title"]', '番茄施肥任务 E2E 测试');
  await page.selectOption('select[name="type"]', 'fertilization');
  await page.fill('input[name="assignee"]', '张三');
  await page.fill('input[name="dueDate"]', '2026-04-25');

  // 6. 保存草稿
  await page.click('button:has-text("保存")');
  await expect(page.locator('text=任务创建成功')).toBeVisible();

  // 7. 在表格中找到新建的任务，点击"派发"
  const taskRow = page.locator('tr:has-text("番茄施肥任务 E2E 测试")');
  await taskRow.locator('button:has-text("派发")').click();

  // 8. 确认派发成功，状态变为"待接受"
  await expect(taskRow.locator('text=待接受')).toBeVisible();

  // 9. 模拟执行人登录（切换用户）
  await page.click('text=切换用户');
  await page.click('text=张三');

  // 10. 进入"我的任务"
  await page.click('text=我的任务');

  // 11. 找到任务，点击"接受"
  const myTaskRow = page.locator('tr:has-text("番茄施肥任务 E2E 测试")');
  await myTaskRow.locator('button:has-text("接受")').click();
  await expect(myTaskRow.locator('text=已接受')).toBeVisible();

  // 12. 点击"执行"，填写执行进度
  await myTaskRow.locator('button:has-text("执行")').click();
  await page.fill('input[name="progress"]', '100');
  await page.click('button:has-text("提交")');

  // 13. 点击"申请验收"
  await myTaskRow.locator('button:has-text("申请验收")').click();
  await expect(myTaskRow.locator('text=待验收')).toBeVisible();

  // 14. 切换回管理员
  await page.click('text=切换用户');
  await page.click('text=王主管');

  // 15. 进入验收页面
  await page.click('text=待验收任务');
  const verifyTaskRow = page.locator('tr:has-text("番茄施肥任务 E2E 测试")');

  // 16. 点击"验收通过"
  await verifyTaskRow.locator('button:has-text("验收通过")').click();
  await page.fill('textarea[name="comments"]', '验收合格');
  await page.click('button:has-text("确认")');

  // 17. 验证任务状态为"已完成"
  await expect(verifyTaskRow.locator('text=已完成')).toBeVisible();

  // 18. 点击任务查看操作记录
  await verifyTaskRow.locator('text=番茄施肥任务 E2E 测试').click();
  await expect(page.locator('text=创建任务')).toBeVisible();
  await expect(page.locator('text=派发任务')).toBeVisible();
  await expect(page.locator('text=接受任务')).toBeVisible();
  await expect(page.locator('text=验收通过')).toBeVisible();
});
```

#### 用例2：验收驳回 E2E

```typescript
test('验收驳回后执行人重新执行 E2E', async ({ page }) => {
  // 前置：创建并派发任务，执行人接受并申请验收
  await setupTaskAwaitingAcceptance(page);

  // 1. 管理员进入待验收列表
  await page.goto('/task-dispatch');
  await page.click('text=待验收');

  // 2. 找到任务，点击"验收驳回"
  const taskRow = page.locator('tr:has-text("测试任务")');
  await taskRow.locator('button:has-text("驳回")').click();

  // 3. 填写驳回原因
  await page.fill('textarea[name="rejectReason"]', '施肥量不足，请重新作业');
  await page.click('button:has-text("确认驳回")');

  // 4. 验证状态变为"返工中"
  await expect(taskRow.locator('text=返工中')).toBeVisible();

  // 5. 执行人登录，查看任务
  await switchUser(page, '张三');
  await page.goto('/task-center');

  // 6. 任务显示"返工中"，点击"继续执行"
  const reworkTask = page.locator('tr:has-text("测试任务")');
  await expect(reworkTask.locator('text=返工中')).toBeVisible();
  await reworkTask.locator('button:has-text("继续执行")').click();

  // 7. 执行完成，申请验收
  await reworkTask.locator('button:has-text("执行")').click();
  await page.fill('input[name="progress"]', '100');
  await page.click('button:has-text("提交")');
  await reworkTask.locator('button:has-text("申请验收")').click();

  // 8. 管理员验收通过
  await switchUser(page, '王主管');
  await page.goto('/task-dispatch');
  await page.click('text=待验收');

  const finalTaskRow = page.locator('tr:has-text("测试任务")');
  await finalTaskRow.locator('button:has-text("验收通过")').click();
  await page.click('button:has-text("确认")');

  // 9. 验证最终状态
  await expect(finalTaskRow.locator('text=已完成')).toBeVisible();
});
```

## 六、测试环境准备

### 6.1 依赖安装

```bash
# Jest 及相关依赖
npm install --save-dev jest @types/jest ts-jest jest-environment-jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Playwright
npm install --save-dev @playwright/test
npx playwright install chromium
```

### 6.2 Jest 配置

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/hooks/useTasks.ts',
    'src/config/taskConfig.ts',
    'src/types/task.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 6.3 测试脚本配置

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## 七、Mock localStorage 方案

### 7.1 jest.setup.ts

```typescript
// src/setupTests.ts
import 'jest-localstorage-mock';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock useLocalStorage hook
jest.mock('./hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn((key: string, initialValue: any) => {
    const [value, setValue] = React.useState(initialValue);
    return [value, setValue];
  }),
}));

// Mock STORAGE_KEYS
jest.mock('./hooks/useLocalStorage', () => ({
  STORAGE_KEYS: {
    TASKS: 'yuanxingtu_tasks',
    TASKS_RECORDS: 'yuanxingtu_tasks_records',
    TASKS_REMINDERS: 'yuanxingtu_tasks_reminders',
    WORK_LOGS: 'yuanxingtu_work_logs',
    ATTENDANCE: 'yuanxingtu_attendance',
  },
}));
```

## 八、执行测试

### 8.1 单元测试执行

```bash
# 运行所有单元测试
npm run test

# 运行单元测试并监听变化
npm run test:watch

# 运行单元测试并生成覆盖率报告
npm run test:coverage
```

### 8.2 E2E 测试执行

```bash
# 启动开发服务器
npm run dev

# 运行 E2E 测试
npm run test:e2e

# 使用 Playwright UI 运行
npm run test:e2e:ui
```

### 8.3 预期结果

```
✓ 正常完成流程测试通过
✓ 驳回重做流程测试通过
✓ 两次驳回后失败测试通过
✓ 取消流程测试通过
✓ 超时处理测试通过
✓ 边界条件测试通过

测试覆盖率: >= 80%
所有测试: PASS
```

## 九、验收标准

| 验收项 | 标准 |
|--------|------|
| 单元测试数量 | >= 15 个测试用例 |
| 测试覆盖率 | >= 80% |
| E2E 测试 | 覆盖核心用户流程 |
| 所有测试 | 必须通过 (PASS) |
| 无 skipped/disabled 测试 | 所有测试必须执行 |

## 十、注意事项

1. **localStorage Mock** - 项目使用 localStorage 存储，需在测试中正确 mock
2. **Hook 依赖** - `useTasks` 依赖多个其他 Hook，单元测试需完整 mock
3. **权限模拟** - 状态转换有权限控制，测试需模拟不同角色（admin/assignee）
4. **状态独立性** - 每个测试用例应独立运行，不依赖其他测试的数据
5. **超时设置** - E2E 测试设置 30 秒超时，考虑 CI 环境网络延迟

## 十一、附录

### 11.1 useTasks Hook 返回接口

```typescript
export interface UseTasksReturn {
  tasks: Task[];
  taskRecords: TaskRecord[];
  reminderRecords: ReminderRecord[];
  detectOvertime: (task: Task) => TaskTimeout | undefined;
  getTask: (id: string) => Task | undefined;
  getTasksByAssignee: (assigneeId: string) => Task[];
  getTaskRecordsByTaskId: (taskId: string) => TaskRecord[];
  createTask: (taskData: Partial<Task>) => Task;
  publishTask: (id: string) => void;
  withdrawTask: (id: string, reason: string) => void;
  cancelTask: (id: string, reason: string) => void;
  acceptTask: (id: string) => void;
  submitProgress: (id: string, progress: number, options?: {...}) => void;
  handleOvertime: (id: string, action: 'continue' | 'abandon') => void;
  acceptCompletion: (id: string, comments?: string) => void;
  rejectForRework: (id: string, reason: string) => void;
  continueExecution: (id: string) => void;
  reassignTask: (id: string, newAssigneeId: string, newAssigneeName: string) => void;
  sendReminder: (id: string, message?: string) => void;
  extendDeadline: (id: string, newDeadline: string, reason: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTaskProgress: (id: string, progress: number, options?: {...}) => void;
}
```

### 11.2 TaskRecord 操作记录结构

```typescript
export interface TaskRecord {
  id: string;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  operatorId: string;
  operatorName: string;
  action: TaskAction;
  actionName: string;
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;
  progress?: number;
  progressIncrement?: number;
  feedback?: {...};
  comment?: string;
  reason?: string;
  actionTime: string;
  createdAt: string;
}
```

---

**文档版本**: v1.0
**创建日期**: 2026-04-17
**适用系统**: 种植管理系统 V1.1
