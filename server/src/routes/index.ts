/**
 * 路由汇总
 */

import { Router, Request, Response, NextFunction } from 'express';
import cropVarietyRouter from './cropVariety';
import inventoryRouter from './inventory';
import seedlingRouter from './seedling';
import seedlingPropagationRecordsRouter from './seedlingPropagationRecords';
import seedSourceRouter from './seedSource';
import recycleBinRouter from './recycleBin';
import plantingRouter from './planting';
import plantingRecordsRouter from './plantingRecords';
import harvestRouter from './harvest';
import supplierRouter from './supplier';
import cropInstanceRouter from './cropInstance';
import farmTaskRouter from './farmTask';
import inspectionRouter from './inspection';
import problemRouter from './problem';
import problemAttachmentsRouter from './problemAttachments';
import laborRouter from './labor';
import overtimeRouter from './overtime';
import leaveRouter from './leave';
import purchasePlanRouter from './purchasePlan';
import materialRequestRouter from './materialRequest';
import basicDataRouter from './basicData';
import dictionaryRouter from './dictionary';
import authorityRouter from './authority';
import notificationRouter from './notification';
import approvalWorkflowRouter from './approvalWorkflow';
import approvalRouter from './approval';
import approvalLinkageRouter from './approvalLinkage';
import operationLogRouter from './operationLog';
import deletedDocumentsRouter from './deletedDocuments';
import workLogRouter from './workLog';
import reminderRouter from './reminder';
import farmOperationRecordsRouter from './farmOperationRecords';
import inventoryTransactionsRouter from './inventoryTransactions';
// 2026-10-09：补录申请单路由（物料审批 → 补录审批 tab 后端通路）
import inventorySupplementaryRouter from './inventorySupplementary';
// 2026-10-09：调拨申请单路由（物料审批 → 库存调拨 tab 后端通路）
import inventoryTransferApplicationRouter from './inventoryTransferApplication';
// 2026-10-09：育苗补录申请单路由（HarvestRecordModal planting_self_kept → 物料审批→补录审批 tab）
import seedlingSupplementaryRouter from './seedlingSupplementary';
import cropOrderRouter from './cropOrder';
import productionPlanRouter from './productionPlan';
import techSolutionRouter from './techSolution';
import summaryRouter from './summary';
import materialCostRouter from './materialCost';
import materialReturnRouter from './materialReturn';
import materialExecuteRouter from './materialExecute';
import materialStatisticsRouter from './materialStatistics';
// 2026-07-21 临时禁用: routes/monitoring.ts 引用了不存在的 services/performanceMonitor
// import monitoringRouter from './monitoring';
import syncRouter from './sync';
import announcementRouter from './announcement';
// 2026-08-22：AI 模块（智能任务中心 P0）
import aiWorkhourRouter from './ai/workhour';
import aiDispatchRouter from './ai/dispatch';
import aiGrowthRouter from './ai/growth';
import aiRouteRouter from './ai/route';
import aiPestRouter from './ai/pest';
import aiQaRouter from './ai/qa';
import aiReportRouter from './ai/report';
import aiScheduleRouter from './ai/schedule';
import aiResourceRouter from './ai/resource';
import aiImageRouter from './ai/image';
import aiGrowthStateRouter from './ai/growthState';
import aiVoiceRouter from './ai/voice';
import aiConfigRouter from './ai/config';
import aiAnomalyRouter from './ai/anomaly';
import aiAttendanceRouter from './ai/attendance';
import aiApprovalRouter from './ai/approval';
import indicatorsRouter from './indicators';
import indicatorEvaluationsRouter from './indicatorEvaluations';
import scheduleRouter from './schedule';
import dispatchRouter from './dispatch';
import attendanceRouter from './attendance';
import personnelRouter from './personnel';
import onboardingRouter from './onboarding';
import iotMonitorRouter from './iotMonitor';
import alertRouter from './alert';
import materialsRouter from './materials';
import resignationRouter from './resignation';
import recruitmentRouter from './recruitment';
import teamMembersRouter from './teamMembers';
// 2026-09-15：班组分配管理完整性 Phase 2 - 5 个新模块路由
import teamZonesRouter from './teamZones';
import teamCapabilitiesRouter from './teamCapabilities';
import workerTeamsRouter from './workerTeams';
import teamMemberChangesRouter from './teamMemberChanges';
import teamAvailabilityRouter from './teamAvailability';
import contractRenewalRouter from './contractRenewal';
import contractRouter from './contract';
import performanceRouter from './performance';
import riskRouter from './risk';
import salaryBudgetRouter from './salaryBudget';
import fertilizerRouter from './fertilizer';
import regionRouter from './region';
import plantMarksRouter from './plantMarks';
import plantLabelsRouter from './plantLabels';
import plantLabelResumesRouter from './plantLabelResumes';
import materialCodeCategoriesRouter from './materialCodeCategories';
import backupRouter from './backup';
import plantingRecordRouter from './plantingRecord';
import farmPartitionsRouter from './farmPartitions';
import areaSystemsRouter from './areaSystems';
import deviceSystemsRouter from './deviceSystems';
import camerasRouter from './cameras';
import energyConfigsRouter from './energyConfigs';
import alarmConfigsRouter from './alarmConfigs';
import waterFertilizerRouter from './waterFertilizer';
import plantSettingsRouter from './plantSettings';
import projectDebugRouter from './projectDebug';
import deviceDistributionRouter from './deviceDistribution';
import farmTaskSchedulesRouter from './farmTaskSchedules';
// 2026-10-24（E5）：farmTaskSwapRequestsRouter 已下线（统一到 swap_requests），
//   见下方 router.use('/farm-task-swap-requests', ...) 处的说明。
// import farmTaskSwapRequestsRouter from './farmTaskSwapRequests';
// v0.3 P0-1：批次统一时间线路由
import batchTimelineRouter from './batchTimeline';
// v0.3 P0-2：任务进度跟踪路由
import taskProgressRouter from './taskProgress';
// v0.3 P0-R + P0-S：监管报告 + 合规血缘
import complianceReportRouter from './complianceReport';
// P1-3：承诺达标合格证
import complianceCertificateRouter from './complianceCertificate';
// 2026-10-21 P2b：巡查计划（模板）。实例化出来的执行单仍是 farm_tasks，不新建任务系统
import inspectionPlanRouter from './inspectionPlan';
// v0.3 P0-3：移动端离线队列同步
import offlineSyncRouter from './offlineSync';
// v0.3 P0-B：纸单兜底（班组长代填）
import paperReportRouter from './paperReport';
// v0.3 P1-1：SOP 库
import sopLibraryRouter from './sopLibrary';
// v0.3 P1-4：批次成本归集
import batchCostRouter from './batchCost';
// v0.3 P1-2：提醒引擎
import remindersRouter from './reminders';
// v0.3 P1-5：问题整改追踪
import issueTrackingRouter from './issueTracking';
// v0.3 P1-A：考勤数据接入
import attendanceIntegrationRouter from './attendanceIntegration';
import pestRecordsRouter from './pesticideRecords';
import pesticideLibraryRouter from './pesticideLibrary';
import fertilizerSpecsRouter from './fertilizerSpecs';
import pestDiseaseDictRouter from './pestDiseaseDict';
import userBasePermissionsRouter from './userBasePermissions';
import codeGeneratorRouter from './codeGenerator';
import dailyPlansRouter from './dailyPlans';
import monthlyPlansRouter from './monthlyPlans';
import customerRouter from './customer.routes';
import marketRouter from './market.routes';
import deliveryRouter from './delivery.routes';
import qualityRouter from './quality.routes';
import acceptanceRouter from './acceptance.routes';
import materialFlowLogRouter from './materialFlowLog';
import wateringRouter from './watering';
import weatherRouter from './weather';
import monitoringDevicesRouter from './monitoringDevices';
import iotAlertsRouter from './iotAlerts';
import iotEnergyReadingsRouter from './iotEnergyReadings';
import iotHistoryRouter from './iotHistory';
import iotMonitoringConfigsRouter from './iotMonitoringConfigs';
import iotCamerasRouter from './iotCameras';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
// 2026-10-25：工序-动作权限校验（此前全站写端点只验登录，不查权限矩阵）
import { requireProcessPermission, requireProcessView } from '../middleware/processPermission';
import { apiLimiter, loginLimiter } from '../middleware/rateLimit';

