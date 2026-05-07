/**
 * TreeSelect 树形选择器
 * 下拉选择树形结构数据
 */
import * as React from "react"
import { ChevronDown, Search, File, Folder, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TreeSelectNode {
  key: string
  title: string
  children?: TreeSelectNode[]
  disabled?: boolean
}

export interface TreeSelectProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  treeData: TreeSelectNode[]
  showSearch?: boolean
  allowClear?: boolean
  className?: string
}

const TreeSelect: React.FC<TreeSelectProps> = ({
  value,
  onChange,
  placeholder = "选择",
  disabled,
  treeData,
  showSearch = true,
  allowClear = true,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')
  const [selectedNode, setSelectedNode] = React.useState<TreeSelectNode | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 根据 value 查找选中的节点
  React.useEffect(() => {
    if (value) {
      const findNode = (nodes: TreeSelectNode[]): TreeSelectNode | null => {
        for (const node of nodes) {
          if (node.key === value) return node
          if (node.children) {
            const found = findNode(node.children)
            if (found) return found
          }
        }
        return null
      }
      const node = findNode(treeData)
      setSelectedNode(node)
    } else {
      setSelectedNode(null)
    }
  }, [value, treeData])

  const filteredData = React.useMemo(() => {
    if (!searchValue) return treeData

    const filterNodes = (nodes: TreeSelectNode[]): TreeSelectNode[] => {
      return nodes.reduce((acc: TreeSelectNode[], node) => {
        const matches = node.title.toLowerCase().includes(searchValue.toLowerCase())
        const children = node.children ? filterNodes(node.children) : []

        if (matches || children.length > 0) {
          acc.push({ ...node, children })
        }

        return acc
      }, [])
    }

    return filterNodes(treeData)
  }, [searchValue, treeData])

  const handleSelect = (node: TreeSelectNode) => {
    if (node.disabled) return
    onChange?.(node.key)
    setSelectedNode(node)
    setIsOpen(false)
    setSearchValue('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
    setSelectedNode(null)
  }

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const renderTree = (nodes: TreeSelectNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.key}>
        <div
          onClick={() => handleSelect(node)}
          className={cn(
            "flex items-center gap-2 py-2 px-3 cursor-pointer rounded-lg transition-colors",
            node.disabled && "opacity-50 cursor-not-allowed",
            !node.disabled && "hover:bg-gray-50",
            selectedNode?.key === node.key && "bg-emerald-50"
          )}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          <span className="text-gray-500">
            {node.children ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />}
          </span>
          <span className="text-sm text-gray-700">{node.title}</span>
        </div>
        {node.children && (
          <div>{renderTree(node.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center justify-between gap-2 h-10 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm transition-colors w-full",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:bg-gray-50",
          isOpen && "ring-2 ring-emerald-500 ring-offset-2"
        )}
        disabled={disabled}
      >
        <span className={selectedNode ? "text-gray-900" : "text-gray-400"}>
          {selectedNode ? selectedNode.title : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && selectedNode && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {showSearch && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder="搜索..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-2">
            {filteredData.length > 0 ? (
              renderTree(filteredData)
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                无匹配结果
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

TreeSelect.displayName = "TreeSelect"

export { TreeSelect }
