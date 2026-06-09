/**
 * 分级审批配置管理页面
 * 完整 CRUD：管理金额阈值、审批级别和类型规则
 * 数据源：useApprovalLevelStore → API → DB
 */
import { useState, useEffect } from 'react';
import {
  Shield, ChevronLeft, Plus, Edit, Trash2, RefreshCw,
  CheckCircle, AlertTriangle, Zap, Users, Save, X, ArrowLeft,
} from 'lucide-react';
import { useApprovalLevelStore } from '../stores';
import { getApprovalTypeName, ApprovalType } from '../types/approval';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Label } from '../components/ui/label';
import {
  NumberInput,
  Checkbox,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../components/ui';
import type {
  ApprovalLevelConfigItem,
  ApprovalAmountThresholdItem,
  ApprovalTypeRuleItem,
} from '../services/apiBasicDataService';

// ============================================
// 级别徽章颜色
// ============================================

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  exempt: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  quick: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  standard: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  strict: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const getLevelIcon = (levelCode: string) => {
  switch (levelCode) {
    case 'exempt': return <CheckCircle className="w-5 h-5" />;
    case 'quick': return <Zap className="w-5 h-5" />;
    case 'standard': return <Users className="w-5 h-5" />;
    case 'strict': return <AlertTriangle className="w-5 h-5" />;
    default: return <Shield className="w-5 h-5" />;
  }
};

const formatAmount = (amount: number) => {
  if (amount === Infinity || amount >= 999999999) return '无上限';
  return `¥${amount.toLocaleString()}`;
};

// ============================================
// 金额阈值编辑弹窗
// ============================================

function ThresholdModal({
  open,
  onClose,
  onSave,
  editItem,
  levelConfigs,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ApprovalAmountThresholdItem>) => void;
  editItem?: ApprovalAmountThresholdItem | null;
  levelConfigs: ApprovalLevelConfigItem[];
}) {
  const [maxAmount, setMaxAmount] = useState('');
  const [levelCode, setLevelCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setMaxAmount(String(editItem.maxAmount || ''));
      setLevelCode(editItem.levelCode || '');
    } else {
      setMaxAmount('');
      setLevelCode('');
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!maxAmount.trim() || !levelCode) return;
    setSaving(true);
    try {
      await onSave({ maxAmount: Number(maxAmount), levelCode });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? '编辑金额阈值' : '新增金额阈值'}>
      <div className="space-y-4">
        <div>
          <Label>金额上限（元）*</Label>
          <NumberInput
            value={maxAmount}
            onChange={setMaxAmount}
            placeholder="如: 5000"
            decimals={0}
          />
          <p className="text-xs text-gray-500 mt-1">
            {editItem ? '修改此阈值对应的金额上限' : '金额小于此值的申请将匹配此级别'}
          </p>
        </div>
        <div>
          <Label>审批级别 *</Label>
          <Select value={levelCode} onValueChange={setLevelCode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-- 请选择级别 --</SelectItem>
              {levelConfigs.map((lc) => (
                <SelectItem key={lc.levelCode} value={lc.levelCode}>
                  {lc.levelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// 级别配置编辑弹窗
// ============================================

function LevelConfigModal({
  open,
  onClose,
  onSave,
  editItem,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ApprovalLevelConfigItem>) => void;
  editItem?: ApprovalLevelConfigItem | null;
}) {
  const [levelName, setLevelName] = useState('');
  const [description, setDescription] = useState('');
  const [approverCount, setApproverCount] = useState('');
  const [requireMultiApprover, setRequireMultiApprover] = useState(false);
  const [approverRoles, setApproverRoles] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setLevelName(editItem.levelName || '');
      setDescription(editItem.description || '');
      setApproverCount(String(editItem.approverCount ?? ''));
      setRequireMultiApprover(!!editItem.requireMultiApprover);
      setApproverRoles(Array.isArray(editItem.approverRoles) ? editItem.approverRoles.join(', ') : '');
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!levelName.trim()) return;
    setSaving(true);
    try {
      const roles = approverRoles.trim()
        ? approverRoles.split(',').map((r) => r.trim()).filter(Boolean)
        : [];
      await onSave({
        levelName: levelName.trim(),
        description: description.trim(),
        approverCount: Number(approverCount) || 0,
        requireMultiApprover: requireMultiApprover ? 1 : 0,
        approverRoles: roles.length > 0 ? roles : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`编辑 - ${editItem?.levelName || ''}`}>
      <div className="space-y-4">
        <div>
          <Label>级别名称 *</Label>
          <Input value={levelName} onChange={(e) => setLevelName(e.target.value)} />
        </div>
        <div>
          <Label>级别描述</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>审批人数</Label>
            <NumberInput
              value={approverCount}
              onChange={setApproverCount}
              decimals={0}
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={requireMultiApprover}
                onCheckedChange={(checked) => setRequireMultiApprover(!!checked)}
              />
              <span className="text-sm text-gray-700">需要多审</span>
            </label>
          </div>
        </div>
        <div>
          <Label>审批人角色（逗号分隔）</Label>
          <Input
            value={approverRoles}
            onChange={(e) => setApproverRoles(e.target.value)}
            placeholder="如: department_head, manager, director"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// 类型规则编辑弹窗
// ============================================

function TypeRuleModal({
  open,
  onClose,
  onSave,
  editItem,
  levelConfigs,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ApprovalTypeRuleItem>) => void;
  editItem?: ApprovalTypeRuleItem | null;
  levelConfigs: ApprovalLevelConfigItem[];
}) {
  const [forceExempt, setForceExempt] = useState(false);
  const [forceStrict, setForceStrict] = useState(false);
  const [forcedLevel, setForcedLevel] = useState('');
  const [batchApprovalSupported, setBatchApprovalSupported] = useState(false);
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForceExempt(!!editItem.forceExempt);
      setForceStrict(!!editItem.forceStrict);
      setForcedLevel(editItem.forcedLevel || '');
      setBatchApprovalSupported(!!editItem.batchApprovalSupported);
      setRemark(editItem.remark || '');
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        forceExempt: forceExempt ? 1 : 0,
        forceStrict: forceStrict ? 1 : 0,
        forcedLevel: forcedLevel || null,
        batchApprovalSupported: batchApprovalSupported ? 1 : 0,
        remark: remark.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`编辑规则 - ${editItem ? getApprovalTypeName(editItem.approvalType as ApprovalType) : ''}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={forceExempt}
              onCheckedChange={(checked) => {
                setForceExempt(!!checked);
                if (checked) { setForceStrict(false); setForcedLevel(''); }
              }}
            />
            <span className="text-sm text-gray-700">强制免审</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={forceStrict}
              onCheckedChange={(checked) => {
                setForceStrict(!!checked);
                if (checked) { setForceExempt(false); setForcedLevel(''); }
              }}
            />
            <span className="text-sm text-gray-700">强制严格</span>
          </div>
        </div>
        <div>
          <Label>自定义审批级别（可选，优先级最高）</Label>
          <Select
            value={forcedLevel}
            onValueChange={(val) => {
              setForcedLevel(val);
              if (val) { setForceExempt(false); setForceStrict(false); }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-- 不指定（按金额）--</SelectItem>
              {levelConfigs.map((lc) => (
                <SelectItem key={lc.levelCode} value={lc.levelCode}>
                  {lc.levelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={batchApprovalSupported}
            onCheckedChange={(checked) => setBatchApprovalSupported(!!checked)}
          />
          <span className="text-sm text-gray-700">支持批量审批</span>
        </div>
        <div>
          <Label>备注</Label>
          <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// 删除确认弹窗
// ============================================

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title="确认删除">
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
          <Button variant="destructive" onClick={onConfirm}><Trash2 className="w-4 h-4" /> 确认删除</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// 主页面组件
// ============================================

export default function ApprovalLevelConfig() {
  const {
    levelConfigs,
    amountThresholds,
    typeRules,
    loading,
    loadAll,
    updateLevelConfig,
    addAmountThreshold,
    updateAmountThreshold,
    removeAmountThreshold,
    updateTypeRule,
  } = useApprovalLevelStore();

  const [activeTab, setActiveTab] = useState<'thresholds' | 'levels' | 'rules'>('thresholds');

  // 弹窗状态
  const [thresholdModal, setThresholdModal] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<ApprovalAmountThresholdItem | null>(null);
  const [levelModal, setLevelModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ApprovalLevelConfigItem | null>(null);
  const [ruleModal, setRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalTypeRuleItem | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApprovalAmountThresholdItem | null>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 按 sortOrder 排序阈值
  const sortedThresholds = [...amountThresholds].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // 按 sortOrder 排序级别配置
  const sortedLevelConfigs = [...levelConfigs].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleSaveThreshold = async (data: Partial<ApprovalAmountThresholdItem>) => {
    if (editingThreshold) {
      await updateAmountThreshold(editingThreshold.id, data);
    } else {
      await addAmountThreshold(data);
    }
  };

  const handleDeleteThreshold = async () => {
    if (!deleteTarget) return;
    await removeAmountThreshold(deleteTarget.id);
    setDeleteModal(false);
    setDeleteTarget(null);
  };

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
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">分级审批配置</h1>
              <p className="text-gray-500">配置审批级别、金额阈值和审批规则</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex border-b border-gray-200">
          {(['thresholds', 'levels', 'rules'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab === 'thresholds' && '金额阈值配置'}
              {tab === 'levels' && '审批级别说明'}
              {tab === 'rules' && '类型规则配置'}
            </button>
          ))}
        </div>

        {/* Tab内容 */}
        <div className="p-6">
          {/* 金额阈值配置 */}
          {activeTab === 'thresholds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">金额阈值配置</h2>
                  <p className="text-sm text-gray-500">配置不同金额区间对应的审批级别</p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setEditingThreshold(null);
                    setThresholdModal(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  新增阈值
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : (
                <div className="space-y-3">
                  {sortedThresholds.map((threshold, index) => {
                    const colors = LEVEL_COLORS[threshold.levelCode] || LEVEL_COLORS.standard;
                    const prevMax = index > 0 ? sortedThresholds[index - 1].maxAmount : 0;
                    return (
                      <div
                        key={threshold.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-white ${colors.text}`}>
                            {getLevelIcon(threshold.levelCode)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${colors.text}`}>
                                {levelConfigs.find((l) => l.levelCode === threshold.levelCode)?.levelName || threshold.levelCode}
                              </span>
                              {threshold.levelCode === 'exempt' && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">自动通过</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {index === 0
                                ? `金额 < ${formatAmount(threshold.maxAmount)}`
                                : `${formatAmount(prevMax)} ≤ 金额 < ${formatAmount(threshold.maxAmount)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-4">
                            <p className={`font-semibold ${colors.text}`}>
                              {levelConfigs.find((l) => l.levelCode === threshold.levelCode)?.approverCount === 0
                                ? '无需审批'
                                : `需要 ${levelConfigs.find((l) => l.levelCode === threshold.levelCode)?.approverCount || 0} 位审批人`}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="编辑"
                            onClick={() => {
                              setEditingThreshold(threshold);
                              setThresholdModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            title="删除"
                            onClick={() => {
                              setDeleteTarget(threshold);
                              setDeleteModal(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 严格审批 - 无上限（始终显示在最后） */}
              <div className="p-4 rounded-lg border bg-red-50 border-red-200 mt-3">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-white text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-700">严格审批</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {sortedThresholds.length > 0
                        ? `金额 ≥ ${formatAmount(sortedThresholds[sortedThresholds.length - 1].maxAmount)}`
                        : '所有金额'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">配置说明</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 金额阈值按照从小到大的顺序匹配，第一个匹配的阈值决定审批级别</li>
                  <li>• 超过所有阈值的金额将自动进入严格审批</li>
                  <li>• 免审批（金额 &lt; 第一个阈值）自动通过，无需人工操作</li>
                  <li>• 可新增、编辑、删除阈值，修改后立即生效</li>
                </ul>
              </div>
            </div>
          )}

          {/* 审批级别说明 */}
          {activeTab === 'levels' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">审批级别说明</h2>
                <p className="text-sm text-gray-500">各审批级别的详细说明和配置要求，点击编辑可修改</p>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedLevelConfigs.map((config) => {
                    const colors = LEVEL_COLORS[config.levelCode] || LEVEL_COLORS.standard;
                    return (
                      <div
                        key={config.id}
                        className={`p-5 rounded-lg border ${colors.bg} ${colors.border}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-white ${colors.text}`}>
                              {getLevelIcon(config.levelCode)}
                            </div>
                            <div>
                              <h3 className={`font-semibold ${colors.text}`}>{config.levelName}</h3>
                              <p className="text-xs text-gray-500">{config.description}</p>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="编辑"
                            onClick={() => {
                              setEditingLevel(config);
                              setLevelModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">审批人数：</span>
                            <span className="font-medium">{config.approverCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">需要多审：</span>
                            <span className="font-medium">
                              {config.requireMultiApprover ? '是' : '否'}
                            </span>
                          </div>
                          {config.approverRoles && Array.isArray(config.approverRoles) && config.approverRoles.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">审批人角色：</span>
                              <span className="font-medium">
                                {config.approverRoles.join(' → ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 类型规则配置 */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">类型规则配置</h2>
                <p className="text-sm text-gray-500">各审批类型的特殊规则配置，点击操作列编辑</p>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left py-3 px-4 text-sm font-medium text-gray-600">审批类型</TableHead>
                      <TableHead className="text-center py-3 px-4 text-sm font-medium text-gray-600">强制级别</TableHead>
                      <TableHead className="text-center py-3 px-4 text-sm font-medium text-gray-600">批量审批</TableHead>
                      <TableHead className="text-left py-3 px-4 text-sm font-medium text-gray-600">备注</TableHead>
                      <TableHead className="text-center py-3 px-4 text-sm font-medium text-gray-600">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeRules.map((rule) => {
                      const hasForceRule = rule.forceExempt || rule.forceStrict || rule.forcedLevel;
                      let forceColors = LEVEL_COLORS.standard;
                      if (rule.forceExempt) forceColors = LEVEL_COLORS.exempt;
                      else if (rule.forceStrict) forceColors = LEVEL_COLORS.strict;
                      else if (rule.forcedLevel) forceColors = LEVEL_COLORS[rule.forcedLevel] || LEVEL_COLORS.standard;

                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="py-3 px-4">
                            <span className="font-medium text-gray-900">
                              {getApprovalTypeName(rule.approvalType as ApprovalType)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            {hasForceRule ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${forceColors.bg} ${forceColors.text}`}>
                                {rule.forceExempt && '强制免审'}
                                {rule.forceStrict && '强制严格'}
                                {rule.forcedLevel && (levelConfigs.find((l) => l.levelCode === rule.forcedLevel)?.levelName || rule.forcedLevel)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">按金额</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              rule.batchApprovalSupported
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {rule.batchApprovalSupported ? '支持' : '不支持'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm text-gray-500">
                            {rule.remark || '-'}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="编辑"
                              onClick={() => {
                                setEditingRule(rule);
                                setRuleModal(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2">特殊规则说明</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• <strong>强制免审</strong>：无论金额大小，该类型申请自动通过</li>
                  <li>• <strong>强制严格</strong>：无论金额大小，该类型需要多级审批</li>
                  <li>• <strong>自定义级别</strong>：指定固定的审批级别，优先级最高</li>
                  <li>• <strong>按金额</strong>：根据申请金额自动确定审批级别</li>
                  <li>• <strong>批量审批</strong>：该类型支持批量审批操作</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 金额阈值弹窗 */}
      <ThresholdModal
        open={thresholdModal}
        onClose={() => { setThresholdModal(false); setEditingThreshold(null); }}
        onSave={handleSaveThreshold}
        editItem={editingThreshold}
        levelConfigs={sortedLevelConfigs}
      />

      {/* 级别配置弹窗 */}
      <LevelConfigModal
        open={levelModal}
        onClose={() => { setLevelModal(false); setEditingLevel(null); }}
        onSave={async (data) => {
          if (editingLevel) await updateLevelConfig(editingLevel.id, data);
          setLevelModal(false);
          setEditingLevel(null);
        }}
        editItem={editingLevel}
      />

      {/* 类型规则弹窗 */}
      <TypeRuleModal
        open={ruleModal}
        onClose={() => { setRuleModal(false); setEditingRule(null); }}
        onSave={async (data) => {
          if (editingRule) await updateTypeRule(editingRule.id, data);
          setRuleModal(false);
          setEditingRule(null);
        }}
        editItem={editingRule}
        levelConfigs={sortedLevelConfigs}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        open={deleteModal}
        onClose={() => { setDeleteModal(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteThreshold}
        message={`确定要删除金额阈值为 ${formatAmount(deleteTarget?.maxAmount || 0)} 的配置吗？`}
      />
    </div>
  );
}
