// ============================================================
// 分级审批配置管理页面
// 文件路径：src/pages/ApprovalLevelConfig.tsx
// 功能：管理分级审批的金额阈值、级别配置和审批规则
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Zap,
  Users,
  X,
} from 'lucide-react';
import {
  ApprovalLevel,
  ApprovalLevelConfig as ApprovalLevelConfigType,
  APPROVAL_LEVEL_CONFIGS,
  AMOUNT_THRESHOLDS,
  TYPE_SPECIFIC_CONFIGS,
  getTypeSpecificConfig,
} from '../config/approvalHierarchy';
import { getApprovalLevelName } from '../utils/approvalLevelResolver';
import { ApprovalType, getApprovalTypeName } from '../types/approval';
import { Button } from '../components/ui/button';

// ============================================================
// 类型定义
// ============================================================

interface AmountThresholdDisplay {
  max: number;
  level: ApprovalLevel;
  levelName: string;
}

interface TypeConfigDisplay {
  type: ApprovalType;
  typeName: string;
  forceExempt?: boolean;
  forceStrict?: boolean;
  forcedLevel?: ApprovalLevel;
  batchApprovalSupported: boolean;
  remark?: string;
}

// ============================================================
// 级别徽章颜色
// ============================================================

const LEVEL_COLORS: Record<ApprovalLevel, { bg: string; text: string; border: string }> = {
  [ApprovalLevel.EXEMPT]: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  [ApprovalLevel.QUICK]: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  [ApprovalLevel.STANDARD]: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  [ApprovalLevel.STRICT]: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

// ============================================================
// 页面组件
// ============================================================

export default function ApprovalLevelConfig() {
  // 状态
  const [activeTab, setActiveTab] = useState<'thresholds' | 'levels' | 'rules'>('thresholds');
  const [thresholds, setThresholds] = useState<AmountThresholdDisplay[]>([]);
  const [typeConfigs, setTypeConfigs] = useState<TypeConfigDisplay[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<AmountThresholdDisplay | null>(null);

  // 加载数据
  useEffect(() => {
    loadThresholds();
    loadTypeConfigs();
  }, []);

  const loadThresholds = () => {
    // 将金额阈值配置转换为显示格式
    const displayThresholds: AmountThresholdDisplay[] = AMOUNT_THRESHOLDS.map(t => ({
      ...t,
      levelName: getApprovalLevelName(t.level),
    }));

    // 添加最后一个层级（严格审批，无上限）
    displayThresholds.push({
      max: Infinity,
      level: ApprovalLevel.STRICT,
      levelName: getApprovalLevelName(ApprovalLevel.STRICT),
    });

    setThresholds(displayThresholds);
  };

  const loadTypeConfigs = () => {
    const configs: TypeConfigDisplay[] = TYPE_SPECIFIC_CONFIGS.map(config => ({
      type: config.type,
      typeName: getApprovalTypeName(config.type),
      forceExempt: config.forceExempt,
      forceStrict: config.forceStrict,
      forcedLevel: config.forcedLevel,
      batchApprovalSupported: config.batchApprovalSupported,
      remark: config.remark,
    }));
    setTypeConfigs(configs);
  };

  // 获取级别的图标
  const getLevelIcon = (level: ApprovalLevel) => {
    switch (level) {
      case ApprovalLevel.EXEMPT:
        return <CheckCircle className="w-5 h-5" />;
      case ApprovalLevel.QUICK:
        return <Zap className="w-5 h-5" />;
      case ApprovalLevel.STANDARD:
        return <Users className="w-5 h-5" />;
      case ApprovalLevel.STRICT:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    if (amount === Infinity) return '无上限';
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">分级审批配置</h1>
              <p className="text-gray-500">配置审批级别、金额阈值和审批规则</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex border-b border-gray-200">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('thresholds')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'thresholds'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            金额阈值配置
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('levels')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'levels'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            审批级别说明
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'rules'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            类型规则配置
          </Button>
        </div>

        {/* Tab内容 */}
        <div className="p-6">
          {/* 金额阈值配置 */}
          {activeTab === 'thresholds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">金额阈值配置</h2>
                <p className="text-sm text-gray-500">配置不同金额区间对应的审批级别</p>
              </div>

              <div className="space-y-3">
                {thresholds.map((threshold, index) => {
                  const colors = LEVEL_COLORS[threshold.level];
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-white ${colors.text}`}>
                          {getLevelIcon(threshold.level)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${colors.text}`}>
                              {threshold.levelName}
                            </span>
                            {threshold.level === ApprovalLevel.EXEMPT && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                自动通过
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {index === 0
                              ? `金额 &lt; ${formatAmount(threshold.max)}`
                              : index === thresholds.length - 1
                              ? `金额 ≥ ${formatAmount(thresholds[index - 1]?.max || 0)}`
                              : `${formatAmount(thresholds[index - 1]?.max || 0)} ≤ 金额 &lt; ${formatAmount(threshold.max)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${colors.text}`}>
                          {APPROVAL_LEVEL_CONFIGS[threshold.level].approverCount === 0
                            ? '无需审批'
                            : `需要 ${APPROVAL_LEVEL_CONFIGS[threshold.level].approverCount} 位审批人`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">配置说明</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 金额阈值按照从小到大的顺序匹配</li>
                  <li>• 系统会自动根据申请金额确定对应的审批级别</li>
                  <li>• 免审批（0元阈值）自动通过，无需人工操作</li>
                  <li>• 如需修改阈值配置，请联系系统管理员</li>
                </ul>
              </div>
            </div>
          )}

          {/* 审批级别说明 */}
          {activeTab === 'levels' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">审批级别说明</h2>
                <p className="text-sm text-gray-500">各审批级别的详细说明和配置要求</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(ApprovalLevel).map(level => {
                  const config = APPROVAL_LEVEL_CONFIGS[level];
                  const colors = LEVEL_COLORS[level];

                  return (
                    <div
                      key={level}
                      className={`p-5 rounded-lg border ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg bg-white ${colors.text}`}>
                          {getLevelIcon(level)}
                        </div>
                        <div>
                          <h3 className={`font-semibold ${colors.text}`}>{config.name}</h3>
                          <p className="text-xs text-gray-500">{config.description}</p>
                        </div>
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
                        {config.approverRoles && (
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
            </div>
          )}

          {/* 类型规则配置 */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">类型规则配置</h2>
                <p className="text-sm text-gray-500">各审批类型的特殊规则配置</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">审批类型</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">强制级别</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">批量审批</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeConfigs.map(config => {
                      const hasForceRule = config.forceExempt || config.forceStrict || config.forcedLevel;
                      const colors = hasForceRule
                        ? LEVEL_COLORS[config.forcedLevel || config.forceStrict ? ApprovalLevel.STRICT : ApprovalLevel.EXEMPT]
                        : { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

                      return (
                        <tr key={config.type} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">{config.typeName}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {hasForceRule ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                                {config.forceExempt && '强制免审'}
                                {config.forceStrict && '强制严格'}
                                {config.forcedLevel && getApprovalLevelName(config.forcedLevel)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">按金额</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              config.batchApprovalSupported
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {config.batchApprovalSupported ? '支持' : '不支持'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {config.remark || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2">特殊规则说明</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• <strong>强制免审</strong>：无论金额大小，该类型申请自动通过</li>
                  <li>• <strong>强制严格</strong>：无论金额大小，该类型需要多级审批</li>
                  <li>• <strong>按金额</strong>：根据申请金额自动确定审批级别</li>
                  <li>• <strong>批量审批</strong>：该类型支持批量审批操作</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
