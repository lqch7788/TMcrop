/**
 * 作物品种库工具栏组件
 * 包含编码规则和产品编码生成功能
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CropVarietyCodeToolbarProps {
  codeGenExpanded: boolean;
  onCodeGenToggle: () => void;
  onCodeRuleClick: () => void;
}

export function CropVarietyCodeToolbar({
  codeGenExpanded,
  onCodeGenToggle,
  onCodeRuleClick,
}: CropVarietyCodeToolbarProps) {
  return (
    <div className="flex items-center gap-4">
      <Button
        size="sm"
        onClick={onCodeRuleClick}
      >
        编码规则 &gt;&gt;
      </Button>
      <span className="text-sm font-bold text-gray-900">产品编码生成</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCodeGenToggle}
        title={codeGenExpanded ? '收起' : '展开'}
      >
        {codeGenExpanded ? (
          <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
        )}
      </Button>
    </div>
  );
}
