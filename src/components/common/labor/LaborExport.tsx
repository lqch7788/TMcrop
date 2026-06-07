import React, { useState, useRef } from 'react'
import { Download, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface ExportConfig {
  filename: string
  sheetName?: string
  columns: {
    header: string
    key: string
    width?: number
  }[]
}

export type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

export interface LaborExportProps {
  data: Record<string, unknown>[]
  config: ExportConfig
  onExport?: () => void
  onExportSuccess?: (blob: Blob) => void
  onExportError?: (error: Error) => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showStatus?: boolean
  className?: string
}

export function LaborExport({
  data,
  config,
  onExport,
  onExportSuccess,
  onExportError,
  disabled = false,
  variant = 'default',
  size = 'default',
  showStatus = true,
  className,
}: LaborExportProps) {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const anchorRef = useRef<HTMLAnchorElement>(null)

  // 执行导出
  const handleExport = async () => {
    if (data.length === 0) {
      setStatus('error')
      setErrorMessage('没有可导出的数据')
      onExportError?.(new Error('没有可导出的数据'))
      return
    }

    try {
      setStatus('exporting')
      setErrorMessage('')
      onExport?.()

      // 动态导入 xlsx
      const XLSX = await import('xlsx')

      // 准备数据
      const exportData = data.map((row) => {
        const newRow: Record<string, unknown> = {}
        config.columns.forEach((col) => {
          newRow[col.header] = row[col.key]
        })
        return newRow
      })

      // 创建工作簿
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        config.sheetName || 'Sheet1'
      )

      // 设置列宽
      if (config.columns.some((col) => col.width)) {
        worksheet['!cols'] = config.columns.map((col) => ({
          wch: col.width || 15,
        }))
      }

      // 生成文件
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      // 下载文件
      const url = URL.createObjectURL(blob)
      if (anchorRef.current) {
        anchorRef.current.href = url
        anchorRef.current.download = `${config.filename}.xlsx`
        anchorRef.current.click()
      }
      URL.revokeObjectURL(url)

      setStatus('success')
      onExportSuccess?.(blob)

      // 3秒后重置状态
      setTimeout(() => {
        setStatus('idle')
      }, 3000)
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出失败'
      setStatus('error')
      setErrorMessage(message)
      onExportError?.(error instanceof Error ? error : new Error(message))

      // 3秒后重置状态
      setTimeout(() => {
        setStatus('idle')
      }, 3000)
    }
  }

  // 获取按钮图标
  const getButtonIcon = () => {
    if (status === 'exporting') {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    if (status === 'success') {
      return <CheckCircle className="h-4 w-4" />
    }
    if (status === 'error') {
      return <AlertCircle className="h-4 w-4" />
    }
    return <Download className="h-4 w-4" />
  }

  // 获取按钮文字
  const getButtonText = () => {
    if (status === 'exporting') return '导出中...'
    if (status === 'success') return '导出成功'
    if (status === 'error') return '导出失败'
    return '导出'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={disabled || status === 'exporting'}
        className={cn(
          status === 'success' && 'text-green-600',
          status === 'error' && 'text-red-600'
        )}
      >
        {getButtonIcon()}
        {(size === 'default' || size === 'lg') && (
          <span className="ml-2">{getButtonText()}</span>
        )}
      </Button>

      {/* 状态提示 */}
      {showStatus && status === 'error' && errorMessage && (
        <span className="text-sm text-red-500">{errorMessage}</span>
      )}

      {/* 隐藏的下载链接 */}
      <a ref={anchorRef} style={{ display: 'none' }} />
    </div>
  )
}

// 简单导出按钮（不显示状态）
export function LaborExportButton({
  data,
  config,
  disabled = false,
  className,
}: Omit<LaborExportProps, 'showStatus'>) {
  const anchorRef = useRef<HTMLAnchorElement>(null)

  const handleExport = async () => {
    if (data.length === 0) return

    try {
      const XLSX = await import('xlsx')
      const exportData = data.map((row) => {
        const newRow: Record<string, unknown> = {}
        config.columns.forEach((col) => {
          newRow[col.header] = row[col.key]
        })
        return newRow
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName || 'Sheet1')

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const url = URL.createObjectURL(blob)
      if (anchorRef.current) {
        anchorRef.current.href = url
        anchorRef.current.download = `${config.filename}.xlsx`
        anchorRef.current.click()
      }
      URL.revokeObjectURL(url)
    } catch (error) {
      // logger.error('Export failed:', error);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleExport} disabled={disabled || data.length === 0} className={className}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        导出Excel
      </Button>
      <a ref={anchorRef} style={{ display: 'none' }} />
    </>
  )
}
