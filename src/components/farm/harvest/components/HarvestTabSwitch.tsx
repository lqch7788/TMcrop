/**
 * 采收入库页面Tab切换组件
 * 参照物料入库TabSwitch设计
 */

import { ChevronDown, ChevronRight } from 'lucide-react';

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
        </>
      )}
    </div>
  );
}
