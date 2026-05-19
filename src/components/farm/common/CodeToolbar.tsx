/**
 * 统一页面工具栏组件
 * 包含编码规则按钮和产品编码生成展开/收起
 * 供种源管理、育苗管理、种植管理、采收入库等模块使用
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';

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
      <Button
        variant="default"
        size="sm"
        onClick={onCodeRuleClick}
        className="h-9 gap-1"
      >
        编码规则 &gt;&gt;
      </Button>
      {showCodeGenToggle && (
        <>
          <span className="text-sm font-bold text-gray-900">产品编码生成</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCodeGenToggle}
            className="p-1"
            title={codeGenExpanded ? '收起' : '展开'}
          >
            {codeGenExpanded ? (
              <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
            )}
          </Button>
        </>
      )}
    </div>
  );
}

export default CodeToolbar;
