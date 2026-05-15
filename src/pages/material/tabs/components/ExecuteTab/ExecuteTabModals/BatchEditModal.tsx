// ExecuteTabBatchEditModal 组件
// 批量编辑出库弹窗
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExecuteBatchEditModalProps {
  // 弹窗状态
  show: boolean;
  selectedRows: number[];
  currentIndex: number;
  recordsList: any[];

  // 回调函数
  onClose: () => void;
  onRecordChange: (index: number) => void;
  onSaveAll: () => void;
}

export function ExecuteBatchEditModal({
  show,
  selectedRows,
  currentIndex,
  recordsList,
  onClose,
  onRecordChange,
  onSaveAll,
}: ExecuteBatchEditModalProps) {
  if (!show) return null;

  const currentRecord = recordsList[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-600">
          <h3 className="text-lg font-semibold text-white">批量编辑出库单</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/20 text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="mb-4">
            <span className="text-sm text-gray-500">当前编辑第 {currentIndex + 1} / {selectedRows.length} 条记录</span>
          </div>
          {currentRecord && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">出库单号</label>
                <input
                  type="text"
                  value={currentRecord.code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">申请日期</label>
                <input
                  type="date"
                  value={currentRecord.date}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
                <input
                  type="text"
                  value={currentRecord.applicant}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">库存地点</label>
                <select
                  value={currentRecord.warehouseLocation}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="仓库A区">仓库A区</option>
                  <option value="仓库B区">仓库B区</option>
                  <option value="仓库C区">仓库C区</option>
                  <option value="仓库D区">仓库D区</option>
                  <option value="仓库E区">仓库E区</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onRecordChange(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              上一条
            </Button>
            <Button
              variant="secondary"
              onClick={() => onRecordChange(Math.min(selectedRows.length - 1, currentIndex + 1))}
              disabled={currentIndex === selectedRows.length - 1}
            >
              下一条
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={onSaveAll}>
              保存全部
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
