/**
 * 每日问题汇总表页面
 *
 * 数据源策略（2026-10-05 修订）：
 * - 列表数据：优先从后端 `/api/problems` 拉（V2.1 铁律：API 直连），按 create_time 范围过滤
 * - fallback：API 失败时降级到 localStorage mock 数据（避免领导看不到列表）
 * - statCards：来自 useDailyProblemSummary → 后端 `/api/problems/summary-overview`
 *
 * 列渲染对齐 ProblemEntry 字段名；后端 Problem 数据通过 useProgressMapper 映射。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X, Send } from 'lucide-react';
import {
  PageHeader,
  StatCards,
  Filters,
  SummaryTable,
  ExportModal,
  useExport,
} from '../components/summary';
import { useDailyProblemSummary, useProblemDispatch, usePersistentProblems } from '../hooks';
import { getProblems, dispatchTempTaskForProblem, type Problem as ApiProblem } from '../services/apiProblemService';
import type { ProblemEntry } from '../hooks/usePersistentProblems';
import { problemStatusToCN, isProblemStatus } from '../utils/problemStatus';
import type { TableColumn } from '../components/summary/types';
import { PROBLEM_SOURCE_LABEL } from '../components/summary/constants';

interface DailyProblemSummaryProps {
  /**
   * 2026-10-01：复用入口开关。
   * - true：跳过 PageHeader，用于嵌入到 /summary/problems 的「问题明细」TAB
   * - false/不传：完整页面（标题+内容），用于独立路由 /daily-problem-summary
   */
  hideHeader?: boolean;
  /**
   * 2026-10-05：日期范围 prop（来自 ProblemSummary 趋势图 TAB 的"本年度/月/季度/自定义"）。
   * 列表后端按 create_time 在此范围内过滤；
   * 不传则拉全部（适合独立路由 /daily-problem-summary 的默认场景）。
   */
  dateRange?: { startDate: string; endDate: string };
}

/**
 * 2026-10-05：后端 Problem → 前端 ProblemEntry 字段映射
 * - 后端 problems 表只有 priority 字段（high/medium/low），无 severity 列
 * - 前端 ProblemEntry.issueSeverity 用中文（轻微/中等/严重）
 * - 这里把后端 priority 英文值映射为前端中文枚举
 */
function mapApiProblemToEntry(p: ApiProblem): ProblemEntry {
  // 后端 SELECT * 实际包含 priority 字段，但 Problem TS interface 未声明——运行时读不到 TS 类型
  // 用 unknown cast 取值，兼容两种取值（priority 英文 / severity 中文历史数据）
  const raw = p as unknown as { priority?: string; severity?: string };
  return {
    id: typeof p.id === 'string' ? parseInt(p.id, 10) || 0 : Number(p.id),
    problemCode: p.problemCode,
    greenhouseId: p.greenhouseId || '',
    greenhouseName: p.greenhouseName || '-',
    cropName: '',  // 后端 Problem schema 暂未含 cropName（数据库 schema.ts 也无），保留空
    inspectorId: p.creatorId,
    inspectorName: p.creatorName,
    checkDate: (p.createTime || '').slice(0, 10),
    checkTime: (p.createTime || '').slice(11, 16),
    weather: '',
    temperature: 0,
    humidity: 0,
    cropStatus: '良好',
    issueText: p.description || p.title || '',
    // 修复：后端 priority 英文 → 前端 severity 中文（之前用 p.severity 是 undefined）
    issueSeverity: mapPriorityToSeverity(raw.priority ?? raw.severity),
    status: (p.status === '已处理' ? '已处理'
            : p.status === '处理中' ? '处理中'
            : '待处理') as ProblemEntry['status'],
    handler: p.handlerName || '',
    handleDate: p.handleTime ? (p.handleTime as string).slice(0, 10) : '',
    handleResult: p.handleResult || '',
    completionTime: p.handleTime || '',
    expectedCompletion: p.expectedCompletion || '',
    sourceModule: (p.sourceType as ProblemEntry['sourceModule']) || 'other',
    sourceId: p.sourceId || '',
    sourceDetail: '',
    remarks: '',
    images: p.photos || [],
  };
}

