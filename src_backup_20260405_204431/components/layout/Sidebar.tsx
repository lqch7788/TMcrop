import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sprout, ClipboardList, Package, Eye,
  Warehouse, BarChart3, CheckSquare, Bell, Settings, Menu, X,
  Users, MapPin, Target, ScrollText,
  Wifi, Thermometer, Activity, Search, AlertTriangle, Gauge, FileText, Hash,
  ChevronLeft, ChevronRight, ClipboardCheck, ShoppingCart, FileCode,
  Calendar, BookMarked, Truck, Tags, Box, ArrowLeftRight, Archive, Megaphone, MoreHorizontal, Map, Send,
  ListTodo, PersonStanding, Users as UsersIcon, Banknote, BarChart, Clock, CalendarDays,
  FileSignature, Award, TrendingUp, AlertCircle, Calculator, UserPlus, Briefcase, GraduationCap,
  Send as SendIcon, Eye as EyeIcon, Warehouse as HarvestIcon, ClipboardList as FarmRecordIcon,
  DollarSign, Coins, CreditCard, UserCheck, ScrollText as ContractIcon
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { icon: Sprout, label: '生产计划', path: '/production', category: 'production' },
  { icon: ClipboardList, label: '农事管理', path: '/agriculture-record', category: 'farm' },
  { icon: Package, label: '库存管理', path: '/materials', category: 'materials' },
  { icon: Users, label: '人工管理', path: '/tasks', category: 'labor' },
  { icon: BarChart3, label: '生产汇总表', path: '/reports', category: 'summary' },
  { icon: CheckSquare, label: '审批中心', path: '/approvals', category: 'workflow' },
  { icon: Bell, label: '消息中心', path: '/messages', category: 'workflow' },
  { icon: Settings, label: '系统设置', path: '/settings', category: 'system' },
];

const productionSubItems = [
  { icon: FileText, label: '生产计划管理', path: '/production' },
  { icon: FileCode, label: '技术方案列表', path: '/tech-solution' },
  { icon: ShoppingCart, label: '采购计划列表', path: '/purchase-plan' },
];

// 人工管理5合1菜单
const laborTaskCenter = [  // 任务中心
  { icon: SendIcon, label: '农事任务派发', path: '/task-dispatch' },
  { icon: EyeIcon, label: '巡田任务', path: '/inspection' },
  { icon: HarvestIcon, label: '采收任务', path: '/harvest' },
  { icon: ListTodo, label: '临时任务', path: '/tasks' },
  { icon: ClipboardCheck, label: '任务执行', path: '/tasks' },
  { icon: BookMarked, label: '工作日志', path: '/work-log' },
  { icon: TrendingUp, label: '智能派工', path: '/smart-dispatch' },
];

const laborAttendance = [  // 考勤管理
  { icon: UsersIcon, label: '工人考勤', path: '/worker-attendance' },
  { icon: CalendarDays, label: '排班调度', path: '/schedule' },
  { icon: Clock, label: '请假管理', path: '/leave' },
  { icon: AlertCircle, label: '加班管理', path: '/overtime' },
];

const laborPersonnel = [  // 人事管理
  { icon: UserCheck, label: '员工信息', path: '/personnel-management' },
  { icon: UserPlus, label: '临时工入职', path: '/temp-worker' },
  { icon: Briefcase, label: '招聘管理', path: '/recruitment' },
  { icon: GraduationCap, label: '入职办理', path: '/onboarding' },
  { icon: Users, label: '班组分配', path: '/team' },
  { icon: ContractIcon, label: '合同管理', path: '/contract' },
  { icon: Award, label: '技能档案', path: '/skill' },
  { icon: GraduationCap, label: '培训管理', path: '/personnel-management' },
];

const laborCompensation = [  // 薪酬管理
  { icon: DollarSign, label: '工资管理', path: '/salary' },
  { icon: Coins, label: '计件工资', path: '/piecework' },
  { icon: CreditCard, label: '工资预算', path: '/salary-budget' },
];

const laborAnalytics = [  // 运营分析
  { icon: TrendingUp, label: '人效分析', path: '/efficiency' },
  { icon: Award, label: '绩效考核', path: '/performance' },
  { icon: AlertTriangle, label: '劳动风险预警', path: '/risk' },
  { icon: BarChart, label: '工作月报', path: '/monthly-report' },
];

