/**
 * 物料编码规则页面
 * 大类(2位字母) + 中类(2位数字) + 小类(2位数字) + 流水号(3位)
 *
 * 数据流: useMaterialCodeRuleStore → enhancedApiClient → Backend API → SQLite
 * 所有新增/编辑/删除操作持久化到后端数据库
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Hash, Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronRight, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useMaterialCodeRuleStore } from '../stores/useMaterialCodeRuleStore';
import type { BigCategory } from '../stores/useMaterialCodeRuleStore';
import { showAlert, showConfirm } from '@/lib/dialogService';

export default function CodeRule() {
  const navigate = useNavigate();

  // Store
  const {
    categories,
    isLoading,
    error,
    loadCategories,
    updateBigName,
    updateMidName,
    updateSubName,
    addBigCategory: storeAddBig,
    addMidCategory: storeAddMid,
    addSubCategory: storeAddSub,
    deleteBigCategory: storeDeleteBig,
    deleteMidCategory: storeDeleteMid,
    deleteSubCategory: storeDeleteSub,
  } = useMaterialCodeRuleStore();

  // 加载数据
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 展开状态
  const [expandedBig, setExpandedBig] = useState<Set<string>>(new Set(['SP', 'EQ', 'OP', 'PH', 'IT', 'EC', 'OT']));
  const [expandedMid, setExpandedMid] = useState<Set<string>>(new Set([
    'SP01', 'SP02', 'SP03', 'EQ01', 'EQ02', 'EQ03',
    'OP01', 'OP02', 'OP03', 'PH01', 'PH02',
    'IT01', 'IT02', 'IT03', 'EC01', 'EC02', 'OT01'
  ]));

  // UI 状态
  const [editingCell, setEditingCell] = useState<{
    type: 'big' | 'mid' | 'sub';
    bigCode: string;
    midCode?: string;
    subCode?: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // 新增表单状态
  const [showAddBig, setShowAddBig] = useState(false);
  const [showAddMid, setShowAddMid] = useState<string | null>(null);
  const [showAddSub, setShowAddSub] = useState<string | null>(null);
  const [newBigCode, setNewBigCode] = useState('');
  const [newBigName, setNewBigName] = useState('');
  const [newMidCode, setNewMidCode] = useState('');
  const [newMidName, setNewMidName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // 展开/折叠
  const toggleBig = (code: string) => {
    setExpandedBig(prev => {
      const next = new Set(prev);
      if (next.has(code)) { next.delete(code); } else { next.add(code); }
      return next;
    });
  };

  const toggleMid = (bigCode: string, midCode: string) => {
    const key = `${bigCode}${midCode}`;
    setExpandedMid(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  // 开始编辑
  const startEdit = (type: 'big' | 'mid' | 'sub', bigCode: string, midCode?: string, subCode?: string, currentName?: string) => {
    setEditingCell({ type, bigCode, midCode, subCode });
    setEditValue(currentName || '');
  };

  // 保存编辑（调用 Store API）
  const saveEdit = useCallback(async () => {
    if (!editingCell || !editValue.trim()) return;

    try {
      if (editingCell.type === 'big') {
        await updateBigName(editingCell.bigCode, editValue.trim());
      } else if (editingCell.type === 'mid' && editingCell.midCode) {
        await updateMidName(editingCell.bigCode, editingCell.midCode, editValue.trim());
      } else if (editingCell.type === 'sub' && editingCell.midCode && editingCell.subCode) {
        await updateSubName(editingCell.bigCode, editingCell.midCode, editingCell.subCode, editValue.trim());
      }
      setEditingCell(null);
      setEditValue('');
    } catch (err: any) {
      await showAlert(`保存失败: ${err.message || '未知错误'}`);
    }
  }, [editingCell, editValue, updateBigName, updateMidName, updateSubName]);

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // 新增大类
  const handleAddBig = async () => {
    if (!newBigCode.trim() || !newBigName.trim()) return;
    try {
      await storeAddBig(newBigCode.trim().toUpperCase(), newBigName.trim());
      setNewBigCode('');
      setNewBigName('');
      setShowAddBig(false);
    } catch (err: any) {
      await showAlert(`新增大类失败: ${err.message || '未知错误'}`);
    }
  };

  // 新增中类
  const handleAddMid = async (bigCode: string) => {
    if (!newMidCode.trim() || !newMidName.trim()) return;
    try {
      await storeAddMid(bigCode, newMidCode.trim(), newMidName.trim());
      setNewMidCode('');
      setNewMidName('');
      setShowAddMid(null);
    } catch (err: any) {
      await showAlert(`新增中类失败: ${err.message || '未知错误'}`);
    }
  };

  // 新增小类
  const handleAddSub = async (bigCode: string, midCode: string) => {
    if (!newSubCode.trim() || !newSubName.trim()) return;
    try {
      await storeAddSub(bigCode, midCode, newSubCode.trim(), newSubName.trim());
      setNewSubCode('');
      setNewSubName('');
      setShowAddSub(null);
    } catch (err: any) {
      await showAlert(`新增小类失败: ${err.message || '未知错误'}`);
    }
  };

  // 删除大类
  const handleDeleteBig = async (bigCode: string) => {
    if (!await showConfirm(`确定要删除大类 "${bigCode}" 及其所有子分类吗？此操作不可恢复。`)) return;
    try {
      await storeDeleteBig(bigCode);
    } catch (err: any) {
      await showAlert(`删除失败: ${err.message || '未知错误'}`);
    }
  };

  // 删除中类
  const handleDeleteMid = async (bigCode: string, midCode: string) => {
    if (!await showConfirm(`确定要删除中类 "${midCode}" 及其所有小类吗？`)) return;
    try {
      await storeDeleteMid(bigCode, midCode);
    } catch (err: any) {
      await showAlert(`删除失败: ${err.message || '未知错误'}`);
    }
  };

  // 删除小类
  const handleDeleteSub = async (bigCode: string, midCode: string, subCode: string) => {
    if (!await showConfirm(`确定要删除小类 "${subCode}" 吗？`)) return;
    try {
      await storeDeleteSub(bigCode, midCode, subCode);
    } catch (err: any) {
      await showAlert(`删除失败: ${err.message || '未知错误'}`);
    }
  };

  // 保存确认（已通过实时编辑保存，此处做最终确认）
  const handleSaveConfirm = () => {
    setShowSaveConfirm(false);
    setIsEditing(false);
    // 实际数据已通过每次编辑实时保存到后端，此处无需额外操作
  };

  // 渲染编辑单元格
  const renderEditCell = (type: 'big' | 'mid' | 'sub', bigCode: string, midCode?: string, subCode?: string, currentName?: string) => {
    if (editingCell?.type === type && editingCell?.bigCode === bigCode && editingCell?.midCode === midCode && editingCell?.subCode === subCode) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
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
      <div className="flex items-center gap-2">
        <span className="cursor-pointer hover:text-emerald-600" onClick={() => startEdit(type, bigCode, midCode, subCode, currentName)}>
          {currentName}
        </span>
        <Button variant="ghost" size="icon" onClick={() => startEdit(type, bigCode, midCode, subCode, currentName)}>
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-gray-500">正在加载编码规则数据...</p>
        </div>
      </div>
    );
  }

  // 加载失败状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-red-600 font-medium">加载失败</p>
          <p className="text-gray-500">{error}</p>
          <Button variant="default" onClick={() => loadCategories()}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">物料编码规则</h1>
              <p className="text-gray-500">编码结构：大类代码(2位) + 中类代码(2位) + 小类代码(2位) + 流水号(3位)</p>
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
                  退出编辑
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
            <li>• 点击名称可编辑分类名称（实时保存到后端）</li>
            <li>• 点击"添加大类/中类/小类"按钮新增分类</li>
            <li>• 点击左侧图标展开/折叠下级分类</li>
            <li>• 所有修改即时持久化到后端数据库</li>
          </ul>
        </div>
      )}

      {/* 分类表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-[90%]">
        <table className="w-full">
          <thead className="bg-emerald-600">
            <tr>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-24">大类代码</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">大类名称</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-24">中类代码</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-48">中类名称</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-24">小类代码</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-48">小类名称</th>
            </tr>
            {isEditing && (
              <tr className="bg-white">
                <td colSpan={6} className="px-2 py-2">
                  {showAddBig ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={newBigCode} onChange={e => setNewBigCode(e.target.value)} placeholder="代码(如:AB)" className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" />
                      <input type="text" value={newBigName} onChange={e => setNewBigName(e.target.value)} placeholder="大类名称" className="w-40 px-2 py-1 border border-gray-300 rounded text-sm" />
                      <Button variant="default" size="sm" onClick={handleAddBig}>添加</Button>
                      <Button variant="secondary" size="sm" onClick={() => { setShowAddBig(false); setNewBigCode(''); setNewBigName(''); }}>取消</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => setShowAddBig(true)} className="flex items-center gap-1">
                      <Plus className="w-4 h-4" /> 添加大类
                    </Button>
                  )}
                </td>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-300">
            {categories.map(big => (
              <BigCategoryRow
                key={`big-${big.code}`}
                big={big}
                isEditing={isEditing}
                expandedBig={expandedBig}
                expandedMid={expandedMid}
                onToggleBig={toggleBig}
                onToggleMid={toggleMid}
                renderEditCell={renderEditCell}
                onDeleteBig={handleDeleteBig}
                onDeleteMid={handleDeleteMid}
                onDeleteSub={handleDeleteSub}
                showAddMid={showAddMid}
                setShowAddMid={setShowAddMid}
                showAddSub={showAddSub}
                setShowAddSub={setShowAddSub}
                newMidCode={newMidCode}
                setNewMidCode={setNewMidCode}
                newMidName={newMidName}
                setNewMidName={setNewMidName}
                newSubCode={newSubCode}
                setNewSubCode={setNewSubCode}
                newSubName={newSubName}
                setNewSubName={setNewSubName}
                onAddMid={handleAddMid}
                onAddSub={handleAddSub}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 添加中类弹窗 */}
      {showAddMid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">添加中类 — {showAddMid}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中类代码</label>
                <input type="text" value={newMidCode} onChange={e => setNewMidCode(e.target.value)} placeholder="两位数字，如：04" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中类名称</label>
                <input type="text" value={newMidName} onChange={e => setNewMidName(e.target.value)} placeholder="中类名称" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => { setShowAddMid(null); setNewMidCode(''); setNewMidName(''); }}>取消</Button>
                <Button variant="default" onClick={() => handleAddMid(showAddMid)}>添加</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加小类弹窗 */}
      {showAddSub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">添加小类 — {showAddSub.substring(0, 2)}{showAddSub.substring(2, 4)}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小类代码</label>
                <input type="text" value={newSubCode} onChange={e => setNewSubCode(e.target.value)} placeholder="两位数字，如：10" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小类名称</label>
                <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="小类名称" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => { setShowAddSub(null); setNewSubCode(''); setNewSubName(''); }}>取消</Button>
                <Button variant="default" onClick={() => handleAddSub(showAddSub.substring(0, 2), showAddSub.substring(2, 4))}>添加</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 保存确认弹窗 */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[480px] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">退出编辑</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-3">所有修改均已实时保存到后端数据库。</p>
              <ul className="text-sm text-gray-500 space-y-2 bg-emerald-50 p-4 rounded-lg">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>编辑分类名称时，修改会即时持久化到数据库</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>新增/删除分类操作也已写入数据库</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>页面刷新后数据不会丢失</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowSaveConfirm(false)}>取消</Button>
              <Button variant="default" onClick={handleSaveConfirm}>确认退出编辑</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 提取大类行渲染子组件（减少主组件复杂度）==========

