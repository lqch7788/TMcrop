// ApplicationTable 组件
// 领料申请单的主表格和展开行
// 2026-09-26：批量编辑死代码已删除（编辑走行操作列），清理未用 props/import
import { useState, createElement, Fragment } from 'react';
import type { ReactNode } from 'react';

/**
 * 2026-09-28：Fragment 替代组件
 * 背景：vite-plugin-source-identifier 会向 JSX 写法的 <React.Fragment> 注入 data-matrix-id，
 * 触发 React "Invalid prop supplied to Fragment" 警告（控制台刷屏）。
 * 本组件用 createElement 调用（非 JSX），插件不会注入额外属性；
 * 且自定义组件本身可安全接收任意 props，故不再产生警告。行为与 Fragment 完全一致。
 */
function RowPair({ children }: { children: ReactNode }) {
  return createElement(Fragment, null, children);
}
import { Archive, ChevronDown, ChevronRight as ChevronRightIcon, Copy, Download, Edit2, Plus, Printer, RotateCcw, Send, Trash2, Undo2, X } from 'lucide-react';
import { printVoucher } from '../../../../components/materialReceiving/modals/DetailModal';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { EmptyState } from '@/components/ui';
import type { MaterialReceivingRecord } from '@/types/materialReceiving'; // 2026-09-27 修正预存错误路径（原 ../../../types 不存在）

interface ApplicationTableProps {
  // 数据
  filteredData: MaterialReceivingRecord[];
  // 分页
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // 导出
  exportMode: boolean;
  selectedRows: (string | number)[];
  onExportModeChange: (value: boolean) => void;
  onExportClick: () => void;
  onCancelExport: () => void;
  // 批量删除
  batchEditMode: 'edit' | 'delete' | null;
  onBatchEditModeChange: (value: 'edit' | 'delete' | null) => void;
  // 选中行
  onSelectAll: () => void;
  onSelectRow: (id: string | number) => void;
  // 展开行
  expandedRows: Set<number>;
  onToggleExpand: (id: number) => void;
  // 操作
  onView: (item: MaterialReceivingRecord) => void;
  onEdit: (item: MaterialReceivingRecord) => void;
  onDeleteClick: (id: number) => void;
  // 2026-09-26 批次二：撤回（仅待审批）与复制
  onWithdraw: (item: MaterialReceivingRecord) => void;
  onDuplicate: (item: MaterialReceivingRecord) => void;
  // 2026-09-27 P2-11：重新提交（草稿态）
  onResubmit: (item: MaterialReceivingRecord) => void;
  // 2026-09-27 审计修复：结案（部分出库后剩余不再领用）+ 取消结案
  onCloseCase: (item: MaterialReceivingRecord) => void;
  onReopenCase: (item: MaterialReceivingRecord) => void;
  // 2026-09-27 审计方案：已删除单据归档追溯入口
  onShowDeletedDocs: () => void;
  // 2026-09-27 P2-11：批量提交/撤回
  onBatchSubmit: () => void;
  onBatchWithdraw: () => void;
  // 2026-09-27 P2-12：统计摘要
  summary: { monthCount: number; monthAmount: number; insufficientCount: number; pendingCount: number };
  // 2026-09-27 用户要求：快捷筛选按钮移入标题行（原在筛选器区）
  myApplicationsOnly: boolean;
  pendingMyApproval: boolean;
  overdueOnly: boolean;
  onToggleMyApplications: () => void;
  onTogglePendingApproval: () => void;
  onToggleOverdue: () => void;
  // 新增
  onAddModalOpen: () => void;
  // 批量操作
  onShowBatchDeleteConfirm: () => void;
  onBatchCancel: () => void;
}

/**
 * ApplicationTable 组件 - 领料申请单表格
 */
