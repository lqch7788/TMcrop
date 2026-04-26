/**
 * 订单管理页面工具栏组件
 * 包含编码规则和产品编码生成功能
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface OrderCodeToolbarProps {
  codeGenExpanded: boolean;
  onCodeGenToggle: () => void;
  onCodeRuleClick: () => void;
}

export function OrderCodeToolbar({
  codeGenExpanded,
  onCodeGenToggle,
  onCodeRuleClick,
}: OrderCodeToolbarProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onCodeRuleClick}
        className="px-3 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
      >
        编码规则 &gt;&gt;
      </button>
      <span className="text-sm font-bold text-gray-900">产品编码生成</span>
      <button
        onClick={onCodeGenToggle}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title={codeGenExpanded ? '收起' : '展开'}
      >
        {codeGenExpanded ? (
          <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
        )}
      </button>
    </div>
  );
}
