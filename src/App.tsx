import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ApprovalProvider } from './contexts/ApprovalContext';
import { ToastProvider } from './contexts/ToastContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { autoInitializeData } from './utils/dataInitializer';
import { syncManager } from './services/syncManager';
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
import Reports from './pages/Reports';
import Approvals from './pages/Approvals';
import MaterialApproval from './pages/MaterialApproval';
import ProductionApproval from './pages/ProductionApproval';
import FarmApproval from './pages/FarmApproval';
import IndicatorBudgetApproval from './pages/IndicatorBudgetApproval';
import MyApplications from './pages/MyApplications';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import SystemConfig from './pages/SystemConfig';
import DictionaryManagement from './pages/DictionaryManagement';
import UserPermission from './pages/UserPermission';
import ApprovalWorkflowConfig from './pages/ApprovalWorkflowConfig';
import ApprovalLevelConfig from './pages/ApprovalLevelConfig';
import NotificationSettings from './pages/NotificationSettings';
import DeviceManagement from './pages/DeviceManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import TeamManagement from './pages/TeamManagement';
import CostAccounting from './pages/CostAccounting';
import AuditLog from './pages/AuditLog';
import BranchManagement from './pages/BranchManagement';
import BlockManagement from './pages/BlockManagement';
import FarmActivityManagement from './pages/FarmActivityManagement';
import BaseSettings from './pages/BaseSettings';
import Traceability from './pages/Traceability';
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
import DailyProblemSummary from './pages/DailyProblemSummary';
import DailyWorkSummary from './pages/farm/DailyWorkSummary';
import PlanSummary from './pages/PlanSummary';
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
import PlantAreaManagement from './pages/PlantAreaManagement';
import CropManagement from './pages/CropManagement';
import CropVarietyManagement from './components/farm/crop-variety/CropVarietyManagement';
import MaterialManagement from './pages/MaterialManagement';
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
const SeedSource = lazy(() => import('./pages/crop/SeedSource'));
const Seedling = lazy(() => import('./pages/crop/Seedling'));
const Planting = lazy(() => import('./pages/crop/Planting'));
const Order = lazy(() => import('./pages/crop/Order'));
const Instance = lazy(() => import('./pages/crop/Instance'));
const CropHarvest = lazy(() => import('./pages/crop/Harvest'));
const SyncDataPage = lazy(() => import('./pages/sync/SyncDataPage'));

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
            <Route path="user-permission" element={<UserPermission />} />
            <Route path="approval-workflow" element={<ApprovalWorkflowConfig />} />
            <Route path="approval-level-config" element={<ApprovalLevelConfig />} />
            <Route path="notification" element={<NotificationSettings />} />
            <Route path="device" element={<DeviceManagement />} />
            <Route path="warehouse" element={<WarehouseManagement />} />
            <Route path="team" element={<TeamManagement />} />
            <Route path="cost-accounting" element={<CostAccounting />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="regions" element={<PlantAreaManagement />} />
            <Route path="crops" element={<CropManagement />} />
            <Route path="crop-variety" element={<CropVarietyManagement />} />
            <Route path="materials" element={<MaterialManagement />} />
            <Route path="processes" element={<ProcessManagement />} />
            <Route path="departments" element={<DepartmentSettings />} />
            <Route path="bases" element={<BaseSettings />} />
            <Route path="branch" element={<BranchManagement />} />
            <Route path="block" element={<BlockManagement />} />
            <Route path="farm-activity" element={<FarmActivityManagement />} />
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
          <Route path="/crop-inventory" element={<ProduceInventory />} />
          <Route path="/crop/order" element={<Order />} />
          <Route path="/crop/instance" element={<Instance />} />
          <Route path="/sync-data" element={<SyncDataPage />} />
          <Route path="/production" element={<Production />} />
          <Route path="/tech-solution" element={<TechSolution />} />
          <Route path="/purchase-plan" element={<PurchasePlan />} />

          {/* 人工管理聚合页面 */}
          <Route path="/labor/attendance" element={<AttendancePage />} />
          <Route path="/labor/personnel" element={<PersonnelPage />} />
          <Route path="/labor/compensation" element={<CompensationPage />} />
          <Route path="/labor/analytics" element={<AnalyticsPage />} />
          <Route path="/hr-approval-detail/:id" element={<HrApprovalDetail />} />

          {/* 农事管理 - 任务中心(从人工管理移入)、排班调度(从考勤管理移入)、班组分配(从人事管理移入)、每日工单汇总(从生产汇总表移入) */}
          <Route path="/task-center" element={<TaskCenterPage />} />
          <Route path="/farm-hub" element={<FarmTaskHub />} />
          <Route path="/problem-dispatch" element={<FarmTaskHub />} />
          <Route path="/daily-work-summary" element={<DailyWorkSummary />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/team" element={<Team />} />
          <Route path="/daily-problem-summary" element={<DailyProblemSummary />} />
          <Route path="/plan-summary" element={<PlanSummary />} />
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
          <Route path="/task-dispatch" element={<FarmTaskHub />} />
          <Route path="/traceability" element={<Traceability />} />
          <Route path="/device-monitor" element={<DeviceMonitor />} />
          <Route path="/alert-info" element={<AlertInfo />} />
          <Route path="/indicators" element={<Indicators />} />
          <Route path="/announcement" element={<Announcement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/approvals" element={<Approvals />} />
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
