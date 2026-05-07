/**
 * 采收产品库存管理页面组件
 * 样式参照库存总览页面（WarehouseOverviewPage）
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, AlertTriangle, AlertCircle, CheckCircle, Clock, Package, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { produceInventory } from '../../data/mockData';
import { useWarehouses } from '../common/settings';
import { ProduceInventory, AlertInfo, InventoryStatus } from '../../types/inventory';
import { Select, Modal } from '../ui/Modal';
import ProduceInventoryToolbar from './ProduceInventoryToolbar';
import { ExportFormatModal } from '../farm/harvest/modals/ExportFormatModal';
import { ProduceDetailModal } from './ProduceDetailModal';
import { ProduceInventoryBatchEditModal } from './ProduceInventoryBatchEditModal';
import { DeleteWarningModal } from './DeleteWarningModal';
import { ProduceInventoryAddModal } from './ProduceInventoryAddModal';
import { getAllVarieties } from '../../services/cropVarietyService';
import * as inventoryService from '../../services/inventoryService';
import { StockType } from '../../types/inventory';

/**
 * 根据作物名称和品种生成11位作物编码
 * 编码规则：类别(2位) + 类型(2位) + 品种(2位) + 子品种1(3位) + 详细品种(2位)
 * @param cropName 作物名称（如：草莓、番茄）
 * @param variety 品种（如：红颜、红果番茄）
 * @returns 11位作物编码，找不到则使用其他类(OT)编码
 */
function generateCropCode(cropName: string, variety: string): string {
  const allVarieties = getAllVarieties();

  // 精确匹配：variety 匹配 subVariety1Name 且 cropName 匹配 varietyName
  const exactMatch = allVarieties.find(v => {
    const varietyMatch = v.subVariety1Name === variety || v.varietyName === variety;
    const cropMatch = v.varietyName === cropName || v.typeName === cropName || v.categoryName === cropName;
    return varietyMatch && cropMatch;
  });

  if (exactMatch && exactMatch.cropCode && exactMatch.cropCode.length >= 9) {
    // 补齐到11位
    return exactMatch.cropCode.padEnd(11, '0').substring(0, 11);
  }

  // 模糊匹配1：只用 variety 匹配 subVariety1Name
  const subMatch = allVarieties.find(v => v.subVariety1Name === variety);
  if (subMatch && subMatch.cropCode && subMatch.cropCode.length >= 9) {
    return subMatch.cropCode.padEnd(11, '0').substring(0, 11);
  }

  // 模糊匹配2：variety 匹配 varietyName
  const varietyMatch = allVarieties.find(v => v.varietyName === variety);
  if (varietyMatch && varietyMatch.cropCode && varietyMatch.cropCode.length >= 9) {
    return varietyMatch.cropCode.padEnd(11, '0').substring(0, 11);
  }

  // 模糊匹配3：cropName 匹配 varietyName
  const cropMatch = allVarieties.find(v => v.varietyName === cropName);
  if (cropMatch && cropMatch.cropCode && cropMatch.cropCode.length >= 9) {
    return cropMatch.cropCode.padEnd(11, '0').substring(0, 11);
  }

  // 模糊匹配4：cropName 匹配 typeName
  const typeMatch = allVarieties.find(v => v.typeName === cropName);
  if (typeMatch && typeMatch.cropCode && typeMatch.cropCode.length >= 9) {
    return typeMatch.cropCode.padEnd(11, '0').substring(0, 11);
  }

  // 找不到匹配，使用其他类(OT)编码
  // OT + 00 + 00 + 000 + 00 = OT0000000000
  return 'OT0000000000';
}

/**
 * 预警状态徽章组件
 */
