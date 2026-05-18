import { useState, useEffect } from 'react';
import { Hash, Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddMidModal } from '../components/codeRule/AddMidModal';
import { Button } from '../components/ui/button';
import { useSupplierCodeRuleStore } from '../stores';

export default function SupplierCodeRule() {
  const navigate = useNavigate();
  const categories = useSupplierCodeRuleStore((s) => s.categories);
  const isLoading = useSupplierCodeRuleStore((s) => s.isLoading);
  const fetchCategories = useSupplierCodeRuleStore((s) => s.fetchCategories);
  const updateBigName = useSupplierCodeRuleStore((s) => s.updateBigName);
  const updateMidName = useSupplierCodeRuleStore((s) => s.updateMidName);
  const addBigCategory = useSupplierCodeRuleStore((s) => s.addBigCategory);
  const addMidCategory = useSupplierCodeRuleStore((s) => s.addMidCategory);
  const deleteBigCategory = useSupplierCodeRuleStore((s) => s.deleteBigCategory);
  const deleteMidCategory = useSupplierCodeRuleStore((s) => s.deleteMidCategory);

  // 组件挂载时从后端加载数据
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const [expandedBig, setExpandedBig] = useState<Set<string>>(new Set(categories.map(c => c.code)));
  const [editingCell, setEditingCell] = useState<{type: 'big' | 'mid'; bigCode: string; midCode?: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddBig, setShowAddBig] = useState(false);
  const [showAddMid, setShowAddMid] = useState<string | null>(null);
  const [newBigCode, setNewBigCode] = useState('');
  const [newBigName, setNewBigName] = useState('');
  const [newMidCode, setNewMidCode] = useState('');
  const [newMidName, setNewMidName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // 展开/折叠大类
  const toggleBig = (code: string) => {
    const newExpanded = new Set(expandedBig);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedBig(newExpanded);
  };

  // 开始编辑
  const startEdit = (type: 'big' | 'mid', bigCode: string, midCode?: string, currentName?: string) => {
    setEditingCell({ type, bigCode, midCode });
    setEditValue(currentName || '');
  };

  // 保存编辑（通过Store持久化到后端DB）
  const saveEdit = async () => {
    if (!editingCell || !editValue.trim()) return;

    if (editingCell.type === 'big') {
      await updateBigName(editingCell.bigCode, editValue.trim());
    } else if (editingCell.midCode) {
      await updateMidName(editingCell.bigCode, editingCell.midCode, editValue.trim());
    }

    setEditingCell(null);
    setEditValue('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // 添加大类（通过Store持久化到后端DB）
  const handleAddBigCategory = async () => {
    if (!newBigCode.trim() || !newBigName.trim()) return;
    await addBigCategory(newBigCode.trim().toUpperCase(), newBigName.trim());
    setNewBigCode('');
    setNewBigName('');
    setShowAddBig(false);
  };

  // 添加中类（通过Store持久化到后端DB）
  const handleAddMidCategory = async (bigCode: string, midCode: string, midName: string) => {
    if (!midCode.trim() || !midName.trim()) return;
    await addMidCategory(bigCode, midCode.trim(), midName.trim());
    setNewMidCode('');
    setNewMidName('');
    setShowAddMid(null);
  };

  // 删除大类（通过Store持久化到后端DB）
  const handleDeleteBigCategory = async (bigCode: string) => {
    if (!confirm(`确定要删除大类 "${bigCode}" 吗？`)) return;
    await deleteBigCategory(bigCode);
  };

  // 删除中类（通过Store持久化到后端DB）
  const handleDeleteMidCategory = async (bigCode: string, midCode: string) => {
    if (!confirm(`确定要删除中类 "${midCode}" 吗？`)) return;
    await deleteMidCategory(bigCode, midCode);
  };

  // 渲染编辑单元格
  const renderEditCell = (type: 'big' | 'mid', bigCode: string, midCode?: string, currentName?: string) => {
    if (editingCell?.type === type && editingCell?.bigCode === bigCode && editingCell?.midCode === midCode) {
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
            className="w-40 px-2 py-1 border border-emerald-500 rounded text-sm focus:outline-none"
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
        <span className="cursor-pointer hover:text-emerald-600" onClick={() => startEdit(type, bigCode, midCode, currentName)}>
          {currentName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startEdit(type, bigCode, midCode, currentName)}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
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
              <h1 className="text-2xl font-bold text-gray-900">供应商编码规则</h1>
              <p className="text-gray-500">编码结构：大类代码(2位) + 中类代码(2位) + 流水号(3位)，前缀 SU_</p>
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
          <li>• 编辑模式下可添加、删除、修改分类</li>
          <li>• 点击展开图标查看下级分类</li>
          <li>• 点击"保存修改"前请注意风险提示</li>
        </ul>
      </div>
      )}

      {/* 分类表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-[65%]">
        <table className="w-full">
          <thead className="bg-emerald-600">
            <tr>
              <th className="px-2 py-3 text-left text-base font-semibold text-white w-24">大类代码</th>
              <th className="px-2 py-3 text-left text-base font-semibold text-white">大类名称</th>
              <th className="px-2 py-3 text-left text-base font-semibold text-white w-24">中类代码</th>
              <th className="px-2 py-3 text-left text-base font-semibold text-white w-48">中类名称</th>
            </tr>
            {/* 添加大类按钮 - 表格顶部 */}
            {isEditing && (
              <tr className="bg-white">
                <td colSpan={4} className="px-2 py-2">
                  {showAddBig ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newBigCode}
                        onChange={(e) => setNewBigCode(e.target.value)}
                        placeholder="代码(如:AB)"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        value={newBigName}
                        onChange={(e) => setNewBigName(e.target.value)}
                        placeholder="大类名称"
                        className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <Button variant="default" size="sm" onClick={handleAddBigCategory}>添加</Button>
                      <Button variant="secondary" size="sm" onClick={() => setShowAddBig(false)}>取消</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setShowAddBig(true)}>
                      <Plus className="w-4 h-4" /> 添加大类
                    </Button>
                  )}
                </td>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-300">
            {/* 渲染大类标题行（始终可见） */}
            {categories.map((big) => {
              return (
                <>
                  {/* 大类标题行 - 始终显示 */}
                  <tr key={`big-${big.code}`} className="bg-white hover:bg-gray-50">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleBig(big.code)}>
                          {expandedBig.has(big.code) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </Button>
                        <span className="font-mono font-bold text-blue-600 text-sm">{big.code}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center">
                          {renderEditCell('big', big.code, undefined, big.name)}
                          <span className="text-xs text-gray-400 ml-1">({big.nameEn})</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-800 text-sm">{big.name}</span>
                          <span className="text-xs text-gray-400 ml-1">({big.nameEn})</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3"></td>
                    <td className="px-2 py-3">
                      {isEditing && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBigCategory(big.code)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </td>
                  </tr>

                  {/* 如果大类已展开，渲染中类 */}
                  {expandedBig.has(big.code) && big.midCategories.map((mid) => {
                    return (
                      <tr key={`mid-${big.code}-${mid.code}`} className="bg-white hover:bg-gray-50">
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2">
                          <span className="font-mono text-blue-600 font-medium text-sm">{mid.code}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            {isEditing ? renderEditCell('mid', big.code, mid.code, mid.name) : <span className="font-medium text-gray-800 text-sm">{mid.name}</span>}
                            {isEditing && (
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteMidCategory(big.code, mid.code)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* 添加中类按钮 - 在大类的最后 */}
                  {isEditing && (
                    <tr key={`add-mid-${big.code}`} className="bg-white hover:bg-gray-50">
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" onClick={() => setShowAddMid(big.code)} className="flex items-center gap-1 text-emerald-600">
                          <Plus className="w-4 h-4" /> 添加中类
                        </Button>
                      </td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  )}
                </>
              );
            })}
                      </tbody>
        </table>
      </div>

      {/* 添加中类弹窗 */}
      <AddMidModal
        isOpen={!!showAddMid}
        onClose={() => setShowAddMid(null)}
        bigCode={showAddMid || ''}
        onAdd={(midCode, midName) => handleAddMidCategory(showAddMid!, midCode, midName)}
      />

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
                  <span>如果修改后的编码规则与系统中已有的供应商编码冲突，可能导致系统无法识别该供应商</span>
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
              <Button variant="secondary" onClick={() => setShowSaveConfirm(false)}>
                取消保存
              </Button>
              <Button variant="destructive" onClick={() => {
                  setShowSaveConfirm(false);
                  setIsEditing(false);
                  // 数据已通过每次CRUD操作实时持久化到后端数据库，无需额外保存
                }}>
                确认保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
