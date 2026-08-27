/**
 * 棚内土壤综合环境（4 个 EnvRangeBar）
 */
import React from 'react';
import { Thermometer, Droplets, Leaf, Activity } from 'lucide-react';
import { EnvParam } from './mockData';
import EnvRangeBar from './EnvRangeBar';

interface SoilEnvironmentPanelProps {
  params: EnvParam[];
}

const iconMap = {
  soil_temp: Thermometer,
  soil_moisture: Droplets,
  soil_ph: Leaf,
  soil_ec: Activity,
};

const SoilEnvironmentPanel: React.FC<SoilEnvironmentPanelProps> = ({ params }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-emerald-500 rounded-full" />
        棚内土壤综合环境
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

export default SoilEnvironmentPanel;
