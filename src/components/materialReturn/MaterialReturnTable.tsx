import { ChevronDown, ChevronRight } from 'lucide-react';
import { ReturnRecord, STATUS_STYLE_MAP } from './types';

// 可编辑的状态：待审批、已审批、已驳回
const EDITABLE_STATUSES = ['待审批', '已审批', '已驳回'];
const isEditable = (status: string) => EDITABLE_STATUSES.includes(status);

interface MaterialReturnTableProps {
  data: ReturnRecord[];
  expandedRows: Set<number>;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  deleteMode: boolean;
  onToggleExpand: (id: number) => void;
  onSelectRow: (id: number) => void;
  onSelectAll: () => void;
  onView: (item: ReturnRecord) => void;
}

export function MaterialReturnTable({
  data,
  expandedRows,
  selectedRows,
  exportMode,
  batchEditMode,
  deleteMode,
  onToggleExpand,
  onSelectRow,
  onSelectAll,
  onView,
}: MaterialReturnTableProps) {
  const showSelection = exportMode || batchEditMode || deleteMode;

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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {data.map((item) => (
            <>
              {/* 主行 */}
              <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                {showSelection && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      disabled={deleteMode && !isEditable(item.status)}
                      onChange={() => onSelectRow(item.id)}
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
                <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[150px]">{item.remark || '-'}</td>
              </tr>
              {/* 展开行 - 物料明细 */}
              {expandedRows.has(item.id) && (
                <tr key={`${item.id}-expanded`} className="bg-white">
                  <td colSpan={showSelection ? 12 : 11} className="px-4 py-3">
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
                                <td className="px-3 py-2 text-sm text-blue-800">{material.returnQuantity * material.unitPrice}</td>
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
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
