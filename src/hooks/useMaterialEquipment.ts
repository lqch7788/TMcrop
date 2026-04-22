/**
 * 物料设备管理 Hook
 * 提供物料、设备的库存和使用状态管理
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Material,
  Equipment,
  MaterialUsageRecord,
  EquipmentUsageRecord,
  EquipmentAlert,
  MaterialEquipmentOverview,
  MaterialStatus,
  EquipmentStatus,
} from '../types/material';
import {
  MOCK_MATERIALS,
  MOCK_EQUIPMENTS,
  MOCK_EQUIPMENT_ALERTS,
} from '../types/material';

// ============================================
// Hook 返回类型
// ============================================

export interface UseMaterialEquipmentReturn {
  // 物料
  materials: Material[];
  getMaterialById: (id: string) => Material | undefined;
  getMaterialsByType: (type: Material['type']) => Material[];
  lowStockMaterials: Material[];
  outOfStockMaterials: Material[];

  // 设备
  equipments: Equipment[];
  getEquipmentById: (id: string) => Equipment | undefined;
  getEquipmentsByType: (type: Equipment['type']) => Equipment[];
  getEquipmentsByStatus: (status: EquipmentStatus) => Equipment[];
  brokenEquipments: Equipment[];
  maintenanceEquipments: Equipment[];

  // 设备告警
  equipmentAlerts: EquipmentAlert[];
  unacknowledgedAlerts: EquipmentAlert[];
  criticalAlerts: EquipmentAlert[];
  acknowledgeAlert: (alertId: string, userId: string) => void;

  // 使用记录
  materialUsageRecords: MaterialUsageRecord[];
  equipmentUsageRecords: EquipmentUsageRecord[];
  addMaterialUsage: (record: Omit<MaterialUsageRecord, 'id'>) => void;
  addEquipmentUsage: (record: Omit<EquipmentUsageRecord, 'id'>) => void;

  // 概览统计
  overview: MaterialEquipmentOverview;

  // 物料状态更新
  updateMaterialStatus: (materialId: string, status: MaterialStatus, quantity?: number) => void;
}

// ============================================
// Hook 实现
// ============================================

export function useMaterialEquipment(): UseMaterialEquipmentReturn {
  // 物料状态
  const [materials, setMaterials] = useState<Material[]>(MOCK_MATERIALS);

  // 设备状态
  const [equipments, setEquipments] = useState<Equipment[]>(MOCK_EQUIPMENTS);

  // 设备告警
  const [equipmentAlerts, setEquipmentAlerts] = useState<EquipmentAlert[]>(MOCK_EQUIPMENT_ALERTS);

  // 使用记录
  const [materialUsageRecords, setMaterialUsageRecords] = useState<MaterialUsageRecord[]>([]);
  const [equipmentUsageRecords, setEquipmentUsageRecords] = useState<EquipmentUsageRecord[]>([]);

  // 物料查询
  const getMaterialById = useCallback((id: string) => {
    return materials.find(m => m.id === id);
  }, [materials]);

  const getMaterialsByType = useCallback((type: Material['type']) => {
    return materials.filter(m => m.type === type);
  }, [materials]);

  // 设备查询
  const getEquipmentById = useCallback((id: string) => {
    return equipments.find(e => e.id === id);
  }, [equipments]);

  const getEquipmentsByType = useCallback((type: Equipment['type']) => {
    return equipments.filter(e => e.type === type);
  }, [equipments]);

  const getEquipmentsByStatus = useCallback((status: EquipmentStatus) => {
    return equipments.filter(e => e.status === status);
  }, [equipments]);

  // 物料统计
  const lowStockMaterials = useMemo(() => {
    return materials.filter(m => m.status === 'low_stock');
  }, [materials]);

  const outOfStockMaterials = useMemo(() => {
    return materials.filter(m => m.status === 'out_of_stock');
  }, [materials]);

  // 设备统计
  const brokenEquipments = useMemo(() => {
    return equipments.filter(e => e.status === 'broken');
  }, [equipments]);

  const maintenanceEquipments = useMemo(() => {
    return equipments.filter(e => e.status === 'maintenance');
  }, [equipments]);

  // 告警统计
  const unacknowledgedAlerts = useMemo(() => {
    return equipmentAlerts.filter(a => !a.acknowledged);
  }, [equipmentAlerts]);

  const criticalAlerts = useMemo(() => {
    return equipmentAlerts.filter(a => a.alertLevel === 'critical' && !a.acknowledged);
  }, [equipmentAlerts]);

  // 确认告警
  const acknowledgeAlert = useCallback((alertId: string, userId: string) => {
    setEquipmentAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedBy: userId,
            acknowledgedAt: new Date().toISOString(),
          }
        : alert
    ));
  }, []);

  // 添加物料使用记录
  const addMaterialUsage = useCallback((record: Omit<MaterialUsageRecord, 'id'>) => {
    const newRecord: MaterialUsageRecord = {
      ...record,
      id: `mur_${Date.now()}`,
    };
    setMaterialUsageRecords(prev => [newRecord, ...prev]);

    // 更新物料库存
    setMaterials(prev => prev.map(m => {
      if (m.id === record.materialId) {
        const newQuantity = Math.max(0, m.quantity - record.quantity);
        let newStatus: MaterialStatus = m.status;
        if (newQuantity === 0) {
          newStatus = 'out_of_stock';
        } else if (newQuantity < m.minStock) {
          newStatus = 'low_stock';
        } else {
          newStatus = 'available';
        }
        return { ...m, quantity: newQuantity, status: newStatus };
      }
      return m;
    }));
  }, []);

  // 添加设备使用记录
  const addEquipmentUsage = useCallback((record: Omit<EquipmentUsageRecord, 'id'>) => {
    const newRecord: EquipmentUsageRecord = {
      ...record,
      id: `eur_${Date.now()}`,
    };
    setEquipmentUsageRecords(prev => [newRecord, ...prev]);

    // 更新设备累计使用时长
    setEquipments(prev => prev.map(e => {
      if (e.id === record.equipmentId) {
        return {
          ...e,
          totalUsageHours: e.totalUsageHours + record.duration,
        };
      }
      return e;
    }));
  }, []);

  // 更新物料状态
  const updateMaterialStatus = useCallback((materialId: string, status: MaterialStatus, quantity?: number) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === materialId) {
        return {
          ...m,
          status,
          ...(quantity !== undefined && { quantity }),
        };
      }
      return m;
    }));
  }, []);

  // 概览统计
  const overview = useMemo<MaterialEquipmentOverview>(() => {
    const today = new Date().toISOString().split('T')[0];

    return {
      materialStats: {
        total: materials.length,
        available: materials.filter(m => m.status === 'available').length,
        lowStock: materials.filter(m => m.status === 'low_stock').length,
        outOfStock: materials.filter(m => m.status === 'out_of_stock').length,
        expired: materials.filter(m => m.status === 'expired').length,
      },
      equipmentStats: {
        total: equipments.length,
        normal: equipments.filter(e => e.status === 'normal').length,
        maintenance: equipments.filter(e => e.status === 'maintenance').length,
        broken: equipments.filter(e => e.status === 'broken').length,
        idle: equipments.filter(e => e.status === 'idle').length,
      },
      todayUsage: {
        materials: materialUsageRecords.filter(r => r.usageDate.startsWith(today)),
        equipment: equipmentUsageRecords.filter(r => r.usageDate.startsWith(today)),
      },
      equipmentAlerts: unacknowledgedAlerts,
    };
  }, [materials, equipments, materialUsageRecords, equipmentUsageRecords, unacknowledgedAlerts]);

  return {
    // 物料
    materials,
    getMaterialById,
    getMaterialsByType,
    lowStockMaterials,
    outOfStockMaterials,

    // 设备
    equipments,
    getEquipmentById,
    getEquipmentsByType,
    getEquipmentsByStatus,
    brokenEquipments,
    maintenanceEquipments,

    // 告警
    equipmentAlerts,
    unacknowledgedAlerts,
    criticalAlerts,
    acknowledgeAlert,

    // 使用记录
    materialUsageRecords,
    equipmentUsageRecords,
    addMaterialUsage,
    addEquipmentUsage,

    // 概览
    overview,

    // 状态更新
    updateMaterialStatus,
  };
}
