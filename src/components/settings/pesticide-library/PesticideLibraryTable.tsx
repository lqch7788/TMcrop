/**
 * 药剂库表格组件（V2 扁平化 2026-07-12）
 * 单行 24 列：编码 / 药剂名称 / 药剂成分 / 含量 / 品牌 / 药剂类型(chips) / 剂型 / 功能说明 /
 *          使用禁忌 / 包装规格 / 库存量 / 库存单位 / 单价 / 生产厂家 / 建议用量 / 单位 / 稀释比例 /
 *          产品批次 / 生产日期 / 过期日期 / 药剂成分 / 作用机制 / 防治对象 / 备注 / 操作
 * 容器 overflow-x-auto，超宽时底部出现横向滚动条
 * 每条记录 = 一条完整 spec，无折叠展开
 */
import React from 'react';
import { Edit2, Trash2, Package } from 'lucide-react';
import { PesticideSpec } from '@/stores';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { getDictLabel, useDictionaryStore } from '@/stores/useDictionaryStore';

interface PesticideLibraryTableProps {
  data: PesticideSpec[];
  isLoading: boolean;
  onDetail: (record: PesticideSpec) => void;
  onEdit: (record: PesticideSpec) => void;
  onDelete: (id: string) => void;
  onStockIn?: (record: PesticideSpec) => void;
  exportMode?: boolean;
  selectedRows?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
}

// 列数常量（用于 colSpan）
// 非导出模式：24 列（含操作）；导出模式：23 列 + 1 checkbox = 24
const TOTAL_COLS = 24;

/**
 * 药剂类型多值 label 渲染（树形剪枝：一级被二级覆盖时隐藏一级）
 * - 接收 string[]（pesticideTypes）
 * - 调 getDictLabel 转中文
 * - 多个用顿号「、」分隔
 * - 树形剪枝：如果一级分类（如 fungicide）的某个二级子类（如 fungicide_fungi）也在列表中，
 *   则隐藏该一级（因为有更具体的子类被选中）
 */
