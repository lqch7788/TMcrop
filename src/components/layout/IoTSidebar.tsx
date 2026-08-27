import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, ChevronRight,
  Wifi, Video, Cloud, Battery,
  History, Gauge, AlertTriangle, Cog
} from 'lucide-react';

/**
 * 智能环境监测系统左侧菜单
 * - 菜单结构/数据：保留 IoT 3 大组（首页概览 / 环境监测 / 视频监控）
 * - 已删除：环控策略管理（与智能控制系统重复）、环境监控组（环境监控中心与环境监测重复）、
 *   物联网监控中心（环境监测的劣化 mock 子集）、土壤水质（环境监测已有土壤列）、
 *   气象监测（环境监测已有气象卡片）
 * - 视觉样式：与 V1.1 主 Sidebar（种植管理系统入口）100% 一致（CSS 变量、active、hover、宽度、间距）
 * - path 字段：适配 V1.1 现有路由
 */
interface IoTSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const IoTSidebar = ({ collapsed, onToggle }: IoTSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  // 默认全部展开，与 V1.1 主 Sidebar 的"全部展开"默认行为一致
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['iot', 'video']);

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isActive = (path: string) => location.pathname === path;

  // path 适配 V1.1 现有路由
  const menuItems = [
    {
      key: 'home',
      icon: Home,
      label: '首页概览',
      path: '/',
      single: true
    },
    {
      key: 'iot',
      icon: Wifi,
      label: '环境监测',
      children: [
        { key: 'env-monitoring', icon: Cloud, label: '环境监测总览', path: '/environment-monitor' },
        { key: 'device-monitor', icon: Gauge, label: '设备监控中心', path: '/device-monitor' },
        { key: 'alert-info', icon: AlertTriangle, label: '预警信息中心', path: '/alert-info' },
        { key: 'energy-monitoring', icon: Battery, label: '能耗监测', path: '/iot/energy' },
        { key: 'history-data', icon: History, label: '历史数据', path: '/iot/history' },
        { key: 'monitoring-config', icon: Cog, label: '监测配置', path: '/iot/config' },
      ]
    },
    {
      key: 'video',
      icon: Video,
      label: '视频监控',
      children: [
        { key: 'video-monitor', icon: Video, label: '视频监控中心', path: '/video/monitor' },
      ]
    },
  ];

  // 与 V1.1 主 Sidebar 视觉一致的菜单项渲染（嵌套层级）
  const renderMenuItem = (item: any, level = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.key);
    const active = item.single
      ? isActive(item.path)
      : (item.children?.some((child: any) => isActive(child.path)) || false);

    // 折叠态下：只显示顶级图标（与 V1.1 主 Sidebar 行为一致：子项不可见）
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

        {/* 子项展开：缩进 ml-4，与 V1.1 主 Sidebar 一致 */}
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
      {/* 顶部：标题 + 折叠按钮（与 V1.1 主 Sidebar 完全一致布局） */}
      <div className="flex items-center px-3 py-2 border-b border-gray-100 relative">
        {!collapsed && (
          <span className="text-base font-semibold text-gray-900 pl-7">智能环境监测系统</span>
        )}
        <button
          onClick={onToggle}
          className="absolute right-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title={collapsed ? '展开菜单' : '收起菜单'}
        >
          <ChevronRight className={`w-6 h-6 text-emerald-600 font-extrabold transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* 菜单区域 */}
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

export default IoTSidebar;
