/**
 * KanbanBoard 看板
 * 看板视图，展示任务流转状态
 */
import * as React from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface KanbanColumn {
  id: string
  title: string
  color?: string
}

export interface KanbanCard {
  id: string
  columnId: string
  title: string
  description?: string
  tag?: string
  [key: string]: any
}

export interface KanbanBoardProps {
  columns: KanbanColumn[]
  cards: KanbanCard[]
  onCardClick?: (card: KanbanCard) => void
  onCardDragEnd?: (cardId: string, newColumnId: string) => void
  onColumnAdd?: (columnId: string) => void
  className?: string
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  cards,
  onCardClick,
  onCardDragEnd,
  onColumnAdd,
  className
}) => {
  const [draggedCard, setDraggedCard] = React.useState<KanbanCard | null>(null)
  const [dragOverColumn, setDragOverColumn] = React.useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, card: KanbanCard) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedCard && onCardDragEnd) {
      onCardDragEnd(draggedCard.id, columnId)
    }
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  const getCardsByColumn = (columnId: string) => {
    return cards.filter(card => card.columnId === columnId)
  }

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map(column => {
        const columnCards = getCardsByColumn(column.id)
        const isDragOver = dragOverColumn === column.id

        return (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 w-72 bg-gray-50 rounded-xl p-3 transition-colors",
              isDragOver && "bg-emerald-50 ring-2 ring-emerald-200"
            )}
            onDragOver={e => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, column.id)}
          >
            {/* 列头 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {column.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                )}
                <h3 className="font-medium text-gray-900">{column.title}</h3>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  {columnCards.length}
                </span>
              </div>
              <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* 卡片列表 */}
            <div className="space-y-2 min-h-[200px]">
              {columnCards.map(card => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={e => handleDragStart(e, card)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onCardClick?.(card)}
                  className={cn(
                    "p-3 bg-white rounded-lg border border-gray-200 cursor-pointer transition-all hover:shadow-md hover:border-emerald-300",
                    draggedCard?.id === card.id && "opacity-50 rotate-2"
                  )}
                >
                  {/* 标签 */}
                  {card.tag && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded mb-2">
                      {card.tag}
                    </span>
                  )}

                  {/* 标题 */}
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {card.title}
                  </h4>

                  {/* 描述 */}
                  {card.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {card.description}
                    </p>
                  )}

                  {/* 自定义字段 */}
                  {Object.entries(card)
                    .filter(([key]) => !['id', 'columnId', 'title', 'description', 'tag'].includes(key))
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>

            {/* 添加卡片按钮 */}
            {onColumnAdd && (
              <button
                onClick={() => onColumnAdd(column.id)}
                className="w-full mt-2 p-2 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

KanbanBoard.displayName = "KanbanBoard"

export { KanbanBoard }
