/**
 * 入库详情弹窗组件
 * 从 InboundModals 拆分出来，独立管理详情弹窗
 */

import React from 'react';
import { X, Package } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';

interface InboundDetailModalProps {
  record: InboundRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InboundDetailModal: React.FC<InboundDetailModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !record) return null;

  // 计算物料总数量
  const totalQuantity = record.materials.reduce((sum, m) => sum + Number(m.quantity), 0);

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'voided':
        return '已作废';
      default:
        return '待审核';
    }
  };

  // 获取状态样式
  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'voided':
        return 'text-gray-500';
      default:
        return 'text-amber-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">入库记录详情</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* 基本信息卡片 */}
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-xs text-emerald-600 block font-medium">入库单号</span>
                <span className="text-lg font-mono font-bold text-emerald-700">{record.code}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">入库日期</span>
                <span className="text-sm font-medium text-gray-900">{record.inboundDate}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">供应商</span>
                <span className="text-sm font-medium text-gray-900">{record.supplier}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">操作员</span>
                <span className="text-sm font-medium text-gray-900">{record.operator}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">状态</span>
                <span className={`text-sm font-medium ${getStatusClassName(record.status)}`}>
                  {getStatusText(record.status)}
                </span>
              </div>
            </div>
            {/* 物料统计 */}
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <span className="text-xs text-emerald-600">物料统计：</span>
              <span className="text-sm font-medium text-gray-900 ml-2">
                共 {record.materials.length} 种物料，合计 {totalQuantity} 件
              </span>
            </div>
          </div>

          {/* 物料明细 */}
          <div>
            <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              物料明细
            </h4>
            <div className="overflow-auto rounded-lg border border-gray-200 max-h-96">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">分类</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">规格</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">条形码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">单位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">数量</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">单价</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">供应商</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">存放位置</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">批号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">生产日期</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">有效期至</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">备注</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {record.materials.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-blue-600 font-medium whitespace-nowrap">{m.materialCode}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.materialName}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.category || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.specification || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.barcode || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.unit}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.quantity}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.price}元</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.supplier || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.location || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.batchNo || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.productionDate || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.expiryDate || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InboundDetailModal;
