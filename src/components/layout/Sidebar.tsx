import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sprout, ClipboardList, Package, Eye,
  Warehouse, BarChart3, CheckSquare, Bell, Menu, X,
  Users, MapPin, Target, ScrollText,
  Wifi, Thermometer, Activity, AlertTriangle, Gauge, FileText, Hash,
  ChevronLeft, ChevronRight, ClipboardCheck, ShoppingCart, FileCode,
  Calendar, CalendarDays, CalendarCheck, CalendarRange, BookMarked, Truck, Tags, Box, ArrowLeftRight, Archive, Megaphone, MoreHorizontal, Map, Send,
  Banknote, UserPlus, Award, TrendingUp, AlertCircle, Clock, Sparkles, Calculator, FileSignature,
  Briefcase, GraduationCap, Clipboard, Play, Bot,
  Leaf, Flower2, Trees, CheckCircle
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { icon: Sprout, label: '计划管理', path: '/production', category: 'production' },
  { icon: Leaf, label: '作物管理', path: '/crop/seed-source', category: 'crop' },
  { icon: ClipboardList, label: '农事管理', path: '/agriculture-record', category: 'farm' },
  { icon: Package, label: '库存管理', path: '/materials', category: 'materials' },
  { icon: Users, label: '人工管理', path: '/labor/task-center', category: 'labor' },
  { icon: BarChart3, label: '生产汇总表', path: '/reports', category: 'summary' },
  { icon: CheckSquare, label: '审批中心', path: '/approvals', category: 'workflow' },
];

const productionSubItems = [
  { icon: ClipboardList, label: '订单管理', path: '/crop/order' },
  { icon: FileText, label: '生产计划', path: '/production' },
  { icon: FileCode, label: '技术方案', path: '/tech-solution' },
  { icon: ShoppingCart, label: '采购计划', path: '/purchase-plan' },
];

// 作物管理子菜单
const cropSubItems = [
  { icon: Sprout, label: '种源管理', path: '/crop/seed-source' },
  { icon: Flower2, label: '育苗管理', path: '/crop/seedling' },
  { icon: Trees, label: '种植管理', path: '/crop/planting' },
  { icon: CheckCircle, label: '采收入库', path: '/crop/harvest' },
  { icon: Box, label: '作物库存', path: '/crop-inventory' },
  { icon: Eye, label: '实例追溯', path: '/crop/instance' },
];

// 人工管理4大模块（离职申请、招聘申请、工资预算已整合到人事管理）
const laborSubItems = [
  { icon: Users, label: '考勤管理', path: '/labor/attendance' },
  { icon: UserPlus, label: '人事管理', path: '/labor/personnel' },
  { icon: Banknote, label: '薪酬管理', path: '/labor/compensation' },
  { icon: TrendingUp, label: '运营分析', path: '/labor/analytics' },
];

// 生产汇总表（问题分派、每日工单汇总已移出到农事管理）
const summarySubItems = [
  { icon: AlertTriangle, label: '每日问题汇总表', path: '/daily-problem-summary' },
  { icon: FileText, label: '生产计划汇总表', path: '/plan-summary' },
  { icon: BarChart3, label: '生产报表', path: '/reports' },
];

const approvalSubItems = [
  { icon: CheckSquare, label: '审批中心', path: '/approvals' },
  { icon: Package, label: '物料审批', path: '/material-approval' },
  { icon: Sprout, label: '生产审批', path: '/production-approval' },
  { icon: ClipboardCheck, label: '农事审批', path: '/farm-approval' },
  { icon: BarChart3, label: '指标预算审批', path: '/indicator-budget-approval' },
  { icon: FileText, label: '我的申请', path: '/my-applications' },
  { icon: Users, label: '人事审批', path: '/hr-approval' },
];

// 库存管理子菜单（仓库物料拆分为库存总览和物料入库，采收入库已迁移到作物管理）
const materialsSubItems = [
  { icon: Archive, label: '库存总览', path: '/warehouse-overview' },
  { icon: Warehouse, label: '物料入库', path: '/warehouse-inbound' },
  { icon: Package, label: '产品库存', path: '/produce-inventory' },
  { icon: Truck, label: '供应商管理', path: '/supplier-management' },
  { icon: ClipboardList, label: '生产领料', path: '/material-receiving' },
  { icon: ArrowLeftRight, label: '生产退料', path: '/material-return' },
];

// 农事管理子菜单（扩充：任务中心、问题分派、每日工单汇总从其他模块移入，采收入库移出到库存管理）
// 注意：农事任务派发、巡查记录、问题分派已统一到农事任务中心，临时任务派发保留独立入口
const farmSubItems = [
  { icon: BarChart3, label: '农事任务中心', path: '/farm-hub' },
  { icon: ClipboardList, label: '任务中心', path: '/task-center' },
  { icon: Calendar, label: '每日工单汇总', path: '/daily-work-summary' },
];


export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const [cropExpanded, setCropExpanded] = useState(true);
  const [productionExpanded, setProductionExpanded] = useState(true);
  const [materialsExpanded, setMaterialsExpanded] = useState(true);
  const [laborExpanded, setLaborExpanded] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [approvalExpanded, setApprovalExpanded] = useState(true);
  const [farmExpanded, setFarmExpanded] = useState(true);

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

            {/* 指标数据 */}
            <li>
              <Link
                to="/indicators"
                onClick={onClose}
                className={`
                  flex items-center rounded-lg transition-all duration-200
                  ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                  ${isActive('/indicators')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Target className="flex-shrink-0 w-5 h-5" />
                {!collapsed && (
                  <span className="text-sm font-medium">指标数据</span>
                )}
              </Link>
            </li>

            {/* 公告发布 */}
            <li>
              <Link
                to="/announcement"
                onClick={onClose}
                className={`
                  flex items-center rounded-lg transition-all duration-200
                  ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                  ${isActive('/announcement')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Megaphone className="flex-shrink-0 w-5 h-5" />
                {!collapsed && (
                  <span className="text-sm font-medium">公告发布</span>
                )}
              </Link>
            </li>

            {menuItems.map((item) => (
              <li key={item.path}>
                {item.label === '作物管理' ? (
                  <>
                    <button
                      onClick={() => setCropExpanded(!cropExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path) || cropSubItems.some(sub => isActive(sub.path))
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${cropExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {cropExpanded && !collapsed && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {cropSubItems.map((subItem) => (
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
                ) : item.label === '库存管理' ? (
                  <>
                    <button
                      onClick={() => setMaterialsExpanded(!materialsExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path) || materialsSubItems.some(sub => isActive(sub.path))
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
                      onClick={() => setLaborExpanded(!laborExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive('/labor/')
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <Users className={`flex-shrink-0 w-5 h-5 ${isActive('/labor/') ? 'text-blue-700' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          <ChevronRight className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${laborExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {laborExpanded && !collapsed && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {laborSubItems.map((subItem) => (
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
                ) : item.label === '生产汇总表' ? (
                  <>
                    <button
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path) || summarySubItems.some(sub => isActive(sub.path))
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
                ) : item.label === '计划管理' ? (
                  <>
                    <button
                      onClick={() => setProductionExpanded(!productionExpanded)}
                      className={`
                        flex items-center rounded-lg transition-all duration-200 w-full
                        ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
                        ${isActive(item.path) || productionSubItems.some(sub => isActive(sub.path))
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
                        ${isActive(item.path) || farmSubItems.some(sub => isActive(sub.path))
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
                        ${isActive(item.path) || approvalSubItems.some(sub => isActive(sub.path))
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
