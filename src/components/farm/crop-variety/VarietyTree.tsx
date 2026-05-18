/**
 * 作物品种库树形展示组件
 * 以树形结构展示品种分类，支持展开/折叠、搜索、筛选
 */

import React, { useState } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, List, GitBranch, Edit2, Save } from 'lucide-react';
import { VarietyTreeProps } from './types';
import { useVarietyTree } from './hooks/useVarietyTree';
import { VarietyTreeNode } from './VarietyTreeNode';
import { getCategoryOptions } from '../../../services/cropVarietyService';
import { CropVariety } from '../../../types/cropVariety';
import { useCropVarietyStore } from '../../../stores/useCropVarietyStore';

/**
 * 树形展示组件
 */
export function VarietyTree({
  viewMode,
  onViewModeChange,
  searchKeyword: externalSearchKeyword,
  categoryFilter: externalCategoryFilter,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onExpandChange,
  selectedId,
  inlineAddState,
  inlineAddCode,
  inlineAddName,
  onInlineAddCodeChange,
  onInlineAddNameChange,
  onInlineAddSave,
  onInlineAddCancel,
  isTreeEditing = false,
  onTreeEditingChange,
  onRefresh,
  refreshKey
}: VarietyTreeProps) {
  // 内部状态
  const [internalSearchNameKeyword, setInternalSearchNameKeyword] = useState('');
  const [internalSearchCodeKeyword, setInternalSearchCodeKeyword] = useState('');
  const [internalCategoryFilter, setInternalCategoryFilter] = useState('');

  // 使用外部或内部状态
  const searchNameKeyword = externalSearchKeyword !== undefined ? externalSearchKeyword : internalSearchNameKeyword;
  const searchCodeKeyword = externalSearchKeyword !== undefined ? externalSearchKeyword : internalSearchCodeKeyword;
  const categoryFilter = externalCategoryFilter !== undefined ? externalCategoryFilter : internalCategoryFilter;

  // 从 Store 获取已录入品种数据
  const store = useCropVarietyStore();
  const recordedVarieties = store.items;

  // 获取类别选项
  const categoryOptions = getCategoryOptions();

  // 使用树形Hook - 将两个搜索条件合并，默认显示全部
  const combinedSearchKeyword = searchNameKeyword || searchCodeKeyword;
  const {
    treeData,
    expandedKeys,
    toggleExpand,
    expandAll,
    collapseAll,
    expandToLevel,
    totalNodeCount
  } = useVarietyTree(combinedSearchKeyword, categoryFilter, 'all', 'subVariety1', refreshKey, recordedVarieties);

  // 通知展开状态变化
  React.useEffect(() => {
    if (onExpandChange) {
      onExpandChange(expandedKeys);
    }
  }, [expandedKeys, onExpandChange]);

  // 名称搜索处理
  const handleNameSearch = (value: string) => {
    if (externalSearchKeyword === undefined) {
      setInternalSearchNameKeyword(value);
    }
  };

  // 编码搜索处理
  const handleCodeSearch = (value: string) => {
    if (externalSearchKeyword === undefined) {
      setInternalSearchCodeKeyword(value);
    }
  };

  // 类别筛选处理
  const handleCategoryChange = (value: string) => {
    if (externalCategoryFilter === undefined) {
      setInternalCategoryFilter(value);
    }
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
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 flex-1"
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

          <button
            onClick={() => onAdd()}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            新增作物
          </button>
          {!isTreeEditing ? (
            <button
              onClick={() => onTreeEditingChange?.(true)}
              className="h-10 px-4 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center gap-2 flex-shrink-0"
            >
              <Edit2 className="w-4 h-4" />
              修改规则
            </button>
          ) : (
            <button
              onClick={() => onTreeEditingChange?.(false)}
              className="h-10 px-4 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center gap-2 flex-shrink-0"
            >
              退出编辑
            </button>
          )}
        </div>

        {/* 展开控制栏 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            共 {totalNodeCount} 个节点
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

      {/* 编辑模式提示 */}
      {isTreeEditing && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <span className="font-medium">编辑模式：</span>
            <span>• 点击展开图标查看下级分类</span>
            <span>• 悬停到类型/品种/子品种名称上可显示编辑和删除按钮</span>
            <span>• 点击新增按钮可添加子节点</span>
          </div>
        </div>
      )}

      {/* 树形列表 */}
      <div className="flex-1 overflow-auto">
        {treeData.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无数据</p>
            <p className="text-sm text-gray-400 mt-1">
              请调整筛选条件
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
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">作物品种</th>
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
                  selectedId={selectedId}
                  inlineAddState={inlineAddState}
                  inlineAddCode={inlineAddCode}
                  inlineAddName={inlineAddName}
                  onInlineAddCodeChange={onInlineAddCodeChange}
                  onInlineAddNameChange={onInlineAddNameChange}
                  onInlineAddSave={onInlineAddSave}
                  onInlineAddCancel={onInlineAddCancel}
                  isTreeEditing={isTreeEditing}
                  onRefresh={onRefresh}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
