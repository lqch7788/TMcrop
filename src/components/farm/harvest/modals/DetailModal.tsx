/**
 * 采收入库详情弹窗组件
 */

import React, { useState } from 'react';
import { X, History } from 'lucide-react';
import { Button } from '@/components/ui';
import TraceChain from '../../trace/TraceChain';
import { QUALITY_GRADE_MAP, parseHarvesterNames } from '../../../../constants/cropConstants';

interface HarvestRecord {
  id: number;
  harvestCode: string;
  batchCode: string;
  cropName: string;
  greenhouseId: string;
  greenhouseName: string;
  harvestDate: string;
  harvestQuantity: number;
  unit: string;
  grade: string;
  warehouseId: string;
  warehouseName: string;
  harvesterIds: string[];
  harvesterNames: string[];
  status: string;
  remarks: string;
  auditor: string;
  variety: string;
  plantingMode: string;
  targetYield: number;
  instanceId?: string;
}

interface HarvestDetailModalProps {
  isOpen: boolean;
  record: HarvestRecord | null;
  onClose: () => void;
}

export function HarvestDetailModal({ isOpen, record, onClose }: HarvestDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'trace'>('info');

  if (!isOpen || !record) return null;

  // 品质等级徽章（使用共享常量 QUALITY_GRADE_MAP）
  const getGradeBadge = (grade: string) => {
    const info = QUALITY_GRADE_MAP[grade];
    if (!info) return null;
    return <span className={`px-2.5 py-0.5 ${info.bg} ${info.text} text-xs rounded-full font-bold shadow-sm`}>{info.label}</span>;
  };

  // TODO: status badges 颜色与共享常量 HARVEST_STATUS_MAP 不同（blue vs emerald），暂保留本地定义
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'harvested': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">已采收</span>;
      case 'graded': return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">已分级</span>;
      case 'stored': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">已入库</span>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">采收入库详情</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-emerald-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 标签页切换 */}
        <div className="flex border-b border-gray-200 px-6 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1 ${
              activeTab === 'trace'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            追溯链路
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'info' ? (
          <div>
          {/* 基本信息卡片 */}
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-emerald-600 block font-medium">采收单号</span>
                <span className="text-lg font-mono font-bold text-emerald-700">{record.harvestCode}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">采收时间</span>
                <span className="text-sm font-medium text-gray-900">{record.harvestDate?.replace('T', ' ') || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">品质等级</span>
                <span className="text-sm font-medium">{getGradeBadge(record.grade)}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">状态</span>
                <span className="text-sm font-medium">{getStatusBadge(record.status)}</span>
              </div>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左列 */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">批次与作物信息</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">作物品种</span>
                    <span className="text-sm text-gray-900">{record.cropName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">作物品种</span>
                    <span className="text-sm text-gray-900">{record.variety}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">生产计划批次号</span>
                    <span className="text-sm text-gray-900 font-mono">{record.batchCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">种植模式</span>
                    <span className="text-sm text-gray-900">{record.plantingMode}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">采收信息</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">采收区域</span>
                    <span className="text-sm text-gray-900">{record.greenhouseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">采收量</span>
                    <span className="text-sm text-gray-900 font-medium">{record.harvestQuantity} {record.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">目标产量</span>
                    <span className="text-sm text-gray-900">{record.targetYield} {record.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">完成率</span>
                    <span className="text-sm text-gray-900 font-medium">{Math.round(record.harvestQuantity / record.targetYield * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右列 */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">入库信息</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">入库仓库</span>
                    <span className="text-sm text-gray-900">{record.warehouseName}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">人员信息</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">采收人员</span>
                    <span className="text-sm text-gray-900">{parseHarvesterNames(record.harvesterNames).join(', ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">审核人员</span>
                    <span className="text-sm text-gray-900">{record.auditor}</span>
                  </div>
                </div>
              </div>

              {record.remarks && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">备注</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-900">{record.remarks}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
          ) : (
          /* 追溯链路标签页 */
          <div className="py-2">
            {record.instanceId ? (
              <TraceChain
                type="harvest"
                businessId={record.instanceId}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无库存实例</p>
                <p className="text-xs mt-1">该采收记录尚未接入库存服务</p>
              </div>
            )}
          </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" /> 关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