const summarySubItems = [
  { icon: Calendar, label: '每日工单汇总表', path: '/daily-work-summary' },
  { icon: AlertTriangle, label: '每日问题汇总表', path: '/daily-problem-summary' },
  { icon: FileText, label: '生产计划汇总表', path: '/plan-summary' },
  { icon: BarChart3, label: '生产报表', path: '/reports' },
];

const approvalSubItems = [
  { icon: CheckSquare, label: '审批中心', path: '/approvals' },
  { icon: ClipboardCheck, label: '待办审批', path: '/pending-approval' },
  { icon: FileText, label: '已办审批', path: '/approved' },
  { icon: Calendar, label: '我提交的审批', path: '/my-approval' },
  { icon: Users, label: 'HR审批单', path: '/hr-approval' },
];

const materialsSubItems = [
  { icon: Archive, label: '仓库物料', path: '/warehouse-materials' },
  { icon: Truck, label: '供应商管理', path: '/supplier-management' },
  { icon: ClipboardList, label: '生产领料', path: '/material-receiving' },
  { icon: ArrowLeftRight, label: '生产退料', path: '/material-return' },
];

const farmSubItems = [
  { icon: Send, label: '农事任务派发', path: '/task-dispatch' },
  { icon: Eye, label: '巡田监测', path: '/inspection' },
  { icon: Warehouse, label: '采收入库', path: '/harvest' },
  { icon: Activity, label: '农事操作记录', path: '/agriculture-record' },
];

