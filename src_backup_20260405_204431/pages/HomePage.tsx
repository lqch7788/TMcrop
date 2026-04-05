import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThermometerSun,
  Settings,
  Video,
  Leaf,
  BarChart3,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Sprout,
  LogIn,
  LogOut,
  User,
  Info
} from 'lucide-react';
import { translations, Language } from '../i18n/translations';

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  gradient: string;
  onClick?: () => void;
  disabled?: boolean;
  actionText?: string;
}

function ModuleCard({ icon, title, description, color, gradient, onClick, disabled, actionText }: ModuleCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 group ${gradient} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-2xl'}`}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>


      <div className="relative p-6">
        {/* 图标 */}
        <div className={`w-16 h-16 rounded-xl ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>


        {/* 标题 */}
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-white">{title}</h3>

        {/* 描述 */}
        <p className="text-white/80 text-sm mb-4">{description}</p>

        {/* 箭头指示器 */}
        <div className="flex items-center text-white/60 text-sm group-hover:text-white transition-colors">
          {disabled ? (
            <span>{actionText}</span>
          ) : (
            <>
              <span>{actionText}</span>
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </div>
      </div>


      {/* 底部渐变条 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30"></div>
    </div>

  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [language, setLanguage] = useState<Language>('中文简体');

  const t = translations[language];

  useEffect(() => {
    // 检查登录状态
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const user = localStorage.getItem('username') || '陆启闯';
    setIsLoggedIn(loggedIn);
    setUsername(user);

  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setIsLoggedIn(false);

    setUsername('');

    setShowLogoutConfirm(false);

    // 跳转到主页，显示未登录状态
    navigate('/');
  };

  const modules = [
    {
      icon: <ThermometerSun className="w-8 h-8 text-white" />,
      title: t.envMonitor,
      description: t.envMonitorDesc,
      color: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      gradient: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600',
      onClick: () => navigate('/environment-monitor'),
      disabled: true,
      actionText: t.envMonitorStatus
    },
    {
      icon: <Settings className="w-8 h-8 text-white" />,
      title: t.controlSystem,
      description: t.controlSystemDesc,
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      gradient: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600',
      onClick: () => navigate('/env-control'),
      disabled: true,
      actionText: t.controlSystemStatus
    },
    {
      icon: <Leaf className="w-8 h-8 text-white" />,
      title: t.plantingManagement,
      description: t.plantingManagementDesc,
      color: 'bg-gradient-to-br from-emerald-500 to-green-600',
      gradient: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600',
      onClick: () => navigate('/dashboard'),
      disabled: false,
      actionText: t.plantingManagementStatus
    },
    {
      icon: <Sprout className="w-8 h-8 text-white" />,
      title: t.traceability,
      description: t.traceabilityDesc,
      color: 'bg-gradient-to-br from-lime-500 to-green-600',
      gradient: 'bg-gradient-to-br from-lime-500 via-green-500 to-emerald-600',
      onClick: () => navigate('/traceability'),
      disabled: true,
      actionText: t.traceabilityStatus
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-white" />,
      title: t.dataAnalysis,
      description: t.dataAnalysisDesc,
      color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      gradient: 'bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-600',
      onClick: () => navigate('/reports'),
      disabled: true,
      actionText: t.dataAnalysisStatus
    },
    {
      icon: <GraduationCap className="w-8 h-8 text-white" />,
      title: t.expertAI,
      description: t.expertAIDesc,
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
      gradient: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
      onClick: () => navigate('/tech-solution'),
      disabled: true,
      actionText: t.expertAIStatus
    },
    {
      icon: <Video className="w-8 h-8 text-white" />,
      title: t.costAccounting,
      description: t.costAccountingDesc,
      color: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      gradient: 'bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600',
      onClick: () => navigate('/device-monitor'),
      disabled: true,
      actionText: t.costAccountingStatus
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-white" />,
      title: t.marketSales,
      description: t.marketSalesDesc,
      color: 'bg-gradient-to-br from-pink-500 to-rose-600',
      gradient: 'bg-gradient-to-br from-pink-500 via-rose-500 to-red-600',
      onClick: () => navigate('/market-sales'),
      disabled: true,
      actionText: t.marketSalesStatus
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* 顶部导航 */}
      <div className="relative z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/弘智耘LOGO.png"
              alt="弘智耘"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t.aboutTitle}</h1>
              <p className="text-xs text-gray-500">Techmation Intelligent Crop Cloud</p>
            </div>

          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{t.smartAgriculture}</span>

            {isLoggedIn ? (
              <>
                {/* 用户下拉菜单 */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-medium">
                      LQC
                    </div>
                    <span className="text-sm font-medium text-emerald-700">{username}</span>
                    <ChevronDown className="w-4 h-4 text-emerald-600" />
                  </button>

                  {/* 下拉菜单 */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                      {/* 用户信息头部 */}
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="font-bold text-gray-900">{username}</p>
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-600">所属公司：</span>宁波帮帮忙公司
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-600">所属部门：</span>生产部
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-600">职位：</span>经理
                          </p>
                        </div>
                      </div>
                      {/* 菜单项 */}
                      <div className="py-1">
                        <button
                          onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <User className="w-4 h-4" />
                          个人中心
                        </button>
                        <button
                          onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <Settings className="w-4 h-4" />
                          系统设置
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm font-medium">{t.login}</span>
                </button>
              </>
            )}

            {/* 语言选择下拉框 - 始终显示 */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none px-3 py-1.5 pr-8 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <option value="中文简体">中文简体</option>
                <option value="中文繁体">中文繁体</option>
                <option value="English">English</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* 关于按钮 - 始终显示 */}
            <button
              onClick={() => setShowAbout(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Info className="w-4 h-4" />
              <span className="text-sm">{t.about}</span>
            </button>
          </div>

        </div>

      </div>


      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute bottom-10 right-20 w-60 h-60 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-white rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-16 relative">
          <h2 className="text-3xl font-bold text-white mb-2">{t.welcome}</h2>
          <p className="text-white/80 text-lg">{t.welcomeSub}</p>
        </div>

      </div>


      {/* 模块卡片区域 */}
      <div className="max-w-7xl mx-auto px-6 py-12">


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module, index) => (
            <ModuleCard
              key={index}
              icon={module.icon}
              title={module.title}
              description={module.description}
              color={module.color}
              gradient={module.gradient}
              onClick={module.onClick}
              disabled={module.disabled}
              actionText={module.actionText}
            />
          ))}
        </div>

      </div>


      {/* 关于弹窗 */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sprout className="w-8 h-8 text-emerald-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{t.aboutTitle}</h3>
              <p className="text-sm text-gray-500 mb-1">{t.aboutSubtitle}</p>
              <p className="text-xs text-gray-400 mb-4">{t.aboutShortName}</p>

              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-4">
                <p className="text-sm"><span className="text-gray-500">{t.version}：</span><span className="font-medium">V3.0.0</span></p>
                <p className="text-sm"><span className="text-gray-500">{t.copyright}：</span><span className="font-medium">{t.companyName}</span></p>
                <hr className="my-2" />
                <p className="text-sm font-medium text-gray-700">{t.contactInfo}：</p>
                <p className="text-xs text-gray-500"><span className="font-medium">{t.address}：</span>{t.addressValue}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">{t.contact}：</span>{t.contactValue}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">{t.phone}：</span>{t.phoneValue}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">{t.fax}：</span>{t.faxValue}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">{t.email}：</span>{t.emailValue}</p>
              </div>

              <button
                onClick={() => setShowAbout(false)}
                className="w-full px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 退出确认弹窗 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">确认退出</h3>

              <p className="text-gray-500 mb-6">确定要退出登录吗？</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"

                >
                  取消
                </button>

                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"

                >
                  确认退出
                </button>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* 底部信息 */}
      <div className="bg-white/50 border-t border-green-100 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Sprout className="w-4 h-4 text-emerald-500" />
            <span>{t.footerBrand}</span>
          </div>

          <div className="text-gray-400 text-sm">
            {t.footerCopyright}
          </div>

        </div>

      </div>

    </div>

  );
}
