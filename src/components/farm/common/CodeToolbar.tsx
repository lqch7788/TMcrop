/**
 * 统一页面工具栏组件
 * 包含编码规则按钮和产品编码生成展开/收起
 * 供种源管理、育苗管理、种植管理、采收入库等模块使用
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CodeToolbarProps {
  codeGenExpanded: boolean;
  onCodeGenToggle: () => void;
  onCodeRuleClick: () => void;
  showCodeGenToggle?: boolean;  // 是否显示编码生成展开按钮
}

export function CodeToolbar({
  codeGenExpanded,
  onCodeGenToggle,
  onCodeRuleClick,
  showCodeGenToggle = true
}: CodeToolbarProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onCodeRuleClick}
        className="px-3 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
      >
        编码规则 &gt;&gt;
      </button>
      {showCodeGenToggle && (
        <>
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
        </>
      )}
    </div>
  );
}

export default CodeToolbar;
