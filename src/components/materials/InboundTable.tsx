// 物料入库记录表格组件
import { Eye, Edit, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { Pagination } from '@/components/ui';
// 2026-10-11：改用权威类型 —— 原本地 interface 是"单物料"旧模型，与数据源（一单多物料 materials[]）不匹配
import type { InboundRecord } from '@/types/warehouseInbound.types';
// 2026-10-26：无权限按钮「可见但灰化 + 点击提示」
import { guardByPermission, PERMISSION_DENIED_CLASS as DENIED } from '@/hooks/usePermissionAction';

/** 展开后的展示行（单头字段 + 单个物料明细） */
interface InboundDisplayRow {
  id: number;
  code: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string;
  inboundDate: string;
  operator: string;
  status: string;
  rowKey: string;
}

interface InboundTableProps {
  records: InboundRecord[];
  currentPage: number;
  pageSize: number;
  canCreate: boolean;
  canEdit: boolean;
  can: (module: string, action: string) => boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onAddClick: () => void;
}

export default function InboundTable({
  records,
  currentPage,
  pageSize,
  canCreate,
  canEdit,
  can,
  onPageChange,
  onPageSizeChange,
  onAddClick,
}: InboundTableProps) {
  // 2026-10-11：一单多物料展开成"一行一物料"（无明细时占位一行）
  const rows: InboundDisplayRow[] = records.flatMap((r) => {
    const mats = r.materials ?? [];
    const head = {
      id: r.id,
      code: r.code,
      supplier: r.supplier,
      inboundDate: r.inboundDate,
      operator: r.operator,
      status: String(r.status),
    };
    if (mats.length === 0) {
      return [{ ...head, materialCode: '-', materialName: '-', quantity: 0, unit: '-', rowKey: String(r.id) }];
    }
    return mats.map((m, idx) => ({
      ...head,
      materialCode: m.code,
      materialName: m.name,
      quantity: m.quantity,
      unit: m.unit,
      rowKey: `${r.id}-${m.id ?? idx}`,
    }));
  });
  const totalPages = Math.ceil(rows.length / pageSize) || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格头部 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
        {/* 2026-10-26：按钮始终可见，无权限灰化 + 点击提示 */}
        <Button size="sm" onClick={guardByPermission(canCreate, '新增', onAddClick)}
          className={!canCreate ? DENIED : undefined}
          title={!canCreate ? '权限不足：需要「新增」权限' : undefined}>
          <Plus className="w-4 h-4" /> 新增入库
        </Button>
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库单号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作员</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => (
              <tr key={record.rowKey} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.materialCode}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.materialName}</td>
                <td className="px-4 py--3 text-sm text-gray-900">
                  {record.quantity}
                  {record.unit}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.inboundDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.operator}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {record.status === 'completed' ? '已完成' : '待审核'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {can('PROC_MATERIALS', 'view') && (
                      <Button variant="ghost" size="icon" title="查看">
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon"
                      title={!canEdit ? '权限不足：需要「编辑」权限' : '编辑'}
                      className={!canEdit ? DENIED : undefined}
                      onClick={guardByPermission(canEdit, '编辑', () => {})}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-sm text-gray-500">共 {rows.length} 条</div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
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
