import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, configureQueryClient } from './lib/queryClient';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ApprovalProvider } from './contexts/ApprovalContext';
import { ToastProvider } from './contexts/ToastContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import GlobalDialog from './components/common/GlobalDialog';
import { autoInitializeData } from './utils/dataInitializer';
import { syncManager } from './services/syncManager';
import { useAuthStore, useSystemConfigStore } from './stores';
import { useThemeConfig } from './hooks/useThemeConfig';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Production from './pages/Production';
import Tasks from './pages/Tasks';
import Materials from './pages/Materials';
import EnvironmentMonitor from './pages/EnvironmentMonitor';
import Harvest from './pages/Harvest';
import ProduceInventory from './pages/ProduceInventory';
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
import DeviceManagement from './pages/DeviceManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import TeamManagement from './pages/TeamManagement';
import CostAccounting from './pages/CostAccounting';
import AuditLog from './pages/AuditLog';
import BlockManagement from './pages/BlockManagement';
import BackupRecovery from './pages/system/BackupRecovery';
import SystemMonitorPage from './pages/system/SystemMonitor';
// iAGS 集成新增页面（Phase 0 占位）
import FarmPartitionManagement from './pages/system/FarmPartitionManagement';
import AreaSystemManagement from './pages/system/AreaSystemManagement';
import DeviceSystemManagement from './pages/system/DeviceSystemManagement';
import CameraManagement from './pages/system/CameraManagement';
import EnergyConfigManagement from './pages/system/EnergyConfigManagement';
import AlarmConfigManagement from './pages/system/AlarmConfigManagement';
import WaterFertilizerManagement from './pages/system/WaterFertilizerManagement';
import ProjectDebugManagement from './pages/system/ProjectDebugManagement';
import PlantSettingManagement from './pages/system/PlantSettingManagement';
import DeviceDistributionManagement from './pages/system/DeviceDistributionManagement';
import DataMigration from './pages/system/DataMigration';

import BaseSettings from './pages/BaseSettings';
import DeviceMonitor from './pages/DeviceMonitor';
import AlertInfo from './pages/AlertInfo';
import Indicators from './pages/Indicators';
import Announcement from './pages/Announcement';

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

import CropVarietyManagement from './components/farm/crop-variety/CropVarietyManagement';

// 病虫害防治管理模块
import PestControlPage from './components/farm/pest-control/PestControlPage';
import PesticideLibraryPage from './components/settings/pesticide-library/PesticideLibraryPage';
import PestDiseaseDictPage from './components/settings/pest-disease-dict/PestDiseaseDictPage';

import ProcessManagement from './pages/ProcessManagement';
import PersonnelManagement from './pages/PersonnelManagement';
import DepartmentSettings from './pages/DepartmentSettings';
import { StaffManagementPage } from './components/labor/personnel/StaffManagementPage';
import PositionManagement from './pages/PositionManagement';
import HrAttendance from './pages/HrAttendance';
import HrApprovalDocuments from './pages/HrApprovalDocuments';
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
const PersonnelPage = lazy(() => import('./pages/labor/PersonnelPage'));
const CompensationPage = lazy(() => import('./pages/labor/CompensationPage'));
const AnalyticsPage = lazy(() => import('./pages/labor/AnalyticsPage'));
const HrApprovalDetail = lazy(() => import('./pages/hr/HrApprovalDetail'));
const DispatchPage = lazy(() => import('./components/dispatch').then(module => ({ default: module.DispatchPage })));
const MyTasksPage = lazy(() => import('./components/labor/myTasks/MyTasksPage'));
const SeedSource = lazy(() => import('./pages/crop/SeedSource'));
const Seedling = lazy(() => import('./pages/crop/Seedling'));
const Planting = lazy(() => import('./pages/crop/Planting'));
const Order = lazy(() => import('./pages/crop/Order'));
const Instance = lazy(() => import('./pages/crop/Instance'));
const CropHarvest = lazy(() => import('./pages/crop/Harvest'));
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

