/**
 * 追溯链展示组件 V3.0
 * 用于展示库存实例的完整生命周期追溯
 */

import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Package, Leaf, Sprout, Grid3X3, History, ExternalLink } from 'lucide-react';
import {
  traceSeedSource,
  traceSeedling,
  traceHarvest,
} from '../../../services/inventoryIntegration';
import { StockType, BusinessType } from '../../../types/inventory';

interface TraceNode {
  instanceId: string;
  stockType: StockType;
  businessType: BusinessType;
  businessId: string;
  businessCode?: string;
  cropName: string;
  varietyName?: string;
  quantity: number;
  inboundDate: string;
  status?: string;
  children?: TraceNode[];
}

interface TraceChainProps {
  type: 'seed_source' | 'seedling' | 'harvest';
  businessId: string;
  onNavigate?: (type: string, id: string) => void;
}

export const TraceChain: React.FC<TraceChainProps> = ({ type, businessId, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [upstream, setUpstream] = useState<TraceNode[]>([]);
  const [downstream, setDownstream] = useState<TraceNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTraceData();
  }, [type, businessId]);

  const loadTraceData = async () => {
    setLoading(true);
    try {
      let result;
      switch (type) {
        case 'seed_source':
          result = await traceSeedSource(businessId);
          break;
        case 'seedling':
          result = await traceSeedling(businessId);
          break;
        case 'harvest':
          result = await traceHarvest(businessId);
          break;
        default:
          result = { upstream: [], downstream: [] };
      }

      setUpstream(result.upstream || []);
      setDownstream(result.downstream || []);
    } catch (error) {
      console.error('加载追溯链失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getStockTypeIcon = (stockType: StockType) => {
    switch (stockType) {
      case StockType.SEED:
        return <Leaf className="w-4 h-4 text-amber-600" />;
      case StockType.SEEDLING:
        return <Sprout className="w-4 h-4 text-green-600" />;
      case StockType.PRODUCT:
        return <Package className="w-4 h-4 text-emerald-600" />;
      default:
        return <Grid3X3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStockTypeName = (stockType: StockType) => {
    switch (stockType) {
      case StockType.SEED:
        return '种源';
      case StockType.SEEDLING:
        return '育苗';
      case StockType.PRODUCT:
        return '成品';
      default:
        return '未知';
    }
  };

  const getBusinessTypeName = (businessType: BusinessType) => {
    switch (businessType) {
      case BusinessType.SEED_SOURCE:
        return '种源管理';
      case BusinessType.SEEDLING:
        return '育苗管理';
      case BusinessType.PLANTING:
        return '种植管理';
      case BusinessType.HARVEST:
        return '采收入库';
      case BusinessType.PURCHASE:
        return '采购入库';
      default:
        return '其他';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const renderNode = (node: TraceNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.instanceId);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.instanceId} className="relative">
        {/* 连接线 */}
        {level > 0 && (
          <div
            className="absolute border-l-2 border-gray-300 -left-4 top-0 bottom-0"
            style={{ height: '100%' }}
          />
        )}

        {/* 节点内容 */}
        <div
          className={`flex items-center gap-2 p-2 rounded-lg mb-1 transition-colors ${
            level === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          style={{ marginLeft: level * 24 }}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.instanceId)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* 图标 */}
          {getStockTypeIcon(node.stockType)}

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900 truncate">
                {node.cropName}
              </span>
              {node.varietyName && (
                <span className="text-xs text-gray-500 truncate">
                  {node.varietyName}
                </span>
              )}
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                {getStockTypeName(node.stockType)}
              </span>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                {getBusinessTypeName(node.businessType)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
              <span>批次: {node.businessCode || node.businessId}</span>
              <span>数量: {node.quantity}</span>
              <span>入库: {formatDate(node.inboundDate)}</span>
            </div>
          </div>

          {/* 操作 */}
          {onNavigate && (
            <button
              onClick={() => onNavigate(node.businessType, node.businessId)}
              className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
              title="查看详情"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <span className="ml-3 text-gray-500">加载追溯链...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 上游追溯 */}
      {upstream.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-700">上游来源</h4>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {upstream.length} 条
            </span>
          </div>
          <div className="space-y-1">
            {upstream.map(node => renderNode(node))}
          </div>
        </div>
      )}

      {/* 当前节点 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-gray-700">当前节点</h4>
        </div>
        <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-lg">
          <div className="text-sm text-emerald-800">
            当前记录为追溯链的一部分，请查看上方来源了解完整流程
          </div>
        </div>
      </div>

      {/* 下游追溯 */}
      {downstream.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ChevronRight className="w-5 h-5 text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-700">下游去向</h4>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {downstream.length} 条
            </span>
          </div>
          <div className="space-y-1">
            {downstream.map(node => renderNode(node))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {upstream.length === 0 && downstream.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>暂无追溯数据</p>
          <p className="text-xs mt-1">该记录尚未关联库存服务</p>
        </div>
      )}
    </div>
  );
};

export default TraceChain;
