/**
 * 种植标记管理弹窗
 * 通过树形结构展示可用标记，勾选标签后分配标记
 */
import React, { useState, useMemo, useEffect } from 'react';
import { X, Tag, CheckSquare, Square } from 'lucide-react';
import { Button, Tree, Checkbox } from '../../../ui';
import type { TreeNode } from '../../../ui/Tree';
import { showAlert } from '@/lib/dialogService';

// ========== 数据接口 ==========
export interface PlantMark {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  parentId: number;
  markAid: string;
  isUse: number;
  sortOrder: number;
}

export interface LabelOption {
  id: number;
  labelNumber: string;
  currentMarkName?: string;
}

// ========== 颜色Tailwind映射 ==========
const COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-400',
  emerald: 'bg-emerald-500',
  cyan: 'bg-cyan-500',
  indigo: 'bg-indigo-500',
};

/** 根据颜色名获取 Tailwind class */
function getColorDot(color?: string): string {
  if (!color) return 'bg-gray-400';
  return COLOR_MAP[color] || 'bg-gray-400';
}

// ========== 组件属性 ==========
interface PlantingMarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 可用标记列表（扁平数组，通过 parentId 构建树） */
  marks: PlantMark[];
  /** 可标记的标签列表 */
  labels: LabelOption[];
  /** 提交回调 */
  onSubmit: (markId: number, labelIds: number[]) => void;
}

/** 将扁平标记数组转为TreeNode树 */
function buildMarkTree(marks: PlantMark[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  // 先创建所有节点
  marks.forEach((m) => {
    map.set(m.id, {
      key: String(m.id),
      title: m.name,
      children: [],
    });
  });

  // 建立父子关系
  marks.forEach((m) => {
    const node = map.get(m.id)!;
    // 存储原始数据便于渲染
    (node as any).color = m.color;
    (node as any).icon = m.icon;

    if (m.parentId === 0 || !map.has(m.parentId)) {
      roots.push(node);
    } else {
      const parent = map.get(m.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children!.push(node);
    }
  });

  return roots;
}

export default function PlantingMarkModal({
  isOpen,
  onClose,
  marks,
  labels,
  onSubmit
}: PlantingMarkModalProps) {
  const [selectedMarkKey, setSelectedMarkKey] = useState<string>('');
  const [checkedLabelIds, setCheckedLabelIds] = useState<Set<number>>(new Set());

  // 构建标记树
  const markTree = useMemo(() => buildMarkTree(marks), [marks]);

  // 弹窗打开时重置
  useEffect(() => {
    if (isOpen) {
      setSelectedMarkKey('');
      setCheckedLabelIds(new Set());
    }
  }, [isOpen]);

  // 当前选中的标记信息
  const selectedMark = useMemo(() => {
    return marks.find((m) => String(m.id) === selectedMarkKey);
  }, [selectedMarkKey, marks]);

  // 切换标签选中
  const toggleLabel = (labelId: number) => {
    setCheckedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) {
        next.delete(labelId);
      } else {
        next.add(labelId);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleAllLabels = () => {
    if (checkedLabelIds.size === labels.length) {
      setCheckedLabelIds(new Set());
    } else {
      setCheckedLabelIds(new Set(labels.map((l) => l.id)));
    }
  };

  const handleSubmit = async () => {
    const markId = Number(selectedMarkKey);
    if (!markId || checkedLabelIds.size === 0) {
      if (!markId) await showAlert('请先选择一个标记');
      else await showAlert('请至少选择一个标签');
      return;
    }
    await onSubmit(markId, Array.from(checkedLabelIds));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5" />
            标记管理
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-purple-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 左侧：标记树 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">可用标记</h4>
              <div className="border border-gray-200 rounded-lg p-2 max-h-80 overflow-y-auto">
                {markTree.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">暂无可用的标记</div>
                ) : (
                  <Tree
                    data={markTree}
                    selectable={true}
                    selectedKeys={selectedMarkKey ? [selectedMarkKey] : []}
                    onSelect={(keys) => setSelectedMarkKey(keys[0] || '')}
                  />
                )}
              </div>

              {/* 选中标记预览 */}
              {selectedMark && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${getColorDot(selectedMark.color)}`} />
                    <span className="text-sm font-medium text-purple-800">
                      已选标记: {selectedMark.name}
                    </span>
                  </div>
                  {selectedMark.icon && (
                    <span className="text-xs text-purple-600 mt-1 block">
                      图标: {selectedMark.icon}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：标签选择 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">选择标签</h4>
                <Button
                  variant="link"
                  size="sm"
                  onClick={toggleAllLabels}
                >
                  {checkedLabelIds.size === labels.length ? '取消全选' : '全选'}
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg p-2 max-h-80 overflow-y-auto space-y-1">
                {labels.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">暂无可用标签</div>
                ) : (
                  labels.map((label) => {
                    const isChecked = checkedLabelIds.has(label.id);
                    return (
                      <div
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className={`
                          flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors
                          ${isChecked ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'}
                        `}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-700">{label.labelNumber}</span>
                        {label.currentMarkName && (
                          <span className="text-xs text-gray-400 ml-auto">
                            当前: {label.currentMarkName}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                已选 {checkedLabelIds.size} / {labels.length} 个标签
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            确认标记
          </Button>
        </div>
      </div>
    </div>
  );
}
