/**
 * 入库详情弹窗组件
 * 从 InboundModals 拆分出来，独立管理详情弹窗
 */

import React from 'react';
import { Package } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

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

  const totalQuantity = record.materials.reduce((sum, m) => sum + Number(m.quantity), 0);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'voided': return '已作废';
      default: return '待审核';
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'voided': return 'text-gray-500';
      default: return 'text-amber-600';
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="入库记录详情"
      size="xxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>关闭</Button>
        </div>
      }
    >
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
          <Table className="min-w-full text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">物料编码</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">物料名称</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">分类</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">规格</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">条形码</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">单位</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">数量</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">单价</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">存放位置</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">批号</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">生产日期</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">有效期至</TableHead>
                <TableHead className="text-sm font-semibold text-gray-600 whitespace-nowrap">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {record.materials.map((m) => (
                <TableRow key={m.id} className="hover:bg-gray-50">
                  <TableCell className="text-xs text-blue-600 font-medium whitespace-nowrap">{m.code}</TableCell>
                  <TableCell className="text-xs text-gray-900 whitespace-nowrap">{m.name}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.category || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.specification || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.barcode || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.unit}</TableCell>
                  <TableCell className="text-xs text-gray-900 whitespace-nowrap">{m.quantity}</TableCell>
                  <TableCell className="text-xs text-gray-900 whitespace-nowrap">{m.price}元</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.location || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.batchNo || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.productionDate || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.expiryDate || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{m.remarks || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </UnifiedModal>
  );
};

export default InboundDetailModal;
