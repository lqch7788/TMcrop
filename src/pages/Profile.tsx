import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Shield, Key, Phone, Mail, Bell, ChevronRight,
  ClipboardList, CheckSquare, AlertTriangle, BarChart3, FileText,
  Settings, Clock, Package, Calendar, Edit, Eye, MapPin,
  EyeOff, Star, MessageCircle, ExternalLink, Users, Database,
  Activity, Leaf, Sprout, Target, ClipboardCheck, LayoutDashboard,
  Warehouse, Gauge, TrendingUp, DollarSign, Target as TargetIcon,
  Truck, Archive, BookMarked, Wifi, Thermometer, Search, AlertTriangle as AlertIcon,
  Send, CheckCircle2, XCircle, ArrowUpDown, Gauge as GaugeIcon
} from 'lucide-react';
import { Button } from '../components/ui/button';

// ============================================================
// 角色用户映射 - 6种角色的用户信息
// ============================================================
const roleUsers = {
  admin: { id: 'U001', name: '张建国', avatar: 'ZGJ', role: 'admin', department: '技术部', position: '系统管理员' },
  manager: { id: 'U002', name: '李明辉', avatar: 'LMH', role: 'manager', department: '生产部', position: '基地经理' },
  supervisor: { id: 'U003', name: '王建国', avatar: 'WJG', role: 'supervisor', department: '生产部', position: '生产主管' },
  technician: { id: 'U004', name: '赵文静', avatar: 'ZWJ', role: 'technician', department: '技术部', position: '农技员' },
  worker: { id: 'U006', name: '陈小芳', avatar: 'CXF', role: 'worker', department: '生产部', position: '种植工' },
  visitor: { id: 'V001', name: '访客用户', avatar: 'FK', role: 'visitor', department: '演示部', position: '演示员' },
};