// JWT 认证中间件 - 要求已登录才能访问
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, next);
};

// 可选认证中间件 - 有token就验证，没有也能访问
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  optionalAuthenticate(req, res, next);
};

const router = Router();

// 登录路由限流（更严格：5次/15分钟）
// 注意：由于 router 挂载在 /api 下，这里路径是相对于 /api 的
router.use('/authority/auth/login', loginLimiter);

// 其他 API 通用限流（100次/15分钟）
// 挂载在 / 下，匹配所有路由（因为 routes 在 index.ts 中挂载于 /api）
router.use('/', apiLimiter);

// 作物品种路由 - 需要认证
router.use('/crop-varieties', requireAuth, requireProcessView(), requireProcessPermission(), cropVarietyRouter);

// 库存路由 - 需要认证
router.use('/inventory', requireAuth, requireProcessView(), requireProcessPermission(), inventoryRouter);
// 2026-10-09：补录申请单路由（物料审批 → 补录审批 tab 后端通路）
router.use('/inventory-supplementary-applications', requireAuth, requireProcessView(), requireProcessPermission(), inventorySupplementaryRouter);
// 2026-10-09：调拨申请单路由（物料审批 → 库存调拨 tab 后端通路）
router.use('/inventory-transfer-applications', requireAuth, requireProcessView(), requireProcessPermission(), inventoryTransferApplicationRouter);
// 2026-10-09：育苗补录申请单路由（HarvestRecordModal planting_self_kept → 物料审批→补录审批 tab）
router.use('/seedling-supplementary-applications', requireAuth, requireProcessView(), requireProcessPermission(), seedlingSupplementaryRouter);

