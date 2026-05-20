/**
 * 作物实例追溯主页面
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Eye, Package, Calendar, MapPin, ArrowRight, CheckCircle, Barcode } from 'lucide-react';
import * as cropInstanceService from '@/services/apiCropInstanceService';
import { CropInstance, CropInstanceStatus, SourceOrigin, CropTraceChain } from '@/types/crop';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CROP_INSTANCE_STATUS_MAP, SOURCE_ORIGIN_MAP } from '@/constants/cropConstants';
import { Input } from '../../ui/input';

export default function InstancePage() {
  const [searchCode, setSearchCode] = useState('');
  const [selectedInstance, setSelectedInstance] = useState<CropInstance | null>(null);
  const [traceChain, setTraceChain] = useState<CropTraceChain | null>(null);

  // 作物实例数据（从API加载）
  const [instances, setInstances] = useState<CropInstance[]>([]);

  // 加载实例数据
  useEffect(() => {
    const loadInstances = async () => {
      const data = await cropInstanceService.getInstances();
      setInstances(data);
    };
    loadInstances();
  }, []);

  // 筛选数据
  const filteredInstances = useMemo(() => {
    if (!searchCode) return instances.slice(0, 50); // 默认显示前50条
    return instances.filter(inst =>
      inst.instanceCode.toLowerCase().includes(searchCode.toLowerCase()) ||
      inst.cropName.includes(searchCode) ||
      inst.cropVariety.includes(searchCode)
    ).slice(0, 50);
  }, [instances, searchCode]);

  // 查询溯源链
  const handleQuery = useCallback(async (instance: CropInstance) => {
    setSelectedInstance(instance);
    const chain = await cropInstanceService.getTraceChain(instance.id);
    setTraceChain(chain);
  }, []);

  // TODO: status badges 颜色与共享常量 CROP_INSTANCE_STATUS_MAP 不同（purple vs indigo），暂保留本地定义
  const getStatusBadge = (status: CropInstanceStatus) => {
    switch (status) {
      case 'seedling':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">育苗中</span>;
      case 'planted':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">已定植</span>;
      case 'growing':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">生长期</span>;
      case 'harvested':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">已采收</span>;
      case 'outbound':
        return <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">已出库</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已取消</span>;
      default:
        return null;
    }
  };

  // 获取来源类型标签（使用共享常量 SOURCE_ORIGIN_MAP）
  const getSourceBadge = (source: SourceOrigin) => {
    return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{SOURCE_ORIGIN_MAP[source] || source}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      {/* 标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Barcode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">作物实例追溯</h1>
            <p className="text-gray-500">追溯作物全生命周期和供应链信息</p>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-gray-700">
              搜索实例编码/作物品种
            </Label>
            <Input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="请输入实例编码、作物品种或品种"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <Button variant="default" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              查询
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 左侧：实例列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-700">作物实例列表</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredInstances.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                暂无数据
              </div>
            ) : (
              filteredInstances.map((inst) => (
                <div
                  key={inst.id}
                  className={`px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors ${
                    selectedInstance?.id === inst.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                  }`}
                  onClick={() => handleQuery(inst)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono font-medium text-emerald-600">
                      {inst.instanceCode}
                    </span>
                    {getStatusBadge(inst.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{inst.cropName}</span>
                    <span>-</span>
                    <span>{inst.cropVariety}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span>{inst.initialQuantity} {inst.unit || '株'}</span>
                    {inst.orderCode && (
                      <>
                        <span>-</span>
                        <span>订单: {inst.orderCode}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧：溯源详情 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-700">溯源详情</h3>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {!selectedInstance ? (
              <div className="text-center text-gray-500 py-8">
                请从左侧选择一个实例查看溯源详情
              </div>
            ) : (
              <div className="space-y-4">
                {/* 实例基本信息 */}
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    实例信息
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">实例编码</p>
                      <p className="font-mono font-medium text-emerald-600">{selectedInstance.instanceCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">状态</p>
                      <p>{getStatusBadge(selectedInstance.status)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">作物品种</p>
                      <p className="font-medium">{selectedInstance.cropName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">作物品种</p>
                      <p className="font-medium">{selectedInstance.cropVariety}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">来源类型</p>
                      <p>{getSourceBadge(selectedInstance.sourceOrigin)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">初始数量</p>
                      <p className="font-medium">{selectedInstance.initialQuantity}</p>
                    </div>
                  </div>
                  {selectedInstance.sourceDescription && (
                    <div className="mt-3 text-sm">
                      <p className="text-xs text-gray-500">来源描述</p>
                      <p className="text-gray-700">{selectedInstance.sourceDescription}</p>
                    </div>
                  )}
                </div>

                {/* 时间节点 */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    时间节点
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedInstance.seedEntryDate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-gray-600">种源入库：</span>
                        <span className="text-gray-900">{selectedInstance.seedEntryDate}</span>
                      </div>
                    )}
                    {selectedInstance.seedlingStartDate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-gray-600">育苗开始：</span>
                        <span className="text-gray-900">{selectedInstance.seedlingStartDate}</span>
                      </div>
                    )}
                    {selectedInstance.plantingDate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-gray-600">定植日期：</span>
                        <span className="text-gray-900">{selectedInstance.plantingDate}</span>
                      </div>
                    )}
                    {selectedInstance.harvestDate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-gray-600">首次采收：</span>
                        <span className="text-gray-900">{selectedInstance.harvestDate}</span>
                      </div>
                    )}
                    {selectedInstance.outboundDate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-gray-600">出库日期：</span>
                        <span className="text-gray-900">{selectedInstance.outboundDate}</span>
                      </div>
                    )}
                    {!selectedInstance.seedEntryDate && !selectedInstance.seedlingStartDate &&
                     !selectedInstance.plantingDate && !selectedInstance.harvestDate && !selectedInstance.outboundDate && (
                      <p className="text-gray-500 text-xs">暂无时间记录</p>
                    )}
                  </div>
                </div>

                {/* 数量追踪 */}
                <div className="bg-amber-50 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    数量追踪
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">初始数量</span>
                      <span className="font-medium">{selectedInstance.initialQuantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">当前剩余</span>
                      <span className="font-medium">{selectedInstance.currentQuantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">已定植</span>
                      <span className="font-medium">{selectedInstance.plantedQuantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">已采收</span>
                      <span className="font-medium">{selectedInstance.harvestedQuantity}</span>
                    </div>
                  </div>
                </div>

                {/* 关联订单 */}
                {selectedInstance.orderCode && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-purple-700 mb-3">关联订单</h4>
                    <div className="text-sm">
                      <p className="text-gray-600">订单编号：</p>
                      <p className="font-medium text-purple-600">{selectedInstance.orderCode}</p>
                    </div>
                  </div>
                )}

                {/* 关联记录 */}
                {traceChain && (
                  <div className="space-y-3">
                    {traceChain.seedSources && traceChain.seedSources.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">关联种源（{traceChain.seedSources.length}条）</p>
                        {traceChain.seedSources.map(s => (
                          <p key={s.id} className="text-sm font-medium text-gray-900">{s.seedCode}</p>
                        ))}
                      </div>
                    )}
                    {traceChain.seedlings && traceChain.seedlings.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">关联育苗</p>
                        {traceChain.seedlings.map(s => (
                          <p key={s.id} className="text-sm font-medium text-gray-900">{s.seedlingCode}</p>
                        ))}
                      </div>
                    )}
                    {traceChain.plantings && traceChain.plantings.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">关联种植</p>
                        {traceChain.plantings.map(p => (
                          <p key={p.id} className="text-sm font-medium text-gray-900">{p.plantCode}</p>
                        ))}
                      </div>
                    )}
                    {traceChain.harvests && traceChain.harvests.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">关联采收</p>
                        {traceChain.harvests.map(h => (
                          <p key={h.id} className="text-sm font-medium text-gray-900">{h.harvestCode}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
