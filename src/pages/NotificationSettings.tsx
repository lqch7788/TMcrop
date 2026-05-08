import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Mail, MessageSquare, Phone, AlertTriangle, Search, Plus, Edit2, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';

// API基础路径
const API_BASE = '/api/notifications';

interface NotificationChannel {
  id: string;
  oid: string;
  channelCode: string;
  channelName: string;
  channelType: string;
  isActive: number;
  config: Record<string, string>;
}

interface NotificationRule {
  id: string;
  oid: string;
  ruleCode: string;
  ruleName: string;
  eventType: string;
  recipientType: string;
  recipientIds: string[];
  channelIds: string[];
  frequency: string;
  template: string;
  isActive: number;
}

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
  const [newRule, setNewRule] = useState<Partial<NotificationRule>>({ isActive: 1, channelIds: [], recipientIds: [], frequency: 'immediate' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载通知渠道数据
  const loadChannels = async () => {
    try {
      const response = await fetch(`${API_BASE}/channels`);
      const result = await response.json();
      if (result.success) {
        setChannels(result.data || []);
      }
    } catch (err) {
      console.error('加载通知渠道失败:', err);
      setError('加载通知渠道失败');
    }
  };

  // 加载通知规则数据
  const loadRules = async () => {
    try {
      const response = await fetch(`${API_BASE}/rules`);
      const result = await response.json();
      if (result.success) {
        setRules(result.data || []);
      }
    } catch (err) {
      console.error('加载通知规则失败:', err);
      setError('加载通知规则失败');
    }
  };

  // 初始化加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([loadChannels(), loadRules()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 筛选规则
  const filteredRules = rules.filter(r =>
    r.ruleName.includes(searchTerm) || r.eventType.includes(searchTerm)
  );

  // 保存规则
  const handleSaveRule = async () => {
    try {
      const payload = {
        ruleCode: newRule.eventType || `rule_${Date.now()}`,
        ruleName: newRule.ruleName,
        eventType: newRule.eventType,
        recipientType: newRule.recipientType || 'custom',
        recipientIds: newRule.recipientIds || [],
        channelIds: newRule.channelIds || [],
        frequency: newRule.frequency || 'immediate',
        template: newRule.template || '',
        isActive: newRule.isActive ? 1 : 0,
      };

      if (editingRule) {
        const response = await fetch(`${API_BASE}/rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!result.success) {
          alert(result.error || '更新失败');
          return;
        }
      } else {
        const response = await fetch(`${API_BASE}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!result.success) {
          alert(result.error || '创建失败');
          return;
        }
      }

      await loadRules();
      setShowRuleModal(false);
      setEditingRule(null);
      setNewRule({ isActive: 1, channelIds: [], recipientIds: [], frequency: 'immediate' });
    } catch (err) {
      console.error('保存规则失败:', err);
      alert('保存规则失败');
    }
  };

  // 删除规则
  const deleteRule = async (id: string) => {
    if (!confirm('确定删除该通知规则吗？')) return;
    try {
      const response = await fetch(`${API_BASE}/rules/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        await loadRules();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (err) {
      console.error('删除规则失败:', err);
      alert('删除规则失败');
    }
  };

  // 编辑规则
  const editRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setNewRule({
      ...rule,
      isActive: rule.isActive ? 1 : 0,
    });
    setShowRuleModal(true);
  };

  // 切换渠道状态
  const toggleChannel = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/channels/${id}/toggle`, { method: 'PATCH' });
      const result = await response.json();
      if (result.success) {
        await loadChannels();
      } else {
        alert(result.error || '切换状态失败');
      }
    } catch (err) {
      console.error('切换渠道状态失败:', err);
      alert('切换状态失败');
    }
  };

  // 切换规则状态
  const toggleRule = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/rules/${id}/toggle`, { method: 'PATCH' });
      const result = await response.json();
      if (result.success) {
        await loadRules();
      } else {
        alert(result.error || '切换状态失败');
      }
    } catch (err) {
      console.error('切换规则状态失败:', err);
      alert('切换状态失败');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
      </div>
    );
  }

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
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 ${
              activeTab !== tab.id ? 'text-gray-600' : ''
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 通知规则 */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => { setEditingRule(null); setNewRule({ isActive: 1, channelIds: [], recipientIds: [], frequency: 'immediate' }); setShowRuleModal(true); }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增规则
            </Button>
          </div>
          <div className="grid gap-4">
            {filteredRules.map(rule => (
              <div key={rule.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      rule.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{rule.ruleName}</h3>
                      <p className="text-xs text-gray-500">{getEventLabel(rule.eventType)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rule.isActive ? '启用' : '停用'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => toggleRule(rule.id)} className="text-sm text-emerald-600 hover:underline">
                      {rule.isActive ? '停用' : '启用'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => editRule(rule)} className="p-1.5 hover:bg-gray-100 rounded">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)} className="p-1.5 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(rule.channelIds || []).map(cid => {
                    const channel = channels.find(c => c.id === cid || c.channelCode === cid);
                    return channel ? (
                      <span key={cid} className={`px-2 py-1 text-xs rounded ${
                        channel.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {channel.channelName}
                      </span>
                    ) : null;
                  })}
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <span>频率：<span className="font-medium">{FREQUENCY_OPTIONS.find(f => f.value === rule.frequency)?.label}</span></span>
                  <span>接收人：<span className="font-medium">{(rule.recipientIds || []).join(', ')}</span></span>
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
            const Icon = getChannelIcon(channel.channelType);
            return (
              <div key={channel.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      channel.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{channel.channelName}</h3>
                      <p className="text-xs text-gray-500">{getChannelLabel(channel.channelType)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleChannel(channel.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      channel.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      channel.isActive ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
                {channel.config && Object.keys(channel.config).length > 0 && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(channel.config).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 capitalize">{key}</p>
                        <p className="text-sm text-gray-900 mt-1 truncate">{value || '-'}</p>
                      </div>
                    ))}
                  </div>
                )}
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
                  value={newRule.ruleName || ''}
                  onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">触发事件</label>
                <select
                  value={newRule.eventType || ''}
                  onChange={(e) => setNewRule({ ...newRule, eventType: e.target.value })}
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
                        checked={(newRule.channelIds || []).includes(channel.id)}
                        onChange={(e) => {
                          const channelIds = e.target.checked
                            ? [...(newRule.channelIds || []), channel.id]
                            : (newRule.channelIds || []).filter(c => c !== channel.id);
                          setNewRule({ ...newRule, channelIds });
                        }}
                        className="rounded"
                      />
                      {channel.channelName}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接收人（逗号分隔）</label>
                <input
                  type="text"
                  value={(newRule.recipientIds || []).join(', ')}
                  onChange={(e) => setNewRule({ ...newRule, recipientIds: e.target.value.split(',').map(r => r.trim()).filter(r => r) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="approver, admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发送频率</label>
                <select
                  value={newRule.frequency || 'immediate'}
                  onChange={(e) => setNewRule({ ...newRule, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {FREQUENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowRuleModal(false)}>取消</Button>
              <Button onClick={handleSaveRule}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
