/**
 * 上游溯源链面板（2026-10-16 · 单列"溯源轨道"版，designer 方案 A）
 *
 * 设计要点：
 * - 每个入库路径一个可折叠组；组内是"单列轨道"：序号圆点 + 类型色 + 一条连续竖轨道，
 *   不再用 depth 缩进 + 多色边框（无语义噪音），也不再渲染 5 列假表格（列根本对不齐）。
 * - 流程方向 = 回溯序（近 → 远，与全站流水倒序一致）；概览栏给一句方向说明，
 *   链尾节点打「最初来源」chip，折叠态组头第二行直接给出「最初来源：XXX」。
 * - 字段分级：主行 = 类型 + 名称 + 数量；次行 = 单号 + 日期时刻 + 操作员 + 形态；
 *   sourceModule / 完整 ID / 完整时间降级为 title 提示。
 * - 分叉（1 节点 N 上游）：连接行尾标"· N 条上游来源"，每个上游一个虚线分支块（分支 1/2），
 *   分支内不给全局序号（并列关系，非时间先后）。
 * - isCycle / isTruncated 渲染为"终态标记"（斜体灰字 + 虚线圈），不再冒充真实节点。
 *
 * 数据源：GET /api/seed-sources/:id/upstream-trace
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ChevronDown, ChevronRight, ArrowUp, Package, Sprout, Leaf, Store, HelpCircle, CircleDashed, Archive } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { getUpstreamTrace } from '@/services/apiSeedSourceService';
import type { SeedSource } from '@/types/crop';
import { TRANSFERRED_FROM_BUSINESS_TYPE_MAP, ORIGINAL_SOURCE_MODULE_MAP } from '@/constants/cropConstants';

// ========== 类型 ==========

interface UpstreamNode {
  id: string;
  type: string;
  code: string;
  label: string;
  relation: string;
  relationLabel: string;
  occurredAt: string;
  operatorName?: string;
  quantity?: number;
  unit?: string;
  cropName?: string;
  cropVariety?: string;
  seedForm?: string;
  supplierName?: string;
  supplierId?: string;
  sourceModule?: string;
  children: UpstreamNode[];
  isOrphan?: boolean;
  isCycle?: boolean;
  isTruncated?: boolean;
  depth: number;
}

interface UpstreamTraceData {
  root: UpstreamNode;
  depth: number;
  totalNodes: number;
  truncated: boolean;
  hasCycle: boolean;
  traceTime: number;
}

// ========== 常量 ==========

const TYPE_ICON: Record<string, JSX.Element> = {
  seed_source: <Package className="w-4 h-4 text-emerald-600" />,
  inventory_stock: <Package className="w-4 h-4 text-blue-600" />,
  inventory_inbound: <Package className="w-4 h-4 text-slate-500" />,
  planting: <Leaf className="w-4 h-4 text-amber-600" />,
  seedling: <Sprout className="w-4 h-4 text-teal-600" />,
  harvest_record: <Leaf className="w-4 h-4 text-orange-500" />,
  supplier: <Store className="w-4 h-4 text-violet-500" />,
  unknown: <HelpCircle className="w-4 h-4 text-red-400" />,
};

/** 类型色（浅底徽章）——全面板唯一允许出现的彩色系（与圆点同色） */
const TYPE_BADGE: Record<string, string> = {
  seed_source: 'bg-emerald-50 text-emerald-700',
  inventory_stock: 'bg-blue-50 text-blue-700',
  inventory_inbound: 'bg-slate-50 text-slate-600',
  planting: 'bg-amber-50 text-amber-700',
  seedling: 'bg-teal-50 text-teal-700',
  harvest_record: 'bg-orange-50 text-orange-700',
  supplier: 'bg-violet-50 text-violet-700',
  unknown: 'bg-red-50 text-red-600',
};

/** 类型色（圆点边框 + 序号文字） */
const TYPE_DOT: Record<string, string> = {
  seed_source: 'border-emerald-500 text-emerald-600',
  inventory_stock: 'border-blue-500 text-blue-600',
  inventory_inbound: 'border-slate-400 text-slate-500',
  planting: 'border-amber-500 text-amber-600',
  seedling: 'border-teal-500 text-teal-600',
  harvest_record: 'border-orange-500 text-orange-600',
  supplier: 'border-violet-500 text-violet-600',
  unknown: 'border-red-400 text-red-500',
};

