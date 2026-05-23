/**
 * 作物编码规则页面 - 表格组件
 * 处理树形嵌套结构的表格渲染
 */
import React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { getProduceTypesByCategory } from '../../../data/produceCodeRule';
import type { ProduceCategories, EditingCell } from './types/produceCodeRule.types';

interface ProduceCodeRuleTableProps {
  categories: ProduceCategories;
  expandedCategory: Set<string>;
  expandedType: Set<string>;
  expandedSub: Set<string>;
  isEditing: boolean;
  editingCell: EditingCell | null;
  editValue: string;
  showAddType: string | null;
  showAddSub: { categoryCode: string; typeCode: string } | null;
  showAddSubVariety1: { categoryCode: string; typeCode: string; subCode: string } | null;
  newTypeCode: string;
  newTypeName: string;
  newSubCode: string;
  newSubName: string;
  newSubVariety1Code: string;
  newSubVariety1Name: string;
  newCategoryCode: string;
  newCategoryName: string;
  onToggleCategory: (code: string) => void;
  onToggleType: (categoryCode: string, typeCode: string) => void;
  onToggleSub: (categoryCode: string, typeCode: string, subCode: string) => void;
  onStartEdit: (type: EditingCell['type'], categoryCode: string, typeCode?: string, subCode?: string, currentName?: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onSetShowAddType: (code: string | null) => void;
  onSetShowAddSub: (state: { categoryCode: string; typeCode: string } | null) => void;
  onSetShowAddSubVariety1: (state: { categoryCode: string; typeCode: string; subCode: string } | null) => void;
  onSetShowAddCategory: (show: boolean) => void;
  onNewTypeCodeChange: (code: string) => void;
  onNewTypeNameChange: (name: string) => void;
  onNewSubCodeChange: (code: string) => void;
  onNewSubNameChange: (name: string) => void;
  onNewSubVariety1CodeChange: (code: string) => void;
  onNewSubVariety1NameChange: (name: string) => void;
  onNewCategoryCodeChange: (code: string) => void;
  onNewCategoryNameChange: (name: string) => void;
  onAddType: (categoryCode: string) => void;
  onAddSub: (categoryCode: string, typeCode: string) => void;
  onAddSubVariety1: (categoryCode: string, typeCode: string, subCode: string) => void;
  onAddCategory: () => void;
  onDeleteType: (categoryCode: string, typeCode: string) => void;
  onDeleteSub: (categoryCode: string, typeCode: string, subCode: string) => void;
  onDeleteSubVariety1: (categoryCode: string, typeCode: string, subCode: string, subVariety1Code: string) => void;
}

/** 渲染编辑单元格 */
const renderEditCell = (
  type: EditingCell['type'],
  categoryCode: string,
  typeCode: string | undefined,
  subCode: string | undefined,
  currentName: string | undefined,
  editingCell: EditingCell | null,
  editValue: string,
  onEditValueChange: (value: string) => void,
  onSaveEdit: () => void,
  onCancelEdit: () => void,
  isEditing: boolean
) => {
  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group">
        <span className="cursor-pointer hover:text-emerald-600">
          {currentName}
        </span>
      </div>
    );
  }

  const isActive = editingCell?.type === type &&
    editingCell?.categoryCode === categoryCode &&
    editingCell?.typeCode === typeCode &&
    editingCell?.subCode === subCode;

  if (isActive) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="w-32 px-2 py-1 border border-emerald-500 rounded text-sm focus:outline-none"
          autoFocus
        />
        <Button variant="ghost" size="icon" onClick={onSaveEdit}>
          <Save className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onCancelEdit}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span
        className="cursor-pointer hover:text-emerald-600"
        onClick={() => onStartEdit(type, categoryCode, typeCode, subCode, currentName)}
      >
        {currentName}
      </span>
      <button
        onClick={() => onStartEdit(type, categoryCode, typeCode, subCode, currentName)}
        className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-50 rounded transition-opacity"
      >
        <Edit2 className="w-3 h-3" />
      </button>
    </div>
  );
};

