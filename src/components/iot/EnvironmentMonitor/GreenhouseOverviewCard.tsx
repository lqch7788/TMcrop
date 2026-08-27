/**
 * 大棚综合参数（控制模式/面积/类型/利用率/启用时间）+ 3D 占位
 */
import React from 'react';
import { Home } from 'lucide-react';
import { GreenhouseOverviewInfo } from './mockData';

interface GreenhouseOverviewCardProps {
  info: GreenhouseOverviewInfo;
}

const GreenhouseOverviewCard: React.FC<GreenhouseOverviewCardProps> = ({ info }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      {/* 顶部 4 项指标 */}
      <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-slate-100">
        <div className="text-center">
          <div className="text-sm text-gray-500">控制模式</div>
          <div className="mt-1">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white text-xl font-bold">
              {info.controlMode}
            </span>
          </div>
          <div className="text-sm font-bold text-gray-800 mt-1">{info.controlMode === 'A' ? '自动模式' : info.controlMode}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">大棚面积</div>
          <div className="text-lg font-bold text-gray-800 mt-2">{info.area}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">大棚类型</div>
          <div className="text-sm font-bold text-gray-800 mt-2">{info.type}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">启用时间</div>
          <div className="text-sm font-bold text-gray-800 mt-2">{info.enableDate}</div>
        </div>
      </div>

      {/* 利用率 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">大棚利用率</span>
          <span className="font-bold text-gray-800">{info.utilization}</span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"
            style={{ width: '66.8%' }}
          />
        </div>
      </div>

      {/* 3D 大棚立体图（用 SVG 占位） */}
      <div className="relative bg-gradient-to-br from-sky-50 to-emerald-50 rounded-lg h-48 flex items-center justify-center overflow-hidden">
        {/* 简笔大棚 SVG */}
        <svg viewBox="0 0 300 160" className="w-full h-full">
          {/* 地面 */}
          <ellipse cx="150" cy="140" rx="140" ry="14" fill="#86c98a" opacity="0.5" />
          {/* 大棚主体 */}
          <rect x="60" y="80" width="180" height="55" rx="4" fill="#d4e9d4" stroke="#5fa463" strokeWidth="1.5" />
          {/* 大棚顶（半圆弧） */}
          <path d="M 60 80 Q 150 30 240 80" fill="#e8f5e8" stroke="#5fa463" strokeWidth="1.5" />
          {/* 大棚透明纹路 */}
          {[80, 110, 140, 170, 200, 230].map(x => (
            <line key={x} x1={x} y1={45} x2={x} y2={80} stroke="#5fa463" strokeWidth="0.8" opacity="0.5" />
          ))}
          {/* 内部作物行（绿色竖条） */}
          {[80, 110, 140, 170, 200].map(x => (
            <rect key={x} x1={x - 4} y1={95} width="8" height="35" fill="#5fa463" opacity="0.6" />
          ))}
          {/* 内部人物（简笔） */}
          <circle cx="150" cy="100" r="6" fill="#fdd9b5" />
          <rect x="142" y="105" width="16" height="20" fill="#4a90e2" />
          <rect x="142" y="125" width="6" height="12" fill="#2c3e50" />
          <rect x="152" y="125" width="6" height="12" fill="#2c3e50" />
        </svg>
        <div className="absolute bottom-2 right-3 text-xs text-gray-500 italic flex items-center gap-1">
          <Home className="w-3 h-3" /> 大棚 3D 示意
        </div>
      </div>
    </div>
  );
};

export default GreenhouseOverviewCard;
