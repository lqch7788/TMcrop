/**
 * 作物品种库列表组件
 * 直接显示所有已录入的作物品种，不再使用折叠形式
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Label } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { CropVariety } from '../../../types/cropVariety';
import {
  getCategoryOptions,
  generateCropCode
} from '../../../services/cropVarietyService';
import { useCropVarietyStore } from '../../../stores/useCropVarietyStore';

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

  // 从 Zustand Store 获取数据
  const store = useCropVarietyStore();
  const { items: allVarieties, isLoading: loading } = store;

  // 类目选项（静态数据来自 produceCodeRule）
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
          {/* 2026-07-27：视图切换已上移到 CropVarietyManagement 顶栏（编码规则前面），此处移除避免重复 */}

          {/* 搜索框区域 - 均匀分布（2026-07-27：每个搜索框加 Label 字段名） */}
          <div className="flex-1 flex items-start gap-4">
            {/* 类别 */}
            <div className="flex-1">
              <Label className="text-xs text-gray-500 mb-1 block">类别</Label>
              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 px-3 border-2 border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 w-full">
                  <SelectValue placeholder="全部类别" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 作物品种搜索 */}
            <div className="flex-1">
              <Label className="text-xs text-gray-500 mb-1 block">作物品种名称</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="按作物品种名称搜索..."
                  value={searchNameKeyword}
                  onChange={(e) => handleNameSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border-2 border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            {/* 作物编码搜索 */}
            <div className="flex-1">
              <Label className="text-xs text-gray-500 mb-1 block">作物编码</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="按9位编码搜索（如 FR0101001）..."
                  value={searchCodeKeyword}
                  onChange={(e) => handleCodeSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border-2 border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">作物编码列表</h3>
        {/* 2026-07-27：新增作物按钮从第一行筛选区移到与标题同一行（靠右） */}
        {canCreate && (
          <Button
            size="sm"
            onClick={onAdd}
          >
            <Plus className="w-4 h-4" />
            新增作物
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white sticky top-0 z-10">
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
                    {/* 2026-07-28 修复：直接用数据库 cropCode 字段（与详情页一致），不再用 generateCropCode 实时拼接
                        （拼接逻辑会忽略 null 的 subVariety1Code 填 '000'，导致多个不同记录显示成同一编码） */}
                    {variety.cropCode}
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
                    {variety.subVariety1Name || variety.varietyName || '-'}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onSelect(variety); }}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onEdit(variety); }}
                          title="编辑品种"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(variety, e)}
                          title="删除品种"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          showPageSize
          pageSizeOptions={[10, 20, 50]}
        />
      </div>
    </div>
  );
}