// 育苗管理路由 - 需要认证
router.use('/seedlings', requireAuth, requireProcessView(), requireProcessPermission(), seedlingRouter);
router.use('/seedlings', requireAuth, requireProcessView(), requireProcessPermission(), seedlingPropagationRecordsRouter);

// 种源管理路由 - 需要认证
router.use('/seed-sources', requireAuth, requireProcessView(), requireProcessPermission(), seedSourceRouter);
// 2026-10-17：作物管理通用回收站（列表/恢复/彻底删除）
router.use('/recycle-bin', requireAuth, requireProcessView(), requireProcessPermission(), recycleBinRouter);

// 种植管理路由 - 需要认证
router.use('/plantings', requireAuth, requireProcessView(), requireProcessPermission(), plantingRouter);
router.use('/plantings', requireAuth, requireProcessView(), requireProcessPermission(), plantingRecordsRouter);

// 采收管理路由 - 需要认证
router.use('/harvest', requireAuth, requireProcessView(), requireProcessPermission(), harvestRouter);

// 供应商路由 - 需要认证
router.use('/suppliers', requireAuth, requireProcessView(), requireProcessPermission(), supplierRouter);

// 作物实例路由 - 需要认证
router.use('/crop-instances', requireAuth, requireProcessView(), requireProcessPermission(), cropInstanceRouter);

