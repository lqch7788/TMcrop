import { Material } from './MaterialFilters';
import { UnifiedModal } from '../ui/UnifiedModal';

interface MaterialBatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  filteredMaterials: Material[];
  batchEditedMaterials: Record<number, Partial<Material>>;
  currentBatchEditIndex: number;
  onClose: () => void;
  onMaterialSelect: (index: number) => void;
  onFieldChange: (materialId: number, field: string, value: any) => void;
  onSaveAll: () => void;
  onNext: () => void;
}

export function MaterialBatchEditModal({
  isOpen,
  selectedRows,
  filteredMaterials,
  batchEditedMaterials,
  currentBatchEditIndex,
  onClose,
  onMaterialSelect,
  onFieldChange,
  onSaveAll,
  onNext,
}: MaterialBatchEditModalProps) {
  if (!isOpen) return null;

  const selectedMaterialsList = filteredMaterials.filter(m => selectedRows.includes(m.id));
  const currentMaterialId = selectedRows[currentBatchEditIndex];
  const currentMaterial = selectedMaterialsList.find(m => m.id === currentMaterialId);
  const currentEditedData = batchEditedMaterials[currentMaterialId] || currentMaterial || {};
  const editedCount = Object.keys(batchEditedMaterials).length;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑物料"
      size="lg"
      showFooter={false}
    >
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 个物料进行批量编辑，已编辑 <strong>{editedCount}</strong> 个</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">选择物料</label>
        <select
          value={currentMaterialId || ''}
          onChange={(e) => {
            const idx = selectedRows.indexOf(Number(e.target.value));
            onMaterialSelect(idx >= 0 ? idx : 0);
          }}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          {selectedMaterialsList.map((material, idx) => (
            <option key={material.id} value={material.id}>
              {material.name} ({material.code}) {batchEditedMaterials[material.id] && <span className="bg-green-100 text-green-700">✅ 已编辑</span>}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">物料编号</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">分类</div>
            <div className="text-sm font-medium text-gray-900 truncate">{currentEditedData.category}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">数据状态</div>
            <select
              value={currentEditedData.dataStatus || '启用'}
              onChange={(e) => onFieldChange(currentMaterialId, 'dataStatus', e.target.value)}
              className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="启用">启用</option>
              <option value="停用">停用</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">库存数量</label>
            <input
              type="number"
              value={currentEditedData.quantity ?? ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'quantity', Number(e.target.value))}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">最低库存</label>
            <input
              type="number"
              value={currentEditedData.minStock ?? ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'minStock', Number(e.target.value))}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">最高库存</label>
            <input
              type="number"
              value={currentEditedData.maxStock ?? ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'maxStock', Number(e.target.value))}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">单价（元）</label>
            <input
              type="text"
              value={(currentEditedData.price || '').toString().replace('元', '')}
              onChange={(e) => onFieldChange(currentMaterialId, 'price', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">单位</label>
            <input
              type="text"
              value={currentEditedData.unit || ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'unit', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">存放位置</label>
            <input
              type="text"
              value={currentEditedData.location || ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'location', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">供应商</label>
          <input
            type="text"
            value={currentEditedData.supplier || ''}
            onChange={(e) => onFieldChange(currentMaterialId, 'supplier', e.target.value)}
            className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">规格型号</label>
            <input
              type="text"
              value={currentEditedData.specification || ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'specification', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">条形码</label>
            <input
              type="text"
              value={currentEditedData.barcode || ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'barcode', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">批次号</label>
            <input
              type="text"
              value={currentEditedData.batchNo || ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'batchNo', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">生产日期</label>
            <input
              type="date"
              value={currentEditedData.productionDate || ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'productionDate', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">有效期至</label>
            <input
              type="date"
              value={currentEditedData.expiryDate || ''}
              onChange={(e) => onFieldChange(currentMaterialId, 'expiryDate', e.target.value)}
              className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onNext}
          className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          确认 {currentBatchEditIndex + 1 < selectedRows.length ? '(下一个)' : '(已最后一个)'}
        </button>
        <button
          onClick={onSaveAll}
          className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          保存全部 ({editedCount} 个)
        </button>
      </div>
    </UnifiedModal>
  );
}
