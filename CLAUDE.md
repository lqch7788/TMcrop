# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

### 前端 (Vite + React 18, 端口 5188)
```bash
npm run dev           # 启动开发服务器
npm run build         # 生产构建
npm run lint          # ESLint 检查
npm run test:run      # 单次运行 Vitest 测试
```

### 后端 (Express + SQLite, 端口 3001)
```bash
cd server
npm run dev           # 启动开发服务器 (tsx watch, 自动重启)
npm run build         # TypeScript 编译到 dist/
npm run seed          # 独立运行种子数据脚本
npm run test:run      # 单次运行 Vitest 测试
```

### Electron 桌面端
```bash
npm run electron          # 启动 Electron 开发模式
npm run electron:build    # 打包 Electron 安装包 (NSIS)
npm run electron:pack     # 打包为目录 (调试用)
```

### 关键配置
- 前端 `/api` 请求由 Vite 代理到 `http://localhost:3001`
- 数据库: `server/data/yuanxingtu.db` (SQLite via sql.js)，**必须提交到 Git**
- 路径别名: `@/` → `src/`
- Electron 入口: `electron/main.cjs`，构建产物输出到 `D:/electron/`

## 项目架构

### 数据流 (V2.1 架构铁律)

```
组件 → Zustand Store → apiBasicDataService / enhancedApiClient → Backend API
                                                                    ↓
                                                               SQLite DB
```

**铁律**: 组件**绝不**直接读写 localStorage、直接调用 fetch/axios、或直接 import apiService。所有数据操作必须走 Zustand Store。

**三级降级策略**: API → IndexedDB (enhancedApiClient 缓存) → localStorage (persist 兜底)

### 目录结构

```
V1.1/
├── src/                         # React 前端
│   ├── pages/                   # 页面组件 (按模块分目录)
│   ├── components/
│   │   ├── ui/                  # 统一 UI 组件库 (Radix UI + Tailwind，63+组件)
│   │   ├── layout/              # 布局组件 (MainLayout, SimpleLayout)
│   │   ├── farm/ labor/ material/ summary/ ...  # 业务模块组件
│   ├── stores/                  # Zustand 状态管理 (80+ Store)
│   ├── services/                # API 服务层 (apiXxxService.ts)
│   ├── hooks/                   # React Hooks
│   ├── lib/                     # 工具库 (apiClient, queryClient, utils, validators)
│   ├── contexts/                # React Context (少量遗留)
│   └── types/                   # 共享类型定义
├── server/                      # Express 后端
│   └── src/
│       ├── routes/              # API 路由 (67个文件)
│       ├── middleware/           # 中间件 (auth, cors, logger, errorHandler)
│       ├── db/                  # 数据库层 (schema, seedData, seedBasicData, fixMissingSchema)
│       └── services/            # 后端业务服务
├── electron/                    # Electron 桌面端 (main.cjs)
└── public/                      # 静态资源 (禁止提交到 Git)
```

### 路由布局类型
- **MainLayout**: 带 Sidebar + Header (绝大部分页面)
- **SimpleLayout**: 仅 Header (Profile, Settings 等)
- **独立页面**: HomePage, Login

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript 5.6 + Vite 6 |
| UI 组件 | Radix UI + Tailwind CSS 3.4 + shadcn/ui 风格 |
| 图表 | Recharts |
| 文档处理 | xlsx, file-saver, docx, jspdf, pptxgenjs |
| 状态管理 | Zustand 5 (主) + TanStack Query (辅) + IndexedDB (Dexie) |
| 路由 | React Router v6 |
| 后端 | Express 4 + TypeScript 5.3 |
| 数据库 | SQLite (sql.js + better-sqlite3) |
| 认证 | JWT (演示模式默认密钥, 生产模式 env) |
| 验证 | Zod 3 (前端) + Zod 4 (后端) |
| 桌面端 | Electron 42 + electron-builder (NSIS 安装包) |

## V2.1 Store 标准模板

所有新 Store 必须遵循此模式。参考 `useSystemConfigStore.ts` 作为典范实现。