// 农事任务路由 - 需要认证
router.use('/farm-tasks', requireAuth, requireProcessView(), requireProcessPermission(), farmTaskRouter);
// v0.3 P0-1：批次统一时间线
router.use('/batch-timeline', requireAuth, requireProcessView(), requireProcessPermission(), batchTimelineRouter);
// v0.3 P0-2：任务进度跟踪
//
// 2026-10-22 更正（审核 H5，实测确认）：
//   上面的 farmTaskRouter **先**注册，所以 `/progress`、`/complete` 实际命中的是 farmTask 版，
//   taskProgress 版的这两个端点是**死代码**。原注释「taskProgressRouter 先注册优先匹配」写反了。
//   实测依据：POST /farm-tasks/__probe__/complete 返回 farmTask 的 404「农事任务不存在」
//   （taskProgress 会返回 400「任务不存在」）；而 /pause 返回 taskProgress 的 400「reason 必填」。
//
// 处置：不调整挂载顺序（taskProgress 用 progress_pct、farmTask 用 progress，语义不同，
//   换顺序会让一批调用方读到另一个字段），改为让 farmTask 的 /progress 同时接受 {pct}，
//   并在两侧都保留巡查记录守卫。taskProgress 独有的 /start /pause /resume 仍由它服务。
router.use('/farm-tasks', requireAuth, requireProcessView(), requireProcessPermission(), taskProgressRouter);
// v0.3 P0-R + P0-S：监管报告导出 + 合规血缘
router.use('/compliance-report', requireAuth, requireProcessView(), requireProcessPermission(), complianceReportRouter);
// P1-3：承诺达标合格证（按批次开具，留存 ≥6 个月）
router.use('/compliance-certificates', requireAuth, requireProcessView(), requireProcessPermission(), complianceCertificateRouter);
// 2026-10-21 P2b：巡查计划 CRUD + 实例生成
router.use('/inspection-plans', requireAuth, requireProcessView(), requireProcessPermission(), inspectionPlanRouter);
// v0.3 P0-3：移动端离线队列同步
router.use('/offline-sync', requireAuth, requireProcessView(), requireProcessPermission(), offlineSyncRouter);
// v0.3 P0-B：纸单兜底（班组长代填）
router.use('/paper-report', requireAuth, requireProcessView(), requireProcessPermission(), paperReportRouter);
// v0.3 P1-1：SOP 库
router.use('/sop', requireAuth, requireProcessView(), requireProcessPermission(), sopLibraryRouter);
// v0.3 P1-4：批次成本归集
router.use('/batch-cost', requireAuth, requireProcessView(), requireProcessPermission(), batchCostRouter);
// v0.3 P1-2：提醒引擎（注意：必须挂在 /reminders/rules 之前，避免 /rules 被 /:id 拦截）
router.use('/reminders', requireAuth, requireProcessView(), requireProcessPermission(), remindersRouter);
// v0.3 P1-5：问题整改追踪
router.use('/issues', requireAuth, requireProcessView(), requireProcessPermission(), issueTrackingRouter);
// v0.3 P1-A：考勤数据接入
router.use('/attendance', requireAuth, requireProcessView(), requireProcessPermission(), attendanceIntegrationRouter);
// 2026-08-22：AI 模块路由（智能任务中心 P0）
router.use('/ai/workhour', requireAuth, requireProcessView(), requireProcessPermission(), aiWorkhourRouter);
router.use('/ai/dispatch', requireAuth, requireProcessView(), requireProcessPermission(), aiDispatchRouter);
router.use('/ai/growth', requireAuth, requireProcessView(), requireProcessPermission(), aiGrowthRouter);
router.use('/ai/route', requireAuth, requireProcessView(), requireProcessPermission(), aiRouteRouter);
router.use('/ai/pest', requireAuth, requireProcessView(), requireProcessPermission(), aiPestRouter);
router.use('/ai/qa', requireAuth, requireProcessView(), requireProcessPermission(), aiQaRouter);
router.use('/ai/report', requireAuth, requireProcessView(), requireProcessPermission(), aiReportRouter);
router.use('/ai/schedule', requireAuth, requireProcessView(), requireProcessPermission(), aiScheduleRouter);
router.use('/ai/resource', requireAuth, requireProcessView(), requireProcessPermission(), aiResourceRouter);
router.use('/ai/image', requireAuth, requireProcessView(), requireProcessPermission(), aiImageRouter);
router.use('/ai/growth-state', requireAuth, requireProcessView(), requireProcessPermission(), aiGrowthStateRouter);
router.use('/ai/voice', requireAuth, requireProcessView(), requireProcessPermission(), aiVoiceRouter);
router.use('/ai/anomaly', requireAuth, requireProcessView(), requireProcessPermission(), aiAnomalyRouter);
router.use('/ai/attendance', requireAuth, requireProcessView(), requireProcessPermission(), aiAttendanceRouter);
router.use('/ai/config', requireAuth, requireProcessView(), requireProcessPermission(), aiConfigRouter);
router.use('/ai/approval', requireAuth, requireProcessView(), requireProcessPermission(), aiApprovalRouter);

