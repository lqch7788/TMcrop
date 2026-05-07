/**
 * 物料设备状态面板组件
 * 显示物料库存和设备状态信息
 */

import React from 'react';
import {
  Package,
  AlertTriangle,
  Wrench,
  XCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Boxes,
  Cpu,
} from 'lucide-react';
import type { Material, Equipment, EquipmentAlert, MaterialEquipmentOverview } from '../../types/material';

interface MaterialEquipmentPanelProps {
  overview: MaterialEquipmentOverview;
  materials?: Material[];
  equipments?: Equipment[];
  equipmentAlerts?: EquipmentAlert[];
  onAlertClick?: (alert: EquipmentAlert) => void;
  onMaterialClick?: (material: Material) => void;
  onEquipmentClick?: (equipment: Equipment) => void;
}

export const MaterialEquipmentPanel: React.FC<MaterialEquipmentPanelProps> = ({
  overview,
  materials = [],
  equipments = [],
  equipmentAlerts = [],
  onAlertClick,
  onMaterialClick,
  onEquipmentClick,
}) => {
  const [expandedSection, setExpandedSection] = React.useState<'materials' | 'equipment' | 'alerts' | null>('alerts');

  const toggleSection = (section: 'materials' | 'equipment' | 'alerts') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // 获取物料状态颜色
  const getMaterialStatusColor = (status: Material['status']) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'low_stock': return 'text-amber-600 bg-amber-50';
      case 'out_of_stock': return 'text-red-600 bg-red-50';
      case 'expired': return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取设备状态颜色
  const getEquipmentStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50';
      case 'maintenance': return 'text-amber-600 bg-amber-50';
      case 'broken': return 'text-red-600 bg-red-50';
      case 'idle': return 'text-blue-600 bg-blue-50';
    }
  };

  // 获取告警级别颜色
  const getAlertLevelColor = (level: EquipmentAlert['alertLevel']) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-indigo-500" />
          物料设备状态
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          物料库存和设备运行状态监控
        </p>
      </div>

      <div className="p-3 space-y-3">
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-2">
          {/* 物料统计 */}
          <div className="p-2 bg-emerald-50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <Package className="w-4 h-4 text-emerald-600" />
              <span className="text-lg font-bold text-emerald-700">{overview.materialStats.total}</span>
            </div>
            <div className="text-xs text-emerald-600">物料种类</div>
          </div>
          <div className="p-2 bg-red-50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-lg font-bold text-red-700">{overview.materialStats.outOfStock}</span>
            </div>
            <div className="text-xs text-red-600">缺货</div>
          </div>
          {/* 设备统计 */}
          <div className="p-2 bg-blue-50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-bold text-blue-700">{overview.equipmentStats.total}</span>
            </div>
            <div className="text-xs text-blue-600">设备总数</div>
          </div>
          <div className="p-2 bg-red-50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-lg font-bold text-red-700">{overview.equipmentAlerts.length}</span>
            </div>
            <div className="text-xs text-red-600">设备告警</div>
          </div>
        </div>

        {/* 设备告警列表 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('alerts')}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-gray-900">设备告警</span>
              {overview.equipmentAlerts.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                  {overview.equipmentAlerts.length}
                </span>
              )}
            </div>
            {expandedSection === 'alerts' ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {expandedSection === 'alerts' && (
            <div className="p-2 max-h-48 overflow-y-auto">
              {equipmentAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                  <CheckCircle2 className="w-8 h-8 mb-1 text-green-400" />
                  <p className="text-sm">暂无设备告警</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {equipmentAlerts.map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => onAlertClick?.(alert)}
                      className={`p-2 rounded-lg border cursor-pointer hover:shadow-sm ${getAlertLevelColor(alert.alertLevel)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{alert.equipmentName}</span>
                        <span className="text-xs">
                          {alert.alertLevel === 'critical' ? '严重' :
                           alert.alertLevel === 'warning' ? '警告' : '提示'}
                        </span>
                      </div>
                      <p className="text-xs opacity-80">{alert.message}</p>
                      <div className="text-xs mt-1 opacity-60">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 物料列表 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('materials')}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-500" />
              <span className="font-medium text-gray-900">物料库存</span>
              {(overview.materialStats.lowStock > 0 || overview.materialStats.outOfStock > 0) && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                  {overview.materialStats.lowStock + overview.materialStats.outOfStock} 需要关注
                </span>
              )}
            </div>
            {expandedSection === 'materials' ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {expandedSection === 'materials' && (
            <div className="p-2 max-h-48 overflow-y-auto">
              {materials.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">暂无物料数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {materials
                    .filter(m => m.status !== 'available')
                    .map(material => (
                      <div
                        key={material.id}
                        onClick={() => onMaterialClick?.(material)}
                        className="p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{material.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${getMaterialStatusColor(material.status)}`}>
                            {material.status === 'low_stock' ? '库存低' :
                             material.status === 'out_of_stock' ? '缺货' : '过期'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{material.code}</span>
                          <span>库存: {material.quantity} {material.unit}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 设备列表 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('equipment')}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900">设备状态</span>
              {(overview.equipmentStats.broken > 0 || overview.equipmentStats.maintenance > 0) && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                  {overview.equipmentStats.broken + overview.equipmentStats.maintenance} 需要关注
                </span>
              )}
            </div>
            {expandedSection === 'equipment' ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {expandedSection === 'equipment' && (
            <div className="p-2 max-h-48 overflow-y-auto">
              {equipments.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">暂无设备数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {equipments
                    .filter(e => e.status !== 'normal')
                    .map(equipment => (
                      <div
                        key={equipment.id}
                        onClick={() => onEquipmentClick?.(equipment)}
                        className="p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{equipment.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${getEquipmentStatusColor(equipment.status)}`}>
                            {equipment.status === 'broken' ? '故障' :
                             equipment.status === 'maintenance' ? '保养中' : '闲置'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{equipment.code}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {equipment.totalUsageHours}h
                          </span>
                        </div>
                        {equipment.remark && (
                          <p className="text-xs text-amber-600 mt-1">{equipment.remark}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialEquipmentPanel;