const TYPE_LABEL: Record<string, string> = {
  seed_source: '种源',
  inventory_stock: '作物库存',
  inventory_inbound: '入库记录',
  planting: '种植批次',
  seedling: '育苗批次',
  harvest_record: '采收记录',
  crop_circulation: '回流记录',
  supplier: '供应商',
  unknown: '未知',
};

/**
 * 2026-10-16：编码点击跳转映射 —— 点击节点编码跳转到对应模块列表并自动定位（过滤到该行）。
 * 目标页接线：/crop-inventory?keyword=、/crop/planting?plantCode=、/crop/seedling?seedlingCode=、
 * /crop/seed-source?seedCode=（种源页原已支持，扫码同款）。
 * 采收记录/供应商暂无独立列表页，不设链接。
 */
const CODE_JUMP: Record<string, (code: string) => string> = {
  inventory_stock: (c) => `/crop-inventory?keyword=${encodeURIComponent(c)}`,
  planting: (c) => `/crop/planting?plantCode=${encodeURIComponent(c)}`,
  seedling: (c) => `/crop/seedling?seedlingCode=${encodeURIComponent(c)}`,
  seed_source: (c) => `/crop/seed-source?seedCode=${encodeURIComponent(c)}`,
};

// 缩进档位（必须为字面量数组，Tailwind JIT 才能扫到类名）
const ROW_INDENT: string[] = [
  'pl-8 pr-4',
  'ml-7 border-l border-dashed border-gray-300 pl-5 pr-4',
  'ml-14 border-l border-dashed border-gray-300 pl-5 pr-4',
];

// 圆点定位（padding box 坐标系；主轨道 absolute left-[11px] w-0.5 → 中心 12px）
// bg 不写在基类里：折叠态需要换背景色（bg-white 盖轨道 / bg-gray-100 示折叠）
const DOT_MAIN =
  'absolute left-[2px] top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-semibold leading-none';
const DOT_BRANCH = 'absolute -left-[6px] top-[7px] z-10 h-2.5 w-2.5 rounded-full border-2 bg-white';

// ========== 行模型（唯一的顺序决策点） ==========

type TraceRow =
  | { key: string; kind: 'link'; node: UpstreamNode; level: number; branchCount: number }
  | { key: string; kind: 'node'; node: UpstreamNode; level: number; seq: number | null; isTerminal: boolean }
  | { key: string; kind: 'branch'; label: string; level: number }
  | { key: string; kind: 'collapsed'; node: UpstreamNode; level: number; hiddenCount: number };

/** 子树节点总数（不含自身）——折叠提示行展示"已收起 N 个节点" */
function countDescendants(node: UpstreamNode): number {
  if (!node.children?.length) return 0;
  return node.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}

/** 深度优先展开为行列表（dfs 顺序 = 回溯序：近 → 远）；collapsed = 被用户折叠的主链节点 id 集合 */
function buildRows(root: UpstreamNode, collapsed: Set<string>): TraceRow[] {
  const rows: TraceRow[] = [];
  let seq = 0;
  const walk = (node: UpstreamNode, level: number) => {
    const isTerminal = !node.children?.length && !node.isCycle && !node.isTruncated;
    rows.push({
      key: `${node.id}-${rows.length}`,
      kind: 'node',
      node,
      level,
      seq: level === 0 ? ++seq : null, // 分支内不给全局序号（并列关系，非时间先后）
      isTerminal,
    });
    if (node.isCycle || node.isTruncated) return;
    const kids = node.children || [];
    if (!kids.length) return;
    // 2026-10-16：节点级折叠——主链节点被折叠时，不再渲染其上游，改为一行"已收起 N 个上游节点"
    if (collapsed.has(node.id)) {
      rows.push({ key: `${node.id}-col-${rows.length}`, kind: 'collapsed', node, level, hiddenCount: countDescendants(node) });
      return;
    }
    // 连接行描述"该节点是怎么进来的"，渲染在其上方；组根节点的连接行不渲染（组头已展示）
    rows.push({ key: `${node.id}-link-${rows.length}`, kind: 'link', node: kids[0], level, branchCount: kids.length });
    if (kids.length === 1) {
      walk(kids[0], level);
    } else {
      kids.forEach((c, i) => {
        const nextLevel = Math.min(level + 1, ROW_INDENT.length - 1);
        rows.push({ key: `${node.id}-br-${i}`, kind: 'branch', label: `分支 ${i + 1}`, level: nextLevel });
        walk(c, nextLevel);
      });
    }
  };
  walk(root, 0);
  return rows;
}

