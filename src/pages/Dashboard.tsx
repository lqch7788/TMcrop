// Dashboard 页面主组件
// 基地总览页面 - 实时监控农业生产运营状况
import { LayoutDashboard, MapPin, Settings } from 'lucide-react';

// 导入已有组件
import { StatCard } from '../components/dashboard/cards/StatCard';
import { EquipmentStatusCard } from '../components/dashboard/cards/EquipmentStatusCard';
import { InventoryAlertCard } from '../components/dashboard/cards/InventoryAlertCard';
import { ProductionProgressCard } from '../components/dashboard/cards/ProductionProgressCard';
import { EnergyCard } from '../components/dashboard/cards/EnergyCard';
import { TodayTasksCard } from '../components/dashboard/cards/TodayTasksCard';
import { AlertsCard } from '../components/dashboard/cards/AlertsCard';
import { V3QuickAccessCard } from '../components/dashboard/cards/V3QuickAccessCard';
import { WeatherWidget } from '../components/dashboard/widgets/WeatherWidget';
import { ImageEnlargementModal } from '../components/dashboard/ImageEnlargementModal';

// 导入子组件
import { useDashboard } from './Dashboard/hooks/useDashboard';
import {
  GreenhouseMap,
  GreenhouseTable,
  FieldTable,
  EnvironmentTable,
  TodayTasksTable,
  ActiveBatchesTable,
  YieldChart,
  CostChart,
  GreenhouseDetailModal,
  BaseDetailModal,
} from './Dashboard/components';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  // 使用自定义 hook 管理状态和逻辑
  const {
    // 状态
    greenhouseTableExpanded,
    overviewExpanded,
    fieldTableExpanded,
    isDetailModalOpen,
    selectedGreenhouse,
    selectedDetail,
    enlargedImageIndex,
    greenhouseEnvData,
    totalGreenhousePages,
    paginatedGreenhouseData,
    mappedBatches,
    greenhouseList,
    filteredYieldStats,
    filteredCostAnalysis,
    todayTasks,
    selectedRegion,
    greenhousePage,
    greenhousePageSize,
    yieldRegion,
    yieldCrop,
    costPeriod,
    costCrop,
    costAreaType,
    // setter
    setGreenhouseTableExpanded,
    setOverviewExpanded,
    setFieldTableExpanded,
    setIsDetailModalOpen,
    setSelectedGreenhouse,
    setSelectedDetail,
    setEnlargedImageIndex,
    setSelectedRegion,
    setGreenhousePage,
    setGreenhousePageSize,
    setYieldRegion,
    setYieldCrop,
    setCostPeriod,
    setCostCrop,
    setCostAreaType,
    // 函数
    handleDetailClick,
    getCropInfo,
    navigate,
  } = useDashboard();

  // 处理详情点击（温室/大田表格）
  const handleDetailClickWrapper = (detail: { type: 'greenhouse' | 'field'; data: any }) => {
    setSelectedDetail(detail);
  };

  // 进入按钮点击
  const handleEnterClick = () => {
    setSelectedDetail(null);
    navigate('/');
  };

  return (
    // 2026-06-15 P0-5: 根节点加 tabular-nums，CSS 继承让所有子元素数字等宽（解决实时刷新抖动）
    <div className="space-y-6 tabular-nums">
      {/* Page Header - 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">基地总览</h1>
              <p className="text-gray-500">实时监控农业生产运营状况</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - 统计卡片网格 */}
      {/* 2026-06-15: 响应式断点 - 手机 2 列 / 平板 3 列 / 桌面 6 列 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <TodayTasksCard />
        <AlertsCard />
        <V3QuickAccessCard />
        <EquipmentStatusCard />
        <InventoryAlertCard />
        <ProductionProgressCard />
        <EnergyCard />
      </div>

      {/* Main Content Grid - 主内容网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 左侧列 */}
        <div className="lg:col-span-2 space-y-6">

          {/* 崇明岛基地概况 */}
          <div className="card-garden rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-green-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">崇明岛基地概况</h3>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span><span className="text-emerald-600 font-medium">总面积：</span><span className="font-semibold text-gray-700">1500亩</span></span>
                  <span><span className="text-emerald-600 font-medium">温室区域：</span><span className="font-semibold text-gray-700">12个 (80000㎡)</span></span>
                  <span><span className="text-amber-600 font-medium">大田面积：</span><span className="font-semibold text-gray-700">700亩</span></span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500">启用时间：2020年3月</span>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* 基地总览图 */}
              <GreenhouseMap
                expanded={overviewExpanded}
                onToggle={() => setOverviewExpanded(!overviewExpanded)}
                onMapClick={() => setGreenhouseTableExpanded(true)}
              />

              {/* 温室区域表格 */}
              <GreenhouseTable
                expanded={greenhouseTableExpanded}
                onToggle={() => setGreenhouseTableExpanded(!greenhouseTableExpanded)}
                onDetailClick={handleDetailClickWrapper}
              />

              {/* 大田区域表格 */}
              <FieldTable
                expanded={fieldTableExpanded}
                onToggle={() => setFieldTableExpanded(!fieldTableExpanded)}
                onDetailClick={handleDetailClickWrapper}
              />
            </div>
          </div>

          {/* 种植区环境参数表 */}
          <EnvironmentTable
            selectedRegion={selectedRegion}
            greenhouseList={greenhouseList}
            paginatedGreenhouseData={paginatedGreenhouseData}
            greenhouseEnvData={greenhouseEnvData}
            greenhousePage={greenhousePage}
            greenhousePageSize={greenhousePageSize}
            totalGreenhousePages={totalGreenhousePages}
            onRegionChange={setSelectedRegion}
            onPageChange={setGreenhousePage}
            onPageSizeChange={setGreenhousePageSize}
            onDetailClick={handleDetailClick}
          />

          {/* 今日任务表格 */}
          <TodayTasksTable tasks={todayTasks} />

          {/* 活跃种植批次 */}
          <ActiveBatchesTable batches={mappedBatches} />
        </div>

        {/* Right Column - 右侧列 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 气象信息 */}
          <WeatherWidget />

          {/* 月度产量统计图表 */}
          <YieldChart
            yieldRegion={yieldRegion}
            yieldCrop={yieldCrop}
            filteredYieldStats={filteredYieldStats}
            onRegionChange={setYieldRegion}
            onCropChange={setYieldCrop}
          />

          {/* 成本构成分析图表 */}
          <CostChart
            costPeriod={costPeriod}
            costCrop={costCrop}
            costAreaType={costAreaType}
            filteredCostAnalysis={filteredCostAnalysis}
            onPeriodChange={setCostPeriod}
            onCropChange={setCostCrop}
            onAreaTypeChange={setCostAreaType}
          />
        </div>
      </div>

      {/* 温室内环境参数详情弹窗 */}
      <GreenhouseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedGreenhouse={selectedGreenhouse}
        greenhouseEnvData={greenhouseEnvData}
        getCropInfo={getCropInfo}
      />

      {/* 基地详情弹窗 */}
      <BaseDetailModal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        selectedDetail={selectedDetail}
        enlargedImageIndex={enlargedImageIndex}
        onImageClick={setEnlargedImageIndex}
        onEnter={handleEnterClick}
      />

      {/* 图片放大查看弹窗 */}
      <ImageEnlargementModal
        isOpen={enlargedImageIndex !== null}
        imageIndex={enlargedImageIndex || 0}
        onClose={() => setEnlargedImageIndex(null)}
      />
    </div>
  );
}