```typescript
// 1. 自包含类型定义 (不依赖 apiXxxService 的类型)
interface MyData {
  id: string;
  itemName: string;        // camelCase 前端字段
  itemCode: string;
  createdAt: string;
}

// 2. 字段映射表 (后端 snake_case → 前端 camelCase)
const FIELD_MAP: Record<string, string> = {
  item_name: 'itemName',
  item_code: 'itemCode',
  created_at: 'createdAt',
};

// 3. 规范化/反规范化
function normalize(row: Record<string, any>): MyData {
  const result: Record<string, any> = {};
  for (const [dbKey, jsKey] of Object.entries(FIELD_MAP)) {
    result[jsKey] = row[dbKey] ?? null;
  }
  return result as MyData;
}

function denormalize(data: Partial<MyData>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [dbKey, jsKey] of Object.entries(FIELD_MAP)) {
    if (data[jsKey as keyof MyData] !== undefined) {
      result[dbKey] = data[jsKey as keyof MyData];
    }
  }
  return result;
}

// 4. Store 配置
// - 使用 enhancedApiClient 调 API (非直接 fetch)
// - 乐观更新模式：先改本地，再调 API
// - persist + partialize 仅持久化数据数组
// - API 响应格式容错 (嵌套 {success, data} + 扁平数组)
// - 零 any 类型
```



## 数据库迁移模式

`server/src/db/fixMissingSchema.ts` 导出 `fixMissingSchema()`:

- 每次服务器启动时自动执行（在种子数据加载前）
- 使用 `ALTER TABLE ADD COLUMN` 添加缺失列
- 使用 `CREATE TABLE IF NOT EXISTS` 创建新表
- 异常被捕获（`duplicate column` 等跳过）
- 也包含数据修复逻辑（如 `deduplicateDictionaries()`）

**服务器启动顺序**: initDatabase() → initializeDatabase() → fixMissingSchema() → deduplicateDictionaries() → seedBasicData → seedData → saveDatabase()

## UI 组件规范

### 导入方式
```tsx
// 从统一 UI 库导入
import { Button, Card, DatePicker, Modal, FormField } from '@/components/ui'

// 图标
import { Plus, Edit, Trash2 } from 'lucide-react'
```

### 核心 UI 组件速查
- **基础**: Button, Card, Badge, Table, Dialog, Input, Select, Checkbox, Label, TextArea, NumberInput
- **布局**: Popover, DropdownMenu, Tabs, Drawer, Sheet, Breadcrumb, Steps, Divider, Space
- **表单**: DatePicker, DateRangePicker, TimePicker, TreeSelect, Cascader, ImageUploader, FilterBar
- **展示**: Calendar, Tree, KanbanBoard, GanttChart, Statistic, Progress, Skeleton, EmptyState, Avatar, QRCode
- **反馈**: Alert, Toast/ToastContainer, NotificationProvider, Modal (支持拖动+8向缩放), UnifiedModal
- **性能**: VirtualTable (虚拟滚动)

## 关键约定

### 必须遵守
- **架构铁律**: 组件 → Store → enhancedApiClient → API (不绕过 Store)
- **组件模式**: 所有数据、配置、枚举值从 types/mockData/Store 导入，禁止组件内硬编码
- **中文注释**: 所有代码添加中文注释说明业务逻辑
- **禁止删除文件**: 删除任何文件前必须获得用户明确授权
- **UI 库优先**: 所有页面 UI 元素（按钮、输入框、弹窗等）必须使用 `src/components/ui/` 下的组件，禁止使用原生 HTML 元素手写样式。Button 尺寸统一用 `size="sm"`（`h-8`）/ `size="default"`（`h-10`）/ `size="lg"`（`h-12`），不允许自定义 `h-9` 等非标准高度
- **验证测试**: 修复/新增功能后必须实际运行页面验证，不能只依赖构建通过

### 自我审核规则（必须执行）

**每次完成任务后，必须进行实例测试验证**：

1. **测试流程**: 从前端用户操作角度完整走一遍业务流程
   - 打开浏览器进入对应页面
   - 执行用户实际操作（点击、输入、提交等）
   - 验证数据是否正确保存到数据库
   - 验证数据显示是否正确
   - 验证关联操作（如详情弹窗、编辑弹窗）数据同步

2. **验证标准**:
   - 新建数据能正确保存并显示
   - 编辑数据能正确更新
   - 删除数据能正确移除
   - 详情/弹窗显示的数据与表格一致

3. **禁止仅依赖构建通过**: `npm run build` 只能证明语法正确，不能证明功能正确

4. **测试优先级**: 涉及数据 CRUD 的功能必须测试，UI 样式调整可简化测试

### Git 规则
- **绝对禁止**: `git reset`(任何形式)、`git revert`、`git reflog`、`git rebase`、`git clean -f`
- **禁止主动通过 Git 历史恢复代码** — 修复问题直接修改代码
- **禁止提交 public/ 目录**
- **允许**: status, diff, log, add, commit, push, pull
- 提交前需用户确认

### 数据库
- `server/data/yuanxingtu.db` 必须提交到 Git
- 不要直接手动修改 .db 文件，通过 API 或种子脚本操作

## 会话历史参考

最近关键模式/教训（详细历史在 Memory 系统中）:

