// MaterialApprovalTable 组件
// 物料审批页面的表格组件
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon,
  CheckCircle, XCircle, Eye, ClipboardList
} from 'lucide-react';
import { Approval, ApprovalStatus } from '@/types/approval';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
            <React.Fragment key={item.id}>
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
                <TableCell className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 underline whitespace-nowrap">{item.code}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applyDate}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applicantName}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.applicantDepartment || '-'}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.businessLink?.warehouseLocation || '-'}</TableCell>
                <TableCell className="text-gray-600 whitespace-nowrap">{item.materials?.length > 0 ? `${item.materials.length}种` : '-'}</TableCell>
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
            </React.Fragment>
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
            <React.Fragment key={item.id}>
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
                <TableCell className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 underline whitespace-nowrap">{item.code}</TableCell>
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
                </TableCell>
              </TableRow>
              {/* 展开行 - 退料物料明细 */}
              {expandedRows.has(item.id) && (
                <TableRow key={`${item.id}-expanded`}>
                  <TableCell colSpan={12}>
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 mb-2">退料物料明细</div>
                      {item.materials && item.materials.length > 0 ? (
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
                            {item.materials.map((m: any, idx: number) => {
                              const subtotal = (m.returnQuantity || 0) * (m.unitPrice || 0);
                              return (
                                <TableRow key={idx} className="hover:bg-[#F2F6FA]/50">
                                  <TableCell className="text-blue-800 font-mono">{m.sourceApplicationCode || '-'}</TableCell>
                                  <TableCell className="text-blue-800 font-mono">{m.materialCode}</TableCell>
                                  <TableCell className="text-blue-800">{m.category || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.materialName}</TableCell>
                                  <TableCell className="text-blue-800">{m.spec || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.unit || '-'}</TableCell>
                                  <TableCell className="text-blue-800">{m.returnQuantity || m.requestedQuantity || 0}</TableCell>
                                  <TableCell className="text-blue-800">{m.unitPrice != null ? m.unitPrice.toFixed(2) : '-'}</TableCell>
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
            </React.Fragment>
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
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
