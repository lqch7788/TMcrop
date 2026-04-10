import { ChevronDown, ChevronRight } from 'lucide-react';

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
        <button
          onClick={() => onTabChange('inbound')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inbound'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料入库
        </button>
        <button
          onClick={() => onTabChange('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料总览
        </button>
      </div>
      {showCodeGen && (
        <>
          <div className="h-6 w-px bg-gray-500"></div>
          <button
            onClick={onCodeRuleClick}
            className="px-3 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            编码规则 &gt;&gt;
          </button>
          <span className="text-sm font-bold text-gray-900">物料编码生成</span>
          <button
            onClick={onCodeGenToggle}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={codeGenExpanded ? '收起' : '展开'}
          >
            {codeGenExpanded ? <ChevronDown className="w-6 h-6 text-gray-600 font-bold" /> : <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />}
          </button>
        </>
      )}
    </div>
  );
}
