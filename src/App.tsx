import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, configureQueryClient } from './lib/queryClient';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import MainLayout from './components/layout/MainLayout';
import { ApprovalProvider } from './contexts/ApprovalContext';
import { ToastProvider } from './contexts/ToastContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import GlobalDialog from './components/common/GlobalDialog';
import { useAuthStore, useSystemConfigStore, useCropVarietyStore } from './stores';
import { useThemeConfig } from './hooks/useThemeConfig';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Production from './pages/Production';
import Tasks from './pages/Tasks';
import Materials from './pages/Materials';
import EnvironmentMonitor from './pages/EnvironmentMonitor';

import InventoryV3 from './pages/InventoryV3';
import OutboundRecordsPage from './pages/OutboundRecordsPage';
import ProduceCodeRule from './pages/ProduceCodeRule';
// Reports 已迁移至 /summary/overview（生产汇总表 V1.0）
import MaterialApproval from './pages/MaterialApproval';
import ProductionApproval from './pages/ProductionApproval';
import FarmApproval from './pages/FarmApproval';
import IndicatorBudgetApproval from './pages/IndicatorBudgetApproval';
import MyApplications from './pages/MyApplications';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import SystemConfig from './pages/SystemConfig';
import DictionaryManagement from './pages/DictionaryManagement';
// 组织与权限管理 — 统一入口 UserPermissionHub 内含5个TAB
import {
  OrganizationManagement,
  RoleManagement,
  AuthorityConfiguration,
  UserManagement,
  UserAuthorityConfig,
  UserPermissionHub,
} from './pages/authority';
import ApprovalWorkflowConfig from './pages/ApprovalWorkflowConfig';
import ApprovalLevelConfig from './pages/ApprovalLevelConfig';
import NotificationSettings from './pages/NotificationSettings';
import WarehouseManagement from './pages/WarehouseManagement';
import TeamManagement from './pages/TeamManagement';
import AuditLog from './pages/AuditLog';
import DataMigration from './pages/system/DataMigration';

import DeviceMonitor from './pages/DeviceMonitor';
import AlertInfo from './pages/AlertInfo';
import Indicators from './pages/Indicators';
import Announcement from './pages/Announcement';

// 物联网监控系统 - 从 V1.3 复制的子页面（IoT 布局专用）
import IoTLayout from './components/layout/IoTLayout';
import EnvMonitoring from './pages/iot/EnvMonitoring';
import SoilWater from './pages/iot/SoilWater';
import WeatherMonitoring from './pages/iot/WeatherMonitoring';
import EnergyMonitoring from './pages/iot/EnergyMonitoring';
import HistoryData from './pages/iot/HistoryData';
import MonitoringConfig from './pages/iot/MonitoringConfig';
import VideoMonitor from './pages/video/VideoMonitor';
import VideoPlayback from './pages/video/VideoPlayback';

// 智能控制系统 - 从 V1.3 复制的子页面（Smart 布局专用）
import SmartLayout from './components/layout/SmartLayout';
import SmartCenter from './pages/smart/ControlCenter';
import SmartGreenhouse from './pages/smart/GreenhouseControl';
import SmartIrrigation from './pages/smart/IrrigationControl';
import SmartFertilizer from './pages/smart/FertilizerControl';
import SmartLinkage from './pages/smart/LinkageControl';
import SmartStrategy from './pages/smart/ControlStrategy';
import SmartLog from './pages/smart/ControlLog';

// 溯源管理系统 - 从 V1.3 复制的子页面（Traceability 布局专用）
import TraceabilityLayout from './components/layout/TraceabilityLayout';
import TraceabilityPage from './pages/traceability/Traceability';
import PlantingArchive from './pages/traceability/PlantingArchive';
import ProcessingArchive from './pages/traceability/ProcessingArchive';
import CirculationTrace from './pages/traceability/CirculationTrace';
import TraceCode from './pages/traceability/TraceCode';
import ConsumerQuery from './pages/traceability/ConsumerQuery';

