import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface TabSwitchProps {
  activeTab: 'overview' | 'inbound';
  onTabChange: (tab: 'overview' | 'inbound') => void;
  codeGenExpanded?: boolean;
  onCodeGenToggle?: () => void;
  onCodeRuleClick?: () => void;
  showCodeGen?: boolean;
}

export default function TabSwitch({ activeTab, onTabChange, codeGenExpanded, onCodeGenToggle, onCodeRuleClick, showCodeGen }: TabSwitchProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeTab === 'inbound' ? 'default' : 'outline'}
          onClick={() => onTabChange('inbound')}
        >
          物料入库
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => onTabChange('overview')}
        >
          库存总览
        </Button>
      </div>
      {showCodeGen && (
        <>
          <div className="h-6 w-px bg-gray-500"></div>
          <Button size="sm" onClick={onCodeRuleClick}>
            编码规则 &gt;&gt;
          </Button>
          <span className="text-sm font-bold text-gray-900">物料编码生成</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCodeGenToggle}
            title={codeGenExpanded ? '收起' : '展开'}
          >
            {codeGenExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
          </Button>
        </>
      )}
    </div>
  );
}
