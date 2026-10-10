// MaterialApprovalTable 组件
// 库存审批页面的表格组件（页面原「物料审批」，2026-10-10 更名）
import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronRight as ChevronRightIcon,
  CheckCircle, XCircle, Eye, ClipboardList, Download
} from 'lucide-react';
import { Approval, ApprovalStatus } from '@/types/approval';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, RowPair } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Button } from '@/components/ui';
import type { MaterialApprovalTab, TabConfig } from '../../types/materialApproval.types';
// 2026-09-28：审批操作失败时给用户可见反馈（此前忽略 approve 返回值 → 点了没反应）
import { showAlert } from '@/lib/dialogService';
import { useApprovalStore } from '@/stores/useApprovalStore';
// 2026-09-28：退料单数据（明细字段权威来源，用于补全历史审批单的简化明细）
import { useMaterialReturnStore } from '@/stores/useMaterialReturnStore';

interface MaterialApprovalTableProps {
  // 数据
  paginatedData: Approval[];
  filteredData: Approval[];
  tabs: readonly TabConfig[];

  // 状态
  activeTab: MaterialApprovalTab;
  expandedRows: Set<string>;
  currentPage: number;
  totalPages: number;

  // 权限
  canApprove: boolean;

  // 回调函数
  setActiveTab: (tab: MaterialApprovalTab) => void;
  setCurrentPage: (page: number) => void;
  toggleExpandRow: (id: string) => void;
  handleViewDetail: (item: Approval) => void;
  handleRejectClick: (item: Approval) => void;
  /** 2026-09-28：改为 Promise<boolean> —— 与 store 实际实现一致，
   *  调用方需据此判断成功/失败并给出用户反馈（此前声明为 void 导致无法感知失败） */
  approve: (id: string) => Promise<boolean>;
  /** 2026-09-28：走"审批意见弹窗"的通过入口（与其他 tab 一致，且失败会有提示） */
  onApproveClick?: (item: Approval) => void;

  // 辅助函数
  getStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnType: (item: Approval) => string;

  // 批量操作
  selectedIds?: Set<string>;
  onSelectAll?: (selectAll: boolean) => void;
  onBatchApprove?: () => void;
  onBatchReject?: () => void;
  onExport?: () => void;
}

/**
 * MaterialApprovalTable 组件
 * 库存审批页面的表格区域（领料、退料、物料入库、作物调拨、补录共用一个通用表格）
 */
