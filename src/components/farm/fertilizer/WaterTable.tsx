/**
 * 浇水记录表格组件（V1 2026-07-20）
 * 分组折叠模式：主行显示摘要，展开后按区域展示浇水方式/用水量明细
 * 参照 FertilizerTable 风格；非 manual 类型隐藏编辑/删除按钮（保护规则）
 */
import React from 'react';
import { ChevronDown, ChevronRight, Download, Edit2, Plus, Trash2 } from 'lucide-react';
import { getDictItemName } from '@/stores';
import type { WateringData } from '@/stores';
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
  // 2026-07-27 修复：批量删除模式开关（之前只用 exportMode 推 showCb，导致"批量删除"按钮点了没反应）
  deleteMode?: boolean;
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
  deleteMode,
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

  // 2026-07-27 修复：checkbox 在 delete 模式 OR export 模式都显示
  // 之前只用 !!exportMode，导致 deleteMode=true 时也走"默认 UI"，批量删除按钮点了不进入勾选模式
  const showCb = !!exportMode || !!deleteMode;

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
        <Table style={{ minWidth: '1500px' }}>
          <TableHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <TableRow className="hover:bg-transparent">
              {showCb && (
                <TableHead className="py-3 w-12 text-center">
                  <Input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => onSelectionChange(e.target.checked ? data.map((d) => d.id) : [])}
                    className="w-4 h-4"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 w-10 text-center"></TableHead>
              <TableHead className="py-3 whitespace-nowrap text-center">浇水编号</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-center">浇水时间</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-center">作物</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-center">区域</TableHead>
              {/* 2026-07-25：与详情/导出对齐 — 主表新增「温室」列 */}
              <TableHead className="py-3 whitespace-nowrap text-center">温室</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-center">总用水量</TableHead>
              {/* 2026-07-25：与详情/导出对齐 — 主表新增「水费」列 */}
              <TableHead className="py-3 whitespace-nowrap text-center">水费</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-center">操作员</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-center" title="浇水类型（业务类型）">记录类型</TableHead>
              {/* 2026-07-25 P1：与详情/编辑对齐 — 主表新增「备注」列（record 顶层 description，区别于 pool 行 remark） */}
              <TableHead className="py-3 whitespace-nowrap text-center">备注</TableHead>
              {!showCb && <TableHead className="py-3 whitespace-nowrap text-center sticky right-0 bg-green-600 z-10">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200">
            {current.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCb ? 13 : 12} className="px-4 py-12 text-center text-gray-400">
                  暂无浇水记录
                </TableCell>
              </TableRow>
            ) : current.map((rec) => {
              const pool = parseWateringPool(rec.waterPool);
              const areaNames = [...new Set(pool.map((p) => String(p.area ?? '').trim()).filter(Boolean))];
              const totalQty = pool.reduce((s, r) => s + Number(r.waterAmount ?? 0), 0) || rec.totalWater || 0;
              const exp = expanded.has(rec.id);
              // 2026-07-27 修复：恢复原来的"仅 manual 可操作"保护规则
              // 之前误放宽为 fertilizer_dilution 也可操作 → 但后端 service 拒绝（fertilizer_dilution
              //   是施肥副作用自动生成的，业务上应在源头施肥记录修改，不允许在此删除）
              // 保留 manual 为唯一可编辑/删除类型，与后端 service + WaterEditModal readonly 保护对齐
              const isEditable = rec.recordType === 'manual';

              // 2026-07-24：作物名兜底链 — cropNames（多作物汇总）→ waterPool 提取 → cropName（单作物）
              const cropListFromNames = (() => { try { const arr = JSON.parse(rec.cropNames || ''); return Array.isArray(arr) ? arr.filter(Boolean) : []; } catch { return []; } })();
              const cropListFromPool = [...new Set(pool.map((p) => String(p.cropName ?? '').trim()).filter(Boolean))];
              const cropsDisplay = cropListFromNames.length > 0
                ? cropListFromNames
                : cropListFromPool.length > 0
                ? cropListFromPool
                : [rec.cropName].filter(Boolean);

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
                  <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(rec)}
                      className="font-mono p-0 h-auto text-blue-600"
                    >
                      {rec.waterCode}
                    </Button>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">
                    {rec.waterTime || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap text-center">
                    {/* 2026-07-24：三重兜底展示作物（修复历史数据水合裂展） */}
                    {cropsDisplay.length > 0 ? cropsDisplay.join('、') : '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">
                    {areaNames.length > 0
                      ? `${areaNames.length} 个 · ${areaNames.slice(0, 2).join('、')}${areaNames.length > 2 ? '...' : ''}`
                      : rec.areaName || '-'}
                  </TableCell>
                  {/* 2026-07-25：温室列（truncate + tooltip） */}
                  <TableCell className="px-4 py-3 text-xs text-gray-600 max-w-[140px]">
                    {rec.greenhouseName ? (
                      <span className="truncate block" title={rec.greenhouseName}>
                        {rec.greenhouseName}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-bold text-emerald-600 whitespace-nowrap text-center">
                    {totalQty.toLocaleString()} {pool[0]?.waterUnit || rec.waterUnit || 'L'}
                  </TableCell>
                  {/* 2026-07-25：水费列 */}
                  <TableCell className="px-4 py-3 text-sm font-medium text-amber-600 whitespace-nowrap text-center">
                    {rec.waterCost != null ? `¥${Number(rec.waterCost).toFixed(2)}` : <span className="text-gray-300">-</span>}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">
                    {rec.operatorName || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                    {renderSourceBadge(rec.recordType)}
                  </TableCell>
                  {/* 2026-07-25 P1：备注列（truncate + tooltip） */}
                  <TableCell className="px-4 py-3 text-xs text-gray-600 max-w-[160px]">
                    {rec.description ? (
                      <span className="truncate block" title={rec.description}>
                        {rec.description}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  {!showCb && (
                    <TableCell className="px-4 py-3 whitespace-nowrap text-center sticky right-0 bg-white z-10">
                      {isEditable && (
                        <div className="flex gap-1 justify-center">
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

                {/* 展开行：单表 + 跨组连续序号 + 区域 rowspan + 作物品种列（2026-07-25 重构 v4）
                    - 序号列移到最前，按所有分组连续编号 1,2,3...（不再每组内从 1 开始）
                    - 区域 cell 仅 rowspan 该组明细行数（不再包含小计行）
                    - 删除「小计」行：每个区域只填一次水量，区域小计无意义；父级表头已有总用水量
                    - 「批号」列移到「区域」列前面，按对应批号（pool 行 code）精准获取「作物品种」
                    - 「作物品种」列从 pool 行 r.cropName 拿（WaterAddModal/EditModal 写入时已存） */}
                {exp && pool.length > 0 && (
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={showCb ? 10 : 9} className="px-6 py-4">
                      <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm table-fixed">
                            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
                              <tr>
                                <th className="px-3 py-2 text-center w-[7%]">序号</th>
                                {/* 2026-07-25 v4：批号列移到区域列前面，按对应批号取作物品种 */}
                                <th className="px-3 py-2 text-center w-[14%]">批号</th>
                                <th className="px-3 py-2 text-center w-[12%]">区域</th>
                                <th className="px-3 py-2 text-center w-[13%]">作物品种</th>
                                <th className="px-3 py-2 text-center w-[16%]">浇水方式</th>
                                <th className="px-3 py-2 text-center w-[14%]">用水量</th>
                                <th className="px-3 py-2 text-center w-[11%]">单位</th>
                                <th className="px-3 py-2 text-center w-[13%]">备注</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {/* 展平所有分组为单行数组，跨区域连续累计序号 */}
                              {(() => {
                                const flat: Array<{ aName: string; r: WateringPoolRow; seq: number; isFirst: boolean; groupSize: number }> = [];
                                let seq = 1;
                                for (const [aName, rows] of areaGroups.entries()) {
                                  rows.forEach((r, i) => {
                                    flat.push({ aName, r, seq: seq++, isFirst: i === 0, groupSize: rows.length });
                                  });
                                }
                                return flat.map(({ aName, r, seq, isFirst, groupSize }) => {
                                  const methodLabel = r.wateringMethod
                                    ? (getDictItemName('watering_method', r.wateringMethod) || r.wateringMethod)
                                    : '-';
                                  return (
                                    <tr key={`${aName}-${seq}`} className="hover:bg-emerald-50/40">
                                      <td className="px-3 py-2 text-center text-gray-500">{seq}</td>
                                      {/* 2026-07-25 v4：批号列移到区域列前 */}
                                      <td className="px-3 py-2 text-center text-gray-600 font-mono text-xs">{r.code || '-'}</td>
                                      {isFirst && (
                                        <td
                                          rowSpan={groupSize}
                                          className="px-3 py-2 text-center align-middle text-sm font-bold text-emerald-900 bg-emerald-50/40 border-r border-emerald-100"
                                        >
                                          🌿 {aName}
                                        </td>
                                      )}
                                      {/* 2026-07-25 v4：作物品种列从 pool 行 r.cropName 取（精准按行） */}
                                      <td className="px-3 py-2 text-center text-gray-800 font-medium text-xs">
                                        {r.cropName || '-'}
                                      </td>
                                      <td className="px-3 py-2 text-center text-gray-800 font-medium">{methodLabel}</td>
                                      <td className="px-3 py-2 text-center font-bold text-emerald-600">
                                        {Number(r.waterAmount ?? 0).toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2 text-center text-gray-600">{r.waterUnit || rec.waterUnit || 'L'}</td>
                                      <td className="px-3 py-2 text-center text-gray-600">{r.remark || '-'}</td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
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