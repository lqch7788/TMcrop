/**
 * 作物库存新增弹窗组件
 */

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ProduceInventory, StockType } from '../../types/inventory';
import { produceInventory } from '../../data/mockData';
import { useWarehouses } from '../common/settings';

interface ProduceInventoryAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: Omit<ProduceInventory, 'id'>) => void;
}

export const ProduceInventoryAddModal: React.FC<ProduceInventoryAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const { warehouses } = useWarehouses();

  // 获取下一个ID
  const getNextId = () => {
    const maxId = produceInventory.reduce((max, item) => {
      const num = parseInt(item.id.replace('PI', ''), 10);
      return num > max ? num : max;
    }, 0);
    return `PI${String(maxId + 1).padStart(3, '0')}`;
  };

  // 获取下一个业务ID
  const getNextBusinessId = (stockType: StockType) => {
    const prefix = stockType === StockType.SEED ? 'SR' : stockType === StockType.SEEDLING ? 'SL' : 'H';
    const count = produceInventory.filter(item => item.stockType === stockType).length;
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  };

  // 获取下一个批次号
  const getNextBatchCode = (stockType: StockType) => {
    const prefix = stockType === StockType.SEED ? 'SZ' : stockType === StockType.SEEDLING ? 'SM' : 'FQ';
    const year = new Date().getFullYear();
    const count = produceInventory.filter(item => item.stockType === stockType).length;
    return `${prefix}${year}-${String(count + 1).padStart(3, '0')}`;
  };

  // 表单状态
  const [stockType, setStockType] = useState<StockType>(StockType.PRODUCT);
  const [cropName, setCropName] = useState('');
  const [variety, setVariety] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<string>('公斤');
  const [grade, setGrade] = useState<'A' | 'B' | 'C'>('A');
  const [quality, setQuality] = useState<'excellent' | 'good' | 'average' | 'poor'>('good');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [warehouseName, setWarehouseName] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [storageDate, setStorageDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expirationDays, setExpirationDays] = useState<number>(30);
  const [greenhouseName, setGreenhouseName] = useState<string>('');
  const [plantingMode, setPlantingMode] = useState<string>('');
  const [batchCode, setBatchCode] = useState<string>('');
  const [harvestDate, setHarvestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [operator, setOperator] = useState<string>('系统管理员');

  // 根据库存类型更新默认值
  useEffect(() => {
    if (!isOpen) return;
    setBatchCode(getNextBatchCode(stockType));
    // 根据类型设置默认单位和仓库
    if (stockType === StockType.SEED) {
      setUnit('粒');
      const seedWarehouse = warehouses.find(w => w.name.includes('种源'));
      if (seedWarehouse) {
        setWarehouseId(seedWarehouse.id);
        setWarehouseName(seedWarehouse.name);
      }
    } else if (stockType === StockType.SEEDLING) {
      setUnit('株');
      const seedlingWarehouse = warehouses.find(w => w.name.includes('种苗'));
      if (seedlingWarehouse) {
        setWarehouseId(seedlingWarehouse.id);
        setWarehouseName(seedlingWarehouse.name);
      }
    } else {
      setUnit('公斤');
      const productWarehouse = warehouses.find(w => w.name.includes('成品'));
      if (productWarehouse) {
        setWarehouseId(productWarehouse.id);
        setWarehouseName(productWarehouse.name);
      }
    }
  }, [stockType, isOpen]);

  // 仓库变化时更新仓库名称
  const handleWarehouseChange = (id: string) => {
    setWarehouseId(id);
    const warehouse = warehouses.find(w => w.id === id);
    if (warehouse) {
      setWarehouseName(warehouse.name);
    }
  };

  // 计算过期日期
  const expirationDate = (() => {
    const date = new Date(storageDate);
    date.setDate(date.getDate() + expirationDays);
    return date.toISOString().split('T')[0];
  })();

  // 重置表单
  const resetForm = () => {
    setStockType(StockType.PRODUCT);
    setCropName('');
    setVariety('');
    setProductCode('');
    setQuantity(0);
    setUnit('公斤');
    setGrade('A');
    setQuality('good');
    setWarehouseId('');
    setWarehouseName('');
    setStorageLocation('');
    setStorageDate(new Date().toISOString().split('T')[0]);
    setExpirationDays(30);
    setGreenhouseName('');
    setPlantingMode('');
    setBatchCode('');
    setHarvestDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
  };

  // 提交表单
  const handleSubmit = () => {
    if (!cropName || !variety || !warehouseId || quantity <= 0) {
      alert('请填写必填字段');
      return;
    }

    const newRecord: Omit<ProduceInventory, 'id'> = {
      harvestRecordId: getNextBusinessId(stockType),
      productCode: productCode || `XX${Date.now()}`.slice(-8),
      cropName,
      variety,
      stockType,
      quantity,
      unit,
      grade,
      quality,
      warehouseId,
      warehouseName,
      storageLocation,
      harvestDate,
      storageDate,
      expirationDate,
      alertSettings: {
        enableStorageTimeAlert: true,
        storageTimeThreshold: Math.floor(expirationDays * 0.8),
        enableQuantityAlert: true,
        minQuantityThreshold: Math.floor(quantity * 0.3),
        maxQuantityThreshold: Math.floor(quantity * 1.5),
        minStock: Math.floor(quantity * 0.3),
        maxStock: Math.floor(quantity * 1.5),
        expirationDays,
      },
      batchCode,
      greenhouseName,
      plantingMode,
      status: 'in_stock',
      inboundRecords: [
        {
          id: `IT${Date.now()}`.slice(-8),
          type: 'inbound',
          quantity,
          date: storageDate,
          operator: operator || '系统管理员',
          remarks: remarks || '新增入库',
        },
      ],
      outboundRecords: [],
    };

    onAdd(newRecord);
    resetForm();
    onClose();
  };

  // 关闭弹窗时重置
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="新增库存记录"
      size="lg"
      onSubmit={handleSubmit}
      submitText="确认添加"
      cancelText="取消"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* 作物形态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            作物形态 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: StockType.SEED, label: '种源', desc: '种子/种球' },
              { value: StockType.SEEDLING, label: '种苗', desc: '幼苗/秧苗' },
              { value: StockType.PRODUCT, label: '成品', desc: '采收成品' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStockType(item.value)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  stockType === item.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 作物名称和品种 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作物名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              placeholder="如：草莓、番茄、黄瓜"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              品种 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="如：红颜、千禧果"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 产品编码和批次号 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品编码</label>
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="自动生成或手动输入"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">批次号</label>
            <input
              type="text"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              placeholder="系统自动生成"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
            />
          </div>
        </div>

        {/* 数量和单位 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="公斤">公斤</option>
              <option value="粒">粒</option>
              <option value="株">株</option>
              <option value="个">个</option>
              <option value="箱">箱</option>
              <option value="盒">盒</option>
            </select>
          </div>
        </div>

        {/* 品质等级和品质 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品质等级</label>
            <div className="flex gap-2">
              {(['A', 'B', 'C'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    grade === g
                      ? g === 'A' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                        g === 'B' ? 'border-blue-500 bg-blue-50 text-blue-700' :
                        'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {g}级
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品质评定</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as typeof quality)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="excellent">优秀</option>
              <option value="good">良好</option>
              <option value="average">一般</option>
              <option value="poor">较差</option>
            </select>
          </div>
        </div>

        {/* 仓库和存放位置 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              仓库 <span className="text-red-500">*</span>
            </label>
            <select
              value={warehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择仓库</option>
              {stockType === StockType.SEED && warehouses.filter(w => w.name.includes('种源') || w.name.includes('常温')).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
              {stockType === StockType.SEEDLING && warehouses.filter(w => w.name.includes('种苗') || w.name.includes('常温')).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
              {stockType === StockType.PRODUCT && warehouses.filter(w => w.name.includes('成品') || w.name.includes('冷库')).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
              {(!stockType || stockType === StockType.PRODUCT) && warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">存放位置</label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="如：A区-01-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 入库时间和保质期 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">入库日期</label>
            <input
              type="date"
              value={storageDate}
              onChange={(e) => setStorageDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">保质期（天）</label>
            <input
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 采收日期和过期日期 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">采收日期</label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">过期日期</label>
            <input
              type="date"
              value={expirationDate}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
          </div>
        </div>

        {/* 操作人 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
          <input
            type="text"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="默认为系统管理员"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 种植区域和种植模式 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">种植区域</label>
            <input
              type="text"
              value={greenhouseName}
              onChange={(e) => setGreenhouseName(e.target.value)}
              placeholder="如：日光温室1号"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">种植模式</label>
            <select
              value={plantingMode}
              onChange={(e) => setPlantingMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择</option>
              <option value="土壤种植">土壤种植</option>
              <option value="无土栽培">无土栽培</option>
              <option value="水培">水培</option>
              <option value="基质栽培">基质栽培</option>
              <option value="穴盘育苗">穴盘育苗</option>
              <option value="种子繁殖">种子繁殖</option>
            </select>
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="可选填写备注信息"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
};

export default ProduceInventoryAddModal;
