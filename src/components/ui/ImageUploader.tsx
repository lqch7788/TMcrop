/**
 * ImageUploader 图片上传
 * 支持两种模式：
 *   1. 默认（compact=false）：缩略图 mosaic + + 上传方框
 *   2. compact=true：只显示「+ 添加图片」按钮 + 已选 N/M + 删除 chip
 *      （缩略图不在 modal 显示，留给列表/详情页展示）
 */
import * as React from "react"
import { Plus, X, Eye, Image as ImageIcon } from "lucide-react"
import { Button } from './button'
import { cn } from "@/lib/utils"

export interface ImageUploaderProps {
  value?: string[]
  onChange?: (value: string[]) => void
  maxCount?: number
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
  /**
   * 2026-07-16：紧凑模式
   * - false（默认）：缩略图 mosaic + + 上传方框
   * - true：只显示「+ 添加图片」按钮 + 已选 N/M + 删除 chip
   */
  compact?: boolean
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = [],
  onChange,
  maxCount = 9,
  accept = "image/*",
  multiple = true,
  disabled,
  className,
  compact = false,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    // 2026-07-16：Promise.all 解决共享闭包 + 异步竞态 bug
    const remaining = maxCount - value.length
    const slots = Math.min(files.length, Math.max(remaining, 0))
    const fileSlice = files.slice(0, slots)

    Promise.all(
      fileSlice.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error || new Error('readAsDataURL failed'))
            reader.readAsDataURL(file)
          })
      )
    )
      .then((dataUrls) => {
        const valid = dataUrls.filter((s): s is string => typeof s === 'string' && s.length > 0)
        if (valid.length > 0) {
          onChange?.([...value, ...valid])
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[ImageUploader] 文件读取失败:', err)
      })

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange?.(newImages)
  }

  const isDisabled = disabled || value.length >= maxCount

  // ====== 紧凑模式：只显示「添加图片」按钮 + 已选 N/M + 删除 chip ======
  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isDisabled}
            onClick={() => inputRef.current?.click()}
            className="gap-1"
          >
            <ImageIcon className="w-4 h-4" />
            {value.length === 0 ? '添加图片' : '继续添加图片'}
          </Button>
          <span className="text-xs text-gray-500">
            已选 <strong className="text-orange-600">{value.length}</strong>/{maxCount} 张
          </span>
          {isDisabled && (
            <span className="text-xs text-gray-400">已达上限</span>
          )}
        </div>

        {/* 已选 chip：可单张删除 */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.map((src, index) => (
              <span
                key={index}
                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-xs text-gray-700"
              >
                <ImageIcon className="w-3 h-3" />
                <span>图片 {index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-gray-400 hover:text-red-600 ml-0.5"
                  title="删除该图片"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => onChange?.([])}
              className="text-xs text-gray-400 hover:text-red-500 ml-1"
            >
              清空全部
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>
    )
  }

  // ====== 默认模式：缩略图 mosaic + + 上传方框 ======
  return (
    <div className={cn("space-y-3", className)}>
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {value.map((url, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200"
            >
              <img
                src={url}
                alt={`图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreviewUrl(url)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  type="button"
                >
                  <Eye className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => handleRemove(index)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isDisabled && (
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            "aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-500" />
          </div>
          <span className="text-sm text-gray-500">
            {value.length}/{maxCount}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            type="button"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewUrl}
            alt="预览"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

ImageUploader.displayName = "ImageUploader"

export { ImageUploader }
