/**
 * 种源详情弹窗（2026-07-02 重构）
 * 种源已退化为纯仓库角色，移除繁育种源相关字段。
 * 三入口模式：外购入库 / 库存调拨 / 种植留种
 * Tab：基本信息 / 追溯时间线（隐藏「入库」分类，避免与出入库记录 Tab 重复；其余分类全显）
 *      / 溯源链（含「原始快照」折叠区，原「调拨来源」Tab 已并入）
 *      / 出入库记录（入库+冲销 + 出库：退库/育苗使用/种植移入 —— 原「使用记录」Tab 已并入出库区）
 * 2026-07-05: "调入种植" Tab 改名为 "使用记录"（更准确反映被育苗/种植使用两种场景）
 * 2026-08-16: 追溯时间线分类按"两来源"现实优化注释（见 SEED_SOURCE_CATEGORY_DESCRIPTIONS）
 * 2026-10-16: 终稿 —— 入库数据入口唯一化：保留顶层 Tab（后改名「出入库记录」，功能超集：冲销/作废/退库/出库/导出），
 *      时间线隐藏「入库」分类；并修复时间线组件"隐藏分类仍显示行"的 bug（见 EntityHistoryTimeline.filtered）
 * 2026-10-18: 大组件拆分 —— 基本信息/出入库记录/二维码/图片查看器移入 ./detail/*（纯移动，无逻辑变更）
 */

import type { ReactNode } from 'react';
import { ArrowLeftRight, Package } from 'lucide-react';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import type { CategoryKey } from '@/components/ui/EntityHistoryTimeline';
import { SeedSource } from '../../../../types/crop';
import { UpstreamTracePanel } from './UpstreamTracePanel';
import { SeedSourceBasicInfo } from './detail/SeedSourceBasicInfo';
import { InboundRecordsPanel } from './detail/InboundRecordsPanel';
import { SeedSourceQrCodeCard } from './detail/SeedSourceQrCodeCard';

/**
 * 2026-10-16：种源「追溯时间线」隐藏「入库」分类（仅此一类）——
 * 入库数据（inventory_inbound_records）的权威入口是顶层「出入库记录」Tab（功能超集：冲销/作废审计/退库/出库/导出），
 * 时间线不再重复罗列同一数据（该重复是用户多次反馈的困惑点）。
 * 其余分类（创建/修改/删除、库存流水、回流、流转）完整保留显示。
 * 注：circulation 分类查询 crop_circulation_records 全部类型（含回填/废弃处置），非纯重复，故不隐藏。
 * 育苗/种植详情没有独立入库面板，故它们的时间线保留「入库」分类（入库数据同样只有一个入口）。
 * 分类悬停说明按种源"库存调拨/种植留种"两来源现实改写（继承 2026-08-16 决策）。
 */
const SEED_SOURCE_HIDDEN_CATEGORIES: CategoryKey[] = ['inbound'];

const SEED_SOURCE_CATEGORY_DESCRIPTIONS: Partial<Record<CategoryKey, string>> = {
  lifecycle: '种源审计记录（数据源：audit_logs）：仅含后续的修改、删除、打印、状态变更等操作。'
    + '库存调拨与种植留种两种创建方式由服务层直写数据表，不产生"创建"记录；未发生上述操作时本分类可能为空。'
    + '入库明细请查看「出入库记录」Tab。',
  transaction: '种源库存数量变动流水（数据源：inventory_transaction）：'
    + '调拨入库（含追加/合并）、入库冲销、撤销留种回流、被育苗使用的出库扣减等。'
    + '调拨/留种创建时本身不产生本类流水；未发生冲销、撤销或使用等操作时本分类可能为空。',
  flow: '全链路物料流转日志（数据源：material_flow_log）：种植留种产生"种植 → 种源"，'
    + '调拨入库产生"库存 → 种源"，被育苗/种植使用时产生"种源 → 育苗/种植"，冲销与撤销回流产生"数量修正"。',
};

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