import { Save, X, Edit2 } from 'lucide-react';

export function ProduceCodeRuleTable({
  categories,
  expandedCategory,
  expandedType,
  expandedSub,
  isEditing,
  editingCell,
  editValue,
  showAddType,
  showAddSub,
  showAddSubVariety1,
  newTypeCode,
  newTypeName,
  newSubCode,
  newSubName,
  newSubVariety1Code,
  newSubVariety1Name,
  newCategoryCode,
  newCategoryName,
  onToggleCategory,
  onToggleType,
  onToggleSub,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onSetShowAddType,
  onSetShowAddSub,
  onSetShowAddSubVariety1,
  onSetShowAddCategory,
  onNewTypeCodeChange,
  onNewTypeNameChange,
  onNewSubCodeChange,
  onNewSubNameChange,
  onNewSubVariety1CodeChange,
  onNewSubVariety1NameChange,
  onNewCategoryCodeChange,
  onNewCategoryNameChange,
  onAddType,
  onAddSub,
  onAddSubVariety1,
  onAddCategory,
  onDeleteType,
  onDeleteSub,
  onDeleteSubVariety1,
}: ProduceCodeRuleTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-emerald-600">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-16">类别代码</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-28">类别名称</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-16">类型代码</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-28">类型名称</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-16">品种代码</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-24">品种名称</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-16">子品种代码</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-white w-24">子品种名称</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {categories.map((category) => {
            const types = getProduceTypesByCategory(category.code);
            const isCategoryExpanded = expandedCategory.has(category.code);

            return (
              <React.Fragment key={`cat-${category.code}`}>
                {/* 大类标题行 */}
                <tr className="bg-gray-50 hover:bg-gray-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onToggleCategory(category.code)}>
                        {isCategoryExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                      </Button>
                      <span className="font-mono font-bold text-blue-600 text-sm">{category.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      renderEditCell('category', category.code, undefined, undefined, category.name, editingCell, editValue, onEditValueChange, onSaveEdit, onCancelEdit, isEditing)
                    ) : (
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800 text-sm">{category.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({category.nameEn})</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                </tr>

                {/* 类型和小类 */}
                {isCategoryExpanded && types.map((type) => {
                  const typeKey = `${category.code}-${type.code}`;
                  const isTypeExpanded = expandedType.has(typeKey);

                  return (
                    <React.Fragment key={`type-${typeKey}`}>
                      {/* 类型标题行 */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => onToggleType(category.code, type.code)} className="p-1 hover:bg-gray-200 rounded">
                              {isTypeExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                            </button>
                            <span className="font-mono text-blue-600 font-medium text-sm">{type.code}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              renderEditCell('type', category.code, type.code, undefined, type.name, editingCell, editValue, onEditValueChange, onSaveEdit, onCancelEdit, isEditing)
                            ) : (
                              <span className="font-medium text-gray-700 text-sm">{type.name}</span>
                            )}
                            {isEditing && (
                              <button
                                onClick={() => onSetShowAddSub({ categoryCode: category.code, typeCode: type.code })}
                                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 ml-2"
                              >
                                <Plus className="w-3 h-3" /> 添加品种
                              </button>
                            )}
                            {isEditing && (
                              <button
                                onClick={() => onDeleteType(category.code, type.code)}
                                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 ml-2"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2"></td>
                      </tr>

                      {/* 品种行 */}
                      {isTypeExpanded && type.subCategories.map((sub) => {
                        const subKey = `${category.code}-${type.code}-${sub.code}`;
                        const isSubExpanded = expandedSub.has(subKey);
                        const hasSubVarieties = sub.subVarieties && sub.subVarieties.length > 0;
                        return (
                          <React.Fragment key={`sub-${typeKey}-${sub.code}`}>
                            {/* 品种行 */}
                            <tr className="hover:bg-blue-50">
                              <td className="px-4 py-1"></td>
                              <td className="px-4 py-1"></td>
                              <td className="px-4 py-1"></td>
                              <td className="px-4 py-1"></td>
                              <td className="px-4 py-1">
                                <div className="flex items-center gap-1">
                                  {hasSubVarieties ? (
                                    <button
                                      onClick={() => onToggleSub(category.code, type.code, sub.code)}
                                      className="p-0.5 hover:bg-gray-200 rounded"
                                      title={isSubExpanded ? '点击折叠' : '点击展开'}
                                    >
                                      {isSubExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-emerald-600" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="w-4"></span>
                                  )}
                                  <span className="font-mono text-blue-600 text-sm">{sub.code}</span>
                                </div>
                              </td>
                              <td className="px-4 py-1">
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    renderEditCell('sub', category.code, type.code, sub.code, sub.name, editingCell, editValue, onEditValueChange, onSaveEdit, onCancelEdit, isEditing)
                                  ) : (
                                    <span className="text-sm text-gray-600">{sub.name}</span>
                                  )}
                                  {isEditing && (
                                    <button
                                      onClick={() => onDeleteSub(category.code, type.code, sub.code)}
                                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 ml-2"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-1"></td>
                              <td className="px-4 py-1"></td>
                            </tr>

                            {/* 子品种1行 */}
                            {isSubExpanded && hasSubVarieties && sub.subVarieties.map((subVar) => (
                              <tr key={`subVar-${typeKey}-${sub.code}-${subVar.code}`} className="hover:bg-green-50">
                                <td className="px-4 py-1"></td>
                                <td className="px-4 py-1"></td>
                                <td className="px-4 py-1"></td>
                                <td className="px-4 py-1"></td>
                                <td className="px-4 py-1"></td>
                                <td className="px-4 py-1"></td>
                                <td className="px-4 py-1">
                                  <div className="flex items-center gap-2 ml-6">
                                    <span className="font-mono text-green-600 text-sm">{subVar.code}</span>
                                    {isEditing && (
                                      <button
                                        onClick={() => onDeleteSubVariety1(category.code, type.code, sub.code, subVar.code)}
                                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-1">
                                  <span className="text-sm text-gray-600">{subVar.name}</span>
                                </td>
                              </tr>
                            ))}

                            {/* 子品种1添加按钮 */}
                            {isEditing && isTypeExpanded && isSubExpanded && (
                              <tr className="bg-green-50 hover:bg-green-100">
                                <td colSpan={6} className="px-4 py-1"></td>
                                <td colSpan={2} className="px-4 py-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSetShowAddSubVariety1({ categoryCode: category.code, typeCode: type.code, subCode: sub.code })}
                                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                  >
                                    <Plus className="w-3 h-3" /> 添加子品种
                                  </Button>
                                </td>
                              </tr>
                            )}

                            {/* 添加子品种1弹窗 */}
                            {showAddSubVariety1?.categoryCode === category.code && showAddSubVariety1?.typeCode === type.code && showAddSubVariety1?.subCode === sub.code && isSubExpanded && (
                              <tr className="bg-green-50">
                                <td colSpan={8} className="px-4 py-2">
                                  <div className="flex items-center gap-2" style={{ marginLeft: '704px' }}>
                                    <input
                                      type="text"
                                      value={newSubVariety1Code}
                                      onChange={(e) => onNewSubVariety1CodeChange(e.target.value)}
                                      placeholder="代码(3位)"
                                      maxLength={3}
                                      className="w-24 px-2 py-1 border border-gray-400 rounded text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={newSubVariety1Name}
                                      onChange={(e) => onNewSubVariety1NameChange(e.target.value)}
                                      placeholder="子品种名称"
                                      className="w-32 px-2 py-1 border border-gray-400 rounded text-sm"
                                    />
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => onAddSubVariety1(category.code, type.code, sub.code)}
                                    >
                                      添加
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        onSetShowAddSubVariety1(null);
                                        onNewSubVariety1CodeChange('');
                                        onNewSubVariety1NameChange('');
                                      }}
                                    >
                                      取消
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* 品种列表下方添加品种按钮 */}
                      {isEditing && isTypeExpanded && (
                        <tr className="bg-blue-50 hover:bg-blue-100">
                          <td colSpan={8} className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSetShowAddSub({ categoryCode: category.code, typeCode: type.code })}
                              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                            >
                              <Plus className="w-4 h-4" /> 添加品种
                            </Button>
                          </td>
                        </tr>
                      )}

                      {/* 添加品种弹窗 */}
                      {showAddSub?.categoryCode === category.code && showAddSub?.typeCode === type.code && (
                        <tr className="bg-blue-50">
                          <td colSpan={8} className="px-4 py-2">
                            <div className="flex items-center gap-2" style={{ marginLeft: '480px' }}>
                              <input
                                type="text"
                                value={newSubCode}
                                onChange={(e) => onNewSubCodeChange(e.target.value)}
                                placeholder="品种代码"
                                className="w-24 px-2 py-1 border border-gray-400 rounded text-sm"
                              />
                              <input
                                type="text"
                                value={newSubName}
                                onChange={(e) => onNewSubNameChange(e.target.value)}
                                placeholder="品种名称"
                                className="w-32 px-2 py-1 border border-gray-400 rounded text-sm"
                              />
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => onAddSub(category.code, type.code)}
                              >
                                添加
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  onSetShowAddSub(null);
                                  onNewSubCodeChange('');
                                  onNewSubNameChange('');
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* 添加类型按钮 */}
                {isEditing && (
                  <tr className="bg-gray-50 hover:bg-gray-100">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSetShowAddType(category.code)}
                        className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                      >
                        <Plus className="w-4 h-4" /> 添加类型
                      </Button>
                    </td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                  </tr>
                )}

                {/* 添加类型弹窗 */}
                {showAddType === category.code && (
                  <tr className="bg-blue-50">
                    <td colSpan={8} className="px-4 py-2">
                      <div className="flex items-center gap-2" style={{ marginLeft: '240px' }}>
                        <input
                          type="text"
                          value={newTypeCode}
                          onChange={(e) => onNewTypeCodeChange(e.target.value)}
                          placeholder="类型代码"
                          className="w-24 px-2 py-1 border border-gray-400 rounded text-sm"
                        />
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => onNewTypeNameChange(e.target.value)}
                          placeholder="类型名称"
                          className="w-32 px-2 py-1 border border-gray-400 rounded text-sm"
                        />
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onAddType(category.code)}
                        >
                          添加
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            onSetShowAddType(null);
                            onNewTypeCodeChange('');
                            onNewTypeNameChange('');
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* 添加大类按钮 */}
      {isEditing && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetShowAddCategory(true)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
          >
            <Plus className="w-5 h-5" />
            添加大类
          </Button>
        </div>
      )}

      {/* 添加大类弹窗 */}
      {showAddCategory && (
        <div className="p-4 bg-blue-50 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={newCategoryCode}
              onChange={(e) => onNewCategoryCodeChange(e.target.value.toUpperCase())}
              placeholder="大类代码（2位大写字母）"
              maxLength={2}
              className="w-40 px-3 py-2 border border-gray-400 rounded-lg text-sm"
            />
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => onNewCategoryNameChange(e.target.value)}
              placeholder="大类名称"
              className="w-40 px-3 py-2 border border-gray-400 rounded-lg text-sm"
            />
            <Button variant="default" onClick={onAddCategory}>
              添加
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onSetShowAddCategory(false);
                onNewCategoryCodeChange('');
                onNewCategoryNameChange('');
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
