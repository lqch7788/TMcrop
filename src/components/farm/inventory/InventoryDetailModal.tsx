/**
 * 库存详情弹窗（合并基本信息 + 操作历史 + 上下游追溯）
 * 入口：点击库存列表的"实例ID"列
 * - 替代原 InventoryTraceModal（追溯并入"上下游追溯" Tab）
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Package, Leaf, Sprout, History, GitBranch, Info,
  TrendingUp, TrendingDown, Snowflake, Lock, Unlock, Edit3,
  RefreshCw, AlertCircle, HelpCircle, ArrowUpRight,
} from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { Tooltip } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { showConfirm } from '@/lib/dialogService';
// 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
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
  getInventoryByInstanceId,
  unfreezeInventory,
} from '../../../services/inventoryService';
import {
  QUALITY_GRADE_MAP,
  INVENTORY_STATUS_MAP,
  getPlantingModeLabel,
  SOURCE_ORIGIN_MAP,
  SOURCE_ORIGIN_LABEL_MAP,
} from '../../../constants/cropConstants';
import { translateForm, translateArea } from '../../../constants/formDictionary';
import { useInventoryStore } from '../../../stores/useInventoryStore';

type TabKey = 'basic' | 'history' | 'trace';

interface InventoryDetailModalProps {
  isOpen: boolean;
  stock: InventoryStock | null;
  onClose: () => void;
  /** 2026-07-04：点击上下游追溯节点时触发，父组件更新 stock 后自动刷新详情 */
  onNavigateToInstance?: (instanceId: string) => void;
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
  inbound:       { label: '入库',  icon: <TrendingUp className="w-3.5 h-3.5" />,   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  outbound:      { label: '出库',  icon: <TrendingDown className="w-3.5 h-3.5" />,  color: 'text-red-600 bg-red-50 border-red-200' },
  freeze:        { label: '冻结',  icon: <Snowflake className="w-3.5 h-3.5" />,      color: 'text-blue-600 bg-blue-50 border-blue-200' },
  unfreeze:      { label: '解冻',  icon: <Unlock className="w-3.5 h-3.5" />,         color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  transfer:      { label: '调拨',  icon: <GitBranch className="w-3.5 h-3.5" />,     color: 'text-purple-600 bg-purple-50 border-purple-200' },
  // 2026-07-14：补全 transfer_in / transfer_out（数据库有 42+36 条记录）
  transfer_in:   { label: '调入',  icon: <TrendingUp className="w-3.5 h-3.5" />,    color: 'text-teal-600 bg-teal-50 border-teal-200' },
  transfer_out:  { label: '调出',  icon: <TrendingDown className="w-3.5 h-3.5" />,  color: 'text-orange-600 bg-orange-50 border-orange-200' },
  adjust:        { label: '调整',  icon: <Edit3 className="w-3.5 h-3.5" />,         color: 'text-amber-600 bg-amber-50 border-amber-200' },
};

// 业务类型英文 → 中文映射
const BUSINESS_TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  seed_source:        { label: '种源管理',   bg: 'bg-lime-100',     text: 'text-lime-700' },
  seedling:           { label: '育苗管理',   bg: 'bg-green-100',    text: 'text-green-700' },
  planting:           { label: '种植管理',   bg: 'bg-teal-100',     text: 'text-teal-700' },
  harvest:            { label: '采收入库',   bg: 'bg-orange-100',   text: 'text-orange-700' },
  purchase:           { label: '采购入库',   bg: 'bg-blue-100',     text: 'text-blue-700' },
  manual:             { label: '手动新建',   bg: 'bg-slate-100',    text: 'text-slate-700' },
  other:              { label: '其他',       bg: 'bg-gray-100',     text: 'text-gray-700' },
  // 2026-07-04：补全出库流水业务类型
  customer_sale:      { label: '客户销售',   bg: 'bg-rose-100',     text: 'text-rose-700' },
  damage_loss:        { label: '损坏损耗',   bg: 'bg-red-100',      text: 'text-red-700' },
  gift_sample:        { label: '赠送样品',   bg: 'bg-pink-100',     text: 'text-pink-700' },
  internal_planting:  { label: '内部种植',   bg: 'bg-teal-100',     text: 'text-teal-700' },
  order:              { label: '订单',       bg: 'bg-indigo-100',   text: 'text-indigo-700' },
  return_inbound:     { label: '退货入库',   bg: 'bg-purple-100',   text: 'text-purple-700' },
  transfer:           { label: '调拨',       bg: 'bg-cyan-100',     text: 'text-cyan-700' },
  transfer_out:       { label: '调拨出库',   bg: 'bg-cyan-100',     text: 'text-cyan-700' },
  inventory_transfer: { label: '库存调拨',   bg: 'bg-sky-100',      text: 'text-sky-700' },
  inbound:            { label: '入库',       bg: 'bg-emerald-100',  text: 'text-emerald-700' },
  outbound:           { label: '出库',       bg: 'bg-orange-100',   text: 'text-orange-700' },
  freeze:             { label: '冻结',       bg: 'bg-blue-100',     text: 'text-blue-700' },
  unfreeze:           { label: '解冻',       bg: 'bg-green-100',    text: 'text-green-700' },
  inventory_adjust:   { label: '库存调整',   bg: 'bg-yellow-100',   text: 'text-yellow-700' },
};

