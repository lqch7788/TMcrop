import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Mail, MessageSquare, Phone, AlertTriangle, Search, Plus, Edit2, Trash2, ChevronLeft } from 'lucide-react';

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'in-app' | 'wechat';
  enabled: boolean;
  config: Record<string, string>;
}

interface NotificationRule {
  id: string;
  name: string;
  event: string;
  channels: string[];
  recipients: string[];
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}

const STORAGE_KEY = 'notification_settings_data';

const DEFAULT_CHANNELS: NotificationChannel[] = [
  { id: '1', name: '系统内消息', type: 'in-app', enabled: true, config: {} },
  { id: '2', name: '邮件通知', type: 'email', enabled: true, config: { smtpHost: 'smtp.example.com', smtpPort: '587', fromEmail: 'noreply@example.com' } },
  { id: '3', name: '短信通知', type: 'sms', enabled: false, config: { apiKey: '', provider: 'aliyun' } },
  { id: '4', name: '企业微信', type: 'wechat', enabled: false, config: { webhook: '', corpId: '' } },
];

const DEFAULT_RULES: NotificationRule[] = [
  { id: '1', name: '审批待办通知', event: 'approval_pending', channels: ['1', '2'], recipients: ['approver'], enabled: true, frequency: 'immediate' },
  { id: '2', name: '审批结果通知', event: 'approval_result', channels: ['1'], recipients: ['applicant'], enabled: true, frequency: 'immediate' },
  { id: '3', name: '预警通知', event: 'alert', channels: ['1', '2', '3'], recipients: ['admin', 'manager'], enabled: true, frequency: 'immediate' },
  { id: '4', name: '任务分配通知', event: 'task_assigned', channels: ['1'], recipients: ['assignee'], enabled: true, frequency: 'immediate' },
  { id: '5', name: '每日汇总', event: 'daily_summary', channels: ['1', '2'], recipients: ['all'], enabled: false, frequency: 'daily' },
  { id: '6', name: '系统公告', event: 'announcement', channels: ['1', '2', '3'], recipients: ['all'], enabled: true, frequency: 'immediate' },
];

const EVENT_OPTIONS = [
  { value: 'approval_pending', label: '审批待办' },
  { value: 'approval_result', label: '审批结果' },
  { value: 'alert', label: '系统预警' },
  { value: 'task_assigned', label: '任务分配' },
  { value: 'daily_summary', label: '每日汇总' },
  { value: 'announcement', label: '系统公告' },
  { value: 'inventory_low', label: '库存不足' },
  { value: 'device_offline', label: '设备离线' },
];

const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: '立即发送' },
  { value: 'hourly', label: '每小时汇总' },
  { value: 'daily', label: '每日汇总' },
];

