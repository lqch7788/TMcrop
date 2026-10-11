// 温室详情弹窗组件（环境参数表"详情"进入）
// 2026-10-11 数据真实化：环境参数接入 iot_sensors 实时数据（原 8 项硬编码值删除）；
//                        区域内作物字段错配修复（stageName/responsiblePerson/startDate 在 BatchStatItem 中不存在，
//                        改用 status 映射阶段名、plantingDate、greenhouse）；删除占位图片区
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

// 批次状态 → 生长阶段名（与 useDashboard 的 statusToStage 口径一致）
const BATCH_STATUS_TO_STAGE: Record<string, string> = {
  planning: '播种期',
  planted: '生长期',
  in_progress: '结果期',
  completed: '采收期',
};

// 环境参数卡片组件（实时值 + 状态色）
function EnvParamCard({
  icon: Icon,
  iconBg,
  label,
  value,
  unit,
  status,
}: {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  value: number | null | undefined;
  unit: string;
  status?: string;
}) {
  const valueColor = status === 'critical' ? 'text-red-600'
    : status === 'warning' ? 'text-amber-600'
    : 'text-emerald-600';
  return (
    <div className="relative p-2 bg-gray-100 rounded-lg">
      <div className={`absolute top-2 left-2 w-8 h-8 rounded ${iconBg} flex items-center justify-center shadow-none`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="pl-10 text-center">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className={`text-lg font-bold ${valueColor}`}>{value ?? '-'}{value != null ? unit : ''}</div>
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
            更新时间: {greenhouse?.lastUpdate || '-'}
          </div>

          {!greenhouse ? (
            <div className="p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
              该区域暂无环境监测数据
            </div>
          ) : (
            <>
              {/* 空气环境参数（iot_sensors 实时值） */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3">空气环境参数</h4>
                <div className="grid grid-cols-4 gap-3">
                  <EnvParamCard
                    icon={Thermometer}
                    iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
                    label="温度"
                    value={greenhouse.airTemp?.value}
                    unit={greenhouse.airTemp?.unit || ''}
                    status={greenhouse.airTemp?.status}
                  />
                  <EnvParamCard
                    icon={Droplets}
                    iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
                    label="湿度"
                    value={greenhouse.airHumidity?.value}
                    unit={greenhouse.airHumidity?.unit || ''}
                    status={greenhouse.airHumidity?.status}
                  />
                  <EnvParamCard
                    icon={Sun}
                    iconBg="bg-gradient-to-br from-yellow-400 to-amber-500"
                    label="光照度"
                    value={greenhouse.light?.value}
                    unit={greenhouse.light?.unit || ''}
                    status={greenhouse.light?.status}
                  />
                  <EnvParamCard
                    icon={Wind}
                    iconBg="bg-gradient-to-br from-teal-400 to-teal-500"
                    label="CO₂"
                    value={greenhouse.co2?.value}
                    unit={greenhouse.co2?.unit || ''}
                    status={greenhouse.co2?.status}
                  />
                </div>
              </div>

              {/* 土壤环境参数（iot_sensors 实时值） */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3">土壤环境参数</h4>
                <div className="grid grid-cols-4 gap-3">
                  <EnvParamCard
                    icon={Thermometer}
                    iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
                    label="温度"
                    value={greenhouse.soilTemp?.value}
                    unit={greenhouse.soilTemp?.unit || ''}
                    status={greenhouse.soilTemp?.status}
                  />
                  <EnvParamCard
                    icon={Droplets}
                    iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
                    label="湿度"
                    value={greenhouse.soilMoisture?.value}
                    unit={greenhouse.soilMoisture?.unit || ''}
                    status={greenhouse.soilMoisture?.status}
                  />
                  <EnvParamCard
                    icon={Activity}
                    iconBg="bg-gradient-to-br from-purple-400 to-purple-500"
                    label="EC值"
                    value={greenhouse.soilEc?.value}
                    unit={greenhouse.soilEc?.unit || ''}
                    status={greenhouse.soilEc?.status}
                  />
                  <EnvParamCard
                    icon={Gauge}
                    iconBg="bg-gradient-to-br from-indigo-400 to-indigo-500"
                    label="PH值"
                    value={greenhouse.soilPh?.value}
                    unit={greenhouse.soilPh?.unit || ''}
                    status={greenhouse.soilPh?.status}
                  />
                </div>
              </div>
            </>
          )}

          {/* 区域内作物（batch-stats 真实数据，字段与 BatchStatItem 对齐） */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">区域内作物</h4>
            {cropInfo ? (
              <div className="grid grid-cols-4 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">种植状态</span>
                  <span className="text-sm font-medium text-emerald-600">{BATCH_STATUS_TO_STAGE[cropInfo.status] || cropInfo.status}</span>
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
                  <span className="text-sm font-medium text-blue-600">{cropInfo.greenhouse}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">种植面积</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.plantingArea}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">种植时间</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.plantingDate}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">预计采收</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.expectedHarvestDate}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">批次</span>
                  <span className="text-sm font-medium text-blue-600">{cropInfo.batchCode}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
                该区域暂无进行中的作物
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