export function DetailModal({ isOpen, onClose, record }: DetailModalProps) {

  // 2026-07-19 P2：加 tooltip 字段（Hover 提示）
  const extraTabs: Array<{
    key: string
    label: string
    icon: ReactNode
    content: ReactNode
    tooltip?: string
  }> = []

  // 2026-07-22：溯源链 tab — 新增（所有种源都显示）
  extraTabs.push({
    key: 'upstream-trace',
    label: '溯源链',
    icon: <ArrowLeftRight className="w-4 h-4" />,
    tooltip: '追溯种源入库前的完整来源链路（调拨来源→库存→入库→采购/采收/种植）',
    content: <UpstreamTracePanel seedSourceId={record.id} record={record} />,
  })

  // 2026-10-16：「调拨来源」独立 Tab 已并入「溯源链」Tab 顶部（原始快照折叠区），
  // 避免与溯源链的链路信息重复展示为两个平级页面

  // 2026-07-06 Bug 19：所有种源都显示「出入库记录」Tab
  // 2026-10-16：由「入库记录」改名为「出入库记录」并新增出库区（退库到作物库存）——
  //   用户需求：只点这一个 Tab 就能查看 入库 + 冲销 + 退库 的全部数据。
  //   入库：/history-inbound（inventory_inbound_records + crop_circulation PROPAGATION，含冲销/作废审计/导出）
  //   出库：/history-outbound（inventory_transaction 退库主记录）
  //   育苗/种植领用流水仍在「使用记录」Tab（不同粒度视角，避免重复）。
  extraTabs.push({
    key: 'inbound-records',
    label: '出入库记录',
    icon: <Package className="w-4 h-4" />,
    tooltip: '入库流水（含冲销/作废审计，支持导出）+ 出库流水（退库到作物库存）。',
    content: <InboundRecordsPanel seedSourceId={record.id} seedCode={record.seedCode} />,
  })

  // 2026-08-16：删除独立的"合并历史"Tab — 信息密度太低（每行只有 ID+徽章）
  // 完整 ID 列表已集成到基本信息区（带可滚动容器 + 序号 + 已归档徽章）

  // 2026-08-16 v4：删除独立的"冲销记录"Tab — 已合并到入库记录 Tab 行的折叠面板内
  // （原 13 字段全部保留 + 可独立导出）

  return (
    <EntityDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="种源详情"
      basicInfoPanel={<SeedSourceBasicInfo record={record} />}
      // 2026-07-21 v2：二维码通过 topRight slot 传入，顶部对齐 Modal 标题栏底部
      topRight={<SeedSourceQrCodeCard seedCode={record.seedCode} />}
      entity="seed-sources"
      entityId={record.id}
      entityCode={record.seedCode}
      // 2026-10-16 移除 typeColumn（原传 { label: '入库方式', value: mode.label }）——
      //   该列是"每行硬挂同一个值"的静态列，导致育苗使用/退库/冲销等行也显示"库存调拨"，语义矛盾
      //   （用户反馈：被育苗使用的出库行显示"入库方式=库存调拨"不合理）。
      //   种源创建方式的信息在「基本信息·来源途径」已有；每行的类型/来源由 action 与「来源」列动态表达。
      // 2026-10-16：隐藏「入库」分类（时间线不再重复罗列入库数据，入口统一到「出入库记录」Tab）；
      // 其余分类完整保留 + 种源专属悬停说明
      historyHiddenCategories={SEED_SOURCE_HIDDEN_CATEGORIES}
      historyCategoryDescriptions={SEED_SOURCE_CATEGORY_DESCRIPTIONS}
      extraTabs={extraTabs}
      // 2026-07-05: 弹窗宽度 +30%（xl → xxxl：max-w-4xl → max-w-6xl）让"使用记录" Tab 字段完整展示
      size="xxxl"
    />
  );
}
