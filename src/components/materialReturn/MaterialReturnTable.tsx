import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Copy, Pencil, Printer, Send, Trash2, Undo2 } from 'lucide-react';
import { ReturnRecord, RecordId, STATUS_STYLE_MAP } from './types';
import { Button } from '@/components/ui';
import { printReturnVoucher } from './modals/DetailModal';

// 可编辑的状态：草稿、待审批、已审批、已驳回（2026-09-28 加入草稿态）
const EDITABLE_STATUSES = ['草稿', '待审批', '已审批', '已驳回'];
const isEditable = (status: string) => EDITABLE_STATUSES.includes(status);
// 可撤回审批：仅待审批
const isWithdrawable = (status: string) => status === '待审批';
// 可重新提交：草稿 / 已驳回
const isResubmittable = (status: string) => status === '草稿' || status === '已驳回';

interface MaterialReturnTableProps {
  data: ReturnRecord[];
  expandedRows: Set<RecordId>;
  selectedRows: RecordId[];
  exportMode: boolean;
  deleteMode: boolean;
  onToggleExpand: (id: RecordId) => void;
  onSelectRow: (id: RecordId) => void;
  onSelectAll: () => void;
  onView: (item: ReturnRecord) => void;
  /** 行级编辑入口（2026-09-28 新增：此前必须先进入批量编辑模式才能编辑单条） */
  onEdit?: (item: ReturnRecord) => void;
  /** 行级删除入口（2026-09-28 新增） */
  onDelete?: (item: ReturnRecord) => void;
  /** 撤回审批（2026-09-28 新增，仅待审批） */
  onWithdraw?: (item: ReturnRecord) => void;
  /** 重新提交审批（2026-09-28 新增，草稿/已驳回） */
  onResubmit?: (item: ReturnRecord) => void;
  /** 复制退料单（2026-09-28 新增） */
  onDuplicate?: (item: ReturnRecord) => void;
}

export function MaterialReturnTable({
  data,
  expandedRows,
  selectedRows,
  exportMode,
  deleteMode,
  onToggleExpand,
  onSelectRow,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onWithdraw,
  onResubmit,
  onDuplicate,
}: MaterialReturnTableProps) {
  const showSelection = exportMode || deleteMode;
  // 操作列：仅在非选择模式下展示（选择模式下勾选即代表操作对象）
  const showActions = !showSelection && (!!onEdit || !!onDelete);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            {showSelection && (
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                <input
                  type="checkbox"
                  checked={selectedRows.length === data.length && data.length > 0}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  aria-label="全选"
                />
              </th>
            )}
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">退料单号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">退料日期</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">退料类型</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作人</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">退料部门</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">仓库位置</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审批状态</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
            {showActions && <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-48">操作</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {/* 2026-09-28：vite-plugin-source-identifier 会向 <Fragment> 注入 data-matrix-id，
              触发 React "Invalid prop" 警告（同 InventoryDetailModal 先例）。
              表格内不能用 <div> 包裹 <tr>，故改用数组返回多行。 */}
          {data.flatMap((item): ReactNode[] => {
            const rows: ReactNode[] = [
              <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                {showSelection && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      disabled={deleteMode && !isEditable(item.status)}
                      onChange={() => onSelectRow(item.id)}
                      aria-label={`选择 ${item.code}`}
                      className={`w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500 ${
                        deleteMode && !isEditable(item.status) ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleExpand(item.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                    aria-label={expandedRows.has(item.id) ? '收起明细' : '展开明细'}
                  >
                    {expandedRows.has(item.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </td>
                <td
                  className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700"
                  onClick={() => onView(item)}
                >
                  {item.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.applicant}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.operator}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.department}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.warehouseLocation}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    STATUS_STYLE_MAP[item.statusClass]?.bg || 'bg-gray-100'
                  } ${STATUS_STYLE_MAP[item.statusClass]?.text || 'text-gray-700'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.reviewer}</td>
                {/* 备注截断时提供 title 提示，避免内容不可见 */}
                <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[150px]" title={item.remark || ''}>
                  {item.remark || '-'}
                </td>
                {showActions && (
                  <td className="px-4 py-3">
                    {/* 行级操作（图标顺序对齐领料页）：编辑 → 撤回 → 重提 → 复制 → 打印 → 删除 */}
                    <div className="flex items-center justify-center gap-1">
                      {isEditable(item.status) && onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="编辑此退料单"
                          aria-label={`编辑 ${item.code}`}
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      {isWithdrawable(item.status) && onWithdraw && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="撤回审批"
                          aria-label={`撤回 ${item.code}`}
                          onClick={() => onWithdraw(item)}
                        >
                          <Undo2 className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                      {isResubmittable(item.status) && onResubmit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="重新提交审批"
                          aria-label={`重新提交 ${item.code}`}
                          onClick={() => onResubmit(item)}
                        >
                          <Send className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                      {onDuplicate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="复制退料单"
                          aria-label={`复制 ${item.code}`}
                          onClick={() => onDuplicate(item)}
                        >
                          <Copy className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="打印退料单"
                        aria-label={`打印 ${item.code}`}
                        onClick={() => printReturnVoucher(item)}
                      >
                        <Printer className="w-4 h-4 text-gray-600" />
                      </Button>
                      {isEditable(item.status) && onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="删除此退料单"
                          aria-label={`删除 ${item.code}`}
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>,
            ];
            // 展开行 - 物料明细
            if (expandedRows.has(item.id)) {
              rows.push(
                <tr key={`${item.id}-expanded`} className="bg-white">
                  <td colSpan={showSelection ? (showActions ? 13 : 12) : (showActions ? 12 : 11)} className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 mb-2">物料明细</div>
                      {item.materials.length > 0 ? (
                        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-[#F2F6FA]">
                            <tr>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料分类</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">本次退料数量</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">退料原因</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {item.materials.map((material, idx) => (
                              <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.sourceApplicationCode}</td>
                                <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.category}</td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.returnQuantity}</td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.unitPrice}</td>
                                {/* 小计保留两位小数（此前直接相乘会输出浮点长尾） */}
                                <td className="px-3 py-2 text-sm text-blue-800">
                                  {((Number(material.returnQuantity) || 0) * (Number(material.unitPrice) || 0)).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition}</td>
                                <td className="px-3 py-2 text-sm text-blue-800">{material.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }
            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}
