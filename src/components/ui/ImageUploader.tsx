/**
 * ImageUploader 图片上传
 * 图片上传、预览、删除
 */
import * as React from "react"
import { Plus, X, Eye, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ImageUploaderProps {
  value?: string[]
  onChange?: (value: string[]) => void
  maxCount?: number
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = [],
  onChange,
  maxCount = 9,
  accept = "image/*",
  multiple = true,
  disabled,
  className
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: string[] = []

    Array.from(files).forEach(file => {
      if (value.length + newImages.length >= maxCount) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        newImages.push(result)
        if (newImages.length === files.length || value.length + newImages.length >= maxCount) {
          onChange?.([...value, ...newImages])
        }
      }
      reader.readAsDataURL(file)
    })

    // 清空 input 以支持重复选择同一文件
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange?.(newImages)
  }

  const handlePreview = (url: string) => {
    setPreviewUrl(url)
  }

  const isDisabled = disabled || value.length >= maxCount

  return (
    <div className={cn("space-y-3", className)}>
      {/* 图片列表 */}
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

              {/* 悬浮操作层 */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePreview(url)}
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

      {/* 上传按钮 */}
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

      {/* 预览弹窗 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
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
