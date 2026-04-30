/**
 * V3.0 统一库存管理页面
 * 展示所有库存实例，支持追溯查询
 */

import React, { useState, useEffect } from 'react';
import { Package, Leaf, Sprout, Search, Filter, RefreshCw, ChevronRight, History, ExternalLink, X } from 'lucide-react';
import {
  getInventoryList,
  getInventoryStats,
  traceUpstream,
  traceDownstream,
} from '../services/inventoryService';
import {
  StockType,
  SourceType,
  InventoryStatus,
  InventoryStock,
} from '../types/inventory';

export default function InventoryV3Page() {
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [stats, setStats] = useState<{
    totalInstances: number;
    totalQuantity: number;
    byStockType: Record<string, { count: number; quantity: number }>;
    lowStockCount: number;
    expiringCount: number;
  } | null>(null);
  const [filter, setFilter] = useState<{
    stockType: StockType | '';
    status: InventoryStatus | '';
    sourceType: SourceType | '';
  }>({
    stockType: '',
    status: '',
    sourceType: '',
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStock, setSelectedStock] = useState<InventoryStock | null>(null);
  const [traceData, setTraceData] = useState<{
    upstream: any[];
    downstream: any[];
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filter.stockType) filters.stockType = filter.stockType;
      if (filter.status) filters.status = filter.status;
      if (filter.sourceType) filters.sourceType = filter.sourceType;

      const [stockList, statsData] = await Promise.all([
        getInventoryList(filters),
        getInventoryStats(),
      ]);

      setStocks(stockList);
      setStats(statsData);
    } catch (error) {
      console.error('加载库存数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrace = async (stock: InventoryStock) => {
    setSelectedStock(stock);
    try {
      const [upstream, downstream] = await Promise.all([
        traceUpstream(stock.instanceId),
        traceDownstream(stock.instanceId),
      ]);
      setTraceData({ upstream, downstream });
    } catch (error) {
      console.error('加载追溯链失败:', error);
      setTraceData({ upstream: [], downstream: [] });
    }
  };

  const getStockTypeIcon = (stockType: StockType) => {
    switch (stockType) {
      case StockType.SEED:
        return <Leaf className="w-5 h-5 text-amber-600" />;
      case StockType.SEEDLING:
        return <Sprout className="w-5 h-5 text-green-600" />;
      case StockType.PRODUCT:
        return <Package className="w-5 h-5 text-emerald-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStockTypeName = (stockType: StockType) => {
    switch (stockType) {
      case StockType.SEED: return '种源';
      case StockType.SEEDLING: return '育苗';
      case StockType.PRODUCT: return '成品';
      default: return '未知';
    }
  };

  const getStatusBadge = (status: InventoryStatus) => {
    switch (status) {
      case InventoryStatus.IN_STOCK:
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">库存中</span>;
      case InventoryStatus.LOW_STOCK:
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">低库存</span>;
      case InventoryStatus.FROZEN:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">已冻结</span>;
      case InventoryStatus.OUTBOUND:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">已出库</span>;
      case InventoryStatus.EMPTY:
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已用完</span>;
      default:
        return null;
    }
  };

  const filteredStocks = stocks.filter(stock => {
    if (!searchKeyword) return true;
    return (
      stock.instanceId.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      stock.cropName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (stock.varietyName || '').toLowerCase().includes(searchKeyword.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">V3.0 统一库存管理</h1>
          <p className="text-sm text-gray-500 mt-1">全链路库存追溯管理</p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-500">总库存实例</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalInstances}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-500">总库存数量</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.totalQuantity}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-500">低库存预警</div>
              <div className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-500">即将过期</div>
              <div className="text-2xl font-bold text-red-600">{stats.expiringCount}</div>
            </div>
          </div>
        )}

        {/* 库存类型统计 */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">种源库存</span>
              </div>
              <div className="text-2xl font-bold text-amber-700">
                {stats.byStockType[StockType.SEED]?.count || 0} 实例
              </div>
              <div className="text-sm text-amber-600">
                {stats.byStockType[StockType.SEED]?.quantity || 0} 数量
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Sprout className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">育苗库存</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {stats.byStockType[StockType.SEEDLING]?.count || 0} 实例
              </div>
              <div className="text-sm text-green-600">
                {stats.byStockType[StockType.SEEDLING]?.quantity || 0} 数量
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">成品库存</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                {stats.byStockType[StockType.PRODUCT]?.count || 0} 实例
              </div>
              <div className="text-sm text-emerald-600">
                {stats.byStockType[StockType.PRODUCT]?.quantity || 0} 数量
              </div>
            </div>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索实例ID、作物名称..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <select
              value={filter.stockType}
              onChange={(e) => setFilter({ ...filter, stockType: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">全部类型</option>
              <option value={StockType.SEED}>种源</option>
              <option value={StockType.SEEDLING}>育苗</option>
              <option value={StockType.PRODUCT}>成品</option>
            </select>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">全部状态</option>
              <option value={InventoryStatus.IN_STOCK}>库存中</option>
              <option value={InventoryStatus.LOW_STOCK}>低库存</option>
              <option value={InventoryStatus.FROZEN}>已冻结</option>
              <option value={InventoryStatus.OUTBOUND}>已出库</option>
              <option value={InventoryStatus.EMPTY}>已用完</option>
            </select>
            <select
              value={filter.sourceType}
              onChange={(e) => setFilter({ ...filter, sourceType: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">全部来源</option>
              <option value={SourceType.SELF_PRODUCED}>自产</option>
              <option value={SourceType.EXTERNAL_PURCHASED}>外购</option>
            </select>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>

        {/* 库存列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">实例ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">作物</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">可用</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">冻结</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">入库日期</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" />
                        加载中...
                      </div>
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      暂无库存数据
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <tr key={stock.instanceId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{stock.instanceId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStockTypeIcon(stock.stockType)}
                          <span className="text-sm text-gray-700">{getStockTypeName(stock.stockType)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{stock.cropName}</div>
                        <div className="text-xs text-gray-500">{stock.varietyName || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {stock.currentQuantity} {stock.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                        {stock.currentQuantity - stock.frozenQuantity} {stock.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600">
                        {stock.frozenQuantity} {stock.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {stock.sourceType === SourceType.SELF_PRODUCED ? '自产' : '外购'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(stock.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(stock.inboundDate).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTrace(stock)}
                          className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
                        >
                          <History className="w-4 h-4" />
                          追溯
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 追溯链弹窗 */}
        {selectedStock && traceData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
                <div>
                  <h3 className="text-lg font-semibold text-white">库存追溯链</h3>
                  <p className="text-sm text-emerald-200">实例ID: {selectedStock.instanceId}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedStock(null);
                    setTraceData(null);
                  }}
                  className="text-white hover:bg-emerald-700 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-6">
                  {/* 上游来源 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      上游来源 ({traceData.upstream.length})
                    </h4>
                    {traceData.upstream.length === 0 ? (
                      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                        无上游来源（最原始记录）
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {traceData.upstream.map((item, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              {getStockTypeIcon(item.stockType)}
                              <span className="text-sm font-medium">{item.cropName}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <div>实例: {item.instanceId}</div>
                              <div>类型: {getStockTypeName(item.stockType)}</div>
                              <div>数量: {item.quantity}</div>
                              <div>入库: {new Date(item.inboundDate).toLocaleDateString('zh-CN')}</div>
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
                      下游去向 ({traceData.downstream.length})
                    </h4>
                    {traceData.downstream.length === 0 ? (
                      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                        无下游去向（尚未流转）
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {traceData.downstream.map((item, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              {getStockTypeIcon(item.stockType)}
                              <span className="text-sm font-medium">{item.businessType}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <div>业务: {item.businessId}</div>
                              <div>出库量: {item.outboundQuantity}</div>
                              <div>出库日期: {new Date(item.outboundDate).toLocaleDateString('zh-CN')}</div>
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
        )}
      </div>
    </div>
  );
}