export default function NotificationSettings() {
  const [activeTab, setActiveTab] = useState<'channels' | 'rules' | 'preferences'>('rules');
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<NotificationRule>>({ enabled: true, channels: [], recipients: [], frequency: 'immediate' });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setChannels(data.channels || DEFAULT_CHANNELS);
      setRules(data.rules || DEFAULT_RULES);
    } else {
      setChannels(DEFAULT_CHANNELS);
      setRules(DEFAULT_RULES);
    }
  }, []);

  useEffect(() => {
    if (channels.length > 0 && rules.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ channels, rules }));
    }
  }, [channels, rules]);

  const filteredRules = rules.filter(r => r.name.includes(searchTerm) || r.event.includes(searchTerm));

  const handleSaveRule = () => {
    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? { ...r, ...newRule } as NotificationRule : r));
    } else {
      setRules([...rules, { ...newRule, id: Date.now().toString() } as NotificationRule]);
    }
    setShowRuleModal(false);
    setEditingRule(null);
    setNewRule({ enabled: true, channels: [], recipients: [], frequency: 'immediate' });
  };

  const deleteRule = (id: string) => {
    if (confirm('确定删除该通知规则吗？')) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  const editRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setShowRuleModal(true);
  };

  const toggleChannel = (id: string) => {
    setChannels(channels.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'sms': return Phone;
      case 'in-app': return MessageSquare;
      case 'wechat': return Bell;
      default: return Bell;
    }
  };

  const getChannelLabel = (type: string) => {
    const map: Record<string, string> = { email: '邮件', sms: '短信', 'in-app': '站内消息', wechat: '企业微信' };
    return map[type] || type;
  };

  const getEventLabel = (event: string) => {
    return EVENT_OPTIONS.find(e => e.value === event)?.label || event;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">通知设置</h2>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索通知规则..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'rules' as const, label: '通知规则', icon: Bell },
          { id: 'channels' as const, label: '通知渠道', icon: Mail },
          { id: 'preferences' as const, label: '个人偏好', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 通知规则 */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingRule(null); setNewRule({ enabled: true, channels: [], recipients: [], frequency: 'immediate' }); setShowRuleModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增规则
            </button>
          </div>
          <div className="grid gap-4">
            {filteredRules.map(rule => (
              <div key={rule.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      rule.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      <p className="text-xs text-gray-500">{getEventLabel(rule.event)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rule.enabled ? '启用' : '停用'}
                    </span>
                    <button onClick={() => toggleRule(rule.id)} className="text-sm text-emerald-600 hover:underline">
                      {rule.enabled ? '停用' : '启用'}
                    </button>
                    <button onClick={() => editRule(rule)} className="p-1.5 hover:bg-gray-100 rounded">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-1.5 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {rule.channels.map(cid => {
                    const channel = channels.find(c => c.id === cid);
                    return channel ? (
                      <span key={cid} className={`px-2 py-1 text-xs rounded ${
                        channel.enabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {channel.name}
                      </span>
                    ) : null;
                  })}
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <span>频率：<span className="font-medium">{FREQUENCY_OPTIONS.find(f => f.value === rule.frequency)?.label}</span></span>
                  <span>接收人：<span className="font-medium">{rule.recipients.join(', ')}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 通知渠道 */}
      {activeTab === 'channels' && (
        <div className="grid gap-4">
          {channels.map(channel => {
            const Icon = getChannelIcon(channel.type);
            return (
              <div key={channel.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      channel.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                      <p className="text-xs text-gray-500">{getChannelLabel(channel.type)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleChannel(channel.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      channel.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      channel.enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(channel.config).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 capitalize">{key}</p>
                      <p className="text-sm text-gray-900 mt-1 truncate">{value || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 个人偏好 */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">个人通知偏好</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">审批通知</p>
                <p className="text-xs text-gray-500 mt-1">接收待审批和审批结果通知</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-600">启用</span>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">预警通知</p>
                <p className="text-xs text-gray-500 mt-1">接收系统预警和异常通知</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-600">启用</span>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">每日汇总</p>
                <p className="text-xs text-gray-500 mt-1">每日发送系统运行汇总</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-600">启用</span>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">系统公告</p>
                <p className="text-xs text-gray-500 mt-1">接收系统更新和公告通知</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-600">启用</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 规则编辑弹窗 */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingRule ? '编辑通知规则' : '新增通知规则'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规则名称</label>
                <input
                  type="text"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">触发事件</label>
                <select
                  value={newRule.event || ''}
                  onChange={(e) => setNewRule({ ...newRule, event: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">请选择事件</option>
                  {EVENT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知渠道（多选）</label>
                <div className="grid grid-cols-2 gap-2">
                  {channels.map(channel => (
                    <label key={channel.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={(newRule.channels || []).includes(channel.id)}
                        onChange={(e) => {
                          const channels = e.target.checked
                            ? [...(newRule.channels || []), channel.id]
                            : (newRule.channels || []).filter(c => c !== channel.id);
                          setNewRule({ ...newRule, channels });
                        }}
                        className="rounded"
                      />
                      {channel.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接收人（逗号分隔）</label>
                <input
                  type="text"
                  value={(newRule.recipients || []).join(', ')}
                  onChange={(e) => setNewRule({ ...newRule, recipients: e.target.value.split(',').map(r => r.trim()) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="approver, admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发送频率</label>
                <select
                  value={newRule.frequency || 'immediate'}
                  onChange={(e) => setNewRule({ ...newRule, frequency: e.target.value as NotificationRule['frequency'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {FREQUENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowRuleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveRule} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
