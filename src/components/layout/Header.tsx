import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, LogOut, User, Settings, Home, RefreshCw, ClipboardList, ListTodo
} from 'lucide-react';
import { useAnnouncementStore } from '../../stores/useAnnouncementStore';
import { useAuthStore } from '../../stores';
// 2026-10-25：当前基地切换器（数据行级隔离）
import { useCurrentBaseStore } from '../../stores/useCurrentBaseStore';
import { enhancedApiClient } from '../../lib/apiClient';
import { useSystemConfigValue } from '../../hooks/useSystemConfigValue';

const styles = `
  @keyframes bellRing {
    0%, 100% { color: #374151; }
    50% { color: #ef4444; }
  }
  .bell-ringing {
    animation: bellRing 1s ease-in-out infinite;
  }
`;

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isBellRinging, setIsBellRinging] = useState(false);

  // ★ V3.0 Phase 1: 系统名称从DB动态读取（兜底值保持原硬编码名称）
  const systemName = useSystemConfigValue('system.name', '弘讯智能种植云');

  // 从 Zustand Store 获取公告数据
  const announcements = useAnnouncementStore((s) => s.announcements);
  const fetchAnnouncements = useAnnouncementStore((s) => s.fetchAnnouncements);

  // 当前登录用户（2026-10-24：此前右上角硬编码「LQC / 陆启闯 / 经理·生产部」，
  //   任何账号登录都显示管理员名字，已改为读取 useAuthStore）
  const currentUser = useAuthStore((s) => s.currentUser);
  const userRoles = useAuthStore((s) => s.roles);

  // 2026-10-25：当前基地（顶部切换器）。切换后全局数据按该基地隔离
  const baseOid = useCurrentBaseStore((s) => s.baseOid);
  const baseName = useCurrentBaseStore((s) => s.baseName);
  const setBase = useCurrentBaseStore((s) => s.setBase);
  const baseOptions = useCurrentBaseStore((s) => s.options);
  const setBaseOptions = useCurrentBaseStore((s) => s.setOptions);
  // 基地列表加载状态：加载中/失败时下拉显示占位，避免出现空选项
  const [baseLoadState, setBaseLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  // 拉取可选基地列表 + 决定当前基地（仅登录后）
  //
  // 2026-10-25 变更：不再提供「全部基地」选项。各基地数据互相独立、不共用，
  //   必须始终有一个当前基地。决定顺序：
  //     1. localStorage 里记住的上次选择（仍然有效且在数据范围内）
  //     2. 后端默认基地（system_configs['system.default-base-oid']）
  //     3. 可见基地列表第一个
  //   列表本身按用户数据范围裁剪：非管理员看不到无权限的基地，
  //   避免手动切过去后看到空数据（看似系统坏了）。
  //   首次落到默认基地时会整页重载一次：首屏请求在基地确定前已发出（不带 X-Base-Oid），
  //   必须重载才能让所有模块用正确的基地过滤。之后 baseOid 已有效，不会再触发。
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const [basesRes, defaultRes] = await Promise.all([
          enhancedApiClient.get<Array<{ oid: string; name: string }>>('/basic-data/bases'),
          enhancedApiClient
            .get<{
              oid: string;
              name: string;
              source: string;
              restricted?: boolean;
              visibleBaseOids?: string[];
            }>('/basic-data/default-base')
            .catch(() => null),
        ]);
        if (cancelled) return;

        const list = Array.isArray(basesRes)
          ? basesRes
          : ((basesRes as { data?: unknown })?.data as Array<{ oid: string; name: string }>) || [];
        const allOpts = list.filter((b) => b?.oid && b?.name).map((b) => ({ oid: b.oid, name: b.name }));

        // 按数据范围裁剪（restricted=false 或接口失败时保持全部）
        const allowedOids =
          defaultRes?.restricted && Array.isArray(defaultRes.visibleBaseOids)
            ? new Set(defaultRes.visibleBaseOids)
            : null;
        const opts = allowedOids ? allOpts.filter((o) => allowedOids.has(o.oid)) : allOpts;
        setBaseOptions(opts);

        if (opts.length === 0) {
          // 要么系统里没有基地，要么当前账号一个基地都不可见
          setBaseLoadState('ready');
          return;
        }

        // 本地记住的基地仍然可用 → 保持用户上次的选择
        const remembered = useCurrentBaseStore.getState().baseOid;
        if (remembered && opts.some((o) => o.oid === remembered)) {
          setBaseLoadState('ready');
          return;
        }

        // 落到默认基地；默认基地接口失败时退回列表第一个
        const configured = defaultRes ? opts.find((o) => o.oid === defaultRes.oid) : undefined;
        const picked = configured ?? opts[0];
        setBase(picked.oid, picked.name);
        window.location.reload();
      } catch {
        // 拉取失败不阻断页面，下拉显示「基地加载失败」
        if (!cancelled) setBaseLoadState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser, setBase, setBaseOptions]);

  const displayName = currentUser?.realName || currentUser?.username || '未登录';
  const avatarText = (displayName.slice(0, 1) || '?').toUpperCase();
  // 角色名：按 admin > manager > user 优先级取最高，其余角色取第一个
  const roleLabel = (() => {
    if (userRoles.length === 0) return '普通用户';
    const priority = ['admin', 'manager', 'user'];
    const top = priority.map((p) => userRoles.find((r) => r.code === p)).find(Boolean);
    return top?.name || userRoles[0]?.name || '普通用户';
  })();

  // 组件挂载时获取公告
  useEffect(() => {
    if (announcements.length === 0) {
      fetchAnnouncements();
    }
  }, []);

  // 将API公告转为消息提醒格式（最新5条）
  const recentNotices = announcements.slice(0, 5).map(a => ({
    id: a.id,
    title: a.title,
    content: a.content || '',
    sendTime: a.create_time || a.date || '',
    type: a.type || 'notice',
    isRead: a.status === '已发布',
  }));

  const unreadCount = announcements.filter(a => a.status !== '已发布').length;

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setShowUserMenu(false);
    navigate('/');
  };

  // 闪烁效果控制
  useEffect(() => {
    if (unreadCount > 0) {
      setIsBellRinging(true);
    } else {
      setIsBellRinging(false);
    }
  }, [unreadCount]);

  return (
    <>
      <style>{styles}</style>
    <header className="sticky top-0 z-30 h-12 bg-[var(--header-bg)] border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-full pl-2">
        {/* Left section */}
        <div className="flex items-center">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/弘智耘LOGO.png"
              alt="弘智耘Logo"
              className="h-8 w-auto"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-gray-900">{systemName}</span>
              <span className="text-[10px] text-gray-500">Techmation Intelligent Crop Cloud</span>
            </div>
            {/* 返回主页图标 */}
            <button
              onClick={() => navigate('/')}
              className="ml-3 p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
              title="返回主页"
            >
              <Home className="w-5 h-5 text-emerald-600" />
            </button>
            {/* 当前基地 —— 2026-10-25：原为硬编码「宁波北仑基地 >>」纯文本，
                改为下拉选择器。切换后全局生效（所有列表按新基地过滤，
                新建记录自动归属该基地，见 useCurrentBaseStore + X-Base-Oid） */}
            <div className="relative ml-2 flex items-center gap-1">
              <select
                value={baseOid ?? ''}
                onChange={(e) => {
                  const oid = e.target.value || null;
                  if (!oid) return; // 没有「全部基地」选项，空值不处理
                  const opt = baseOptions.find((b) => b.oid === oid);
                  setBase(oid, opt?.name ?? null);
                  // 切换基地后重新加载页面数据。
                  //   用整页刷新最可靠：各页面数据散落在 80+ 个 store，
                  //   逐个接事件监听成本远高于一次 reload，且能避免"半个页面还是旧基地数据"。
                  window.location.reload();
                }}
                className="text-sm font-bold text-blue-600 bg-transparent border-none outline-none cursor-pointer hover:text-blue-800 max-w-[160px]"
                title="切换当前基地（影响所有模块的数据范围）"
              >
                {/* 列表未就绪时：显示上次记住的基地名，避免空白；无记录则显示占位 */}
                {baseOid && !baseOptions.some((b) => b.oid === baseOid) && (
                  <option value={baseOid}>{baseName || '当前基地'}</option>
                )}
                {!baseOid && baseLoadState !== 'ready' && (
                  <option value="">
                    {baseLoadState === 'loading' ? '加载中…' : '基地加载失败'}
                  </option>
                )}
                {/* 加载完成但一个可用基地都没有（系统无基地 / 当前账号无任何基地权限） */}
                {!baseOid && baseLoadState === 'ready' && baseOptions.length === 0 && (
                  <option value="">无可用基地</option>
                )}
                {baseOptions.map((b) => (
                  <option key={b.oid} value={b.oid}>{b.name}</option>
                ))}
              </select>
              <span className="text-sm font-bold text-blue-600 select-none">&gt;&gt;</span>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell className={`w-5 h-5 ${isBellRinging ? 'bell-ringing' : 'text-gray-600'}`} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">消息通知</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentNotices.map((msg) => (
                    <Link
                      key={msg.id}
                      to="/messages"
                      onClick={() => setShowNotifications(false)}
                      className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                        !msg.isRead ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                          msg.type === 'alert' ? 'bg-red-500' :
                          msg.type === 'approval' ? 'bg-blue-500' :
                          msg.type === 'task' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{msg.title}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{msg.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{msg.sendTime}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  to="/messages"
                  onClick={() => setShowNotifications(false)}
                  className="block px-4 py-3 text-center text-sm text-emerald-600 hover:bg-gray-50 font-medium"
                >
                  查看全部消息
                </Link>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                {avatarText}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">{displayName}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900">{displayName}</p>
                  <p className="text-sm text-gray-500">{roleLabel}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    个人中心
                  </Link>
                  <Link
                    to="/my-tasks"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ListTodo className="w-4 h-4" />
                    我的任务
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Bell className="w-4 h-4" />
                    消息中心
                  </Link>
                  <Link
                    to="/my-applications"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ClipboardList className="w-4 h-4" />
                    我的申请
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" />
                    系统设置
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
}

export default Header;
