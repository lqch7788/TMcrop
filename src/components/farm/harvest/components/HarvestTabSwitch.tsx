/**
 * 采收入库页面Tab切换组件
 * 参照物料入库TabSwitch设计
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../ui/button';

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
        </>
      )}
    </div>
  );
}
