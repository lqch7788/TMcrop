/**
 * 作物品种详情组件
 */

import React from 'react';
import { CropVariety } from '../../../types/cropVariety';
import { Edit2, Leaf } from 'lucide-react';

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
                {variety.varietyName}
                {variety.subVariety1Name && (
                  <span className="text-emerald-600 ml-1">- {variety.subVariety1Name}</span>
                )}
              </h3>
              <p className="text-sm text-gray-500">
                {variety.categoryName} &gt; {variety.typeName} &gt; {variety.varietyName}
                {variety.subVariety1Name && ` > ${variety.subVariety1Name}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onEdit(variety)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
          >
            <Edit2 className="w-4 h-4" />
            编辑
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 border-b border-gray-100 pb-2">
              基本信息
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">作物编码</label>
                <p className="font-mono text-emerald-600 font-medium">{variety.cropCode}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">状态</label>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                  variety.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {variety.status === 'active' ? '启用' : '停用'}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">类别</label>
                <p className="text-gray-900">{variety.categoryName}</p>
                <p className="text-xs text-gray-400 font-mono">{variety.categoryCode}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">类型</label>
                <p className="text-gray-900">{variety.typeName}</p>
                <p className="text-xs text-gray-400 font-mono">{variety.typeCode}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">品种</label>
                <p className="text-gray-900">{variety.varietyName}</p>
                <p className="text-xs text-gray-400 font-mono">{variety.varietyCode}</p>
              </div>
              {variety.subVariety1Name && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">子品种</label>
                  <p className="text-gray-900">{variety.subVariety1Name}</p>
                  <p className="text-xs text-gray-400 font-mono">{variety.subVariety1Code}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">作物名称</label>
                <p className="text-gray-900">{variety.varietyName}</p>
              </div>
            </div>
          </div>

          {/* 别名 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 border-b border-gray-100 pb-2">
              别名
            </h4>
            <div className="flex flex-wrap gap-2">
              {variety.alias && variety.alias.length > 0 ? (
                variety.alias.map((alias, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {alias}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">暂无别名</span>
              )}
            </div>
          </div>

          {/* 种植信息 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 border-b border-gray-100 pb-2">
              种植信息
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">生长周期</label>
                <p className="text-gray-900">
                  {variety.growthCycle ? `${variety.growthCycle} 天` : '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">目标产量</label>
                <p className="text-gray-900">
                  {variety.targetYield
                    ? `${variety.targetYield} ${variety.yieldUnit || 'kg/亩'}`
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 border-b border-gray-100 pb-2">
              备注
            </h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-700 text-sm">
                {variety.remarks || '暂无备注'}
              </p>
            </div>
          </div>

          {/* 时间信息 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 border-b border-gray-100 pb-2">
              时间信息
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">创建时间</label>
                <p className="text-gray-700 text-sm">{variety.createTime || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs text-gray-500 mb-1">更新时间</label>
                <p className="text-gray-700 text-sm">{variety.updateTime || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
