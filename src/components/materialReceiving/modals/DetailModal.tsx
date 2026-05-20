import React from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { MaterialReceivingRecord, MaterialItem } from '../../../types/materialReceiving';

interface DetailModalProps {
  isOpen: boolean;
  record: MaterialReceivingRecord;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ isOpen, record, onClose }) => {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="领料单详情"
      size="xxl"
      showFooter={false}
    >
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-sm text-gray-500">领料单号</Label>
          <p className="font-mono font-semibold text-gray-900">{record.code}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">申请日期</Label>
          <p className="font-semibold text-gray-900">{record.date}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">申请人</Label>
          <p className="font-semibold text-gray-900">{record.applicant}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">部门</Label>
          <p className="font-semibold text-gray-900">{record.department}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">库存地点</Label>
          <p className="font-semibold text-gray-900">{record.warehouseLocation}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">物料种类</Label>
          <p className="font-semibold text-gray-900">{record.materials.length > 0 ? `${record.materials.length}种` : '-'}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">种植区域/用途</Label>
          <p className="font-semibold text-gray-900">{record.plantArea}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">审核人</Label>
          <p className="font-semibold text-gray-900">{record.reviewer}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">生产计划批次号</Label>
          <p className="font-semibold text-gray-900">{record.productionBatchCode}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">状态</Label>
          <p className="font-semibold">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              record.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
              record.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
              record.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
              record.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
              record.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
              'bg-gray-100 text-blue-700'
            }`}>
              {record.status}
            </span>
          </p>
          {record.statusClass === 'rejected' && record.rejectReason && (
            <p className="text-xs text-red-600 mt-1">拒绝原因：{record.rejectReason}</p>
          )}
        </div>
      </div>
      {record.materials.length > 0 && (
        <div className="mt-6">
          <Label className="text-sm text-gray-500 block mb-2">物料明细</Label>
          <Table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <TableHeader className="bg-blue-600">
              <TableRow>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">规格</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">单位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">申领数量</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">当前库存</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">单价(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">小计(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">仓库货位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {record.materials.map((material: MaterialItem, idx: number) => {
                const subtotal = material.requestedQuantity * material.unitPrice;
                const isStockWarning = material.requestedQuantity > material.stockQuantity;
                return (
                  <TableRow key={idx} className="hover:bg-emerald-100">
                    <TableCell className="px-3 py-2 text-sm text-blue-700 font-mono">{material.materialCode}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.materialName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.spec}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.unit}</TableCell>
                    <TableCell className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-700'}`}>{material.requestedQuantity}{isStockWarning && ' (!)'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.stockQuantity}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{subtotal.toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.warehousePosition}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.remark || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 底部按钮 - 已移除关闭按钮 */}
    </UnifiedModal>
  );
};

export default DetailModal;
