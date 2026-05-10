import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, LogOut, User, Settings, Home, RefreshCw
} from 'lucide-react';
import { messages } from '../../data/mockData';

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

  const unreadCount = messages.filter(m => !m.isRead).length;

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
    <header className="sticky top-0 z-30 h-12 bg-[#F2F6FA] border-b border-gray-200 shadow-sm">
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
              <span className="text-base font-semibold text-gray-900">弘讯智能种植云</span>
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
                  {messages.slice(0, 5).map((msg) => (
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
                LQC
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">陆启闯</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900">陆启闯</p>
                  <p className="text-sm text-gray-500">经理 · 生产部 · 宁波帮帮忙公司</p>
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
                    to="/messages"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Bell className="w-4 h-4" />
                    消息中心
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" />
                    系统设置
                  </Link>
                  <a
                    href="/sync.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    数据同步
                  </a>
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
