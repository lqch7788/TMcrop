/**
 * 2026-07-03：删除阻挡详情面板（带表头真表格版）
 * 在弹窗内固定显示"无法删除"的原因 + 关联作物库存表 + 出库流水表
 */

import React from 'react';
import { AlertCircle, Package, X } from 'lucide-react';

export interface BlockingStockRecord {
  instanceId: string;
  cropName?: string;
  cropVariety?: string;
  currentQty?: number;
  unit?: string;
  warehouseName?: string;
  transactions?: BlockingTransaction[];
}

export interface BlockingTransaction {
  txId: string;
  txType?: string;
  txTypeLabel?: string;
  businessCode?: string;
  businessType?: string;
  bizTypeLabel?: string;
  qty?: number;
  operatorName?: string;
  operateDate?: string;
}

interface Props {
  blockingRecords?: BlockingStockRecord[];
  blockingTransactions?: BlockingTransaction[];
  message: string;
  onClose: () => void;
}

export const DeleteErrorPanel: React.FC<Props> = ({
  blockingRecords, blockingTransactions, message, onClose,
}) => {
  return (
    <div className="mb-3 border border-amber-400 bg-amber-50 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
          <span className="font-semibold text-amber-900 text-sm">无法删除{message}</span>
        </div>
        <button onClick={onClose} className="text-amber-500 hover:text-amber-700" title="关闭">
          <X className="w-4 h-4" />
        </button>
      </div>

      {blockingRecords && blockingRecords.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-amber-800 mb-2">
            关联作物库存（共 {blockingRecords.length} 条）：
          </div>
          <div className="space-y-3 max-h-[28rem] overflow-y-auto">
            {blockingRecords.map((rec, ri) => (
              <div key={ri} className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                {/* 作物库存表 */}
                <table className="w-full text-xs">
                  <thead className="bg-amber-100 text-amber-900">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-12">序号</th>
                      <th className="px-3 py-2 text-left font-medium">库存实例ID</th>
                      <th className="px-3 py-2 text-left font-medium">作物名称</th>
                      <th className="px-3 py-2 text-left font-medium">作物品种</th>
                      <th className="px-3 py-2 text-right font-medium">库存数量</th>
                      <th className="px-3 py-2 text-left font-medium">仓库</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-amber-50">
                      <td className="px-3 py-2 text-gray-500 font-mono">#{ri + 1}</td>
                      <td className="px-3 py-2 font-mono text-amber-700">{rec.instanceId}</td>
                      <td className="px-3 py-2 text-gray-900">{rec.cropName || '-'}</td>
                      <td className="px-3 py-2 text-gray-900">{rec.cropVariety || '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-900 font-medium">
                        {rec.currentQty || 0} {rec.unit || ''}
                      </td>
                      <td className="px-3 py-2 text-gray-900">{rec.warehouseName || '-'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 出库流水表 */}
                {(rec.transactions || []).length > 0 && (
                  <div className="border-t border-amber-200 bg-red-50 p-3">
                    <div className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      以下出库/调拨记录正在使用此库存（共 {rec.transactions.length} 笔）：
                    </div>
                    <table className="w-full text-xs bg-white rounded border border-red-200">
                      <thead className="bg-red-100 text-red-900">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium">出库单号</th>
                          <th className="px-2 py-1.5 text-left font-medium">类型</th>
                          <th className="px-2 py-1.5 text-left font-medium">关联单号</th>
                          <th className="px-2 py-1.5 text-right font-medium">数量</th>
                          <th className="px-2 py-1.5 text-left font-medium">操作人</th>
                          <th className="px-2 py-1.5 text-left font-medium">日期</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rec.transactions!.map((tx, ti) => (
                          <tr key={ti} className={ti % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1.5 font-mono text-red-700 whitespace-nowrap">{tx.txId}</td>
                            <td className="px-2 py-1.5">
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-medium">
                                {tx.txTypeLabel || tx.txType || '-'}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-gray-900">{tx.businessCode || '-'}</td>
                            <td className="px-2 py-1.5 text-right text-gray-900 font-medium">×{tx.qty || 0}</td>
                            <td className="px-2 py-1.5 text-gray-900">{tx.operatorName || '-'}</td>
                            <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{tx.operateDate || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : blockingTransactions && blockingTransactions.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-red-700 mb-2">
            以下出库记录正在使用此库存（共 {blockingTransactions.length} 笔）：
          </div>
          <table className="w-full text-xs bg-white border border-red-200 rounded">
            <thead className="bg-red-100 text-red-900">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">出库单号</th>
                <th className="px-2 py-1.5 text-left font-medium">类型</th>
                <th className="px-2 py-1.5 text-left font-medium">关联单号</th>
                <th className="px-2 py-1.5 text-right font-medium">数量</th>
                <th className="px-2 py-1.5 text-left font-medium">操作人</th>
                <th className="px-2 py-1.5 text-left font-medium">日期</th>
              </tr>
            </thead>
            <tbody>
              {blockingTransactions.map((tx, ti) => (
                <tr key={ti} className={ti % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5 font-mono text-red-700 whitespace-nowrap">{tx.txId}</td>
                  <td className="px-2 py-1.5">
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-medium">
                      {tx.txTypeLabel || tx.txType || '-'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-900">{tx.businessCode || '-'}</td>
                  <td className="px-2 py-1.5 text-right text-gray-900 font-medium">×{tx.qty || 0}</td>
                  <td className="px-2 py-1.5 text-gray-900">{tx.operatorName || '-'}</td>
                  <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{tx.operateDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm text-amber-700 font-medium mt-2">
            请先在「出库记录」页面撤销以上出库记录，再回来删除此库存。
          </div>
        </div>
      ) : (
        <div className="text-sm text-amber-700">{message}</div>
      )}
    </div>
  );
};

export default DeleteErrorPanel;