// 带侧边栏的布局组件（种植管理系统）
function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Header 固定在顶部 */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header onMenuClick={() => setSidebarOpen(true)} />
      </div>

      <div className={sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52'}>
        <main className="pt-12 p-4 lg:p-6 mt-6">
          {children}
        </main>
      </div>
    </div>
  );
}

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

  // 主页和登录页独立显示，不带侧边栏
  if (isHomePage) {
    return <HomePage />;
  }

  if (isLoginPage) {
    return <Login />;
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
            <Route path="device" element={<DeviceManagement />} />
            <Route path="warehouse" element={<WarehouseManagement />} />
            <Route path="team" element={<TeamManagement />} />
            <Route path="cost-accounting" element={<CostAccounting />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="crop-variety" element={<CropVarietyManagement />} />
            {/* 病虫害防治管理 */}
            <Route path="pesticide-library" element={<PesticideLibraryPage />} />
            <Route path="pest-disease-dict" element={<PestDiseaseDictPage />} />

            <Route path="processes" element={<ProcessManagement />} />
            <Route path="departments" element={<DepartmentSettings />} />
            <Route path="bases" element={<BaseSettings />} />
            <Route path="block" element={<BlockManagement />} />
            <Route path="farm-structure" element={<FarmStructureManagement />} />
            <Route path="monitor" element={<SystemMonitorPage />} />
            <Route path="backup" element={<BackupRecovery />} />
            {/* iAGS 集成新增路由（Phase 0 占位） */}
            <Route path="partitions" element={<FarmPartitionManagement />} />
            <Route path="area-systems" element={<AreaSystemManagement />} />
            <Route path="device-systems" element={<DeviceSystemManagement />} />
            <Route path="cameras" element={<CameraManagement />} />
            <Route path="energy-configs" element={<EnergyConfigManagement />} />
            <Route path="alarm-configs" element={<AlarmConfigManagement />} />
            <Route path="water-fertilizer" element={<WaterFertilizerManagement />} />
            <Route path="project-debug" element={<ProjectDebugManagement />} />
            <Route path="plant-settings" element={<PlantSettingManagement />} />
            <Route path="device-distribution" element={<DeviceDistributionManagement />} />

          </Route>
          <Route path="/settings/personnel" element={<PersonnelManagement />} />
          <Route path="/settings/personnel/staff" element={<StaffManagementPage />} />
          <Route path="/settings/personnel/position" element={<PositionManagement />} />
          <Route path="/settings/personnel/attendance" element={<HrAttendance />} />
          <Route path="/settings/personnel/hr-approval" element={<HrApproval />} />
          <Route path="/settings/personnel/hr-documents" element={<HrApprovalDocuments />} />
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
          <Route path="/crop/harvest" element={<CropHarvest />} />
<Route path="/crop/fertilizer" element={<Fertilizer />} />
          <Route path="/crop-inventory" element={<ProduceInventory />} />
          <Route path="/crop/order" element={<Order />} />
          <Route path="/crop/instance" element={<Instance />} />
          <Route path="/production" element={<Production />} />
          <Route path="/tech-solution" element={<TechSolution />} />
          <Route path="/purchase-plan" element={<PurchasePlan />} />

          {/* 人工管理聚合页面 */}
          <Route path="/labor/attendance" element={<AttendancePage />} />
          <Route path="/labor/personnel" element={<PersonnelPage />} />
          <Route path="/labor/compensation" element={<CompensationPage />} />
          <Route path="/labor/analytics" element={<AnalyticsPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/hr-approval-detail/:id" element={<HrApprovalDetail />} />

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
          <Route path="/reports" element={<Navigate to="/summary/overview" replace />} />
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
          <Route path="/harvest" element={<Harvest />} />
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
  // 应用启动时自动初始化作物管理模拟数据
  useEffect(() => {
    autoInitializeData().catch(console.error);
  }, []);

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

  // ★ V3.0 Phase 4: 动态主题 — 同步 theme.* 配置到 CSS 变量
  useThemeConfig();

  // 启动同步管理器（SYNC模式）
  useEffect(() => {
    syncManager.start();
    return () => syncManager.stop();
  }, []);

  return (
    <BrowserRouter>
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
