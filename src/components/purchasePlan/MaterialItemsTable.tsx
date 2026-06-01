/**
 * 物料明细表格 - 共享组件
 * 支持两种模式：
 * - 'view'：只读展示（详情页、列表展开行）
 * - 'edit'：可编辑（批量编辑弹窗）
 */
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { PurchasePlanItem } from '../../types/purchase';

export interface MaterialItemsTableProps {
  items: PurchasePlanItem[];
  mode?: 'view' | 'edit';
  onItemsChange?: (items: PurchasePlanItem[]) => void;
  /** view 模式下的表头主题色 */
  headerTheme?: 'emerald' | 'blue';
}

const VIEW_COLUMNS: Array<{ key: keyof PurchasePlanItem | 'actions'; label: string; align?: 'left' | 'right' | 'center' }> = [
  { key: 'materialCode', label: '物料编码' },
  { key: 'materialName', label: '物料名称' },
  { key: 'category', label: '分类' },
  { key: 'specification', label: '规格型号' },
  { key: 'unit', label: '单位', align: 'center' },
  { key: 'quantity', label: '数量', align: 'right' },
  { key: 'estimatedPrice', label: '预估单价', align: 'right' },
  { key: 'estimatedTotalPrice', label: '小计', align: 'right' },
  { key: 'supplier', label: '供应商' },
  { key: 'purpose', label: '用途说明' },
  { key: 'remark', label: '备注' },
];

const EDIT_COLUMNS = [
  { key: 'materialCode', label: '物料编码' },
  { key: 'materialName', label: '物料名称' },
  { key: 'category', label: '分类' },
  { key: 'specification', label: '规格型号' },
  { key: 'unit', label: '单位' },
  { key: 'quantity', label: '数量' },
  { key: 'estimatedPrice', label: '预估单价' },
  { key: 'supplier', label: '供应商' },
  { key: 'purpose', label: '用途说明' },
] as const;

export function MaterialItemsTable({
  items,
  mode = 'view',
  onItemsChange,
  headerTheme = 'blue',
}: MaterialItemsTableProps) {
  const headerClass = headerTheme === 'emerald'
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';

  const updateItem = (id: string, field: keyof PurchasePlanItem, value: string | number) => {
    if (!onItemsChange) return;
    onItemsChange(
      items.map(item => {
        if (item.id !== id) return item;
        const updated: PurchasePlanItem = { ...item, [field]: value };
        // 数量/单价变化时自动计算总价
        if (field === 'quantity' || field === 'estimatedPrice') {
          updated.estimatedTotalPrice = Number(updated.quantity) * Number(updated.estimatedPrice);
        }
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    if (!onItemsChange) return;
    onItemsChange(items.filter(item => item.id !== id));
  };

  // view 模式
  if (mode === 'view') {
    return (
      <table className="w-full bg-white rounded-lg overflow-hidden text-xs">
        <thead className={headerClass}>
          <tr>
            {VIEW_COLUMNS.map(col => (
              <th
                key={String(col.key)}
                className={`px-2 py-2 text-${col.align || 'left'} text-xs font-semibold whitespace-nowrap`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              {VIEW_COLUMNS.map(col => {
                const v = item[col.key as keyof PurchasePlanItem];
                let display: React.ReactNode = '-';
                if (col.key === 'quantity') {
                  display = item.quantity;
                } else if (col.key === 'estimatedPrice') {
                  display = `¥${(item.estimatedPrice || 0).toFixed(2)}`;
                } else if (col.key === 'estimatedTotalPrice') {
                  display = `¥${(item.estimatedTotalPrice || 0).toLocaleString()}`;
                } else if (v !== undefined && v !== null && v !== '') {
                  display = String(v);
                }
                return (
                  <td
                    key={String(col.key)}
                    className={`px-2 py-2 text-xs text-gray-${col.key === 'materialName' ? '900 font-medium' : '600'} text-${col.align || 'left'} whitespace-nowrap`}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // edit 模式
  return (
    <table className="w-full text-xs">
      <thead className={headerClass}>
        <tr>
          <th className="px-2 py-2 text-center font-semibold w-10">操作</th>
          {EDIT_COLUMNS.map(col => (
            <th key={col.key} className="px-2 py-2 text-left font-semibold">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map(item => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-2 py-2 text-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                title="删除此行"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </td>
            {EDIT_COLUMNS.map(col => {
              const isNumeric = col.key === 'quantity' || col.key === 'estimatedPrice';
              const value = (item as any)[col.key] ?? '';
              return (
                <td key={col.key} className="px-2 py-2">
                  <Input
                    type={isNumeric ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => {
                      const v = isNumeric ? Number(e.target.value) : e.target.value;
                      updateItem(item.id, col.key as keyof PurchasePlanItem, v);
                    }}
                    className="h-7 p-1 text-xs rounded border-gray-300"
                    placeholder={col.label}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default MaterialItemsTable;
