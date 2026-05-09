// MaterialApprovalTable 组件
// 物料审批页面的表格组件
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon,
  CheckCircle, XCircle, Eye, ClipboardList
} from 'lucide-react';
import { Approval, ApprovalStatus } from '@/types/approval';
import type { MaterialApprovalTab, TabConfig } from '../../types/materialApproval.types';

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
  approve: (id: string) => void;

  // 辅助函数
  getStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnType: (item: Approval) => string;
}

/**
 * MaterialApprovalTable 组件
 * 物料审批页面的表格区域，包含领料、退料、采购三种表格
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
  getStatusBadge,
  getReturnStatusBadge,
  getReturnType,
}: MaterialApprovalTableProps) {
  // 领料审批表格
  const renderMaterialTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap w-12"></th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">领料单号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">申请日期</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">申请人</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">部门</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">库存地点</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">物料种类</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">种植区域/用途</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">审核人</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">生产计划批次号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">状态</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">备注</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {paginatedData.map((item) => (
            <React.Fragment key={item.id}>
              <tr className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => toggleExpandRow(item.id)} className="p-1 hover:bg-gray-100 rounded">
                    {expandedRows.has(item.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap">{item.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applyDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantName}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantDepartment || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.warehouseLocation || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.materials?.length > 0 ? `${item.materials.length}种` : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.plantArea || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.approvers?.[0]?.userName || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.batchCode || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(item.status)}
                    {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
                      <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.records[item.records.length - 1]?.comment}>
                        原因：{item.records[item.records.length - 1]?.comment || '-'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.description || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {item.status === ApprovalStatus.PENDING && canApprove && (
                      <>
                        <button onClick={() => approve(item.id)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="通过">
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
                </td>
              </tr>
              {/* 展开行 - 物料明细 */}
              {expandedRows.has(item.id) && (
                <tr key={`${item.id}-expanded`}>
                  <td colSpan={13} className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 mb-2">物料明细</div>
                      {item.materials && item.materials.length > 0 ? (
                        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-[#F2F6FA]">
                            <tr>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申领数量</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">当前库存</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {item.materials.map((m: any, idx: number) => {
                              const subtotal = (m.requestedQuantity || 0) * (m.unitPrice || 0);
                              return (
                                <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                  <td className="px-3 py-2 text-sm text-blue-800 font-mono">{m.materialCode}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.materialName}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.spec || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.unit || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.requestedQuantity || 0}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.stockQuantity ?? '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? m.unitPrice.toFixed(2) : '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? subtotal.toFixed(2) : '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.warehousePosition || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.remark || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                      )}
                      {item.description && (
                        <div className="mt-3 text-gray-600">
                          <span className="font-medium">申请说明：</span>{item.description}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 退料审批表格
  const renderReturnTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap w-12"></th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料单号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料日期</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料类型</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">申请人</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">退料部门</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">仓库位置</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">审批状态</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">审核人</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">备注</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {paginatedData.map((item) => (
            <React.Fragment key={item.id}>
              <tr className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => toggleExpandRow(item.id)} className="p-1 hover:bg-gray-100 rounded">
                    {expandedRows.has(item.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap">{item.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applyDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{getReturnType(item)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantName}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicantDepartment}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.businessLink?.warehouseLocation || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {getReturnStatusBadge(item.status)}
                    {item.status === ApprovalStatus.REJECTED && item.records && item.records.length > 0 && (
                      <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.records[item.records.length - 1]?.comment}>
                        原因：{item.records[item.records.length - 1]?.comment || '-'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.approvers?.[0]?.userName || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.description || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {item.status === ApprovalStatus.PENDING && canApprove && (
                      <>
                        <button onClick={() => approve(item.id)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="通过">
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
                </td>
              </tr>
              {/* 展开行 - 退料物料明细 */}
              {expandedRows.has(item.id) && (
                <tr key={`${item.id}-expanded`}>
                  <td colSpan={12} className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 mb-2">退料物料明细</div>
                      {item.materials && item.materials.length > 0 ? (
                        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-[#F2F6FA]">
                            <tr>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料分类</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">退料数量</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">退料原因</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {item.materials.map((m: any, idx: number) => {
                              const subtotal = (m.returnQuantity || 0) * (m.unitPrice || 0);
                              return (
                                <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                  <td className="px-3 py-2 text-sm text-blue-800 font-mono">{m.sourceApplicationCode || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800 font-mono">{m.materialCode}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.category || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.materialName}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.spec || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.unit || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.returnQuantity || m.requestedQuantity || 0}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? m.unitPrice.toFixed(2) : '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.unitPrice != null ? subtotal.toFixed(2) : '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.warehousePosition || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-blue-800">{m.reason || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-blue-800 text-center py-4">暂无退料物料明细</div>
                      )}
                      {item.description && (
                        <div className="mt-3 text-gray-600">
                          <span className="font-medium">退料说明：</span>{item.description}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 采购审批表格
  const renderPurchaseTable = () => (
    <table className="w-full">
      <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划编号</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划名称</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总金额</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">交货日期</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {paginatedData.map((item) => (
          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
            <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{item.businessLink?.items?.[0]?.materialName ? '物资' : '生产物资'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{item.applicantName}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{item.applyDate}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.amount || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{item.businessLink?.items?.[0]?.supplier || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{item.businessLink?.expectedDeliveryDate || '-'}</td>
            <td className="px-4 py-3">
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
            </td>
            <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                {item.status === ApprovalStatus.PENDING && canApprove && (
                  <>
                    <button onClick={() => approve(item.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="通过">
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
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          共 {filteredData.length} 条记录，第 {currentPage}/{totalPages || 1} 页
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {[...Array(totalPages || 1)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                currentPage === i + 1
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
            disabled={currentPage === (totalPages || 1)}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
        <Link
          to={tabs.find(t => t.key === activeTab)?.path || '/'}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          查看全部 →
        </Link>
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        {activeTab === 'material' && renderMaterialTable()}
        {activeTab === 'return' && renderReturnTable()}
        {activeTab === 'purchase' && renderPurchaseTable()}
      </div>

      {/* 空状态 */}
      {filteredData.length === 0 && renderEmptyState()}

      {/* 分页 */}
      {renderPagination()}
    </div>
  );
}
