/**
 * 警报管理页面 — iAGS Warning 集成
 * 三级警报级别和通知规则配置
 * Phase 4 完整实现
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Plus, Trash2, Bell, BellOff, Mail, MessageSquare, Phone, Save, Loader2 } from 'lucide-react';
import { useAlarmConfigStore, LEVEL_DEFAULTS, LEVEL_LABELS, LEVEL_COLORS } from '../../stores/useAlarmConfigStore';
import type { AlarmLevel, AlarmContact } from '../../stores/useAlarmConfigStore';

const CONTACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
};

export default function AlarmConfigManagement() {
  // ========== Store ==========
  const levels = useAlarmConfigStore((s) => s.levels);
  const contacts = useAlarmConfigStore((s) => s.contacts);
  const isLoading = useAlarmConfigStore((s) => s.isLoading);
  const fetchLevels = useAlarmConfigStore((s) => s.fetchLevels);
  const saveLevel = useAlarmConfigStore((s) => s.saveLevel);
  const fetchContacts = useAlarmConfigStore((s) => s.fetchContacts);
  const addContact = useAlarmConfigStore((s) => s.addContact);
  const removeContact = useAlarmConfigStore((s) => s.removeContact);

  // ========== 本地状态 ==========
  const [activeTab, setActiveTab] = useState(1); // 1/2/3
  const [editingLevels, setEditingLevels] = useState<AlarmLevel[]>(LEVEL_DEFAULTS);
  const [savingLevel, setSavingLevel] = useState<number | null>(null);

  // 联系人弹窗
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ contactName: '', contactInfo: '', contactType: 'email' });

  // ========== 初始加载 ==========
  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  // 同步 levels 到本地编辑状态
  useEffect(() => {
    if (levels.length > 0) setEditingLevels([...levels]);
  }, [levels]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ========== 当前级别的编辑状态 ==========
  const currentEdit = useMemo(() =>
    editingLevels.find(l => l.level === activeTab) || LEVEL_DEFAULTS[activeTab - 1],
    [editingLevels, activeTab]
  );

  // 当前级别的联系人
  const currentContacts = useMemo(() =>
    contacts.filter(c => c.level === activeTab),
    [contacts, activeTab]
  );

  // ========== 操作 ==========
  const updateEdit = (key: string, value: any) => {
    setEditingLevels(prev => prev.map(l =>
      l.level === activeTab ? { ...l, [key]: value } : l
    ));
  };

  const toggleNotify = (key: string) => {
    const current = (currentEdit as any)[key] || 0;
    updateEdit(key, current ? 0 : 1);
  };

  const handleSaveLevel = useCallback(async () => {
    setSavingLevel(activeTab);
    await saveLevel(activeTab, {
      levelName: currentEdit.levelName,
      notifyEmail: currentEdit.notifyEmail,
      notifySms: currentEdit.notifySms,
      notifyPhone: currentEdit.notifyPhone,
    });
    setSavingLevel(null);
  }, [activeTab, currentEdit, saveLevel]);

  const handleAddContact = useCallback(async () => {
    if (!contactForm.contactName.trim() || !contactForm.contactInfo.trim()) return;
    await addContact({
      level: activeTab,
      contactName: contactForm.contactName,
      contactInfo: contactForm.contactInfo,
      contactType: contactForm.contactType,
    });
    setShowContactModal(false);
    setContactForm({ contactName: '', contactInfo: '', contactType: 'email' });
    fetchContacts();
  }, [contactForm, activeTab, addContact, fetchContacts]);

  const handleDeleteContact = useCallback(async (oid: string) => {
    await removeContact(oid);
    fetchContacts();
  }, [removeContact, fetchContacts]);

  // ========== 是否有未保存更改 ==========
  const isDirty = useMemo(() => {
    const original = levels.find(l => l.level === activeTab);
    if (!original) return true;
    return original.levelName !== currentEdit.levelName ||
      original.notifyEmail !== currentEdit.notifyEmail ||
      original.notifySms !== currentEdit.notifySms ||
      original.notifyPhone !== currentEdit.notifyPhone;
  }, [levels, activeTab, currentEdit]);

  // ========== 渲染 ==========
  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="p-2 bg-emerald-100 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">警报管理</h1>
          <p className="text-sm text-gray-500">三级警报级别和通知规则配置</p>
        </div>
      </div>

      {/* TAB 切换 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* TAB 栏 */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {[1, 2, 3].map(level => (
            <button
              key={level}
              onClick={() => setActiveTab(level)}
              className={`flex-1 py-3.5 px-4 text-sm font-medium transition-colors relative ${
                activeTab === level
                  ? level === 1 ? 'text-red-600 bg-white border-b-2 border-red-500' :
                    level === 2 ? 'text-orange-600 bg-white border-b-2 border-orange-500' :
                    'text-yellow-600 bg-white border-b-2 border-yellow-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {level === 1 ? <Bell className="w-4 h-4 text-red-500" /> :
                 level === 2 ? <Bell className="w-4 h-4 text-orange-500" /> :
                 <Bell className="w-4 h-4 text-yellow-500" />}
                {LEVEL_LABELS[level]}
              </div>
            </button>
          ))}
        </div>

        {/* TAB 内容 */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : (
            <>
              {/* 通知方式 */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    activeTab === 1 ? 'bg-red-500' : activeTab === 2 ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  通知方式配置
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'notifyEmail', label: '邮件通知', icon: <Mail className="w-5 h-5" />, desc: '通过电子邮件发送警报' },
                    { key: 'notifySms', label: '短信通知', icon: <MessageSquare className="w-5 h-5" />, desc: '通过短信发送警报' },
                    { key: 'notifyPhone', label: '电话通知', icon: <Phone className="w-5 h-5" />, desc: '通过电话通知警报' },
                  ].map(item => {
                    const isOn = (currentEdit as any)[item.key] === 1;
                    return (
                      <button
                        key={item.key}
                        onClick={() => toggleNotify(item.key)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isOn
                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`${isOn ? 'text-emerald-600' : 'text-gray-400'}`}>{item.icon}</span>
                          {isOn
                            ? <Bell className="w-4 h-4 text-emerald-500" />
                            : <BellOff className="w-4 h-4 text-gray-300" />}
                        </div>
                        <p className={`text-sm font-medium ${isOn ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 联系人列表 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">警报联系人</h3>
                  <button
                    onClick={() => { setContactForm({ contactName: '', contactInfo: '', contactType: 'email' }); setShowContactModal(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加联系人
                  </button>
                </div>

                {currentContacts.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
                    暂无联系人，点击"添加联系人"按钮添加
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500">姓名</th>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500">联系方式</th>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 w-20">类型</th>
                          <th className="py-2.5 px-4 text-center text-xs font-medium text-gray-500 w-16">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentContacts.map(c => (
                          <tr key={c.oid} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-2.5 px-4 font-medium text-gray-900">{c.contactName}</td>
                            <td className="py-2.5 px-4 text-gray-600">{c.contactInfo}</td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                {CONTACT_TYPE_ICONS[c.contactType]}
                                {c.contactType === 'email' ? '邮件' : c.contactType === 'sms' ? '短信' : '电话'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button onClick={() => handleDeleteContact(c.oid)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 保存按钮 */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={handleSaveLevel}
                  disabled={!isDirty || savingLevel === activeTab}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isDirty
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {savingLevel === activeTab ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
                  ) : (
                    <><Save className="w-4 h-4" /> 保存配置</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 添加联系人弹窗 */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[440px]" onClick={e => e.stopPropagation()}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl text-white">
              <h3 className="text-lg font-semibold">添加联系人 — {LEVEL_LABELS[activeTab]}</h3>
              <button onClick={() => setShowContactModal(false)} className="p-1 hover:bg-white/20 rounded">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-700 mb-1 font-medium">姓名 <span className="text-red-500">*</span></label>
                <input value={contactForm.contactName} onChange={e => setContactForm(prev => ({ ...prev, contactName: e.target.value }))}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="联系人姓名" />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1 font-medium">联系方式 <span className="text-red-500">*</span></label>
                <input value={contactForm.contactInfo} onChange={e => setContactForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                  className="w-full h-9 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-400" placeholder="邮箱/手机号" />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1 font-medium">通知类型</label>
                <div className="flex gap-2">
                  {['email', 'sms', 'phone'].map(type => (
                    <button
                      key={type}
                      onClick={() => setContactForm(prev => ({ ...prev, contactType: type }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        contactForm.contactType === type
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type === 'email' ? '邮件' : type === 'sms' ? '短信' : '电话'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowContactModal(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button onClick={handleAddContact}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                disabled={!contactForm.contactName.trim() || !contactForm.contactInfo.trim()}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