/** priority 英文 → severity 中文映射（兼容历史数据已有 severity 字段的情况） */
function mapPriorityToSeverity(input?: string): ProblemEntry['issueSeverity'] {
  if (!input) return '轻微';
  const normalized = input.toLowerCase();
  const map: Record<string, ProblemEntry['issueSeverity']> = {
    high: '严重',
    urgent: '严重',
    medium: '中等',
    normal: '轻微',
    low: '轻微',
  };
  if (map[normalized]) return map[normalized];
  if (input === '严重' || input === '中等' || input === '轻微') return input;
  return '轻微';
}

export default function DailyProblemSummary({ hideHeader = false, dateRange }: DailyProblemSummaryProps = {}) {
  // 筛选状态（P1-2：增加状态/严重程度/搜索）
  const [dateFilter, setDateFilter] = useState('');
  const [greenhouseFilter, setGreenhouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [keyword, setKeyword] = useState('');

  // 获取每日问题汇总聚合数据（用于 statCards / filterOptions）
  const { summaries, statCards, loading, filterOptions } = useDailyProblemSummary({
    date: dateFilter || undefined,
    greenhouse: greenhouseFilter || undefined,
  });

  // ========== 2026-10-05 改进：列表数据走 API（V2.1 铁律） ==========
  /** API 拉到的明细 */
  const [apiProblems, setApiProblems] = useState<ProblemEntry[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  /** fallback 用本地 mock 数据（API 失败时启用） */
  const { problems: localProblems } = usePersistentProblems();

  /** 拉取后端问题明细列表 */
  const fetchDetailProblems = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const params: Parameters<typeof getProblems>[0] = {};
      if (dateRange?.startDate) params.startDate = dateRange.startDate;
      if (dateRange?.endDate) params.endDate = dateRange.endDate;
      // P1-2：状态/严重程度/搜索参数透传给后端
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter && severityFilter !== 'all') params.severity = severityFilter;
      if (keyword.trim()) params.keyword = keyword.trim();
      const list = await getProblems(params);
      setApiProblems(list.map(mapApiProblemToEntry));
      setIsOfflineFallback(false);
    } catch (err) {
      // V2.1：API 失败不应静默 fallback，应提示用户；这里先静默降级 + 标记 offline
      console.warn('[DailyProblemSummary] API 拉取失败，启用 localStorage fallback:', err);
      setApiError((err as Error).message);
      setIsOfflineFallback(true);
    } finally {
      setApiLoading(false);
    }
  }, [dateRange?.startDate, dateRange?.endDate, statusFilter, severityFilter, keyword]);

  /** dateRange 变化时重新拉取 */
  useEffect(() => {
    fetchDetailProblems();
  }, [fetchDetailProblems]);

  /** 当前实际用于展示的明细列表：API 数据优先，失败时 fallback */
  const detailProblems = useMemo(
    () => (isOfflineFallback || apiProblems.length === 0 ? localProblems : apiProblems),
    [apiProblems, localProblems, isOfflineFallback]
  );

  /** 应用前端筛选项（精确日期 + 温室 + 状态 + 严重程度 + 关键词）
   * 注意：dateRange/statusFilter/severityFilter/keyword 已在 API 层过滤；这里只补前端精确日期 + 温室 */
  const filteredProblems = useMemo(() => {
    return detailProblems.filter((p) => {
      if (dateFilter && p.checkDate !== dateFilter) return false;
      if (greenhouseFilter && greenhouseFilter !== '全部' && p.greenhouseName !== greenhouseFilter) return false;
      return true;
    });
  }, [detailProblems, dateFilter, greenhouseFilter]);

  // 问题分派 Hook
  const { dispatchProblem, workerList } = useProblemDispatch();

  // 分派弹窗状态
  const [dispatchModal, setDispatchModal] = useState<{
    isOpen: boolean;
    problem: ProblemEntry | null;
  }>({ isOpen: false, problem: null });

  // 选中的执行人
  const [selectedWorker, setSelectedWorker] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredProblems.length || 1);
  const paginatedData = filteredProblems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 详情弹窗状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    data: ProblemEntry | null;
  }>({ isOpen: false, data: null });

  // P1-1：分派中的 loading + 错误提示
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // 导出 Hook（用 ProblemEntry 明细字段）
  const exportHook = useExport({
    data: filteredProblems.map((p) => ({
      日期: p.checkDate,
      温室: p.greenhouseName,
      作物: p.cropName,
      上报人: p.inspectorName,
      来源: PROBLEM_SOURCE_LABEL[p.sourceModule || 'other'] || '其他',
      问题描述: p.issueText,
      严重程度: p.issueSeverity,
      状态: problemStatusToCN(p.status),
      处理人: p.handler || '-',
    })),
    headers: ['日期', '温室', '作物', '上报人', '来源', '问题描述', '严重程度', '状态', '处理人'],
    filenamePrefix: '每日问题汇总',
  });

  // 筛选配置（P1-2：增加状态 / 严重程度 / 搜索）
  const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: '全部状态' },
    { value: '待处理', label: '待处理' },
    { value: '处理中', label: '处理中' },
    { value: '已处理', label: '已处理' },
    { value: '待验收', label: '待验收' },
  ];
  // P1-2 修复：value 用后端 priority 英文值（low/medium/high），label 显示中文
  // 否则 send '严重' 给后端 SQL `priority = ?` 不会匹配任何记录（problems 表 priority 是英文枚举）
  const SEVERITY_FILTER_OPTIONS = [
    { value: 'all', label: '全部严重度' },
    { value: 'high', label: '严重' },
    { value: 'medium', label: '中等' },
    { value: 'low', label: '轻微' },
  ];

  const filterSelects = [
    {
      key: 'greenhouse',
      label: '温室',
      options: filterOptions.greenhouses,
      value: greenhouseFilter,
      onChange: (value: string) => {
        setGreenhouseFilter(value);
        setCurrentPage(1);
      },
    },
    {
      key: 'status',
      label: '状态',
      options: STATUS_FILTER_OPTIONS,
      value: statusFilter,
      onChange: (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1);
      },
    },
    {
      key: 'severity',
      label: '严重度',
      options: SEVERITY_FILTER_OPTIONS,
      value: severityFilter,
      onChange: (value: string) => {
        setSeverityFilter(value);
        setCurrentPage(1);
      },
    },
  ];

  // 表格列配置（key 对齐 ProblemEntry 字段名）
  const columns: TableColumn<ProblemEntry>[] = [
    { key: 'checkDate', label: '日期', width: '120px' },
    { key: 'greenhouseName', label: '温室', width: '80px' },
    { key: 'cropName', label: '作物', width: '80px' },
    { key: 'inspectorName', label: '上报人', width: '80px' },
    {
      key: 'sourceModule',
      label: '来源',
      width: '80px',
      render: (value: unknown) => (
        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
          {PROBLEM_SOURCE_LABEL[value as keyof typeof PROBLEM_SOURCE_LABEL] || String(value || '-')}
        </span>
      ),
    },
    {
      key: 'issueText',
      label: '问题描述',
      width: '200px',
      render: (value: unknown, record: ProblemEntry) => (
        <span
          className="max-w-[150px] truncate block cursor-pointer text-blue-600 hover:text-blue-800"
          onClick={() => setDetailModal({ isOpen: true, data: record })}
          title="点击查看详情"
        >
          {String(value || '')}
        </span>
      ),
    },
    {
      key: 'issueSeverity',
      label: '严重程度',
      width: '100px',
      render: (value: unknown) => {
        const v = String(value);
        const className =
          v === '严重' ? 'bg-red-100 text-red-700' :
          v === '中等' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700';
        return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${className}`}>{v}</span>;
      },
    },
    {
      key: 'status',
      label: '状态',
      width: '100px',
      render: (value: unknown) => {
        // value 来自 ProblemEntry.status，统一用 problemStatusToCN 转中文（兼容枚举别名）
        const cn = problemStatusToCN(String(value));
        const className =
          cn === '已处理' ? 'bg-green-100 text-green-700' :
          cn === '处理中' ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-700';
        return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${className}`}>{cn}</span>;
      },
    },
    { key: 'handler', label: '处理人', width: '80px' },
  ];

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 - hideHeader=true 时跳过（用于嵌入到其他页面） */}
      {!hideHeader && (
        <PageHeader
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          title="每日问题汇总表"
          description="每日生产问题记录与处理情况"
        />
      )}

      {/* 统计卡片 - 使用 Hook 返回的动态数据 */}
      <StatCards cards={statCards} />

      {/* 2026-10-05：API 失败提示（offline fallback 警告） */}
      {isOfflineFallback && apiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>无法连接后端（{apiError}），已临时切换到本地缓存数据，列表可能不全。</span>
          <button
            type="button"
            onClick={() => fetchDetailProblems()}
            className="ml-auto px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 rounded transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {/* 筛选工具栏 */}
      <Filters
        filters={{
          date: { key: 'date', label: '日期', value: dateFilter, onChange: setDateFilter },
          selects: filterSelects,
        }}
        showExportMode={exportHook.exportMode}
        selectedCount={exportHook.selectedRows.length}
        onExportClick={exportHook.handleExportClick}
        onConfirmExport={exportHook.handleConfirmExport}
        onCancelExport={exportHook.handleCancelExport}
      />

      {/* P1-2：关键词搜索（按 Enter 触发，避免每键 fetch） */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchDetailProblems(); }}
          placeholder="搜索问题描述/温室/编号"
          className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={() => fetchDetailProblems()}
          className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          搜索
        </button>
        {(keyword || statusFilter !== '' || severityFilter !== '') && (
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setStatusFilter('');
              setSeverityFilter('');
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            清空筛选
          </button>
        )}
      </div>

      {/* 数据表格 */}
      <SummaryTable
        columns={columns}
        data={paginatedData}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportHook.exportMode}
        selectedRows={exportHook.selectedRows}
        onPageChange={setCurrentPage}
        onSelectAll={() => exportHook.handleSelectAll(filteredProblems.map((p) => p.id))}
        onSelectRow={(id) => exportHook.handleSelectRow(id as number)}
        onView={(record) => {
          // 2026-10-05 修复：record 本身就是 ProblemEntry，不再读取不存在的 _problemData 字段
          setDetailModal({ isOpen: true, data: record });
        }}
      />

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={exportHook.showExportModal}
        selectedCount={exportHook.selectedRows.length}
        exportFormat={exportHook.exportFormat}
        onFormatChange={exportHook.setExportFormat}
        onClose={() => exportHook.setShowExportModal(false)}
        onConfirm={exportHook.handleDoExport}
      />

      {/* 详情弹窗 */}
      {detailModal.isOpen && detailModal.data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">问题详情</h3>
              <button
                onClick={() => setDetailModal({ isOpen: false, data: null })}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* 基本信息区域 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">温室</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.greenhouseName}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">作物</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.cropName}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">巡检日期</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.checkDate} {detailModal.data.checkTime}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">巡检员</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.inspectorName}</div>
                  </div>
                </div>
              </div>

              {/* 环境信息区域 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">环境信息</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-blue-500 mb-1">天气</div>
                    <div className="text-sm font-medium text-blue-700">{detailModal.data.weather}</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-xs text-orange-500 mb-1">温度</div>
                    <div className="text-sm font-medium text-orange-700">{detailModal.data.temperature}°C</div>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded-lg">
                    <div className="text-xs text-cyan-500 mb-1">湿度</div>
                    <div className="text-sm font-medium text-cyan-700">{detailModal.data.humidity}%</div>
                  </div>
                </div>
              </div>

              {/* 作物状态 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">作物状态</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      detailModal.data.cropStatus === '良好' ? 'bg-green-100 text-green-700' :
                      detailModal.data.cropStatus === '一般' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {detailModal.data.cropStatus}
                    </span>
                    {detailModal.data.plantHeight && (
                      <span className="text-sm text-gray-600">株高: {detailModal.data.plantHeight}cm</span>
                    )}
                    {detailModal.data.leafCount && (
                      <span className="text-sm text-gray-600">叶片数: {detailModal.data.leafCount}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 问题描述 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">问题描述</h4>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      detailModal.data.issueSeverity === '严重' ? 'bg-red-100 text-red-700' :
                      detailModal.data.issueSeverity === '中等' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {detailModal.data.issueSeverity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{detailModal.data.issueText}</p>
                </div>
              </div>

              {/* 问题照片 */}
              {detailModal.data.images && detailModal.data.images.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">问题照片</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {detailModal.data.images.slice(0, 6).map((img: string, idx: number) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 处理信息 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">处理信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">状态</div>
                    <div className="text-sm font-medium">
                      {/* 2026-09-21 修复：原用中文比对英文枚举（恒不命中）+ 原样输出英文值 */}
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        problemStatusToCN(detailModal.data.status) === '已处理' ? 'bg-green-100 text-green-700' :
                        problemStatusToCN(detailModal.data.status) === '处理中' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {problemStatusToCN(detailModal.data.status)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">处理人</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.handler || '-'}</div>
                  </div>
                  {detailModal.data.handleDate && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">处理日期</div>
                      <div className="text-sm font-medium text-gray-800">{detailModal.data.handleDate}</div>
                    </div>
                  )}
                  {detailModal.data.handleResult && (
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <div className="text-xs text-gray-500 mb-1">处理结果</div>
                      <div className="text-sm font-medium text-gray-800">{detailModal.data.handleResult}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 备注 */}
              {detailModal.data.remarks && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">备注</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{detailModal.data.remarks}</p>
                  </div>
                </div>
              )}

              {/* 分派操作 - 仅待处理状态显示 */}
              {/* 2026-09-21 修复：原先用中文 '待处理' 比对英文枚举 pending，条件恒为 false，
                  导致该分派按钮永远不会出现。 */}
              {isProblemStatus(detailModal.data.status, 'pending') && !detailModal.data.sourceTaskId && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      setSelectedWorker(null);
                      setDispatchModal({ isOpen: true, problem: detailModal.data });
                    }}
                    className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    分派问题给员工处理
                  </button>
                </div>
              )}

              {/* 已分派提示 */}
              {detailModal.data.sourceTaskId && (
                <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    此问题已分派给 <span className="font-medium">{detailModal.data.handler}</span> 处理
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 分派弹窗 */}
      {dispatchModal.isOpen && dispatchModal.problem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">分派问题</h3>
              <button
                onClick={() => {
                  setDispatchModal({ isOpen: false, problem: null });
                  setSelectedWorker(null);
                }}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {/* 问题信息 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">问题描述</div>
                <div className="text-sm font-medium text-gray-800 mb-2">
                  {dispatchModal.problem.issueText}
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>温室：{dispatchModal.problem.greenhouseName}</span>
                  <span>严重程度：{dispatchModal.problem.issueSeverity}</span>
                </div>
              </div>

              {/* 执行人选择 */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">选择执行人</div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {workerList.map(worker => (
                    <div
                      key={worker.id}
                      onClick={() => setSelectedWorker({ id: worker.id, name: worker.name })}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedWorker?.id === worker.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{worker.name}</div>
                          <div className="text-xs text-gray-500">{worker.position}</div>
                        </div>
                        <div className="flex gap-1">
                          {worker.skillTags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="px-6 py-3 border-t bg-gray-50">
              {dispatchError && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  分派失败：{dispatchError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setDispatchModal({ isOpen: false, problem: null });
                    setSelectedWorker(null);
                    setDispatchError(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
              <button
                onClick={async () => {
                  if (!selectedWorker || !dispatchModal.problem) return;
                  const problem = dispatchModal.problem;
                  const problemIdStr = String(problem.id);
                  setDispatching(true);
                  try {
                    // P1-1：先调后端真正派单（V2.1 铁律：API 直连）
                    const result = await dispatchTempTaskForProblem(problemIdStr, {
                      assigneeId: selectedWorker.id,
                      assigneeName: selectedWorker.name,
                      title: `[问题]${problem.issueText.slice(0, 30)}`,
                      greenhouseName: problem.greenhouseName,
                      urgency: problem.issueSeverity === '严重' ? 'urgent' : problem.issueSeverity === '中等' ? 'high' : 'normal',
                      description: problem.issueText,
                    });
                    if (!result) {
                      throw new Error('后端返回为空');
                    }
                    // 后端派单成功 → 再触发本地 lifecycle 记录（保持兼容性）
                    dispatchProblem(problem.id, selectedWorker.id, selectedWorker.name);
                    setDispatchModal({ isOpen: false, problem: null });
                    setSelectedWorker(null);
                    setDetailModal({ isOpen: false, data: null });
                    // 拉新列表（后端状态已更新）
                    fetchDetailProblems();
                  } catch (err) {
                    // V2.1：派单失败时抛错给用户，不静默吞错
                    console.error('[DailyProblemSummary] 分派失败:', err);
                    setDispatchError((err as Error).message || '分派失败，请重试');
                  } finally {
                    setDispatching(false);
                  }
                }}
                disabled={!selectedWorker || dispatching}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {dispatching ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {dispatching ? '分派中...' : '确认分派'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
