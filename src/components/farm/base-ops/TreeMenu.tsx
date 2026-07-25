/**
 * 基地运营中心 — 4 级树菜单子组件
 * Plan B 2026-07-25
 *
 * 包含：
 * - 顶部搜索框（树内）
 * - 4 级 Tree（base → greenhouse → zone → block）
 * - 底部 [+ 基地/温室/区块] 按钮（可选）
 */
import { Search, Plus, Loader2 } from 'lucide-react';
import { Tree, Input, Button } from '@/components/ui';
import type { SelectedNode } from './types';

interface TreeMenuProps {
  treeData: any[];
  selectedNode: SelectedNode;
  expandedKeys: string[];
  searchTerm: string;
  onSelect: (key: string) => void;
  onExpand: (keys: string[]) => void;
  onSearchChange: (term: string) => void;
  onAddBase?: () => void;
  onAddGreenhouse?: () => void;
  onAddZone?: () => void;
  loading?: boolean;
}

export function TreeMenu({
  treeData, selectedNode, expandedKeys, searchTerm,
  onSelect, onExpand, onSearchChange,
  onAddBase, onAddGreenhouse, onAddZone,
  loading,
}: TreeMenuProps) {
  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-none flex flex-col">
      {/* 搜索框 */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索基地/温室/区域..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tree
            data={treeData}
            selectable
            selectedKeys={selectedNode.oid ? [`${selectedNode.type === 'greenhouse' ? 'gh' : selectedNode.type}_${selectedNode.oid}`] : []}
            expandedKeys={expandedKeys}
            onSelect={(keys) => {
              if (keys.length > 0) onSelect(keys[0]);
            }}
            onExpand={onExpand}
          />
        )}
      </div>

      {/* 底部新增按钮 */}
      <div className="p-3 border-t border-gray-100 flex flex-col gap-1">
        {onAddBase && (
          <Button size="sm" variant="ghost" onClick={onAddBase}>
            <Plus className="w-4 h-4 mr-1" /> 新增基地
          </Button>
        )}
        {onAddGreenhouse && (
          <Button size="sm" variant="ghost" onClick={onAddGreenhouse}>
            <Plus className="w-4 h-4 mr-1" /> 新增温室
          </Button>
        )}
        {onAddZone && (
          <Button size="sm" variant="ghost" onClick={onAddZone}>
            <Plus className="w-4 h-4 mr-1" /> 新增区块
          </Button>
        )}
      </div>
    </div>
  );
}