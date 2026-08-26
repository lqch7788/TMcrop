import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, ChevronRight,
  Calculator, DollarSign, CreditCard, PieChart, BarChart, FileText
} from 'lucide-react';

/**
 * 经营核算系统左侧菜单
 * - 菜单结构：首页概览 + 经营核算组（5 子项，从 V1.3 复制）
 * - 视觉样式：与 V1.1 主 Sidebar 100% 一致
 * - path：保留 V1.3 路径 /manage/*
 */
interface ManagementSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const ManagementSidebar = ({ collapsed, onToggle }: ManagementSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['management']);

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    {
      key: 'home',
      icon: Home,
      label: '首页概览',
      path: '/',
      single: true
    },
    {
      key: 'management',
      icon: Calculator,
      label: '经营核算',
      children: [
        { key: 'cost-accounting', icon: DollarSign, label: '成本核算', path: '/manage/cost' },
        { key: 'income-management', icon: CreditCard, label: '收入管理', path: '/manage/income' },
        { key: 'financial-analysis', icon: PieChart, label: '财务分析', path: '/manage/financial' },
        { key: 'input-output', icon: BarChart, label: '投入产出分析', path: '/manage/input-output' },
        { key: 'business-report', icon: FileText, label: '经营报表', path: '/manage/report' },
      ]
    },
  ];

  const renderMenuItem = (item: any, level = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.key);
    const active = item.single
      ? isActive(item.path)
      : (item.children?.some((child: any) => isActive(child.path)) || false);

    if (collapsed && level > 0) return null;

    const baseItemClass = `
      flex items-center rounded-lg transition-all duration-200 w-full
      ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
      ${active
        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] font-semibold'
        : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
      }
    `;

    const onItemClick = () => {
      if (hasChildren) {
        toggleMenu(item.key);
      } else if (item.path) {
        navigate(item.path);
      }
    };

    return (
      <div key={item.key}>
        <button
          type="button"
          onClick={onItemClick}
          className={baseItemClass}
          title={collapsed ? item.label : undefined}
        >
          <Icon className={`flex-shrink-0 w-5 h-5 ${active ? 'text-[var(--sidebar-active-text)]' : 'text-gray-500'}`} />
          {!collapsed && (
            <>
              <span className="text-sm font-medium">{item.label}</span>
              {hasChildren && (
                <ChevronRight
                  className={`w-4 h-4 ml-auto transition-transform text-gray-400 ${isExpanded ? 'rotate-90' : ''}`}
                />
              )}
            </>
          )}
        </button>

        {hasChildren && isExpanded && !collapsed && (
          <ul className="mt-1 ml-4 space-y-1">
            {item.children.map((child: any) => {
              const ChildIcon = child.icon;
              const childActive = isActive(child.path);
              return (
                <li key={child.key}>
                  <button
                    type="button"
                    onClick={() => child.path && navigate(child.path)}
                    className={`
                      w-full flex items-center rounded-lg transition-all duration-200 gap-3 px-3 py-2 text-left
                      ${childActive
                        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] font-semibold'
                        : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <ChildIcon className={`flex-shrink-0 w-4 h-4 ${childActive ? 'text-[var(--sidebar-active-text)]' : 'text-gray-400'}`} />
                    <span className="text-sm">{child.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        fixed top-12 left-0 z-40 h-[calc(100vh-3rem)] bg-[var(--sidebar-bg)] text-gray-900 transition-all duration-300 ease-in-out border-r border-gray-200 flex flex-col
        ${collapsed ? 'w-16' : 'w-52'}
      `}
    >
      <div className="flex items-center px-3 py-2 border-b border-gray-100 relative">
        {!collapsed && (
          <span className="text-base font-semibold text-gray-900 pl-7">经营核算系统</span>
        )}
        <button
          onClick={onToggle}
          className="absolute right-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title={collapsed ? '展开菜单' : '收起菜单'}
        >
          <ChevronRight className={`w-6 h-6 text-emerald-600 font-extrabold transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <ul className={`space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {menuItems.map(item => (
            <li key={item.key}>{renderMenuItem(item)}</li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default ManagementSidebar;