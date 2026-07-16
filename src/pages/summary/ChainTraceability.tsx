/**
 * 全链条追溯页面 - 从种源到采收入库完整追溯链
 * 数据源：useSummaryDataStore.batchItems（Zustand Store）
 * 架构：Component → Store → enhancedApiClient → Backend API（单向不可逆）
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Link,
  Layers,
  Sprout,
  Leaf,
  Package,
  Warehouse,
  ArrowRight,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { PageHeader, KpiCard, KpiCardGrid, DetailDrawer } from '../../components/summary';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui';
import { useSummaryDataStore, type BatchStatItem, type ChainStageStat, type ChainStageKey, type BatchStatus } from '../../stores/useSummaryDataStore';

// ========== 常量 ==========

/** 6个追溯环节（bgHex 用于内联 style 直接取 hex，避免用 Tailwind class 字符串嗅探反查颜色） */
const CHAIN_STAGES = [
  { key: 'plan',      label: '生产计划', icon: <ClipboardList className="w-5 h-5" />, color: 'from-blue-500 to-blue-700',     bgColor: 'bg-blue-50',    textColor: 'text-blue-700',    bgHex: '#eff6ff' },
  { key: 'seed',      label: '种源管理', icon: <Sprout className="w-5 h-5" />,         color: 'from-emerald-500 to-emerald-700', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', bgHex: '#ecfdf5' },
  { key: 'seedling',  label: '育苗管理', icon: <Sprout className="w-5 h-5" />,         color: 'from-teal-500 to-teal-700',     bgColor: 'bg-teal-50',    textColor: 'text-teal-700',    bgHex: '#f0fdfa' },
  { key: 'planting',  label: '种植管理', icon: <Leaf className="w-5 h-5" />,           color: 'from-green-500 to-green-700',   bgColor: 'bg-green-50',   textColor: 'text-green-700',   bgHex: '#f0fdf4' },
  { key: 'harvest',   label: '采收入库', icon: <Package className="w-5 h-5" />,        color: 'from-amber-500 to-amber-700',   bgColor: 'bg-amber-50',   textColor: 'text-amber-700',   bgHex: '#fffbeb' },
  { key: 'inventory', label: '库存管理', icon: <Warehouse className="w-5 h-5" />,      color: 'from-purple-500 to-purple-700', bgColor: 'bg-purple-50',  textColor: 'text-purple-700',  bgHex: '#faf5ff' },
];

/** 状态映射（强类型 Record<BatchStatus, ...> 避免 status: string 漏检） */
const STATUS_STYLE: Record<BatchStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  planning: 'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  draft: '草稿',
  planning: '规划中',
  published: '已发布',
  in_progress: '进行中',
  completed: '已完成',
  overdue: '已逾期',
};

/** 确定批次处于哪个追溯环节（按种源→育苗→种植→采收→库存 优先级由后往前判断） */
function getBatchStage(batch: BatchStatItem): ChainStageKey {
  if (batch.status === 'completed') return 'inventory';
  if (batch.actualQuantity > 0) return 'harvest';
  if (batch.hasPlanting) return 'planting';
  if (batch.hasSeedling) return 'seedling';
  if (batch.hasSeedSource) return 'seed';
  return 'plan';
}

/** 计算环节统计 */
function computeStageStats(batches: BatchStatItem[]) {
  return CHAIN_STAGES.map((stage) => {
    const stageBatches = batches.filter((b) => getBatchStage(b) === stage.key);
    return {
      ...stage,
      count: stageBatches.length,
      batches: stageBatches,
    };
  });
}

// ========== 子组件 ==========

