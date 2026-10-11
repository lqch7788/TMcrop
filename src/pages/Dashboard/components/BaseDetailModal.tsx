// 基地详情弹窗组件（温室/大田区域详情的"基地详情"）
// 2026-10-11 数据真实化：基本信息来自 greenhouses 真实行；环境参数接入该区域 IoT 实时数据；
//                        删除无数据源的硬编码（品种/当前阶段/株龄）与占位图片区
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/button';
import {
  Thermometer, Droplets, Sun, Wind, Activity, Gauge
} from 'lucide-react';
import type { SelectedDetailType, GreenhouseEnvData } from '../types/dashboard.types';

interface BaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDetail: SelectedDetailType;
  /** 该区域对应的实时环境数据（按区域名称匹配，缺省时显示"暂无环境监测数据"） */
  envData?: GreenhouseEnvData | null;
  onEnter: () => void;
}

// 环境参数卡片组件（实时值 + 状态色，非 normal 状态变色提示）
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

export function BaseDetailModal({
  isOpen,
  onClose,
  selectedDetail,
  envData,
  onEnter,
}: BaseDetailModalProps) {
  if (!selectedDetail) return null;

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
        {/* 基本信息（greenhouses 表真实字段） */}
        <div className="mb-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">基本信息</h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">状态</span>
              <span className="text-sm font-medium text-blue-600">{data.status}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">作物名称</span>
              <span className="text-sm font-medium text-blue-600">{data.crop}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">区域类型</span>
              <span className="text-sm font-medium text-blue-600">{data.type}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">区域名称</span>
              <span className="text-sm font-medium text-blue-600">{data.no}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">占地面积</span>
              <span className="text-sm font-medium text-blue-600">{data.area}{data.unit}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">建档日期</span>
              <span className="text-sm font-medium text-blue-600">{data.plantedDate}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">负责人</span>
              <span className="text-sm font-medium text-blue-600">{data.manager}</span>
            </div>
          </div>
        </div>

        {/* 环境参数（IoT 实时数据，无该区域传感器数据时整块提示） */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">
            实时环境参数
            {envData?.lastUpdate && (
              <span className="ml-2 text-xs font-normal text-gray-500">更新于 {envData.lastUpdate}</span>
            )}
          </h4>
          {!envData ? (
            <div className="p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
              该区域暂无环境监测数据
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <EnvParamCard
                  icon={Thermometer}
                  iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
                  label="空气温度"
                  value={envData.airTemp?.value}
                  unit={envData.airTemp?.unit || ''}
                  status={envData.airTemp?.status}
                />
                <EnvParamCard
                  icon={Droplets}
                  iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
                  label="空气湿度"
                  value={envData.airHumidity?.value}
                  unit={envData.airHumidity?.unit || ''}
                  status={envData.airHumidity?.status}
                />
                <EnvParamCard
                  icon={Sun}
                  iconBg="bg-gradient-to-br from-yellow-400 to-amber-500"
                  label="光照强度"
                  value={envData.light?.value}
                  unit={envData.light?.unit || ''}
                  status={envData.light?.status}
                />
                <EnvParamCard
                  icon={Wind}
                  iconBg="bg-gradient-to-br from-teal-400 to-teal-500"
                  label="CO₂"
                  value={envData.co2?.value}
                  unit={envData.co2?.unit || ''}
                  status={envData.co2?.status}
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <EnvParamCard
                  icon={Thermometer}
                  iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
                  label="土壤温度"
                  value={envData.soilTemp?.value}
                  unit={envData.soilTemp?.unit || ''}
                  status={envData.soilTemp?.status}
                />
                <EnvParamCard
                  icon={Droplets}
                  iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
                  label="土壤湿度"
                  value={envData.soilMoisture?.value}
                  unit={envData.soilMoisture?.unit || ''}
                  status={envData.soilMoisture?.status}
                />
                <EnvParamCard
                  icon={Activity}
                  iconBg="bg-gradient-to-br from-purple-400 to-purple-500"
                  label="EC值"
                  value={envData.soilEc?.value}
                  unit={envData.soilEc?.unit || ''}
                  status={envData.soilEc?.status}
                />
                <EnvParamCard
                  icon={Gauge}
                  iconBg="bg-gradient-to-br from-indigo-400 to-indigo-500"
                  label="PH值"
                  value={envData.soilPh?.value}
                  unit={envData.soilPh?.unit || ''}
                  status={envData.soilPh?.status}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