// 巡查记录路由 - 需要认证
router.use('/inspections', requireAuth, requireProcessView(), requireProcessPermission(), inspectionRouter);

// 问题记录路由 - 需要认证
router.use('/problems', requireAuth, requireProcessView(), requireProcessPermission(), problemRouter);
// 2026-06-04 V2.1 铁律：问题附件后端化路由（替代 localStorage）
router.use('/problem-attachments', requireAuth, requireProcessView(), requireProcessPermission(), problemAttachmentsRouter);

// 人工记录路由 - 需要认证
router.use('/labor', requireAuth, requireProcessView(), requireProcessPermission(), laborRouter);

// 加班记录路由 - 需要认证
router.use('/overtime', requireAuth, requireProcessView(), requireProcessPermission(), overtimeRouter);

// 请假记录路由 - 需要认证
router.use('/leave', requireAuth, requireProcessView(), requireProcessPermission(), leaveRouter);

// 2026-10-21（阶段 3）：临时任务路由已下线，数据并入 /farm-tasks

// 采购计划路由 - 需要认证
router.use('/purchase-plans', requireAuth, requireProcessView(), requireProcessPermission(), purchasePlanRouter);

// 物料申请路由 - 需要认证
router.use('/material-requests', requireAuth, requireProcessView(), requireProcessPermission(), materialRequestRouter);

// 基础数据路由（部门/仓库/温室/职位/区域/地块/编码规则/通知渠道/通知规则等）- 可选认证（公开数据）
router.use('/basic-data', optionalAuth, basicDataRouter);

// 编码生成器路由
// 2026-10-26：补权限中间件 —— 此前是全站唯一漏挂的路由，匿名请求可拿到内部编码规则。
//   apiRouteProcessMap 已把 /code-generator 映射到 PROC.SETTINGS，说明设计意图是纳入权限体系。
router.use('/code-generator', requireAuth, requireProcessView(), requireProcessPermission(), codeGeneratorRouter);

// 数据字典路由 - 可选认证（演示模式免登录；字典本身是公共数据）
router.use('/dictionary', optionalAuth, dictionaryRouter);

// 组织与权限路由 - 公开（登录/验证接口）
router.use('/authority', authorityRouter);

// 通知设置路由 - 可选认证（公开数据）
router.use('/notifications', optionalAuth, notificationRouter);

// 审批工作流路由 - 需要认证
router.use('/approval-workflows', requireAuth, requireProcessView(), requireProcessPermission(), approvalWorkflowRouter);

// 审批单路由 - 需要认证
router.use('/approvals', requireAuth, requireProcessView(), requireProcessPermission(), approvalRouter);

// 审批联动路由 - 需要认证
router.use('/approval-linkage', requireAuth, requireProcessView(), requireProcessPermission(), approvalLinkageRouter);

// 操作日志路由 - 需要认证
router.use('/operation-logs', requireAuth, requireProcessView(), requireProcessPermission(), operationLogRouter);

// 已删除单据归档查询 - 需要认证（2026-09-27 追溯方案）
router.use('/deleted-documents', requireAuth, requireProcessView(), requireProcessPermission(), deletedDocumentsRouter);

// 工作日志路由 - 需要认证
router.use('/work-logs', requireAuth, requireProcessView(), requireProcessPermission(), workLogRouter);
router.use('/reminders', requireAuth, requireProcessView(), requireProcessPermission(), reminderRouter);
router.use('/farm-operation-records', requireAuth, requireProcessView(), requireProcessPermission(), farmOperationRecordsRouter);
router.use('/inventory-transactions', requireAuth, requireProcessView(), requireProcessPermission(), inventoryTransactionsRouter);

// 订单路由 - 需要认证
router.use('/crop-orders', requireAuth, requireProcessView(), requireProcessPermission(), cropOrderRouter);

// 生产计划路由 - 需要认证
router.use('/production-plans', requireAuth, requireProcessView(), requireProcessPermission(), productionPlanRouter);

// 生产计划路由别名（兼容前端 /production/plans 调用）- 需要认证
router.use('/production/plans', requireAuth, requireProcessView(), requireProcessPermission(), productionPlanRouter);