function AlertBadge({ status, className = '' }: { status: InventoryStatus; className?: string }) {
  const config = {
    in_stock: { label: '正常', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    low_stock: { label: '库存不足', bg: 'bg-blue-100', text: 'text-blue-700', icon: AlertCircle },
    expired: { label: '已过期', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    out_of_stock: { label: '缺货', bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertTriangle },
  };

  const { label, bg, text, icon: Icon } = config[status] || config.in_stock;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1 ${bg} ${text} ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

/**
 * 品质等级徽章组件
 */
function GradeBadge({ grade }: { grade: 'A' | 'B' | 'C' }) {
  const config = {
    A: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'A级' },
    B: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'B级' },
    C: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'C级' },
  };

  const { bg, text, label } = config[grade] || config.A;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

/**
 * 预警信息面板组件
 */
function AlertPanel({ alerts }: { alerts: AlertInfo[] }) {
  const alertCounts = useMemo(() => {
    return {
      total: alerts.length,
      storageTime: alerts.filter(a => a.type === 'storage_time').length,
      lowStock: alerts.filter(a => a.type === 'low_stock').length,
      highStock: alerts.filter(a => a.type === 'high_stock').length,
      expiration: alerts.filter(a => a.type === 'expiration').length,
    };
  }, [alerts]);

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{alertCounts.total}</div>
            <div className="text-sm text-gray-500">预警总数</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{alertCounts.storageTime}</div>
            <div className="text-sm text-gray-500">存储时间预警</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{alertCounts.lowStock}</div>
            <div className="text-sm text-gray-500">库存不足预警</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{alertCounts.highStock}</div>
            <div className="text-sm text-gray-500">库存过多预警</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{alertCounts.expiration}</div>
            <div className="text-sm text-gray-500">保质期预警</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 详情弹窗组件
 */
function DetailModal({ isOpen, inventory, onClose }: { isOpen: boolean; inventory: ProduceInventory | null; onClose: () => void }) {
  if (!isOpen || !inventory) return null;

  const storageDays = Math.floor((new Date().getTime() - new Date(inventory.storageDate).getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.floor((new Date(inventory.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="产品库存详情" size="lg" onSubmit={onClose} submitText="关闭" cancelText="">
      <div className="space-y-6">
        {/* 基本信息卡片 */}
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-emerald-600 block font-medium">作物编码</span>
              <span className="text-lg font-mono font-bold text-emerald-700">{generateCropCode(inventory.cropName, inventory.variety) || inventory.productCode}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-600 block font-medium">作物名称</span>
              <span className="text-sm font-medium text-gray-900">{inventory.cropName}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-600 block font-medium">品种</span>
              <span className="text-sm font-medium text-gray-900">{inventory.variety}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-600 block font-medium">品质等级</span>
              <GradeBadge grade={inventory.grade} />
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左列 */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">库存信息</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">当前库存</span>
                  <span className="text-sm text-gray-900 font-medium">{inventory.quantity} {inventory.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">存储时间</span>
                  <span className="text-sm text-gray-900">{storageDays} 天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">剩余保质期</span>
                  <span className={`text-sm font-medium ${remainingDays < 0 ? 'text-red-600' : remainingDays < 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {remainingDays < 0 ? `已过期 ${Math.abs(remainingDays)} 天` : `${remainingDays} 天`}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">仓库信息</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">仓库</span>
                  <span className="text-sm text-gray-900">{inventory.warehouseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">存放位置</span>
                  <span className="text-sm text-gray-900 font-mono">{inventory.storageLocation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右列 */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">批次追溯</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">生产计划批次号</span>
                  <span className="text-sm text-gray-900 font-mono">{inventory.batchCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">种植区域</span>
                  <span className="text-sm text-gray-900">{inventory.greenhouseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">种植模式</span>
                  <span className="text-sm text-gray-900">{inventory.plantingMode}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">预警设置</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">存储时间预警</span>
                  <span className="text-sm text-gray-900">
                    {inventory.alertSettings.enableStorageTimeAlert ? `>${inventory.alertSettings.storageTimeThreshold}天` : '未启用'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">库存量预警</span>
                  <span className="text-sm text-gray-900">
                    {inventory.alertSettings.enableQuantityAlert
                      ? `${inventory.alertSettings.minQuantityThreshold}-${inventory.alertSettings.maxQuantityThreshold}${inventory.unit}`
                      : '未启用'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 入库记录 */}
        {inventory.inboundRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">入库记录</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="text-left pb-2">日期</th>
                    <th className="text-left pb-2">数量</th>
                    <th className="text-left pb-2">操作员</th>
                    <th className="text-left pb-2">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.inboundRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 text-gray-900">{record.date}</td>
                      <td className="py-2 text-emerald-600 font-medium">+{record.quantity}</td>
                      <td className="py-2 text-gray-900">{record.operator}</td>
                      <td className="py-2 text-gray-500">{record.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 出库记录 */}
        {inventory.outboundRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">出库记录</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="text-left pb-2">日期</th>
                    <th className="text-left pb-2">数量</th>
                    <th className="text-left pb-2">操作员</th>
                    <th className="text-left pb-2">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.outboundRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 text-gray-900">{record.date}</td>
                      <td className="py-2 text-red-600 font-medium">-{record.quantity}</td>
                      <td className="py-2 text-gray-900">{record.operator}</td>
                      <td className="py-2 text-gray-500">{record.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * 预警设置弹窗组件
 */
function AlertSettingsModal({ isOpen, inventory, onClose, onSave }: {
  isOpen: boolean;
  inventory: ProduceInventory | null;
  onClose: () => void;
  onSave: (id: string, settings: ProduceInventory['alertSettings']) => void;
}) {
  const [settings, setSettings] = useState<ProduceInventory['alertSettings'] | null>(null);

  React.useEffect(() => {
    if (inventory) {
      setSettings({ ...inventory.alertSettings });
    }
  }, [inventory]);

  if (!isOpen || !inventory || !settings) return null;

  const handleSave = () => {
    onSave(inventory.id, settings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="预警设置" size="md" onSubmit={handleSave} submitText="保存" cancelText="取消">
      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            产品：<strong>{inventory.cropName}</strong>（{inventory.variety}）
          </p>
        </div>

        {/* 存储时间预警 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4 text-amber-600" />
              启用存储时间预警
            </label>
            <input
              type="checkbox"
              checked={settings.enableStorageTimeAlert}
              onChange={(e) => setSettings({ ...settings, enableStorageTimeAlert: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
          </div>
          {settings.enableStorageTimeAlert && (
            <div className="flex items-center gap-2 ml-6">
              <span className="text-sm text-gray-600">存储超过</span>
              <input
                type="number"
                min="1"
                value={settings.storageTimeThreshold}
                onChange={(e) => setSettings({ ...settings, storageTimeThreshold: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-sm text-gray-600">天预警</span>
            </div>
          )}
        </div>

        {/* 库存量预警 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Package className="w-4 h-4 text-blue-600" />
              启用库存量预警
            </label>
            <input
              type="checkbox"
              checked={settings.enableQuantityAlert}
              onChange={(e) => setSettings({ ...settings, enableQuantityAlert: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
          </div>
          {settings.enableQuantityAlert && (
            <div className="flex items-center gap-2 ml-6">
              <span className="text-sm text-gray-600">库存低于</span>
              <input
                type="number"
                min="0"
                value={settings.minQuantityThreshold}
                onChange={(e) => setSettings({ ...settings, minQuantityThreshold: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-sm text-gray-600">{inventory.unit} 或高于</span>
              <input
                type="number"
                min="0"
                value={settings.maxQuantityThreshold}
                onChange={(e) => setSettings({ ...settings, maxQuantityThreshold: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-sm text-gray-600">{inventory.unit}预警</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * 删除确认弹窗组件
 */
function DeleteConfirmModal({ isOpen, selectedCount, onClose, onConfirm }: {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="确认删除" size="sm" onSubmit={onConfirm} submitText="确认删除" cancelText="取消">
      <div className="py-4">
        <p className="text-gray-600">
          确定要删除选中的 <strong>{selectedCount}</strong> 条产品库存记录吗？
        </p>
        <p className="text-red-500 text-sm mt-2">此操作不可恢复，请谨慎操作。</p>
      </div>
    </Modal>
  );
}

/**
 * 产品库存管理主页面组件
 */
export default function ProduceInventoryPage() {
  const { warehouses } = useWarehouses();

  // 状态
  const [inventoryData, setInventoryData] = useState<ProduceInventory[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    warehouseId: '',
    cropName: '',
    grade: '',
    status: '',
    showLowStock: false,
  });
  const [selectedInventory, setSelectedInventory] = useState<ProduceInventory | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAlertSettingsModal, setShowAlertSettingsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  // 工具栏模式状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  // 批量编辑状态
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchEditedItems, setBatchEditedItems] = useState<Record<string, Partial<ProduceInventory>>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // 数据加载状态
  const [isLoading, setIsLoading] = useState(true);

  // 从 API 加载库存数据
  useEffect(() => {
    const loadInventoryData = async () => {
      setIsLoading(true);
      try {
        // 调用 API 获取库存数据（只获取成品库存）
        const stocks = await inventoryService.getInventoryList({
          stockType: StockType.PRODUCT,
        });

        // 将库存数据转换为 ProduceInventory 格式
        const mappedData: ProduceInventory[] = stocks.map((stock, index) => ({
          id: stock.instanceId || `PI${String(index + 1).padStart(3, '0')}`,
          productCode: stock.businessId || stock.instanceId || '',
          cropName: stock.cropName || '',
          variety: stock.varietyName || '',
          grade: 'A' as const, // 默认A级
          quantity: stock.currentQuantity,
          unit: stock.unit || 'kg',
          warehouseId: stock.baseId || '',
          warehouseName: stock.baseName || '',
          storageLocation: stock.instanceId || '',
          storageDate: stock.inboundDate ? new Date(stock.inboundDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          expirationDate: stock.expiryDate || '',
          batchCode: stock.productionPlanCode || '',
          greenhouseName: '',
          plantingMode: '',
          alertSettings: {
            enableStorageTimeAlert: false,
            storageTimeThreshold: 0,
            enableQuantityAlert: false,
            minQuantityThreshold: 0,
            maxQuantityThreshold: 0,
            minStock: 0,
            maxStock: 0,
            expirationDays: 0,
          },
          inboundRecords: [],
          outboundRecords: [],
          status: stock.status === 'IN_STOCK' ? 'in_stock' : stock.status === 'LOW_STOCK' ? 'low_stock' : 'in_stock',
        }));

        if (mappedData.length > 0) {
          setInventoryData(mappedData);
        } else {
          // API 返回空数据，使用 mock 数据
          setInventoryData(produceInventory);
        }
      } catch (error) {
        console.error('加载库存数据失败，使用 mock 数据:', error);
        // API 调用失败，回退到 mock 数据
        setInventoryData(produceInventory);
      } finally {
        setIsLoading(false);
      }
    };

    loadInventoryData();
  }, []);

  // 计算预警信息
  const alerts = useMemo((): AlertInfo[] => {
    const result: AlertInfo[] = [];
    const today = new Date();

    inventoryData.forEach((item) => {
      const storageDays = Math.floor((today.getTime() - new Date(item.storageDate).getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.floor((new Date(item.expirationDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 存储时间预警
      if (item.alertSettings.enableStorageTimeAlert && storageDays > item.alertSettings.storageTimeThreshold) {
        result.push({
          type: 'storage_time',
          level: storageDays > item.alertSettings.storageTimeThreshold + 7 ? 'critical' : 'warning',
          message: `${item.cropName}存储时间超过${storageDays}天`,
          threshold: item.alertSettings.storageTimeThreshold,
          currentValue: storageDays,
        });
      }

      // 库存不足预警
      if (item.alertSettings.enableQuantityAlert && item.quantity < item.alertSettings.minQuantityThreshold) {
        result.push({
          type: 'low_stock',
          level: 'warning',
          message: `${item.cropName}库存不足（${item.quantity}${item.unit}）`,
          threshold: item.alertSettings.minQuantityThreshold,
          currentValue: item.quantity,
        });
      }

      // 库存过多预警
      if (item.alertSettings.enableQuantityAlert && item.quantity > item.alertSettings.maxQuantityThreshold) {
        result.push({
          type: 'high_stock',
          level: 'info',
          message: `${item.cropName}库存过多（${item.quantity}${item.unit}）`,
          threshold: item.alertSettings.maxQuantityThreshold,
          currentValue: item.quantity,
        });
      }

      // 保质期预警
      if (remainingDays < 0) {
        result.push({
          type: 'expiration',
          level: 'critical',
          message: `${item.cropName}已过期${Math.abs(remainingDays)}天`,
          threshold: 0,
          currentValue: remainingDays,
        });
      } else if (remainingDays < 7) {
        result.push({
          type: 'expiration',
          level: 'warning',
          message: `${item.cropName}即将过期（剩余${remainingDays}天）`,
          threshold: 7,
          currentValue: remainingDays,
        });
      }
    });

    return result;
  }, [inventoryData]);

  // 计算库存不足数量
  const lowStockCount = useMemo(() => {
    return inventoryData.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock').length;
  }, [inventoryData]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return inventoryData.filter((item) => {
      // 搜索过滤
      if (searchText) {
        const search = searchText.toLowerCase();
        const cropCode = generateCropCode(item.cropName, item.variety) || '';
        if (
          !cropCode.toLowerCase().includes(search) &&
          !item.productCode.toLowerCase().includes(search) &&
          !item.cropName.toLowerCase().includes(search) &&
          !item.batchCode.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // 仓库过滤
      if (filters.warehouseId && item.warehouseId !== filters.warehouseId) {
        return false;
      }

      // 作物名称过滤
      if (filters.cropName && item.cropName !== filters.cropName) {
        return false;
      }

      // 品质等级过滤
      if (filters.grade && item.grade !== filters.grade) {
        return false;
      }

      // 状态过滤
      if (filters.status && item.status !== filters.status) {
        return false;
      }

      // 库存不足过滤
      if (filters.showLowStock && item.status !== 'low_stock' && item.status !== 'out_of_stock') {
        return false;
      }

      return true;
    });
  }, [inventoryData, searchText, filters]);

  // 分页数据
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredData.length);
  const displayedData = filteredData.slice(startIdx, endIdx);

  // 获取唯一的作物名称列表
  const cropNames = useMemo(() => {
    const names = [...new Set(inventoryData.map((item) => item.cropName))];
    return names.map((name) => ({ value: name, label: name }));
  }, [inventoryData]);

  // 处理查看详情
  const handleViewDetail = (inventory: ProduceInventory) => {
    setSelectedInventory(inventory);
    setShowDetailModal(true);
  };

  // 处理预警设置
  const handleAlertSettings = (inventory: ProduceInventory) => {
    setSelectedInventory(inventory);
    setShowAlertSettingsModal(true);
  };

  // 保存预警设置
  const handleSaveAlertSettings = (id: string, settings: ProduceInventory['alertSettings']) => {
    setInventoryData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, alertSettings: settings } : item))
    );
  };

  // 计算存储天数
  const getStorageDays = (storageDate: string) => {
    return Math.floor((new Date().getTime() - new Date(storageDate).getTime()) / (1000 * 60 * 60 * 24));
  };

  // 工具栏操作
  const handleLowStockToggle = () => {
    setFilters(prev => ({ ...prev, showLowStock: !prev.showLowStock }));
    setCurrentPage(1);
  };

  const handleBatchEdit = () => {
    if (selectedRows.length === 0) {
      setBatchEditMode(true);
    } else {
      setShowBatchEditModal(true);
      setCurrentBatchEditIndex(0);
      setBatchEditedItems({});
    }
  };

  const handleDelete = () => {
    setDeleteMode(true);
    setSelectedRows([]);
  };

  const handleExport = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelSelection = () => {
    setBatchEditMode(false);
    setDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
    setShowBatchEditModal(false);
    setBatchEditedItems({});
    setCurrentBatchEditIndex(0);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleConfirmBatchEdit = () => {
    // 打开批量编辑弹窗
    if (selectedRows.length > 0) {
      setShowBatchEditModal(true);
      setCurrentBatchEditIndex(0);
      setBatchEditedItems({});
    }
    setBatchEditMode(false);
  };

  // 批量编辑弹窗操作
  const handleBatchItemSelect = (index: number) => {
    setCurrentBatchEditIndex(index);
  };

  const handleBatchFieldChange = (id: string, field: string, value: any) => {
    setBatchEditedItems(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleBatchSaveAll = () => {
    // 保存所有编辑的项
    setInventoryData(prev => prev.map(item => {
      if (batchEditedItems[item.id]) {
        return { ...item, ...batchEditedItems[item.id] };
      }
      return item;
    }));
    setShowBatchEditModal(false);
    setBatchEditedItems({});
    setCurrentBatchEditIndex(0);
    setBatchEditMode(false);
    setSelectedRows([]);
  };

  const handleBatchNext = () => {
    if (currentBatchEditIndex < selectedRows.length - 1) {
      setCurrentBatchEditIndex(prev => prev + 1);
    }
  };

  const handleConfirmDelete = () => {
    // 执行删除
    setInventoryData(prev => prev.filter(item => !selectedRows.includes(item.id)));
    setShowDeleteModal(false);
    setDeleteMode(false);
    setSelectedRows([]);
  };

  const handleShowExportModal = () => {
    setShowExportModal(true);
  };

  const handleConfirmExport = () => {
    handleDoExport();
  };

  const handleDoExport = async () => {
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));
    const exportData = selectedData.length > 0 ? selectedData : filteredData;

    // 生成Excel HTML内容
    const headers = ['作物编码', '作物品种', '品种路径', '等级', '库存数量', '单位', '库存限值', '仓库', '存放位置', '入库时间', '保质期(天)', '过期时间', '存储时间', '预警状态', '备注'];
    const rows = exportData.map(item => [
      generateCropCode(item.cropName, item.variety) || item.productCode, item.variety, item.cropName, item.grade,
      item.quantity, item.unit,
      `${item.alertSettings.minStock}~${item.alertSettings.maxStock}`,
      item.warehouseName, item.storageLocation,
      item.storageDate, item.alertSettings.expirationDays,
      item.expirationDate, `${getStorageDays(item.storageDate)}天`,
      item.status === 'in_stock' ? '正常' : item.status === 'low_stock' ? '库存不足' : item.status === 'expired' ? '已过期' : '缺货',
      '-'
    ]);

    let content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    rows.forEach(row => {
      content += `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`;
    });
    content += '</table></body></html>';

    const mimeType = 'application/vnd.ms-excel;charset=utf-8';
    const extension = 'xls';
    const fileName = `作物库存汇总表_${new Date().toISOString().slice(0, 10)}.${extension}`;

    // 统一的导出函数（处理 File System Access API 和 fallback）
    const doExport = async () => {
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'Excel Files',
                accept: { [mimeType]: ['.' + extension] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
        } catch (err) {
          // 用户取消选择不算错误
          if ((err as Error).name !== 'AbortError') {
            console.error('Export failed:', err);
            // 降级到 fallback 下载方式
            downloadAsBlob();
          }
        }
      } else {
        downloadAsBlob();
      }
    };

    // Fallback 下载方式（兼容不支持 File System Access API 的浏览器）
    const downloadAsBlob = () => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    doExport();

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  const isAllSelected = filteredData.length > 0 && selectedRows.length === filteredData.length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">作物库存</h1>
            <p className="text-sm text-gray-500 mt-1">管理采收入库产品的库存状态和预警设置</p>
          </div>
        </div>
      </div>

      {/* 预警信息面板 */}
      <AlertPanel alerts={alerts} />

      {/* 筛选工具栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索产品编码、作物名称、批次号..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 搜索和重置按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchText('');
                setFilters({ ...filters, warehouseId: '', cropName: '', grade: '', status: '' });
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
          </div>

          {/* 仓库筛选 */}
          <div className="w-40">
            <Select
              value={filters.warehouseId}
              onChange={(e) => { setFilters({ ...filters, warehouseId: e.target.value }); setCurrentPage(1); }}
              options={[
                { value: '', label: '全部仓库' },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
          </div>

          {/* 作物类型筛选 */}
          <div className="w-32">
            <Select
              value={filters.cropName}
              onChange={(e) => { setFilters({ ...filters, cropName: e.target.value }); setCurrentPage(1); }}
              options={[
                { value: '', label: '全部作物' },
                ...cropNames,
              ]}
            />
          </div>

          {/* 品质等级筛选 */}
          <div className="w-28">
            <Select
              value={filters.grade}
              onChange={(e) => { setFilters({ ...filters, grade: e.target.value }); setCurrentPage(1); }}
              options={[
                { value: '', label: '全部等级' },
                { value: 'A', label: 'A级' },
                { value: 'B', label: 'B级' },
                { value: 'C', label: 'C级' },
              ]}
            />
          </div>

          {/* 状态筛选 */}
          <div className="w-32">
            <Select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1); }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'in_stock', label: '正常' },
                { value: 'low_stock', label: '库存不足' },
                { value: 'expired', label: '已过期' },
                { value: 'out_of_stock', label: '缺货' },
              ]}
            />
          </div>

        </div>
      </div>

      {/* 工具栏 */}
      <ProduceInventoryToolbar
        title="作物库存汇总表"
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows}
        lowStockCount={lowStockCount}
        filters={filters}
        onLowStockToggle={handleLowStockToggle}
        onBatchEdit={handleBatchEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        onAdd={() => setShowAddModal(true)}
        onConfirmBatchEdit={handleConfirmBatchEdit}
        onCancelBatchEdit={handleCancelSelection}
        onConfirmDelete={() => setShowDeleteModal(true)}
        onCancelDelete={handleCancelSelection}
        onConfirmExport={handleShowExportModal}
        onCancelExport={handleCancelSelection}
      />

      {/* 数据表格 */}
      <div style={{ maxHeight: 'calc(100vh - 420px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* 选择操作栏 */}
        {(exportMode || batchEditMode || deleteMode) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {isAllSelected ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 表格容器 - 整体横向滚动，底部显示滚动条 */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table className="w-full" style={{ minWidth: '1400px', tableLayout: 'fixed' }}>
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(exportMode || batchEditMode || deleteMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-36">作物编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">作物品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">品种路径</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-16">等级</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">库存数量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">库存限值</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">仓库</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">存放位置</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">入库时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">保质期(天)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">过期时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">存储时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">预警状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {displayedData.length === 0 ? (
                <tr>
                  <td colSpan={(exportMode || batchEditMode || deleteMode) ? 16 : 15} className="px-4 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无数据</p>
                  </td>
                </tr>
              ) : (
                displayedData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    {(exportMode || batchEditMode || deleteMode) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td
                      className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline whitespace-nowrap"
                      onClick={() => handleViewDetail(item)}
                    >
                      {generateCropCode(item.cropName, item.variety) || item.productCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.variety}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.cropName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <GradeBadge grade={item.grade} />
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={`font-medium ${item.status === 'low_stock' ? 'text-red-600' : item.status === 'out_of_stock' ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {item.alertSettings.minStock} ~ {item.alertSettings.maxStock} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">{item.storageLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.storageDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.alertSettings.expirationDays} 天</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.expirationDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{getStorageDays(item.storageDate)} 天</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <AlertBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {item.inboundRecords.length > 0 ? item.inboundRecords[item.inboundRecords.length - 1].operator : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      -
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredData.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 产品详情弹窗 */}
      <ProduceDetailModal
        isOpen={showDetailModal}
        inventory={selectedInventory}
        onClose={() => setShowDetailModal(false)}
      />

      {/* 批量编辑弹窗 */}
      <ProduceInventoryBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        inventoryData={inventoryData}
        batchEditedItems={batchEditedItems}
        currentEditIndex={currentBatchEditIndex}
        onClose={() => { setShowBatchEditModal(false); setBatchEditedItems({}); setCurrentBatchEditIndex(0); }}
        onItemSelect={handleBatchItemSelect}
        onFieldChange={handleBatchFieldChange}
        onSaveAll={handleBatchSaveAll}
        onNext={handleBatchNext}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
        selectedCount={selectedRows.length}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* 新增库存弹窗 */}
      <ProduceInventoryAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(newData) => {
          const newRecord: ProduceInventory = {
            ...newData,
            id: `PI${String(produceInventory.length + 1).padStart(3, '0')}`,
          };
          // 实际应用中这里会调用API，现在只做模拟
          console.log('新增库存记录:', newRecord);
          alert('新增成功！');
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
