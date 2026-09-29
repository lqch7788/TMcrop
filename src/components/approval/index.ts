// ============================================================
// 审批组件库 - 统一导出
// 文件路径：src/components/approval/index.ts
//
// 2026-09-29 审计清理：本目录原有 12 个组件，其中 10 个零引用（ApprovalList /
// ApprovalFilters / ApprovalLevelBadge / MaterialApprovalForm / ApprovalSubmitPanel /
// ApprovalTimeline / BatchActionBar / BatchConfirmModal / BatchResultModal / NotificationPanel）
// 已删除，barrel 相应收缩。存活的只有：
//   - ApprovalDetail  —— Approved / MyApproval / PendingApproval / FarmApproval /
//                        IndicatorBudgetApproval / MyApplications 六个页面使用
//   - BusinessPreview —— 仅被 ApprovalDetail 内部使用
// 新增导出前请先 grep 确认调用方，避免再次堆积死代码。
// ============================================================

export { ApprovalDetail } from './ApprovalDetail';
