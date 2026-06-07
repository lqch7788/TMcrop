import React from 'react';
import { UnifiedModal } from '@/components/ui';
import { Label } from '@/components/ui';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import type { MaterialExecuteRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

interface ExecuteDetailModalProps {
  isOpen: boolean;
  record: MaterialExecuteRecord | null;
  onClose: () => void;
}

export const ExecuteDetailModal: React.FC<ExecuteDetailModalProps> = ({
  isOpen,
  record,
  onClose,
}) => {
  if (!isOpen || !record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="出库单详情"
      size="lg"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm text-gray-500">出库单号</Label>
          <p className="font-mono font-semibold text-gray-900">{record.code}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">关联领料单号</Label>
          <p className="font-mono font-semibold text-gray-900">{record.sourceApplicationCodes?.join(', ')}</p>
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
          <Label className="text-sm text-gray-500">库存地点</Label>
          <p className="font-semibold text-gray-900">{record.warehouseLocation}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">审核人</Label>
          <p className="font-semibold text-gray-900">{record.reviewer}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">操作人</Label>
          <p className="font-semibold text-gray-900">{record.operator}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">生产计划批次号</Label>
          <p className="font-semibold text-gray-900">{record.productionBatchCode}</p>
        </div>
        <div>
          <Label className="text-sm text-gray-500">执行状态</Label>
          <p className="font-semibold">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              record.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
              record.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
              record.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
              record.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {record.executeStatus}
            </span>
          </p>
        </div>
      </div>
      {record.materials.length > 0 && (
        <div className="mt-6">
          <Label className="text-sm text-gray-500 block mb-2">物料明细</Label>
          <Table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <TableHeader className="bg-emerald-100">
              <TableRow>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实际库存</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {record.materials.map((material: ExecuteMaterialItem, idx: number) => {
                const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                return (
                  <TableRow key={idx} className={`hover:bg-emerald-100 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                    <TableCell className="px-3 py-2 text-sm text-blue-700 font-mono">{material.applicationCode}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700 font-mono">{material.materialCode}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.materialName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.spec}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.unit}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.requestedQuantity}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">
                      <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {material.stockQuantity}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">
                      {material.actualQuantity > 0 ? (
                        <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                          {material.actualQuantity}
                        </span>
                      ) : (
                        <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                          {material.actualQuantity}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{(material.unitPrice || 0).toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{subtotal.toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.warehousePosition || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700">{material.remark}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          关闭
        </Button>
      </div>
    </UnifiedModal>
  );
};

export default ExecuteDetailModal;
