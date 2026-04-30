/**
 * 问题分派页面头部组件
 */

import React from 'react';
import { Send } from 'lucide-react';

interface ProblemPageHeaderProps {
  title?: string;
  subtitle?: string;
}

export function ProblemPageHeader({
  title = '问题分派',
  subtitle = '将巡检发现的问题分派给员工处理'
}: ProblemPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
