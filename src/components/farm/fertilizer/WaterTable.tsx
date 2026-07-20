/**
 * 浇水记录表格组件（V1 2026-07-20）
 * 分组折叠模式：主行显示摘要，展开后按区域展示浇水方式/用水量明细
 * 参照 FertilizerTable 风格；非 manual 类型隐藏编辑/删除按钮（保护规则）
 */
import React from 'react';
import { ChevronDown, ChevronRight, Download, Edit2, Plus, Trash2 } from 'lucide-react';
import { WateringData, getDictItemName } from '@/stores';
import { parseWateringPool, type WateringPoolRow } from '@/lib/wateringPool';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';

interface WaterTableProps {
  data: WateringData[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDetail: (r: WateringData) => void;
  onEdit: (r: WateringData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onBatchDeleteMode: () => void;
  onConfirmBatchDelete: () => void;
  onCancelBatchDelete: () => void;
  onExportMode: () => void;
  // 2026-07-19 P2：参照 SeedSource/Seedling 2 步流程加 exportMode 相关 props
  exportMode?: boolean;
  onConfirmExport?: () => void;
  onCancelExport?: () => void;
}

export function WaterTable({
  data,
  isLoading,
  selectedIds,
  onSelectionChange,
  onDetail,
  onEdit,
  onDelete,
  onAdd,
  onBatchDeleteMode,
  onConfirmBatchDelete,
  onCancelBatchDelete,
  onExportMode,
  exportMode,
  onConfirmExport,
  onCancelExport,
}: WaterTableProps) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const current = data.slice((page - 1) * pageSize, page * pageSize);
  React.useEffect(() => { if (page > totalPages) setPage(1); }, [data.length, totalPages, page]);

  const toggle = (id: string) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id); else n.add(id);
    setExpanded(n);
  };

  // 2026-07-19 P2：checkbox 在 delete 模式或 export 模式都显示
  // 与 FertilizerTable 保持完全相同的 exportMode > showCb > default 优先级
  const showCb = !!exportMode;

  // 来源 badge 渲染（manual / fertilizer_dilution / daily_sync）
  const renderSourceBadge = (recordType: string) => {
    if (recordType === 'manual') {
      return (
        <span className="inline-flex gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          手动录入
        </span>
      );
    }
    if (recordType === 'fertilizer_dilution') {
      return (
        <span className="inline-flex gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          施肥稀释
        </span>
      );
    }
    if (recordType === 'daily_sync') {
      return (
        <span className="inline-flex gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          每日记录同步
        </span>
      );
    }
    return <span className="text-xs text-gray-400">-</span>;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 工具栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">浇水记录列表</h3>
        <div className="flex items-center gap-2">
          {/* 2026-07-19 P2：参照 FertilizerTable 100% 对齐 2 步导出流程
              - 导出模式（exportMode）：显示 "已选 N 条 / 确认导出 / 取消"（优先级最高）
              - 删除模式（showCb）：显示 "已选 N 条 / 确认删除 / 取消"
              - 默认模式：显示 "新增 / 批量删除 / 导出"

              注意：必须 exportMode 优先于 showCb（showCb = !!exportMode，
              当 exportMode=true 时 showCb=true，会优先匹配 delete UI 而不是 export UI）
          */}
          {exportMode ? (<>
            <span className="text-sm text-gray-600">已选择 {selectedIds.length} 条</span>
            <Button variant="default" size="sm" onClick={onConfirmExport} disabled={selectedIds.length === 0}>
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelExport}>取消</Button>
          </>) : showCb ? (<>
            <span className="text-sm text-red-700">已选择 {selectedIds.length} 条</span>
            <Button variant="destructive" size="sm" onClick={onConfirmBatchDelete} disabled={selectedIds.length === 0}>
              <Trash2 className="w-4 h-4" />
              确认删除
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelBatchDelete}>取消</Button>
          </>) : (<>
            <Button variant="default" size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
            <Button variant="destructive" size="sm" onClick={onBatchDeleteMode}>
              <Trash2 className="w-4 h-4" />
              批量删除
            </Button>
            <Button variant="default" size="sm" onClick={onExportMode}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          </>)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table style={{ minWidth: '1100px' }}>
          <TableHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <TableRow className="hover:bg-transparent">
              {showCb && (
                <TableHead className="py-3 w-12">
                  <Input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => onSelectionChange(e.target.checked ? data.map((d) => d.id) : [])}
                    className="w-4 h-4"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 w-10"></TableHead>
              <TableHead className="py-3 whitespace-nowrap">浇水编号</TableHead>
              <TableHead className="py-3 whitespace-nowrap">浇水时间</TableHead>
              <TableHead className="py-3 whitespace-nowrap">作物</TableHead>
              <TableHead className="py-3 whitespace-nowrap">区域</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-right">总用水量</TableHead>
              <TableHead className="py-3 whitespace-nowrap">操作员</TableHead>
              <TableHead className="py-3 whitespace-nowrap">来源</TableHead>
              {!showCb && <TableHead className="py-3 whitespace-nowrap sticky right-0 bg-green-600 z-10">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200">
            {current.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCb ? 10 : 9} className="px-4 py-12 text-center text-gray-400">
                  暂无浇水记录
                </TableCell>
              </TableRow>
            ) : current.map((rec) => {
              const pool = parseWateringPool(rec.waterPool);
              const areaNames = [...new Set(pool.map((p) => String(p.area ?? '').trim()).filter(Boolean))];
              const totalQty = pool.reduce((s, r) => s + Number(r.waterAmount ?? 0), 0) || rec.totalWater || 0;
              const exp = expanded.has(rec.id);
              const isManual = rec.recordType === 'manual';

              // 按区域分组（与 FertilizerTable 按肥料分组一致）
              const areaGroups = new Map<string, WateringPoolRow[]>();
              pool.forEach((p) => {
                const k = String(p.area ?? '未知').trim() || '未知';
                if (!areaGroups.has(k)) areaGroups.set(k, []);
                areaGroups.get(k)!.push(p);
              });

              return (<React.Fragment key={rec.id}>
                {/* 主行 */}
                <TableRow className="hover:bg-emerald-50 transition-colors">
                  {showCb && (
                    <TableCell className="px-4">
                      <Input
                        type="checkbox"
                        checked={selectedIds.includes(rec.id)}
                        onChange={() => onSelectionChange(
                          selectedIds.includes(rec.id)
                            ? selectedIds.filter((k) => k !== rec.id)
                            : [...selectedIds, rec.id]
                        )}
                        className="w-4 h-4"
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-2">
                    {pool.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggle(rec.id)}
                        className="text-gray-500 hover:text-emerald-600"
                        title={exp ? '收起' : '展开'}
                      >
                        {exp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    ) : (
                      <span className="w-4 h-4 inline-block" />
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(rec)}
                      className="font-mono p-0 h-auto text-blue-600"
                    >
                      {rec.waterCode}
                    </Button>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {rec.waterTime || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                    {rec.cropName || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {areaNames.length > 0
                      ? `${areaNames.length} 个 · ${areaNames.slice(0, 2).join('、')}${areaNames.length > 2 ? '...' : ''}`
                      : rec.areaName || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-bold text-emerald-600 text-right whitespace-nowrap">
                    {totalQty.toLocaleString()} {pool[0]?.waterUnit || rec.waterUnit || 'L'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {rec.operatorName || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    {renderSourceBadge(rec.recordType)}
                  </TableCell>
                  {!showCb && (
                    <TableCell className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white z-10">
                      {isManual && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(rec)}
                            className="text-gray-500 hover:text-amber-600"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(rec.id)}
                            className="text-gray-500 hover:text-red-600"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>

                {/* 展开行：按区域分组展示浇水方式/用水量明细 */}
                {exp && pool.length > 0 && (
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={showCb ? 10 : 9} className="px-6 py-4">
                      <div className="space-y-3">
                        <div className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold rounded-lg">
                          💧 浇水方案明细 · 共 {areaGroups.size} 个区域 / {pool.length} 行用量
                        </div>
                        {Array.from(areaGroups.entries()).map(([aName, rows]) => {
                          const subTotalQty = rows.reduce((s, r) => s + Number(r.waterAmount ?? 0), 0);
                          return (
                            <div key={aName} className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                              <div className="px-3 py-2 bg-emerald-50 text-emerald-900 text-sm font-bold border-b border-emerald-200">
                                🌿 {aName}
                                <span className="ml-2 text-xs font-normal text-emerald-600">
                                  用水量合计 {subTotalQty.toLocaleString()} {rows[0]?.waterUnit || rec.waterUnit || 'L'}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
                                    <tr>
                                      <th className="px-3 py-2 text-left w-12">#</th>
                                      <th className="px-3 py-2 text-left">浇水方式</th>
                                      <th className="px-3 py-2 text-right">用水量</th>
                                      <th className="px-3 py-2 text-left">来源肥料</th>
                                      <th className="px-3 py-2 text-left">稀释倍数</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {rows.map((r, i) => {
                                      const methodLabel = r.wateringMethod
                                        ? (getDictItemName('watering_method', r.wateringMethod) || r.wateringMethod)
                                        : '-';
                                      return (
                                        <tr key={`${aName}-${i}`} className="hover:bg-emerald-50/40">
                                          <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                                          <td className="px-3 py-2 text-gray-800 font-medium">{methodLabel}</td>
                                          <td className="px-3 py-2 text-right font-bold text-emerald-600">
                                            {Number(r.waterAmount ?? 0).toLocaleString()} {r.waterUnit || rec.waterUnit || 'L'}
                                          </td>
                                          <td className="px-3 py-2 text-gray-700">{r.sourceFertilizerName || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{r.sourceDilutionRatio || '-'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>);
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}