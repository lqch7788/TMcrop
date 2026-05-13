/**
 * 汇总报表 Tab 组件
 * 展示生产链条各环节的统计数据，包含6个可展开的统计卡片
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
import { ExpandableStatCard } from './ExpandableStatCard';
import { ProductionChainTable, ChainTableType } from './ProductionChainTable';
import { useProductionChainStats, ProductionChainData } from '@/hooks/useProductionChainStats';
import { Button } from '@/components/ui';

// 卡片配置接口
interface CardConfig {
  key: string;
  title: string;
  icon: typeof ClipboardList;
  iconBgColor: string;
  tableType: ChainTableType;
  routePath: string;
}

// 6个统计卡片配置
const cardConfigs: CardConfig[] = [
  {
    key: 'productionPlans',
    title: '生产计划',
    icon: ClipboardList,
    iconBgColor: 'bg-blue-500',
    tableType: 'plans',
    routePath: '/production',
  },
  {
    key: 'seedlings',
    title: '种源管理',
    icon: Sprout,
    iconBgColor: 'bg-green-500',
    tableType: 'seedlings',
    routePath: '/crop/seedling',
  },
  {
    key: 'plantings',
    title: '育苗管理',
    icon: Flower2,
    iconBgColor: 'bg-emerald-500',
    tableType: 'seedlings', // 复用 seedlings 表格配置
    routePath: '/crop/planting',
  },
  {
    key: 'plantingOperations',
    title: '种植管理',
    icon: Trees,
    iconBgColor: 'bg-teal-500',
    tableType: 'plantings',
    routePath: '/crop/planting',
  },
  {
    key: 'harvests',
    title: '采收入库',
    icon: Package,
    iconBgColor: 'bg-orange-500',
    tableType: 'harvests',
    routePath: '/crop/harvest',
  },
  {
    key: 'inventory',
    title: '库存管理',
    icon: Warehouse,
    iconBgColor: 'bg-purple-500',
    tableType: 'inventory',
    routePath: '/crop-inventory',
  },
];

// 统计数据映射
const statsMapping: Record<string, { label: string; valueKey: keyof ReturnType<typeof useProductionChainStats>['stats']['productionPlans'] }[]> = {
  productionPlans: [
    { label: '总数', valueKey: 'total' },
    { label: '已关联', valueKey: 'related' },
    { label: '待处理', valueKey: 'pending' },
  ],
  seedlings: [
    { label: '总数', valueKey: 'total' },
    { label: '已关联', valueKey: 'related' },
  ],
  plantings: [
    { label: '总数', valueKey: 'total' },
    { label: '已关联', valueKey: 'related' },
  ],
  plantingOperations: [
    { label: '总数', valueKey: 'total' },
    { label: '已关联', valueKey: 'related' },
  ],
  harvests: [
    { label: '总数', valueKey: 'total' },
    { label: '已关联', valueKey: 'related' },
  ],
  inventory: [
    { label: '总数', valueKey: 'total' },
    { label: '已关联', valueKey: 'related' },
  ],
};

/**
 * 汇总报表 Tab 组件
 */
export function SummaryReportTab() {
  const navigate = useNavigate();
  const { stats, data, isLoading } = useProductionChainStats();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // 处理卡片展开/收起
  const handleCardToggle = (cardKey: string) => {
    setExpandedCard(expandedCard === cardKey ? null : cardKey);
  };

  // 处理查看按钮点击
  const handleView = (cardConfig: CardConfig) => {
    navigate(cardConfig.routePath);
  };

  // 获取表格数据 - 根据展开的卡片返回对应数据
  const getTableData = (cardKey: string) => {
    // 只有当卡片展开时才返回数据
    if (expandedCard !== cardKey || !data) {
      return [];
    }

    switch (cardKey) {
      case 'productionPlans':
        return data.productionPlans || [];
      case 'seedlings':
        // 种源管理 - 使用 seedlings 数据
        return data.seedlings || [];
      case 'plantings':
        // 育苗管理 - 使用 seedlings 数据（表格配置复用 seedlings）
        return data.seedlings || [];
      case 'plantingOperations':
        // 种植管理 - 使用 plantings 数据
        return data.plantings || [];
      case 'harvests':
        return data.harvestRecords || [];
      case 'inventory':
        return data.inventoryRecords || [];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-4">
      {/* 6个统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cardConfigs.map((card) => {
          const Icon = card.icon;
          const cardStats = stats[card.key as keyof typeof stats];
          const statsConfig = statsMapping[card.key] || [];

          // 转换统计数据为组件需要的格式
          const statsList = statsConfig.map((config) => ({
            label: config.label,
            value: cardStats ? cardStats[config.valueKey] ?? 0 : 0,
          }));

          return (
            <ExpandableStatCard
              key={card.key}
              title={card.title}
              icon={Icon}
              iconBgColor={card.iconBgColor}
              stats={statsList}
              isExpanded={expandedCard === card.key}
              onToggle={() => handleCardToggle(card.key)}
            >
              {/* 展开后的内容：表格 + 查看按钮 */}
              <div className="space-y-3">
                <ProductionChainTable
                  type={card.tableType}
                  data={getTableData(card.key)}
                  onView={(record) => console.log('查看记录:', record)}
                />
                {/* 查看详情按钮 */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(card)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    查看详情
                  </Button>
                </div>
              </div>
            </ExpandableStatCard>
          );
        })}
      </div>
    </div>
  );
}

export default SummaryReportTab;