// 大数据分析系统 - 从 V1.3 复制的子页面（BigData 布局专用）
import BigDataLayout from './components/layout/BigDataLayout';
import DataAnalysis from './pages/analysis/DataAnalysis';
import AnalysisModel from './pages/analysis/AnalysisModel';
import YieldPrediction from './pages/analysis/YieldPrediction';
import TrendAnalysis from './pages/analysis/TrendAnalysis';
import DecisionSupport from './pages/analysis/DecisionSupport';
import EnvironmentAnalysis from './pages/analysis/EnvironmentAnalysis';
import BigDataCostAnalysis from './pages/analysis/CostAnalysis';
import BenefitAnalysis from './pages/analysis/BenefitAnalysis';

// AI/专家诊断系统 - 从 V1.3 复制的子页面（AI 布局专用）
import AILayout from './components/layout/AILayout';
import PestIdentify from './pages/diagnosis/PestIdentify';
import GrowthAnalysis from './pages/diagnosis/GrowthAnalysis';
import ExpertSystem from './pages/diagnosis/ExpertSystem';
import TreatmentRecommend from './pages/diagnosis/TreatmentRecommend';
import OnlineConsult from './pages/diagnosis/OnlineConsult';
import KnowledgeBase from './pages/diagnosis/KnowledgeBase';

// 经营核算系统 - 从 V1.3 复制的子页面（Management 布局专用）
import ManagementLayout from './components/layout/ManagementLayout';
import CostAccounting from './pages/business/CostAccounting';
import IncomeManagement from './pages/business/IncomeManagement';
import FinancialAnalysisPage from './pages/business/FinancialAnalysis';
import InputOutputAnalysis from './pages/business/InputOutputAnalysis';
import OperationReport from './pages/business/OperationReport';

// 销售协同系统 - 从 V1.3 sales 复制的子页面（Market 布局专用）
import MarketLayout from './components/layout/MarketLayout';
import MarketSales from './pages/market/MarketSales';
import OrderManagement from './pages/market/OrderManagement';
import CustomerManagement from './pages/market/CustomerManagement';
import PriceMonitoring from './pages/market/PriceMonitoring';
import SalesChannel from './pages/market/SalesChannel';
import MarketTrend from './pages/market/MarketTrend';
import SalesStatistics from './pages/market/SalesStatistics';

import CodeRule from './pages/CodeRule';
import TechSolution from './pages/TechSolution';
import PurchasePlan from './pages/PurchasePlan';
import WorkerAttendance from './pages/WorkerAttendance';
import WorkLog from './pages/WorkLog';
import MonthlyReport from './pages/MonthlyReport';
// DailyProblemSummary 已迁移至 /summary/problems（生产汇总表 V1.0）
import DailyWorkSummary from './pages/farm/DailyWorkSummary';
// PlanSummary 已迁移至 /summary/batch（生产汇总表 V1.0）
import SupplierManagement from './pages/SupplierManagement';
import SupplierCodeRule from './pages/SupplierCodeRule';
import MaterialCategory from './pages/MaterialCategory';
import MaterialReceiving from './pages/MaterialReceiving';
import MaterialReturn from './pages/MaterialReturn';
import WarehouseOverviewPage from './pages/warehouse/WarehouseOverviewPage';
import WarehouseInboundPage from './pages/warehouse/WarehouseInboundPage';
import PendingApproval from './pages/PendingApproval';
import Approved from './pages/Approved';
import MyApproval from './pages/MyApproval';
import HrApproval from './pages/HrApproval';
import FarmStructureManagement from './pages/farm/FarmStructureManagement';
import BaseOperationsCenterV2 from './pages/BaseOperationsCenterV2';

import CropVarietyManagement from './components/farm/crop-variety/CropVarietyManagement';

// 病虫害防治管理模块
import PestControlPage from './components/farm/pest-control/PestControlPage';
import PesticideLibraryPage from './components/settings/pesticide-library/PesticideLibraryPage';
import PestDiseaseDictPage from './components/settings/pest-disease-dict/PestDiseaseDictPage';
import FertilizerLibraryPage from './components/settings/fertilizer-library/FertilizerLibraryPage';