// ============================================================
// 角色权限配置
// ============================================================
const rolePermissions = {
  admin: {
    level: 1,
    title: '系统管理员',
    dataScope: 'all',
    profileAccess: 'full',
    securityAccess: 'full',
    stats: [
      { label: '系统用户', value: '28', icon: Users, color: 'bg-blue-500' },
      { label: '在线用户', value: '12', icon: Activity, color: 'bg-emerald-500' },
      { label: '操作日志', value: '1,256', icon: FileText, color: 'bg-purple-500' },
      { label: '数据备份', value: '99.9%', icon: Database, color: 'bg-cyan-500' },
    ],
    quickActions: [
      { label: '园区导览', icon: MapPin, path: '/park-archive', desc: '查看园区分布' },
      { label: '基地总览', icon: LayoutDashboard, path: '/dashboard', desc: '查看基地概览' },
      { label: '用户管理', icon: Users, path: '/settings/personnel', desc: '管理系统用户' },
      { label: '系统设置', icon: Settings, path: '/settings', desc: '系统配置管理' },
    ]
  },
  manager: {
    level: 2,
    title: '公司高管',
    dataScope: 'all',
    profileAccess: 'partial',
    securityAccess: 'partial',
    stats: [
      { label: '基地总数', value: '10', icon: LayoutDashboard, color: 'bg-blue-500' },
      { label: '种植批次', value: '12', icon: Sprout, color: 'bg-emerald-500' },
      { label: '待处理任务', value: '8', icon: ClipboardList, color: 'bg-amber-500' },
      { label: '本月完成', value: '156', icon: CheckSquare, color: 'bg-purple-500' },
    ],
    quickActions: [
      { label: '园区导览', icon: MapPin, path: '/park-archive', desc: '查看园区分布' },
      { label: '基地总览', icon: LayoutDashboard, path: '/dashboard', desc: '查看基地概览' },
      { label: '任务派发', icon: ClipboardList, path: '/farm-hub', desc: '分配农事任务' },
      { label: '审批中心', icon: ClipboardCheck, path: '/pending-approval', desc: '处理审批事项' },
    ]
  },
  supervisor: {
    level: 3,
    title: '部门经理',
    dataScope: 'dept',
    profileAccess: 'partial',
    securityAccess: 'partial',
    stats: [
      { label: '本部门员工', value: '8', icon: Users, color: 'bg-blue-500' },
      { label: '待处理任务', value: '12', icon: ClipboardList, color: 'bg-amber-500' },
      { label: '进行中任务', value: '15', icon: Activity, color: 'bg-emerald-500' },
      { label: '考勤异常', value: '3', icon: AlertTriangle, color: 'bg-red-500' },
    ],
    quickActions: [
      { label: '园区导览', icon: MapPin, path: '/park-archive', desc: '查看园区分布' },
      { label: '基地总览', icon: LayoutDashboard, path: '/dashboard', desc: '本基地概览' },
      { label: '任务派发', icon: ClipboardList, path: '/farm-hub', desc: '本部门任务分配' },
      { label: '考勤审核', icon: Calendar, path: '/settings/personnel/attendance', desc: '审核员工考勤' },
    ]
  },
  technician: {
    level: 4,
    title: '技术员',
    dataScope: 'module',
    profileAccess: 'partial',
    securityAccess: 'partial',
    stats: [
      { label: '待执行任务', value: '5', icon: ClipboardList, color: 'bg-amber-500' },
      { label: '农事记录', value: '32', icon: Leaf, color: 'bg-emerald-500' },
      { label: '环境预警', value: '2', icon: AlertTriangle, color: 'bg-red-500' },
      { label: '负责区域', value: '3', icon: MapPin, color: 'bg-blue-500' },
    ],
    quickActions: [
      { label: '农事记录', icon: Leaf, path: '/agriculture-record', desc: '记录农事作业' },
      { label: '环境监测', icon: Activity, path: '/environment-monitor', desc: '查看环境数据' },
      { label: '任务反馈', icon: CheckSquare, path: '/tasks', desc: '反馈任务进度' },
      { label: '巡田记录', icon: Search, path: '/inspection', desc: '记录巡田情况' },
    ]
  },
  worker: {
    level: 5,
    title: '普通员工',
    dataScope: 'self',
    profileAccess: 'minimal',
    securityAccess: 'partial',
    stats: [
      { label: '我的任务', value: '3', icon: ClipboardList, color: 'bg-amber-500' },
      { label: '已打卡', value: '22', icon: Clock, color: 'bg-emerald-500' },
      { label: '物料领用', value: '5', icon: Package, color: 'bg-blue-500' },
      { label: '完成率', value: '96%', icon: TargetIcon, color: 'bg-purple-500' },
    ],
    quickActions: [
      { label: '我的任务', icon: ClipboardList, path: '/tasks', desc: '查看我的任务' },
      { label: '考勤打卡', icon: Clock, path: '/worker-attendance', desc: '上下班打卡' },
      { label: '物料领用', icon: Package, path: '/material-receiving', desc: '申请领用物资' },
      { label: '任务反馈', icon: CheckSquare, path: '/tasks', desc: '反馈任务状态' },
    ]
  },
  visitor: {
    level: 6,
    title: '访客',
    dataScope: 'public',
    profileAccess: 'locked',
    securityAccess: 'none',
    stats: [
      { label: '演示大棚', value: '10', icon: LayoutDashboard, color: 'bg-blue-500' },
      { label: '演示作物', value: '8', icon: Sprout, color: 'bg-emerald-500' },
      { label: '演示任务', value: '25', icon: ClipboardList, color: 'bg-amber-500' },
      { label: '数据节点', value: '156', icon: Activity, color: 'bg-purple-500' },
    ],
    quickActions: [
      { label: '园区导览', icon: MapPin, path: '/park-archive', desc: '查看园区分布' },
      { label: '环境监测', icon: Activity, path: '/environment-monitor', desc: '环境数据展示' },
      { label: '生产概览', icon: BarChart3, path: '/production', desc: '生产进度总览' },
    ]
  }
};

