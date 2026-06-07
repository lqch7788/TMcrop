/**
 * 汇总报表 Tab 组件
 * 展示生产链条各环节的统计数据，使用Tab按键切换不同环节表格
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Sprout,
  Flower2,
  Trees,
  Package,
  Warehouse,
  Eye,
} from 'lucide-react';
import { ProductionChainTable, ChainTableType } from './ProductionChainTable';
import { useProductionChainStats, ProductionChainData } from '@/hooks/useProductionChainStats';
import { Button } from '@/components/ui';

// Tab配置接口
interface TabConfig {
  key: string;
  title: string;
  icon: typeof ClipboardList;
  tableType: ChainTableType;
  routePath: string;
}

// 6个Tab配置
const tabConfigs: TabConfig[] = [
  {
    key: 'productionPlans',
    title: '生产计划',
    icon: ClipboardList,
    tableType: 'plans',
    routePath: '/production',
  },
  {
    key: 'seedlings',
    title: '种源管理',
    icon: Sprout,
    tableType: 'seedlings',
    routePath: '/crop/seedling',
  },
  {
    key: 'plantings',
    title: '育苗管理',
    icon: Flower2,
    tableType: 'seedlings',
    routePath: '/crop/planting',
  },
  {
    key: 'plantingOperations',
    title: '种植管理',
    icon: Trees,
    tableType: 'plantings',
    routePath: '/crop/planting',
  },
  {
    key: 'harvests',
    title: '采收入库',
    icon: Package,
    tableType: 'harvests',
    routePath: '/crop/harvest',
  },
  {
    key: 'inventory',
    title: '库存管理',
    icon: Warehouse,
    tableType: 'inventory',
    routePath: '/crop-inventory',
  },
];

/**
 * 汇总报表 Tab 组件
 */
export function SummaryReportTab() {
  const navigate = useNavigate();
  const { stats, data, isLoading } = useProductionChainStats();
  const [activeTab, setActiveTab] = useState<string>('productionPlans');

  // 获取当前激活的Tab配置
  const activeConfig = tabConfigs.find((t) => t.key === activeTab) || tabConfigs[0];

  // 根据activeTab返回对应数据
  const getTableData = (): any[] => {
    if (!data) return [];

    switch (activeTab) {
      case 'productionPlans':
        return data.productionPlans || [];
      case 'seedlings':
        return data.seedlings || [];
      case 'plantings':
        // 育苗管理 - 使用 seedlings 数据
        return data.seedlings || [];
      case 'plantingOperations':
        return data.plantings || [];
      case 'harvests':
        return data.harvestRecords || [];
      case 'inventory':
        return data.inventoryRecords || [];
      default:
        return [];
    }
  };

  // 处理Tab切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 处理查看详情
  const handleViewDetail = () => {
    navigate(activeConfig.routePath);
  };

  // 获取当前Tab的统计数据
  const getCurrentStats = () => {
    const stat = stats[activeTab as keyof typeof stats];
    if (!stat) return { total: 0, related: 0 };
    return {
      total: stat.total || 0,
      related: stat.related || 0,
    };
  };

  const currentStats = getCurrentStats();

  return (
    <div className="space-y-4">
      {/* Tab 按键行 - 类似标签页切换 */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {tabConfigs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const stat = stats[tab.key as keyof typeof stats];
          const tabTotal = stat?.total || 0;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${isActive
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.title}</span>
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-500'}
              `}>
                {tabTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* 统计信息栏 */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-3">
        <span className="text-gray-600">当前环节：</span>
        <span className="font-semibold text-gray-900">{activeConfig.title}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-600">总数：</span>
        <span className="font-semibold text-blue-600">{currentStats.total}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-600">已关联：</span>
        <span className="font-semibold text-green-600">{currentStats.related}</span>
      </div>

      {/* 表格区域 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeConfig.title} - 详情列表
          </h3>
          <Button variant="outline" size="sm" onClick={handleViewDetail}>
            <Eye className="w-4 h-4 mr-1" />
            查看详情
          </Button>
        </div>
        <ProductionChainTable
          type={activeConfig.tableType}
          data={getTableData()}
          onView={(record) => {
            // 查看记录详情
          }}
        />
      </div>
    </div>
  );
}

export default SummaryReportTab;
