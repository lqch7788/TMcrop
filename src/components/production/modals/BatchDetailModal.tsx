import { useState, useEffect } from 'react';
import { X, Link2, Leaf, Sprout, Grid3X3, Package } from 'lucide-react';
import { CropBatch } from '../../../types';
import { batchStatusColors, batchStatusLabels, stageProgress } from '../constants';
import { getProductionPlanRelations, ProductionPlanRelation } from '../../../services/productionPlanService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface BatchDetailModalProps {
  batch: CropBatch | null;
  onClose: () => void;
  onViewWorkOrders?: () => void;
}

export function BatchDetailModal({
  batch,
  onClose,
  onViewWorkOrders,
}: BatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'relations'>('info');
  const [relations, setRelations] = useState<ProductionPlanRelation[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  useEffect(() => {
    if (batch && activeTab === 'relations') {
      loadRelations();
    }
  }, [batch, activeTab]);

  const loadRelations = async () => {
    if (!batch) return;
    setLoadingRelations(true);
    try {
      // 使用 batchCode 作为 productionPlanCode
      const result = await getProductionPlanRelations(batch.id, batch.batchCode);
      setRelations(result.relations);
    } catch (error) {
      // logger.error('加载关联记录失败:', error);
      setRelations([]);
    } finally {
      setLoadingRelations(false);
    }
  };

  if (!batch) return null;

  const stages = [
    { key: 'seedling', label: '苗期' },
    { key: 'vegetative', label: '生长期' },
    { key: 'flowering', label: '开花期' },
    { key: 'fruiting', label: '结果期' },
    { key: 'harvest', label: '采收期' },
  ];

  // 获取关联类型的图标
  const getRelationTypeIcon = (type: string) => {
    switch (type) {
      case 'seed_source':
        return <Leaf className="w-4 h-4 text-amber-600" />;
      case 'seedling':
        return <Sprout className="w-4 h-4 text-green-600" />;
      case 'planting':
        return <Grid3X3 className="w-4 h-4 text-blue-600" />;
      case 'harvest':
        return <Package className="w-4 h-4 text-emerald-600" />;
      default:
        return <Link2 className="w-4 h-4 text-gray-600" />;
    }
  };

  // 获取关联类型名称
  const getRelationTypeName = (type: string) => {
    switch (type) {
      case 'seed_source': return '种源';
      case 'seedling': return '育苗';
      case 'planting': return '种植';
      case 'harvest': return '采收';
      default: return '其他';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* 绿色背景头部 */}
        <div className="px-6 py-4 bg-emerald-600 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">批次详情</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-emerald-500">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 标签页切换 */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'info'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              基本信息
            </button>
            <button
              onClick={() => setActiveTab('relations')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1 ${
                activeTab === 'relations'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Link2 className="w-4 h-4" />
              关联记录
            </button>
          </div>

          {activeTab === 'info' ? (
          <>
          {/* 3列布局，字段内容有浅灰色背景 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-600">批次编号</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.batchCode}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">种植模式</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.plantingMode}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">作物名称</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.cropName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">作物品种</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.variety}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">种植区域</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.greenhouseName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">种植面积</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.plantingArea} {batch.plantingAreaUnit || 'm²'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">开始时间</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.startDate}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">预计结束时间</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.expectedHarvestDate}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">负责人</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.responsiblePerson}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">目标产量</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.targetYield} {batch.unit || 'kg'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">当前状态</Label>
              <p className="mt-1">
                <span className={`inline-block px-3 py-2 rounded-lg text-sm font-medium ${batchStatusColors[batch.batchStatus || 'draft']}`}>
                  {batchStatusLabels[batch.batchStatus || 'draft']}
                </span>
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">发布人</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.publisher || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">初次发布时间</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.publishDate || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">最后修改时间</Label>
              <p className="text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">{batch.lastModifyDate || '-'}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3">生长进度</h4>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                style={{ width: `${stageProgress[batch.stage]}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {stages.map((stage) => (
                <span
                  key={stage.key}
                  className={`text-xs ${
                    batch.stage === stage.key ? 'text-emerald-600 font-medium' : 'text-gray-500'
                  }`}
                >
                  {stage.label}
                </span>
              ))}
            </div>
          </div>
          </>
          ) : (
          /* 关联记录标签页 */
          <div className="py-4">
            {loadingRelations ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                <span className="ml-3 text-gray-500">加载关联记录...</span>
              </div>
            ) : relations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Link2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无关联记录</p>
                <p className="text-xs mt-1">该生产计划尚未关联种源、育苗、种植或采收记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 统计汇总 */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-amber-700">种源</span>
                    </div>
                    <div className="text-xl font-bold text-amber-700 mt-1">
                      {relations.filter(r => r.type === 'seed_source').length}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-700">育苗</span>
                    </div>
                    <div className="text-xl font-bold text-green-700 mt-1">
                      {relations.filter(r => r.type === 'seedling').length}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-blue-700">种植</span>
                    </div>
                    <div className="text-xl font-bold text-blue-700 mt-1">
                      {relations.filter(r => r.type === 'planting').length}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs text-emerald-700">采收</span>
                    </div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">
                      {relations.filter(r => r.type === 'harvest').length}
                    </div>
                  </div>
                </div>

                {/* 关联记录列表 */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {relations.map((relation, index) => (
                    <div
                      key={`${relation.type}-${relation.businessId}-${index}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100"
                    >
                      {getRelationTypeIcon(relation.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {getRelationTypeName(relation.type)}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            {relation.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <span>编号: {relation.businessCode}</span>
                          <span className="mx-2">|</span>
                          <span>数量: {relation.quantity} {relation.unit}</span>
                          <span className="mx-2">|</span>
                          <span>日期: {new Date(relation.relatedDate).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      {relation.instanceId && (
                        <span className="text-xs text-emerald-600 font-mono bg-emerald-50 px-2 py-1 rounded">
                          {relation.instanceId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          {onViewWorkOrders && (
            <Button onClick={onViewWorkOrders}>
              查看工单
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