// 技术方案路由 - 需要认证
router.use('/tech-solutions', requireAuth, requireProcessView(), requireProcessPermission(), techSolutionRouter);

// 生产汇总统计路由 - 需要认证
router.use('/summary', requireAuth, requireProcessView(), requireProcessPermission(), summaryRouter);

// 成本管理路由（物料成本 + 能源成本）- 需要认证
router.use('/material-costs', requireAuth, requireProcessView(), requireProcessPermission(), materialCostRouter);
router.use('/material-returns', requireAuth, requireProcessView(), requireProcessPermission(), materialReturnRouter);
router.use('/material-executes', requireAuth, requireProcessView(), requireProcessPermission(), materialExecuteRouter);
router.use('/material-statistics', requireAuth, requireProcessView(), requireProcessPermission(), materialStatisticsRouter);

// 性能监控路由 - 需要认证
// 2026-07-21 临时禁用: 同上,因 services/performanceMonitor 模块不存在
// router.use('/monitoring', requireAuth, requireProcessView(), requireProcessPermission(), monitoringRouter);

// 数据同步路由 - 需要认证
router.use('/sync', requireAuth, requireProcessView(), requireProcessPermission(), syncRouter);

// 公告路由 - 需要认证
router.use('/announcements', requireAuth, requireProcessView(), requireProcessPermission(), announcementRouter);

// 指标路由 - 需要认证
router.use('/indicators', requireAuth, requireProcessView(), requireProcessPermission(), indicatorsRouter);

// 指标评估路由 - 需要认证
router.use('/indicator-evaluations', requireAuth, requireProcessView(), requireProcessPermission(), indicatorEvaluationsRouter);

// 排班管理路由 - 需要认证
router.use('/schedules', requireAuth, requireProcessView(), requireProcessPermission(), scheduleRouter);

// 智能派工推荐路由 - 需要认证
router.use('/dispatch', requireAuth, requireProcessView(), requireProcessPermission(), dispatchRouter);

// 农事任务排班路由 - 需要认证
router.use('/farm-task-schedules', requireAuth, requireProcessView(), requireProcessPermission(), farmTaskSchedulesRouter);

// 换班申请路由 - 需要认证
//
// 2026-10-24（E5 员工身份管理）：**已下线**
//   `farm_task_swap_requests`（任务换班）与 `swap_requests`（考勤换班）是两套并行的换班实现：
//     · swap_requests          —— 中文状态（待审批/已同意/已拒绝），4 行，前端在用
//     · farm_task_swap_requests —— 英文状态（pending/approved/rejected），**0 行**，**前端零引用**
//   两套并存导致「换班」有两个数据来源、两套状态值、两条路由路径
//   （后者还是双层嵌套 /api/farm-task-swap-requests/swap-requests）。
//   现已统一以 `swap_requests` 为唯一实现，本路由不再注册。
//
//   保守起见**不 DROP 表**（0 行，删除无数据损失，但删表属破坏性操作，需用户明确授权）；
//   表结构与 `farm_task_swap_requests` 的 FK 保留，若将来确认无用可单独清理。
//   `server/src/services/swapRequestService.ts` 与新路由 `server/src/routes/farmTaskSwapRequests.ts`
//   两个文件同样保留未删（可能被 V2.0 前端引用，需先确认）。
// router.use('/farm-task-swap-requests', requireAuth, farmTaskSwapRequestsRouter);

// 考勤管理路由 - 需要认证
router.use('/attendance', requireAuth, requireProcessView(), requireProcessPermission(), attendanceRouter);

// 人事管理路由 - 需要认证
router.use('/personnel', requireAuth, requireProcessView(), requireProcessPermission(), personnelRouter);

// 入职管理路由 - 需要认证
router.use('/onboarding', requireAuth, requireProcessView(), requireProcessPermission(), onboardingRouter);

// IoT设备监控路由 - 需要认证
router.use('/iot', requireAuth, requireProcessView(), requireProcessPermission(), iotMonitorRouter);

// 告警管理路由 - 需要认证
router.use('/alerts', requireAuth, requireProcessView(), requireProcessPermission(), alertRouter);

