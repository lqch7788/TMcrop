/**
 * Cascader 级联选择器
 * 多级联动选择，如省市区选择
 */
import * as React from "react"
import { ChevronDown, Search, X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CascaderOption {
  label: string
  value: string
  children?: CascaderOption[]
  disabled?: boolean
}

export interface CascaderProps {
  value?: string[]
  onChange?: (value: string[]) => void
  options: CascaderOption[]
  placeholder?: string
  disabled?: boolean
  showSearch?: boolean
  allowClear?: boolean
  className?: string
}

const Cascader: React.FC<CascaderProps> = ({
  value = [],
  onChange,
  options,
  placeholder = "选择地区",
  disabled,
  showSearch = true,
  allowClear = true,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')
  const [activeOptions, setActiveOptions] = React.useState<CascaderOption[][]>([options])
  const [selectedPath, setSelectedPath] = React.useState<CascaderOption[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleSelect = (option: CascaderOption, level: number) => {
    if (option.disabled) return

    const newPath = [...selectedPath.slice(0, level), option]

    if (option.children && option.children.length > 0) {
      setActiveOptions(prev => [...prev.slice(0, level + 1), option.children!])
      setSelectedPath(newPath)
    } else {
      setSelectedPath(newPath)
      onChange?.(newPath.map(o => o.value))
      setIsOpen(false)
      setSearchValue('')
    }
  }

  const handleBacktrack = (level: number) => {
    setActiveOptions(prev => prev.slice(0, level + 1))
    setSelectedPath(prev => prev.slice(0, level))
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.([])
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

  const displayValue = selectedPath.map(o => o.label).join(' / ')

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
                  onChange={e => setSearchValue(e.target.value)}
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
                      onChange?.(path.map(o => o.value))
                      setSelectedPath(path)
                      setIsOpen(false)
                      setSearchValue('')
                    }}
                    className="py-2 px-3 cursor-pointer rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm">{path.map(o => o.label).join(' / ')}</span>
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
                <div key={level} className={cn("p-2 border-r border-gray-100 last:border-r-0", levelOptions === options ? "w-full" : "w-1/3")}>
                  {selectedPath.length > level && (
                    <div
                      onClick={() => handleBacktrack(level)}
                      className="mb-2 pb-2 border-b border-gray-100 text-xs text-emerald-600 cursor-pointer"
                    >
                      返回上一级
                    </div>
                  )}
                  <div className="space-y-1">
                    {levelOptions.map(option => (
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
                        {option.children && option.children.length > 0 && (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    ))}
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
