/**
 * 作物品种库列表组件
 * 直接显示所有已录入的作物品种，不再使用折叠形式
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, List, GitBranch } from 'lucide-react';
import { CropVariety } from '../../../types/cropVariety';
import {
  getAllVarieties as getAllVarietiesFromService,
  getCategoryOptions,
  deleteVariety as deleteVarietyFromService,
  generateCropCode,
  initVarieties
} from '../../../services/cropVarietyService';
import { deleteVariety } from '../../../services/apiCropVarietyService';

type ViewMode = 'table' | 'tree';

interface CropVarietyTableProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelect: (variety: CropVariety) => void;
  onAdd: () => void;
  onEdit: (variety: CropVariety) => void;
  onDelete: (variety: CropVariety) => void;
  selectedId?: string;
  // 刷新键：当数据变化时递增此值触发刷新
  refreshKey?: number;
  // 权限控制
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function CropVarietyTable({
  viewMode,
  onViewModeChange,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  selectedId,
  refreshKey = 0,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: CropVarietyTableProps) {
  const [searchNameKeyword, setSearchNameKeyword] = useState('');
  const [searchCodeKeyword, setSearchCodeKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [allVarieties, setAllVarieties] = useState<CropVariety[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载数据（与树状图一致，使用本地服务）
  useEffect(() => {
    const data = getAllVarietiesFromService();
    setAllVarieties(data);
    setLoading(false);
  }, [refreshKey]);

  // 获取类目选项
  const categoryOptions = useMemo(() => getCategoryOptions(), []);

  // 过滤后的品种
  const filteredVarieties = useMemo(() => {
    let result = allVarieties;

    // 类别筛选
    if (categoryFilter) {
      result = result.filter(v => v.categoryCode === categoryFilter);
    }

    // 编码搜索
    if (searchCodeKeyword.trim()) {
      const keyword = searchCodeKeyword.toLowerCase();
      result = result.filter(v => {
        const fullCode = generateCropCode(
          v.categoryCode,
          v.typeCode,
          v.varietyCode,
          v.subVariety1Code,
          v.detailVarietyCode
        );
        return fullCode.toLowerCase().includes(keyword);
      });
    }

    // 名称搜索
    if (searchNameKeyword.trim()) {
      const keyword = searchNameKeyword.toLowerCase();
      result = result.filter(v => {
        if (v.varietyName?.toLowerCase().includes(keyword)) return true;
        if (v.subVariety1Name?.toLowerCase().includes(keyword)) return true;
        if (v.categoryName?.toLowerCase().includes(keyword)) return true;
        if (v.typeName?.toLowerCase().includes(keyword)) return true;
        return false;
      });
    }

    return result;
  }, [allVarieties, categoryFilter, searchNameKeyword, searchCodeKeyword]);

  // 分页
  const totalPages = Math.ceil(filteredVarieties.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredVarieties.length);
  const paginatedVarieties = filteredVarieties.slice(startIndex, endIndex);

  // 处理名称搜索
  const handleNameSearch = (value: string) => {
    setSearchNameKeyword(value);
    setCurrentPage(1);
  };

  // 处理编码搜索
  const handleCodeSearch = (value: string) => {
    setSearchCodeKeyword(value);
    setCurrentPage(1);
  };

  // 处理删除
  const handleDelete = (variety: CropVariety, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(variety);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
      {/* 搜索和操作栏 */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          {/* 视图切换 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-gray-600 font-medium">视图：</span>
            <button
              onClick={() => onViewModeChange('table')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              表格
            </button>
            <button
              onClick={() => onViewModeChange('tree')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === 'tree'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              树形
            </button>
          </div>

          {/* 搜索框区域 - 均匀分布 */}
          <div className="flex-1 flex items-center gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 flex-1"
            >
              <option value="">全部类别</option>
              {categoryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="作物品种搜索..."
                value={searchNameKeyword}
                onChange={(e) => handleNameSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="作物编码搜索..."
                value={searchCodeKeyword}
                onChange={(e) => handleCodeSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {canCreate && (
            <button
              onClick={onAdd}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              新增作物
            </button>
          )}
        </div>
      </div>

      {/* 表格内容 */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <h3 className="text-lg font-semibold text-gray-900">作物编码列表</h3>
      </div>
      <div className="flex-1 overflow-auto">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gradient-to-r from-emerald-500 to-green-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-36">编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-64">品种路径</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">作物品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedVarieties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                paginatedVarieties.map((variety) => (
                  <tr
                    key={variety.id}
                  className={`hover:bg-blue-50 transition-colors ${selectedId === variety.id ? 'bg-emerald-50' : ''}`}
                  onClick={() => onSelect(variety)}
                >
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 whitespace-nowrap">
                    {generateCropCode(
                      variety.categoryCode,
                      variety.typeCode,
                      variety.varietyCode,
                      variety.subVariety1Code,
                      variety.detailVarietyCode
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    <span className="text-gray-400">{variety.categoryName}</span>
                    <span className="text-gray-400 mx-0.5">-</span>
                    <span className="text-gray-400">{variety.typeName}</span>
                    <span className="text-gray-400 mx-0.5">-</span>
                    <span className="text-gray-700">{variety.varietyName}</span>
                    {variety.subVariety1Name && (
                      <>
                        <span className="text-gray-400 mx-0.5">-</span>
                        <span className="text-gray-700">{variety.subVariety1Name}</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                    {variety.subVariety1Name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      variety.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {variety.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(variety); }}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(variety); }}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="编辑品种"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(variety, e)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除品种"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
          <span className="text-sm">{totalPages > 0 ? `${currentPage} / ${totalPages}` : '0 / 0'}</span>
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
