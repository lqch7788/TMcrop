/**
 * 大棚分区详情弹窗 — 8 环境参数卡 + 6 时序趋势图 + 作物信息 + 4 张图
 */
import React from 'react';
import { X, Image as ImageIcon, Sprout, Calendar, MapPin, Layers } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { ZoneInfo, detailEnvParams, generateTrendData, DetailEnvParam } from './mockData';

interface GreenhouseDetailModalProps {
  zone: ZoneInfo | null;
  onClose: () => void;
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-100', text: 'text-green-700', label: '正常' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '预警' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: '异常' },
};

const GreenhouseDetailModal: React.FC<GreenhouseDetailModalProps> = ({ zone, onClose }) => {
  if (!zone) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 蓝色标题栏 */}
        <div className="bg-blue-500 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">{zone.name}详情</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区（左右两栏） */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-4 p-6">
            {/* 左栏：作物信息 + 4 张图 */}
            <div className="col-span-4 space-y-4">
              {/* 作物信息卡 */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  作物信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 flex items-center gap-1"><Layers className="w-3 h-3" />区域面积</span>
                    <span className="font-medium text-gray-800">{zone.area}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">种植作物</span>
                    <span className="font-medium text-gray-800">{zone.cropName}{zone.variety && `(${zone.variety})`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">生长周期</span>
                    <span className="font-medium text-gray-800">{zone.stage}</span>
                  </div>
                  {zone.plantDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />种植时间</span>
                      <span className="font-medium text-gray-800">{zone.plantDate}{zone.dayCount !== undefined && ` (${zone.dayCount}天)`}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 张图（全景 + 品种 + 花/叶/果） */}
              <div className="grid grid-cols-2 gap-2">
                {/* 全景图 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-2 py-1 text-xs text-gray-600 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> 全景图
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                {/* 品种图 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-2 py-1 text-xs text-gray-600 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> 品种图
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-emerald-300" />
                  </div>
                </div>
                {/* 花 / 叶 / 果 - 简化展示为单卡 */}
                <div className="col-span-2 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-2 py-1 text-xs text-gray-600 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> 作物分时图（花/叶/果）
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1">
                    {['花', '叶', '果'].map(label => (
                      <div key={label} className="aspect-square bg-gradient-to-br from-emerald-50 to-green-100 rounded flex flex-col items-center justify-center text-xs text-emerald-600">
                        <ImageIcon className="w-6 h-6 mb-1 text-emerald-400" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 右栏：8 环境参数 + 6 趋势图 */}
            <div className="col-span-8 space-y-4">
              {/* 8 个环境参数卡（2x4 网格） */}
              <div className="grid grid-cols-4 gap-3">
                {detailEnvParams.map(p => {
                  const badge = statusBadge[p.status];
                  return (
                    <div key={p.type} className="border border-slate-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">{p.label}</div>
                      <div className={`text-xl font-bold ${p.status === 'normal' ? 'text-blue-600' : p.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {p.value}<span className="text-xs font-normal text-gray-500 ml-1">{p.unit}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{p.min} ~ {p.max}</div>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 6 张时序趋势图（2x3 网格） */}
              <div className="grid grid-cols-3 gap-3">
                {detailEnvParams.slice(0, 6).map(p => {
                  const trendData = generateTrendData(p.value, p.min, p.max);
                  return (
                    <div key={`${p.type}-trend`} className="border border-slate-200 rounded-lg p-2">
                      <div className="text-xs text-gray-700 font-medium mb-1">{p.label}</div>
                      <div className="h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`grad-${p.type}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={p.status === 'normal' ? '#00d8e8' : '#e80000'} stopOpacity={0.6} />
                                <stop offset="100%" stopColor={p.status === 'normal' ? '#00d8e8' : '#e80000'} stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                            <Tooltip
                              contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
                              formatter={(value: any) => [`${value} ${p.unit}`, p.label]}
                            />
                            {/* 阈值区间背景 */}
                            <ReferenceArea
                              y1={p.min}
                              y2={p.max}
                              fill={p.status === 'normal' ? '#00d8e8' : '#e80000'}
                              fillOpacity={0.08}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={p.status === 'normal' ? '#15516c' : '#6c1515'}
                              strokeWidth={1.5}
                              fill={`url(#grad-${p.type})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreenhouseDetailModal;
