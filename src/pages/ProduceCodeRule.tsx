/**
 * 农产品编码规则管理页面
 */

import React, { useState } from 'react';
import { Hash, Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  produceCategories as initialCategories,
  getProduceTypesByCategory,
  ProduceCategoryCode,
  ProduceCategory,
  ProduceType,
  ProduceSubType,
} from '../data/produceCodeRule';

// 深拷贝函数
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default function ProduceCodeRule() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ProduceCategory[]>(deepClone(initialCategories));
  const [expandedCategory, setExpandedCategory] = useState<Set<string>>(new Set(initialCategories.map(c => c.code)));
  const [expandedType, setExpandedType] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // 编辑状态
  const [editingCell, setEditingCell] = useState<{
    type: 'category' | 'type' | 'sub';
    categoryCode: string;
    typeCode?: string;
    subCode?: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  // 添加状态
  const [showAddType, setShowAddType] = useState<string | null>(null);
  const [showAddSub, setShowAddSub] = useState<{ categoryCode: string; typeCode: string } | null>(null);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // 展开/折叠大类
  const toggleCategory = (code: string) => {
    const newExpanded = new Set(expandedCategory);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCategory(newExpanded);
  };

  // 展开/折叠类型
  const toggleType = (categoryCode: string, typeCode: string) => {
    const key = `${categoryCode}-${typeCode}`;
    const newExpanded = new Set(expandedType);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedType(newExpanded);
  };

  // 开始编辑
  const startEdit = (
    type: 'category' | 'type' | 'sub',
    categoryCode: string,
    typeCode?: string,
    subCode?: string,
    currentName?: string
  ) => {
    setEditingCell({ type, categoryCode, typeCode, subCode });
    setEditValue(currentName || '');
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingCell || !editValue.trim()) return;

    setCategories(prev => prev.map(cat => {
      if (cat.code !== editingCell.categoryCode) return cat;

      if (editingCell.type === 'category') {
        return { ...cat, name: editValue.trim() };
      }

      return {
        ...cat,
        types: cat.types.map(type => {
          if (type.code !== editingCell.typeCode) return type;

          if (editingCell.type === 'type') {
            return { ...type, name: editValue.trim() };
          }

          return {
            ...type,
            subCategories: type.subCategories.map(sub => {
              if (sub.code !== editingCell.subCode) return sub;
              return { ...sub, name: editValue.trim() };
            })
          };
        })
      };
    }));

    setEditingCell(null);
    setEditValue('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // 添加类型
  const addType = (categoryCode: string) => {
    if (!newTypeCode.trim() || !newTypeName.trim()) return;
    setCategories(prev => prev.map(cat => {
      if (cat.code !== categoryCode) return cat;
      return {
        ...cat,
        types: [...cat.types, {
          code: newTypeCode.trim(),
          name: newTypeName.trim(),
          subCategories: []
        }]
      };
    }));
    setNewTypeCode('');
    setNewTypeName('');
    setShowAddType(null);
  };

  // 添加品种
  const addSub = (categoryCode: string, typeCode: string) => {
    if (!newSubCode.trim() || !newSubName.trim()) return;
    setCategories(prev => prev.map(cat => {
      if (cat.code !== categoryCode) return cat;
      return {
        ...cat,
        types: cat.types.map(type => {
          if (type.code !== typeCode) return type;
          return {
            ...type,
            subCategories: [...type.subCategories, {
              code: newSubCode.trim(),
              name: newSubName.trim()
            }]
          };
        })
      };
    }));
    setNewSubCode('');
    setNewSubName('');
    setShowAddSub(null);
  };

  // 删除类型
  const deleteType = (categoryCode: string, typeCode: string) => {
    if (!confirm(`确定要删除类型 "${typeCode}" 吗？`)) return;
    setCategories(prev => prev.map(cat => {
      if (cat.code !== categoryCode) return cat;
      return {
        ...cat,
        types: cat.types.filter(type => type.code !== typeCode)
      };
    }));
  };

  // 删除品种
  const deleteSub = (categoryCode: string, typeCode: string, subCode: string) => {
    if (!confirm(`确定要删除品种 "${subCode}" 吗？`)) return;
    setCategories(prev => prev.map(cat => {
      if (cat.code !== categoryCode) return cat;
      return {
        ...cat,
        types: cat.types.map(type => {
          if (type.code !== typeCode) return type;
          return {
            ...type,
            subCategories: type.subCategories.filter(sub => sub.code !== subCode)
          };
        })
      };
    }));
  };

  // 保存所有修改
  const handleSave = () => {
    alert('编码规则已保存！（演示模式）');
  };

  // 渲染编辑单元格
  const renderEditCell = (
    type: 'category' | 'type' | 'sub',
    categoryCode: string,
    typeCode?: string,
    subCode?: string,
    currentName?: string
  ) => {
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
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="w-32 px-2 py-1 border border-emerald-500 rounded text-sm focus:outline-none"
            autoFocus
          />
          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
            <Save className="w-4 h-4" />
          </button>
          <button onClick={cancelEdit} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 group">
        <span
          className="cursor-pointer hover:text-emerald-600"
          onClick={() => startEdit(type, categoryCode, typeCode, subCode, currentName)}
        >
          {currentName}
        </span>
        {isEditing && (
          <button
            onClick={() => startEdit(type, categoryCode, typeCode, subCode, currentName)}
            className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-50 rounded transition-opacity"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">农产品编码规则</h1>
              <p className="text-gray-500">编码结构：大类代码(2位) + 类型代码(2位) + 品种代码(2位) + 流水号(3位)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Edit2 className="w-4 h-4" />
                修改规则
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  取消修改
                </button>
                <button
                  onClick={() => setShowSaveConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4" />
                  保存修改
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 说明 */}
      {isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 点击"修改规则"按钮进入编辑模式</li>
            <li>• 编辑模式下可修改分类名称</li>
            <li>• 点击展开图标查看下级分类</li>
            <li>• 点击"保存修改"前请注意风险提示</li>
          </ul>
        </div>
      )}

      {!isEditing && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="font-semibold text-emerald-800 mb-2">编码规则说明</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-emerald-700">
            <div>
              <p><strong>编码结构：</strong>大类(2位) + 类型(2位) + 品种(2位) + 流水号(3位) = 9位</p>
              <p><strong>示例：</strong>PD01010001</p>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>• PD - 果蔬产品类</li>
                <li>• 01 - 叶菜类</li>
                <li>• 01 - 菠菜</li>
                <li>• 001 - 第1个产品</li>
              </ul>
            </div>
            <div>
              <p><strong>大类代码：</strong></p>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>• PD - 果蔬产品类</li>
                <li>• FR - 水果类</li>
                <li>• GR - 粮食类</li>
                <li>• FL - 花卉类</li>
                <li>• HB - 药材类</li>
                <li>• MG - 食用菌类</li>
                <li>• OT - 其他类</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 分类表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-emerald-600">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white w-24">大类代码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white w-40">大类名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white w-24">类型代码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white w-40">类型名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white w-24">品种代码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white">品种名称</th>
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
                        <button onClick={() => toggleCategory(category.code)} className="p-1 hover:bg-gray-200 rounded">
                          {isCategoryExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                        </button>
                        <span className="font-mono font-bold text-blue-600 text-sm">{category.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        renderEditCell('category', category.code, undefined, undefined, category.name)
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
                              <button onClick={() => toggleType(category.code, type.code)} className="p-1 hover:bg-gray-200 rounded">
                                {isTypeExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                              </button>
                              <span className="font-mono text-blue-600 font-medium text-sm">{type.code}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                renderEditCell('type', category.code, type.code, undefined, type.name)
                              ) : (
                                <span className="font-medium text-gray-700 text-sm">{type.name}</span>
                              )}
                              {isEditing && (
                                <button
                                  onClick={() => setShowAddSub({ categoryCode: category.code, typeCode: type.code })}
                                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 ml-2"
                                >
                                  <Plus className="w-3 h-3" /> 添加品种
                                </button>
                              )}
                              {isEditing && (
                                <button
                                  onClick={() => deleteType(category.code, type.code)}
                                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 ml-2"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2"></td>
                        </tr>

                        {/* 品种行 */}
                        {isTypeExpanded && type.subCategories.map((sub) => (
                          <tr key={`sub-${typeKey}-${sub.code}`} className="hover:bg-blue-50">
                            <td className="px-4 py-1"></td>
                            <td className="px-4 py-1"></td>
                            <td className="px-4 py-1"></td>
                            <td className="px-4 py-1"></td>
                            <td className="px-4 py-1">
                              <span className="font-mono text-blue-600 text-sm ml-8">{sub.code}</span>
                            </td>
                            <td className="px-4 py-1">
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  renderEditCell('sub', category.code, type.code, sub.code, sub.name)
                                ) : (
                                  <span className="text-sm text-gray-600 ml-12">{sub.name}</span>
                                )}
                                {isEditing && (
                                  <button
                                    onClick={() => deleteSub(category.code, type.code, sub.code)}
                                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 ml-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* 添加品种弹窗 */}
                        {showAddSub?.categoryCode === category.code && showAddSub?.typeCode === type.code && (
                          <tr className="bg-blue-50">
                            <td colSpan={6} className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newSubCode}
                                  onChange={(e) => setNewSubCode(e.target.value)}
                                  placeholder="品种代码"
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <input
                                  type="text"
                                  value={newSubName}
                                  onChange={(e) => setNewSubName(e.target.value)}
                                  placeholder="品种名称"
                                  className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <button
                                  onClick={() => addSub(category.code, type.code)}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                                >
                                  添加
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAddSub(null);
                                    setNewSubCode('');
                                    setNewSubName('');
                                  }}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                                >
                                  取消
                                </button>
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
                        <button
                          onClick={() => setShowAddType(category.code)}
                          className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          <Plus className="w-4 h-4" /> 添加类型
                        </button>
                      </td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  )}

                  {/* 添加类型弹窗 */}
                  {showAddType === category.code && (
                    <tr className="bg-blue-50">
                      <td colSpan={6} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newTypeCode}
                            onChange={(e) => setNewTypeCode(e.target.value)}
                            placeholder="类型代码"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="text"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            placeholder="类型名称"
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => addType(category.code)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                          >
                            添加
                          </button>
                          <button
                            onClick={() => {
                              setShowAddType(null);
                              setNewTypeCode('');
                              setNewTypeName('');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                          >
                            取消
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 保存确认弹窗 */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[480px] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">风险提示</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                您即将保存对编码规则的修改，请注意以下风险：
              </p>
              <ul className="text-sm text-gray-500 space-y-2 bg-red-50 p-4 rounded-lg">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>如果修改后的编码规则与系统中已有的产品编码冲突，可能导致系统无法识别该产品</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>删除已被使用的编码分类可能影响历史数据的关联和追溯</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>建议在修改前备份系统数据，确保可以回滚</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消保存
              </button>
              <button
                onClick={() => {
                  setShowSaveConfirm(false);
                  setIsEditing(false);
                  handleSave();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
