/**
 * 作物编码规则页面 Hook
 * 封装状态管理和业务逻辑
 */
import { useState, useCallback } from 'react';
import type {
  ProduceCategories,
  EditingCell,
  AddTypeState,
  AddSubState,
  AddSubVariety1State,
} from '../types/produceCodeRule.types';
import { DEFAULT_CATEGORIES, deepCloneCategories } from '../types/produceCodeRule.types';
import { showAlert, showConfirm } from '@/lib/dialogService';

export function useProduceCodeRule() {
  // ============================================================
  // 状态定义
  // ============================================================

  const [categories, setCategories] = useState<ProduceCategories>(deepCloneCategories(DEFAULT_CATEGORIES));
  const [expandedCategory, setExpandedCategory] = useState<Set<string>>(new Set(DEFAULT_CATEGORIES.map(c => c.code)));
  const [expandedType, setExpandedType] = useState<Set<string>>(new Set());
  const [expandedSub, setExpandedSub] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCodeRuleInfo, setShowCodeRuleInfo] = useState(false);

  // 编辑状态
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');

  // 添加状态
  const [showAddType, setShowAddType] = useState<string | null>(null);
  const [showAddSub, setShowAddSub] = useState<AddSubState | null>(null);
  const [showAddSubVariety1, setShowAddSubVariety1] = useState<AddSubVariety1State | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // 添加表单状态
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubVariety1Code, setNewSubVariety1Code] = useState('');
  const [newSubVariety1Name, setNewSubVariety1Name] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // ============================================================
  // 事件处理
  // ============================================================

  /** 展开/折叠大类 */
  const toggleCategory = useCallback((code: string) => {
    setExpandedCategory(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(code)) {
        newExpanded.delete(code);
      } else {
        newExpanded.add(code);
      }
      return newExpanded;
    });
  }, []);

  /** 展开/折叠类型 */
  const toggleType = useCallback((categoryCode: string, typeCode: string) => {
    const key = `${categoryCode}-${typeCode}`;
    setExpandedType(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
  }, []);

  /** 展开/折叠品种 */
  const toggleSub = useCallback((categoryCode: string, typeCode: string, subCode: string) => {
    const key = `${categoryCode}-${typeCode}-${subCode}`;
    setExpandedSub(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
  }, []);

  /** 开始编辑 */
  const startEdit = useCallback((
    type: EditingCell['type'],
    categoryCode: string,
    typeCode?: string,
    subCode?: string,
    currentName?: string,
    subVariety1Code?: string // 2026-07-28：subVariety1 编辑所需的代码字段
  ) => {
    setEditingCell({ type, categoryCode, typeCode, subCode, subVariety1Code });
    setEditValue(currentName || '');
  }, []);

  /** 保存编辑 */
  const saveEdit = useCallback(() => {
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
              // 2026-07-28：扩展支持 subVariety1 编辑（编辑"品种（3位数字）"层）
              if (editingCell.type === 'subVariety1' && sub.subVarieties) {
                return {
                  ...sub,
                  subVarieties: sub.subVarieties.map(sv => {
                    if (sv.code !== editingCell.subVariety1Code) return sv;
                    return { ...sv, name: editValue.trim() };
                  })
                };
              }
              return { ...sub, name: editValue.trim() };
            })
          };
        })
      };
    }));

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue]);

  /** 取消编辑 */
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  /** 添加大类 */
  const addCategory = useCallback(() => {
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
  }, [newCategoryCode, newCategoryName]);

  /** 添加类型 */
  const addType = useCallback((categoryCode: string) => {
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
  }, [newTypeCode, newTypeName]);

  /** 添加品种 */
  const addSub = useCallback((categoryCode: string, typeCode: string) => {
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
  }, [newSubCode, newSubName]);

  /** 删除类型 */
  const deleteType = useCallback(async (categoryCode: string, typeCode: string) => {
    if (!await showConfirm(`确定要删除类型 "${typeCode}" 吗？`)) return;
    setCategories(prev => prev.map(cat => {
      if (cat.code !== categoryCode) return cat;
      return {
        ...cat,
        types: cat.types.filter(type => type.code !== typeCode)
      };
    }));
  }, []);

  /** 删除品种 */
  const deleteSub = useCallback(async (categoryCode: string, typeCode: string, subCode: string) => {
    if (!await showConfirm(`确定要删除品种 "${subCode}" 吗？`)) return;
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
  }, []);

  /** 添加子品种1 */
  const addSubVariety1 = useCallback((categoryCode: string, typeCode: string, subCode: string) => {
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
                showAlert('该子品种1代码已存在！');
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
  }, [newSubVariety1Code, newSubVariety1Name]);

  /** 删除子品种1 */
  const deleteSubVariety1 = useCallback(async (categoryCode: string, typeCode: string, subCode: string, subVariety1Code: string) => {
    if (!await showConfirm(`确定要删除子品种1 "${subVariety1Code}" 吗？`)) return;
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
  }, []);

  /** 保存所有修改 */
  const handleSave = useCallback(() => {
    showAlert('编码规则已保存！（演示模式）');
  }, []);

  return {
    // 状态
    categories,
    expandedCategory,
    expandedType,
    expandedSub,
    isEditing,
    showSaveConfirm,
    showCodeRuleInfo,
    editingCell,
    editValue,
    showAddType,
    showAddSub,
    showAddSubVariety1,
    showAddCategory,
    newTypeCode,
    newTypeName,
    newSubCode,
    newSubName,
    newSubVariety1Code,
    newSubVariety1Name,
    newCategoryCode,
    newCategoryName,
    // 方法
    setCategories,
    setExpandedCategory,
    setExpandedType,
    setExpandedSub,
    setIsEditing,
    setShowSaveConfirm,
    setShowCodeRuleInfo,
    setEditingCell,
    setEditValue,
    setShowAddType,
    setShowAddSub,
    setShowAddSubVariety1,
    setShowAddCategory,
    setNewTypeCode,
    setNewTypeName,
    setNewSubCode,
    setNewSubName,
    setNewSubVariety1Code,
    setNewSubVariety1Name,
    setNewCategoryCode,
    setNewCategoryName,
    toggleCategory,
    toggleType,
    toggleSub,
    startEdit,
    saveEdit,
    cancelEdit,
    addCategory,
    addType,
    addSub,
    deleteType,
    deleteSub,
    addSubVariety1,
    deleteSubVariety1,
    handleSave,
  };
}
