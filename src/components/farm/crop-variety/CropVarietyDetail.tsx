/**
 * 作物品种详情组件
 */

import React from 'react';
import { CropVariety } from '../../../types/cropVariety';
import { Edit2, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface CropVarietyDetailProps {
  variety: CropVariety | null;
  onEdit: (variety: CropVariety) => void;
}

export function CropVarietyDetail({ variety, onEdit }: CropVarietyDetailProps) {
  if (!variety) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Leaf className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>请从左侧列表选择一个品种</p>
          <p className="text-sm mt-1">查看品种详细信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {variety.detailVarietyName || variety.subVariety1Name || variety.varietyName}
              </h3>
              <p className="text-sm text-gray-500">
                {variety.categoryName} &gt; {variety.typeName} &gt; {variety.varietyName}
                {variety.subVariety1Name && ` > ${variety.subVariety1Name}`}
                {variety.detailVarietyName && ` > ${variety.detailVarietyName}`}
              </p>
            </div>
          </div>
          <Button
            variant="blue"
            size="sm"
            onClick={() => onEdit(variety)}
          >
            <Edit2 className="w-4 h-4" />
            编辑
          </Button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* 编码信息 - 绿色主题 */}
          <div>
            <h4 className="text-sm font-bold text-emerald-700 mb-3 border-b-2 border-emerald-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              编码信息
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <Label className="text-xs text-emerald-600">作物编码</Label>
                <p className="font-mono text-emerald-700 font-bold text-lg">{variety.cropCode}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <Label className="text-xs text-emerald-600">状态</Label>
                <span className={`inline-flex px-3 py-1 rounded text-sm font-bold ${
                  variety.status === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-400 text-white'
                }`}>
                  {variety.status === 'active' ? '启用' : '停用'}
                </span>
              </div>
            </div>
          </div>

          {/* 分类信息 - 蓝色主题 */}
          <div>
            <h4 className="text-sm font-bold text-blue-700 mb-3 border-b-2 border-blue-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              分类信息
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <Label className="text-xs text-blue-600">类别</Label>
                <p className="text-blue-900 font-medium">
                  <span className="font-mono text-blue-500 mr-2">{variety.categoryCode}</span>
                  {variety.categoryName}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <Label className="text-xs text-blue-600">类型</Label>
                <p className="text-blue-900 font-medium">
                  <span className="font-mono text-blue-500 mr-2">{variety.typeCode}</span>
                  {variety.typeName}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <Label className="text-xs text-blue-600">品种</Label>
                <p className="text-blue-900 font-medium">
                  <span className="font-mono text-blue-500 mr-2">{variety.varietyCode}</span>
                  {variety.varietyName}
                </p>
              </div>
              {variety.subVariety1Name && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <Label className="text-xs text-blue-600">子品种</Label>
                  <p className="text-blue-900 font-medium">
                    <span className="font-mono text-blue-500 mr-2">{variety.subVariety1Code}</span>
                    {variety.subVariety1Name}
                  </p>
                </div>
              )}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <Label className="text-xs text-blue-600">作物品种</Label>
                <p className="text-blue-900 font-bold text-lg">
                  {variety.detailVarietyName || variety.subVariety1Name || variety.varietyName}
                </p>
              </div>
            </div>
          </div>

          {/* 别名 - 紫色主题 */}
          <div>
            <h4 className="text-sm font-bold text-purple-700 mb-3 border-b-2 border-purple-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              别名
            </h4>
            <div className="flex flex-wrap gap-2">
              {variety.alias && variety.alias.length > 0 ? (
                variety.alias.map((alias, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
                  >
                    {alias}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm bg-gray-100 px-3 py-1 rounded-full">暂无别名</span>
              )}
            </div>
          </div>

          {/* 图片与特性描述 - 橙色主题 */}
          <div>
            <h4 className="text-sm font-bold text-orange-700 mb-3 border-b-2 border-orange-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              图片与特性
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {variety.image && (
                <div className="bg-white rounded-lg p-3 border-2 border-orange-300">
                  <Label className="text-xs text-orange-600">作物图片</Label>
                  <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-50 border border-orange-200">
                    <img src={variety.image} alt="作物图片" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
              <div className={`bg-white rounded-lg p-3 border-2 border-orange-300 ${!variety.image ? 'col-span-2' : ''}`}>
                <Label className="text-xs text-orange-600">特性描述</Label>
                <p className="text-orange-900 whitespace-pre-wrap">
                  {variety.description || '暂无特性描述'}
                </p>
              </div>
            </div>
          </div>

          {/* 作物生长周期 - 绿色主题 */}
          <div>
            <h4 className="text-sm font-bold text-emerald-700 mb-3 border-b-2 border-emerald-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              作物生长周期
            </h4>
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                <Label className="text-xs text-emerald-600">发芽期</Label>
                <p className="text-emerald-900 font-bold text-lg">
                  {variety.germinationPeriod ? `${variety.germinationPeriod}天` : '-'}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                <Label className="text-xs text-emerald-600">育苗期</Label>
                <p className="text-emerald-900 font-bold text-lg">
                  {variety.seedlingPeriod ? `${variety.seedlingPeriod}天` : '-'}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                <Label className="text-xs text-emerald-600">开花期</Label>
                <p className="text-emerald-900 font-bold text-lg">
                  {variety.floweringPeriod ? `${variety.floweringPeriod}天` : '-'}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                <Label className="text-xs text-emerald-600">结果期</Label>
                <p className="text-emerald-900 font-bold text-lg">
                  {variety.fruitingPeriod ? `${variety.fruitingPeriod}天` : '-'}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                <Label className="text-xs text-emerald-600">摘收期</Label>
                <p className="text-emerald-900 font-bold text-lg">
                  {variety.harvestPeriod ? `${variety.harvestPeriod}天` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* 备注 - 灰色主题 */}
          <div>
            <h4 className="text-sm font-bold text-gray-600 mb-3 border-b-2 border-gray-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              备注
            </h4>
            <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-700 text-sm">
                {variety.remarks || '暂无备注'}
              </p>
            </div>
          </div>

          {/* 作物适宜环境参数 - 青色主题 */}
          <div>
            <h4 className="text-sm font-bold text-cyan-700 mb-3 border-b-2 border-cyan-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
              作物适宜环境参数
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">空气温度(℃)</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.airTemperature != null ? `${variety.airTemperature}` : '-'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">空气湿度(%)</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.airHumidity != null ? `${variety.airHumidity}` : '-'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">CO₂含量(ppm)</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.co2Content != null ? `${variety.co2Content}` : '-'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">光照度(lx)</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.lightIntensity != null ? `${variety.lightIntensity}` : '-'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">土壤温度(℃)</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.soilTemperature != null ? `${variety.soilTemperature}` : '-'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">土壤湿度(%)</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.soilHumidity != null ? `${variety.soilHumidity}` : '-'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">土壤PH值</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.soilPh != null ? `${variety.soilPh}` : '-'}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center">
                <Label className="text-xs text-cyan-600">土壤EC值</Label>
                <p className="text-cyan-900 font-bold text-lg">
                  {variety.soilEc != null ? `${variety.soilEc}` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* 时间信息 - 蓝灰色主题 */}
          <div>
            <h4 className="text-sm font-bold text-slate-600 mb-3 border-b-2 border-slate-200 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
              时间信息
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                <Label className="text-xs text-slate-600">创建时间</Label>
                <p className="text-slate-700 font-medium">{variety.createTime || '-'}</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                <Label className="text-xs text-slate-600">更新时间</Label>
                <p className="text-slate-700 font-medium">{variety.updateTime || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
