/**
 * 采收入库页面Tab切换组件
 * 参照物料入库TabSwitch设计
 */

import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui';

interface HarvestTabSwitchProps {
  activeTab: 'list' | 'inbound';
  onTabChange: (tab: 'list' | 'inbound') => void;
  codeGenExpanded?: boolean;
  onCodeGenToggle?: () => void;
  onCodeRuleClick?: () => void;
  showCodeGen?: boolean;
}

export default function HarvestTabSwitch({
  codeGenExpanded,
  onCodeGenToggle,
  onCodeRuleClick,
  showCodeGen,
}: HarvestTabSwitchProps) {
  return (
    <div className="flex items-center gap-4">
      {showCodeGen && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={onCodeRuleClick}
            className="gap-1"
          >
            <BookOpen className="w-4 h-4" />
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
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </Button>
        </>
      )}
    </div>
  );
}
