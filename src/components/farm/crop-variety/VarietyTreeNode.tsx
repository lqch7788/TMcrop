/**
 * 作物品种库树形节点组件
 * 递归渲染树形结构的单个节点及其子节点
 * 参照 supplier-code-rule 页面的编辑模式
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Eye, Edit2, Trash2, Save, X } from 'lucide-react';
import { VarietyTreeNode as VarietyTreeNodeType } from './types';
import { CropVariety } from '../../../types/cropVariety';
import * as extensionService from '../../../services/cropVarietyExtensionService';
import { Button } from '@/components/ui/button';

interface VarietyTreeNodeProps {
  node: VarietyTreeNodeType;
  expandedKeys: string[];
  onToggleExpand: (key: string) => void;
  onSelect: (variety: CropVariety) => void;
  onAdd: (node: VarietyTreeNodeType) => void;
  onEdit: (variety: CropVariety) => void;
  onDelete: (variety: CropVariety) => void;
  level?: number;
  selectedId?: string;
  inlineAddState?: {
    active: boolean;
    level: 'type' | 'variety' | 'subVariety1';
    parentKey: string;
  };
  inlineAddCode?: string;
  inlineAddName?: string;
  onInlineAddCodeChange?: (code: string) => void;
  onInlineAddNameChange?: (name: string) => void;
  onInlineAddSave?: () => void;
  onInlineAddCancel?: () => void;
  /** 树形编辑模式 */
  isTreeEditing?: boolean;
  /** 刷新数据回调 */
  onRefresh?: () => void;
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
  level = 0,
  selectedId,
  inlineAddState,
  inlineAddCode = '',
  inlineAddName = '',
  onInlineAddCodeChange,
  onInlineAddNameChange,
  onInlineAddSave,
  onInlineAddCancel,
  isTreeEditing = false,
  onRefresh
}: VarietyTreeNodeProps) {
  const isExpanded = expandedKeys.includes(node.key);
  const hasChildren = node.hasChildren;
  const isInlineAdding = inlineAddState?.active && inlineAddState?.parentKey === node.key;

  // 内联编辑状态
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // 开始内联编辑
  const startInlineEdit = () => {
    setEditValue(node.name);
    setIsInlineEditing(true);
  };

  // 保存内联编辑
  const saveInlineEdit = async () => {
    if (!editValue.trim() || editValue.trim() === node.name) {
      setIsInlineEditing(false);
      return;
    }

    const extensionId = (node as any).extensionId;
    try {
      if (node.level === 'type' && extensionId) {
        await extensionService.updateTypeExtension(extensionId, editValue.trim());
      } else if (node.level === 'variety' && extensionId) {
        await extensionService.updateVarietyExtension(extensionId, editValue.trim());
      } else if (node.level === 'subVariety1' && extensionId) {
        await extensionService.updateSubVariety1Extension(extensionId, editValue.trim());
      }
      onRefresh?.();
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
    setIsInlineEditing(false);
  };

  // 取消内联编辑
  const cancelInlineEdit = () => {
    setIsInlineEditing(false);
    setEditValue('');
  };

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
      // detail 节点：直接使用 recordedVariety，不过覆盖 varietyName
      onSelect(node.recordedVariety);
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
        varietyName: node.path.varietyName,
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
      // detail 级别：打开编辑作物品种弹窗
      onEdit(node.recordedVariety);
    } else if ((node as any).isExtension) {
      // 扩展节点：类别/类型/品种/子品种 - 弹出输入框编辑
      const levelNames: Record<string, string> = {
        'category': '类别',
        'type': '类型',
        'variety': '品种',
        'subVariety1': '子品种'
      };
      const levelName = levelNames[node.level] || node.level;
      const newName = prompt(`请输入新的${levelName}名称：`, node.name);
      if (newName && newName.trim() && newName.trim() !== node.name) {
        const extensionId = (node as any).extensionId;
        // 根据节点级别调用不同的更新 API
        if (node.level === 'category' && extensionId) {
          extensionService.updateCategoryExtension(extensionId, newName.trim()).then(() => {
            onRefresh?.();
          }).catch((err: Error) => alert('更新失败: ' + err.message));
        } else if (node.level === 'type' && extensionId) {
          extensionService.updateTypeExtension(extensionId, newName.trim()).then(() => {
            onRefresh?.();
          }).catch((err: Error) => alert('更新失败: ' + err.message));
        } else if (node.level === 'variety' && extensionId) {
          extensionService.updateVarietyExtension(extensionId, newName.trim()).then(() => {
            onRefresh?.();
          }).catch((err: Error) => alert('更新失败: ' + err.message));
        } else if (node.level === 'subVariety1' && extensionId) {
          extensionService.updateSubVariety1Extension(extensionId, newName.trim()).then(() => {
            onRefresh?.();
          }).catch((err: Error) => alert('更新失败: ' + err.message));
        }
      }
    }
  };

  // 处理删除
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.recordedVariety) {
      onDelete(node.recordedVariety);
    } else if ((node as any).isExtension) {
      // 扩展节点删除确认
      const levelNames: Record<string, string> = {
        'category': '类别',
        'type': '类型',
        'variety': '品种',
        'subVariety1': '子品种'
      };
      const levelKey = node.level as string;
      const levelName = levelNames[levelKey] || levelKey;
      if (confirm(`确定要删除这个${levelName} "${node.name}" 吗？此操作不可恢复。`)) {
        const extensionId = (node as any).extensionId;
        if (node.level === 'category' && extensionId) {
          extensionService.removeCategoryExtension(extensionId).then(() => {
            onRefresh?.();
          }).catch(err => alert('删除失败: ' + err.message));
        } else if (node.level === 'type' && extensionId) {
          extensionService.removeTypeExtension(extensionId).then(() => {
            onRefresh?.();
          }).catch(err => alert('删除失败: ' + err.message));
        } else if (node.level === 'variety' && extensionId) {
          extensionService.removeVarietyExtension(extensionId).then(() => {
            onRefresh?.();
          }).catch(err => alert('删除失败: ' + err.message));
        } else if (node.level === 'subVariety1' && extensionId) {
          extensionService.removeSubVariety1Extension(extensionId).then(() => {
            onRefresh?.();
          }).catch(err => alert('删除失败: ' + err.message));
        }
      }
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
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        title={isExpanded ? '点击折叠' : `展开 ${node.childCount} 个子节点`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-emerald-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-emerald-600" />
        )}
      </Button>
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
        <td className="px-4 py-1">
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
        <td className="px-4 py-1">
          {node.level === 'type' ? (
            <div className="flex items-center gap-2">
              {renderToggleButton()}
              <span className="font-mono text-blue-600 font-medium text-sm">{node.code}</span>
              {isInlineEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveInlineEdit();
                      if (e.key === 'Escape') cancelInlineEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-32 px-2 py-1 border border-amber-500 rounded text-sm focus:outline-none"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); saveInlineEdit(); }}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); cancelInlineEdit(); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-gray-700 text-sm">{node.name}</span>
                  {isTreeEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); startInlineEdit(); }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDelete(e); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 品种列 - 只有品种级别显示，箭头在文字前面 */}
        <td className="px-4 py-1">
          {node.level === 'variety' ? (
            <div className="flex items-center gap-2">
              {renderToggleButton()}
              <span className="font-mono text-blue-600 text-sm">{node.code}</span>
              {isInlineEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveInlineEdit();
                      if (e.key === 'Escape') cancelInlineEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-32 px-2 py-1 border border-amber-500 rounded text-sm focus:outline-none"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); saveInlineEdit(); }}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); cancelInlineEdit(); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-gray-700 text-sm">{node.name}</span>
                  {hasChildren && (
                    <span className="text-xs text-gray-400 ml-1">({node.childCount})</span>
                  )}
                  {isTreeEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); startInlineEdit(); }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDelete(e); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 子品种列 - 只有子品种级别显示，箭头在文字前面 */}
        <td className="px-4 py-1">
          {node.level === 'subVariety1' ? (
            <div className="flex items-center gap-2">
              {renderToggleButton()}
              <span className="font-mono text-green-600 text-sm">{node.code}</span>
              {isInlineEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveInlineEdit();
                      if (e.key === 'Escape') cancelInlineEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-32 px-2 py-1 border border-amber-500 rounded text-sm focus:outline-none"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); saveInlineEdit(); }}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); cancelInlineEdit(); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-gray-700 text-sm">{node.name}</span>
                  {node.isRecorded && (
                    <span className="text-xs text-green-600 ml-1">✓</span>
                  )}
                  {isTreeEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); startInlineEdit(); }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDelete(e); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 详细名称列 - 只有详细品种级别显示 */}
        <td className="px-4 py-1">
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
        <td className="px-4 py-1">
          {node.level === 'detail' ? (
            <span className="font-mono text-blue-600 text-sm font-medium">{getFullCropCode()}</span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* 状态 */}
        <td className="px-4 py-1 whitespace-nowrap">
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
        <td className="px-4 py-1 whitespace-nowrap">
          <div className="flex items-center gap-1">
            {(node.isRecorded || node.level === 'detail') && (
              <Button size="icon" variant="ghost" onClick={handleSelect} title="查看详情">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            )}
            {node.level !== 'detail' && (
              <Button size="icon" variant="ghost" onClick={handleAdd} title="新增子品种">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}
            {/* 编辑按钮：对于已录入品种或扩展节点 */}
            {(node.isRecorded || (node as any).isExtension) && (
              <Button size="icon" variant="ghost" onClick={handleEdit} title={(node as any).isExtension ? '编辑' : '编辑品种'}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {/* 删除按钮：仅扩展节点可删除（预定义节点不可删除），已录入品种也可删除 */}
            {((node as any).isExtension || node.recordedVariety) && (
              <Button size="icon" variant="ghost" onClick={handleDelete} title={(node as any).isExtension ? '删除' : '删除品种'}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* 内联新增表单 */}
      {isInlineAdding && (
        <tr className="bg-yellow-50 border-l-4 border-yellow-400">
          <td className="px-4 py-2" colSpan={8}>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                {inlineAddState.level === 'type' && '新增类型：'}
                {inlineAddState.level === 'variety' && '新增品种：'}
                {inlineAddState.level === 'subVariety1' && '新增子品种：'}
              </span>
              <input
                type="text"
                value={inlineAddCode}
                onChange={(e) => onInlineAddCodeChange?.(e.target.value)}
                placeholder="编号"
                className="w-24 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={inlineAddName}
                onChange={(e) => onInlineAddNameChange?.(e.target.value)}
                placeholder="名称"
                className="w-40 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button variant="default" size="sm" onClick={onInlineAddSave}>
                保存
              </Button>
              <Button variant="secondary" size="sm" onClick={onInlineAddCancel}>
                取消
              </Button>
            </div>
          </td>
        </tr>
      )}

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
    </>
  );
}
