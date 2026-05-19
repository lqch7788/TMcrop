/**
 * 基地架构管理 — 统一入口页面（基地空间架构 V1.0）
 * 4 TAB: 公司基地 / 设施管理 / 区块划分 / 种植记录
 */
import { useState } from 'react';
import CompanyBaseTab from '../../components/farm-structure/CompanyBaseTab';
import FacilityTab from '../../components/farm-structure/FacilityTab';
import BlockTab from '../../components/farm-structure/BlockTab';
import PlantingRecordTab from '../../components/farm-structure/PlantingRecordTab';

const TABS = [
  { key: 'company-base', label: '公司基地' },
  { key: 'facility', label: '设施管理' },
  { key: 'block', label: '区块划分' },
  { key: 'planting-record', label: '种植记录' },
] as const;

export default function FarmStructureManagement() {
  const [activeTab, setActiveTab] = useState<string>('company-base');

  return (
    <div className="p-6 space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">基地架构管理</h1>
      </div>

      {/* TAB 切换栏 */}
      <div className="flex gap-0 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-5 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 内容区 */}
      <div className="min-h-[600px]">
        {activeTab === 'company-base' && <CompanyBaseTab />}
        {activeTab === 'facility' && <FacilityTab />}
        {activeTab === 'block' && <BlockTab />}
        {activeTab === 'planting-record' && <PlantingRecordTab />}
      </div>
    </div>
  );
}
