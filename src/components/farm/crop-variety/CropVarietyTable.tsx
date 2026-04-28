/**
 * 作物品种库列表组件
 * 显示所有作物品种，支持搜索、筛选和折叠展开
 * 数据来源：produceCodeRule（预定义配置）+ CropVariety（用户录入数据）
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { CropVariety, CropVarietyOption } from '../../../types/cropVariety';
import {
  getVarietyOptions,
  getCategoryOptions,
  searchVarieties,
  deleteVariety
} from '../../../services/cropVarietyService';
import {
  produceCategories,
  getProduceTypesByCategory
} from '../../../data/produceCodeRule';

interface CropVarietyTableProps {
  onSelect: (variety: CropVariety) => void;
  onAdd: () => void;
  onEdit: (variety: CropVariety) => void;
  selectedId?: string;
}

// 预定义品种配置（来自 produceCodeRule）
interface PredefinedVariety {
  varietyKey: string;  // categoryCode-typeCode-varietyCode
  categoryCode: string;
  categoryName: string;
  typeCode: string;
  typeName: string;
  varietyCode: string;
  varietyName: string;
  subVarieties: Array<{ code: string; name: string }>;
}

// 已录入品种（来自 CropVariety 表）
interface ExistingVariety {
  cropCode: string;
  varietyName: string;
  subVariety1Code?: string;
  subVariety1Name?: string;
}

export function CropVarietyTable({
  onSelect,
  onAdd,
  onEdit,
  selectedId
}: CropVarietyTableProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedVarieties, setExpandedVarieties] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(20);

  // 从 produceCodeRule 读取预定义品种
  const predefinedVarieties = useMemo((): PredefinedVariety[] => {
    const result: PredefinedVariety[] = [];

    for (const category of produceCategories) {
      const types = getProduceTypesByCategory(category.code);

      for (const type of types) {
        for (const sub of type.subCategories) {
          result.push({
            varietyKey: `${category.code}-${type.code}-${sub.code}`,
            categoryCode: category.code,
            categoryName: category.name,
            typeCode: type.code,
            typeName: type.name,
            varietyCode: sub.code,
            varietyName: sub.name,
            subVarieties: sub.subVarieties || []
          });
        }
      }
    }

    return result;
  }, []);

  // 从 CropVariety 表读取已录入品种
  const existingVarieties = useMemo((): ExistingVariety[] => {
    const options = getVarietyOptions();
    return options.map(opt => ({
      cropCode: opt.value,
      varietyName: opt.label,
      subVariety1Code: opt.subVariety1Code,
      subVariety1Name: opt.subVariety1Name
    }));
  }, []);

  // 获取类目选项
  const categoryOptions = useMemo(() => getCategoryOptions(), []);

  // 过滤后的预定义品种
  const filteredVarieties = useMemo(() => {
    let result = predefinedVarieties;

    // 类别筛选
    if (categoryFilter) {
      result = result.filter(v => v.categoryCode === categoryFilter);
    }

    // 关键词搜索（搜索品种名称、子品种名称、已录入品种名称）
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(v => {
        // 匹配品种名称
        if (v.varietyName.toLowerCase().includes(keyword)) return true;
        // 匹配子品种名称
        if (v.subVarieties.some(sv => sv.name.toLowerCase().includes(keyword))) return true;
        // 匹配已录入品种
        const existing = existingVarieties.find(ev =>
          ev.varietyName.toLowerCase().includes(keyword) ||
          ev.subVariety1Name?.toLowerCase().includes(keyword)
        );
        if (existing) return true;
        return false;
      });
    }

    return result;
  }, [predefinedVarieties, categoryFilter, searchKeyword, existingVarieties]);

  // 展开/折叠品种
  const toggleVariety = (varietyKey: string) => {
    const newExpanded = new Set(expandedVarieties);
    if (newExpanded.has(varietyKey)) {
      newExpanded.delete(varietyKey);
    } else {
      newExpanded.add(varietyKey);
    }
    setExpandedVarieties(newExpanded);
  };

  // 展开/折叠所有
  const expandAll = () => {
    setExpandedVarieties(new Set(filteredVarieties.map(v => v.varietyKey)));
  };

  const collapseAll = () => {
    setExpandedVarieties(new Set());
  };

  // 获取品种下已录入的子品种
  const getExistingSubVarieties = (variety: PredefinedVariety): ExistingVariety[] => {
    return existingVarieties.filter(ev => {
      const prefix = `${variety.categoryCode}${variety.typeCode}${variety.varietyCode}`;
      return ev.cropCode.startsWith(prefix) && ev.cropCode.length === 11;
    });
  };

  // 分页
  const totalPages = Math.ceil(filteredVarieties.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredVarieties.length);
  const paginatedVarieties = filteredVarieties.slice(startIndex, endIndex);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1);
  };

  // 选中预定义品种
  const handleSelectVariety = (variety: PredefinedVariety, subVariety?: { code: string; name: string }) => {
    // 构建完整的作物编码
    const categoryCode = variety.categoryCode;
    const typeCode = variety.typeCode;
    const varietyCode = variety.varietyCode;
    const subVariety1Code = subVariety ? subVariety.code.padStart(3, '0') : '000';
    const detailCode = '00'; // 用户录入时分配

    const cropCode = `${categoryCode}${typeCode}${varietyCode}${subVariety1Code}${detailCode}`;

    onSelect({
      id: cropCode,
      cropCode,
      categoryCode: categoryCode as any,
      categoryName: variety.categoryName,
      typeCode: variety.typeCode,
      typeName: variety.typeName,
      varietyCode: variety.varietyCode,
      varietyName: subVariety ? subVariety.name : variety.varietyName,
      subVariety1Code: subVariety ? subVariety.code.padStart(3, '0') : undefined,
      subVariety1Name: subVariety ? subVariety.name : undefined,
      alias: [],
      status: 'active',
      createTime: '',
      updateTime: ''
    });
  };

  // 判断品种是否有子品种1配置
  const hasSubVarieties = (variety: PredefinedVariety): boolean => {
    return variety.subVarieties.length > 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 搜索和操作栏 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索品种名称或子品种..."
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部类别</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={onAdd}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增品种
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
        {/* 表头和标题区域 */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-base font-semibold text-gray-700">作物编码列表</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">共 {filteredVarieties.length} 个品种</span>
              <span className="text-gray-300">|</span>
              <button
                onClick={expandAll}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                全部展开
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                全部折叠
              </button>
            </div>
          </div>
        </div>
        {/* 表格内容 */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table className="w-full" style={{ minWidth: '1200px', tableLayout: 'fixed' }}>
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">展开</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">类别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">子品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-36">详情作物名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-36">作物编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginatedVarieties.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
              paginatedVarieties.map((variety) => {
                const existingSubs = getExistingSubVarieties(variety);
                const hasSub = hasSubVarieties(variety);
                const isExpanded = expandedVarieties.has(variety.varietyKey);

                return (
                  <React.Fragment key={variety.varietyKey}>
                    {/* 品种主行 */}
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => toggleVariety(variety.varietyKey)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title={hasSub ? (isExpanded ? '点击折叠' : `展开 ${variety.subVarieties.length} 个子品种`) : '暂无子品种'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{variety.categoryName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{variety.typeName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {variety.varietyName}
                        {hasSub && <span className="text-xs text-gray-400 ml-1">({variety.subVarieties.length})</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {isExpanded ? '点击折叠' : (hasSub ? `点击展开 ${variety.subVarieties.length} 个子品种` : '暂无子品种')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">-</td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                        {variety.categoryCode}{variety.typeCode}{variety.varietyCode}
                        {hasSub ? 'XXXXX' : '00000'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          启用
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSelectVariety(variety)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onAdd()}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="新增子品种"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 子品种1展开行 */}
                    {isExpanded && hasSub && variety.subVarieties.map((sub, idx) => {
                      const existingForSub = existingSubs.find(es =>
                        es.subVariety1Code === sub.code.padStart(3, '0')
                      );

                      return (
                        <tr
                          key={`${variety.varietyKey}-${sub.code}`}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap"></td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{variety.categoryName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{variety.typeName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            <span className="ml-4 mr-1">└</span>{variety.varietyName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {sub.name}
                            {existingForSub && <span className="text-xs text-green-600 ml-1">✓ 已录入</span>}
                            {!existingForSub && <span className="text-xs text-orange-500 ml-1">待录入</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {existingForSub?.varietyName || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                            {variety.categoryCode}{variety.typeCode}{variety.varietyCode}{sub.code.padStart(3, '0')}00
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {existingForSub ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">启用</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">待录入</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSelectVariety(variety, sub)}
                                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                title="查看详情"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onAdd()}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="录入此品种"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {filteredVarieties.length} 条</span>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
