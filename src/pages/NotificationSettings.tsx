/**
 * 通知设置页面
 * 架构：组件 → useNotificationSettingsStore → API → Backend
 * 3个TAB：通知规则 / 通知渠道 / 个人偏好（均已完整实现）
 */
import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Phone, AlertTriangle, Search, Plus, Edit2, Trash2, ChevronLeft, Loader2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { useNotificationSettingsStore } from '../stores';
import { useAuthStore } from '../stores';
import type { NotificationChannel, NotificationRule } from '../services/apiNotificationService';
import { showConfirm } from '@/lib/dialogService';

// ============================================
// 常量
// ============================================

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

const CHANNEL_TYPES = [
  { value: 'email', label: '邮件' },
  { value: 'sms', label: '短信' },
  { value: 'in-app', label: '站内消息' },
  { value: 'wechat', label: '企业微信' },
];

// ============================================
// 渠道新增/编辑弹窗
// ============================================

function ChannelModal({
  open, onClose, onSave, editItem,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<NotificationChannel>) => void;
  editItem?: NotificationChannel | null;
}) {
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState('in-app');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setChannelName(editItem.channelName || '');
      setChannelType(editItem.channelType || 'in-app');
    } else {
      setChannelName('');
      setChannelType('in-app');
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!channelName.trim()) return;
    setSaving(true);
    try {
      const code = editItem?.channelCode || `CH_${channelType}_${Date.now()}`;
      await onSave({ channelName: channelName.trim(), channelType, channelCode: editItem ? undefined : code });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? '编辑通知渠道' : '新增通知渠道'}>
      <div className="space-y-4">
        <div>
          <Label>渠道名称 *</Label>
          <Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="如: 邮件通知" />
        </div>
        <div>
          <Label>渠道类型 *</Label>
          <Select value={channelType} onChange={(e) => setChannelType(e.target.value)}>
            {CHANNEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// 规则新增/编辑弹窗
// ============================================

function RuleModal({
  open, onClose, onSave, channels, editItem,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<NotificationRule>) => void;
  channels: NotificationChannel[];
  editItem?: NotificationRule | null;
}) {
  const [ruleName, setRuleName] = useState('');
  const [eventType, setEventType] = useState('');
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [recipientIds, setRecipientIds] = useState('');
  const [frequency, setFrequency] = useState('immediate');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setRuleName(editItem.ruleName || '');
      setEventType(editItem.eventType || '');
      setChannelIds(editItem.channelIds || []);
      setRecipientIds((editItem.recipientIds || []).join(', '));
      setFrequency(editItem.frequency || 'immediate');
    } else {
      setRuleName(''); setEventType(''); setChannelIds([]); setRecipientIds(''); setFrequency('immediate');
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!ruleName.trim() || !eventType) return;
    setSaving(true);
    try {
      const payload = {
        ruleCode: editItem?.ruleCode || `rule_${Date.now()}`,
        ruleName: ruleName.trim(),
        eventType,
        recipientType: 'custom',
        recipientIds: recipientIds.split(',').map((r) => r.trim()).filter(Boolean),
        channelIds,
        frequency,
        isActive: true,
      };
      await onSave(payload);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? '编辑通知规则' : '新增通知规则'} width="lg">
      <div className="space-y-4">
        <div>
          <Label>规则名称 *</Label>
          <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="如: 审批待办通知" />
        </div>
        <div>
          <Label>触发事件 *</Label>
          <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="">-- 请选择事件 --</option>
            {EVENT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>通知渠道（多选）</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {channels.map((ch) => (
              <label key={ch.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" checked={channelIds.includes(ch.id)}
                  onChange={(e) => setChannelIds(e.target.checked ? [...channelIds, ch.id] : channelIds.filter((c) => c !== ch.id))}
                  className="rounded" />
                {ch.channelName}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>接收人（逗号分隔）</Label>
          <Input value={recipientIds}
            onChange={(e) => setRecipientIds(e.target.value)}
            placeholder="approver, admin" />
        </div>
        <div>
          <Label>发送频率</Label>
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// 主页面
// ============================================

export default function NotificationSettings() {
  const {
    channels, rules, preferences, loading, error,
    loadAll, loadPreferences,
    toggleChannelActive, addChannel, updateChannel, removeChannel,
    toggleRuleActive, addRule, updateRule, removeRule,
    saveUserPreferences,
  } = useNotificationSettingsStore();

  const [activeTab, setActiveTab] = useState<'channels' | 'rules' | 'preferences'>('rules');
  const [searchTerm, setSearchTerm] = useState('');

  // 弹窗
  const [channelModal, setChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [ruleModal, setRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  // 偏好编辑状态
  const [localPrefs, setLocalPrefs] = useState({
    approvalNotify: true, alertNotify: true, dailySummary: false,
    announcementNotify: true, dndEnabled: false, dndStartTime: '22:00', dndEndTime: '08:00',
  });
  const [prefsDirty, setPrefsDirty] = useState(false);

  useEffect(() => { loadAll(); }, [loadAll]);

  // 加载偏好
  useEffect(() => {
    // 2026-06-04 V2.1 铁律：从 useAuthStore 读当前用户 oid（替代 localStorage 兜底）
    const uid = useAuthStore.getState().currentUser?.oid || 'default';
    loadPreferences(uid);
  }, [loadPreferences]);

  // 同步偏好到本地状态
  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        approvalNotify: preferences.approvalNotify,
        alertNotify: preferences.alertNotify,
        dailySummary: preferences.dailySummary,
        announcementNotify: preferences.announcementNotify,
        dndEnabled: preferences.dndEnabled,
        dndStartTime: preferences.dndStartTime || '22:00',
        dndEndTime: preferences.dndEndTime || '08:00',
      });
    }
  }, [preferences]);

  const filteredRules = rules.filter((r) =>
    r.ruleName?.includes(searchTerm) || r.eventType?.includes(searchTerm)
  );

  const getChannelIcon = (type: string) => {
    const map: Record<string, typeof Mail> = { email: Mail, sms: Phone, 'in-app': MessageSquare, wechat: Bell };
    return map[type] || Bell;
  };

  const getChannelLabel = (type: string) => {
    return CHANNEL_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getEventLabel = (event: string) => EVENT_OPTIONS.find((e) => e.value === event)?.label || event;

  const handleSavePrefs = async () => {
    // 2026-06-04 V2.1 铁律：从 useAuthStore 读当前用户 oid（替代 localStorage 兜底）
    const uid = useAuthStore.getState().currentUser?.oid || 'default';
    await saveUserPreferences(uid, localPrefs);
    setPrefsDirty(false);
  };

  const updateLocalPref = (key: string, value: any) => {
    setLocalPrefs((p) => ({ ...p, [key]: value }));
    setPrefsDirty(true);
  };

  if (loading && channels.length === 0 && rules.length === 0) {
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
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">通知设置</h1>
              <p className="text-gray-500">管理通知渠道、规则与个人偏好</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + 搜索 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {([
              { id: 'rules' as const, label: '通知规则' },
              { id: 'channels' as const, label: '通知渠道' },
              { id: 'preferences' as const, label: '个人偏好' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab !== 'preferences' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={activeTab === 'rules' ? '搜索规则...' : '搜索渠道...'}
                  className="pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <Button size="sm" onClick={() => {
                if (activeTab === 'rules') { setEditingRule(null); setRuleModal(true); }
                else { setEditingChannel(null); setChannelModal(true); }
              }}>
                <Plus className="w-4 h-4" />
                {activeTab === 'rules' ? '新增规则' : '新增渠道'}
              </Button>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* ========== 通知规则 ========== */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {filteredRules.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchTerm ? '没有匹配的规则' : '暂无通知规则，点击上方按钮新增'}
                </div>
              ) : (
                filteredRules.map((rule) => (
                  <div key={rule.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          rule.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-200 text-gray-400'
                        }`}>
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{rule.ruleName}</h3>
                          <p className="text-xs text-gray-500">{getEventLabel(rule.eventType)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>{rule.isActive ? '启用' : '停用'}</span>
                        <Button variant="ghost" size="sm" onClick={() => toggleRuleActive(rule.id)}>
                          {rule.isActive ? '停用' : '启用'}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingRule(rule); setRuleModal(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={async () => {
                          if (await showConfirm('确定删除该规则？')) removeRule(rule.id);
                        }}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(rule.channelIds || []).map((cid) => {
                        const ch = channels.find((c) => c.id === cid || c.channelCode === cid);
                        return ch ? (
                          <span key={cid} className={`px-2 py-1 text-xs rounded ${ch.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            {ch.channelName}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center gap-6 text-xs text-gray-500">
                      <span>频率：<span className="font-medium">{FREQUENCY_OPTIONS.find((f) => f.value === rule.frequency)?.label}</span></span>
                      <span>接收人：<span className="font-medium">{(rule.recipientIds || []).join(', ') || '未指定'}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========== 通知渠道 ========== */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              {channels.filter((c) => c.channelName?.includes(searchTerm) || c.channelType?.includes(searchTerm)).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchTerm ? '没有匹配的渠道' : '暂无通知渠道'}
                </div>
              ) : (
                channels.filter((c) => c.channelName?.includes(searchTerm) || c.channelType?.includes(searchTerm)).map((ch) => {
                  const Icon = getChannelIcon(ch.channelType);
                  return (
                    <div key={ch.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${ch.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{ch.channelName}</h3>
                            <p className="text-xs text-gray-500">{getChannelLabel(ch.channelType)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleChannelActive(ch.id)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${
                              ch.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                            }`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              ch.isActive ? 'left-7' : 'left-1'
                            }`} />
                          </button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingChannel(ch); setChannelModal(true); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => {
                            if (await showConfirm('确定删除该渠道？')) removeChannel(ch.id);
                          }}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      {ch.config && Object.keys(ch.config).length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {Object.entries(ch.config).map(([key, value]) => (
                            <div key={key} className="p-3 bg-white rounded-lg">
                              <p className="text-xs text-gray-500 capitalize">{key}</p>
                              <p className="text-sm text-gray-900 mt-1 truncate">{value || '-'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========== 个人偏好 ========== */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">个人通知偏好</h3>
              <p className="text-sm text-gray-500">配置您希望接收的通知类型和时段</p>

              <div className="space-y-3 mt-4">
                {[
                  { key: 'approvalNotify', title: '审批通知', desc: '接收待审批和审批结果通知' },
                  { key: 'alertNotify', title: '预警通知', desc: '接收系统预警和异常通知' },
                  { key: 'dailySummary', title: '每日汇总', desc: '每日发送系统运行汇总' },
                  { key: 'announcementNotify', title: '系统公告', desc: '接收系统更新和公告通知' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </div>
                    <button onClick={() => updateLocalPref(item.key, !(localPrefs as any)[item.key])}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        (localPrefs as any)[item.key] ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        (localPrefs as any)[item.key] ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 免打扰时段 */}
              <div className="p-4 bg-gray-50 rounded-lg mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">免打扰时段</p>
                    <p className="text-xs text-gray-500 mt-1">在指定时段内不发送通知</p>
                  </div>
                  <button onClick={() => updateLocalPref('dndEnabled', !localPrefs.dndEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      localPrefs.dndEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      localPrefs.dndEnabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
                {localPrefs.dndEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label>开始时间</Label>
                      <Input type="time" value={localPrefs.dndStartTime}
                        onChange={(e) => updateLocalPref('dndStartTime', e.target.value)} />
                    </div>
                    <div>
                      <Label>结束时间</Label>
                      <Input type="time" value={localPrefs.dndEndTime}
                        onChange={(e) => updateLocalPref('dndEndTime', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* 保存按钮 */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSavePrefs} disabled={!prefsDirty}>
                  <Save className="w-4 h-4" />
                  {prefsDirty ? '保存偏好设置' : '已保存'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 渠道弹窗 */}
      <ChannelModal open={channelModal} onClose={() => { setChannelModal(false); setEditingChannel(null); }}
        onSave={async (data) => {
          if (editingChannel) await updateChannel(editingChannel.id, data);
          else await addChannel(data);
        }}
        editItem={editingChannel} />

      {/* 规则弹窗 */}
      <RuleModal open={ruleModal} onClose={() => { setRuleModal(false); setEditingRule(null); }}
        onSave={async (data) => {
          if (editingRule) await updateRule(editingRule.id, data);
          else await addRule(data);
        }}
        channels={channels} editItem={editingRule} />
    </div>
  );
}
