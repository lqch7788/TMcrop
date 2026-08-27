/**
 * 棚内空气综合环境（4 个 EnvRangeBar）
 */
import React from 'react';
import { Thermometer, Droplets, Sun, Wind } from 'lucide-react';
import { EnvParam } from './mockData';
import EnvRangeBar from './EnvRangeBar';

const iconMap = {
  air_temp: Thermometer,
  air_humidity: Droplets,
  light: Sun,
  co2: Wind,
};

interface AirEnvironmentPanelProps {
  params: EnvParam[];
}

const AirEnvironmentPanel: React.FC<AirEnvironmentPanelProps> = ({ params }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-blue-500 rounded-full" />
        棚内空气综合环境
      </h3>
      <div className="space-y-1">
        {params.map(p => (
          <EnvRangeBar
            key={p.type}
            icon={iconMap[p.type as keyof typeof iconMap]}
            label={p.label}
            value={p.value}
            unit={p.unit}
            min={p.min}
            max={p.max}
            minScale={p.minScale}
            maxScale={p.maxScale}
            warning={p.warning}
          />
        ))}
      </div>
    </div>
  );
};

export default AirEnvironmentPanel;
