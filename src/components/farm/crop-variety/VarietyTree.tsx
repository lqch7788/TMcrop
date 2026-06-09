/**
 * 作物品种库树形展示组件
 * 以树形结构展示品种分类，支持展开/折叠、搜索、筛选
 */

import React, { useState } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, List, GitBranch, Edit2, Save, FolderPlus } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui';
import { VarietyTreeProps } from './types';
import { useVarietyTree } from './hooks/useVarietyTree';
import { VarietyTreeNode } from './VarietyTreeNode';
import { getCategoryOptions } from '../../../services/cropVarietyService';
import { CropVariety } from '../../../types/cropVariety';
import { useCropVarietyStore } from '../../../stores/useCropVarietyStore';
import * as extensionService from '../../../services/cropVarietyExtensionService';

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

  // 新增类别
  const handleAddCategory = () => {
    const code = prompt('请输入类别编码（2位大写字母，如：FR）：');
    if (!code || !code.trim()) return;
    const name = prompt('请输入类别名称（如：水果类）：');
    if (!name || !name.trim()) return;
    extensionService.addCategoryExtension(code.trim().toUpperCase(), name.trim())
      .then(() => onRefresh?.())
      .catch((err: Error) => showAlert('新增类别失败: ' + err.message));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
      {/* 搜索和操作栏 */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          {/* 视图切换 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-gray-600 font-medium">视图：</span>
            <Button
              variant={viewMode === 'table' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => onViewModeChange('table')}
            >
              <List className="w-4 h-4" />
              表格
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => onViewModeChange('tree')}
            >
              <GitBranch className="w-4 h-4" />
              树形
            </Button>
          </div>

          {/* 搜索框区域 - 均匀分布 */}
          <div className="flex-1 flex items-center gap-4">
            <Select
              value={categoryFilter}
              onValueChange={(val) => handleCategoryChange(val)}
            >
              <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 flex-1">
                <SelectValue placeholder="全部类别" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="作物品种搜索..."
                value={searchNameKeyword}
                onChange={(e) => handleNameSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border-2 border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="作物编码搜索..."
                value={searchCodeKeyword}
                onChange={(e) => handleCodeSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border-2 border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
            onClick={handleAddCategory}
          >
            <FolderPlus className="w-4 h-4" />
            <Plus className="w-4 h-4" /> 新增类别
          </Button>
          <Button
            size="sm"
            className="flex-shrink-0"
            onClick={() => onAdd()}
          >
            <Plus className="w-4 h-4" />
            新增作物
          </Button>
          {!isTreeEditing ? (
            <Button
              variant="warning"
              size="sm"
              className="flex-shrink-0"
              onClick={() => onTreeEditingChange?.(true)}
            >
              <Edit2 className="w-4 h-4" />
              修改规则
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-gray-500 hover:bg-gray-600 text-white flex-shrink-0"
              onClick={() => onTreeEditingChange?.(false)}
            >
              <Edit2 className="w-4 h-4" /> 退出编辑
            </Button>
          )}
        </div>

        {/* 展开控制栏 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            共 {totalNodeCount} 个节点
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="link"
              size="sm"
              onClick={() => expandToLevel('subVariety1')}
            >
              展开到子品种
            </Button>
            <span className="text-gray-300">|</span>
            <Button
              variant="link"
              size="sm"
              onClick={expandAll}
            >
              全部展开
            </Button>
            <span className="text-gray-300">|</span>
            <Button
              variant="link"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={collapseAll}
            >
              全部折叠
            </Button>
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
          <Table style={{ tableLayout: 'fixed' }}>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white sticky top-0 z-10">
              <TableRow>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-24 text-white">类别</TableHead>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-24 text-white">类型</TableHead>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-28 text-white">品种</TableHead>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-28 text-white">子品种</TableHead>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-32 text-white">作物品种</TableHead>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-36 text-white">编码</TableHead>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-20 text-white">状态</TableHead>
                <TableHead className="py-2 text-sm font-semibold whitespace-nowrap w-24 text-white">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
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
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