interface BigCategoryRowProps {
  big: BigCategory;
  isEditing: boolean;
  expandedBig: Set<string>;
  expandedMid: Set<string>;
  onToggleBig: (code: string) => void;
  onToggleMid: (bigCode: string, midCode: string) => void;
  renderEditCell: (type: 'big' | 'mid' | 'sub', bigCode: string, midCode?: string, subCode?: string, currentName?: string) => JSX.Element;
  onDeleteBig: (bigCode: string) => void;
  onDeleteMid: (bigCode: string, midCode: string) => void;
  onDeleteSub: (bigCode: string, midCode: string, subCode: string) => void;
  showAddMid: string | null;
  setShowAddMid: (v: string | null) => void;
  showAddSub: string | null;
  setShowAddSub: (v: string | null) => void;
  newMidCode: string;
  setNewMidCode: (v: string) => void;
  newMidName: string;
  setNewMidName: (v: string) => void;
  newSubCode: string;
  setNewSubCode: (v: string) => void;
  newSubName: string;
  setNewSubName: (v: string) => void;
  onAddMid: (bigCode: string) => void;
  onAddSub: (bigCode: string, midCode: string) => void;
}

function BigCategoryRow({
  big, isEditing, expandedBig, expandedMid, onToggleBig, onToggleMid,
  renderEditCell, onDeleteBig, onDeleteMid, onDeleteSub,
  showAddMid, setShowAddMid, showAddSub, setShowAddSub,
  newMidCode, setNewMidCode, newMidName, setNewMidName,
  newSubCode, setNewSubCode, newSubName, setNewSubName,
  onAddMid, onAddSub,
}: BigCategoryRowProps) {
  return (
    <>
      {/* 大类标题行 */}
      <tr key={`big-${big.code}`} className="bg-white hover:bg-gray-50">
        <td className="px-2 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onToggleBig(big.code)}>
              {expandedBig.has(big.code) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
            <span className="font-mono font-bold text-blue-600 text-sm">{big.code}</span>
          </div>
        </td>
        <td className="px-2 py-3 whitespace-nowrap">
          {isEditing ? (
            <div className="flex items-center gap-2">
              {renderEditCell('big', big.code, undefined, undefined, big.name)}
              <span className="text-xs text-gray-400">({big.nameEn})</span>
              <Button variant="ghost" size="icon" onClick={() => onDeleteBig(big.code)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="font-semibold text-gray-800 text-sm">{big.name}</span>
              <span className="text-xs text-gray-400 ml-1">({big.nameEn})</span>
            </div>
          )}
        </td>
        <td className="px-2 py-3" />
        <td className="px-2 py-3" />
        <td className="px-2 py-3" />
        <td className="px-2 py-3" />
      </tr>

      {/* 已展开的中类 + 小类 */}
      {expandedBig.has(big.code) && big.midCategories.map(mid => {
        const midKey = `${big.code}${mid.code}`;
        const isMidExpanded = expandedMid.has(midKey);

        return (
          <React.Fragment key={`mid-group-${big.code}-${mid.code}`}>
            {/* 中类标题行 */}
            <tr>
              <td className="px-2 py-2" />
              <td className="px-2 py-2" />
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onToggleMid(big.code, mid.code)}>
                    {isMidExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                  <span className="font-mono text-blue-600 font-medium text-sm">{mid.code}</span>
                </div>
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      {renderEditCell('mid', big.code, mid.code, undefined, mid.name)}
                      <Button variant="ghost" size="icon" onClick={() => onDeleteMid(big.code, mid.code)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setShowAddSub(midKey);
                        setNewSubCode('');
                        setNewSubName('');
                      }} className="text-emerald-600 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> 添加小类
                      </Button>
                    </>
                  ) : (
                    <span className="font-medium text-gray-800 text-sm">{mid.name}</span>
                  )}
                </div>
              </td>
              <td className="px-2 py-2" />
              <td className="px-2 py-2" />
            </tr>

            {/* 已展开的小类 */}
            {isMidExpanded && mid.subCategories.map(sub => (
              <tr key={`${big.code}${mid.code}${sub.code}`}>
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
                <td className="px-2 py-2">
                  <span className="font-mono text-blue-600 text-sm">{sub.code}</span>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      {renderEditCell('sub', big.code, mid.code, sub.code, sub.name)}
                      <Button variant="ghost" size="icon" onClick={() => onDeleteSub(big.code, mid.code, sub.code)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-700">{sub.name}</span>
                  )}
                </td>
              </tr>
            ))}
          </React.Fragment>
        );
      })}

      {/* 大类底部：添加中类按钮 */}
      {isEditing && (
        <tr>
          <td className="px-2 py-2" />
          <td className="px-2 py-2">
            <Button variant="ghost" onClick={() => {
              setShowAddMid(big.code);
              setNewMidCode('');
              setNewMidName('');
            }} className="flex items-center gap-1 text-emerald-600">
              <Plus className="w-4 h-4" /> 添加中类
            </Button>
          </td>
          <td className="px-2 py-2" />
          <td className="px-2 py-2" />
          <td className="px-2 py-2" />
          <td className="px-2 py-2" />
        </tr>
      )}
    </>
  );
}