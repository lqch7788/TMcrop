/**
 * 采收入库页面头部组件
 */

import React from 'react';
import { Warehouse } from 'lucide-react';

interface HarvestPageHeaderProps {
  title?: string;
  subtitle?: string;
}

export function HarvestPageHeader({
  title = '采收入库',
  subtitle = '管理采收记录、品质分级和入库操作'
}: HarvestPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <Warehouse className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
