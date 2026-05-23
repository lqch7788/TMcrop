/**
 * 基地架构管理 — 统一入口页面（基地空间架构 V1.0）
 * 4 TAB: 公司基地 / 设施管理 / 区块划分 / 种植记录
 */
import { useState } from 'react';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';
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
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">基地架构管理</h1>
              <p className="text-gray-500">公司基地、设施管理、区块划分和种植记录</p>
            </div>
          </div>
        </div>
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
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400'
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