// 物料管理路由 - 需要认证
router.use('/materials', requireAuth, requireProcessView(), requireProcessPermission(), materialsRouter);

// 物料编码分类路由 - V12.0
router.use('/material-code-categories', requireAuth, requireProcessView(), requireProcessPermission(), materialCodeCategoriesRouter);

// 种植季记录路由 - 基地空间架构 V1.0
router.use('/planting-records', requireAuth, requireProcessView(), requireProcessPermission(), plantingRecordRouter);

// 离职管理路由 - 需要认证
router.use('/resignation', requireAuth, requireProcessView(), requireProcessPermission(), resignationRouter);

// 招聘管理路由 - 需要认证
router.use('/recruitment', requireAuth, requireProcessView(), requireProcessPermission(), recruitmentRouter);

// 团队成员路由 - 需要认证
router.use('/team-members', requireAuth, requireProcessView(), requireProcessPermission(), teamMembersRouter);

// 2026-09-15：班组分配管理完整性 Phase 2 - 新增 5 组路由
router.use('/teams', requireAuth, requireProcessView(), requireProcessPermission(), teamZonesRouter);
router.use('/teams', requireAuth, requireProcessView(), requireProcessPermission(), teamCapabilitiesRouter);
router.use('/workers', requireAuth, requireProcessView(), requireProcessPermission(), workerTeamsRouter);
router.use('/teams', requireAuth, requireProcessView(), requireProcessPermission(), teamMemberChangesRouter);
router.use('/teams', requireAuth, requireProcessView(), requireProcessPermission(), teamAvailabilityRouter);

// 合同续签路由 - 需要认证
router.use('/contract-renewal', requireAuth, requireProcessView(), requireProcessPermission(), contractRenewalRouter);
router.use('/contracts', requireAuth, requireProcessView(), requireProcessPermission(), contractRouter);
router.use('/performance', requireAuth, requireProcessView(), requireProcessPermission(), performanceRouter);
router.use('/risks', requireAuth, requireProcessView(), requireProcessPermission(), riskRouter);

// 工资预算路由 - 需要认证
router.use('/salary-budget', requireAuth, requireProcessView(), requireProcessPermission(), salaryBudgetRouter);

// 施肥管理路由 - V10.0
router.use('/fertilizer', requireAuth, requireProcessView(), requireProcessPermission(), fertilizerRouter);

// 行政区划路由 - V10.0
router.use('/region', requireAuth, requireProcessView(), requireProcessPermission(), regionRouter);

// 种植标签管理路由 - V10.0 (plant_labels + plant_marks)
router.use('/plant-labels', requireAuth, requireProcessView(), requireProcessPermission(), plantMarksRouter);
router.use('/plant-labels', requireAuth, requireProcessView(), requireProcessPermission(), plantLabelsRouter);
router.use('/plant-labels', requireAuth, requireProcessView(), requireProcessPermission(), plantLabelResumesRouter);

// 数据备份恢复路由 - 需要认证
router.use('/backup', requireAuth, requireProcessView(), requireProcessPermission(), backupRouter);

// 分区管理路由 — iAGS GreenHouseArea 集成
router.use('/farm-partitions', requireAuth, requireProcessView(), requireProcessPermission(), farmPartitionsRouter);

// 区域系统路由 — iAGS AreaSystem 集成
router.use('/area-systems', requireAuth, requireProcessView(), requireProcessPermission(), areaSystemsRouter);

// 设备系统路由 — iAGS deviceSystem 集成
router.use('/device-systems', requireAuth, requireProcessView(), requireProcessPermission(), deviceSystemsRouter);

// 摄像头路由 — iAGS Camera 集成
router.use('/cameras', requireAuth, requireProcessView(), requireProcessPermission(), camerasRouter);

// 能耗配置路由 — iAGS AreaEnery 集成
router.use('/energy-configs', requireAuth, requireProcessView(), requireProcessPermission(), energyConfigsRouter);

// 警报配置路由 — iAGS Warning 集成
router.use('/alarm-configs', requireAuth, requireProcessView(), requireProcessPermission(), alarmConfigsRouter);

