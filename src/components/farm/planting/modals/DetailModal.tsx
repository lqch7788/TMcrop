/**
 * 种植详情弹窗
 * 2026-06-16: 加"流转记录"Tab（material_flow_log 业务流水全链路）
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Planting, PlantingStatus } from '../../../../types/crop';
import { PLANTING_STATUS_MAP } from '../../../../constants/cropConstants';
import { X, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { FlowLogTab } from '../../trace/FlowLogTab';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Planting;
}

export function DetailModal({
  isOpen,
  onClose,
  record
}: DetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'flow'>('info');

  // TODO: 颜色值与共享常量 PLANTING_STATUS_MAP 不同（amber/green vs emerald/purple），暂保留本地定义
  const statusMap = {
    [PlantingStatus.PLANTED]: { label: '已定植', color: 'text-blue-600 bg-blue-50' },
    [PlantingStatus.GROWING]: { label: '生长期', color: 'text-amber-600 bg-amber-50' },
    [PlantingStatus.HARVESTED]: { label: '已采收', color: 'text-green-600 bg-green-50' },
    [PlantingStatus.CANCELLED]: { label: '已取消', color: 'text-gray-600 bg-gray-50' }
  };

  const status = statusMap[record.status] || statusMap[PlantingStatus.GROWING];

  // 确保 images 是数组，如果是字符串则解析
  const images = (() => {
    if (Array.isArray(record.pictures)) return record.pictures;
    if (typeof record.pictures === 'string') {
      try { return JSON.parse(record.pictures); } catch { return []; }
    }
    return [];
  })();

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeImageViewer = () => {
    setSelectedImageIndex(null);
  };

  const goToPreviousImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const goToNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="种植详情"
      size="xl"
      showFooter={true}
      onSubmit={() => onClose()}
      submitText="关闭"
      cancelText=""
    >
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('info')}
          className={`border-b-2 -mb-px rounded-none flex items-center gap-1 ${
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
          onClick={() => setActiveTab('flow')}
          className={`border-b-2 -mb-px rounded-none flex items-center gap-1 ${
            activeTab === 'flow'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          流转记录
        </Button>
      </div>

      {activeTab === 'info' ? (
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种植批号：</span>
              <span className="text-sm font-mono text-blue-600">{record.plantCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物品种：</span>
              <span className="text-sm text-gray-900">{record.cropName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">品种：</span>
              <span className="text-sm text-gray-900">{record.cropVariety}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">来源类型：</span>
              <span className="text-sm text-gray-900">{record.sourceType === 'seed' ? '种子' : '种苗'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">关联批号：</span>
              <span className="text-sm text-gray-900">{record.sourceCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">区域：</span>
              <span className="text-sm text-gray-900">{record.areaName}</span>
            </div>
          </div>
        </div>

        {/* 种植信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">种植信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种植日期：</span>
              <span className="text-sm text-gray-900">{record.plantingDate}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种植数量：</span>
              <span className="text-sm text-emerald-600 font-medium">{record.plantingCount.toLocaleString()}</span>
            </div>
            {record.soilPH && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">土壤PH值：</span>
                <span className="text-sm text-gray-900">{record.soilPH}</span>
              </div>
            )}
            {record.soilEC && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">土壤EC值：</span>
                <span className="text-sm text-gray-900">{record.soilEC}</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">损耗率：</span>
              <span className="text-sm text-red-600">{record.attritionRate}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">状态：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* 采收信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">采收信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">是否采收：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${record.isHarvest ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                {record.isHarvest ? '已采收' : '未采收'}
              </span>
            </div>
            {record.harvestDate && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">采收日期：</span>
                <span className="text-sm text-gray-900">{record.harvestDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2026-06-24: 育种 / 留种信息（种源管理吸收功能）— 仅当标记时显示 */}
        {(record.isBreeding || record.isSeedSaving) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200 flex items-center gap-2">
              育种 / 留种信息
              {record.isBreeding && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">🌱 育种实验</span>
              )}
              {record.isSeedSaving && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">🌾 种植留种</span>
              )}
            </h4>

            {/* 育种实验子区 */}
            {record.isBreeding && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-xs font-semibold text-emerald-800 mb-2">🌱 育种实验设置</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-24">父本编码：</span>
                    <span className="text-sm font-mono text-gray-900">{record.parentMaleCode || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-24">母本编码：</span>
                    <span className="text-sm font-mono text-gray-900">{record.parentFemaleCode || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-24">世代：</span>
                    <span className="text-sm font-mono text-emerald-700 font-medium">{record.generation || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-24">育种方法：</span>
                    <span className="text-sm text-gray-900">{record.breedingMethod || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-24">育种地点：</span>
                    <span className="text-sm text-gray-900">{record.breedingLocation || '-'}</span>
                  </div>
                  {record.targetTraits && (
                    <div className="col-span-2 flex items-start">
                      <span className="text-sm text-gray-500 w-24 flex-shrink-0">目标性状：</span>
                      <span className="text-sm text-gray-900 whitespace-pre-line">{record.targetTraits}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ 标记为育种实验后，行级采收入库的种子将进入作物库存供后续调拨入种源管理。
                </p>
              </div>
            )}

            {/* 留种子区 */}
            {record.isSeedSaving && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-xs font-semibold text-amber-800 mb-2">🌾 种植留种设置</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-24">留种株号：</span>
                    <span className="text-sm font-mono text-amber-700 font-medium">{record.seedPlantMarker || '-'}</span>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ 标记为留种后，行级采收入库弹窗的「库存类型」默认选「种源」。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 其他信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">溯源码：</span>
              <span className="text-sm font-mono text-gray-900">{record.traceabilityCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建人：</span>
              <span className="text-sm text-gray-900">{record.createBy}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建时间：</span>
              <span className="text-sm text-gray-900">{record.createTime}</span>
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

        {/* 图片信息 */}
        {images.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">图片信息</h4>
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, index) => (
                <div
                  key={index}
                  onClick={() => openImageViewer(index)}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 border border-gray-200"
                >
                  <img
                    src={img}
                    alt={`图片${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      ) : (
        /* 流转记录 Tab */
        <FlowLogTab code={record.plantCode} businessId={record.id} />
      )}

      {/* 图片放大查看器 */}
      {selectedImageIndex !== null && images.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={closeImageViewer}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full z-10"
          >
            <X className="w-8 h-8" />
          </Button>

          {/* 上一张 */}
          {selectedImageIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousImage}
              className="absolute left-4 text-white hover:bg-white/20 rounded-full z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          {/* 图片 */}
          <img
            src={images[selectedImageIndex]}
            alt={`图片${selectedImageIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />

          {/* 下一张 */}
          {selectedImageIndex < images.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextImage}
              className="absolute right-4 text-white hover:bg-white/20 rounded-full z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          {/* 图片计数 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {selectedImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}
