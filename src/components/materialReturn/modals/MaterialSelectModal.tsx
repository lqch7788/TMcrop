import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { MaterialItem } from '../types';
import { UnifiedModal } from '@/components/ui';
import { useExecuteDataStore } from '@/stores/useExecuteDataStore';
import { useMaterialReturnStore } from '@/stores/useMaterialReturnStore';

// 深度输入框样式
// 2026-09-28 UI 统一：原 deepInputClass 常量已移除（输入框改用生产领料弹窗的标准类名）

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
  // 数据源：领料出库 Store（业务规则：没有出库的物料不能退料，保证数据闭环）
  const executeItems = useExecuteDataStore(state => state.items);
  const loadExecutes = useExecuteDataStore(state => state.fetchItems);

  // 已退累计的数据源：退料单列表（口径与后端一致）
  const returnList = useMaterialReturnStore((s) => s.items);
  const loadReturns = useMaterialReturnStore((s) => s.loadItems);

  useEffect(() => {
    if (open) {
      setSelectedMaterials(new Set());
      setSearchKeyword('');
      if (executeItems.length === 0) {
        loadExecutes();
      }
      // 可退量依赖"已退累计"，列表未加载时必须拉一次，否则会高估可退量（P1-8）
      if (returnList.length === 0) {
        void loadReturns();
      }
    }
  }, [open, executeItems.length, loadExecutes, returnList.length, loadReturns]);

  // 找到选中的领料出库单 — 数据流来源
  const executeRecord = useMemo(
    () => executeItems.find((r) => r.code === sourceAppCode) || null,
    [executeItems, sourceAppCode]
  );

  // 2026-09-29 审计修复（P1-8）：可退量须扣减"已退累计"。
  // 此前 quantity 直接取 actualQuantity（本次实发量），已退过的部分仍显示为可退，
  // 用户填超量只能靠后端 validateReturnClosedLoop 返回 400 兜底（前端误导 + 无效提交）。
  // 口径与后端 isReturnStockActive 对齐：只有"库存已恢复"的退料占用可退额度
  // （用 statusClass 判定，比中文 status 稳定）。
  const alreadyReturned = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of returnList) {
      const cls = String(r.statusClass || '').toLowerCase();
      if (cls !== 'approved' && cls !== 'completed') continue;
      for (const line of r.materials || []) {
        const key = `${String(line.sourceApplicationCode || '').trim()}||${String(line.materialCode || '').trim()}`;
        // returnQuantity 是退料量的权威字段；历史行可能只写了 quantity（旧字段名），兜底兼容
        const qty = (line as { returnQuantity?: number; quantity?: number }).returnQuantity
          ?? (line as { returnQuantity?: number; quantity?: number }).quantity
          ?? 0;
        acc.set(key, (acc.get(key) || 0) + (Number(qty) || 0));
      }
    }
    return acc;
  }, [returnList]);

  // 将出库单物料映射为退料表单行格式
  // quantity = 可退余量（实发量 − 已退累计），是本次可退料的上限
  // returnQuantity 留空，用户填写本次实退数量
  const materials = useMemo<MaterialItem[]>(() => {
    if (!executeRecord) return [];
    return executeRecord.materials
      .map((em) => {
        const issued = Number(em.actualQuantity) || 0;
        const used = alreadyReturned.get(`${sourceAppCode}||${em.materialCode}`) || 0;
        return {
          sourceApplicationCode: sourceAppCode,
          materialCode: em.materialCode,
          materialName: em.materialName,
          category: em.category,
          spec: em.spec,
          unit: em.unit,
          quantity: Math.max(0, issued - used),
          // 2026-09-27 审计修复：退料行带上原出库批次号，后端按此还原批次账
          batchNo: (em as any).batchNo || '',
          unitPrice: em.unitPrice || 0,
          warehousePosition: em.warehousePosition || '',
          returnQuantity: 0,
          reason: '',
          remark: '',
        };
      })
      // 已退满的行不再列出（可退量为 0），避免用户选了才被后端拒绝
      .filter((m) => (m.quantity || 0) > 0);
  }, [executeRecord, sourceAppCode, alreadyReturned]);

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
      // 2026-09-27 审计修复：透传批次号（后端退料入库按批次还原批次账）
      batchNo: (m as any).batchNo || '',
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
            className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
