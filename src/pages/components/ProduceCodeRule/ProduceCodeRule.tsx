/**
 * 作物编码规则管理页面
 * 编码结构：类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细品种(2位) = 11位
 */
import React from 'react';
import { Hash, Plus, Save, Edit2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { useProduceCodeRule } from './hooks/useProduceCodeRule';
import { ProduceCodeRuleTable } from './ProduceCodeRuleTable';

export default function ProduceCodeRule() {
  const navigate = useNavigate();
  const {
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
  } = useProduceCodeRule();

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
      <ProduceCodeRuleTable
        categories={categories}
        expandedCategory={expandedCategory}
        expandedType={expandedType}
        expandedSub={expandedSub}
        isEditing={isEditing}
        editingCell={editingCell}
        editValue={editValue}
        showAddType={showAddType}
        showAddSub={showAddSub}
        showAddSubVariety1={showAddSubVariety1}
        newTypeCode={newTypeCode}
        newTypeName={newTypeName}
        newSubCode={newSubCode}
        newSubName={newSubName}
        newSubVariety1Code={newSubVariety1Code}
        newSubVariety1Name={newSubVariety1Name}
        newCategoryCode={newCategoryCode}
        newCategoryName={newCategoryName}
        onToggleCategory={toggleCategory}
        onToggleType={toggleType}
        onToggleSub={toggleSub}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        onEditValueChange={setEditValue}
        onSetShowAddType={setShowAddType}
        onSetShowAddSub={setShowAddSub}
        onSetShowAddSubVariety1={setShowAddSubVariety1}
        onSetShowAddCategory={setShowAddCategory}
        onNewTypeCodeChange={setNewTypeCode}
        onNewTypeNameChange={setNewTypeName}
        onNewSubCodeChange={setNewSubCode}
        onNewSubNameChange={setNewSubName}
        onNewSubVariety1CodeChange={setNewSubVariety1Code}
        onNewSubVariety1NameChange={setNewSubVariety1Name}
        onNewCategoryCodeChange={setNewCategoryCode}
        onNewCategoryNameChange={setNewCategoryName}
        onAddType={addType}
        onAddSub={addSub}
        onAddSubVariety1={addSubVariety1}
        onAddCategory={addCategory}
        onDeleteType={deleteType}
        onDeleteSub={deleteSub}
        onDeleteSubVariety1={deleteSubVariety1}
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
              <Button variant="secondary" onClick={() => setShowSaveConfirm(false)}>
                取消保存
              </Button>
              <Button variant="destructive" onClick={() => { setShowSaveConfirm(false); setIsEditing(false); handleSave(); }}>
                确认保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ChevronRight 组件
function ChevronRight({ className, ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