// ========== 工具 ==========

/** 日期/时刻拆分：纯字符串切片，绝不用 new Date(iso).toISOString()（项目 UTC 时区历史事故） */
function splitTime(iso?: string): { date: string; time: string } {
  const s = (iso || '').trim();
  if (s.length < 10) return { date: '', time: '' };
  const date = s.slice(0, 10);
  const hm = s.slice(11, 16);
  // 00:00 视为"只有日期"，避免整列都是 00:00 的噪音
  const time = /^\d{2}:\d{2}$/.test(hm) && hm !== '00:00' ? hm : '';
  return { date, time };
}

/** relationLabel 拆主词/括号（主词作扫读锚点，括号退到浅灰） */
function splitRelation(relationLabel: string): { main: string; paren: string } {
  const s = relationLabel || '';
  const idx = s.indexOf('（');
  if (idx < 0) return { main: s, paren: '' };
  return { main: s.slice(0, idx), paren: s.slice(idx) };
}

/** DFS 第一个末端节点（= 最初来源） */
function firstTerminal(node: UpstreamNode): UpstreamNode {
  let cur = node;
  while (cur.children?.length && !cur.isCycle && !cur.isTruncated) cur = cur.children[0];
  return cur;
}

/** 末端节点总数（= 并列的最初来源条数） */
function countTerminals(node: UpstreamNode): number {
  if (!node.children?.length || node.isCycle || node.isTruncated) return 1;
  return node.children.reduce((s, c) => s + countTerminals(c), 0);
}

/** 末端节点文案（异常态降级） */
function terminalText(n: UpstreamNode): string {
  if (n.isCycle) return '链路顶端';
  if (n.isTruncated) return '已达最大深度';
  if (n.isOrphan) return '来源记录已删除';
  return `${TYPE_LABEL[n.type] || ''} ${n.label}`.trim();
}

/** 数量文案（无值不渲染占位符） */
function qtyText(node: UpstreamNode): string {
  if (node.quantity == null || node.quantity <= 0) return '';
  return `${node.quantity.toLocaleString()}${node.unit || ''}`;
}

/** 节点降级信息（title 提示：来源模块 / 完整时间 / 完整 ID） */
function buildTitle(node: UpstreamNode): string {
  const parts: string[] = [];
  if (node.sourceModule) parts.push(`来源模块: ${node.sourceModule}`);
  if (node.occurredAt) parts.push(`完整时间: ${node.occurredAt}`);
  if (node.id) parts.push(`ID: ${node.id}`);
  if (node.supplierName) parts.push(`供应商: ${node.supplierName}`);
  return parts.join('\n');
}

// ========== 行组件 ==========

