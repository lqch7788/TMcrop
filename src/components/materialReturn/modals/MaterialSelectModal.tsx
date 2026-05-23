import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { MaterialItem } from '../types';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { useWarehouseMaterialStore } from '../../../stores/useWarehouseMaterialStore';

interface MaterialSelectModalProps {
  open: boolean;
  sourceAppCode: string;
  onConfirm: (materials: MaterialItem[]) => void;
  onClose: () => void;
}

export function MaterialSelectModal({
  open,
  sourceAppCode,
  onConfirm,
  onClose,
}: MaterialSelectModalProps) {
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');
  // 从 Zustand Store 获取仓库物料列表
  const warehouseMaterials = useWarehouseMaterialStore(state => state.items);
  const loadWarehouseMaterials = useWarehouseMaterialStore(state => state.loadItems);

  useEffect(() => {
    if (open) {
      setSelectedMaterials(new Set());
      setSearchKeyword('');
      if (warehouseMaterials.length === 0) {
        loadWarehouseMaterials();
      }
    }
  }, [open, warehouseMaterials.length, loadWarehouseMaterials]);

  // 将仓库物料转换为选择列表格式
  const materials = warehouseMaterials.map(wm => ({
    sourceApplicationCode: sourceAppCode,
    materialCode: wm.code || wm.name,
    materialName: wm.name,
    spec: wm.specification || '',
    unit: wm.unit || '',
    quantity: wm.stockQuantity || 0,
    unitPrice: wm.unitPrice || 0,
    warehousePosition: wm.location || '',
    category: wm.category || '',
  }));

  const filteredMaterials = useMemo(() => {
    if (!searchKeyword) return materials;
    const keyword = searchKeyword.toLowerCase();
    return materials.filter(m =>
      m.materialCode.toLowerCase().includes(keyword) ||
      m.materialName.toLowerCase().includes(keyword)
    );
  }, [materials, searchKeyword]);

  const allSelected = filteredMaterials.length > 0 && filteredMaterials.every(m => selectedMaterials.has(m.materialCode));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(new Set(filteredMaterials.map(m => m.materialCode)));
    }
  };

  const handleToggle = (materialCode: string) => {
    const newSet = new Set(selectedMaterials);
    if (newSet.has(materialCode)) {
      newSet.delete(materialCode);
    } else {
      newSet.add(materialCode);
    }
    setSelectedMaterials(newSet);
  };

  const handleConfirm = () => {
    const selectedItems = filteredMaterials.filter(m => selectedMaterials.has(m.materialCode));
    const result: MaterialItem[] = selectedItems.map(m => ({
      sourceApplicationCode: m.sourceApplicationCode,
      materialCode: m.materialCode,
      category: m.category || '',
      materialName: m.materialName,
      spec: m.spec,
      unit: m.unit,
      quantity: m.quantity || 0,
      returnQuantity: m.quantity || 0,
      unitPrice: m.unitPrice || 0,
      warehousePosition: m.warehousePosition,
      reason: '',
      remark: '',
    }));
    onConfirm(result);
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={`选择物料 - ${sourceAppCode}`}
      size="lg"
      showFooter
      onSubmit={handleConfirm}
      submitText="确认添加"
      cancelText="取消"
    >
      {/* 搜索栏 */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索物料编码或名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 物料列表 */}
      {filteredMaterials.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-emerald-100">
              <tr>
                <th className="px-3 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleAll}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料编码</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料名称</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">规格</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">单位</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">领料数量</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">仓库货位</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {materials.map((material) => (
                <tr
                  key={material.materialCode}
                  className={`hover:bg-emerald-50/50 cursor-pointer ${selectedMaterials.has(material.materialCode) ? 'bg-emerald-50' : ''}`}
                  onClick={() => handleToggle(material.materialCode)}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedMaterials.has(material.materialCode)}
                      onChange={() => handleToggle(material.materialCode)}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm font-mono text-gray-900">{material.materialCode}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{material.materialName}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{material.spec}</td>
                  <td className="px-3 py-2 text-sm text-center text-gray-700">{material.unit}</td>
                  <td className="px-3 py-2 text-sm text-right text-gray-700">{material.quantity}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{material.warehousePosition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">该领料单暂无物料</div>
      )}

      {/* 底部选择计数 */}
      <div className="mt-4 text-sm text-gray-500">
        已选择 <strong>{selectedMaterials.size}</strong> 项
      </div>
    </UnifiedModal>
  );
}
