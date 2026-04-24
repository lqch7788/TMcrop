# 生产汇总表重构备份清单 - 2026-04-10

## 备份日期
2026-04-10

## 备份目的
在实施"生产汇总表工作流闭环重构"前，对现有生产汇总相关页面和组件进行备份，以便在重构失败或需要回滚时能够恢复。

## 备份内容

### 组件备份 (public/backup_20260410/components/summary/)
| 文件名 | 原始路径 | 说明 |
|--------|----------|------|
| ExportModal.tsx | src/components/summary/ExportModal.tsx | 导出格式选择弹窗 |
| Filters.tsx | src/components/summary/Filters.tsx | 筛选工具栏组件 |
| index.ts | src/components/summary/index.ts | 模块导出入口 |
| PageHeader.tsx | src/components/summary/PageHeader.tsx | 页面标题组件 |
| Pagination.tsx | src/components/summary/Pagination.tsx | 分页组件 |
| ReportCharts.tsx | src/components/summary/ReportCharts.tsx | 报表图表组件 |
| ReportTabs.tsx | src/components/summary/ReportTabs.tsx | 报表Tab切换组件 |
| StatCards.tsx | src/components/summary/StatCards.tsx | 统计卡片组件 |
| SummaryTable.tsx | src/components/summary/SummaryTable.tsx | 数据表格组件 |
| types.ts | src/components/summary/types.ts | 类型定义 |
| useExport.ts | src/components/summary/useExport.ts | 导出Hook |

### 页面备份 (public/backup_20260410/pages/)
| 文件名 | 原始路径 | 说明 |
|--------|----------|------|
| PlanSummary.tsx | src/pages/PlanSummary.tsx | 生产计划汇总表页面 |
| DailyWorkSummary.tsx | src/pages/DailyWorkSummary.tsx | 每日工单汇总表页面 |
| DailyProblemSummary.tsx | src/pages/DailyProblemSummary.tsx | 每日问题汇总表页面 |

## 恢复方法
如需恢复备份，执行以下命令：
```bash
# 恢复组件
cp public/backup_20260410/components/summary/* src/components/summary/

# 恢复页面
cp public/backup_20260410/pages/* src/pages/
```

## 重构实施日期
待定（根据综合方案确定）

## 备份创建者
Claude Code AI Assistant
