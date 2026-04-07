/**
 * 报表Tab切换组件
 */

interface TabItem {
  value: string;
  label: string;
}

interface ReportTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ReportTabs({ tabs, activeTab, onTabChange }: ReportTabsProps) {
  return (
    <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === tab.value
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
