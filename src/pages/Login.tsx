import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Cloud } from 'lucide-react';
import { useUserStore } from '../stores';
import { Button } from '../components/ui/button';

export default function Login() {
  const navigate = useNavigate();
  const users = useUserStore((state) => state.users);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    try {
      // 调用后端API验证用户名和密码
      const response = await fetch('/api/authority/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '登录失败');
        return;
      }

      // 登录成功，存储用户信息
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('userId', data.user.oid);
      localStorage.setItem('realName', data.user.real_name);
      localStorage.setItem('department', data.user.department_name || '');

      // 存储JWT token（如果后端返回了）
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // 存储用户角色信息
      localStorage.setItem('userRoles', JSON.stringify(data.roles));
      
      // 检查是否是管理员
      const isAdmin = data.roles.some((roleOid: string) => {
        const roleOidLower = roleOid?.toLowerCase() || '';
        return roleOid === 'ROLE001' ||
               roleOid === 'ROLE_ADMIN' ||
               roleOidLower.includes('admin');
      });
      localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');

      // 跳转到基地总览页面
      navigate('/dashboard');
    } catch (e) {
      console.error('登录请求失败:', e);
      setError('网络错误，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧背景图 */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
          alt="农业背景"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 to-green-900/60"></div>

        {/* 左侧内容 */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full">
          <img
            src="/弘智耘LOGO.png"
            alt="弘智耘Logo"
            className="w-48 h-48 mb-8 object-contain"
          />
          <h1 className="text-4xl font-bold text-white mb-4">弘讯智能种植云</h1>
          <p className="text-white/80 text-lg">Techmation Intelligent Crop Cloud</p>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 py-12 bg-gradient-to-br from-gray-50 to-gray-100">
        {/* 左侧标题 - 左上角 */}
        <div className="flex items-end gap-3 mb-6">
          <img
            src="/弘智耘LOGO.png"
            alt="弘智耘Logo"
            className="w-14 object-contain -mt-16"
          />
          <div className="-mt-3">
            <h1 className="text-2xl font-bold text-gray-900">弘讯智能种植云</h1>
            <p className="text-sm text-gray-500">Techmation Intelligent Crop Cloud</p>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
          {/* 登录标题 */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">账号密码登录</h2>
            <p className="text-gray-500">请输入您的账号和密码</p>
          </div>

          {/* 用户名输入框 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">账号</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              />
            </div>
          </div>

          {/* 密码输入框 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </Button>
            </div>
          </div>

          {/* 记住密码 */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-gray-600">记住密码</span>
            </label>
            <a href="#" className="text-sm text-emerald-600 hover:text-emerald-700">忘记密码？</a>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* 登录按钮 */}
          <Button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
          >
            登 录
          </Button>

          {/* 底部版权信息 */}
          <div className="mt-8 text-center text-gray-400 text-xs leading-relaxed">
            <p>版权 © 2013-2026, 宁波弘讯软件开发有限公司, 保留所有权利。 浙ICP备20003786号-7</p>
            <p className="mt-1">设计 : 宁波弘讯软件开发有限公司</p>
            <p className="mt-1">框架(Foil) 版本: v1.1.22|tmCropCloud 版本: v3.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