const indicatorsSubItems = [
  { icon: Target, label: '指标列表', path: '/indicators' },
  { icon: Megaphone, label: '公告发布', path: '/announcement' },
];

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const [productionExpanded, setProductionExpanded] = useState(true);
  const [laborTaskExpanded, setLaborTaskExpanded] = useState(true);
  const [laborAttendanceExpanded, setLaborAttendanceExpanded] = useState(true);
  const [laborPersonnelExpanded, setLaborPersonnelExpanded] = useState(true);
  const [laborCompensationExpanded, setLaborCompensationExpanded] = useState(true);
  const [laborAnalyticsExpanded, setLaborAnalyticsExpanded] = useState(true);
  const [materialsExpanded, setMaterialsExpanded] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [approvalExpanded, setApprovalExpanded] = useState(true);
  const [farmExpanded, setFarmExpanded] = useState(true);
  const [indicatorsExpanded, setIndicatorsExpanded] = useState(true);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-12 left-0 z-40 h-[calc(100vh-3rem)] bg-[#F2F6FA] text-gray-900 transition-all duration-300 ease-in-out border-r border-gray-200 flex flex-col
          ${collapsed ? 'w-16' : 'w-52'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* 折叠/展开按钮 */}
        <div className="flex items-center px-3 py-2 border-b border-gray-100 relative">
          {!collapsed && (
            <span className="text-base font-semibold text-gray-900 pl-7">种植管理系统</span>
          )}
          <button
            onClick={onToggleCollapse}
            className="absolute right-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={collapsed ? '展开菜单' : '收起菜单'}
          >
            {collapsed ? (
              <ChevronRight className="w-6 h-6 text-emerald-600 font-extrabold" />
            ) : (
              <ChevronLeft className="w-6 h-6 text-emerald-600 font-extrabold" />
            )}
          </button>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <ul className={`space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
            {/* 园区导览 */}
            <li>
              <Link
                to="/park-archive"
                onClick={onClose}
                className={`
                  flex items-center rounded-lg transition-all duration-200
                  ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                  ${isActive('/park-archive')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Map className="flex-shrink-0 w-5 h-5" />
                {!collapsed && (
                  <span className="text-sm font-medium">园区导览</span>
                )}
              </Link>
            </li>

            {/* 基地总览 */}
            <li>
              <Link
                to="/dashboard"
                onClick={onClose}
                className={`
                  flex items-center rounded-lg transition-all duration-200
                  ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                  ${isActive('/dashboard')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <LayoutDashboard className="flex-shrink-0 w-5 h-5" />
                {!collapsed && (
                  <span className="text-sm font-medium">基地总览</span>
                )}
              </Link>
            </li>

            {/* 管理指标 - 可展开菜单 */}
            <li>
              <>
                <button
                  onClick={() => setIndicatorsExpanded(!indicatorsExpanded)}
                  className={`
                    flex items-center rounded-lg transition-all duration-200 w-full
                    ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                    ${isActive('/indicators') || isActive('/announcement')
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Target className="flex-shrink-0 w-5 h-5" />
                  {!collapsed && (
                    <>
                      <span className="text-sm font-medium">管理指标</span>
                      <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${indicatorsExpanded ? 'rotate-90' : ''}`} />
                    </>
                  )}
                </button>
                {indicatorsExpanded && !collapsed && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {indicatorsSubItems.map((subItem) => (
                      <li key={subItem.path}>
                        <Link
                          to={subItem.path}
                          onClick={onClose}
                          className={`
                            flex items-center rounded-lg transition-all duration-200 gap-3 px-3 py-2
                            ${isActive(subItem.path)
                              ? 'bg-blue-100 text-blue-700 font-semibold'
                              : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                            }
                          `}
                        >
                          <subItem.icon className="flex-shrink-0 w-4 h-4" />
                          <span className="text-sm">{subItem.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            </li>

            {menuItems.map((item) => (
              <li key={item.path}>
                {item.label === '库存管理' ? (
                  <>
                    <button
                      onClick={() => setMaterialsExpanded(!materialsExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path)
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${materialsExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {materialsExpanded && !collapsed && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {materialsSubItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              onClick={onClose}
                              className={`
                                flex items-center rounded-lg transition-all duration-200 gap-3 px-3 py-2
                                ${isActive(subItem.path)
                                  ? 'bg-blue-100 text-blue-700 font-semibold'
                                  : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                                }
                              `}
                            >
                              <subItem.icon className={`flex-shrink-0 w-4 h-4 ${isActive(subItem.path) ? 'text-blue-700' : 'text-gray-400'}`} />
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : item.label === '人工管理' ? (
                  <>
                    <button
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path)
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                        </>
                      )}
                    </button>
                    {!collapsed && (
                      <div className="ml-4 space-y-3 mt-2">
                        {/* 任务中心 */}
                        <div>
                          <button
                            onClick={() => setLaborTaskExpanded(!laborTaskExpanded)}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 w-full"
                          >
                            <ListTodo className="w-3.5 h-3.5" />
                            <span>任务中心</span>
                            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${laborTaskExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          {laborTaskExpanded && (
                            <ul className="mt-1 ml-2 space-y-0.5">
                              {laborTaskCenter.map((subItem) => (
                                <li key={subItem.path + subItem.label}>
                                  <Link
                                    to={subItem.path}
                                    onClick={onClose}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive(subItem.path) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                  >
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.label}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* 考勤管理 */}
                        <div>
                          <button
                            onClick={() => setLaborAttendanceExpanded(!laborAttendanceExpanded)}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 w-full"
                          >
                            <PersonStanding className="w-3.5 h-3.5" />
                            <span>考勤管理</span>
                            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${laborAttendanceExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          {laborAttendanceExpanded && (
                            <ul className="mt-1 ml-2 space-y-0.5">
                              {laborAttendance.map((subItem) => (
                                <li key={subItem.path + subItem.label}>
                                  <Link
                                    to={subItem.path}
                                    onClick={onClose}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive(subItem.path) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                  >
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.label}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* 人事管理 */}
                        <div>
                          <button
                            onClick={() => setLaborPersonnelExpanded(!laborPersonnelExpanded)}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 w-full"
                          >
                            <UsersIcon className="w-3.5 h-3.5" />
                            <span>人事管理</span>
                            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${laborPersonnelExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          {laborPersonnelExpanded && (
                            <ul className="mt-1 ml-2 space-y-0.5">
                              {laborPersonnel.map((subItem) => (
                                <li key={subItem.path + subItem.label}>
                                  <Link
                                    to={subItem.path}
                                    onClick={onClose}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive(subItem.path) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                  >
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.label}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* 薪酬管理 */}
                        <div>
                          <button
                            onClick={() => setLaborCompensationExpanded(!laborCompensationExpanded)}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 w-full"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>薪酬管理</span>
                            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${laborCompensationExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          {laborCompensationExpanded && (
                            <ul className="mt-1 ml-2 space-y-0.5">
                              {laborCompensation.map((subItem) => (
                                <li key={subItem.path + subItem.label}>
                                  <Link
                                    to={subItem.path}
                                    onClick={onClose}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive(subItem.path) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                  >
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.label}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* 运营分析 */}
                        <div>
                          <button
                            onClick={() => setLaborAnalyticsExpanded(!laborAnalyticsExpanded)}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 w-full"
                          >
                            <BarChart className="w-3.5 h-3.5" />
                            <span>运营分析</span>
                            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${laborAnalyticsExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          {laborAnalyticsExpanded && (
                            <ul className="mt-1 ml-2 space-y-0.5">
                              {laborAnalytics.map((subItem) => (
                                <li key={subItem.path + subItem.label}>
                                  <Link
                                    to={subItem.path}
                                    onClick={onClose}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive(subItem.path) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                  >
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.label}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : item.label === '生产汇总表' ? (
                  <>
                    <button
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path)
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${summaryExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {summaryExpanded && !collapsed && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {summarySubItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              onClick={onClose}
                              className={`
                                flex items-center rounded-lg transition-all duration-200 gap-3 px-3 py-2
                                ${isActive(subItem.path)
                                  ? 'bg-blue-100 text-blue-700 font-semibold'
                                  : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                                }
                              `}
                            >
                              <subItem.icon className={`flex-shrink-0 w-4 h-4 ${isActive(subItem.path) ? 'text-blue-700' : 'text-gray-400'}`} />
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : item.label === '生产计划' ? (
                  <>
                    <button
                      onClick={() => setProductionExpanded(!productionExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path)
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${productionExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {productionExpanded && !collapsed && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {productionSubItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              onClick={onClose}
                              className={`
                                flex items-center rounded-lg transition-all duration-200 gap-3 px-3 py-2
                                ${isActive(subItem.path)
                                  ? 'bg-blue-100 text-blue-700 font-semibold'
                                  : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                                }
                              `}
                            >
                              <subItem.icon className={`flex-shrink-0 w-4 h-4 ${isActive(subItem.path) ? 'text-blue-700' : 'text-gray-400'}`} />
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : item.label === '农事管理' ? (
                  <>
                    <button
                      onClick={() => setFarmExpanded(!farmExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path)
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${farmExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {farmExpanded && !collapsed && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {farmSubItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              onClick={onClose}
                              className={`
                                flex items-center rounded-lg transition-all duration-200 gap-3 px-3 py-2
                                ${isActive(subItem.path)
                                  ? 'bg-blue-100 text-blue-700 font-semibold'
                                  : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                                }
                              `}
                            >
                              <subItem.icon className={`flex-shrink-0 w-4 h-4 ${isActive(subItem.path) ? 'text-blue-700' : 'text-gray-400'}`} />
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : item.label === '审批中心' ? (
                  <>
                    <button
                      onClick={() => setApprovalExpanded(!approvalExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path)
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${approvalExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {approvalExpanded && !collapsed && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {approvalSubItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              onClick={onClose}
                              className={`
                                flex items-center rounded-lg transition-all duration-200 gap-3 px-3 py-2
                                ${isActive(subItem.path)
                                  ? 'bg-blue-100 text-blue-700 font-semibold'
                                  : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                                }
                              `}
                            >
                              <subItem.icon className={`flex-shrink-0 w-4 h-4 ${isActive(subItem.path) ? 'text-blue-700' : 'text-gray-400'}`} />
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`
                      flex items-center rounded-lg transition-all duration-200
                      ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                      ${isActive(item.path)
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className={`flex-shrink-0 ${collapsed ? 'w-5 h-5' : 'w-5 h-5'} ${isActive(item.path) ? 'text-blue-700' : 'text-gray-900'}`} />
                    {!collapsed && <span className={`text-sm font-medium ${isActive(item.path) ? 'text-blue-700' : 'text-gray-900'}`}>{item.label}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