// ============================================================
// 通知配置
// ============================================================
const notificationConfig = {
  admin: [
    { icon: Bell, label: '系统通知', count: 5, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: ClipboardList, label: '任务提醒', count: 12, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: AlertTriangle, label: '预警信息', count: 3, color: 'text-red-500', bg: 'bg-red-50' },
    { icon: ClipboardCheck, label: '审批动态', count: 8, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ],
  manager: [
    { icon: Bell, label: '系统通知', count: 3, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: ClipboardList, label: '任务提醒', count: 8, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: AlertTriangle, label: '预警信息', count: 2, color: 'text-red-500', bg: 'bg-red-50' },
    { icon: ClipboardCheck, label: '待审批', count: 15, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ],
  supervisor: [
    { icon: ClipboardList, label: '本部门任务', count: 12, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Calendar, label: '考勤异常', count: 3, color: 'text-red-500', bg: 'bg-red-50' },
    { icon: Package, label: '物资待审', count: 5, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: ClipboardCheck, label: '本部门审批', count: 4, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ],
  technician: [
    { icon: ClipboardList, label: '待执行任务', count: 5, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Activity, label: '环境预警', count: 2, color: 'text-red-500', bg: 'bg-red-50' },
    { icon: FileText, label: '技术方案', count: 3, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Leaf, label: '农事提醒', count: 4, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ],
  worker: [
    { icon: ClipboardList, label: '我的任务', count: 3, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Clock, label: '考勤提醒', count: 1, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Package, label: '领用结果', count: 2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ],
  visitor: []
};

// ============================================================
// 角色选项列表
// ============================================================
const roleOptions = [
  { value: 'admin', label: '系统管理员' },
  { value: 'manager', label: '公司高管' },
  { value: 'supervisor', label: '部门经理' },
  { value: 'technician', label: '技术员' },
  { value: 'worker', label: '普通员工' },
  { value: 'visitor', label: '访客' },
];

// ============================================================
// 主组件
// ============================================================
export default function Profile() {
  const [selectedRole, setSelectedRole] = useState<string>('visitor');
  const user = roleUsers[selectedRole as keyof typeof roleUsers];
  const permission = rolePermissions[selectedRole as keyof typeof rolePermissions];
  const notifications = notificationConfig[selectedRole as keyof typeof notificationConfig] || [];
  const isVisitor = selectedRole === 'visitor';

  return (
    <div className="space-y-6">
      {/* 访客欢迎横幅 */}
      {isVisitor && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Star className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">欢迎体验弘讯智能种植云系统</h2>
              <p className="text-emerald-100 mt-1">您正在使用演示账号，可浏览系统核心功能。如需了解更多，请联系我们。</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header - 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
              <p className="text-gray-500">
                {permission.profileAccess === 'locked' ? '演示模式 · 仅供浏览' : '管理您的账户信息和查看工作概览'}
              </p>
            </div>
          </div>

          {/* 身份切换器 */}
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
            <Eye className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-gray-600">身份切换：</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-sm font-medium text-emerald-700 bg-transparent border-none focus:outline-none cursor-pointer min-w-[120px]"
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 pl-3 border-l border-emerald-200">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                selectedRole === 'admin' ? 'bg-blue-500' :
                selectedRole === 'manager' ? 'bg-purple-500' :
                selectedRole === 'supervisor' ? 'bg-amber-500' :
                selectedRole === 'technician' ? 'bg-emerald-500' :
                selectedRole === 'worker' ? 'bg-cyan-500' :
                'bg-gray-500'
              }`}>
                {user.avatar}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.position}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 角色权限提示标签 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          selectedRole === 'admin' ? 'bg-blue-100 text-blue-700' :
          selectedRole === 'manager' ? 'bg-purple-100 text-purple-700' :
          selectedRole === 'supervisor' ? 'bg-amber-100 text-amber-700' :
          selectedRole === 'technician' ? 'bg-emerald-100 text-emerald-700' :
          selectedRole === 'worker' ? 'bg-cyan-100 text-cyan-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {permission.title}
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
          数据范围：{
            permission.dataScope === 'all' ? '全部数据' :
            permission.dataScope === 'dept' ? '本部门数据' :
            permission.dataScope === 'module' ? '负责模块' :
            permission.dataScope === 'self' ? '仅自己' : '公开信息'
          }
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
          权限等级：L{permission.level}
        </span>
      </div>

      {/* 第一行：基本信息 + 账户安全 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息卡片 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">基本信息</h2>
            {permission.profileAccess === 'full' && (
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <Edit className="w-4 h-4" />
                编辑
              </Button>
            )}
          </div>
          <div className="p-6">
            <div className="flex items-start gap-6">
              {/* 头像 */}
              <div className="relative">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                  selectedRole === 'admin' ? 'bg-blue-500' :
                  selectedRole === 'manager' ? 'bg-purple-500' :
                  selectedRole === 'supervisor' ? 'bg-amber-500' :
                  selectedRole === 'technician' ? 'bg-emerald-500' :
                  selectedRole === 'worker' ? 'bg-cyan-500' :
                  'bg-gray-500'
                }`}>
                  {user.avatar}
                </div>
                {permission.profileAccess === 'full' && (
                  <button className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                    <Edit className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>

              {/* 用户信息 */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">姓名</label>
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">工号</label>
                  <p className="font-medium text-gray-900">{user.id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">所属部门</label>
                  <p className="font-medium text-gray-900">{user.department}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">职位</label>
                  <p className="font-medium text-gray-900">{user.position}</p>
                </div>
                {permission.profileAccess !== 'locked' && permission.profileAccess !== 'minimal' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">联系电话</label>
                      <p className="font-medium text-gray-900">138-xxxx-xxxx</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">电子邮箱</label>
                      <p className="font-medium text-gray-900">{user.name.toLowerCase()}@company.com</p>
                    </div>
                  </>
                )}
                {permission.profileAccess === 'minimal' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">入职日期</label>
                      <p className="font-medium text-gray-900">2024-01-15</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">考勤状态</label>
                      <p className="font-medium text-emerald-600">正常</p>
                    </div>
                  </>
                )}
                {permission.profileAccess === 'locked' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">公司</label>
                      <p className="font-medium text-gray-900">宁波帮帮忙公司</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">角色</label>
                      <p className="font-medium text-emerald-600">演示访客</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 账户安全卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">账户安全</h2>
          </div>
          <div className="p-6 space-y-4">
            {permission.securityAccess === 'none' ? (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-50 rounded-xl inline-block mb-4">
                  <EyeOff className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">演示账号不支持安全设置</p>
                <p className="text-xs text-gray-400 mt-1">如有需要请联系我们开通正式账号</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Key className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">登录密码</p>
                      <p className="text-xs text-gray-500">上次修改：30天前</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Phone className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">手机绑定</p>
                      <p className="text-xs text-gray-500">138-xxxx-xxxx</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs rounded-full">已绑定</span>
                </div>

                {permission.securityAccess === 'full' && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Shield className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">双重验证</p>
                        <p className="text-xs text-gray-500">增强账户安全</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs rounded-full">已开启</span>
                  </div>
                )}

                {permission.securityAccess === 'full' && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <FileText className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">安全日志</p>
                        <p className="text-xs text-gray-500">查看登录历史</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 第二行：角色专属统计卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">{permission.title} - 工作概览</h2>
          <Link
            to={permission.quickActions[0]?.path || '/'}
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            查看详情 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {permission.stats.map((stat, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 第三行：快捷操作入口 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {permission.quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              className="p-4 border border-gray-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
            >
              <div className="p-3 bg-gray-50 rounded-xl w-fit group-hover:bg-emerald-100 transition-colors">
                <action.icon className="w-6 h-6 text-gray-600 group-hover:text-emerald-600" />
              </div>
              <h3 className="font-medium text-gray-900 mt-3">{action.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 第四行：通知与消息 */}
      {notifications.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">通知与消息</h2>
            <Link
              to="/messages"
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {notifications.map((item, index) => (
              <Link
                key={index}
                to="/messages"
                className={`p-4 ${item.bg} rounded-xl hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center justify-between mb-2">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-2xl font-bold text-gray-900">{item.count}</span>
                </div>
                <p className="text-sm text-gray-700">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">通知与消息</h2>
          </div>
          <div className="text-center py-8">
            <div className="p-4 bg-gray-50 rounded-xl inline-block mb-4">
              <EyeOff className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">演示账号无权查看通知</p>
            <p className="text-xs text-gray-400 mt-1">如有需要请联系我们开通正式账号</p>
          </div>
        </div>
      )}

      {/* 访客专属底部提示 */}
      {isVisitor && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <MessageCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">演示说明</h3>
              <p className="text-sm text-amber-700 mt-1">
                此为系统演示账号，您可以浏览智慧种植管理系统的核心功能模块。
                部分操作类功能已限制，如需体验完整功能或了解更多产品信息，请联系我们的工作人员。
              </p>
              <div className="flex gap-3 mt-4">
                <Button variant="default" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  联系我们
                </Button>
                <Button variant="secondary" className="flex items-center gap-2">
                  功能咨询
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