export function ApplicationTable({
  filteredData,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  exportMode,
  selectedRows,
  onExportModeChange,
  onExportClick,
  onCancelExport,
  batchEditMode,
  onBatchEditModeChange,
  onSelectAll,
  onSelectRow,
  expandedRows,
  onToggleExpand,
  onView,
  onEdit,
  onDeleteClick,
  onWithdraw,
  onDuplicate,
  onResubmit,
  onCloseCase,
  onReopenCase,
  onShowDeletedDocs,
  onBatchSubmit,
  onBatchWithdraw,
  summary,
  myApplicationsOnly,
  pendingMyApproval,
  overdueOnly,
  onToggleMyApplications,
  onTogglePendingApproval,
  onToggleOverdue,
  onAddModalOpen,
  onShowBatchDeleteConfirm,
  onBatchCancel,
}: ApplicationTableProps) {
  // 2026-09-26 批次五：申请日期表头点击排序（升/降切换）
  const [sortAsc, setSortAsc] = useState(false);
  const sortedData = [...filteredData].sort((a, b) =>
    sortAsc ? String(a.date).localeCompare(String(b.date)) : String(b.date).localeCompare(String(a.date))
  );

  // 计算总页数
  const computedTotalPages = Math.ceil(filteredData.length / pageSize);

  return (
    /* 数据表格 */
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 2026-09-27 P2-12：统计摘要卡片 */}
      <div className="grid grid-cols-4 gap-3 p-4 pb-0">
        <div className="bg-blue-50 rounded-lg px-4 py-2">
          <p className="text-xs text-blue-600">本月申请</p>
          <p className="text-lg font-semibold text-blue-800">{summary.monthCount} 单</p>
        </div>
        <div className="bg-emerald-50 rounded-lg px-4 py-2">
          <p className="text-xs text-emerald-600">本月金额</p>
          <p className="text-lg font-semibold text-emerald-800">¥{summary.monthAmount.toLocaleString()}</p>
        </div>
        <div className={`rounded-lg px-4 py-2 ${summary.pendingCount > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
          <p className={`text-xs ${summary.pendingCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>待审批</p>
          <p className={`text-lg font-semibold ${summary.pendingCount > 0 ? 'text-amber-800' : 'text-gray-600'}`}>{summary.pendingCount} 单</p>
        </div>
        <div className={`rounded-lg px-4 py-2 ${summary.insufficientCount > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <p className={`text-xs ${summary.insufficientCount > 0 ? 'text-orange-600' : 'text-gray-500'}`}>库存不足</p>
          <p className={`text-lg font-semibold ${summary.insufficientCount > 0 ? 'text-orange-800' : 'text-gray-600'}`}>{summary.insufficientCount} 单</p>
        </div>
      </div>

      {/* 表格头部操作区 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {/* 2026-09-27 用户要求：标题 + 快捷筛选按钮同一行 */}
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 whitespace-nowrap">领料申请单列表</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={myApplicationsOnly ? 'default' : 'secondary'}
              onClick={() => { onToggleMyApplications(); onPageChange(1); }}
            >
              我的申请
            </Button>
            <Button
              size="sm"
              variant={pendingMyApproval ? 'default' : 'secondary'}
              onClick={() => { onTogglePendingApproval(); onPageChange(1); }}
            >
              待我审批
            </Button>
            <Button
              size="sm"
              variant={overdueOnly ? 'destructive' : 'secondary'}
              onClick={() => { onToggleOverdue(); onPageChange(1); }}
              title="筛选含借用超期未归还物料的单据"
            >
              超期未还
            </Button>
          </div>
        </div>
        {exportMode ? (
          /* 导出模式 */
          <div className="flex gap-2">
            <Button size="sm" onClick={onExportClick}>
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelExport}>
              <X className="w-4 h-4" /> 取消
            </Button>
          </div>
        ) : batchEditMode === 'delete' ? (
          /* 批量删除模式（2026-09-27：扩展为 删除/提交/撤回 三动作） */
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={onShowBatchDeleteConfirm}>
              <Trash2 className="w-4 h-4" /> 确认删除
            </Button>
            <Button variant="blue" size="sm" onClick={onBatchSubmit}>
              <Send className="w-4 h-4" /> 批量提交
            </Button>
            <Button variant="warning" size="sm" onClick={onBatchWithdraw}>
              <Undo2 className="w-4 h-4" /> 批量撤回
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchCancel}>
              <X className="w-4 h-4" /> 取消
            </Button>
          </div>
        ) : (
          /* 默认模式 — 2026-08-10：移除"编辑"按钮（批量编辑入口），保留新增/批量删除/导出 */
          <div className="flex gap-2">
            <Button size="sm" onClick={onAddModalOpen}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
            <Button variant="destructive" size="sm" onClick={() => { onBatchEditModeChange('delete'); }}>
              <Trash2 className="w-4 h-4" />
              删除
            </Button>
            <Button size="sm" onClick={() => onExportModeChange(true)}>
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

      {/* 表格内容（2026-09-26 改进批次五：空数据展示 EmptyState） */}
      {filteredData.length === 0 ? (
        <div className="p-12">
          <EmptyState type="search" title="暂无领料申请单" description="调整筛选条件，或点击右上角「新增」创建第一张领料申请单" />
        </div>
      ) : (
      <>
      {/* 2026-09-27 P3：移动端卡片视图（<md 显示，仓库现场手机操作） */}
      <div className="md:hidden divide-y divide-gray-100">
        {sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
          <div key={item.id} className="p-4 active:bg-gray-50" onClick={() => onView(item)}>
            <div className="flex items-start justify-between mb-2">
              <span className="font-mono text-sm text-blue-600 underline">{item.code}</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                item.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                item.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                item.statusClass === 'draft' ? 'bg-slate-100 text-slate-700' :
                'bg-gray-100 text-gray-600'
              }`}>{item.status}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{item.date} · {item.department} · {item.applicant}</p>
              <p className="text-xs text-gray-500">
                {item.materials.length} 种物料 · ¥{item.materials.reduce((s: number, m: any) => s + (m.requestedQuantity || 0) * (m.unitPrice || 0), 0).toFixed(2)}
                {(item as any).dispatchStatus === 'complete' && ' · 已出库'}
                {(item as any).dispatchStatus === 'partial' && ' · 部分出库'}
              </p>
            </div>
            {/* 移动端操作按钮 */}
            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="secondary" onClick={() => onEdit(item)}>编辑</Button>
              {item.statusClass === 'pending' && <Button size="sm" variant="secondary" onClick={() => onWithdraw(item)}>撤回</Button>}
              {item.statusClass === 'draft' && <Button size="sm" variant="blue" onClick={() => onResubmit(item)}>提交</Button>}
              <Button size="sm" variant="secondary" onClick={() => onDuplicate(item)}>复制</Button>
              <Button size="sm" variant="secondary" onClick={() => printVoucher(item)}>打印</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          {/* 表头 */}
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                    onCheckedChange={() => onSelectAll()}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">领料单号</th>
              {/* 2026-09-26 批次五：日期表头点击排序 */}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer select-none" onClick={() => setSortAsc(!sortAsc)} title="点击切换升/降序">
                申请日期 {sortAsc ? '↑' : '↓'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap hidden md:table-cell">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料种类</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">区域/用途</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
              {/* 2026-09-26 批次四：恢复"生产计划批次号"列（成本归集维度） */}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap hidden md:table-cell">生产批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
              {/* 2026-08-10：操作列（参照物料库存页面，下沉编辑/删除按钮） */}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
            </tr>
          </thead>
          {/* 表体 */}
          <tbody className="divide-y divide-gray-300">
            {sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
              // 2026-09-28：改用 RowPair（createElement 实现）替代 Fragment，规避 data-matrix-id 注入警告
              <RowPair key={item.id}>
                {/* 主数据行 */}
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
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">{item.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.materials.length > 0 ? `${item.materials.length}种` : '-'}</td>
                  {/* 2026-08-10：选区域(多选)展示——以 chip 形式显示 plantAreas */}
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {item.plantAreas && item.plantAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {item.plantAreas.map((a: any) => (
                          <span
                            key={a.id}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[10px] ${
                              a.type === 'custom'
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}
                            title={a.type === 'custom' ? a.cropName : `${a.cropName} · ${a.area} · ${a.code}`}
                          >
                            {a.type === 'planting' ? '🌱' : a.type === 'seedling' ? '🌿' : '📝'} {a.cropName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                  {/* 2026-09-26 批次四：恢复"生产计划批次号"列 */}
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">
                    {(item as any).productionBatchCode || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${
                        item.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                        item.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                        item.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                        item.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
                        item.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
                        item.statusClass === 'draft' ? 'bg-slate-100 text-slate-700' :
                        item.statusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-blue-700'
                      }`}>
                        {item.status}
                      </span>
                      {/* 2026-09-26 批次四：加急优先级徽章 */}
                      {(item as any).priority === 'high' && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium w-fit bg-red-100 text-red-700">加急</span>
                      )}
                      {/* 出库状态标签（后端聚合 dispatch_status 列） */}
                      {(item as any).dispatchStatus && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${
                          (item as any).dispatchStatus === 'complete' ? 'bg-emerald-100 text-emerald-700'
                          : (item as any).dispatchStatus === 'closed' ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-100 text-blue-700'
                        }`}>
                          {(item as any).dispatchStatus === 'complete' ? '已出库'
                            : (item as any).dispatchStatus === 'closed' ? '已结案' : '部分出库'}
                        </span>
                      )}
                      {/* 2026-09-26 改进批次一：库存不足软警示徽章（后端提交时逐行复核标记） */}
                      {item.materials.some((m: any) => m.stockInsufficient) && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium w-fit bg-orange-100 text-orange-700" title="部分物料申请数量超过当前可用库存">
                          ⚠ 库存不足
                        </span>
                      )}
                      {/* 2026-09-27 P1-6：借用超期未还徽章 */}
                      {(() => {
                        const today = new Date().toISOString().slice(0, 10);
                        const overdue = (item.materials || []).filter((m: any) => m.returnable && m.returnDate && String(m.returnDate) < today);
                        if (overdue.length === 0) return null;
                        const maxDays = Math.max(...overdue.map((m: any) => Math.floor((new Date(today).getTime() - new Date(m.returnDate).getTime()) / 86400000)));
                        return (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium w-fit bg-red-100 text-red-700" title={`有 ${overdue.length} 项借用物料超过预计归还日期`}>
                            借用超期 {maxDays} 天
                          </span>
                        );
                      })()}
                      {item.statusClass === 'rejected' && item.rejectReason && (
                        <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.rejectReason}>
                          原因：{item.rejectReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">
                    {item.materials.length > 0 ? item.materials[0].remark : '-'}
                  </td>
                  {/* 行内操作列：编辑/撤回/复制/删除（2026-09-26 批次二扩充） */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="编辑" onClick={() => onEdit(item)}>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      {item.statusClass === 'pending' && (
                        <Button variant="ghost" size="icon" title="撤回审批" onClick={() => onWithdraw(item)}>
                          <Undo2 className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                      {/* 2026-09-27 P2-11：草稿态（撤回后）重新提交 */}
                      {item.statusClass === 'draft' && (
                        <Button variant="ghost" size="icon" title="重新提交" onClick={() => onResubmit(item)}>
                          <Send className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="复制申请单" onClick={() => onDuplicate(item)}>
                        <Copy className="w-4 h-4 text-emerald-600" />
                      </Button>
                      {/* 2026-09-27 审计修复：结案按钮——已审批且未领齐、未结案时可结案（剩余不再领用） */}
                      {item.statusClass === 'approved'
                        && (item as any).dispatchStatus !== 'closed'
                        && (item as any).dispatchStatus !== 'complete' && (
                        <Button variant="ghost" size="icon" title="结案（剩余物料不再领用）" onClick={() => onCloseCase(item)}>
                          <Archive className="w-4 h-4 text-slate-600" />
                        </Button>
                      )}
                      {/* 2026-09-27 审计修复：取消结案（恢复剩余物料可继续出库） */}
                      {item.statusClass === 'approved' && (item as any).dispatchStatus === 'closed' && (
                        <Button variant="ghost" size="icon" title="取消结案" onClick={() => onReopenCase(item)}>
                          <RotateCcw className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                      {/* 2026-09-26 用户要求：操作列与详情弹窗两处均可打印 */}
                      <Button variant="ghost" size="icon" title="打印领料单" onClick={() => printVoucher(item)}>
                        <Printer className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button variant="ghost" size="icon" title="删除" onClick={() => onDeleteClick(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
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
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料编码</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料名称</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">批次号</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">规格</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">单位</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">申领数量</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">当前库存</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">单价(元)</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">小计(元)</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">仓库货位</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-white">备注</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {item.materials.map((material, idx) => {
                                const subtotal = material.requestedQuantity * material.unitPrice;
                                const isStockWarning = material.requestedQuantity > material.stockQuantity;
                                return (
                                  <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.batchNo || ''}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                    <td className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-800'}`}>{material.requestedQuantity}{isStockWarning && ' ⚠️'}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.stockQuantity}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.unitPrice.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition || '-'}</td>
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
      </>
      )}

      {/* 导出模式底部 */}
      {exportMode && selectedRows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onSelectAll}>
              {selectedRows.length === filteredData.length ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        </div>
      )}

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <Pagination
          currentPage={currentPage}
          totalPages={computedTotalPages || 1}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={(size) => { onPageSizeChange(size); onPageChange(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