import DepartmentSettings from './pages/DepartmentSettings';
import { StaffManagementPage } from './components/labor/personnel/StaffManagementPage';
import PersonnelPage from './pages/labor/PersonnelPage';
import ParkArchive from './pages/ParkArchive';
import Profile from './pages/Profile';
import Leave from './pages/Leave';
import Schedule from './pages/Schedule';
import TempWorker from './pages/TempWorker';
import Salary from './pages/Salary';
import Recruitment from './pages/Recruitment';
import Overtime from './pages/Overtime';
import Skill from './pages/Skill';
import Performance from './pages/Performance';
import Efficiency from './pages/Efficiency';
import Risk from './pages/Risk';
// 懒加载组件 - 优化 bundle 分割，按需加载非常用页面
const IoTMonitor = lazy(() => import('./pages/IoTMonitor'));
const EnvControl = lazy(() => import('./pages/EnvControl'));
const AgricultureRecord = lazy(() => import('./pages/AgricultureRecord'));
const SmartDispatch = lazy(() => import('./pages/SmartDispatch'));
const DailyPlanningPage = lazy(() => import('./pages/DailyPlanningPage'));
const MonthlyPlanningPage = lazy(() => import('./pages/MonthlyPlanningPage'));
const Piecework = lazy(() => import('./pages/Piecework'));
const SalaryBudget = lazy(() => import('./pages/SalaryBudget'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Contract = lazy(() => import('./pages/Contract'));
const Team = lazy(() => import('./pages/Team'));
const TempTask = lazy(() => import('./pages/TempTask'));
const TaskCenterPage = lazy(() => import('./pages/farm/TaskCenterPage'));
const FarmTaskHub = lazy(() => import('./pages/farm/FarmTaskHub'));
const AttendancePage = lazy(() => import('./pages/labor/AttendancePage'));
const CompensationPage = lazy(() => import('./pages/labor/CompensationPage'));
const AnalyticsPage = lazy(() => import('./pages/labor/AnalyticsPage'));
const DispatchPage = lazy(() => import('./components/dispatch').then(module => ({ default: module.DispatchPage })));
const MyTasksPage = lazy(() => import('./components/labor/myTasks/MyTasksPage'));
const SeedSource = lazy(() => import('./pages/crop/SeedSource'));
const Seedling = lazy(() => import('./pages/crop/Seedling'));
const Planting = lazy(() => import('./pages/crop/Planting'));
const Order = lazy(() => import('./pages/crop/Order'));
const Customer = lazy(() => import('./components/farm/customer/CustomerPage'));

const MaterialFlow = lazy(() => import('./pages/material-flow/MaterialFlowPage'));
const Fertilizer = lazy(() => import('./pages/crop/Fertilizer'));
// 生产汇总表 V1.0 - 8页面重构 → V1.1 合并为5页面
const SummaryOverview = lazy(() => import('./pages/summary/SummaryOverview'));
const BusinessAnalysis = lazy(() => import('./pages/summary/BusinessAnalysis'));
const BatchManagement = lazy(() => import('./pages/summary/BatchManagement'));
const ProblemSummary = lazy(() => import('./pages/summary/ProblemSummary'));
const SummaryIndicators = lazy(() => import('./pages/summary/SummaryIndicators'));
// 旧页面保留（TAB内子页面直接访问 + 重定向）
const YieldAnalysis = lazy(() => import('./pages/summary/YieldAnalysis'));
const CostAnalysis = lazy(() => import('./pages/summary/CostAnalysis'));
const LaborAnalysis = lazy(() => import('./pages/summary/LaborAnalysis'));
const BatchSummary = lazy(() => import('./pages/summary/BatchSummary'));
const ChainTraceability = lazy(() => import('./pages/summary/ChainTraceability'));

// 加载中占位组件
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}

// 带侧边栏的布局组件已抽到 src/components/layout/MainLayout.tsx（2026-06-05）

// 简单布局组件（只有Header，没有侧边栏）
function SimpleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header 固定在顶部 */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header onMenuClick={() => {}} />
      </div>
      <div className="pt-12 px-4 lg:px-8">
        <div className="pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// 路由配置组件
function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';
  const isProfilePage = location.pathname === '/profile';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // 物联网监控系统路由（使用专用 IoT 布局：左侧 IoTSidebar + 顶部 Header）
  // 从 V1.3 复制：包括物联网监控/环境监控/视频监控三大模块
  const isIoTRoute =
    location.pathname === '/environment-monitor' ||
    location.pathname === '/iot-monitor' ||
    location.pathname === '/device-monitor' ||
    location.pathname === '/alert-info' ||
    location.pathname.startsWith('/iot/') ||
    location.pathname.startsWith('/video/');

  // 智能控制系统路由（使用专用 Smart 布局：左侧 SmartSidebar + 顶部 Header）
  // 从 V1.3 复制：控制中心/温室/灌溉/施肥/联动/策略/日志 7 子项 + V1.1 原生环控策略管理
  const isSmartRoute =
    location.pathname === '/env-control' ||
    location.pathname === '/smart-center' ||
    location.pathname === '/smart-greenhouse' ||
    location.pathname === '/smart-irrigation' ||
    location.pathname === '/smart-fertilizer' ||
    location.pathname === '/smart-linkage' ||
    location.pathname === '/smart-strategy' ||
    location.pathname === '/smart-log';

  // 溯源管理系统路由（使用专用 Traceability 布局：左侧 TraceabilitySidebar + 顶部 Header）
  // 从 V1.3 复制：产品溯源档案/种植/加工/流通/追溯码/消费者查询 6 子项
  const isTraceRoute =
    location.pathname === '/traceability' ||
    location.pathname.startsWith('/traceability/');

  // 大数据分析系统路由（使用专用 BigData 布局：左侧 BigDataSidebar + 顶部 Header）
  // 从 V1.3 复制：数据分析/分析模型/产量预测/趋势分析/决策支持/环境分析/成本分析/效益分析 8 子项
  const isBigDataRoute =
    location.pathname.startsWith('/bigdata/');

  // AI/专家诊断系统路由（使用专用 AI 布局：左侧 AIDiagnosisSidebar + 顶部 Header）
  // 从 V1.3 复制：病虫害识别/长势分析/专家系统/防治推荐/在线咨询/知识库 6 子项
  const isAiRoute =
    location.pathname.startsWith('/ai/');

  // 经营核算系统路由（使用专用 Management 布局：左侧 ManagementSidebar + 顶部 Header）
  // 从 V1.3 复制：成本核算/收入管理/财务分析/投入产出分析/经营报表 5 子项
  const isManagementRoute =
    location.pathname.startsWith('/manage/');

  // 销售协同系统路由（使用专用 Market 布局：左侧 MarketSidebar + 顶部 Header）
  // 从 V1.3 复制：订单管理/客户管理/价格监测/销售渠道/市场行情/销售统计 6 子项
  const isMarketRoute =
    location.pathname.startsWith('/market/');

  // 主页和登录页独立显示，不带侧边栏
  if (isHomePage) {
    return <HomePage />;
  }

  if (isLoginPage) {
    return <Login />;
  }

  // 物联网监控系统走 IoT 专用布局（从 V1.3 100% 一致复制）
  if (isIoTRoute) {
    return (
      <IoTLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 物联网监控 */}
            <Route path="/iot-monitor" element={<IoTMonitor />} />
            <Route path="/device-monitor" element={<DeviceMonitor />} />
            <Route path="/alert-info" element={<AlertInfo />} />
            <Route path="/iot/env-monitoring" element={<EnvMonitoring />} />
            <Route path="/iot/soil-water" element={<SoilWater />} />
            <Route path="/iot/weather" element={<WeatherMonitoring />} />
            <Route path="/iot/energy" element={<EnergyMonitoring />} />
            <Route path="/iot/history" element={<HistoryData />} />
            <Route path="/iot/config" element={<MonitoringConfig />} />
            {/* 环境监控 */}
            <Route path="/environment-monitor" element={<EnvironmentMonitor />} />
            {/* 视频监控 */}
            <Route path="/video/monitor" element={<VideoMonitor />} />
            <Route path="/video/playback" element={<VideoPlayback />} />
          </Routes>
        </Suspense>
      </IoTLayout>
    );
  }

  // 智能控制系统走 Smart 专用布局（从 V1.3 100% 一致复制）
  if (isSmartRoute) {
    return (
      <SmartLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/env-control" element={<EnvControl />} />
            <Route path="/smart-center" element={<SmartCenter />} />
            <Route path="/smart-greenhouse" element={<SmartGreenhouse />} />
            <Route path="/smart-irrigation" element={<SmartIrrigation />} />
            <Route path="/smart-fertilizer" element={<SmartFertilizer />} />
            <Route path="/smart-linkage" element={<SmartLinkage />} />
            <Route path="/smart-strategy" element={<SmartStrategy />} />
            <Route path="/smart-log" element={<SmartLog />} />
          </Routes>
        </Suspense>
      </SmartLayout>
    );
  }

  // 溯源管理系统走 Traceability 专用布局（从 V1.3 100% 一致复制）
  if (isTraceRoute) {
    return (
      <TraceabilityLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/traceability" element={<TraceabilityPage />} />
            <Route path="/traceability/planting" element={<PlantingArchive />} />
            <Route path="/traceability/processing" element={<ProcessingArchive />} />
            <Route path="/traceability/circulation" element={<CirculationTrace />} />
            <Route path="/traceability/code" element={<TraceCode />} />
            <Route path="/traceability/consumer" element={<ConsumerQuery />} />
          </Routes>
        </Suspense>
      </TraceabilityLayout>
    );
  }

  // 大数据分析系统走 BigData 专用布局（从 V1.3 100% 一致复制）
  if (isBigDataRoute) {
    return (
      <BigDataLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/bigdata/analysis" element={<DataAnalysis />} />
            <Route path="/bigdata/model" element={<AnalysisModel />} />
            <Route path="/bigdata/yield" element={<YieldPrediction />} />
            <Route path="/bigdata/trend" element={<TrendAnalysis />} />
            <Route path="/bigdata/decision" element={<DecisionSupport />} />
            <Route path="/bigdata/environment" element={<EnvironmentAnalysis />} />
            <Route path="/bigdata/cost" element={<BigDataCostAnalysis />} />
            <Route path="/bigdata/benefit" element={<BenefitAnalysis />} />
          </Routes>
        </Suspense>
      </BigDataLayout>
    );
  }

  // AI/专家诊断系统走 AI 专用布局（从 V1.3 100% 一致复制）
  if (isAiRoute) {
    return (
      <AILayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/ai/pest" element={<PestIdentify />} />
            <Route path="/ai/growth" element={<GrowthAnalysis />} />
            <Route path="/ai/expert" element={<ExpertSystem />} />
            <Route path="/ai/prevention" element={<TreatmentRecommend />} />
            <Route path="/ai/consult" element={<OnlineConsult />} />
            <Route path="/ai/knowledge" element={<KnowledgeBase />} />
          </Routes>
        </Suspense>
      </AILayout>
    );
  }

  // 经营核算系统走 Management 专用布局（从 V1.3 100% 一致复制）
  if (isManagementRoute) {
    return (
      <ManagementLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/manage/cost" element={<CostAccounting />} />
            <Route path="/manage/income" element={<IncomeManagement />} />
            <Route path="/manage/financial" element={<FinancialAnalysisPage />} />
            <Route path="/manage/input-output" element={<InputOutputAnalysis />} />
            <Route path="/manage/report" element={<OperationReport />} />
          </Routes>
        </Suspense>
      </ManagementLayout>
    );
  }

  // 销售协同系统走 Market 专用布局（从 V1.3 100% 一致复制）
  if (isMarketRoute) {
    return (
      <MarketLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/market/order" element={<OrderManagement />} />
            <Route path="/market/customer" element={<CustomerManagement />} />
            <Route path="/market/price" element={<PriceMonitoring />} />
            <Route path="/market/channel" element={<SalesChannel />} />
            <Route path="/market/trend" element={<MarketTrend />} />
            <Route path="/market/statistics" element={<SalesStatistics />} />
            <Route path="/market/sales" element={<MarketSales />} />
          </Routes>
        </Suspense>
      </MarketLayout>
    );
  }

  // 个人中心和系统设置页面只显示Header，不显示侧边栏
  if (isProfilePage || isSettingsPage) {
    return (
      <SimpleLayout>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />}>
            <Route path="system-config" element={<SystemConfig />} />
            <Route path="dictionary" element={<DictionaryManagement />} />
            <Route path="user-permission" element={<UserPermissionHub />} />
            {/* 组织与权限管理（新） */}
            <Route path="organizations" element={<OrganizationManagement />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="authority-config" element={<AuthorityConfiguration />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="user-authority" element={<UserAuthorityConfig />} />
            <Route path="approval-workflow" element={<ApprovalWorkflowConfig />} />
            <Route path="approval-level-config" element={<ApprovalLevelConfig />} />
            <Route path="notification" element={<NotificationSettings />} />
            <Route path="warehouse" element={<WarehouseManagement />} />
            <Route path="team" element={<TeamManagement />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="crop-variety" element={<CropVarietyManagement />} />
            {/* 病虫害防治管理 */}
            <Route path="pesticide-library" element={<PesticideLibraryPage />} />
            <Route path="pest-disease-dict" element={<PestDiseaseDictPage />} />
            <Route path="fertilizer-library" element={<FertilizerLibraryPage />} />

            <Route path="departments" element={<DepartmentSettings />} />
            <Route path="bases" element={<FarmStructureManagement />} />
            <Route path="farm-structure" element={<FarmStructureManagement />} />
            <Route path="base-operations" element={<BaseOperationsCenterV2 />} />
          </Route>
        </Routes>
      </SimpleLayout>
    );
  }

  // 其他页面使用带侧边栏的布局
  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/park-archive" element={<ParkArchive />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 作物管理 */}
          <Route path="/crop/seed-source" element={<SeedSource />} />
          <Route path="/crop/seedling" element={<Seedling />} />
          <Route path="/crop/planting" element={<Planting />} />

          <Route path="/crop/material-flow" element={<MaterialFlow />} />
<Route path="/crop/fertilizer" element={<Fertilizer />} />
          <Route path="/crop-inventory" element={<InventoryV3 />} />
          <Route path="/crop/outbound-records" element={<OutboundRecordsPage />} />
          <Route path="/crop/order" element={<Order />} />
          <Route path="/crop/customer" element={<Customer />} />
          <Route path="/production" element={<Production />} />
          <Route path="/tech-solution" element={<TechSolution />} />
          <Route path="/purchase-plan" element={<PurchasePlan />} />

          {/* 人工管理聚合页面 */}
          <Route path="/labor/attendance" element={<AttendancePage />} />
          <Route path="/labor/compensation" element={<CompensationPage />} />
          <Route path="/labor/analytics" element={<AnalyticsPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          {/* 农事管理 - 任务中心(从人工管理移入)、排班调度(从考勤管理移入)、班组分配(从人事管理移入)、每日工单汇总(从生产汇总表移入) */}
          <Route path="/task-center" element={<TaskCenterPage />} />
          <Route path="/farm-hub" element={<FarmTaskHub />} />
          {/* 病虫害防治管理 */}
          <Route path="/pest-control" element={<PestControlPage />} />
          <Route path="/problem-dispatch" element={<FarmTaskHub />} />
          <Route path="/daily-work-summary" element={<DailyWorkSummary />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/team" element={<Team />} />
          {/* 生产汇总表旧路由 → 重定向到 V1.0 新页面 */}
          <Route path="/daily-problem-summary" element={<Navigate to="/summary/problems" replace />} />
          <Route path="/plan-summary" element={<Navigate to="/summary/batch" replace />} />
          <Route path="/reports" element={<Navigate to="/bigdata/analysis" replace />} />
          <Route path="/worker-attendance" element={<WorkerAttendance />} />
          <Route path="/work-log" element={<WorkLog />} />
          <Route path="/monthly-report" element={<MonthlyReport />} />
          <Route path="/supplier-management" element={<SupplierManagement />} />
          <Route path="/material-category" element={<MaterialCategory />} />
          <Route path="/material-receiving" element={<MaterialReceiving />} />
          <Route path="/material-return" element={<MaterialReturn />} />
          <Route path="/warehouse-overview" element={<WarehouseOverviewPage />} />
          <Route path="/warehouse-inbound" element={<WarehouseInboundPage />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/temp-task" element={<TempTask />} />
          <Route path="/personnel/staff" element={<StaffManagementPage />} />
          <Route path="/labor/personnel" element={<PersonnelPage />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/temp-worker" element={<TempWorker />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/recruitment" element={<Recruitment />} />
          <Route path="/overtime" element={<Overtime />} />
          <Route path="/skill" element={<Skill />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/efficiency" element={<Efficiency />} />
          <Route path="/risk" element={<Risk />} />
          <Route path="/smart-dispatch" element={<SmartDispatch />} />
          <Route path="/daily-planning" element={<DailyPlanningPage />} />
          <Route path="/monthly-planning" element={<MonthlyPlanningPage />} />
          <Route path="/piecework" element={<Piecework />} />
          <Route path="/salary-budget" element={<SalaryBudget />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/contract" element={<Contract />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/inspection" element={<FarmTaskHub />} />
          <Route path="/environment-monitor" element={<EnvironmentMonitor />} />

          <Route path="/produce-code-rule" element={<ProduceCodeRule />} />
          <Route path="/iot-monitor" element={<IoTMonitor />} />
          <Route path="/env-control" element={<EnvControl />} />
          <Route path="/agriculture-record" element={<AgricultureRecord />} />
          <Route path="/dispatch" element={<DispatchPage />} />
          <Route path="/task-dispatch" element={<Navigate to="/farm-hub" replace />} />
          <Route path="/device-monitor" element={<DeviceMonitor />} />
          <Route path="/alert-info" element={<AlertInfo />} />
          <Route path="/indicators" element={<Indicators />} />
          <Route path="/announcement" element={<Announcement />} />


          {/* 生产汇总表 V1.1 - 5页面（TAB合并） */}
          <Route path="/summary/overview" element={<SummaryOverview />} />
          <Route path="/summary/business-analysis" element={<BusinessAnalysis />} />
          <Route path="/summary/batch-management" element={<BatchManagement />} />
          <Route path="/summary/problems" element={<ProblemSummary />} />
          <Route path="/summary/indicators" element={<SummaryIndicators />} />
          {/* 旧路由重定向到合并页（保留书签兼容） */}
          <Route path="/summary/yield" element={<Navigate to="/summary/business-analysis" replace />} />
          <Route path="/summary/cost" element={<Navigate to="/summary/business-analysis" replace />} />
          <Route path="/summary/labor" element={<Navigate to="/summary/business-analysis" replace />} />
          <Route path="/summary/batch" element={<Navigate to="/summary/batch-management" replace />} />
          <Route path="/summary/chain" element={<Navigate to="/summary/batch-management" replace />} />
          <Route path="/summary/chain-traceability" element={<Navigate to="/summary/batch-management" replace />} />
          <Route path="/material-approval" element={<MaterialApproval />} />
          <Route path="/production-approval" element={<ProductionApproval />} />
          <Route path="/farm-approval" element={<FarmApproval />} />
          <Route path="/indicator-budget-approval" element={<IndicatorBudgetApproval />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/approved" element={<Approved />} />
          <Route path="/my-approval" element={<MyApproval />} />
          <Route path="/hr-approval" element={<HrApproval />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/code-rule" element={<CodeRule />} />
          <Route path="/supplier-code-rule" element={<SupplierCodeRule />} />

          {/* 数据迁移工具 */}
          <Route path="/data-migration" element={<DataMigration />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
}

function App() {
  // 2026-06-04 V2.1 铁律：删除 V1 模拟数据初始化（后端 seedBasicData 替代）
  // 之前调 autoInitializeData() 写入 localStorage/IndexedDB；现前后端都直连 API，
  // 前端不需要再初始化模拟数据。

  // 应用启动时恢复登录状态（token持久化验证）
  useEffect(() => {
    const authState = useAuthStore.getState();
    // 如果已登录则验证token
    if (authState.isAuthenticated && authState.token) {
      authState.verifyToken();
    } else {
      // 默认使用陆启闯自动登录（密码123456）
      authState.login('陆启闯', '123456');
    }
  }, []);

  // ★ V3.0 Phase 1: 应用启动时预加载系统配置（供全局消费）
  useEffect(() => {
    const store = useSystemConfigStore.getState();
    store.loadConfigs().then(() => {
      // ★ V3.0 Phase 5: Store就绪后动态更新QueryClient默认选项
      configureQueryClient();
    });
  }, []);

  // 预加载作物品种数据（供 CropCodeSelector 等组件使用）
  useEffect(() => {
    const { loadVarietyOptions } = useCropVarietyStore.getState();
    loadVarietyOptions();
  }, []);

  // ★ V3.0 Phase 4: 动态主题 — 同步 theme.* 配置到 CSS 变量
  useThemeConfig();

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OrganizationProvider>
            <SettingsProvider>
              <ToastProvider>
                <ApprovalProvider>
                  <AppContent />
                  <GlobalDialog />
                </ApprovalProvider>
              </ToastProvider>
            </SettingsProvider>
          </OrganizationProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
