/**
 * Cascader 级联选择器
 * 多级联动选择，如省市区选择
 * 支持四级懒加载模式（V10.0 增强）
 */
import * as React from "react"
import { ChevronDown, Search, X, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CascaderOption {
  label: string
  value: string
  children?: CascaderOption[]
  disabled?: boolean
}

/** 值节点格式 - 支持 {id, name}[] 作为值 */
export interface CascaderValueNode {
  id: number
  name: string
}

export interface CascaderProps {
  value?: string[]
  /** 节点格式的值（与 value 二选一，优先使用 valueNodes） */
  valueNodes?: CascaderValueNode[]
  onChange?: (value: string[]) => void
  /** 节点格式的回调（当值变化时返回完整路径节点信息） */
  onChangeNodes?: (nodes: CascaderValueNode[]) => void
  options: CascaderOption[]
  placeholder?: string
  disabled?: boolean
  showSearch?: boolean
  allowClear?: boolean
  className?: string
  /** 启用懒加载模式 - 展开时通过回调加载子节点 */
  lazy?: boolean
  /** 懒加载回调 - 传入父节点ID，返回子节点列表 */
  onLoadChildren?: (parentId: number) => Promise<CascaderOption[]>
  /** 最大级联深度 - 默认3级，区域选择用4级 */
  maxLevel?: number
}

const Cascader: React.FC<CascaderProps> = ({
  value = [],
  valueNodes,
  onChange,
  onChangeNodes,
  options,
  placeholder = "选择地区",
  disabled,
  showSearch = true,
  allowClear = true,
  className,
  lazy = false,
  onLoadChildren,
  maxLevel = 3
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')
  const [activeOptions, setActiveOptions] = React.useState<CascaderOption[][]>([options])
  const [selectedPath, setSelectedPath] = React.useState<CascaderOption[]>([])
  const [loadingParentId, setLoadingParentId] = React.useState<number | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  // 跟踪哪些选项已经加载过子节点（避免重复加载）
  const loadedParentIds = React.useRef<Set<number>>(new Set())

  // 根据 valueNodes 恢复 selectedPath（从 options 树中查找）
  React.useEffect(() => {
    if (valueNodes && valueNodes.length > 0 && options.length > 0) {
      let currentLevel = options
      const path: CascaderOption[] = []

      for (let i = 0; i < valueNodes.length; i++) {
        const node = valueNodes[i]
        const found = currentLevel.find(
          (opt) => opt.value === String(node.id) || opt.label === node.name
        )
        if (found) {
          path.push(found)
          currentLevel = found.children || []
        } else {
          break
        }
      }

      if (path.length > 0) {
        setSelectedPath(path)
        // 重构 activeOptions 以反映已选路径
        const active: CascaderOption[][] = [options]
        for (let i = 0; i < path.length; i++) {
          if (path[i].children && path[i].children!.length > 0) {
            active.push(path[i].children!)
          } else {
            break
          }
        }
        setActiveOptions(active)
      }
    }
  }, [valueNodes, options])

  // 当 options 在 lazy 模式下刷新时，更新 activeOptions
  React.useEffect(() => {
    if (!lazy && (value?.length === 0) && selectedPath.length === 0) {
      setActiveOptions([options])
    }
  }, [options, lazy, value, selectedPath])

  /** 判断当前是否已达最大深度（maxLevel） */
  const isMaxLevel = (currentLevel: number) => currentLevel >= maxLevel - 1

  /** 懒加载子节点 */
  const loadChildren = async (option: CascaderOption, level: number) => {
    const parentId = Number(option.value)
    if (isNaN(parentId) || !onLoadChildren) return null

    // 如果已加载过子节点，直接返回现有数据
    if (loadedParentIds.current.has(parentId)) return option.children || null

    setLoadingParentId(parentId)
    try {
      const children = await onLoadChildren(parentId)
      loadedParentIds.current.add(parentId)
      // 更新 option 的 children（就地修改以保持引用）
      option.children = children
      return children
    } catch {
      return null
    } finally {
      setLoadingParentId(null)
    }
  }

  /** 选择处理 */
  const handleSelect = async (option: CascaderOption, level: number) => {
    if (option.disabled) return

    const newPath = [...selectedPath.slice(0, level), option]

    // 判断是否已达最大深度
    if (isMaxLevel(level)) {
      // 到达最大深度，直接提交
      setSelectedPath(newPath)
      onChange?.(newPath.map((o) => o.value))
      onChangeNodes?.(
        newPath.map((o) => ({ id: Number(o.value), name: o.label }))
      )
      setIsOpen(false)
      setSearchValue('')
      return
    }

    // 懒加载模式：先检查是否有已缓存的子节点
    if (lazy && onLoadChildren) {
      const parentId = Number(option.value)
      const hasCachedChildren = loadedParentIds.current.has(parentId) && option.children && option.children.length > 0

      if (option.children && option.children.length > 0) {
        // 已有子节点（懒加载返回的数据），直接展开
        setActiveOptions((prev) => [...prev.slice(0, level + 1), option.children!])
        setSelectedPath(newPath)
      } else if (!hasCachedChildren && !isNaN(parentId)) {
        // 没有子节点，触发懒加载
        setSelectedPath(newPath)
        const children = await loadChildren(option, level)
        if (children && children.length > 0) {
          // 懒加载成功：展开下一级
          setActiveOptions((prev) => [...prev.slice(0, level + 1), children])
        } else {
          // 懒加载返回空或无子节点：提交选择（即使未达最大深度）
          onChange?.(newPath.map((o) => o.value))
          onChangeNodes?.(
            newPath.map((o) => ({ id: Number(o.value), name: o.label }))
          )
          setIsOpen(false)
          setSearchValue('')
        }
      } else {
        // 已确认无子节点，提交选择
        onChange?.(newPath.map((o) => o.value))
        onChangeNodes?.(
          newPath.map((o) => ({ id: Number(o.value), name: o.label }))
        )
        setIsOpen(false)
        setSearchValue('')
      }
      return
    }

    // 非懒加载模式：展开或提交
    if (option.children && option.children.length > 0) {
      setActiveOptions((prev) => [...prev.slice(0, level + 1), option.children!])
      setSelectedPath(newPath)
    } else {
      setSelectedPath(newPath)
      onChange?.(newPath.map((o) => o.value))
      onChangeNodes?.(
        newPath.map((o) => ({ id: Number(o.value), name: o.label }))
      )
      setIsOpen(false)
      setSearchValue('')
    }
  }

  /** 返回上一级 */
  const handleBacktrack = (level: number) => {
    setActiveOptions((prev) => prev.slice(0, level + 1))
    setSelectedPath((prev) => prev.slice(0, level))
  }

  /** 清除选择 */
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.([])
    onChangeNodes?.([])
    setSelectedPath([])
    setActiveOptions([options])
  }

  // 搜索过滤
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return null

    const results: { option: CascaderOption; path: CascaderOption[] }[] = []

    const search = (opts: CascaderOption[], path: CascaderOption[] = []) => {
      for (const opt of opts) {
        const currentPath = [...path, opt]
        if (opt.label.toLowerCase().includes(searchValue.toLowerCase())) {
          results.push({ option: opt, path: currentPath })
        }
        if (opt.children) {
          search(opt.children, currentPath)
        }
      }
    }

    search(options)
    return results
  }, [searchValue, options])

  // 点击外部关闭
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

  const displayValue = selectedPath.map((o) => o.label).join(' / ')

  /** 渲染加载状态或选项列表 */
  const renderOptionItem = (option: CascaderOption, level: number) => {
    const isLoading = loadingParentId === Number(option.value)

    if (isLoading) {
      return (
        <div
          key={option.value}
          className="flex items-center gap-2 py-2 px-3 rounded-lg"
        >
          <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      )
    }

    return (
      <div
        key={option.value}
        onClick={() => handleSelect(option, level)}
        className={cn(
          "flex items-center justify-between py-2 px-3 cursor-pointer rounded-lg transition-colors",
          option.disabled && "opacity-50 cursor-not-allowed",
          !option.disabled && "hover:bg-gray-50",
          selectedPath[level]?.value === option.value && "bg-emerald-50"
        )}
      >
        <span className="text-sm text-gray-700">{option.label}</span>
        {/* 懒加载模式下：始终显示展开箭头；非懒加载：仅在有子节点时显示 */}
        {(option.children && option.children.length > 0) ||
         (lazy && onLoadChildren && !isMaxLevel(level)) ? (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        ) : null}
      </div>
    )
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
        <span className={selectedPath.length > 0 ? "text-gray-900" : "text-gray-400"}>
          {selectedPath.length > 0 ? displayValue : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && selectedPath.length > 0 && (
            <span onClick={handleClear} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[300px] bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {showSearch && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="搜索..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {searchValue && filteredOptions ? (
            // 搜索结果模式
            <div className="max-h-60 overflow-y-auto p-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(({ option, path }, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      onChange?.(path.map((o) => o.value))
                      onChangeNodes?.(
                        path.map((o) => ({ id: Number(o.value), name: o.label }))
                      )
                      setSelectedPath(path)
                      setIsOpen(false)
                      setSearchValue('')
                    }}
                    className="py-2 px-3 cursor-pointer rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm">{path.map((o) => o.label).join(' / ')}</span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">无匹配结果</div>
              )}
            </div>
          ) : (
            // 联动选择模式
            <div className="flex">
              {activeOptions.map((levelOptions, level) => (
                <div
                  key={level}
                  className={cn(
                    "p-2 border-r border-gray-100 last:border-r-0",
                    levelOptions === options ? "w-full" : "w-1/3"
                  )}
                >
                  {/* 返回上一级按钮 */}
                  {selectedPath.length > level && (
                    <div
                      onClick={() => handleBacktrack(level)}
                      className="mb-2 pb-2 border-b border-gray-100 text-xs text-emerald-600 cursor-pointer"
                    >
                      返回上一级
                    </div>
                  )}
                  <div className="space-y-1">
                    {levelOptions.map((option) => renderOptionItem(option, level))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

Cascader.displayName = "Cascader"

export { Cascader }
