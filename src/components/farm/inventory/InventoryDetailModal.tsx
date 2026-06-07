/**
 * 库存详情弹窗（合并基本信息 + 操作历史 + 上下游追溯）
 * 入口：点击库存列表的"实例ID"列
 * - 替代原 InventoryTraceModal（追溯并入"上下游追溯" Tab）
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  X, Package, Leaf, Sprout, History, GitBranch, Info,
  TrendingUp, TrendingDown, Snowflake, Lock, Unlock, Edit3,
  RefreshCw, AlertCircle, HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Tooltip } from '@/components/ui';
import {
  StockType,
  InventoryStock,
  InventoryTransaction,
  TransactionType,
  TraceResult,
  DownstreamTraceResult,
} from '../../../types/inventory';
import {
  getTransactions,
  getFreezes,
  traceUpstream,
  traceDownstream,
} from '../../../services/inventoryService';
import {
  QUALITY_GRADE_MAP,
  INVENTORY_STATUS_MAP,
  getPlantingModeLabel,
  SOURCE_ORIGIN_MAP,
} from '../../../constants/cropConstants';

type TabKey = 'basic' | 'history' | 'trace';

interface InventoryDetailModalProps {
  isOpen: boolean;
  stock: InventoryStock | null;
  onClose: () => void;
}

const getStockTypeIcon = (stockType: StockType | string) => {
  switch (stockType) {
    case StockType.SEED:     case 'seed':     return <Leaf className="w-4 h-4 text-amber-600" />;
    case StockType.SEEDLING: case 'seedling': return <Sprout className="w-4 h-4 text-green-600" />;
    case StockType.PRODUCT:  case 'product':  return <Package className="w-4 h-4 text-emerald-600" />;
    default: return <Package className="w-4 h-4 text-gray-600" />;
  }
};

const getStockTypeLabel = (stockType: StockType | string) => {
  switch (stockType) {
    case StockType.SEED:     case 'seed':     return '种源';
    case StockType.SEEDLING: case 'seedling': return '种苗';
    case StockType.PRODUCT:  case 'product':  return '成品';
    default: return '未知';
  }
};

const TX_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  inbound:  { label: '入库',  icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  outbound: { label: '出库',  icon: <TrendingDown className="w-3.5 h-3.5" />, color: 'text-red-600 bg-red-50 border-red-200' },
  freeze:   { label: '冻结',  icon: <Snowflake className="w-3.5 h-3.5" />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  unfreeze: { label: '解冻',  icon: <Unlock className="w-3.5 h-3.5" />, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  transfer: { label: '调拨',  icon: <GitBranch className="w-3.5 h-3.5" />, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  adjust:   { label: '调整',  icon: <Edit3 className="w-3.5 h-3.5" />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
};

// 业务类型英文 → 中文映射
const BUSINESS_TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  seed_source: { label: '种源管理', bg: 'bg-lime-100',     text: 'text-lime-700' },
  seedling:    { label: '育苗管理', bg: 'bg-green-100',    text: 'text-green-700' },
  planting:    { label: '种植管理', bg: 'bg-teal-100',     text: 'text-teal-700' },
  harvest:     { label: '采收入库', bg: 'bg-orange-100',   text: 'text-orange-700' },
  purchase:    { label: '采购入库', bg: 'bg-blue-100',     text: 'text-blue-700' },
  manual:      { label: '手动新建', bg: 'bg-slate-100',    text: 'text-slate-700' },
  other:       { label: '其他',     bg: 'bg-gray-100',     text: 'text-gray-700' },
};

export function InventoryDetailModal({ isOpen, stock, onClose }: InventoryDetailModalProps) {
  const [tab, setTab] = useState<TabKey>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 数据
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [freezes, setFreezes] = useState<unknown[]>([]);
  const [upstream, setUpstream] = useState<TraceResult[]>([]);
  const [downstream, setDownstream] = useState<DownstreamTraceResult[]>([]);

  const loadAllData = useCallback(async () => {
    if (!stock?.instanceId) return;
    setLoading(true);
    setError(null);
    try {
      const [txs, fzs, ups, downs] = await Promise.all([
        getTransactions(stock.instanceId).catch(() => []),
        getFreezes(stock.instanceId).catch(() => []),
        traceUpstream(stock.instanceId, 5).catch(() => []),
        traceDownstream(stock.instanceId, 5).catch(() => []),
      ]);
      setTransactions(txs);
      setFreezes(fzs);
      setUpstream(ups);
      setDownstream(downs);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [stock?.instanceId]);

  useEffect(() => {
    if (isOpen && stock?.instanceId) {
      setTab('basic');
      loadAllData();
    }
  }, [isOpen, stock?.instanceId, loadAllData]);

  if (!isOpen || !stock) return null;

  const sourceInfo = SOURCE_ORIGIN_MAP[stock.sourceType];
  const statusInfo = INVENTORY_STATUS_MAP[stock.status] || { label: stock.status, bg: 'bg-gray-500', text: 'text-white' };
  const gradeInfo = stock.grade ? QUALITY_GRADE_MAP[stock.grade] : null;
  const available = (stock.currentQuantity ?? 0) - (stock.frozenQuantity ?? 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
          <div className="flex items-center gap-3 text-white">
            {getStockTypeIcon(stock.stockType)}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {getStockTypeLabel(stock.stockType)}库存详情
                <span className={`px-2 py-0.5 ${statusInfo.bg} ${statusInfo.text} text-xs rounded`}>
                  {statusInfo.label}
                </span>
              </h3>
              <p className="text-sm text-emerald-100 font-mono mt-0.5">实例ID: {stock.instanceId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadAllData}
              className="text-white hover:bg-emerald-700"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-emerald-700"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-4 flex items-center gap-1 bg-gray-50">
          <TabBtn current={tab} value="basic"   icon={<Info    className="w-4 h-4" />}    label="基本信息" count={null} onClick={setTab} />
          <TabBtn current={tab} value="history" icon={<History className="w-4 h-4" />}    label="操作历史" count={transactions.length} onClick={setTab} />
          <TabBtn current={tab} value="trace"   icon={<GitBranch className="w-4 h-4" />} label="上下游追溯" count={upstream.length + downstream.length} onClick={setTab} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {tab === 'basic'   && <BasicTab stock={stock} sourceInfo={sourceInfo} statusInfo={statusInfo} gradeInfo={gradeInfo} available={available} freezesCount={freezes.length} />}
          {tab === 'history' && <HistoryTab transactions={transactions} loading={loading} />}
          {tab === 'trace'   && <TraceTab upstream={upstream} downstream={downstream} loading={loading} />}
        </div>
      </div>
    </div>
  );
}

// ============ 子组件 ============

interface TabBtnProps {
  current: TabKey;
  value: TabKey;
  icon: React.ReactNode;
  label: string;
  count: number | null;
  onClick: (k: TabKey) => void;
}
function TabBtn({ current, value, icon, label, count, onClick }: TabBtnProps) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-4 py-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
        active
          ? 'text-emerald-600 border-emerald-600 bg-white'
          : 'text-gray-600 border-transparent hover:text-emerald-600 hover:bg-white/50'
      }`}
    >
      {icon}
      {label}
      {count !== null && count > 0 && (
        <span className={`px-1.5 py-0.5 text-xs rounded ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ---------- 基本信息 Tab ----------
function BasicTab({
  stock, sourceInfo, statusInfo, gradeInfo, available, freezesCount,
}: {
  stock: InventoryStock;
  sourceInfo: any;
  statusInfo: any;
  gradeInfo: any;
  available: number;
  freezesCount: number;
}) {
  const availableRatio = (stock.currentQuantity ?? 0) > 0
    ? Math.round((available / (stock.currentQuantity ?? 0)) * 100)
    : 0;

  // 字段分组（每组用不同淡色底色 + 对应深色边框标题栏）
  const sections: Array<{
    title: string;
    bg: string;        // 卡片底色
    border: string;    // 标题栏下边框
    text: string;      // 标题文字色
    items: Array<[string, React.ReactNode]>;
  }> = [
    {
      title: '基础信息',
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-700',
      items: [
        ['实例ID',     <span className="font-mono">{stock.instanceId}</span>],
        ['业务ID',     <span className="font-mono">{stock.businessId || '-'}</span>],
        ['业务类型',   (() => {
          const info = BUSINESS_TYPE_META[stock.businessType];
          if (info) return <span className={`px-2 py-0.5 ${info.bg} ${info.text} text-xs rounded font-medium`}>{info.label}</span>;
          return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{stock.businessType || '-'}</span>;
        })()],
        ['业务编号',   stock.extensions?.businessCode || stock.remarks || '-'],
        ['状态',       <span className={`px-2 py-0.5 ${statusInfo.bg} ${statusInfo.text} text-xs rounded font-medium`}>{statusInfo.label}</span>],
        ['乐观锁版本', (
          <span className="inline-flex items-center gap-1">
            <span className="font-mono text-gray-500">v{stock.version ?? 1}</span>
            <Tooltip
              position="top"
              multiline
              maxWidth={320}
              content={
                <div className="text-left">
                  <div className="font-medium mb-1">数据版本号</div>
                  <div className="text-xs text-gray-300 leading-relaxed">
                    每次状态变更（出库/冻结/调整等）自动 +1。用于多人同时操作时防止数据被覆盖：后端会校验版本，过期的修改会被拒绝并提示刷新。
                  </div>
                </div>
              }
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500 cursor-help" />
            </Tooltip>
          </span>
        )],
      ],
    },
    {
      title: '品种信息',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-700',
      items: [
        ['库存类型', <span className="flex items-center gap-1">{getStockTypeIcon(stock.stockType)}{getStockTypeLabel(stock.stockType)}</span>],
        ['作物名称', stock.cropName || '-'],
        ['作物编码', <span className="font-mono text-emerald-600">{stock.cropCode || '-'}</span>],
        ['品种',     stock.varietyName || '-'],
        ['种植模式', getPlantingModeLabel(stock.plantingMode) || '-'],
        ['采收区域', stock.greenhouseName || '-'],
        ['品质等级', gradeInfo
          ? <span className={`px-2 py-0.5 ${gradeInfo.bg} ${gradeInfo.text} text-xs rounded font-medium`}>{gradeInfo.label}</span>
          : (stock.grade || '-')],
      ],
    },
    {
      title: '数量信息',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      items: [
        ['当前数量', <span className="font-mono font-semibold text-lg text-emerald-600">{stock.currentQuantity} {stock.unit}</span>],
        ['已冻结',   <span className="font-mono text-blue-600">{stock.frozenQuantity} {stock.unit}</span>],
        ['可用数量', <span className="font-mono font-medium">{available} {stock.unit} <span className="text-xs text-gray-500">({availableRatio}%)</span></span>],
        ['目标产量', stock.targetYield ? `${stock.targetYield} ${stock.unit}` : '-'],
        ['冻结记录', <span className="text-blue-600">{freezesCount} 条</span>],
      ],
    },
    {
      title: '来源信息',
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      text: 'text-purple-700',
      items: [
        ['入库来源', sourceInfo
          ? <span className={`px-2 py-0.5 ${sourceInfo.bg} ${sourceInfo.text} text-xs rounded font-medium`}>{sourceInfo.label}</span>
          : (stock.sourceType || '-')],
        ['供应商',   stock.supplierName || '-'],
        ['基地',     stock.baseName || '-'],
        ['生产计划', stock.productionPlanCode || '-'],
        ['上游实例', <span className="font-mono">{stock.sourceInstanceId || '-'}</span>],
        ['入库日期', stock.inboundDate ? new Date(stock.inboundDate).toLocaleDateString('zh-CN') : '-'],
        ['最后出库', stock.lastOutboundDate ? new Date(stock.lastOutboundDate).toLocaleDateString('zh-CN') : '-'],
        ['过期日期', stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString('zh-CN') : '-'],
      ],
    },
    {
      title: '仓库与审核',
      bg: 'bg-slate-50',
      border: 'border-slate-300',
      text: 'text-slate-700',
      items: [
        ['仓库',     stock.warehouseName || '-'],
        ['审核人',   stock.auditor || '-'],
        ['备注',     <span className="text-gray-600">{stock.remarks || '-'}</span>],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        <div key={i} className={`${sec.bg} rounded-lg p-4 border ${sec.border.replace('border-', 'border-').replace('-300', '-200')}`}>
          <h4 className={`text-sm font-semibold ${sec.text} mb-3 border-b ${sec.border} pb-1.5`}>
            {sec.title}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
            {sec.items.map(([label, value], j) => (
              <div key={j} className="flex flex-col">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-sm text-gray-900 mt-0.5 break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- 操作历史 Tab ----------
function HistoryTab({ transactions, loading }: { transactions: InventoryTransaction[]; loading: boolean }) {
  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>暂无操作历史</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 mb-2">共 {transactions.length} 条操作记录（按时间倒序）</div>
      {transactions.map((tx) => {
        const meta = TX_TYPE_META[tx.transactionType] || { label: tx.transactionType, icon: <Edit3 className="w-3.5 h-3.5" />, color: 'text-gray-600 bg-gray-50 border-gray-200' };
        const isOut = tx.transactionType === 'outbound' || tx.transactionType === 'unfreeze' || tx.transactionType === 'adjust' && tx.quantity < 0;
        return (
          <div key={tx.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm">
            <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${meta.color}`}>
              {meta.icon}
              {meta.label}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">数量:</span>
                <span className={`font-mono font-semibold ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                  {tx.quantity > 0 && !isOut ? '+' : ''}{tx.quantity}
                </span>
                <span className="text-gray-400 text-xs ml-2">
                  {tx.balanceBefore} → {tx.balanceAfter}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                <span>操作人: {tx.operatorName || '-'}</span>
                <span>·</span>
                <span>{tx.operateDate ? new Date(tx.operateDate).toLocaleString('zh-CN') : '-'}</span>
                {tx.businessType && (
                  <>
                    <span>·</span>
                    <span>业务: {BUSINESS_TYPE_META[tx.businessType]?.label || tx.businessType}</span>
                  </>
                )}
                {tx.businessCode && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{tx.businessCode}</span>
                  </>
                )}
              </div>
              {tx.remarks && (
                <div className="text-xs text-gray-600 mt-1 italic">备注: {tx.remarks}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- 上下游追溯 Tab ----------
function TraceTab({
  upstream, downstream, loading,
}: {
  upstream: TraceResult[];
  downstream: DownstreamTraceResult[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4 rotate-180" />
          上游来源 ({upstream.length})
        </h4>
        {upstream.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">无上游来源（最原始记录）</div>
        ) : (
          <div className="space-y-2">
            {upstream.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  {getStockTypeIcon(item.stockType)}
                  <span className="text-sm font-medium">{item.cropName}</span>
                </div>
                <div className="text-xs text-gray-500 font-mono">{item.instanceId}</div>
                <div className="text-xs text-gray-600 mt-1">数量: {item.quantity} · 入库: {item.inboundDate}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          下游去向 ({downstream.length})
        </h4>
        {downstream.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">无下游去向（未被任何后续业务使用）</div>
        ) : (
          <div className="space-y-2">
            {downstream.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  {getStockTypeIcon(item.stockType)}
                  <span className="text-sm font-medium">{item.businessId}</span>
                </div>
                <div className="text-xs text-gray-500 font-mono">{item.instanceId}</div>
                <div className="text-xs text-gray-600 mt-1">出库: {item.outboundQuantity} · 日期: {item.outboundDate}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
