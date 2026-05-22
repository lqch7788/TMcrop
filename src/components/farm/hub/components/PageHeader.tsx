/**
 * 页面头部组件
 */

import React from 'react';
import { Send } from 'lucide-react';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
}

export function PageHeader({ title = '农事任务派发', subtitle = '智能排程与任务调度管理中心' }: PageHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Send className="w-6 h-6 text-white" />
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
