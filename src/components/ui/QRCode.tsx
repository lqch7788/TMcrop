/**
 * QRCode 二维码生成
 * 生成二维码
 */
import * as React from "react"
import { Download, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QRCodeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  size?: number
  color?: string
  bgColor?: string
  download?: boolean
  fileName?: string
}

const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 200,
  color = '#000000',
  bgColor = '#ffffff',
  download = false,
  fileName = 'qrcode',
  className,
  ...props
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('')

  // 生成二维码矩阵
  const generateQRMatrix = (text: string): boolean[][] => {
    // 简化的二维码生成逻辑
    // 实际项目中建议使用 qrcode 库
    const matrix: boolean[][] = []
    const size = 21

    for (let i = 0; i < size; i++) {
      matrix[i] = []
      for (let j = 0; j < size; j++) {
        // 位置探测图形
        if (
          (i < 7 && j < 7) ||
          (i < 7 && j >= size - 7) ||
          (i >= size - 7 && j < 7)
        ) {
          matrix[i][j] = true
        }
        // 时序图案
        else if (i === 6 || j === 6) {
          matrix[i][j] = (i + j) % 2 === 0
        }
        // 数据区域（伪随机）
        else {
          const hash = (i * 17 + j * 31 + text.charCodeAt((i + j) % text.length)) % 3
          matrix[i][j] = hash === 0
        }
      }
    }

    return matrix
  }

  React.useEffect(() => {
    if (!value) return

    const matrix = generateQRMatrix(value)
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pixelSize = size / matrix.length

    // 绘制背景
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)

    // 绘制二维码
    ctx.fillStyle = color
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (matrix[i][j]) {
          ctx.fillRect(i * pixelSize, j * pixelSize, pixelSize, pixelSize)
        }
      }
    }

    // 生成数据 URL
    setQrDataUrl(canvas.toDataURL('image/png'))
  }, [value, size, color, bgColor])

  const handleDownload = () => {
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.download = `${fileName}.png`
    link.href = qrDataUrl
    link.click()
  }

  const handleCopy = async () => {
    if (!qrDataUrl) return

    try {
      const response = await fetch(qrDataUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
    } catch (err) {
      // logger.error('复制失败:', err);
    }
  }

  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)} {...props}>
      {/* 二维码画布 */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-lg"
        />

        {/* 加载状态 */}
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-400">请输入内容</span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {(download || className?.includes('show-actions')) && (
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors",
              !qrDataUrl && "opacity-50 cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4" />
            下载
          </button>
          <button
            onClick={handleCopy}
            disabled={!qrDataUrl}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors",
              !qrDataUrl && "opacity-50 cursor-not-allowed"
            )}
          >
            <Copy className="w-4 h-4" />
            复制
          </button>
        </div>
      )}
    </div>
  )
}

QRCode.displayName = "QRCode"

export { QRCode }
