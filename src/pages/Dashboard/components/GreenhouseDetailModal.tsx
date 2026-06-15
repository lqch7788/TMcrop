// 温室详情弹窗组件
import { Modal } from '../../../components/ui/Modal';
import {
  Thermometer, Droplets, Sun, Wind, Activity, Gauge
} from 'lucide-react';
import type { GreenhouseEnvData } from '../types/dashboard.types';

interface GreenhouseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGreenhouse: string | null;
  greenhouseEnvData: GreenhouseEnvData[];
  getCropInfo: (greenhouseId: string) => any;
}

// 环境参数卡片组件
function EnvParamCard({
  icon: Icon,
  iconBg,
  label,
  value,
  unit,
  range,
}: {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  value: string;
  unit: string;
  range: string;
}) {
  return (
    <div className="relative p-2 bg-gray-100 rounded-lg">
      <div className={`absolute top-2 left-2 w-8 h-8 rounded ${iconBg} flex items-center justify-center shadow-none`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="pl-10 text-center">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-lg font-bold text-emerald-600">{value}{unit}</div>
        <div className="text-xs text-gray-600">({range})</div>
      </div>
    </div>
  );
}

export function GreenhouseDetailModal({
  isOpen,
  onClose,
  selectedGreenhouse,
  greenhouseEnvData,
  getCropInfo,
}: GreenhouseDetailModalProps) {
  const greenhouse = greenhouseEnvData.find(g => g.id === selectedGreenhouse);
  const cropInfo = selectedGreenhouse ? getCropInfo(selectedGreenhouse) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={greenhouse ? `${greenhouse.name} - 温室内环境参数` : '温室内环境参数'}
      size="xl"
    >
      {selectedGreenhouse && (
        <div className="space-y-6">
          {/* 更新时间 */}
          <div className="text-sm text-gray-500">
            更新时间: {greenhouse.lastUpdate}
          </div>

          {/* 空气环境参数 */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">空气环境参数</h4>
            <div className="grid grid-cols-4 gap-3">
              <EnvParamCard
                icon={Thermometer}
                iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
                label="温度"
                value="24.8"
                unit="℃"
                range="10-30℃"
              />
              <EnvParamCard
                icon={Droplets}
                iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
                label="湿度"
                value="56"
                unit="%"
                range="40-90%"
              />
              <EnvParamCard
                icon={Sun}
                iconBg="bg-gradient-to-br from-yellow-400 to-amber-500"
                label="光照度"
                value="25954"
                unit="Lux"
                range="10000-30000Lux"
              />
              <EnvParamCard
                icon={Wind}
                iconBg="bg-gradient-to-br from-teal-400 to-teal-500"
                label="CO₂"
                value="479"
                unit="ppm"
                range="300-900ppm"
              />
            </div>
          </div>

          {/* 土壤环境参数 */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">土壤环境参数</h4>
            <div className="grid grid-cols-4 gap-3">
              <EnvParamCard
                icon={Thermometer}
                iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
                label="温度"
                value="21.6"
                unit="℃"
                range="18-30℃"
              />
              <EnvParamCard
                icon={Droplets}
                iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
                label="湿度"
                value="35"
                unit="%"
                range="20-60%"
              />
              <EnvParamCard
                icon={Activity}
                iconBg="bg-gradient-to-br from-purple-400 to-purple-500"
                label="EC值"
                value="2.5"
                unit=""
                range="0.2-1"
              />
              <EnvParamCard
                icon={Gauge}
                iconBg="bg-gradient-to-br from-indigo-400 to-indigo-500"
                label="PH值"
                value="6.5"
                unit=""
                range="5.5-7.5"
              />
            </div>
          </div>

          {/* 区域内作物 */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">区域内作物</h4>
            {cropInfo ? (
              <div className="grid grid-cols-4 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">种植状态</span>
                  <span className="text-sm font-medium text-emerald-600">{cropInfo.stageName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">作物名称</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.cropName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">品种</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.variety}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">种植区域</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.greenhouseName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">当前阶段</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.stageName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">种植面积</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.plantingArea} ㎡</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">种植时间</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.startDate}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">预计采收</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.expectedHarvestDate}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">批次</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.batchCode}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">负责人</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.responsiblePerson}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
                该区域暂无进行中的作物
              </div>
            )}
          </div>

          {/* 作物全景图 */}
          <div className="mt-6">
            <h4 className="text-base font-semibold text-gray-900 mb-3">作物全景图</h4>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-video bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center">
                  <span className="text-sm text-gray-400">图片{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