/**
 * 货币格式化：null/undefined → "-"
 * 2026-07-08 T7：财务信息"单价/总金额"专用
 */
function formatCurrency(value?: number | null): string {
  if (value == null) return '-';
  return `¥ ${value.toFixed(2)}`;
}

export function InventoryDetailModal({ isOpen, stock, onClose, onNavigateToInstance }: InventoryDetailModalProps) {
  const [tab, setTab] = useState<TabKey>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 数据
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [freezes, setFreezes] = useState<unknown[]>([]);
  const [upstream, setUpstream] = useState<TraceResult[]>([]);
  const [downstream, setDownstream] = useState<DownstreamTraceResult[]>([]);

  // 当 stock prop 不完整时（如从出库记录页仅传 instanceId），自动加载完整数据
  const [resolvedStock, setResolvedStock] = useState<InventoryStock | null>(null);
  const [resolving, setResolving] = useState(false);
  // 2026-07-14：加载失败时显示具体错误（之前失败时弹窗永远 skeleton）
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !stock?.instanceId) return;
    // 判断 stock 是否完整：缺少 cropName 和 stockType 就需要加载
    const isIncomplete = !stock.cropName && !stock.stockType;
    if (isIncomplete) {
      setResolving(true);
      // 2026-07-10 P0-6 修复：catch(() => {}) → catch(e) { console.error(...) }（之前失败时弹窗永远 skeleton）
      // 2026-07-14 修复：失败时设置 resolveError 状态，让 UI 不再永远 skeleton
      getInventoryByInstanceId(stock.instanceId).then((data) => {
        setResolvedStock(data);
        setResolving(false);
      }).catch((e) => {
        console.error('[InventoryDetailModal] resolveStock 失败:', e);
        setResolveError(e instanceof Error ? e.message : '加载库存详情失败');
        setResolving(false);
      });
    } else {
      setResolvedStock(null); // 使用 prop 数据
      setResolveError(null);
    }
  }, [isOpen, stock?.instanceId, stock?.cropName, stock?.stockType]);

  // 优先用 prop 完整数据，其次用 API 加载的数据
  const effectiveStock: InventoryStock | null = (!stock?.cropName && !stock?.stockType)
    ? resolvedStock
    : stock;

  const loadAllData = useCallback(async () => {
    if (!stock?.instanceId) return;
    setLoading(true);
    setError(null);
    try {
      const [txs, fzs, ups, downs] = await Promise.all([
        getTransactions(stock.instanceId),
        getFreezes(stock.instanceId),
        traceUpstream(stock.instanceId, 5),
        traceDownstream(stock.instanceId, 5),
      ]);
      setTransactions(txs);
      setFreezes(fzs);
      setUpstream(ups);
      setDownstream(downs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      setError(msg);
      console.error('[InventoryDetailModal] loadAllData failed:', e);
    } finally {
      setLoading(false);
    }
  }, [stock?.instanceId]);

  // 2026-07-14：订阅 inventoryVersion 触发跨页刷新（如编辑保存后弹窗自动 reload）
  const inventoryVersion = useInventoryStore((s) => s.version);
  useEffect(() => {
    if (isOpen && stock?.instanceId) {
      setTab('basic');
      loadAllData();
    }
    // inventoryVersion 加入依赖：写操作触发 notifyChange() 后弹窗自动重载
  }, [isOpen, stock?.instanceId, loadAllData, inventoryVersion]);

  if (!isOpen || !stock) return null;

  const sourceInfo = SOURCE_ORIGIN_MAP[effectiveStock?.sourceType ?? ''];
  // 2026-07-14：兜底不再显示原始英文 status（如 'in_stock'、'depleted'），统一显示"库存中"
  // 兼容历史脏数据（status='active' / 'depleted' 等已废弃值）
  const statusInfo = INVENTORY_STATUS_MAP[effectiveStock?.status ?? ''] || INVENTORY_STATUS_MAP.in_stock;
  // sourceType 兜底：未在 SOURCE_ORIGIN_MAP 映射时显示中文（避免英文原始值）
  const sourceLabel = sourceInfo?.label
    || (effectiveStock?.sourceType ? SOURCE_ORIGIN_LABEL_MAP[effectiveStock.sourceType] : null)
    || effectiveStock?.sourceType
    || '-';
  const gradeInfo = effectiveStock?.grade ? QUALITY_GRADE_MAP[effectiveStock.grade] : null;
  const available = (effectiveStock?.currentQuantity ?? 0) - (effectiveStock?.frozenQuantity ?? 0);

  // 数据加载失败占位（2026-07-14：之前失败时弹窗永远 skeleton）
  if (resolveError) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 shadow-xl max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-600 text-xl">⚠</span>
            <h3 className="text-lg font-semibold text-gray-900">加载失败</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">{resolveError}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              onClick={onClose}
            >
              关闭
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => {
                setResolveError(null);
                // 重置 stock prop 让 useEffect 重新触发加载
                setResolvedStock(null);
              }}
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 数据加载中占位
  if (resolving) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 shadow-xl flex items-center gap-3">
          {/* 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件 */}
          <LoadingSpinner />
          <span className="text-gray-600">加载库存详情...</span>
        </div>
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showFooter={false}
      size="xl"
      title={
        <div className="flex items-center gap-2.5">
          {getStockTypeIcon(effectiveStock?.stockType ?? '')}
          <div className="flex items-center gap-2">
            <span>{getStockTypeLabel(effectiveStock?.stockType ?? '')}库存详情</span>
            <span className={`px-2 py-0.5 ${statusInfo.bg} ${statusInfo.text} text-xs rounded font-normal`}>
              {statusInfo.label}
            </span>
          </div>
          <span className="text-sm text-white/70 font-mono font-normal ml-1">
            {effectiveStock?.instanceId ?? stock.instanceId}
          </span>
        </div>
      }
      headerAction={
        <Button
          variant="ghost"
          size="icon"
          onClick={loadAllData}
          className="text-white hover:bg-emerald-500"
          // 2026-07-10 P2-3：补 aria-label（键盘 + 屏幕阅读器可达，仅 title 不够）
          aria-label="刷新库存详情"
          title="刷新"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      }
    >
      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 flex items-center gap-1">
        <TabBtn current={tab} value="basic"   icon={<Info    className="w-4 h-4" />}    label="基本信息" count={null} onClick={setTab} />
        <TabBtn current={tab} value="history" icon={<History className="w-4 h-4" />}    label="操作历史" count={transactions.length} onClick={setTab} />
        <TabBtn current={tab} value="trace"   icon={<GitBranch className="w-4 h-4" />} label="上下游追溯" count={upstream.filter(u => (u.depth ?? 0) >= 1).length + downstream.length} onClick={setTab} />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Tab Content */}
      {tab === 'basic'   && effectiveStock && (
        <BasicTab
          stock={effectiveStock}
          sourceInfo={sourceInfo}
          statusInfo={statusInfo}
          gradeInfo={gradeInfo}
          available={available}
          freezes={freezes}
          onUnfreeze={async (freezeId) => {
            // 2026-07-10 P0-3 修复：原生 confirm/alert → showConfirm/showAlert（Electron 兼容 + 项目 UI 统一）
            const ok = await showConfirm('确定要解冻该记录吗？解冻后对应数量将恢复为可用。');
            if (!ok) return;
            try {
              const result = await unfreezeInventory(freezeId);
              if (result.success) {
                loadAllData();
                // 2026-07-28 审核 M：用顶部已 import 的 useInventoryStore（文件第 43 行），删除动态 import 冗余
                useInventoryStore.getState().notifyChange();
              } else {
                showAlert(result.error || '解冻失败');
              }
            } catch (e) {
              // 2026-07-10 P0-2 修复：catch(e) + instanceof 守卫
              showAlert(e instanceof Error ? e.message : '解冻失败');
            }
          }}
        />
      )}
      {tab === 'history' && <HistoryTab transactions={transactions} loading={loading} error={error} onRetry={loadAllData} />}
      {tab === 'trace'   && (
        <TraceTab
          upstream={upstream}
          downstream={downstream}
          loading={loading}
          onSelectChild={(instanceId) => {
            if (onNavigateToInstance) {
              onNavigateToInstance(instanceId);
            }
          }}
        />
      )}
    </Modal>
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
    // 2026-07-10 P2-4：补 role/aria-selected/aria-controls（键盘 + 屏幕阅读器可达）
    // 2026-07-10 P2-3：补 aria-label（icon + 文字混合的 Tab 仍需 label 给屏读）
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`tabpanel-${value}`}
      aria-label={label}
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
  stock, sourceInfo, statusInfo, gradeInfo, available, freezes,
  onUnfreeze,
}: {
  stock: InventoryStock;
  sourceInfo: any;
  statusInfo: any;
  gradeInfo: any;
  available: number;
  freezes: any[];
  onUnfreeze?: (freezeId: string) => void;
}) {
  const freezesCount = freezes.length;
  const [showFreezeDetail, setShowFreezeDetail] = useState(false);
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
          // 2026-07-14：未知 business_type 不显示原始英文，改用"其他"兜底
          return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{stock.businessType ? '其他' : '-'}</span>;
        })()],
        ['业务编号',   stock.businessCode || stock.extensions?.businessCode || '-'],
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
        // 2026-07-09：补作物ID（与 inventory_inbound_records.crop_id 对齐，溯源用）
        ['作物ID',   <span className="font-mono text-xs text-gray-600">{stock.cropId || '-'}</span>],
        ['作物名称', stock.cropName || '-'],
        ['作物编码', <span className="font-mono text-emerald-600">{stock.cropCode || '-'}</span>],
        ['品种',     stock.varietyName || '-'],
        // 2026-07-09：补形态字段（与列表"形态"列 + AddStockModal 作物形态字段对齐）
        ['形态',     <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">{translateForm(stock.sourceForm || stock.productForm) || '-'}</span>],
        ['种植模式', getPlantingModeLabel(stock.plantingMode) || '-'],
        ['采收区域', translateArea(stock.greenhouseName) || translateArea(stock.areaName) || '-'],
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
        ['冻结记录', (
          <button
            type="button"
            onClick={() => setShowFreezeDetail(v => !v)}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
          >
            {freezesCount} 条
            <span className="text-xs text-gray-400">{showFreezeDetail ? '▲' : '▼'}</span>
          </button>
        )],
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
          : <span className="text-gray-700">{sourceLabel}</span>],
        // 2026-07-09：补上游业务 ID/类型（与 InventoryStock 类型对齐，溯源用）
        ['上游业务ID',   <span className="font-mono text-xs">{stock.sourceBusinessId || '-'}</span>],
        ['上游业务类型', stock.sourceBusinessType || '-'],
        ['上游实例',     <span className="font-mono">{stock.sourceInstanceId || '-'}</span>],
        ['生产计划',     stock.productionPlanCode || '-'],
        ['入库日期',     stock.inboundDate ? new Date(stock.inboundDate).toLocaleDateString('zh-CN') : '-'],
        // 2026-07-09：采购日期从财务组移到来源组（外购入库专属）
        ['采购日期',     stock.purchaseDate || '-'],
        ['最后出库',     stock.lastOutboundDate ? new Date(stock.lastOutboundDate).toLocaleDateString('zh-CN') : '-'],
        ['过期日期',     stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString('zh-CN') : '-'],
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
    // ========== 2026-07-08 T7：扩展信息 4 分组（在原有 5 分组之后追加） ==========
    {
      title: '💰 财务与来源专属',
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-700',
      items: [
        ['供应商',     stock.supplierName || '-'],
        ['供应商电话', stock.supplierPhone || '-'],
        ['单价',       formatCurrency(stock.unitPrice)],
        ['总金额',     formatCurrency(stock.totalAmount)],
        // 2026-07-09：所属基地 + 4 个来源专属字段从原"🌱 来源专属"组合并
        ['所属基地',   stock.baseName || '-'],
        ['赠方名称',   stock.giftFrom || '-'],
        ['委托方',     stock.consignor || '-'],
        ['调出仓库',   stock.sourceWarehouseName || '-'],
        ['盘点单号',   stock.stocktakeNo || '-'],
      ],
    },
    {
      title: '🏷️ 审计信息',
      bg: 'bg-indigo-50',
      border: 'border-indigo-300',
      text: 'text-indigo-700',
      items: [
        ['操作员',   stock.operatorName || '-'],
        ['创建人',   stock.createBy || '-'],
        ['创建时间', stock.createTime || '-'],
        ['更新时间', stock.updateTime || '-'],
      ],
    },
    // 2026-07-13：补录信息区块（仅 isSupplementary=1 的记录显示）
    // 紫色高亮，让用户一眼看出"该记录是补录入库的"及来源行
    // 注意：此处在 BasicTab 组件内，stock 已由父组件传入（= effectiveStock）
    ...(stock.isSupplementary === 1
      ? [{
          title: '⚙️ 补录信息',
          bg: 'bg-purple-50',
          border: 'border-purple-300',
          text: 'text-purple-700',
          items: [
            ['补录标记', <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded font-medium">⚙️ 补录入库</span>],
            ['补录原因', <span className="text-purple-900 font-medium">{stock.supplementaryReason || '-'}</span>],
            ['来源类型', (() => {
              const labelMap: Record<string, string> = { planting: '种植行', seedling: '育苗行', 'seed-source': '种源' };
              return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{labelMap[stock.sourceModule || ''] || stock.sourceModule || '-'}</span>;
            })()],
            ['来源行ID', <span className="font-mono text-xs">{stock.sourceRecordId || '-'}</span>],
            ['来源行编码', <span className="font-mono text-xs font-semibold">{stock.sourceCode || '-'}</span>],
          ],
        }]
      : []),
    // ========== 2026-07-09：移除"🏷️ 业务信息"组（业务ID/类型/编码已与"基础信息"组重复）==========
    // ========== 2026-07-09：移除"🌱 来源专属"组（字段已分散到"💰 财务与来源专属" + "品种信息"组）==========
  ];

  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        // 2026-07-13：原 <React.Fragment key={i}> 因 vite-plugin-source-identifier 注入 data-matrix-id 触发 React 警告
        // 改用 <div key={i}>（不影响布局，Fragment 本身无视觉）
        <div key={i}>
          <div className={`${sec.bg} rounded-lg p-4 border ${sec.border.replace('border-', 'border-').replace('-300', '-200')}`}>
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

          {/* 冻结明细（数量信息卡片下方展开） */}
          {sec.title === '数量信息' && showFreezeDetail && freezesCount > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-2">
              <h4 className="text-sm font-semibold text-blue-700 mb-2">冻结明细</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-blue-200">
                      <th className="pb-1.5 pr-3 font-medium">方式</th>
                      <th className="pb-1.5 pr-3 font-medium">数量</th>
                      <th className="pb-1.5 pr-3 font-medium">用途/订单</th>
                      <th className="pb-1.5 pr-3 font-medium">冻结日期</th>
                      <th className="pb-1.5 pr-3 font-medium">状态</th>
                      <th className="pb-1.5 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {freezes.map((fz: any, idx: number) => (
                      <tr key={fz.id || idx} className="text-gray-700">
                        <td className="py-1.5 pr-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            fz.freezeType === 'order' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {fz.freezeType === 'order' ? '订单' : '手动'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 font-mono font-medium">{fz.freezeQuantity}</td>
                        <td className="py-1.5 pr-3 max-w-[200px] truncate" title={fz.purpose || fz.orderCode || ''}>
                          {fz.orderCode ? (
                            <span className="font-mono text-purple-600">{fz.orderCode}</span>
                          ) : fz.purpose || '-'}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-500">{fz.freezeDate || '-'}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            fz.status === 'frozen' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {fz.status === 'frozen' ? '生效中' : '已解冻'}
                          </span>
                        </td>
                        <td className="py-1.5">
                          {fz.status === 'frozen' && onUnfreeze && (
                            <button
                              type="button"
                              onClick={() => onUnfreeze(fz.id)}
                              className="text-red-500 hover:text-red-700 hover:underline text-xs"
                            >
                              解冻
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- 操作历史 Tab（Phase 13.2.2-4: Timeline + 日期分组 + 冻结/解冻细分） ----------
function HistoryTab({ transactions, loading, error, onRetry }: {
  transactions: InventoryTransaction[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span>加载中...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <div className="text-sm text-red-700 mb-3">{error}</div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-3 h-3 mr-1" /> 重试
          </Button>
        )}
      </div>
    );
  }
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>暂无操作历史</p>
      </div>
    );
  }
  // 按日期分组（今天 / 昨天 / YYYY-MM-DD）
  const groups: Record<string, InventoryTransaction[]> = {};
  transactions.forEach((tx) => {
    const d = tx.operateDate ? new Date(tx.operateDate) : new Date();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    let key: string;
    if (sameDay(d, today)) key = '今天';
    else if (sameDay(d, yesterday)) key = '昨天';
    else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">共 {transactions.length} 条操作记录（按时间倒序）</div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          {/* 2026-07-14：表头渐变蓝背景色（与作物库存列表表头一致） */}
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">类型</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">数量</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">变动前</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">变动后</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">业务类型</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">业务单号</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">操作人</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">时间</th>
              <th className="px-3 py-2 text-left">备注</th>
            </tr>
          </thead>
          {/* 2026-07-14：数据行分割线加深为 gray-300 */}
          <tbody className="divide-y divide-gray-300">
            {transactions.map((tx) => {
              // 2026-07-14：未知 transaction_type 不显示原始英文，改用"未知"兜底
              const meta = TX_TYPE_META[tx.transactionType] || { label: `未知(${tx.transactionType})`, color: 'text-gray-600 bg-gray-50 border-gray-200' };
              // 2026-07-15：补 transfer_out（后端 label 是"调出"，库存被扣减）
              const isOut = tx.transactionType === 'outbound'
                || tx.transactionType === 'unfreeze'
                || tx.transactionType === 'transfer_out'
                || (tx.transactionType === 'adjust' && tx.quantity < 0);
              return (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${meta.color}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold whitespace-nowrap ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                    {/* 2026-07-15：后端已写正负号，前端不再加 +；保留格式化 (始终显示符号 + 颜色) */}
                    {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 font-mono whitespace-nowrap">{tx.balanceBefore}</td>
                  <td className="px-3 py-2 text-right text-gray-700 font-mono whitespace-nowrap">{tx.balanceAfter}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {// 2026-07-14：business_type 不存在映射时不显示原始英文，改用"其他"
                BUSINESS_TYPE_META[tx.businessType]?.label || (tx.businessType ? '其他' : '-')}
                  </td>
                  <td className="px-3 py-2 text-gray-700 font-mono text-xs whitespace-nowrap">
                    {tx.businessCode || '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{tx.operatorName || '-'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                    {(() => {
                      // 2026-07-14：容错处理 — operateDate 可能是 '20260702' 格式（Invalid Date）
                      // 尝试解析，失败则回退到 createTime，再失败显示 '-'
                      if (tx.operateDate) {
                        const d = new Date(tx.operateDate);
                        if (!isNaN(d.getTime())) {
                          return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                        }
                        // 尝试 'YYYYMMDD' 格式
                        const m = String(tx.operateDate).match(/^(\d{4})(\d{2})(\d{2})$/);
                        if (m) {
                          return `${m[1]}-${m[2]}-${m[3]}`;
                        }
                      }
                      if (tx.createTime) {
                        const d = new Date(tx.createTime);
                        if (!isNaN(d.getTime())) {
                          return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                        }
                      }
                      return '-';
                    })()}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs max-w-xs truncate" title={tx.remarks || ''}>
                    {tx.remarks || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 上下游追溯 Tab（Phase 13.2.5-8: 树状 + 缩进 + 联动跳转） ----------
function TraceTab({
  upstream, downstream, loading, onSelectChild,
}: {
  upstream: TraceResult[];
  downstream: DownstreamTraceResult[];
  loading: boolean;
  onSelectChild?: (instanceId: string) => void;
}) {
  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }
  // 跳过上游首项（=自己，depth=0），从 depth>=1 开始渲染
  const upstreamFiltered = upstream.filter((u) => (u.depth ?? 0) >= 1);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4 rotate-180" />
          上游来源 ({upstreamFiltered.length})
        </h4>
        {upstreamFiltered.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">无上游来源（最原始记录）</div>
        ) : (
          <div className="space-y-1">
            {upstreamFiltered.map((item, idx) => {
              const depth = item.depth ?? 1;
              const isCINode = item.instanceId?.startsWith('CI');
              return (
                <div
                  key={idx}
                  className={`relative pl-3 border-l-2 rounded-r transition-colors ${
                    isCINode
                      ? 'border-amber-300 bg-amber-50/30 cursor-default'
                      : 'border-emerald-300 hover:bg-emerald-50 cursor-pointer'
                  }`}
                  style={{ marginLeft: `${(depth - 1) * 12}px` }}
                  onClick={() => !isCINode && onSelectChild?.(item.instanceId)}
                >
                  <div className={`absolute -left-[5px] top-3 w-2 h-2 rounded-full ${isCINode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="p-2">
                    <div className="flex items-center gap-2 mb-1">
                      {getStockTypeIcon(item.stockType)}
                      <span className="text-sm font-medium">{item.cropName}</span>
                      <span className="text-xs text-gray-400">第{depth}层</span>
                      {isCINode && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">来源</span>}
                    </div>
                    <div className="text-xs text-gray-700">
                      {item.businessCode || item.instanceId}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">数量: {item.quantity} · 入库: {item.inboundDate}</div>
                  </div>
                </div>
              );
            })}
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
          <div className="space-y-1">
            {downstream.map((item, idx) => {
              const depth = item.depth ?? 1;
              const isOutboundTx = item.stockType === 'outbound';
              return (
                <div
                  key={idx}
                  className={`relative pl-3 border-l-2 rounded-r transition-colors ${isOutboundTx ? 'border-orange-300 bg-orange-50/50' : 'border-blue-300 hover:bg-blue-50 cursor-pointer'}`}
                  style={{ marginLeft: `${(depth - 1) * 12}px` }}
                  onClick={() => !isOutboundTx && onSelectChild?.(item.instanceId)}
                >
                  <div className={`absolute -left-[5px] top-3 w-2 h-2 rounded-full ${isOutboundTx ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <div className="p-2">
                    <div className="flex items-center gap-2 mb-1">
                      {isOutboundTx ? <ArrowUpRight className="w-4 h-4 text-orange-500" /> : getStockTypeIcon(item.stockType)}
                      <span className="text-sm font-medium">
                        {isOutboundTx ? '出库消耗' : item.businessId}
                      </span>
                      <span className="text-xs text-gray-400">第{depth}层</span>
                      {isOutboundTx && <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">流水</span>}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{item.instanceId}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {isOutboundTx ? '出库数量' : '出库'}: {item.outboundQuantity} · 日期: {item.outboundDate}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
