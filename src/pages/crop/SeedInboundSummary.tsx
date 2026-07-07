/**
 * 种源外购入库汇总页面
 * 2026-07-07: 按作物品种（cropName 最细化）聚合查询所有外购入库流水
 *
 * Master-Detail 结构：
 * - Master 一行 = 一个最细化作物品种
 * - 行内折叠展开明细（参考物料入库页面 MaterialInboundTab 模式）
 * - 汇总 + 明细 双 Excel 导出
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui';
import { ArrowLeft, Search, Download, Package, RotateCcw, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert } from '@/lib/dialogService';
import {
  fetchSeedInboundSummary,
  type InboundSummaryRow,
  type InboundDetailRow,
  type SummaryFilters,
} from '@/services/apiSeedSourceSummaryService';

/**
 * 行单元格：右对齐数字、千分位
 */
function fmtNum(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '0';
  return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}
function fmtMoney(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '¥0.00';
  return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SeedInboundSummary() {
  const navigate = useNavigate();

  // 筛选条件
  const [filters, setFilters] = useState<SummaryFilters>({
    startDate: '',
    endDate: '',
    cropName: '',
    supplierId: '',
  });
  // 提交后才生效的筛选（点击「查询」时同步）
  const [appliedFilters, setAppliedFilters] = useState<SummaryFilters>({});

  // 数据状态
  const [rows, setRows] = useState<InboundSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 展开状态：key = cropName（最细化作物品种）
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (cropName: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(cropName)) next.delete(cropName);
      else next.add(cropName);
      return next;
    });
  };

  // 分页状态
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  // 切筛选时重置到第 1 页
  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [appliedFilters]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pagination.pageSize));
  const startIndex = (pagination.current - 1) * pagination.pageSize;
  const endIndex = Math.min(startIndex + pagination.pageSize, rows.length);
  const paginatedRows = rows.slice(startIndex, endIndex);

  // ============ 数据加载 ============
  const loadData = useCallback(async (f: SummaryFilters) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchSeedInboundSummary(f);
      setRows(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setErrorMsg(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次进入 + 筛选变化时加载
  useEffect(() => {
    void loadData(appliedFilters);
  }, [appliedFilters, loadData]);

  // ============ 操作：查询 / 重置 ============
  const handleQuery = () => {
    setAppliedFilters({
      startDate: filters.startDate?.trim() || undefined,
      endDate: filters.endDate?.trim() || undefined,
      cropName: filters.cropName?.trim() || undefined,
      supplierId: filters.supplierId?.trim() || undefined,
    });
  };
  const handleReset = () => {
    setFilters({ startDate: '', endDate: '', cropName: '', supplierId: '' });
    setAppliedFilters({});
  };

  // ============ 导出：汇总（1 sheet）============
  const handleExportMaster = () => {
    if (rows.length === 0) {
      void showAlert('当前无数据可导出');
      return;
    }
    const masterData = rows.map(r => ({
      '作物品种（最细化）': r.cropName,
      '作物分类': r.cropCategory || '-',
      '类型': r.typeName || '-',
      '品种': r.varietyName || '-',
      '入库次数': r.inboundCount,
      '累计数量': r.totalQuantity,
      '累计金额（元）': Number(r.totalAmount).toFixed(2),
      '供应商清单': r.supplierSummary,
      '最近入库日期': r.lastInboundDate,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(masterData, {
      header: ['作物品种（最细化）', '作物分类', '类型', '品种', '入库次数', '累计数量', '累计金额（元）', '供应商清单', '最近入库日期'],
    });
    // 列宽
    ws['!cols'] = [
      { wch: 22 }, // 品种
      { wch: 12 }, // 分类
      { wch: 12 }, // 类型
      { wch: 12 }, // 品种
      { wch: 10 }, // 入库次数
      { wch: 14 }, // 累计数量
      { wch: 16 }, // 累计金额
      { wch: 30 }, // 供应商清单
      { wch: 14 }, // 最近入库日期
    ];
    XLSX.utils.book_append_sheet(wb, ws, '按品种汇总');
    XLSX.writeFile(wb, `种源外购入库_按品种汇总_${todayLocal()}.xlsx`);
  };

  // ============ 导出：明细（1 sheet，含所有品种的下属流水）============
  const handleExportDetails = () => {
    if (rows.length === 0) {
      void showAlert('当前无数据可导出');
      return;
    }
    // 摊平：每行 = 一次入库流水（含品种聚合信息列以方便人工核查）
    const detailData: any[] = [];
    for (const r of rows) {
      for (const d of r.details) {
        detailData.push({
          '作物品种（最细化）': r.cropName,
          '作物分类': r.cropCategory || '-',
          '品种': r.varietyName || '-',
          '入库日期': d.recordDate,
          '种源批号': d.seedCode || '-',
          '供应商': d.supplierName,
          '入库数量': d.quantity,
          '单位': d.unit,
          '单价（元）': Number(d.unitPrice).toFixed(2),
          '总金额（元）': Number(d.totalAmount).toFixed(2),
          '操作员': d.operatorName || '-',
        });
      }
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(detailData, {
      header: ['作物品种（最细化）', '作物分类', '品种', '入库日期', '种源批号', '供应商', '入库数量', '单位', '单价（元）', '总金额（元）', '操作员'],
    });
    ws['!cols'] = [
      { wch: 22 }, // 品种
      { wch: 12 }, // 分类
      { wch: 12 }, // 品种
      { wch: 14 }, // 入库日期
      { wch: 18 }, // 批号
      { wch: 16 }, // 供应商
      { wch: 12 }, // 数量
      { wch: 8 },  // 单位
      { wch: 12 }, // 单价
      { wch: 14 }, // 总金额
      { wch: 12 }, // 操作员
    ];
    XLSX.utils.book_append_sheet(wb, ws, '入库流水明细');
    XLSX.writeFile(wb, `种源外购入库_流水明细_${todayLocal()}.xlsx`);
  };

  // ============ 渲染 ============
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 顶部 Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crop/seed-source')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回种源管理
        </Button>
        <h1 className="text-xl font-semibold text-gray-900">种源外购入库汇总</h1>
        <span className="text-xs text-gray-500">按作物品种（最细化）聚合 · 跨供应商汇总</span>
      </div>

      {/* 筛选栏 */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-nowrap gap-3 items-end">
            {/* 开始日期 */}
            <div className="min-w-[140px] flex-shrink-0">
              <Label className="text-gray-700">开始日期</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            {/* 结束日期 */}
            <div className="min-w-[140px] flex-shrink-0">
              <Label className="text-gray-700">结束日期</Label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            {/* 作物品种（最细化）— 可拉伸 */}
            <div className="flex-1 min-w-[180px]">
              <Label className="text-gray-700">作物品种（最细化）</Label>
              <Input
                type="text"
                placeholder="模糊匹配品种名称，如 红颜 / 圆叶菠菜"
                value={filters.cropName || ''}
                onChange={(e) => setFilters({ ...filters, cropName: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            {/* 供应商 ID（精确）— 可拉伸 */}
            <div className="flex-1 min-w-[160px]">
              <Label className="text-gray-700">供应商 ID（精确）</Label>
              <Input
                type="text"
                placeholder="供应商 ID"
                value={filters.supplierId || ''}
                onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            {/* 按钮行：重置、搜索 — 放在所有筛选字段之后，固定不缩小，与 SeedSourceFilter 一致 */}
            <div className="flex gap-2 items-end flex-shrink-0 ml-auto">
              <Button
                variant="warning"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleQuery}
              >
                <Search className="w-4 h-4" />
                搜索
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          加载失败：{errorMsg}
        </div>
      )}

      {/* Master 表格（聚合行）*/}
      <Card>
        {/* 表格标题 + 导出按钮（与 SeedSourceTable 操作栏样式一致） */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">种源外购入库汇总表</h3>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handleExportMaster}>
              <Download className="w-4 h-4 mr-1" /> 导出汇总
            </Button>
            <Button variant="default" size="sm" onClick={handleExportDetails}>
              <Download className="w-4 h-4 mr-1" /> 导出明细
            </Button>
          </div>
        </div>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Package className="w-12 h-12 text-gray-300" />}
              title="暂无入库汇总数据"
              description="请调整筛选条件，或确认已有外购入库记录"
            />
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <TableRow className="hover:from-blue-500 hover:to-blue-600">
                  {/* 操作列：折叠/展开按钮 */}
                  <TableHead className="px-2 py-3 text-white text-sm font-semibold whitespace-nowrap w-8"></TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物品种</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物分类</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">类型</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">品种</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap text-right">入库次数</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap text-right">累计数量</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap text-right">累计金额</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">供应商清单</TableHead>
                  <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">最近入库</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-300">
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((r) => (
                    <React.Fragment key={r.cropName}>
                      {/* 主行：聚合信息 + 展开按钮（只点 chevron 列才切换）*/}
                      <TableRow className={`hover:bg-emerald-50 ${expandedRows.has(r.cropName) ? 'bg-emerald-50/30' : ''}`}>
                        <TableCell className="px-2 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(r.cropName)}
                            aria-label={expandedRows.has(r.cropName) ? '收起明细' : '展开明细'}
                            title={expandedRows.has(r.cropName) ? '收起明细' : '展开明细'}
                          >
                            {expandedRows.has(r.cropName) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium text-emerald-700 whitespace-nowrap">{r.cropName}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.cropCategory || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.typeName || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.varietyName || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">{r.inboundCount}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">{fmtNum(r.totalQuantity)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-right text-emerald-700 font-medium whitespace-nowrap">{fmtMoney(r.totalAmount)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate whitespace-nowrap" title={r.supplierSummary}>{r.supplierSummary || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.lastInboundDate || '-'}</TableCell>
                      </TableRow>

                      {/* 展开行：紧跟主行下方，明细表 colSpan = 10（横跨整行）*/}
                      {expandedRows.has(r.cropName) && (
                        <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                          <TableCell colSpan={10} className="px-4 py-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>入库流水明细（{r.details.length} 条 · 按日期倒序）</span>
                                <span className="text-gray-400">供应商：{r.supplierSummary || '-'}</span>
                              </div>
                              {r.details.length === 0 ? (
                                <EmptyState title="暂无明细" description="该品种下还没有入库记录" />
                              ) : (
                                <table className="w-full text-sm border-collapse border border-gray-200 rounded-lg overflow-hidden">
                                  <thead>
                                    <tr className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-left border-b">
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap">入库日期</th>
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap">供应商</th>
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap">批号</th>
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap text-right">数量</th>
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap">单位</th>
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap text-right">单价</th>
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap text-right">总金额</th>
                                      <th className="px-2 py-1.5 font-semibold whitespace-nowrap">操作员</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.details.map((d: InboundDetailRow) => (
                                      <tr key={d.recordId} className="bg-white hover:bg-emerald-50/30">
                                        <td className="px-2 py-1.5 text-gray-700">{d.recordDate}</td>
                                        <td className="px-2 py-1.5">
                                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{d.supplierName}</span>
                                        </td>
                                        <td className="px-2 py-1.5 font-mono text-xs text-gray-600">{d.seedCode || '-'}</td>
                                        <td className="px-2 py-1.5 text-right">{fmtNum(d.quantity)}</td>
                                        <td className="px-2 py-1.5 text-gray-600">{d.unit}</td>
                                        <td className="px-2 py-1.5 text-right">{Number(d.unitPrice).toFixed(2)}</td>
                                        <td className="px-2 py-1.5 text-right text-emerald-700">{fmtMoney(d.totalAmount)}</td>
                                        <td className="px-2 py-1.5 text-gray-600">{d.operatorName || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {/* 分页器 — 固定在表格外部底部，与 SeedSourceTable 一致 */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
            <Pagination
              currentPage={pagination.current}
              totalPages={totalPages}
              onPageChange={(page) => setPagination(prev => ({ ...prev, current: page }))}
              pageSize={pagination.pageSize}
              onPageSizeChange={(size) => setPagination(prev => ({ ...prev, pageSize: size, current: 1 }))}
              pageSizeOptions={[10, 20, 50]}
              showPageSize
            />
          </div>
        )}
      </Card>
    </div>
  );
}