export function MaterialApprovalTable({
  paginatedData,
  filteredData,
  tabs,
  activeTab,
  expandedRows,
  currentPage,
  totalPages,
  canApprove,
  setActiveTab,
  setCurrentPage,
  toggleExpandRow,
  handleViewDetail,
  handleRejectClick,
  approve,
  onApproveClick,
  getStatusBadge,
  getReturnStatusBadge,
  getReturnType,
  selectedIds,
  onSelectAll,
  onBatchApprove,
  onBatchReject,
  onExport,
}: MaterialApprovalTableProps) {
  // 2026-09-28 修复：历史退料审批单的 businessLink.materials 只存了 {name, quantity}，
  // 导致「退料物料明细」展开后除名称/数量外全为空白。
  // 退料单本身物料字段完整，故加载退料单数据作为明细的权威来源（按 requestId 索引）。
  const returnItems = useMaterialReturnStore((s) => s.items);
  const loadReturns = useMaterialReturnStore((s) => s.loadItems);
  useEffect(() => {
    if (activeTab === 'return' && returnItems.length === 0) {
      loadReturns().catch(() => { /* 加载失败时明细回退到审批单自身数据 */ });
    }
  }, [activeTab, returnItems.length, loadReturns]);

  /** requestId → 退料单完整物料明细（字段齐全，供展开行使用） */
  const returnMaterialsMap = useMemo(() => {
    const map = new Map<string, unknown[]>();
    returnItems.forEach(r => {
      if (Array.isArray(r.materials) && r.materials.length > 0) {
        map.set(String(r.id), r.materials as unknown[]);
      }
    });
    return map;
  }, [returnItems]);

  // 领料审批表格
  const renderMaterialTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap w-12"></TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">领料单号</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请日期</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请人</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">部门</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">库存地点</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">物料种类</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">种植区域/用途</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">审核人</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">生产计划批次号</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">备注</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((item) => (
            <RowPair key={item.id}>
              <TableRow className="hover:bg-blue-50">
                <TableCell className="whitespace-nowrap">
                  <button onClick={() => toggleExpandRow(item.id)} className="p-1 hover:bg-gray-100 rounded">
                    {expandedRows.has(item.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </TableCell>
                {/* 2026-09-28 修复：列头是「领料单号」，此前渲染 item.code（审批单号 SP…）——
                    与退料表同款问题，改为优先显示业务单号 businessLink.requestCode */}
                <TableCell
                  className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 underline whitespace-nowrap"
                  title={`审批单号：${item.code}`}
                >
                  {item.businessLink?.requestCode || item.code}
                </TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applyDate}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applicantName}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applicantDepartment || '-'}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.businessLink?.warehouseLocation || '-'}</TableCell>
                {/* 2026-09-28：补 ?? 0 消除严格模式下的 "possibly undefined" 类型错误 */}
                <TableCell className="text-gray-600 whitespace-nowrap">{(item.materials?.length ?? 0) > 0 ? `${item.materials?.length}种` : '-'}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.businessLink?.plantArea || '-'}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.approvers?.[0]?.userName || '-'}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.businessLink?.batchCode || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(item.status)}
                    {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
                      <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.records[item.records.length - 1]?.comment}>
                        原因：{item.records[item.records.length - 1]?.comment || '-'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.description || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {item.status === ApprovalStatus.PENDING && canApprove && (
                      <>
                        <button
                          onClick={async () => {
                            const ok = await approve(item.id);
                            if (ok) {
                              showAlert('审批已通过');
                            } else {
                              // 失败时必须让用户看到原因（如：业务联动失败导致审批回滚）
                              const err = useApprovalStore.getState().error || '未知错误';
                              showAlert(`审批未生效：${err}`);
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="通过"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRejectClick(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="拒绝">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleViewDetail(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="查看详情">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
              {/* 展开行 - 物料明细 */}
              {expandedRows.has(item.id) && (
                <TableRow key={`${item.id}-expanded`}>
                  <TableCell colSpan={13}>
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 mb-2">物料明细</div>
                      {item.materials && item.materials.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#F2F6FA]">
                              <TableHead className="text-blue-800 text-sm font-semibold">物料编码</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">物料名称</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">规格</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">单位</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">申领数量</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">当前库存</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">单价(元)</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">小计(元)</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">仓库货位</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">备注</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {item.materials.map((m: any, idx: number) => {
                              const subtotal = (m.requestedQuantity || 0) * (m.unitPrice || 0);
                              return (
                                <TableRow key={idx} className="hover:bg-[#F2F6FA]/50">
                                  <TableCell className="text-blue-800 font-mono">{m.materialCode}</TableCell>
                                  <TableCell className="text-blue-800">{m.materialName}</TableCell>
                                  <TableCell className="text-blue-800">{m.spec || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.unit || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.requestedQuantity || 0}</TableCell>
                                  <TableCell className="text-blue-800">{m.stockQuantity ?? '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.unitPrice != null ? m.unitPrice.toFixed(2) : '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.unitPrice != null ? subtotal.toFixed(2) : '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.warehousePosition || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.remark || '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                      )}
                      {item.description && (
                        <div className="mt-3 text-gray-600">
                          <span className="font-medium">申请说明：</span>{item.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </RowPair>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // 退料审批表格
  const renderReturnTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap w-12"></TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">退料单号</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">退料日期</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">退料类型</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请人</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">退料部门</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">仓库位置</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">审批状态</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">审核人</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">备注</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((item) => (
            <RowPair key={item.id}>
              <TableRow className="hover:bg-blue-50">
                <TableCell className="whitespace-nowrap">
                  <button onClick={() => toggleExpandRow(item.id)} className="p-1 hover:bg-gray-100 rounded">
                    {expandedRows.has(item.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </TableCell>
                {/* 2026-09-28 修复：列头是「退料单号」，此前渲染 item.code（审批单号 SP…），
                    导致按退料单号（TL…）查找时找不到。改为优先显示业务单号 businessLink.requestCode，
                    审批单号降为 title 提示。 */}
                <TableCell
                  className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 underline whitespace-nowrap"
                  title={`审批单号：${item.code}`}
                >
                  {item.businessLink?.requestCode || item.code}
                </TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applyDate}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{getReturnType(item)}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applicantName}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applicantDepartment}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.businessLink?.warehouseLocation || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {getReturnStatusBadge(item.status)}
                    {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
                      <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.records[item.records.length - 1]?.comment}>
                        原因：{item.records[item.records.length - 1]?.comment || '-'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.approvers?.[0]?.userName || '-'}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.description || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {item.status === ApprovalStatus.PENDING && canApprove && (
                      <>
                        <button
                          onClick={async () => {
                            const ok = await approve(item.id);
                            if (ok) {
                              showAlert('审批已通过');
                            } else {
                              // 失败时必须让用户看到原因（如：业务联动失败导致审批回滚）
                              const err = useApprovalStore.getState().error || '未知错误';
                              showAlert(`审批未生效：${err}`);
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="通过"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRejectClick(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="拒绝">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleViewDetail(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="查看详情">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
              {/* 展开行 - 退料物料明细 */}
              {expandedRows.has(item.id) && (
                <TableRow key={`${item.id}-expanded`}>
                  <TableCell colSpan={12}>
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 mb-2">退料物料明细</div>
                      {/* 2026-09-28 修复：审批单的顶级 materials 恒为空（创建时未写入），
                          物料实际存在 businessLink.materials —— 此前读 item.materials 导致展开后始终显示"暂无明细"。
                          明细来源优先级：退料单完整明细（returnMaterialsMap）> businessLink.materials > item.materials */}
                      {(((returnMaterialsMap.get(String(item.businessLink?.requestId)) as unknown[] | undefined)?.length ?? 0) > 0
                        || (item.businessLink?.materials?.length ?? 0) > 0
                        || (item.materials?.length ?? 0) > 0) ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#F2F6FA]">
                              <TableHead className="text-blue-800 text-sm font-semibold">来源领料单号</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">物料编码</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">物料分类</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">物料名称</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">规格</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">单位</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">退料数量</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">单价(元)</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">小计(元)</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">仓库货位</TableHead>
                              <TableHead className="text-blue-800 text-sm font-semibold">退料原因</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* 明细优先取退料单原始数据（字段完整），回退审批单简化明细 */}
                            {(((returnMaterialsMap.get(String(item.businessLink?.requestId)) as any[] | undefined)
                              || (item.businessLink?.materials?.length ? item.businessLink.materials : item.materials)
                              || []) as any[]).map((m: any, idx: number) => {
                              // 字段适配（数量优先级修正 2026-09-28）：退料单明细同时含 quantity（原领料量）
                              // 与 returnQuantity（本次退料量），必须优先取 returnQuantity，否则会把「领料量」
                              // 当成「退料量」显示（曾出现退 3 显示成 10 的错误）；审批单简化明细只有 quantity。
                              const qty = m.returnQuantity ?? m.quantity ?? m.requestedQuantity ?? 0;
                              const price = m.unitPrice ?? 0;
                              const subtotal = qty * price;
                              return (
                                <TableRow key={idx} className="hover:bg-[#F2F6FA]/50">
                                  <TableCell className="text-blue-800 font-mono">{m.sourceApplicationCode || '-'}</TableCell>
                                  <TableCell className="text-blue-800 font-mono">{m.materialCode || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.category || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.materialName || m.name || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.spec || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.unit || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{qty}</TableCell>
                                  <TableCell className="text-blue-800">{m.unitPrice != null ? price.toFixed(2) : '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.unitPrice != null ? subtotal.toFixed(2) : '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.warehousePosition || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.reason || '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-blue-800 text-center py-4">暂无退料物料明细</div>
                      )}
                      {item.description && (
                        <div className="mt-3 text-gray-600">
                          <span className="font-medium">退料说明：</span>{item.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </RowPair>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // 采购审批表格
  const renderPurchaseTable = () => (
    <Table>
      <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <TableRow>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">计划编号</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">计划名称</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">类型</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请人</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请日期</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">总金额</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">供应商</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">交货日期</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">优先级</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
          <TableHead className="text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.map((item) => (
          <TableRow key={item.id} className="hover:bg-gray-50">
            <TableCell className="font-medium text-gray-900">{item.code}</TableCell>
            <TableCell className="text-gray-900">{item.title}</TableCell>
            <TableCell className="text-gray-600">{item.businessLink?.items?.[0]?.materialName ? '物资' : '生产物资'}</TableCell>
            <TableCell className="text-gray-600">{item.applicantName}</TableCell>
            <TableCell className="text-gray-600">{item.applyDate}</TableCell>
            <TableCell className="font-medium text-gray-900">{item.amount || '-'}</TableCell>
            <TableCell className="text-gray-600">{item.businessLink?.items?.[0]?.supplier || '-'}</TableCell>
            <TableCell className="text-gray-600">{item.businessLink?.expectedDeliveryDate || '-'}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                item.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {item.priority === 'urgent' ? '紧急' :
                 item.priority === 'high' ? '高' :
                 item.priority === 'normal' ? '中' : '低'}
              </span>
            </TableCell>
            <TableCell>{getStatusBadge(item.status)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {item.status === ApprovalStatus.PENDING && canApprove && (
                  <>
                    <button
                      onClick={async () => {
                        const ok = await approve(item.id);
                        if (ok) {
                          showAlert('审批已通过');
                        } else {
                          const err = useApprovalStore.getState().error || '未知错误';
                          showAlert(`审批未生效：${err}`);
                        }
                      }}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      title="通过"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRejectClick(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="拒绝">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button onClick={() => handleViewDetail(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="查看详情">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // 通用表格渲染（后备用于其他Tab）
  const renderGenericTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap w-12"></TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">审批单号</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">标题</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请人</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">部门</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请时间</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
            <TableHead className="text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</TableCell>
            </TableRow>
          ) : paginatedData.map((item) => (
            <TableRow key={item.id} className="hover:bg-gray-50">
              <TableCell>
                <button onClick={() => toggleExpandRow(item.id)} className="p-1 hover:bg-gray-100 rounded">
                  {expandedRows.has(item.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </TableCell>
              <TableCell className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 underline whitespace-nowrap">{item.code}</TableCell>
              <TableCell className="text-gray-900">{item.title || '-'}</TableCell>
              <TableCell className="text-gray-600">{item.applicantName || '-'}</TableCell>
              <TableCell className="text-gray-600">{item.applicantDepartment || '-'}</TableCell>
              <TableCell className="text-gray-600">{item.applyDate || '-'}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {item.status === ApprovalStatus.PENDING && canApprove && (
                    <>
                      {/* 2026-09-28 审计修复：此前直接 approve(item.id)——不 await、不看结果，
                          store 内部吞错 → 失败无提示。改为走审批意见弹窗流程（有结果提示） */}
                      <button onClick={() => (onApproveClick ? onApproveClick(item) : approve(item.id))} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="通过">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRejectClick(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="拒绝">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleViewDetail(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="查看详情">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // 空状态
  const renderEmptyState = () => (
    <div className="p-12 text-center text-gray-500">
      <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
      <p>暂无审批记录</p>
      <p className="text-sm text-gray-400 mt-2">在领料/退料/采购页面提交申请后，这里将显示审批列表</p>
    </div>
  );

  // 分页组件
  const renderPagination = () => (
    filteredData.length > 0 && (
      <div className="px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages || 1}
          onPageChange={setCurrentPage}
          pageSize={20}
          onPageSizeChange={() => {}}
          showPageSize={false}
        />
      </div>
    )
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
        {/* 批量操作按钮 */}
        <div className="flex items-center gap-2">
          {onBatchApprove && (
            <Button
              onClick={onBatchApprove}
              disabled={!selectedIds || selectedIds.size === 0}
              className={`
                ${!selectedIds || selectedIds.size === 0
                  ? 'bg-emerald-500 text-white cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm'
                }
                transition-all duration-200 font-medium h-8 px-3 text-xs
              `}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              批量通过
            </Button>
          )}
          {onBatchReject && (
            <Button
              onClick={onBatchReject}
              disabled={!selectedIds || selectedIds.size === 0}
              className={`
                ${!selectedIds || selectedIds.size === 0
                  ? 'bg-red-500 text-white cursor-not-allowed opacity-60'
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm'
                }
                transition-all duration-200 font-medium h-8 px-3 text-xs
              `}
            >
              <XCircle className="w-3 h-3 mr-1" />
              批量拒绝
            </Button>
          )}
          {onExport && (
            <Button
              onClick={onExport}
              disabled={!selectedIds || selectedIds.size === 0}
              className={`
                ${!selectedIds || selectedIds.size === 0
                  ? 'bg-blue-500 text-white cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
                }
                transition-all duration-200 font-medium h-8 px-3 text-xs
              `}
            >
              <Download className="w-3 h-3 mr-1" />
              批量导出
            </Button>
          )}
          <Link
            to={tabs.find(t => t.key === activeTab)?.path || '/'}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium ml-2"
          >
            查看全部 →
          </Link>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        {activeTab === 'material' && renderMaterialTable()}
        {activeTab === 'return' && renderReturnTable()}
        {activeTab === 'purchase' && renderPurchaseTable()}
        {/* 其他Tab使用通用表格 */}
        {!['material', 'return', 'purchase'].includes(activeTab) && renderGenericTable()}
      </div>

      {/* 空状态 */}
      {filteredData.length === 0 && renderEmptyState()}

      {/* 分页 */}
      {renderPagination()}
    </div>
  );
}
