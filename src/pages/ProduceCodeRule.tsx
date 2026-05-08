/**
 * 作物编码规则管理页面
 *
 * 编码结构：类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细品种(2位) = 11位
 * 示例：FR0101001001 = 水果类-浆果类-草莓-红颜
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
import { Button } from '../components/ui/button';

// 深拷贝函数
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default function ProduceCodeRule() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ProduceCategory[]>(deepClone(initialCategories));
  const [expandedCategory, setExpandedCategory] = useState<Set<string>>(new Set(initialCategories.map(c => c.code)));
  const [expandedType, setExpandedType] = useState<Set<string>>(new Set());
  const [expandedSub, setExpandedSub] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCodeRuleInfo, setShowCodeRuleInfo] = useState(false);

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
  const [showAddSubVariety1, setShowAddSubVariety1] = useState<{ categoryCode: string; typeCode: string; subCode: string } | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubVariety1Code, setNewSubVariety1Code] = useState('');
  const [newSubVariety1Name, setNewSubVariety1Name] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

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

  // 展开/折叠品种
  const toggleSub = (categoryCode: string, typeCode: string, subCode: string) => {
    const key = `${categoryCode}-${typeCode}-${subCode}`;
    const newExpanded = new Set(expandedSub);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSub(newExpanded);
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

  // 添加大类
  const addCategory = () => {
    if (!newCategoryCode.trim() || !newCategoryName.trim()) return;
    setCategories(prev => [...prev, {
      code: newCategoryCode.trim() as ProduceCategoryCode,
      name: newCategoryName.trim(),
      nameEn: '',
      description: '',
      types: []
    }]);
    setNewCategoryCode('');
    setNewCategoryName('');
    setShowAddCategory(false);
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

  // 添加子品种1
  const addSubVariety1 = (categoryCode: string, typeCode: string, subCode: string) => {
    if (!newSubVariety1Code.trim() || !newSubVariety1Name.trim()) return;
    // 确保代码是3位数字
    const code = newSubVariety1Code.trim().padStart(3, '0').slice(0, 3);
    setCategories(prev => prev.map(cat => {
      if (cat.code !== categoryCode) return cat;
      return {
        ...cat,
        types: cat.types.map(type => {
          if (type.code !== typeCode) return type;
          return {
            ...type,
            subCategories: type.subCategories.map(sub => {
              if (sub.code !== subCode) return sub;
              const existingSubVarieties = sub.subVarieties || [];
              // 检查是否已存在相同代码
              if (existingSubVarieties.some(sv => sv.code === code)) {
                alert('该子品种1代码已存在！');
                return sub;
              }
              return {
                ...sub,
                subVarieties: [...existingSubVarieties, { code, name: newSubVariety1Name.trim() }]
              };
            })
          };
        })
      };
    }));
    setNewSubVariety1Code('');
    setNewSubVariety1Name('');
    setShowAddSubVariety1(null);
  };

  // 删除子品种1
  const deleteSubVariety1 = (categoryCode: string, typeCode: string, subCode: string, subVariety1Code: string) => {
    if (!confirm(`确定要删除子品种1 "${subVariety1Code}" 吗？`)) return;
    setCategories(prev => prev.map(cat => {
      if (cat.code !== categoryCode) return cat;
      return {
        ...cat,
        types: cat.types.map(type => {
          if (type.code !== typeCode) return type;
          return {
            ...type,
            subCategories: type.subCategories.map(sub => {
              if (sub.code !== subCode) return sub;
              return {
                ...sub,
                subVarieties: (sub.subVarieties || []).filter(sv => sv.code !== subVariety1Code)
              };
            })
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
          <Button variant="ghost" size="icon" onClick={saveEdit}>
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={cancelEdit}>
            <X className="w-4 h-4" />
          </Button>
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
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">作物编码规则</h1>
              <p className="text-gray-500">编码结构：类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细品种(2位) = 11位</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="default" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                修改规则
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex items-center gap-2">
                  取消修改
                </Button>
                <Button variant="default" onClick={() => setShowSaveConfirm(true)} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  保存修改
                </Button>
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
          <button
            onClick={() => setShowCodeRuleInfo(!showCodeRuleInfo)}
            className="flex items-center gap-2 w-full text-left"
          >
            <ChevronRight className={`w-5 h-5 text-emerald-600 transition-transform ${showCodeRuleInfo ? 'rotate-90' : ''}`} />
            <h3 className="font-semibold text-emerald-800">编码规则说明</h3>
          </button>
          {showCodeRuleInfo && (
            <div className="grid grid-cols-2 gap-4 text-sm text-emerald-700 mt-3">
              <div>
                <p><strong>编码结构：</strong>类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细品种(2位) = 11位</p>
                <p><strong>示例：</strong>FR010100101</p>
                <ul className="ml-4 mt-1 space-y-0.5">
                  <li>• FR - 水果类</li>
                  <li>• 01 - 浆果类</li>
                  <li>• 01 - 草莓</li>
                  <li>• 001 - 红颜（子品种）</li>
                  <li>• 01 - 大叶红颜（详细品种序号）</li>
                </ul>
                <p className="mt-2 text-xs"><strong>注：</strong>详细品种名称（如"大叶红颜"）由用户在录入时手工输入，系统自动分配2位序号</p>
              </div>
              <div>
                <p><strong>大类代码：</strong></p>
                <ul className="ml-4 mt-1 space-y-0.5">
                  <li>• PD - 蔬菜类</li>
                  <li>• FR - 水果类</li>
                  <li>• GR - 粮食类</li>
                  <li>• FL - 花卉类</li>
                  <li>• HB - 药材类</li>
                  <li>• MG - 食用菌类</li>
                  <li>• OT - 其他类</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 分类表格 */}
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
                        <Button variant="ghost" size="icon" onClick={() => toggleCategory(category.code)}>
                          {isCategoryExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                        </Button>
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
                                      onClick={() => toggleSub(category.code, type.code, sub.code)}
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
                                    renderEditCell('sub', category.code, type.code, sub.code, sub.name)
                                  ) : (
                                    <span className="text-sm text-gray-600">{sub.name}</span>
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
                                        onClick={() => deleteSubVariety1(category.code, type.code, sub.code, subVar.code)}
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
                                    onClick={() => setShowAddSubVariety1({ categoryCode: category.code, typeCode: type.code, subCode: sub.code })}
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
                                      onChange={(e) => setNewSubVariety1Code(e.target.value)}
                                      placeholder="代码(3位)"
                                      maxLength={3}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={newSubVariety1Name}
                                      onChange={(e) => setNewSubVariety1Name(e.target.value)}
                                      placeholder="子品种名称"
                                      className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => addSubVariety1(category.code, type.code, sub.code)}
                                    >
                                      添加
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setShowAddSubVariety1(null);
                                        setNewSubVariety1Code('');
                                        setNewSubVariety1Name('');
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
                                onClick={() => setShowAddSub({ categoryCode: category.code, typeCode: type.code })}
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
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => addSub(category.code, type.code)}
                                >
                                  添加
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setShowAddSub(null);
                                    setNewSubCode('');
                                    setNewSubName('');
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
                          onClick={() => setShowAddType(category.code)}
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
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => addType(category.code)}
                          >
                            添加
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setShowAddType(null);
                              setNewTypeCode('');
                              setNewTypeName('');
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
              onClick={() => setShowAddCategory(true)}
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
                onChange={(e) => setNewCategoryCode(e.target.value.toUpperCase())}
                placeholder="大类代码（2位大写字母）"
                maxLength={2}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="大类名称"
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <Button
                variant="default"
                onClick={addCategory}
              >
                添加
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryCode('');
                  setNewCategoryName('');
                }}
              >
                取消
              </Button>
            </div>
          </div>
        )}
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
              <Button
                variant="secondary"
                onClick={() => setShowSaveConfirm(false)}
              >
                取消保存
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowSaveConfirm(false);
                  setIsEditing(false);
                  handleSave();
                }}
              >
                确认保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
