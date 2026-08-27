/**
 * 大棚分区列表（右侧滚动列表 + 圆点分页 + 更多链接）
 */
import React from 'react';
import { Image as ImageIcon, Sprout, Calendar } from 'lucide-react';
import { ZoneInfo } from './mockData';

interface ZonesPanelProps {
  zones: ZoneInfo[];
  zonePage: number;
  totalZonePages: number;
  onZonePageChange: (page: number) => void;
  onMoreClick: (zone: ZoneInfo) => void;
}

const ZonesPanel: React.FC<ZonesPanelProps> = ({
  zones,
  zonePage,
  totalZonePages,
  onZonePageChange,
  onMoreClick,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 px-1">大棚分区概览</h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {zones.map(zone => (
          <div key={zone.id} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* 蓝色标题栏 */}
            <div className="bg-blue-500 text-white px-3 py-1.5 text-xs font-medium">
              {zone.name}
            </div>
            {/* 卡片内容 */}
            <div className="p-3">
              {/* 占位图 */}
              <div className="aspect-square bg-gradient-to-br from-emerald-50 to-green-100 rounded mb-2 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-emerald-300" />
              </div>
              {/* 作物信息 */}
              <div className="space-y-1 text-xs">
                <div className="flex items-start gap-1">
                  <Sprout className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-500">作物：</span>
                    <span className="font-medium text-gray-800">{zone.cropName}</span>
                    {zone.variety && <span className="text-gray-400 ml-1">({zone.variety})</span>}
                  </div>
                </div>
                <div className="flex items-start gap-1">
                  <Calendar className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-500">生长周期：</span>
                    <span className="text-gray-800">{zone.stage}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 ml-4">面积：</span>
                  <span className="text-gray-800">{zone.area}</span>
                </div>
              </div>
              {/* 更多链接 */}
              <button
                onClick={() => onMoreClick(zone)}
                className="mt-2 text-blue-500 text-xs hover:underline hover:text-blue-600 font-medium"
              >
                更多 »
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部圆点分页 */}
      {totalZonePages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-slate-100">
          {Array.from({ length: totalZonePages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => onZonePageChange(page)}
              className={`w-2 h-2 rounded-full transition-colors ${
                zonePage === page ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`第 ${page} 页`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ZonesPanel;
