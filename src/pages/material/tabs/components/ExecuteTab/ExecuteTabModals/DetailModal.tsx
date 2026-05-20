// ExecuteTabDetailModal 组件
// 领料出库详情弹窗
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ExecuteDetailModalProps {
  // 弹窗状态
  isOpen: boolean;
  record: any;

  // 回调函数
  onClose: () => void;
}

export function ExecuteDetailModal({
  isOpen,
  record,
  onClose,
}: ExecuteDetailModalProps) {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600">
          <h3 className="text-lg font-semibold text-white">出库单详情</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/20 text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* 基本信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-sm text-gray-500 mb-0">出库单号</Label>
              <p className="font-mono font-semibold text-gray-900">{record.code}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">申请日期</Label>
              <p className="font-semibold text-gray-900">{record.date}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">执行状态</Label>
              <p className="font-semibold">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  record.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                  record.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {record.executeStatus}
                </span>
              </p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">申请人</Label>
              <p className="font-semibold text-gray-900">{record.applicant}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">库存地点</Label>
              <p className="font-semibold text-gray-900">{record.warehouseLocation}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">审核人</Label>
              <p className="font-semibold text-gray-900">{record.reviewer}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">操作人</Label>
              <p className="font-semibold text-gray-900">{record.operator}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-0">生产计划批次号</Label>
              <p className="font-semibold text-gray-900">{record.productionBatchCode}</p>
            </div>
          </div>

          {/* 物料明细 */}
          <div className="mb-6">
            <Label className="text-sm text-gray-500 block mb-2">物料明细</Label>
            {record.materials && record.materials.length > 0 ? (
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-emerald-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">批次号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实际库存</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {record.materials.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-emerald-50">
                      <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.applicationCode}</td>
                      <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.materialCode}</td>
                      <td className="px-3 py-2 text-sm text-blue-700">{m.materialName}</td>
                      <td className="px-3 py-2 text-sm text-blue-700 font-mono">{m.batchNo || ''}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.spec || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.unit}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.requestedQuantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.stockQuantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{m.actualQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">暂无物料明细</div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
