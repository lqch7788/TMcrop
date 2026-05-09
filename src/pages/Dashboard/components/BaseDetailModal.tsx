// 基地详情弹窗组件
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/button';
import {
  Thermometer, Droplets, Sun, Wind, Activity, Gauge
} from 'lucide-react';
import type { SelectedDetailType } from '../types/dashboard.types';

interface BaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDetail: SelectedDetailType;
  enlargedImageIndex: number | null;
  onImageClick: (index: number) => void;
  onEnter: () => void;
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
        <div className="text-xs text-gray-400">({range})</div>
      </div>
    </div>
  );
}

export function BaseDetailModal({
  isOpen,
  onClose,
  selectedDetail,
  enlargedImageIndex,
  onImageClick,
  onEnter,
}: BaseDetailModalProps) {
  if (!selectedDetail) return null;

  const isGreenhouse = selectedDetail.type === 'greenhouse';
  const data = selectedDetail.data;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${data.no}详情`}
      size="xl"
      headerAction={
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={onEnter}>
            进入&gt;&gt;
          </Button>
        </div>
      }
      showFooter={false}
    >
      <div className="p-6">
        {/* 基本信息 */}
        <div className="mb-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">基本信息</h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">种植状态</span>
              <span className="text-sm font-medium text-blue-600">{data.status}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">作物名称</span>
              <span className="text-sm font-medium text-blue-600">{data.crop}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">品种</span>
              <span className="text-sm font-medium text-blue-600">{'variety' in data ? data.variety || '红富士樱桃番茄' : '红富士樱桃番茄'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">种植区域</span>
              <span className="text-sm font-medium text-blue-600">{data.no}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">当前阶段</span>
              <span className="text-sm font-medium text-blue-600">开花结果期</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">株龄</span>
              <span className="text-sm font-medium text-blue-600">78天</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">种植面积</span>
              <span className="text-sm font-medium text-blue-600">
                {isGreenhouse ? `${data.area}㎡` : `${data.area}亩`}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">种植日期</span>
              <span className="text-sm font-medium text-blue-600">{data.plantedDate}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">预计采收</span>
              <span className="text-sm font-medium text-blue-600">{data.expectedHarvest}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">负责人</span>
              <span className="text-sm font-medium text-blue-600">{data.manager}</span>
            </div>
          </div>
        </div>

        {/* 环境参数 */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">空气环境参数</h4>
          <div className="grid grid-cols-4 gap-3 mb-4">
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
              value="6.8"
              unit=""
              range="5.5-7.5"
            />
          </div>
        </div>

        {/* 作物图片 */}
        <div className="mt-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">作物图片</h4>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                onClick={() => onImageClick(index)}
                className="aspect-square bg-[#F2F6FA] rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="text-center text-gray-400">
                  <div className="w-12 h-12 mx-auto mb-1 rounded-lg bg-gray-200 flex items-center justify-center">
                    <span className="text-lg">📷</span>
                  </div>
                  <span className="text-xs">图片{index}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
