# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

### 前端 (Vite + React)
```bash
npm run dev          # 启动开发服务器 (端口 5188)
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run test         # Vitest 测试
npm run test:run     # 单次运行测试
```

### 后端 (Express + SQLite)
```bash
cd server
npm run dev          # 启动开发服务器 (tsx watch)
npm run build        # TypeScript 编译
npm run seed        # 初始化种子数据
npm run test         # Vitest 测试
```

### 注意事项
- 前端 API 代理配置: Vite 将 `/api` 请求代理到 `http://localhost:3001`
- 数据库: SQLite (server/data/yuanxingtu.db)，**必须提交到 Git**

## 项目架构

### 整体结构
```
V1.1/
├── src/                    # React 前端
│   ├── pages/              # 页面组件 (按模块组织)
│   ├── components/         # React 组件
│   │   ├── ui/             # 统一 UI 组件库 (Radix UI + Tailwind)
│   │   ├── layout/         # 布局组件 (Sidebar, Header)
│   │   ├── farm/           # 农事管理模块
│   │   ├── labor/          # 人工管理模块
│   │   └── ...
│   ├── hooks/              # React Hooks
│   ├── lib/                # 工具库 (queryClient, utils)
│   ├── contexts/           # React Context providers
│   └── types/              # TypeScript 类型定义
├── server/                 # Express 后端
│   └── src/
│       ├── routes/         # API 路由
│       ├── middleware/     # Express 中间件
│       ├── db/             # 数据库操作
│       └── services/       # 业务服务
└── public/                 # 静态资源
```

### 路由结构
- `App.tsx` 是前端路由入口
- 布局类型:
  - **MainLayout**: 带侧边栏 + Header (大部分页面)
  - **SimpleLayout**: 仅 Header (Profile, Settings)
  - **独立页面**: HomePage, Login
- 懒加载页面: IoTMonitor, EnvControl, SmartDispatch, 作物管理页面等

### 技术栈
| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| UI 组件 | Radix UI (src/components/ui/) + Tailwind CSS |
| 状态/数据 | TanStack Query (React Query) |
| 后端 | Express + TypeScript |
| 数据库 | SQLite (sql.js) |
| 验证 | Zod |
| 路由 | React Router v6 |

## UI 组件规范

### 组件导入
```tsx
// ✅ 正确
import { Button, Card, DatePicker } from '@/components/ui'

// ❌ 禁止 - 项目已禁用 Ant Design
import { DatePicker, Table } from 'antd'
```

### 已有组件 (src/components/ui/index.ts)
- 基础: Button, Card, Badge, Table, Dialog, Input, Select, Checkbox, Label, Popover, DropdownMenu, NumberInput, Toast, Modal, Space
- 高级: DatePicker, DateRangePicker, Drawer, Sheet, Alert, Notification, Breadcrumb, Steps, Pagination, Skeleton, Progress, TextArea, Tabs, Calendar, Tree, TreeSelect, Cascader, TimePicker, Tooltip, Avatar, ImageUploader, Statistic, EmptyState, Divider, QRCode, FilterBar, KanbanBoard, GanttChart

## 安全规则 (Git 操作)

### 禁止命令
```
❌ git reset (任何形式)
❌ git revert
❌ git reflog
❌ git rebase
❌ git clean -f
```

### 允许的安全操作
```
✅ git status, git diff, git log --oneline
✅ git add, git commit, git push, git pull
```

**重要**: 修复问题的正确方式是直接修改代码，而非通过 Git 历史"回滚"。

## 数据库规范

SQLite 数据库文件 `server/data/yuanxingtu.db` **必须提交到 Git**。这是项目的一部分，包含完整业务数据。

## 文件删除规则

- **禁止删除本地项目文件**（如 node_modules、src/、server/ 等）
- **临时文件清理**：仅删除任务执行过程中创建的临时脚本/临时文件
- **删除前需征得用户同意**
- 删除后需确认是否需要恢复（如 node_modules 需重新安装）