/** Sankey 流程示意（纯CSS实现） */
function SankeyFlow({ stages }: { stages: ReturnType<typeof computeStageStats> }) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Link className="w-5 h-5 text-teal-600" />
        全链条流程示意
      </h3>
      <div className="flex items-start gap-0 min-w-[900px] py-4">
        {stages.map((stage, idx) => (
          <div key={stage.key} className="flex items-start flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-lg mb-2`}>
                <div className="text-white text-center">
                  <div className="flex justify-center mb-1">{stage.icon}</div>
                  <p className="text-xs font-semibold">{stage.label}</p>
                </div>
              </div>
              <div className={`text-center ${stage.textColor}`}>
                <p className="text-lg font-bold">{stage.count}</p>
                <p className="text-xs">批次</p>
              </div>
              <div className="w-full px-2 mt-1">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                    style={{ width: `${(stage.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            {idx < stages.length - 1 && (
              <div className="flex items-center pt-10 flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-gray-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 环节详情面板 */
function StageDetailPanel({
  stage,
  onViewBatch,
}: {
  stage: ReturnType<typeof computeStageStats>[0] & { items?: ChainStageStat['items'] };
  onViewBatch: (batch: BatchStatItem) => void;
}) {
  const items = stage.items || [];
  const hasContent = stage.batches.length > 0 || items.length > 0;

  return (
    <div className={`rounded-xl border p-5 border-opacity-30`} style={{ backgroundColor: stage.bgHex }}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
          <div className="text-white">{stage.icon}</div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{stage.label}</h3>
          <p className="text-xs text-gray-500">{stage.count} 条记录</p>
        </div>
      </div>
      {!hasContent ? (
        <p className="text-sm text-gray-400 py-3 text-center">暂无该环节记录</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {/* 批次卡片（生产计划阶段） */}
          {stage.batches.map((batch) => (
            <button
              key={batch.id}
              className="w-full flex items-center justify-between bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-left"
              onClick={() => onViewBatch(batch)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{batch.batchName || batch.batchCode}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{batch.cropName}</span>
                  <span>|</span>
                  <span>{batch.greenhouse}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[batch.status] || 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[batch.status] || batch.status}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          ))}
          {/* 环节记录卡片（种源/育苗/种植/采收/库存） */}
          {items.map((item) => (
            <div
              key={item.id || item.code}
              className="w-full bg-white rounded-lg p-3 shadow-sm text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.name || item.code}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                  {item.cropName && <span>{item.cropName}</span>}
                  {item.cropName && item.variety && <span>|</span>}
                  {item.variety && <span>{item.variety}</span>}
                  {item.greenhouse && <><span>|</span><span>{item.greenhouse}</span></>}
                  {item.supplierName && <><span>|</span><span>{item.supplierName}</span></>}
                  {item.quantity != null && <><span>|</span><span>{item.quantity}{item.unit || ''}</span></>}
                  {item.totalAmount != null && <><span>|</span><span className="text-amber-600 font-medium">¥{Number(item.totalAmount).toLocaleString()}</span></>}
                </div>
              </div>
              {item.status && (
                <div className="mt-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_STYLE as Record<string, string>)[item.status] || 'bg-gray-100 text-gray-700'}`}>
                    {(STATUS_LABEL as Record<string, string>)[item.status] || item.status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 主页面组件 ==========

interface ChainTraceabilityProps { hideHeader?: boolean; }

export default function ChainTraceability({ hideHeader }: ChainTraceabilityProps) {
  const batchItems = useSummaryDataStore((s) => s.batchItems);
  const chainStages = useSummaryDataStore((s) => s.chainStages);
  const isLoading = useSummaryDataStore((s) => s.isLoading);
  const error = useSummaryDataStore((s) => s.error);
  const fetchBatchStats = useSummaryDataStore((s) => s.fetchBatchStats);
  const fetchChainOverview = useSummaryDataStore((s) => s.fetchChainOverview);

  // 2026-07-16：抽屉状态升级到 URL deep link（?batchId=xxx）
  // 理由：跨页分享、刷新保持、浏览器后退/前进 — 符合 url-deep-link-modal-pattern 铁律
  const [searchParams, setSearchParams] = useSearchParams();
  const batchIdFromUrl = searchParams.get('batchId');
  const drawerOpen = !!batchIdFromUrl;
  const selectedBatch = useMemo(
    () => (batchIdFromUrl ? batchItems.find((b) => String(b.id) === batchIdFromUrl) ?? null : null),
    [batchIdFromUrl, batchItems]
  );

  // ========== 分页状态同步 URL（?page=&pageSize=） ==========
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;

  const setDrawerOpen = (open: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (open && selectedBatch) next.set('batchId', String(selectedBatch.id));
      else next.delete('batchId');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    fetchBatchStats({});
    fetchChainOverview();
  }, [fetchBatchStats, fetchChainOverview]);

  // 环节统计：优先使用API返回的独立统计数据，fallback到批次分类
  const stageStats = useMemo(() => {
    if (chainStages.length > 0) {
      return CHAIN_STAGES.map((stage) => {
        const apiStage = chainStages.find((s) => s.key === stage.key);
        const stageBatches = batchItems.filter((b) => getBatchStage(b) === stage.key);
        return {
          ...stage,
          count: apiStage ? apiStage.count : stageBatches.length,
          batches: stageBatches,
          items: apiStage?.items || [],
        };
      });
    }
    return computeStageStats(batchItems);
  }, [chainStages, batchItems]);

  // 整体统计
  const totalBatches = batchItems.length;
  const completedBatches = batchItems.filter((b) => b.status === 'completed').length;
  const inProgressBatches = batchItems.filter((b) => b.status === 'in_progress').length;

  // ========== 分页数据 ==========
  const totalCount = batchItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return batchItems.slice(start, end);
  }, [batchItems, currentPage, pageSize]);

  // 分页变化处理（同步到 URL）
  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(page));
      return next;
    }, { replace: true });
  };

  const handlePageSizeChange = (size: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('pageSize', String(size));
      next.delete('page'); // 重置到第 1 页
      return next;
    }, { replace: true });
  };

  const handleViewBatch = (batch: BatchStatItem) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('batchId', String(batch.id));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          icon={<Link className="w-6 h-6 text-white" />}
          title="全链条追溯"
          description="从种源→育苗→种植→采收入库完整追溯链，6环节批次追踪"
        />
      )}

      {/* 概览KPI */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<Layers className="w-4 h-4 text-white" />}
          label="追踪批次数"
          value={totalBatches}
          colorScheme="teal"
          compact
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4 text-white" />}
          label="已完成"
          value={completedBatches}
          colorScheme="emerald"
          compact
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-white" />}
          label="进行中"
          value={inProgressBatches}
          colorScheme="blue"
          compact
        />
        <KpiCard
          icon={<Link className="w-4 h-4 text-white" />}
          label="追溯环节"
          value={CHAIN_STAGES.length}
          colorScheme="purple"
          compact
        />
      </KpiCardGrid>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">数据加载失败：{error}</span>
        </div>
      )}

      {/* Sankey 流程示意 */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      ) : (
        <SankeyFlow stages={stageStats} />
      )}

      {/* 6环节详情面板 */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stageStats.map((stage) => (
            <StageDetailPanel
              key={stage.key}
              stage={stage}
              onViewBatch={handleViewBatch}
            />
          ))}
        </div>
      )}

      {/* 全批次追溯列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">全批次追溯列表</h3>
          <p className="text-xs text-gray-400 mt-1">所有批次按环节归类，点击查看批次详情</p>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">批次编号</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">批次名称</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">温室</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">当前环节</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">完成率</TableHead>
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {batchItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {isLoading ? '加载中...' : '暂无批次数据'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBatches.map((batch) => {
                  const stage = CHAIN_STAGES.find((s) => s.key === getBatchStage(batch));
                  return (
                    <TableRow
                      key={batch.id}
                      className="hover:bg-teal-50/50 transition-colors cursor-pointer"
                      onClick={() => handleViewBatch(batch)}
                    >
                      <TableCell className="px-4 py-2.5 text-sm text-gray-900 font-medium whitespace-nowrap">{batch.batchCode}</TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">{batch.batchName}</TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">{batch.cropName}</TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">{batch.greenhouse}</TableCell>
                      <TableCell className="px-4 py-2.5 whitespace-nowrap">
                        {stage && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${stage.bgColor} ${stage.textColor}`}>
                            <span className="scale-75">{stage.icon}</span>
                            {stage.label}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[batch.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABEL[batch.status] || batch.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[50px]">
                            <div
                              className={`h-full rounded-full ${batch.completionRate >= 100 ? 'bg-emerald-500' : batch.completionRate >= 50 ? 'bg-teal-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(batch.completionRate || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-9 text-right">{(batch.completionRate || 0).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center">
                        <span className="text-xs text-teal-600 font-medium cursor-pointer hover:text-teal-800">追溯详情</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {totalCount > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              显示 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} 条，共 {totalCount} 条
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              showPageSize={true}
            />
          </div>
        )}
      </div>

      {/* 批次详情抽屉 */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`批次追溯 - ${selectedBatch?.batchCode || ''}`}
        width={480}
      >
        {selectedBatch && (
          <div className="space-y-4">
            {/* 当前环节 */}
            {(() => {
              const stage = CHAIN_STAGES.find((s) => s.key === getBatchStage(selectedBatch));
              return stage ? (
                <div className={`rounded-xl p-4 border`} style={{ backgroundColor: stage.bgHex }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
                      <div className="text-white">{stage.icon}</div>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${stage.textColor}`}>当前环节：{stage.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">点击对应环节卡片可跳转到该模块</p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">基本信息</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">批次编号：</span><span className="text-gray-900 font-medium">{selectedBatch.batchCode}</span></div>
                <div><span className="text-gray-400">批次名称：</span><span className="text-gray-900">{selectedBatch.batchName}</span></div>
                <div><span className="text-gray-400">作物品种：</span><span className="text-gray-900">{selectedBatch.cropName}</span></div>
                <div><span className="text-gray-400">温室：</span><span className="text-gray-900">{selectedBatch.greenhouse}</span></div>
                <div><span className="text-gray-400">种植面积：</span><span className="text-gray-900">{selectedBatch.plantingArea || '-'}</span></div>
                <div>
                  <span className="text-gray-400">状态：</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[selectedBatch.status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABEL[selectedBatch.status] || selectedBatch.status}
                  </span>
                </div>
              </div>
            </div>

            {/* 产量进度 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">产量进度</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">目标产量：</span><span className="text-gray-900 font-medium">{selectedBatch.targetYield?.toLocaleString()} kg</span></div>
                <div><span className="text-gray-400">实际产量：</span><span className="text-gray-900 font-medium">{selectedBatch.actualQuantity?.toLocaleString()} kg</span></div>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>完成率</span>
                  <span>{(selectedBatch.completionRate || 0).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${Math.min(selectedBatch.completionRate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 时间节点 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">时间节点</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">种植日期：</span><span className="text-gray-900">{selectedBatch.plantingDate || '-'}</span></div>
                <div><span className="text-gray-400">预计采收：</span><span className="text-gray-900">{selectedBatch.expectedHarvestDate || '-'}</span></div>
                <div><span className="text-gray-400">实际采收：</span><span className="text-gray-900">{selectedBatch.actualHarvestDate || '-'}</span></div>
              </div>
            </div>

            {/* 任务统计 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">任务统计</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-3 bg-teal-50 rounded-lg">
                  <p className="text-lg font-bold text-teal-700">{selectedBatch.taskCount || 0}</p>
                  <p className="text-xs text-teal-500">总任务</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-700">{selectedBatch.completedTaskCount || 0}</p>
                  <p className="text-xs text-emerald-500">已完成</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-lg font-bold text-amber-700">{selectedBatch.pendingTaskCount || 0}</p>
                  <p className="text-xs text-amber-500">待处理</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
