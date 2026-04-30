/**
 * 产品库存详情弹窗组件
 */

import React from 'react';
import { UnifiedModal } from '../ui/UnifiedModal';
import { ProduceInventory } from '../../types/inventory';

interface ProduceDetailModalProps {
  isOpen: boolean;
  inventory: ProduceInventory | null;
  onClose: () => void;
}

// 品质等级徽章组件
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

export const ProduceDetailModal: React.FC<ProduceDetailModalProps> = ({
  isOpen,
  inventory,
  onClose,
}) => {
  if (!inventory) return null;

  // 计算存储天数
  const storageDays = Math.floor(
    (new Date().getTime() - new Date(inventory.storageDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // 计算剩余保质期天数
  const remainingDays = Math.floor(
    (new Date(inventory.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  // 获取预警状态标签
  const getAlertStatus = () => {
    if (remainingDays <= 0) {
      return { text: '已过期', color: 'bg-red-100 text-red-700' };
    } else if (remainingDays <= 7) {
      return { text: '即将过期', color: 'bg-orange-100 text-orange-700' };
    } else if (inventory.quantity < inventory.alertSettings.minStock) {
      return { text: '库存不足', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { text: '正常', color: 'bg-green-100 text-green-700' };
    }
  };

  const alertStatus = getAlertStatus();

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="产品详情"
      size="xxl"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
            基本信息
          </h3>
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">产品编码</div>
              <div className="text-sm font-medium text-gray-900">{inventory.productCode}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">产品名称</div>
              <div className="text-sm font-medium text-gray-900">{inventory.cropName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">品种</div>
              <div className="text-sm font-medium text-gray-900">{inventory.variety}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">品质等级</div>
              <div className="text-sm">
                <GradeBadge grade={inventory.grade} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">品质评定</div>
              <div className="text-sm font-medium text-gray-900">
                {inventory.quality === 'excellent' ? '优秀' :
                 inventory.quality === 'good' ? '良好' :
                 inventory.quality === 'average' ? '一般' : '较差'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">批次号</div>
              <div className="text-sm font-medium text-gray-900">{inventory.batchCode}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">种植区域</div>
              <div className="text-sm font-medium text-gray-900">{inventory.greenhouseName}</div>
            </div>
          </div>
        </div>

        {/* 库存信息 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            库存信息
          </h3>
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">当前库存</div>
              <div className="text-sm font-medium text-gray-900">
                {inventory.quantity} {inventory.unit}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">最低库存限值</div>
              <div className="text-sm font-medium text-gray-900">
                {inventory.alertSettings.minStock} {inventory.unit}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">最高库存限值</div>
              <div className="text-sm font-medium text-gray-900">
                {inventory.alertSettings.maxStock} {inventory.unit}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">保质期天数</div>
              <div className="text-sm font-medium text-gray-900">
                {inventory.alertSettings.expirationDays} 天
              </div>
            </div>
          </div>
        </div>

        {/* 仓库信息 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
            仓库信息
          </h3>
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">仓库名称</div>
              <div className="text-sm font-medium text-gray-900">{inventory.warehouseName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">存放位置</div>
              <div className="text-sm font-medium text-gray-900">{inventory.storageLocation}</div>
            </div>
          </div>
        </div>

        {/* 时间信息 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
            时间信息
          </h3>
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">采收日期</div>
              <div className="text-sm font-medium text-gray-900">{inventory.harvestDate}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">入库日期</div>
              <div className="text-sm font-medium text-gray-900">{inventory.storageDate}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">过期日期</div>
              <div className="text-sm font-medium text-gray-900">{inventory.expirationDate}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">存储天数</div>
              <div className="text-sm font-medium text-gray-900">{storageDays} 天</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">剩余保质期</div>
              <div className="text-sm font-medium text-gray-900">
                {remainingDays > 0 ? `${remainingDays} 天` : '已过期'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">预警状态</div>
              <div className="text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${alertStatus.color}`}>
                  {alertStatus.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
};

export default ProduceDetailModal;
