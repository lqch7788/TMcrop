/**
 * 种源追溯 4 Tabs 组件（2026-06-26）
 *
 * 展示当前页面所有种源的统一追溯时间线：
 * - 入库记录：inventory_inbound_records（外购/调拨/退库流水）
 * - 库存流水：inventory_transaction（每次库存加减）
 * - 回流记录：crop_circulation_records（PROPAGATION/QUANTITY/DISPOSAL）
 * - 变更记录：audit_logs（种源本身 create/update/delete）
 *
 * 视图层级：种源管理页面 → 折叠区 → Tabs 切换
 */

import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Package, Warehouse, GitBranch, FileEdit, Loader2 } from 'lucide-react';
import { enhancedApiClient } from '@/lib/apiClient';

interface SeedSourceHistoryTabsProps {
  /** 必填：种源 ID（追溯这个种源的流水） */
  seedSourceId: string;
}

const TYPE_LABELS: Record<string, string> = {
  external_purchased: '外购入库',
  self_produced: '自产入库',
  self_use: '自用入库',
  external_sale: '外售入库',
  transfer_inbound: '调拨入库',
  transfer_out: '调拨出库',
  transfer_in: '退库入库',
  circulation: '回流',
  seed_saving: '留种',
};

export function SeedSourceHistoryTabs({ seedSourceId }: SeedSourceHistoryTabsProps) {
  const [tab, setTab] = useState('inbound');
  const [loading, setLoading] = useState(false);
  const [inboundRows, setInboundRows] = useState<any[]>([]);
  const [inventoryRows, setInventoryRows] = useState<any[]>([]);
  const [circulationRows, setCirculationRows] = useState<any[]>([]);
  const [auditRows, setAuditRows] = useState<any[]>([]);

  // 加载该种源的 4 类流水（4 个独立端点）
  const fetchAll = async () => {
    if (!seedSourceId) return;
    setLoading(true);
    try {
      const [a, b, c, d] = await Promise.all([
        enhancedApiClient.get<any[]>(`/seed-sources/${seedSourceId}/history-inbound`),
        enhancedApiClient.get<any[]>(`/seed-sources/${seedSourceId}/history-inventory`),
        enhancedApiClient.get<any[]>(`/seed-sources/${seedSourceId}/history-circulation`),
        enhancedApiClient.get<any[]>(`/seed-sources/${seedSourceId}/history-audit`),
      ]);
      setInboundRows(Array.isArray(a) ? a : []);
      setInventoryRows(Array.isArray(b) ? b : []);
      setCirculationRows(Array.isArray(c) ? c : []);
      setAuditRows(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error('[SeedSourceHistoryTabs] fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchAll(); }, [seedSourceId]);

  return (
    <div className="p-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inbound">
            <Package className="w-4 h-4 mr-1" /> 入库记录 ({inboundRows.length})
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Warehouse className="w-4 h-4 mr-1" /> 库存流水 ({inventoryRows.length})
          </TabsTrigger>
          <TabsTrigger value="circulation">
            <GitBranch className="w-4 h-4 mr-1" /> 回流记录 ({circulationRows.length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileEdit className="w-4 h-4 mr-1" /> 变更记录 ({auditRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbound">
          {loading ? <Loading /> : (
            <SimpleTable
              rows={inboundRows}
              columns={[
                { key: 'recordDate', label: '入库日期' },
                { key: 'sourceCode', label: '来源编码' },
                { key: 'sourceModule', label: '来源模块' },
                { key: 'sourceType', label: '类型', render: (r) => TYPE_LABELS[r.sourceType] || r.sourceType },
                { key: 'quantity', label: '原始数量', render: (r) => `${r.quantity ?? ''} ${r.unit ?? ''}` },
                // 2026-07-06：新增「已退数量」列，让用户能看到退库操作对原始流水的影响
                { key: 'returnedQuantity', label: '已退数量', render: (r) => {
                    const ret = Number(r.returnedQuantity ?? 0);
                    const qty = Number(r.quantity ?? 0);
                    if (ret > 0) {
                      return <span className="text-amber-600 font-medium">{ret} {r.unit ?? ''}</span>;
                    }
                    return <span className="text-gray-400">—</span>;
                  }
                },
                { key: 'warehouseName', label: '仓库' },
                { key: 'operatorName', label: '操作员' },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="inventory">
          {loading ? <Loading /> : (
            <SimpleTable
              rows={inventoryRows}
              columns={[
                { key: 'createTime', label: '时间' },
                { key: 'instanceId', label: '库存单号' },
                { key: 'transactionType', label: '类型' },
                { key: 'quantity', label: '数量', render: (r) => `${r.quantity ?? ''}` },
                { key: 'balanceAfter', label: '结存' },
                { key: 'remarks', label: '备注' },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="circulation">
          {loading ? <Loading /> : (
            <SimpleTable
              rows={circulationRows}
              columns={[
                { key: 'circulationDate', label: '回流日期' },
                { key: 'circulationType', label: '类型' },
                { key: 'sourceModule', label: '来源模块' },
                { key: 'quantity', label: '数量', render: (r) => `${r.quantity ?? ''} ${r.unit ?? ''}` },
                { key: 'disposition', label: '处置' },
                { key: 'notes', label: '备注' },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="audit">
          {loading ? <Loading /> : (
            <SimpleTable
              rows={auditRows}
              columns={[
                { key: 'createdAt', label: '时间' },
                { key: 'action', label: '操作' },
                { key: 'businessId', label: '种源ID' },
                { key: 'opinion', label: '详情' },
                { key: 'operatorName', label: '操作员' },
              ]}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-8 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中…
    </div>
  );
}

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

function SimpleTable({ rows, columns }: { rows: any[]; columns: Column[] }) {
  if (rows.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-sm">暂无数据</div>;
  }
  return (
    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-2 py-2 text-left whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id || idx} className="hover:bg-gray-50 border-b border-gray-100">
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1.5">
                  {c.render ? c.render(r) : (r[c.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SeedSourceHistoryTabs;