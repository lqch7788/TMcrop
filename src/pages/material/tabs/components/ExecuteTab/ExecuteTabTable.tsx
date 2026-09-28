// ExecuteTabTable 组件
// 领料出库页面的表格组件
import React from 'react';
import { Archive, Ban, CheckCircle2, ChevronDown, ChevronRight as ChevronRightIcon, Download, Eye, Pencil, Plus, Printer, Trash2, X } from 'lucide-react';

/**
 * 2026-09-28：Fragment 替代组件
 * 背景：vite-plugin-source-identifier 会向 JSX 写法的 <React.Fragment> 注入 data-matrix-id，
 * 触发 React "Invalid prop supplied to Fragment" 警告（控制台刷屏）。
 * 本组件用 createElement 调用（非 JSX），插件不会注入额外属性，行为与 Fragment 一致。
 */
function RowPair({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
import { printExecuteVoucher } from './ExecuteTabModals/DetailModal';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { EmptyState } from '@/components/ui';

interface ExecuteTabTableProps {
  // 数据
  data: any[];
  totalCount: number;

  // 分页状态
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // 展开行状态
  expandedRows: Set<number>;

  // 导出模式状态
  exportMode: boolean;
  batchEditMode: 'edit' | 'delete' | null;
  selectedRows: (string | number)[];

  // 回调函数
  onSelectAll: () => void;
  onSelectRow: (id: string | number) => void;
  onToggleExpand: (id: number) => void;
  onView: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string | number) => void;
  // 2026-09-27 审计方案：作废（已发料单据唯一撤销方式，替代删除）
  onVoid: (item: any) => void;
  // 2026-09-27 审计方案：已删除单据归档追溯入口
  onShowDeletedDocs: () => void;
  // 2026-09-27 两步出库：确认发料
  onConfirmIssue: (item: any) => void;
  // 2026-09-27 能力对齐：快捷筛选 + 统计卡片
  summary?: { todayCount: number; pendingCount: number; monthAmount: number; overIssueCount: number };
  pendingOnly?: boolean;
  todayOnly?: boolean;
  mineOnly?: boolean;
  onTogglePending?: () => void;
  onToggleToday?: () => void;
  onToggleMine?: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  // 导出相关回调
  onExportClick: () => void;
  onCancelExport: () => void;
  onExportConfirm: () => void;

  // 批量删除相关回调（2026-09-26：批量编辑已移除，编辑下放到行操作列 onEdit）
  onBatchDeleteClick: () => void;
  onBatchDeleteConfirm: () => void;
  onBatchCancel: () => void;

  // 新增回调
  onAdd: () => void;
}

/**
 * ExecuteTabTable 组件
 * 领料出库页面的表格区域
 */
export function ExecuteTabTable({
  data,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  expandedRows,
  exportMode,
  batchEditMode,
  selectedRows,
  onSelectAll,
  onSelectRow,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onVoid,
  onShowDeletedDocs,
  onConfirmIssue,
  summary,
  pendingOnly = false,
  todayOnly = false,
  mineOnly = false,
  onTogglePending,
  onToggleToday,
  onToggleMine,
  onPageChange,
  onPageSizeChange,
  onExportClick,
  onCancelExport,
  onExportConfirm,
  onBatchDeleteClick,
  onBatchDeleteConfirm,
  onBatchCancel,
  onAdd,
}: ExecuteTabTableProps) {
  // 分页后的数据
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 2026-09-27 能力对齐：统计摘要卡片 */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 p-4 pb-0">
          <div className="bg-blue-50 rounded-lg px-4 py-2">
            <p className="text-xs text-blue-600">今日出库单</p>
            <p className="text-lg font-semibold text-blue-800">{summary.todayCount} 单</p>
          </div>
          <div className={`rounded-lg px-4 py-2 ${summary.pendingCount > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <p className={`text-xs ${summary.pendingCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>待出库</p>
            <p className={`text-lg font-semibold ${summary.pendingCount > 0 ? 'text-amber-800' : 'text-gray-600'}`}>{summary.pendingCount} 单</p>
          </div>
          <div className="bg-emerald-50 rounded-lg px-4 py-2">
            <p className="text-xs text-emerald-600">本月实发金额</p>
            <p className="text-lg font-semibold text-emerald-800">¥{summary.monthAmount.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg px-4 py-2 ${summary.overIssueCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className={`text-xs ${summary.overIssueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>超发单</p>
            <p className={`text-lg font-semibold ${summary.overIssueCount > 0 ? 'text-red-800' : 'text-gray-600'}`}>{summary.overIssueCount} 单</p>
          </div>
        </div>
      )}

      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {/* 2026-09-27 能力对齐：标题 + 快捷筛选同一行 */}
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 whitespace-nowrap">出库单列表</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={pendingOnly ? 'default' : 'secondary'} onClick={onTogglePending} title="筛选待出库（未发料）的单据">
              待出库
            </Button>
            <Button size="sm" variant={todayOnly ? 'default' : 'secondary'} onClick={onToggleToday}>
              今日出库
            </Button>
            <Button size="sm" variant={mineOnly ? 'default' : 'secondary'} onClick={onToggleMine} title="我经手（操作人/申领人）的出库单">
              我经手的
            </Button>
          </div>
        </div>
        {exportMode ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={onExportConfirm}>
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelExport}>
              <X className="w-4 h-4" /> 取消
            </Button>
          </div>
        ) : batchEditMode === 'delete' ? (
          /* 批量删除模式 */
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={onBatchDeleteConfirm}>
              <Trash2 className="w-4 h-4" /> 确认删除
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchCancel}>
              <X className="w-4 h-4" /> 取消
            </Button>
          </div>
        ) : (
          /* 默认模式（2026-09-26：移除工具栏"编辑"批量编辑按钮，编辑入口在每行操作列） */
          <div className="flex gap-2">
            <Button size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
            <Button variant="destructive" size="sm" onClick={onBatchDeleteClick}>
              <Trash2 className="w-4 h-4" />
              删除
            </Button>
            <Button size="sm" onClick={() => onExportClick()}>
              <Download className="w-4 h-4" />
              导出
            </Button>
            {/* 2026-09-27 审计方案：已删除单据归档追溯入口 */}
            <Button variant="blue" size="sm" onClick={onShowDeletedDocs}>
              <Archive className="w-4 h-4" />
              已删除单据
            </Button>
          </div>
        )}
      </div>

      {/* 2026-09-27 能力对齐：移动端卡片视图（<md 显示，仓库现场手机发料） */}
      <div className="md:hidden divide-y divide-gray-100">
        {paginatedData.map((item) => {
          const days = Math.floor((Date.now() - new Date(item.date || Date.now()).getTime()) / 86400000);
          return (
            <div key={item.id} className="p-4 active:bg-gray-50" onClick={() => onView(item)}>
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-sm text-blue-600 underline">{item.code}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  item.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                  item.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                  item.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{item.executeStatus}</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{item.date} · {item.applicant} · {item.warehouseLocation}</p>
                <p className="text-xs text-gray-500">
                  {(item.materials || []).length} 种物料 · 实发 {(item.materials || []).reduce((s: number, m: any) => s + (Number(m.actualQuantity) || 0), 0)}
                  {item.executeStatusClass === 'pending_out' && days > 3 && <span className="text-red-600 ml-2">⚠ 待出库 {days} 天</span>}
                </p>
              </div>
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                {item.executeStatusClass === 'pending_out' && (
                  <Button size="sm" variant="blue" onClick={() => onConfirmIssue(item)}>确认发料</Button>
                )}
                {/* 2026-09-27 审计修复：放开已完成单编辑（后端按差额调库存，事务保护） */}
                <Button size="sm" variant="secondary" onClick={() => onEdit(item)}>编辑</Button>
                <Button size="sm" variant="secondary" onClick={() => printExecuteVoucher(item)}>打印</Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={() => onSelectAll()}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">出库单号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">执行状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((item) => (
              <RowPair key={item.id}>
                <tr className="hover:bg-blue-100 transition-colors">
                  {(exportMode || batchEditMode) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Checkbox
                        checked={selectedRows.includes(item.id)}
                        onCheckedChange={() => onSelectRow(item.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleExpand(item.id)}
                    >
                      {expandedRows.has(item.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => onView(item)}>{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseLocation}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.operator}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                      item.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                      item.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                      item.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.executeStatus}
                    </span>
                    {/* 2026-09-27 时效提醒：待出库超过 3 天标红（催办） */}
                    {item.executeStatusClass === 'pending_out' && (() => {
                      const days = Math.floor((Date.now() - new Date(item.date || Date.now()).getTime()) / 86400000);
                      return days > 3 ? <span className="ml-2 text-xs text-red-600 font-medium" title="建单后长期未发料">⚠ 滞留 {days} 天</span> : null;
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(item)}
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {/* 2026-09-26：行级编辑入口（原工具栏批量编辑已移除）
                          2026-09-27 审计修复：放开已完成单编辑（后端按新旧明细差额调库存，事务保护） */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      {/* 2026-09-27 用户反馈：操作列补打印入口（仓库发料凭证） */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => printExecuteVoucher(item)}
                        title="打印出库单"
                      >
                        <Printer className="w-4 h-4 text-gray-600" />
                      </Button>
                      {/* 2026-09-27 两步出库：待出库单的"确认发料"入口 */}
                      {item.executeStatusClass === 'pending_out' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onConfirmIssue(item)}
                          title="确认发料（扣减库存）"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                      {/* 2026-09-27 审计方案：已出库单据禁止删除（追溯链保护）→ 改【作废】；
                          待出库单可删除（删除时整行快照归档，仍可按单号追溯） */}
                      {(item.executeStatusClass === 'completed' || item.executeStatusClass === 'partial') ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onVoid(item)}
                          title="作废（恢复库存，单据保留可追溯）"
                        >
                          <Ban className="w-4 h-4 text-amber-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(item.id)}
                          title="删除（快照归档，仍可按单号追溯）"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {/* 展开行 - 物料明细 */}
                {expandedRows.has(item.id) && (
                  <tr key={`${item.id}-expanded`} className="bg-white">
                    <td colSpan={(exportMode || batchEditMode) ? 13 : 12} className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-blue-800 mb-2">物料明细</div>
                        {item.materials.length > 0 ? (
                          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">来源领料单号</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料编码</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料名称</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">批次号</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">规格</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">单位</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">申请数量</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">实际库存</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">本次实发</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">单价(元)</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">小计(元)</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">仓库货位</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">差异</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">备注</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {item.materials.map((material: any, idx: number) => {
                                const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                                const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                                return (
                                  <tr key={idx} className={`hover:bg-[#F2F6FA]/50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.batchNo || ''}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">
                                      <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                                        {material.stockQuantity}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-blue-800">
                                      {material.actualQuantity > 0 ? (
                                        <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                          {material.actualQuantity}
                                        </span>
                                      ) : (
                                        <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                                          {material.actualQuantity}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{(material.unitPrice || 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition || '-'}</td>
                                    <td className="px-3 py-2 text-sm">
                                      {material.requestedQuantity - material.actualQuantity > 0 ? (
                                        <span className="text-red-600 font-medium">-{material.requestedQuantity - material.actualQuantity}</span>
                                      ) : (
                                        <span className="text-green-600">0</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </RowPair>
            ))}
          </tbody>
        </table>
      </div>

      {/* 导出模式底部 */}
      {exportMode && selectedRows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onSelectAll}>
              {selectedRows.length === paginatedData.length ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        </div>
      )}

      {/* 2026-09-27 能力对齐：空状态 */}
      {paginatedData.length === 0 && (
        <div className="p-12">
          <EmptyState type="search" title="暂无出库单" description="调整筛选条件，或点击右上角「新增」创建出库单" />
        </div>
      )}

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages || 1}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
