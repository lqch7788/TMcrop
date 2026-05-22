/**
 * 巡查记录页面头部组件
 */

import React from 'react';
import { Eye } from 'lucide-react';

interface InspectionPageHeaderProps {
  title?: string;
  subtitle?: string;
}

export function InspectionPageHeader({
  title = '巡查记录',
  subtitle = '人工巡查记录管理'
}: InspectionPageHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
