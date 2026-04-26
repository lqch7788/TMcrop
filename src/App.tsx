import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ApprovalProvider } from './contexts/ApprovalContext';
import { ToastProvider } from './contexts/ToastContext';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Production from './pages/Production';
import Tasks from './pages/Tasks';
import Materials from './pages/Materials';
import Inspection from './pages/Inspection';
import EnvironmentMonitor from './pages/EnvironmentMonitor';
import Harvest from './pages/Harvest';
import ProduceInventory from './pages/ProduceInventory';
import ProduceCodeRule from './pages/ProduceCodeRule';
import Reports from './pages/Reports';
import Approvals from './pages/Approvals';
import MaterialApproval from './pages/MaterialApproval';
import ProductionApproval from './pages/ProductionApproval';
import ApprovalDemo from './pages/ApprovalDemo';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import SystemConfig from './pages/SystemConfig';
import DictionaryManagement from './pages/DictionaryManagement';
import UserPermission from './pages/UserPermission';
import ApprovalWorkflowConfig from './pages/ApprovalWorkflowConfig';
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
import IoTMonitor from './pages/IoTMonitor';
import EnvControl from './pages/EnvControl';
import AgricultureRecord from './pages/AgricultureRecord';
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
import ProblemDispatch from './pages/ProblemDispatch';
import SupplierManagement from './pages/SupplierManagement';
import SupplierCodeRule from './pages/SupplierCodeRule';
import MaterialCategory from './pages/MaterialCategory';
import MaterialReceiving from './pages/MaterialReceiving';
import MaterialReturn from './pages/MaterialReturn';
import WarehouseMaterials from './pages/WarehouseMaterials';
import WarehouseOverviewPage from './pages/warehouse/WarehouseOverviewPage';
import WarehouseInboundPage from './pages/warehouse/WarehouseInboundPage';
import PendingApproval from './pages/PendingApproval';
import Approved from './pages/Approved';
import MyApproval from './pages/MyApproval';
import HrApproval from './pages/HrApproval';
import PlantingModeManagement from './pages/PlantingModeManagement';
import PlantAreaManagement from './pages/PlantAreaManagement';
import CropManagement from './pages/CropManagement';
import MaterialManagement from './pages/MaterialManagement';
import ProcessManagement from './pages/ProcessManagement';
import PersonnelManagement from './pages/PersonnelManagement';
import DepartmentSettings from './pages/DepartmentSettings';
import SettingsPersonnelStaff from './pages/SettingsPersonnelStaff';
import StaffManagement from './pages/StaffManagement';
import PositionManagement from './pages/PositionManagement';
import HrAttendance from './pages/HrAttendance';
import HrApprovalDocuments from './pages/HrApprovalDocuments';
import ParkArchive from './pages/ParkArchive';
import TaskDispatch from './pages/TaskDispatch';
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
import SmartDispatch from './pages/SmartDispatch';
import DailyPlanningPage from './pages/DailyPlanningPage';
import MonthlyPlanningPage from './pages/MonthlyPlanningPage';
import Piecework from './pages/Piecework';
import SalaryBudget from './pages/SalaryBudget';
import Onboarding from './pages/Onboarding';
import Contract from './pages/Contract';
import Team from './pages/Team';
import TempTask from './pages/TempTask';
import TaskCenterPage from './pages/farm/TaskCenterPage';
import FarmTaskHub from './pages/farm/FarmTaskHub';
import AttendancePage from './pages/labor/AttendancePage';
import PersonnelPage from './pages/labor/PersonnelPage';
import CompensationPage from './pages/labor/CompensationPage';
import AnalyticsPage from './pages/labor/AnalyticsPage';
import ResignationPage from './pages/labor/ResignationPage';
import RecruitmentPage from './pages/labor/RecruitmentPage';
import SalaryBudgetPage from './pages/labor/SalaryBudgetPage';
import HrApprovalDetail from './pages/hr/HrApprovalDetail';
import { DispatchPage } from './components/dispatch';

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
        <div className="max-w-6xl mx-auto pt-6">
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
            <Route path="notification" element={<NotificationSettings />} />
            <Route path="device" element={<DeviceManagement />} />
            <Route path="warehouse" element={<WarehouseManagement />} />
            <Route path="team" element={<TeamManagement />} />
            <Route path="cost-accounting" element={<CostAccounting />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="modes" element={<PlantingModeManagement />} />
            <Route path="regions" element={<PlantAreaManagement />} />
            <Route path="crops" element={<CropManagement />} />
            <Route path="materials" element={<MaterialManagement />} />
            <Route path="processes" element={<ProcessManagement />} />
            <Route path="departments" element={<DepartmentSettings />} />
            <Route path="bases" element={<BaseSettings />} />
            <Route path="branch" element={<BranchManagement />} />
            <Route path="block" element={<BlockManagement />} />
            <Route path="farm-activity" element={<FarmActivityManagement />} />
          </Route>
          <Route path="/settings/personnel" element={<PersonnelManagement />} />
          <Route path="/settings/personnel/staff" element={<SettingsPersonnelStaff />} />
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
      <Routes>
        <Route path="/park-archive" element={<ParkArchive />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/production" element={<Production />} />
        <Route path="/tech-solution" element={<TechSolution />} />
        <Route path="/purchase-plan" element={<PurchasePlan />} />

        {/* 人工管理聚合页面 */}
        <Route path="/labor/attendance" element={<AttendancePage />} />
        <Route path="/labor/personnel" element={<PersonnelPage />} />
        <Route path="/labor/compensation" element={<CompensationPage />} />
        <Route path="/labor/analytics" element={<AnalyticsPage />} />
        <Route path="/labor/resignation" element={<ResignationPage />} />
        <Route path="/labor/recruitment" element={<RecruitmentPage />} />
        <Route path="/labor/salary-budget" element={<SalaryBudgetPage />} />
        <Route path="/hr-approval-detail/:id" element={<HrApprovalDetail />} />

        {/* 农事管理 - 任务中心(从人工管理移入)、问题分派(从生产汇总表移入)、每日工单汇总(从生产汇总表移入) */}
        <Route path="/task-center" element={<TaskCenterPage />} />
        <Route path="/farm-hub" element={<FarmTaskHub />} />
        <Route path="/problem-dispatch" element={<ProblemDispatch />} />
        <Route path="/daily-work-summary" element={<DailyWorkSummary />} />
        <Route path="/daily-problem-summary" element={<DailyProblemSummary />} />
        <Route path="/plan-summary" element={<PlanSummary />} />
        <Route path="/worker-attendance" element={<WorkerAttendance />} />
        <Route path="/work-log" element={<WorkLog />} />
        <Route path="/monthly-report" element={<MonthlyReport />} />
        <Route path="/supplier-management" element={<SupplierManagement />} />
        <Route path="/material-category" element={<MaterialCategory />} />
        <Route path="/material-receiving" element={<MaterialReceiving />} />
        <Route path="/material-return" element={<MaterialReturn />} />
        <Route path="/warehouse-materials" element={<WarehouseMaterials />} />
        <Route path="/warehouse-overview" element={<WarehouseOverviewPage />} />
        <Route path="/warehouse-inbound" element={<WarehouseInboundPage />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/temp-task" element={<TempTask />} />
        <Route path="/personnel/staff" element={<StaffManagement />} />
        <Route path="/leave" element={<Leave />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/temp-worker" element={<TempWorker />} />
        <Route path="/team" element={<Team />} />
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
        <Route path="/inspection" element={<Inspection />} />
        <Route path="/environment-monitor" element={<EnvironmentMonitor />} />
        <Route path="/harvest" element={<Harvest />} />
        <Route path="/produce-inventory" element={<ProduceInventory />} />
        <Route path="/produce-code-rule" element={<ProduceCodeRule />} />
        <Route path="/iot-monitor" element={<IoTMonitor />} />
        <Route path="/env-control" element={<EnvControl />} />
        <Route path="/agriculture-record" element={<AgricultureRecord />} />
        <Route path="/dispatch" element={<DispatchPage />} />
        <Route path="/task-dispatch" element={<TaskDispatch />} />
        <Route path="/traceability" element={<Traceability />} />
        <Route path="/device-monitor" element={<DeviceMonitor />} />
        <Route path="/alert-info" element={<AlertInfo />} />
        <Route path="/indicators" element={<Indicators />} />
        <Route path="/announcement" element={<Announcement />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/approval-demo" element={<ApprovalDemo />} />
        <Route path="/material-approval" element={<MaterialApproval />} />
        <Route path="/production-approval" element={<ProductionApproval />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/approved" element={<Approved />} />
        <Route path="/my-approval" element={<MyApproval />} />
        <Route path="/hr-approval" element={<HrApproval />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/code-rule" element={<CodeRule />} />
        <Route path="/supplier-code-rule" element={<SupplierCodeRule />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ApprovalProvider>
          <AppContent />
        </ApprovalProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
