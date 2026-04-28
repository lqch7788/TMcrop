/**
 * 作物品种库树形节点组件
 * 递归渲染树形结构的单个节点及其子节点
 */

import React from 'react';
import { ChevronDown, ChevronRight, Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { VarietyTreeNode as VarietyTreeNodeType } from './types';
import { CropVariety } from '../../../types/cropVariety';

interface VarietyTreeNodeProps {
  node: VarietyTreeNodeType;
  expandedKeys: string[];
  onToggleExpand: (key: string) => void;
  onSelect: (variety: CropVariety) => void;
  onAdd: (node: VarietyTreeNodeType) => void;
  onEdit: (variety: CropVariety) => void;
  onDelete: (variety: CropVariety) => void;
  level?: number;
}

/**
 * 获取层级对应的样式
 */
const getLevelStyles = (level: string, isExpanded: boolean) => {
  const baseStyles = 'border-b border-gray-100 hover:bg-blue-50 transition-colors';

  switch (level) {
    case 'category':
      return `${baseStyles} bg-gradient-to-r from-blue-50 to-indigo-50 font-semibold`;
    case 'type':
      return `${baseStyles} bg-gray-50`;
    case 'variety':
      return `${baseStyles} ${isExpanded ? 'bg-green-50' : ''}`;
    case 'subVariety1':
      return `${baseStyles} ${isExpanded ? 'bg-emerald-50' : ''}`;
    case 'detail':
      return `${baseStyles} bg-white`;
    default:
      return baseStyles;
  }
};

/**
 * 获取操作按钮样式
 */
const getActionButtonClass = (variant: 'view' | 'add' | 'edit' | 'delete') => {
  const base = 'p-1.5 rounded transition-colors';
  switch (variant) {
    case 'view':
      return `${base} text-gray-500 hover:text-emerald-600 hover:bg-emerald-50`;
    case 'add':
      return `${base} text-gray-500 hover:text-blue-600 hover:bg-blue-50`;
    case 'edit':
      return `${base} text-gray-500 hover:text-amber-600 hover:bg-amber-50`;
    case 'delete':
      return `${base} text-gray-500 hover:text-red-600 hover:bg-red-50`;
    default:
      return base;
  }
};

/**
 * 树形节点组件
 * 参照作物编码规则页面的展开样式：每一级只在自己的列显示信息，箭头在对应层级文字旁边
 */
export function VarietyTreeNode({
  node,
  expandedKeys,
  onToggleExpand,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  level = 0
}: VarietyTreeNodeProps) {
  const isExpanded = expandedKeys.includes(node.key);
  const hasChildren = node.hasChildren;

  // 构建完整11位作物编码显示
  const getFullCropCode = (): string => {
    // detail级别：显示完整编码
    if (node.level === 'detail') {
      const { categoryCode, typeCode, varietyCode, subVariety1Code } = node.path;
      const sub1 = subVariety1Code || node.code || '000';
      const detail = node.code || '00';
      return `${categoryCode}${typeCode}${varietyCode}${sub1}${detail}`;
    }
    return '-';
  };

  // 处理点击选择
  const handleSelect = () => {
    if (node.level === 'detail' && node.recordedVariety) {
      // detail 节点：使用 node.name（显示名称）覆盖 recordedVariety.varietyName
      const updatedVariety: CropVariety = {
        ...node.recordedVariety,
        varietyName: node.name  // 使用树形中显示的名称
      };
      onSelect(updatedVariety);
    } else if (node.level === 'subVariety1' && node.isRecorded) {
      const { categoryCode, typeCode, varietyCode, subVariety1Code, subVariety1Name } = node.path;
      const mockVariety: CropVariety = {
        id: node.key,
        cropCode: `${categoryCode}${typeCode}${varietyCode}${subVariety1Code || node.code}00`,
        categoryCode,
        categoryName: node.path.categoryName,
        typeCode,
        typeName: node.path.typeName,
        varietyCode,
        subVariety1Code: subVariety1Code || node.code,
        subVariety1Name: subVariety1Name || node.name,
        varietyName: subVariety1Name || node.name,
        alias: [],
        status: 'active',
        createTime: '',
        updateTime: ''
      };
      onSelect(mockVariety);
    }
  };

  // 处理新增
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(node);
  };

  // 处理编辑
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.recordedVariety) {
      onEdit(node.recordedVariety);
    }
  };

  // 处理删除
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.recordedVariety) {
      onDelete(node.recordedVariety);
    }
  };

  // 处理展开/折叠
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(node.key);
    }
  };

  // 渲染展开/折叠按钮
  const renderToggleButton = () => {
    if (!hasChildren) return <span className="w-4 inline-block" />;
    return (
      <button
        onClick={handleToggle}
        className="p-0.5 hover:bg-gray-200 rounded transition-colors"
        title={isExpanded ? '点击折叠' : `展开 ${node.childCount} 个子节点`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-emerald-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-emerald-600" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* 节点行 */}
      <tr
        className={getLevelStyles(node.level, isExpanded)}
        onClick={handleSelect}
        style={{ cursor: node.isRecorded || node.level === 'detail' ? 'pointer' : 'default' }}
      >
        {/* 类别列 - 只有类别级别显示，箭头在文字前面 */}
        <td className="px-4 py-2">
          {node.level === 'category' ? (
            <div className="flex items-center gap-2">
              {renderToggleButton()}
              <span className="font-mono font-bold text-blue-600 text-sm">{node.code}</span>
              <span className="font-semibold text-gray-800 text-sm">{node.name}</span>
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 类型列 - 只有类型级别显示，箭头在文字前面 */}
        <td className="px-4 py-2">
          {node.level === 'type' ? (
            <div className="flex items-center gap-2">
              {renderToggleButton()}
              <span className="font-mono text-blue-600 font-medium text-sm">{node.code}</span>
              <span className="text-gray-700 text-sm">{node.name}</span>
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 品种列 - 只有品种级别显示，箭头在文字前面 */}
        <td className="px-4 py-2">
          {node.level === 'variety' ? (
            <div className="flex items-center gap-2">
              {renderToggleButton()}
              <span className="font-mono text-blue-600 text-sm">{node.code}</span>
              <span className="text-gray-700 text-sm">{node.name}</span>
              {hasChildren && (
                <span className="text-xs text-gray-400 ml-1">({node.childCount})</span>
              )}
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 子品种列 - 只有子品种级别显示，箭头在文字前面 */}
        <td className="px-4 py-2">
          {node.level === 'subVariety1' ? (
            <div className="flex items-center gap-2">
              {renderToggleButton()}
              <span className="font-mono text-green-600 text-sm">{node.code}</span>
              <span className="text-gray-700 text-sm">{node.name}</span>
              {node.isRecorded && (
                <span className="text-xs text-green-600 ml-1">✓</span>
              )}
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 详细名称列 - 只有详细品种级别显示 */}
        <td className="px-4 py-2">
          {node.level === 'detail' ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-green-600 text-sm">{node.code}</span>
              <span className="font-medium text-emerald-700 text-sm">{node.name}</span>
            </div>
          ) : node.level === 'subVariety1' && node.isRecorded ? (
            // 子品种1有子节点（详细品种），显示子节点数量
            <span className="text-xs text-gray-500">({node.childCount})</span>
          ) : node.isRecorded ? (
            <span className="text-green-600 text-sm">✓ 已录入</span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 编码列 - 只有详细品种显示完整11位编码 */}
        <td className="px-4 py-2">
          {node.level === 'detail' ? (
            <span className="font-mono text-blue-600 text-sm font-medium">{getFullCropCode()}</span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 状态 */}
        <td className="px-4 py-2 whitespace-nowrap">
          {node.isRecorded || node.level === 'detail' ? (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
              启用
            </span>
          ) : hasChildren ? (
            <span className="text-xs text-blue-600">{node.childCount}</span>
          ) : (
            <span className="text-xs text-gray-400">待录入</span>
          )}
        </td>

        {/* 操作 */}
        <td className="px-4 py-2 whitespace-nowrap">
          <div className="flex items-center gap-1">
            {(node.isRecorded || node.level === 'detail') && (
              <button
                onClick={handleSelect}
                className={getActionButtonClass('view')}
                title="查看详情"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            {node.level !== 'detail' && (
              <button
                onClick={handleAdd}
                className={getActionButtonClass('add')}
                title="新增子品种"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {node.isRecorded && node.level !== 'category' && node.level !== 'type' && (
              <button
                onClick={handleEdit}
                className={getActionButtonClass('edit')}
                title="编辑品种"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {node.isRecorded && node.level !== 'category' && node.level !== 'type' && (
              <button
                onClick={handleDelete}
                className={getActionButtonClass('delete')}
                title="删除品种"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* 递归渲染子节点 */}
      {isExpanded && hasChildren && node.children.map(child => (
        <VarietyTreeNode
          key={child.key}
          node={child}
          expandedKeys={expandedKeys}
          onToggleExpand={onToggleExpand}
          onSelect={onSelect}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
          level={level + 1}
        />
      ))}
    </>
  );
}
