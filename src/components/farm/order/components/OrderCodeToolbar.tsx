/**
 * 订单管理页面工具栏组件
 * 包含编码规则和产品编码生成功能
 *
 * [L-1] 当前未被 OrderPage 引用，保留为备用组件，不删除（用户禁止擅删文件）
 * TODO: 后续如确认不再使用，删除前需走用户授权
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <Button
        variant="default"
        size="sm"
        onClick={onCodeRuleClick}
        className="gap-1"
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
