/**
 * 作物品种库树形展示组件
 * 以树形结构展示品种分类，支持展开/折叠、搜索、筛选
 */

import React, { useState } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, List, GitBranch } from 'lucide-react';
import { VarietyTreeProps, DisplayMode } from './types';
import { useVarietyTree } from './hooks/useVarietyTree';
import { VarietyTreeNode } from './VarietyTreeNode';
import { getCategoryOptions } from '../../../services/cropVarietyService';
import { CropVariety } from '../../../types/cropVariety';

/**
 * 树形展示组件
 */
export function VarietyTree({
  searchKeyword: externalSearchKeyword,
  categoryFilter: externalCategoryFilter,
  displayMode,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onExpandChange
}: VarietyTreeProps) {
  // 内部状态
  const [internalSearchKeyword, setInternalSearchKeyword] = useState('');
  const [internalCategoryFilter, setInternalCategoryFilter] = useState('');

  // 使用外部或内部状态
  const searchKeyword = externalSearchKeyword !== undefined ? externalSearchKeyword : internalSearchKeyword;
  const categoryFilter = externalCategoryFilter !== undefined ? externalCategoryFilter : internalCategoryFilter;

  // 获取类别选项
  const categoryOptions = getCategoryOptions();

  // 使用树形Hook
  const {
    treeData,
    expandedKeys,
    toggleExpand,
    expandAll,
    collapseAll,
    expandToLevel,
    totalNodeCount,
    recordedNodeCount
  } = useVarietyTree(searchKeyword, categoryFilter, displayMode, 'subVariety1');

  // 通知展开状态变化
  React.useEffect(() => {
    if (onExpandChange) {
      onExpandChange(expandedKeys);
    }
  }, [expandedKeys, onExpandChange]);

  // 搜索处理
  const handleSearch = (value: string) => {
    if (externalSearchKeyword === undefined) {
      setInternalSearchKeyword(value);
    }
  };

  // 类别筛选处理
  const handleCategoryChange = (value: string) => {
    if (externalCategoryFilter === undefined) {
      setInternalCategoryFilter(value);
    }
  };

  // 切换显示模式
  const handleDisplayModeChange = (mode: DisplayMode) => {
    // 通过URL参数或状态管理来同步，这里暂时用console.log
    console.log('Display mode changed to:', mode);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
      {/* 搜索和操作栏 */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索品种名称..."
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部类别</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => onAdd()}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增品种
          </button>
        </div>

        {/* 展开控制栏 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {displayMode === 'recorded'
              ? `已录入 ${recordedNodeCount} 个品种`
              : `共 ${totalNodeCount} 个节点`
            }
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => expandToLevel('subVariety1')}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              展开到子品种
            </button>
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

      {/* 树形列表 */}
      <div className="flex-1 overflow-auto">
        {treeData.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{displayMode === 'recorded' ? '暂无已录入的品种' : '暂无数据'}</p>
            <p className="text-sm text-gray-400 mt-1">
              {displayMode === 'recorded'
                ? '点击"新增品种"开始录入'
                : '请调整筛选条件'
              }
            </p>
          </div>
        ) : (
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gradient-to-r from-emerald-500 to-green-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">类别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">子品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">作物名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-36">编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {treeData.map(node => (
                <VarietyTreeNode
                  key={node.key}
                  node={node}
                  expandedKeys={expandedKeys}
                  onToggleExpand={toggleExpand}
                  onSelect={onSelect}
                  onAdd={onAdd}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  level={0}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