- **Store 创建后必须导出**: 在 `src/stores/index.ts` 添加导出
- **后端 POST/PUT 必须返回完整记录**: 不能只返回 `{id}`，需 `SELECT *` 后返回
- **乐观更新用 merge 不用 replace**: `{ ...localData, ...apiResult }`
- **字典数据引用用 (category_code, dict_code) 组合**: 不依赖 id
- **修复模块数据流**: 先改 Store → 再改 Hook → 最后改组件

# Claude Code 配置：superpowers + gstack

主干由两个插件组成：
- superpowers —— 思考与流程层（plan/brainstorm/debug/TDD/review/verify）
- gstack —— 执行与外部世界层（browser/QA/ship/deploy/canary/护栏）

类比：superpowers 是大脑，gstack 是手脚。

## 核心原则

1. 流程归 superpowers：所有 plan、brainstorm、debug、TDD、verify、
   code review 默认走 superpowers。
2. 执行归 gstack：所有浏览器操作、QA 测试、ship、deploy、canary、
   retro 走 gstack。
3. 独立 reviewer 通道：作者和审查者绝不在同一上下文里互评。
4. 证据优先：声明完成前必须收集可验证的证据。
5. 遇到歧义先 brainstorm。

## 浏览器规则

/browse 是唯一的浏览器入口。禁止使用 mcp__claude-in-chrome__*
和 mcp__computer-use__* 来操作浏览器。

## 不要重复造轮子

下列能力只走 superpowers：
- plan / brainstorm / writing-plans / executing-plans
- TDD / debugging / verification
- code review（请求和接收）
- subagent / parallel dispatch
- worktrees

下列能力只走 gstack：
- 浏览器、QA、ship、deploy、canary、retro、护栏


ule 1: Think Before Coding
State your assumptions explicitly; ask questions instead of guessing when uncertain; surface tradeoffs by listing pros and cons of multiple approaches; push back if a simpler method exists.

Rule 2: Simplicity First
Write only the minimum code needed to solve the problem; no speculative features; no abstractions for single-use logic; if a senior engineer would call it over-engineered—simplify it.

Rule 3: Surgical Changes
Only touch what must be changed; don't "improve" unrelated code, comments, or formatting on the side; don't refactor what isn't broken; match the existing style.

Rule 4: Goal-Driven Execution
Define success criteria and loop until they are verified; don't tell Claude what steps to take—define what success looks like and let it iterate; if the goal can be reached in fewer steps, use fewer steps.

II. 8 Advanced Rules (for AI Agent Collaboration)
Rule 5: No Non-Language Work for the Model
Deterministic decisions—retry policies, routing logic, threshold checks, escalation rules—must be explicit code (conditionals, config values, lookup tables); if the answer is the same every time, it's not a language task; the model handles only classification, summarization, drafting, and ambiguity resolution.

Rule 6: Hard Token Budgets, No Exceptions
Every iteration loop (debugging, refactoring, generation) must have a defined budget (max iterations, max tokens, or max time), with specific values set per project. Stop immediately and present current results when the budget is exhausted; do not re-suggest a fix that has already been rejected.

Rule 7: Surface Conflicts, Don't Blend
When the codebase has two contradictory patterns, call out the conflict explicitly ("Module A uses pattern X, Module B uses pattern Y. Which should the new code follow?") and wait for a human decision; never blend the two patterns, and never choose on your own.

Rule 8: Read Before You Write
Before adding code, read the current file and its import graph; check whether an identical function, utility, or constant already exists; if a duplicate implementation exists, use it—don't create a second version.

Rule 9: Tests Are Required, but Not the Goal
Tests must verify meaningful properties of correct behavior (values, structure, side effects, error types), not merely that "the function returns something" or "doesn't throw"; "all tests pass" is necessary but not sufficient; flag it explicitly when tests are too weak.

Rule 10: Checkpoints for Long Tasks
Any task spanning more than 3 steps or touching more than 3 files requires a checkpoint after each step (what was done + what changed + current state); roll back to the last checkpoint if a step fails—don't build on a broken state; if you lose track of the overall logic, stop immediately and restate.

Rule 11: Convention Beats Novelty
Even if you think your approach is better, follow the codebase's existing naming and architectural conventions (e.g., snake_case vs camelCase); introducing a second pattern is worse than either pattern alone; if you believe a convention should change, propose it explicitly and wait for approval before acting.

Rule 12: Fail Loud
Errors must be thrown, returned, or reported—never swallowed or hidden behind default values; when migrations, batch jobs, or loops skip records, the skip count and reasons must appear in the output, not buried in logs; if you cannot confirm 100% success, say so explicitly—silent "default success" is forbidden.




<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
