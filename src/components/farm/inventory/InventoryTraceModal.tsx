/**
 * 库存追溯弹窗（上游 / 下游 两列）
 */

import React from 'react';
import { ChevronRight, X, Package, Leaf, Sprout } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  StockType,
  InventoryStock,
  TraceResult,
  DownstreamTraceResult,
} from '../../../types/inventory';

interface InventoryTraceModalProps {
  isOpen: boolean;
  stock: InventoryStock | null;
  upstream: TraceResult[];
  downstream: DownstreamTraceResult[];
  onClose: () => void;
}

const getStockTypeIcon = (stockType: StockType | string) => {
  switch (stockType) {
    case StockType.SEED:
    case 'seed':
      return <Leaf className="w-4 h-4 text-amber-600" />;
    case StockType.SEEDLING:
    case 'seedling':
      return <Sprout className="w-4 h-4 text-green-600" />;
    case StockType.PRODUCT:
    case 'product':
      return <Package className="w-4 h-4 text-emerald-600" />;
    default:
      return <Package className="w-4 h-4 text-gray-600" />;
  }
};

const getStockTypeBadge = (stockType: StockType | string) => {
  switch (stockType) {
    case StockType.SEED:
    case 'seed':
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">种源</span>;
    case StockType.SEEDLING:
    case 'seedling':
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">种苗</span>;
    case StockType.PRODUCT:
    case 'product':
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">成品</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知</span>;
  }
};

export function InventoryTraceModal({
  isOpen,
  stock,
  upstream,
  downstream,
  onClose,
}: InventoryTraceModalProps) {
  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
          <div>
            <h3 className="text-lg font-semibold text-white">库存追溯链</h3>
            <p className="text-sm text-emerald-100">实例ID: {stock.instanceId}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-emerald-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-6">
            {/* 上游来源 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                上游来源 ({upstream.length})
              </h4>
              {upstream.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                  无上游来源（最原始记录）
                </div>
              ) : (
                <div className="space-y-2">
                  {upstream.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        {getStockTypeIcon(item.stockType)}
                        <span className="text-sm font-medium">{item.cropName}</span>
                        {getStockTypeBadge(item.stockType)}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{item.instanceId}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        数量: {item.quantity} · 入库: {item.inboundDate}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 下游去向 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                下游去向 ({downstream.length})
              </h4>
              {downstream.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                  无下游去向（未被任何后续业务使用）
                </div>
              ) : (
                <div className="space-y-2">
                  {downstream.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        {getStockTypeIcon(item.stockType)}
                        <span className="text-sm font-medium">{item.businessId}</span>
                        {getStockTypeBadge(item.stockType)}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{item.instanceId}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        出库: {item.outboundQuantity} · 日期: {item.outboundDate}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