function renderPesticideTypeChips(
  rawTypes: any,
  getLabel: (cat: string, code: string) => string,
  dictionaries: any[]
): React.ReactNode {
  // 2026-07-12：兼容多种输入格式 — Store 应已解析为数组，但兜底处理 JSON 字符串和单个字符串
  let typeArray: string[] = [];
  if (Array.isArray(rawTypes)) {
    typeArray = rawTypes;
  } else if (typeof rawTypes === 'string' && rawTypes.trim()) {
    try {
      const parsed = JSON.parse(rawTypes);
      typeArray = Array.isArray(parsed) ? parsed : [rawTypes];
    } catch {
      typeArray = [rawTypes]; // 单个字符串值
    }
  }
  if (typeArray.length === 0) return <span className="text-gray-400">-</span>;

  // 树形剪枝——一级被二级覆盖时隐藏一级
  const topLevelCodes = new Set<string>();
  const childrenByParent = new Map<string, Set<string>>();
  for (const d of dictionaries) {
    const cat = d.categoryCode || d.category_code || d.category;
    if (cat !== 'pesticide_type') continue;
    const code = d.dictCode || d.dict_code;
    const parentId = d.parentId || d.parent_id;
    if (!parentId) {
      topLevelCodes.add(code);
    } else {
      const parent = dictionaries.find((x: any) => x.id === parentId);
      if (parent) {
        const parentCode = parent.dictCode || parent.dict_code;
        if (!childrenByParent.has(parentCode)) childrenByParent.set(parentCode, new Set());
        childrenByParent.get(parentCode)!.add(code);
      }
    }
  }

  // 过滤：跳过被二级覆盖的一级
  const filtered = typeArray.filter(t => {
    if (topLevelCodes.has(t)) {
      const children = childrenByParent.get(t);
      if (children) {
        for (const c of children) {
          if (typeArray.includes(c)) return false;
        }
      }
    }
    return true;
  });

  return (
    <div className="flex flex-wrap gap-1">
      {filtered.map((t, i) => {
        const label = getLabel('pesticide_type', t) || t;
        const colors: Record<string, string> = {
          // 一级分类
          insecticide: 'bg-red-100 text-red-700',
          fungicide: 'bg-blue-100 text-blue-700',
          herbicide: 'bg-amber-100 text-amber-700',
          plant_growth_regulator: 'bg-purple-100 text-purple-700',
          // 二级子类默认用灰色
        };
        const colorClass = colors[t] || 'bg-gray-100 text-gray-700';
        return (
          <span
            key={i}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

export function PesticideLibraryTable({
  data,
  isLoading,
  onDetail,
  onEdit,
  onDelete,
  onStockIn,
  exportMode = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
}: PesticideLibraryTableProps) {
  // 触发字典加载（store 内置 getDictLabel 会在字典未加载时返回原值）
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 横向滚动容器：列数 20，超宽时底部自动出滚动条 */}
      <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
        <Table style={{ minWidth: '2200px' }}>
          <TableHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <TableRow className="hover:bg-transparent">
              {exportMode && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 text-white border-white rounded focus:ring-white"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">编码</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂成分</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">含量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">品牌</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">药剂类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">剂型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">功能说明</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">使用禁忌</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">包装规格</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap text-right">库存量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">库存单位</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap text-right">单价</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">生产厂家</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">建议用量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">单位</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">稀释比例</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">产品批次</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">生产日期</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">过期日期</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">作用机制</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">防治对象</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">备注</TableHead>
              {!exportMode && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap sticky right-0 bg-green-600 z-10">
                  操作
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={TOTAL_COLS} className="px-4 py-12 text-center text-gray-400">
                  暂无药剂记录
                </TableCell>
              </TableRow>
            ) : currentData.map((record) => (
              <TableRow
                key={record.id}
                className={`hover:bg-emerald-50 transition-colors ${selectedRows.includes(record.id) ? 'bg-emerald-50' : ''}`}
              >
                {exportMode && (
                  <TableCell className="px-4 py-3 whitespace-nowrap w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(record.id)}
                      onChange={() => onSelectRow?.(record.id)}
                      className="w-4 h-4 text-emerald-600 border-gray-400 rounded focus:ring-emerald-500"
                    />
                  </TableCell>
                )}
                {/* 1. 编码 */}
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onDetail(record)}
                    className="font-mono p-0 h-auto text-blue-600"
                    title="查看详情"
                  >
                    {record.pesticideCode || '-'}
                  </Button>
                </TableCell>
                {/* 2. 药剂名称 */}
                <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                  {record.pesticideName || '-'}
                </TableCell>
                {/* 3. 药剂成分 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={record.ingredient || ''}>
                  {record.ingredient || '-'}
                </TableCell>
                {/* 4. 含量 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={record.specContent || ''}>
                  {record.specContent || '-'}
                </TableCell>
                {/* 5. 品牌 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.brandName || '-'}
                </TableCell>
                {/* 6. 药剂类型（中文 chips，树形剪枝） */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 min-w-[220px] max-w-[320px]">
                  {renderPesticideTypeChips(record.pesticideTypes || (record as any).pesticideType, getDictLabel, dictionaries)}
                </TableCell>
                {/* 6. 剂型（formulation） */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.formulation || '-'}
                </TableCell>
                {/* 8. 功能说明 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={record.functionDesc || ''}>
                  {record.functionDesc || '-'}
                </TableCell>
                {/* 9. 使用禁忌 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={record.tabooDesc || ''}>
                  {record.tabooDesc || '-'}
                </TableCell>
                {/* 10. 包装规格 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={record.packageSpec || ''}>
                  {record.packageSpec || '-'}
                </TableCell>
                {/* 9. 库存量（颜色编码） */}
                <TableCell className="px-4 py-3 text-sm whitespace-nowrap text-right font-mono">
                  {(() => {
                    const stock = record.stockQuantity ?? 0;
                    const colorClass = stock === 0
                      ? 'text-red-600 font-semibold'
                      : stock < 50
                        ? 'text-amber-600 font-semibold'
                        : 'text-emerald-600 font-semibold';
                    return (
                      <span className={colorClass} title={stock === 0 ? '库存为零' : stock < 50 ? '库存偏低' : '库存充足'}>
                        {stock}
                      </span>
                    );
                  })()}
                </TableCell>
                {/* 10. 库存单位 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.stockUnit || '-'}
                </TableCell>
                {/* 11. 单价 */}
                <TableCell className="px-4 py-3 text-sm text-right font-mono whitespace-nowrap">
                  {record.unitPrice != null && record.unitPrice > 0
                    ? Number(record.unitPrice).toFixed(2)
                    : <span className="text-gray-400">-</span>}
                </TableCell>
                {/* 12. 生产厂家 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={record.manufacturer || ''}>
                  {record.manufacturer || '-'}
                </TableCell>
                {/* 13. 建议用量 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono">
                  {record.suggestedDosage || '-'}
                </TableCell>
                {/* 15. 单位（用量单位） */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.dosageUnit || '-'}
                </TableCell>
                {/* 16. 稀释比例 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono">
                  {record.suggestedRatio || '-'}
                </TableCell>
                {/* 17. 产品批次 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono" title={record.batchNumber || ''}>
                  {record.batchNumber || '-'}
                </TableCell>
                {/* 16. 生产日期 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.productionDate || '-'}
                </TableCell>
                {/* 17. 过期日期 — 2026-08-15 O3：过期/临期预警标记 */}
                <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                  {(() => {
                    const exp = record.expirationDate;
                    if (!exp) return <span className="text-gray-600">-</span>;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const expDate = new Date(exp);
                    expDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((expDate.getTime() - today.getTime()) / 86400000);
                    if (diffDays < 0) {
                      return (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-red-600 font-semibold">{exp}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">已过期</span>
                        </span>
                      );
                    }
                    if (diffDays <= 30) {
                      return (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-amber-600 font-semibold">{exp}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">临期</span>
                        </span>
                      );
                    }
                    return <span className="text-gray-600">{exp}</span>;
                  })()}
                </TableCell>
                {/* 19. 作用机制 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={record.mechanism || ''}>
                  {record.mechanism || '-'}
                </TableCell>
                {/* 20. 防治对象 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={record.targetPests || ''}>
                  {record.targetPests || '-'}
                </TableCell>
                {/* 21. 备注 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={record.remark || ''}>
                  {record.remark || '-'}
                </TableCell>
                {/* 20. 操作（粘性列，水平滚动时锁定右侧） */}
                {!exportMode && (
                  <TableCell className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStockIn?.(record)}
                        className="text-gray-500 hover:text-blue-600"
                        title="入库"
                      >
                        <Package className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(record)}
                        className="text-gray-500 hover:text-amber-600"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(record.id)}
                        className="text-gray-500 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
