import { ReturnRecord } from '../types';
import { useMaterialReturnStore } from '../../../stores/useMaterialReturnStore';
import { UnifiedModal } from '@/components/ui';
import { useDepartmentOptions } from '../../../hooks/useDepartmentOptions';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface BatchEditModalProps {
  open: boolean;
  selectedRows: number[];
  batchEditedRecords: Record<number, ReturnRecord>;
  currentBatchEditIndex: number;
  onClose: () => void;
  onRecordChange: (records: Record<number, ReturnRecord>) => void;
  onIndexChange: (index: number) => void;
  onSaveAll: () => void;
  onVoidApply: (record: ReturnRecord) => void;
}

export function BatchEditModal({
  open,
  selectedRows,
  batchEditedRecords,
  currentBatchEditIndex,
  onClose,
  onRecordChange,
  onIndexChange,
  onSaveAll,
  onVoidApply,
}: BatchEditModalProps) {
  // 从 API 获取部门选项
  const { options: departmentOptions } = useDepartmentOptions();
  // 从 Zustand Store 获取退料数据
  const returnItems = useMaterialReturnStore(state => state.items);
  // 从退料记录中提取唯一的来源领料单号
  const sourceApplicationOptions = Array.from(
    new Set(returnItems.flatMap(r => r.materials?.map(m => m.sourceApplicationCode) || []))
  ).filter(Boolean);

  const selectedRecordsList = returnItems.filter(r => selectedRows.includes(r.id as number));
  const currentRecordId = selectedRows[currentBatchEditIndex];
  const currentRecord = selectedRecordsList.find(r => r.id === currentRecordId);
  const currentEditedData = batchEditedRecords[currentRecordId] || currentRecord || {};
  const editedCount = Object.keys(batchEditedRecords).length;
  const isVoidable = currentRecord?.status === '待审批' || currentRecord?.status === '已驳回';

  const handleFieldChange = (field: string, value: any) => {
    onRecordChange({
      ...batchEditedRecords,
      [currentRecordId]: { ...currentEditedData, [field]: value }
    });
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    const newMaterials = [...((currentEditedData.materials as any[]) || [])];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    onRecordChange({
      ...batchEditedRecords,
      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
    });
  };

  const goToNext = () => {
    const nextIndex = currentBatchEditIndex + 1;
    if (nextIndex < selectedRows.length) {
      onIndexChange(nextIndex);
    } else {
      onIndexChange(0);
    }
  };

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="批量编辑退料记录"
      size="xl"
      showFooter
      onSubmit={onSaveAll}
      submitText={`保存全部 (${editedCount} 个)`}
      cancelText="取消"
    >
      {/* 批量编辑提示信息 */}
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 条退料记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条</p>
      </div>

      {/* 退料单选择下拉 */}
      <div className="mb-3">
        <select
          value={currentRecordId || ''}
          onChange={(e) => {
            const idx = selectedRows.indexOf(Number(e.target.value));
            onIndexChange(idx >= 0 ? idx : 0);
          }}
          className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${deepInputClass}`}
        >
          {selectedRecordsList.map((record, idx) => (
            <option key={record.id} value={record.id}>
              {record.code} ({record.applicant}) {batchEditedRecords[record.id] ? '✅️ 已编辑' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 基本信息 - 紧凑排布，每行3个 */}
      <div className="bg-gray-100 rounded-lg p-3 mb-3">
        <div className="grid grid-cols-3 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">退料单号：</span>
            <span className="font-mono font-medium text-gray-900">{(currentEditedData as any).code || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">日期：</span>
            <input
              type="date"
              value={(currentEditedData as any).date || ''}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">退料类型：</span>
            <select
              value={(currentEditedData as any).type || ''}
              onChange={(e) => handleFieldChange('type', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">请选择</option>
              <option value="生产退料">生产退料</option>
              <option value="品质退料">品质退料</option>
              <option value="试制退料">试制退料</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">申请人：</span>
            <input
              type="text"
              value={(currentEditedData as any).applicant || ''}
              onChange={(e) => handleFieldChange('applicant', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">部门：</span>
            <select
              value={(currentEditedData as any).department || ''}
              onChange={(e) => handleFieldChange('department', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">请选择</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">仓库位置：</span>
            <input
              type="text"
              value={(currentEditedData as any).warehouseLocation || ''}
              onChange={(e) => handleFieldChange('warehouseLocation', e.target.value)}
              placeholder="请输入"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">操作人：</span>
            <input
              type="text"
              value={(currentEditedData as any).operator || ''}
              onChange={(e) => handleFieldChange('operator', e.target.value)}
              placeholder="请输入"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">审核人：</span>
            <input
              type="text"
              value={(currentEditedData as any).reviewer || ''}
              onChange={(e) => handleFieldChange('reviewer', e.target.value)}
              placeholder="请输入"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">状态：</span>
            <span className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-sm text-gray-600">
              {(currentEditedData as any).status || '-'}
            </span>
            <span className="text-xs text-gray-400">（审批状态由系统自动生成）</span>
          </div>
          <div className="flex items-center gap-2 col-span-3">
            <span className="text-gray-500 w-20 shrink-0">备注：</span>
            <input
              type="text"
              value={(currentEditedData as any).remark || ''}
              onChange={(e) => handleFieldChange('remark', e.target.value)}
              placeholder="请输入"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 物料明细 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">物料明细</label>
          <span className="text-xs text-gray-500">共 {((currentEditedData as any).materials?.length || 0)} 条</span>
        </div>
        {((currentEditedData as any).materials?.length || 0) > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[320px]">
              <table className="w-full min-w-[1400px]">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-40" />
                  <col className="w-32" />
                  <col className="w-16" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-32" />
                  <col className="w-32" />
                </colgroup>
                <thead className="bg-emerald-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">来源领料单号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">物料分类</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">规格</th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">单位</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">退料数量</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">单价</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">仓库货位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">退料原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {((currentEditedData as any).materials || []).map((mat: any, idx: number) => (
                    <tr key={idx} className="hover:bg-emerald-50/50">
                      <td className="px-3 py-2">
                        <select
                          value={mat.sourceApplicationCode || ''}
                          onChange={(e) => handleMaterialChange(idx, 'sourceApplicationCode', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">请选择</option>
                          {sourceApplicationOptions.map(code => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.materialCode || ''}
                          onChange={(e) => handleMaterialChange(idx, 'materialCode', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.category || ''}
                          onChange={(e) => handleMaterialChange(idx, 'category', e.target.value)}
                          placeholder="中类-小类"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.materialName || ''}
                          onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.spec || ''}
                          onChange={(e) => handleMaterialChange(idx, 'spec', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.unit || ''}
                          onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mat.returnQuantity || 0}
                          onChange={(e) => handleMaterialChange(idx, 'returnQuantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={mat.unitPrice || 0}
                          onChange={(e) => handleMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.warehousePosition || ''}
                          onChange={(e) => handleMaterialChange(idx, 'warehousePosition', e.target.value)}
                          placeholder="仓库-区-位"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={mat.reason || ''}
                          onChange={(e) => handleMaterialChange(idx, 'reason', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">请选择</option>
                          <option value="质量问题">质量问题</option>
                          <option value="规格不符">规格不符</option>
                          <option value="过期产品">过期产品</option>
                          <option value="运输损坏">运输损坏</option>
                          <option value="库存积压">库存积压</option>
                          <option value="其他">其他</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
            暂无物料明细
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
