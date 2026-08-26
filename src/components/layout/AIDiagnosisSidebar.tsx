import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, ChevronRight,
  Bot, AlertTriangle, TrendingUp, BookOpen, Target, MessageSquare, Database
} from 'lucide-react';

/**
 * AI诊断系统左侧菜单
 * - 菜单结构：首页概览 + AI诊断组（6 子项，从 V1.3 复制）
 * - 视觉样式：与 V1.1 主 Sidebar 100% 一致
 * - path：保留 V1.3 路径 /ai/*
 */
interface AIDiagnosisSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AIDiagnosisSidebar = ({ collapsed, onToggle }: AIDiagnosisSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['aiDiagnosis']);

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
      key: 'aiDiagnosis',
      icon: Bot,
      label: 'AI诊断',
      children: [
        { key: 'pest-detection', icon: AlertTriangle, label: '病虫害识别', path: '/ai/pest' },
        { key: 'growth-analysis', icon: TrendingUp, label: '长势分析', path: '/ai/growth' },
        { key: 'expert-system', icon: BookOpen, label: '专家系统', path: '/ai/expert' },
        { key: 'prevention-recommend', icon: Target, label: '防治推荐', path: '/ai/prevention' },
        { key: 'online-consult', icon: MessageSquare, label: '在线咨询', path: '/ai/consult' },
        { key: 'knowledge-base', icon: Database, label: '知识库', path: '/ai/knowledge' },
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
          <span className="text-base font-semibold text-gray-900 pl-7">AI诊断系统</span>
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

export default AIDiagnosisSidebar;