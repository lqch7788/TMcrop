import { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { MaterialItem } from '../types';
import { mockSourceApplicationMaterials } from '../mockData';

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

  useEffect(() => {
    if (open) {
      setSelectedMaterials(new Set());
      setSearchKeyword('');
    }
  }, [open]);

  const materials = mockSourceApplicationMaterials.filter(
    m => m.sourceApplicationCode === sourceAppCode
  );

  const filteredMaterials = useMemo(() => {
    if (!searchKeyword) return materials;
    const keyword = searchKeyword.toLowerCase();
    return materials.filter(m =>
      m.materialCode.toLowerCase().includes(keyword) ||
      m.materialName.toLowerCase().includes(keyword)
    );
  }, [materials, searchKeyword]);

  if (!open) return null;

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 顶部标题栏 */}
        <div className="px-4 py-2 bg-emerald-600 flex items-center justify-between rounded-t-xl shrink-0">
          <h3 className="text-base font-semibold text-white">选择物料 - {sourceAppCode}</h3>
          <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 py-2 border-b border-gray-200">
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
        <div className="p-4 flex-1 overflow-auto">
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
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
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
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
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
        </div>

        {/* 底部按钮 */}
        <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-xl shrink-0">
          <span className="text-sm text-gray-500">
            已选择 <strong>{selectedMaterials.size}</strong> 项
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedMaterials.size === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              确认添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
