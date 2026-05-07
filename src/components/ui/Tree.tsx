/**
 * Tree 树形组件
 * 展示树形结构数据，支持展开/收起、选择
 */
import * as React from "react"
import { ChevronRight, ChevronDown, File, Folder, CheckSquare, Square } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TreeNode {
  key: string
  title: string
  children?: TreeNode[]
  disabled?: boolean
  [key: string]: any
}

export interface TreeProps {
  data: TreeNode[]
  selectable?: boolean
  checkable?: boolean
  expandedKeys?: string[]
  checkedKeys?: string[]
  selectedKeys?: string[]
  onExpand?: (keys: string[]) => void
  onCheck?: (keys: string[]) => void
  onSelect?: (keys: string[]) => void
  className?: string
}

interface TreeNodeComponentProps {
  node: TreeNode
  level: number
  selectable: boolean
  checkable: boolean
  expandedKeys: string[]
  checkedKeys: string[]
  selectedKeys: string[]
  onExpand: (key: string) => void
  onCheck: (key: string) => void
  onSelect: (key: string) => void
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({
  node,
  level,
  selectable,
  checkable,
  expandedKeys,
  checkedKeys,
  selectedKeys,
  onExpand,
  onCheck,
  onSelect
}) => {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedKeys.includes(node.key)
  const isChecked = checkedKeys.includes(node.key)
  const isSelected = selectedKeys.includes(node.key)

  const handleClick = () => {
    if (node.disabled) return

    if (checkable) {
      onCheck(node.key)
    } else if (selectable) {
      onSelect(node.key)
    }
  }

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onExpand(node.key)
    }
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors",
          node.disabled && "opacity-50 cursor-not-allowed",
          !node.disabled && isSelected && "bg-emerald-50 text-emerald-700",
          !node.disabled && !isSelected && "hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {/* 展开/收起按钮 */}
        <button
          onClick={handleExpand}
          className={cn(
            "p-0.5 rounded hover:bg-gray-200 transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* 复选框 */}
        {checkable && (
          <button className="p-0.5">
            {isChecked ? (
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Square className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}

        {/* 图标 */}
        <span className="text-gray-500">
          {hasChildren ? (
            <Folder className="w-4 h-4" />
          ) : (
            <File className="w-4 h-4" />
          )}
        </span>

        {/* 标题 */}
        <span className={cn("text-sm", isSelected ? "font-medium" : "text-gray-700")}>
          {node.title}
        </span>
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <TreeNodeComponent
              key={child.key}
              node={child}
              level={level + 1}
              selectable={selectable}
              checkable={checkable}
              expandedKeys={expandedKeys}
              checkedKeys={checkedKeys}
              selectedKeys={selectedKeys}
              onExpand={onExpand}
              onCheck={onCheck}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const Tree: React.FC<TreeProps> = ({
  data,
  selectable = false,
  checkable = false,
  expandedKeys: controlledExpandedKeys,
  checkedKeys: controlledCheckedKeys,
  selectedKeys: controlledSelectedKeys,
  onExpand,
  onCheck,
  onSelect,
  className
}) => {
  const [internalExpandedKeys, setInternalExpandedKeys] = React.useState<string[]>(
    controlledExpandedKeys || []
  )
  const [internalCheckedKeys, setInternalCheckedKeys] = React.useState<string[]>(
    controlledCheckedKeys || []
  )
  const [internalSelectedKeys, setInternalSelectedKeys] = React.useState<string[]>(
    controlledSelectedKeys || []
  )

  const expandedKeys = controlledExpandedKeys ?? internalExpandedKeys
  const checkedKeys = controlledCheckedKeys ?? internalCheckedKeys
  const selectedKeys = controlledSelectedKeys ?? internalSelectedKeys

  const handleExpand = (key: string) => {
    const newKeys = expandedKeys.includes(key)
      ? expandedKeys.filter(k => k !== key)
      : [...expandedKeys, key]

    if (!controlledExpandedKeys) {
      setInternalExpandedKeys(newKeys)
    }
    onExpand?.(newKeys)
  }

  const handleCheck = (key: string) => {
    const newKeys = checkedKeys.includes(key)
      ? checkedKeys.filter(k => k !== key)
      : [...checkedKeys, key]

    if (!controlledCheckedKeys) {
      setInternalCheckedKeys(newKeys)
    }
    onCheck?.(newKeys)
  }

  const handleSelect = (key: string) => {
    const newKeys = [key]

    if (!controlledSelectedKeys) {
      setInternalSelectedKeys(newKeys)
    }
    onSelect?.(newKeys)
  }

  return (
    <div className={cn("bg-white rounded-lg", className)}>
      {data.map(node => (
        <TreeNodeComponent
          key={node.key}
          node={node}
          level={0}
          selectable={selectable}
          checkable={checkable}
          expandedKeys={expandedKeys}
          checkedKeys={checkedKeys}
          selectedKeys={selectedKeys}
          onExpand={handleExpand}
          onCheck={handleCheck}
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
}

Tree.displayName = "Tree"

export { Tree }