// 水肥一体机路由 — iAGS WaterFertilizer 集成
router.use('/water-fertilizer', requireAuth, requireProcessView(), requireProcessPermission(), waterFertilizerRouter);

// 种植设置路由 — iAGS Plantset 集成
router.use('/plant-settings', requireAuth, requireProcessView(), requireProcessPermission(), plantSettingsRouter);

// 工程调试路由 — iAGS ProjectDebug 集成
router.use('/debug', requireAuth, requireProcessView(), requireProcessPermission(), projectDebugRouter);

// 设备分配路由 — iAGS DeviceDistribution 集成
router.use('/device-distributions', requireAuth, requireProcessView(), requireProcessPermission(), deviceDistributionRouter);

// 病虫害防治管理路由 - V12.0
router.use('/pest-records', requireAuth, requireProcessView(), requireProcessPermission(), pestRecordsRouter);
router.use('/pesticide-library', requireAuth, requireProcessView(), requireProcessPermission(), pesticideLibraryRouter);
router.use('/fertilizer-specs', requireAuth, requireProcessView(), requireProcessPermission(), fertilizerSpecsRouter);
router.use('/pest-disease-dict', requireAuth, requireProcessView(), requireProcessPermission(), pestDiseaseDictRouter);

// 用户基地权限管理路由
router.use('/user-base-permissions', requireAuth, requireProcessView(), requireProcessPermission(), userBasePermissionsRouter);

// 每日计划路由
router.use('/daily-plans', requireAuth, requireProcessView(), requireProcessPermission(), dailyPlansRouter);

// 月度计划路由
router.use('/monthly-plans', requireAuth, requireProcessView(), requireProcessPermission(), monthlyPlansRouter);

// 客户档案路由
router.use('/customers', requireAuth, requireProcessView(), requireProcessPermission(), customerRouter);

// 销售协同系统路由（销售订单/客户/价格/渠道/行情/统计/总览）- 需要认证
router.use('/market', requireAuth, requireProcessView(), requireProcessPermission(), marketRouter);

// 交付记录路由
router.use('/delivery-records', requireAuth, requireProcessView(), requireProcessPermission(), deliveryRouter);

// 质检记录路由
router.use('/quality-checks', requireAuth, requireProcessView(), requireProcessPermission(), qualityRouter);

// 验收记录路由
router.use('/acceptances', requireAuth, requireProcessView(), requireProcessPermission(), acceptanceRouter);

// 物料流转追溯路由
router.use('/material-flow-log', requireAuth, requireProcessView(), requireProcessPermission(), materialFlowLogRouter);

// 浇水记录路由 - 2026-07-20 Phase 1
router.use('/watering', requireAuth, requireProcessView(), requireProcessPermission(), wateringRouter);

// 天气路由 — 和风天气代理（环境监测卡片用）
router.use('/weather', requireAuth, requireProcessView(), requireProcessPermission(), weatherRouter);

// 设备监控中心路由（2026-08-29）
router.use('/monitoring', requireAuth, requireProcessView(), requireProcessPermission(), monitoringDevicesRouter);

// 预警信息中心路由（2026-08-29）— 路径用 iot-alerts 避开与 iot/* 子路由冲突
router.use('/iot-alerts', requireAuth, requireProcessView(), requireProcessPermission(), iotAlertsRouter);

// 能耗监测路由（2026-08-29）— 实时能耗读数
router.use('/iot-energy-readings', requireAuth, requireProcessView(), requireProcessPermission(), iotEnergyReadingsRouter);

// 历史数据路由（2026-08-29）
router.use('/iot-history', requireAuth, requireProcessView(), requireProcessPermission(), iotHistoryRouter);

// 监测配置路由（2026-08-29）
router.use('/iot-monitoring-configs', requireAuth, requireProcessView(), requireProcessPermission(), iotMonitoringConfigsRouter);

// 视频监控路由（2026-08-29）
router.use('/iot-cameras', requireAuth, requireProcessView(), requireProcessPermission(), iotCamerasRouter);

// 健康检查 - 增强版
router.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const healthData = {
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      unit: 'MB',
    },
    nodeVersion: process.version,
    platform: process.platform,
  };
  res.json(healthData);
});

export default router;
