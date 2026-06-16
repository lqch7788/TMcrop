/**
 * 种源详情弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { SeedSource } from '../../../../types/crop';
import TraceChain from '../../trace/TraceChain';
import { FlowLogTab } from '../../trace/FlowLogTab';
import { History } from 'lucide-react';
import { STOCK_STATUS_MAP, UNIT_MAP, SOURCE_TYPE_MAP } from '../../../../constants/cropConstants';
import { computeStockStatus } from '../../../../lib/stockStatus';
import { PropagationType, PropagationStatus } from '../../../../types/crop';

// 繁殖途径标签
const PROPAGATION_TYPE_LABELS: Record<string, string> = {
  external: '外购入库', breeding: '育种计划产出', seed_saving: '种植留种', asexual: '无性繁殖',
};
const PROPAGATION_STATUS_LABELS: Record<string, string> = {
  planned: '已计划', in_progress: '进行中', harvested: '已采收', quality_checked: '已质检', completed: '已入库', failed: '失败',
};

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

export function DetailModal({
  isOpen,
  onClose,
  record
}: DetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'trace' | 'flow'>('info');

  const formatUnit = (unit: string) => UNIT_MAP[unit] || unit || '';

  // 2026-06-04: status 改为实时计算，不再依赖 record.status
  const status = STOCK_STATUS_MAP[computeStockStatus(record.availableCount, record.initialCount)] || STOCK_STATUS_MAP['sufficient'];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="种源详情"
      size="xl"
      showFooter={true}
      onSubmit={() => onClose()}
      submitText="关闭"
      cancelText=""
    >
      {/* 标签页切换 */}
      <div className="flex border-b border-gray-200 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent ${
            activeTab === 'info'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          基本信息
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('trace')}
          className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent ${
            activeTab === 'trace'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          追溯链路
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('flow')}
          className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent flex items-center gap-1 ${
            activeTab === 'flow'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          流转记录
        </Button>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'info' ? (
      <div className="space-y-6">
        {/* 基本信息 */}
        {/* 基本信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种源批号：</span>
              <span className="text-sm font-mono text-blue-600">{record.seedCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物品种：</span>
              <span className="text-sm text-gray-900">{record.cropName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物类别：</span>
              <span className="text-sm text-gray-900">{record.cropCategory}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">品种：</span>
              <span className="text-sm text-gray-900">{record.cropVariety}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种源类型：</span>
              <span className="text-sm text-gray-900">{SOURCE_TYPE_MAP[record.sourceType] || record.sourceType}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">供应商：</span>
              <span className="text-sm text-gray-900">{record.supplierName}</span>
            </div>
          </div>
        </div>

        {/* 库存信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">库存信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">采购日期：</span>
              <span className="text-sm text-gray-900">{record.purchaseDate}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">采购数量：</span>
              <span className="text-sm text-gray-900">{record.quantity} {formatUnit(record.unit)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">单价：</span>
              <span className="text-sm text-gray-900">¥{record.unitPrice}/{formatUnit(record.unit)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">总金额：</span>
              <span className="text-sm text-gray-900">¥{record.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">初始数量：</span>
              <span className="text-sm text-gray-900">{record.initialCount.toLocaleString()} {formatUnit(record.unit)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">可用数量：</span>
              <span className="text-sm font-medium text-emerald-600">{record.availableCount.toLocaleString()} {formatUnit(record.unit)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">库存状态：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* 繁殖信息（非外购时显示） */}
        {record.propagationType && record.propagationType !== PropagationType.EXTERNAL && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">繁殖信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">入库方式：</span>
                <span className="text-sm font-medium text-orange-700">
                  {PROPAGATION_TYPE_LABELS[record.propagationType] || record.propagationType}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">当前阶段：</span>
                <span className="text-sm font-medium text-blue-700">
                  {PROPAGATION_STATUS_LABELS[record.propagationStatus || ''] || record.propagationStatus || '-'}
                </span>
              </div>
              {record.propagationMethod && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">具体方法：</span>
                  <span className="text-sm text-gray-900">{record.propagationMethod}</span>
                </div>
              )}
              {record.propagationStartDate && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">开始日期：</span>
                  <span className="text-sm text-gray-900">{record.propagationStartDate}</span>
                </div>
              )}
              {record.expectedHarvestDate && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">预计采收：</span>
                  <span className="text-sm text-gray-900">{record.expectedHarvestDate}</span>
                </div>
              )}
              {record.actualHarvestDate && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">实际采收：</span>
                  <span className="text-sm text-gray-900">{record.actualHarvestDate}</span>
                </div>
              )}
              {/* 亲本信息 */}
              {(record.parentMaleCode || record.parentFemaleCode) && (
                <div className="flex items-center col-span-2">
                  <span className="text-sm text-gray-500 w-24">亲本信息：</span>
                  <span className="text-sm text-gray-900">
                    {record.parentMaleCode && <span className="mr-3">♂{record.parentMaleCode}</span>}
                    {record.parentFemaleCode && <span>♀{record.parentFemaleCode}</span>}
                  </span>
                </div>
              )}
              {/* 母株信息 */}
              {record.motherPlantCode && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">母株编号：</span>
                  <span className="text-sm text-gray-900">{record.motherPlantCode}</span>
                </div>
              )}
              {/* 关联种植记录 */}
              {record.linkedPlantingCode && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">关联种植：</span>
                  <span className="text-sm text-gray-900">{record.linkedPlantingCode}</span>
                </div>
              )}
              {record.breedingLocation && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">育种地点：</span>
                  <span className="text-sm text-gray-900">{record.breedingLocation}</span>
                </div>
              )}
              {record.targetTraits && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">目标性状：</span>
                  <span className="text-sm text-gray-900">{record.targetTraits}</span>
                </div>
              )}
              {record.generation && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-24">世代：</span>
                  <span className="text-sm text-gray-900">{record.generation}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 其他信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建人：</span>
              <span className="text-sm text-gray-900">{record.createBy}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建时间：</span>
              <span className="text-sm text-gray-900">{record.createTime}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">更新时间：</span>
              <span className="text-sm text-gray-900">{record.updateTime}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">打印次数：</span>
              <span className="text-sm text-gray-900">{record.printCount} 次</span>
            </div>
            {record.remarks && (
              <div className="col-span-2 flex items-start">
                <span className="text-sm text-gray-500 w-24 flex-shrink-0">备注：</span>
                <span className="text-sm text-gray-900">{record.remarks}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : activeTab === 'trace' ? (
      /* 追溯链路标签页 */
      <div className="py-2">
        {record.instanceId ? (
          <TraceChain
            type="seed_source"
            businessId={record.instanceId}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无库存实例</p>
            <p className="text-xs mt-1">该种源尚未接入库存服务</p>
          </div>
        )}
      </div>
      ) : (
        /* 流转记录标签页（2026-06-16: 业务流水全链路表格 + 导出，不依赖库存实例） */
        <FlowLogTab code={record.seedCode} businessId={record.id} />
      )}
    </UnifiedModal>
  );
}