function TraceRowView({ row, collapsed, onToggleCollapse }: {
  row: TraceRow;
  collapsed: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
}) {
  const navigate = useNavigate();

  // 折叠提示行（节点被折叠时替代其上游渲染）
  if (row.kind === 'collapsed') {
    return (
      <div className={`relative flex items-center gap-1.5 py-1 ${ROW_INDENT[row.level]}`}>
        <ArrowUp className="h-3 w-3 shrink-0 text-gray-300" strokeWidth={2.5} />
        <span className="text-[11px] italic text-gray-400">
          ↑ 已收起 {row.hiddenCount} 个上游节点 · 点击序号展开
        </span>
      </div>
    );
  }

  // 终态标记（cycle / truncated）：不画圆点、不画卡片，斜体说明
  if (row.kind === 'node' && (row.node.isCycle || row.node.isTruncated)) {
    return (
      <div className={`relative flex items-center gap-2 py-1 ${ROW_INDENT[row.level]}`}>
        <CircleDashed className="h-3 w-3 shrink-0 text-gray-300" />
        <span className="text-[11px] italic text-gray-400">{row.node.label}</span>
      </div>
    );
  }

  if (row.kind === 'branch') {
    return (
      <div className={`${ROW_INDENT[row.level]} pb-0.5 pt-1 text-[10px] font-medium text-gray-400`}>
        {row.label}
      </div>
    );
  }

  if (row.kind === 'link') {
    const { main, paren } = splitRelation(row.node.relationLabel);
    return (
      <div className={`relative flex items-center gap-1.5 pb-1 pt-0.5 ${ROW_INDENT[row.level]}`}>
        <ArrowUp className="h-3 w-3 shrink-0 text-gray-300" strokeWidth={2.5} />
        <span className="truncate text-[11px] leading-4">
          <span className="text-gray-600">{main}</span>
          {paren && <span className="text-gray-400">{paren}</span>}
        </span>
        {row.branchCount > 1 && (
          <span className="shrink-0 text-[11px] text-gray-400">· {row.branchCount} 条上游来源</span>
        )}
      </div>
    );
  }

  // node 行
  const node = row.node;
  const { date, time } = splitTime(node.occurredAt);
  const qty = qtyText(node);
  const isOrphan = !!node.isOrphan;
  // 2026-10-16：节点级折叠 —— 仅主链序号节点开放（用户表述"数字 1 2 3 4 可折叠"）
  const canCollapse = row.seq != null && !!(node.children?.length) && !node.isCycle && !node.isTruncated;
  const isCollapsed = collapsed.has(node.id);
  // 编码点击跳转（无映射的类型保持纯文本）
  const jumpUrl = node.code && CODE_JUMP[node.type] ? CODE_JUMP[node.type](node.code) : '';

  return (
    <div className={`relative ${ROW_INDENT[row.level]}`}>
      {row.seq != null ? (
        canCollapse ? (
          <button
            type="button"
            className={`${DOT_MAIN} ${TYPE_DOT[node.type] || TYPE_DOT.unknown} cursor-pointer transition-shadow hover:ring-2 hover:ring-gray-200 ${
              isCollapsed ? 'bg-gray-100' : 'bg-white'
            }`}
            title={isCollapsed
              ? `点击展开 ${countDescendants(node)} 个上游节点`
              : `点击折叠下方 ${countDescendants(node)} 个上游节点`}
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(node.id); }}
          >
            {row.seq}
          </button>
        ) : (
          <span className={`${DOT_MAIN} ${TYPE_DOT[node.type] || TYPE_DOT.unknown} bg-white`}>{row.seq}</span>
        )
      ) : (
        <span className={`${DOT_BRANCH} ${TYPE_DOT[node.type] || TYPE_DOT.unknown}`} />
      )}
      {/* hover 高亮区：-mx-2 扩展到圆点右侧，不与圆点重叠 */}
      <div
        className={`-mx-2 rounded-md px-2 py-1 transition-colors hover:bg-gray-50 ${
          isOrphan ? 'border border-dashed border-red-200 bg-red-50/40' : ''
        }`}
        title={buildTitle(node)}
      >
        {/* 主行：类型 + 名称 + 数量 */}
        <div className="flex min-w-0 items-center gap-2">
          {TYPE_ICON[node.type] || TYPE_ICON.unknown}
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${TYPE_BADGE[node.type] || TYPE_BADGE.unknown}`}>
            {TYPE_LABEL[node.type] || '-'}
          </span>
          <span className="truncate text-sm font-medium text-gray-900">{node.label}</span>
          {node.cropVariety && !node.label.includes(node.cropVariety) && (
            <span className="shrink-0 text-xs text-gray-500">{node.cropVariety}</span>
          )}
          {isOrphan && <span className="shrink-0 text-[11px] text-red-500">（数据已删除）</span>}
          {row.isTerminal && !isOrphan && (
            <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1 text-[10px] font-medium text-emerald-700">
              最初来源
            </span>
          )}
          {qty && <span className="ml-auto shrink-0 font-mono text-xs text-gray-700">{qty}</span>}
        </div>
        {/* 次行：单号 · 日期 时刻 · 操作员 · 形态 */}
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
          {jumpUrl ? (
            <Tooltip content={`点击查看${TYPE_LABEL[node.type] || ''}「${node.code}」原详细信息`} position="top">
              <button
                type="button"
                className="truncate cursor-pointer font-mono text-blue-600 hover:text-blue-700 hover:underline"
                onClick={(e) => { e.stopPropagation(); navigate(jumpUrl); }}
              >
                {node.code}
              </button>
            </Tooltip>
          ) : (
            node.code && <span className="truncate font-mono text-gray-500">{node.code}</span>
          )}
          {node.code && date && <span className="text-gray-300">·</span>}
          {date && <span className="shrink-0 text-gray-500">{date}</span>}
          {time && <span className="shrink-0 text-gray-400">{time}</span>}
          {node.operatorName && (
            <>
              <span className="text-gray-300">·</span>
              <span className="truncate text-gray-400">{node.operatorName}</span>
            </>
          )}
          {node.seedForm && (
            <>
              <span className="text-gray-300">·</span>
              <span className="shrink-0 text-gray-400">形态: {node.seedForm}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== 组组件 ==========

function TraceGroup({ child, idx, isOpen, onToggle, collapsed, onToggleCollapse }: {
  child: UpstreamNode;
  idx: number;
  isOpen: boolean;
  onToggle: () => void;
  /** 2026-10-16：节点级折叠状态提升到面板级（切 Tab 重挂载不丢失折叠） */
  collapsed: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
}) {
  const summary = child; // 2026-10-16：最近一手来源 = 组根节点（原实现取 children[0] = 第 2 层，语义错位）
  const { main: relMain, paren: relParen } = splitRelation(summary.relationLabel);
  const { date } = splitTime(summary.occurredAt);
  const qty = qtyText(summary);
  const leaf = firstTerminal(child);
  const leafCount = countTerminals(child);
  const rows = isOpen ? buildRows(child, collapsed) : [];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 折叠组标题（两行制）：行1 = 入库序号 + 入库方式 + 数量 + 日期；行2 = 最近来源（左）+ 最初来源（右） */}
      <button
        className="w-full bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
          )}
          <span className="shrink-0 text-xs font-semibold text-gray-700">第 {idx + 1} 次入库</span>
          <span className="shrink-0 text-gray-300">·</span>
          <span className="min-w-0 truncate text-sm">
            <span className="font-medium text-gray-800">{relMain}</span>
            {relParen && <span className="text-gray-400">{relParen}</span>}
          </span>
          {qty && <span className="ml-auto shrink-0 font-mono text-xs text-gray-600">{qty}</span>}
          {date && <span className="shrink-0 font-mono text-xs text-gray-500">{date}</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 pl-6">
          <span className="shrink-0 text-[11px] text-gray-500">{TYPE_LABEL[summary.type] || '-'}</span>
          <span className="min-w-0 truncate text-[11px] text-gray-400">
            {summary.label}
            {summary.code ? ` · ${summary.code}` : ''}
          </span>
          <span className="ml-auto min-w-0 shrink-0 truncate text-[11px] text-gray-400" title={`${terminalText(leaf)}${leaf.code ? ` · ${leaf.code}` : ''}`}>
            最初来源：{terminalText(leaf)}
            {leaf.code ? ` · ${leaf.code}` : ''}
            {leaf.occurredAt ? ` · ${splitTime(leaf.occurredAt).date}` : ''}
            {leafCount > 1 ? ` 等 ${leafCount} 条` : ''}
          </span>
        </div>
      </button>

      {/* 展开内容：单列轨道。
          ⚠️ 禁止在此容器加水平内边距（px-*）——轨道 absolute left-[11px] 与圆点定位依赖 padding box 坐标 */}
      {isOpen && (
        <div className="relative bg-white py-2">
          <div className="absolute left-[11px] top-2 bottom-4 w-0.5 rounded-full bg-emerald-200" aria-hidden />
          {rows.map((r) => (
            <TraceRowView key={r.key} row={r} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 原始快照区（2026-10-16 由「调拨来源」Tab 并入溯源链） ==========

/**
 * 调拨时记录的快照字段（seed_sources.original_* / transferred_*）。
 * 与动态溯源链的区别：源数据删除后快照仍可查（审计价值）；含溯源链没有的
 * 原始单价/供应商/生产计划等元数据。
 */
function SnapshotSection({ record }: { record: SeedSource }) {
  const [open, setOpen] = useState(false);
  if (!record.transferredFromStockId) return null;

  const fields: Array<{ label: string; value: string | null; mono?: boolean }> = [
    { label: '原库存 ID', value: record.transferredFromStockId, mono: true },
    {
      label: '来源业务类型',
      value: record.transferredFromBusinessType
        ? (TRANSFERRED_FROM_BUSINESS_TYPE_MAP[record.transferredFromBusinessType] || record.transferredFromBusinessType)
        : null,
    },
    { label: '来源业务 ID', value: record.transferredFromBusinessId || null, mono: true },
    { label: '原始入库日期', value: record.originalInboundDate || null },
    {
      label: '原始来源模块',
      value: record.originalSourceModule
        ? (ORIGINAL_SOURCE_MODULE_MAP[record.originalSourceModule] || record.originalSourceModule)
        : null,
    },
    { label: '原始来源 ID', value: record.originalSourceId || null, mono: true },
    { label: '原始作物', value: record.originalCropName || record.cropName || null },
    { label: '原始品种', value: record.originalVarietyName || record.cropVariety || null },
    { label: '原始单位', value: record.originalUnit || record.unit || null },
    { label: '原始单价', value: record.originalUnitPrice != null ? `¥${record.originalUnitPrice}` : null },
    { label: '原始供应商', value: record.originalSupplierName || null },
    { label: '原始生产计划', value: record.originalProductionPlanCode || null, mono: true },
  ];

  return (
    <div className="border border-cyan-200 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2 bg-cyan-50/60 px-3 py-2 text-left transition-colors hover:bg-cyan-50"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" /> : <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />}
        <Archive className="w-4 h-4 shrink-0 text-cyan-600" />
        <span className="shrink-0 text-xs font-semibold text-gray-700">原始快照（调拨时记录）</span>
        <span className="shrink-0 text-gray-300">·</span>
        <span className="min-w-0 truncate text-xs text-gray-500">
          原库存 <code className="font-mono">{record.transferredFromStockId}</code>
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-gray-400">源数据删除后仍可查</span>
      </button>
      {open && (
        <div className="bg-white px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center min-w-0">
              <span className="text-xs text-gray-500 w-24 shrink-0">{f.label}：</span>
              {f.value
                ? f.mono
                  ? <code className="text-xs font-mono text-gray-700 truncate">{f.value}</code>
                  : <span className="text-xs text-gray-900 truncate">{f.value}</span>
                : <span className="text-xs text-gray-300">—</span>}
            </div>
          ))}
          {record.originalHarvestRecordId && (
            <div className="col-span-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
              <strong>采收记录：</strong>
              <code className="font-mono">{record.originalHarvestRecordId}</code>
              <span className="ml-2">（调拨前的入库来源）</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== 主组件 ==========

interface UpstreamTracePanelProps {
  seedSourceId: string;
  /** 2026-10-16：种源记录（快照区用；原「调拨来源」Tab 并入本面板） */
  record?: SeedSource;
}

export function UpstreamTracePanel({ seedSourceId, record }: UpstreamTracePanelProps) {
  const [data, setData] = useState<UpstreamTraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 折叠组展开状态：childIndex → boolean
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  // 2026-10-16：节点级折叠状态（面板级）——切换 Tab 重挂载 TraceGroup 时折叠不丢失
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const toggleNodeCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  };

  useEffect(() => {
    // 2026-07-28 审核 M：cancelled 标志防止快速切换 seedSourceId 时后发先至
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUpstreamTrace<UpstreamTraceData>(seedSourceId, 10)
      .then((d) => {
        if (cancelled) return;
        const result = d as unknown as UpstreamTraceData;
        setData(result);
        // 默认全部折叠
        setExpanded({});
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [seedSourceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />正在追溯上游链路...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 rounded">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>追溯失败：{error}</span>
      </div>
    );
  }
  if (!data || !data.root) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />暂无溯源数据
      </div>
    );
  }

  const { root, depth, totalNodes, truncated, traceTime } = data;
  const groups = root.children; // 每个子节点是一组独立的入库路径

  const toggleGroup = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-3">
      {/* 概览栏 */}
      <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        <span className="font-medium text-gray-700">
          {TYPE_ICON[root.type]}
          <span className="ml-1">{root.label}</span>
          {root.cropVariety && !root.label.includes(root.cropVariety) && (
            <span className="ml-1 text-gray-500">({root.cropVariety})</span>
          )}
        </span>
        <span className="text-gray-300">|</span>
        <span>追溯深度 {depth} 层</span>
        <span>·</span>
        <span>共 {totalNodes} 个节点</span>
        {/* 2026-10-16：方向说明（替代原表格表头的图例作用） */}
        <span className="text-gray-300">·</span>
        <span className="text-gray-400">↑ 上游来源 · 越靠下 = 越早的来源</span>
        {truncated && <span className="text-amber-500">· 已截断</span>}
        <span className="ml-auto text-gray-400">{traceTime}ms</span>
      </div>

      {/* 2026-10-16：原始快照区（原「调拨来源」Tab 并入；仅调拨来源的种源显示） */}
      {record && <SnapshotSection record={record} />}

      {/* 折叠组 */}
      {groups.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          当前种源为直接入库，无进一步上游信息
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((child, idx) => (
            <TraceGroup
              key={`group-${idx}`}
              child={child}
              idx={idx}
              isOpen={expanded[idx] || false}
              onToggle={() => toggleGroup(idx)}
              collapsed={collapsedNodes}
              onToggleCollapse={toggleNodeCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default UpstreamTracePanel;
