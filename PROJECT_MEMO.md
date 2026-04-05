# 项目记忆文档

## 项目基本信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 弘智耘 - 智慧农业管理系统 - 管理模块原型 |
| 版本 | V1.01 |
| 创建时间 | 2026-03-14 |
| 技术栈 | React 18 + Vite + TypeScript + Tailwind CSS + Radix UI |
| 端口 | 5188 |

## 项目结构

```
hongzhiyun/
├── src/
│   ├── components/
│   │   ├── layout/       # 布局组件（Sidebar, Header）
│   │   └── ui/           # UI组件库（button, dialog, input等）
│   ├── pages/            # 页面组件（50+个）
│   ├── data/             # Mock数据
│   ├── hooks/            # 自定义Hooks
│   ├── i18n/             # 国际化
│   ├── lib/              # 工具函数
│   ├── App.tsx           # 路由配置
│   └── main.tsx          # 入口文件
├── public/               # 静态资源
├── dist/                 # 构建输出
└── 启动服务.bat          # 启动脚本
```

## 核心功能模块

1. **首页/登录** - Login.tsx, HomePage.tsx
2. **基地总览** - Dashboard.tsx, Production.tsx
3. **园区导览** - ParkArchive.tsx
4. **农事管理** - Tasks.tsx, TaskDispatch.tsx, AgricultureRecord.tsx
5. **库存管理** - Materials.tsx, WarehouseMaterials.tsx, MaterialReceiving.tsx
6. **人工管理** - HrAttendance.tsx, WorkerAttendance.tsx, PersonnelManagement.tsx
7. **审批中心** - PendingApproval.tsx, Approvals.tsx, Approved.tsx
8. **系统设置** - Settings.tsx, BaseSettings.tsx, DepartmentSettings.tsx
9. **消息中心** - Messages.tsx, Announcement.tsx
10. **个人中心** - Profile.tsx（支持6种角色切换）

## 角色权限体系

| 角色 | 说明 |
|------|------|
| admin | 系统管理员 |
| manager | 经理/主管 |
| supervisor | 生产主管 |
| technician | 技术员 |
| worker | 普通员工 |
| visitor | 访客/演示人员 |

## 操作日志

详细操作记录请参考 `OPERATION_LOG.md`

## 最近更新

### 2026-03-28 - 生产领料单增加字段及拒绝原因显示
**文件**: `src/pages/MaterialReceiving.tsx`

**变更内容**:
- 领料申请Tab表格新增三列：
  1. **部门** - 申请人所属部门（生产部/后勤部/设备部/技术部/采后处理部）
  2. **物料种类** - 显示该领料单包含的物料种类数量（如"2种"）
  3. **种植区域/用途** - 物料使用区域（如"1号棚-叶菜区"、"灌溉系统维护"等）
- **拒绝原因显示功能**：
  - 被拒绝的订单在状态列显示红色"已拒绝"标签和拒绝原因文本
  - 详情弹窗也显示拒绝原因

**涉及修改的完整位置**:
1. ✅ `materialReceivingDetails` Mock数据 - 添加 `department` 和 `plantArea` 字段
2. ✅ 表格 `<thead>` 表头 - 新增三列表头
3. ✅ 表格 `<tbody>` 表体 - 新增三列数据单元格
4. ✅ 详情弹窗 `showDetailModal` - 新增三个字段显示 + 拒绝原因显示
5. ✅ `editForm` / `addForm` 状态定义 - 添加 `department` 和 `plantArea` 字段
6. ✅ `handleEdit` 函数 - 复制 `department` 和 `plantArea` 到 editForm
7. ✅ `handleSaveAdd` 函数 - 保存新记录的 `department` 和 `plantArea`
8. ✅ `handleCancelAdd` 函数 - 重置表单时包含新字段
9. ✅ 编辑弹窗 UI - 在申请人后添加"部门"下拉，在库存地点后添加"种植区域/用途"输入框
10. ✅ 新增弹窗 UI - 在申请人后添加"部门"下拉，在库存地点后添加"种植区域/用途"输入框
11. ✅ Mock数据第5条记录 - 添加 `rejectReason: '库存不足，该物料当前库存为0，无法满足申请数量'`
12. ✅ 状态列显示逻辑 - 当 `statusClass === 'rejected'` 时显示红色原因文本

**⚠️ 重要规则（已记录到CLAUDE.md）**:
> 1. 以后所有修改表格内容的，都要同步更新页面的其他对应按键的弹窗内容
> 2. 完成任务后，除了自动检查项目构建是否完整，再自动刷新服务器

## 关键配置

- **API端口**: 5188
- **默认用户**: 陆启闯(LQC)，职位：经理，部门：生产部
- **启动命令**: `npm run dev` 或 `启动服务.bat`
