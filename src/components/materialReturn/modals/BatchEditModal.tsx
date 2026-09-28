import { ReturnRecord, RecordId, MaterialItem } from '../types';
import { useMaterialReturnStore } from '../../../stores/useMaterialReturnStore';
import { UnifiedModal, NumberInput, DeepSelectTrigger, Label } from '@/components/ui';

// 2026-09-28 UI 统一：输入框样式对齐生产领料弹窗（同 AddModal/EditModal 的 STD_INPUT_CLS）
const STD_INPUT_CLS = 'w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
import { useDepartmentOptions } from '../../../hooks/useDepartmentOptions';

interface BatchEditModalProps {
  open: boolean;
  /** 选中的退料单 id 列表（后端 material_returns.id 为 TEXT，故用 RecordId） */
  selectedRows: RecordId[];
  /** 批量编辑缓存：key 为字符串形式的 id */
  batchEditedRecords: Record<string, ReturnRecord>;
  currentBatchEditIndex: number;
  onClose: () => void;
  onRecordChange: (records: Record<string, ReturnRecord>) => void;
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

  const selectedRecordsList = returnItems.filter(r => selectedRows.includes(r.id));
  const currentRecordId = selectedRows[currentBatchEditIndex];
  // 批量编辑缓存以字符串 id 为 key（对象键只能是 string）
  const currentRecordKey = currentRecordId !== undefined ? String(currentRecordId) : '';
  const currentRecord = selectedRecordsList.find(r => r.id === currentRecordId);
  // 当前正在编辑的数据：优先取批量编辑缓存，否则回落到原始记录
  const currentEditedData: Partial<ReturnRecord> = batchEditedRecords[currentRecordKey] || currentRecord || {};
  const editedCount = Object.keys(batchEditedRecords).length;
  const isVoidable = currentRecord?.status === '待审批' || currentRecord?.status === '已驳回';

  // 更新当前退料单的基本字段（泛型约束：字段名与值类型必须匹配）
  const handleFieldChange = <K extends keyof ReturnRecord>(field: K, value: ReturnRecord[K]) => {
    onRecordChange({
      ...batchEditedRecords,
      // 合并结果由完整记录派生，收敛为 ReturnRecord 以匹配批量编辑集合的类型
      [currentRecordKey]: { ...currentEditedData, [field]: value } as ReturnRecord,
    });
  };

  // 更新当前退料单中指定行的物料字段
  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials: MaterialItem[] = [...(currentEditedData.materials || [])];
    newMaterials[index] = { ...newMaterials[index], [field]: value } as MaterialItem;
    onRecordChange({
      ...batchEditedRecords,
      [currentRecordKey]: { ...currentEditedData, materials: newMaterials } as ReturnRecord,
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
        <DeepSelectTrigger
          value={currentRecordId || ''}
          onChange={(e) => {
            // 下拉 value 为字符串，需按字符串比较定位索引（后端 id 为字符串主键）
            const idx = selectedRows.findIndex(id => String(id) === e.target.value);
            onIndexChange(idx >= 0 ? idx : 0);
          }}
          className="w-full"
        >
          {selectedRecordsList.map((record, idx) => (
            <option key={String(record.id)} value={String(record.id)}>
              {record.code} ({record.applicant}) {batchEditedRecords[String(record.id)] ? '✅️ 已编辑' : ''}
            </option>
          ))}
        </DeepSelectTrigger>
      </div>

      {/* 基本信息（2026-09-28 UI 统一：布局/文字/输入框对齐生产领料弹窗） */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">退料单号</Label>
          <div className={`${STD_INPUT_CLS} bg-gray-100 text-gray-600 font-mono`}>
            {currentEditedData.code || '-'}
          </div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">日期</Label>
          <input
            type="date"
            value={currentEditedData.date || ''}
            onChange={(e) => handleFieldChange('date', e.target.value)}
            className={STD_INPUT_CLS}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">退料类型</Label>
          <select
            value={currentEditedData.type || ''}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            className={STD_INPUT_CLS}
          >
            <option value="">请选择</option>
            <option value="生产退料">生产退料</option>
            <option value="品质退料">品质退料</option>
            <option value="试制退料">试制退料</option>
          </select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">申请人</Label>
          <input
            type="text"
            value={currentEditedData.applicant || ''}
            onChange={(e) => handleFieldChange('applicant', e.target.value)}
            className={STD_INPUT_CLS}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
          <select
            value={currentEditedData.department || ''}
            onChange={(e) => handleFieldChange('department', e.target.value)}
            className={STD_INPUT_CLS}
          >
            <option value="">请选择</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">仓库位置</Label>
          <input
            type="text"
            value={currentEditedData.warehouseLocation || ''}
            onChange={(e) => handleFieldChange('warehouseLocation', e.target.value)}
            placeholder="请输入"
            className={STD_INPUT_CLS}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">操作人</Label>
          <input
            type="text"
            value={currentEditedData.operator || ''}
            onChange={(e) => handleFieldChange('operator', e.target.value)}
            placeholder="请输入"
            className={STD_INPUT_CLS}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">审核人</Label>
          <input
            type="text"
            value={currentEditedData.reviewer || ''}
            onChange={(e) => handleFieldChange('reviewer', e.target.value)}
            placeholder="请输入"
            className={STD_INPUT_CLS}
          />
        </div>
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            状态 <span className="text-xs text-gray-400 font-normal">（审批状态由系统自动生成）</span>
          </Label>
          <div className={`${STD_INPUT_CLS} bg-gray-100 text-gray-600`}>
            {currentEditedData.status || '-'}
          </div>
        </div>
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
          <input
            type="text"
            value={currentEditedData.remark || ''}
            onChange={(e) => handleFieldChange('remark', e.target.value)}
            placeholder="请输入"
            className={STD_INPUT_CLS}
          />
        </div>
      </div>

      {/* 物料明细 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">物料明细</label>
          <span className="text-xs text-gray-500">共 {currentEditedData.materials?.length || 0} 条</span>
        </div>
        {(currentEditedData.materials?.length || 0) > 0 ? (
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
                  {(currentEditedData.materials || []).map((mat: MaterialItem, idx: number) => (
                    <tr key={idx} className="hover:bg-emerald-50/50">
                      <td className="px-3 py-2">
                        <select
                          value={mat.sourceApplicationCode || ''}
                          onChange={(e) => handleMaterialChange(idx, 'sourceApplicationCode', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.category || ''}
                          onChange={(e) => handleMaterialChange(idx, 'category', e.target.value)}
                          placeholder="中类-小类"
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.materialName || ''}
                          onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.spec || ''}
                          onChange={(e) => handleMaterialChange(idx, 'spec', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.unit || ''}
                          onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {/* 退料数量：数字输入框组件（失焦时保留 2 位小数） */}
                        <NumberInput
                          value={mat.returnQuantity || 0}
                          onChange={(v) => handleMaterialChange(idx, 'returnQuantity', parseFloat(v) || 0)}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {/* 单价：数字输入框组件 */}
                        <NumberInput
                          value={mat.unitPrice || 0}
                          onChange={(v) => handleMaterialChange(idx, 'unitPrice', parseFloat(v) || 0)}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={mat.warehousePosition || ''}
                          onChange={(e) => handleMaterialChange(idx, 'warehousePosition', e.target.value)}
                          placeholder="仓库-区-位"
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={mat.reason || ''}
                          onChange={(e) => handleMaterialChange(idx, 'reason', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
