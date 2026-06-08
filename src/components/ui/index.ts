/**
 * V1.1 UI 组件统一导出
 *
 * 使用方式：
 * import { Button, Card, DatePicker } from '@/components/ui'
 */

// 基础组件
export { Button, buttonVariants } from './button'
export { Card, CardHeader, CardTitle, CardContent } from './card'
export { Badge } from './badge'
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table'
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
export { Input } from './input'
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
export { Checkbox } from './checkbox'
export { Label } from './label'
export { Popover, PopoverContent, PopoverTrigger } from './popover'
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu'

// Toast / Modal
export { ToastContainer, useToast } from './Toast'
export { Modal, FormField } from './Modal'
export { UnifiedModal } from './UnifiedModal'

// 高级组件 - 第一批
export { DatePicker } from './DatePicker'
export { DateRangePicker } from './DateRangePicker'
export { Drawer, DrawerHeader, DrawerTitle, DrawerDescription, DrawerContent, DrawerFooter, DrawerClose } from './Drawer'
export { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent, SheetFooter, SheetClose } from './Sheet'
export { Alert, AlertTitle, AlertDescription } from './Alert'
export { NotificationProvider, useNotification } from './Notification'
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from './Breadcrumb'
export { Steps, StepsStep } from './Steps'
export { Pagination } from './Pagination'
export { Skeleton, TableSkeleton, CardSkeleton, ListSkeleton } from './Skeleton'
export { Progress } from './Progress'
export { TextArea } from './TextArea'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

// 高级组件 - 第二批
export { Calendar } from './Calendar'
export { Tree } from './Tree'
export { TreeSelect } from './TreeSelect'
export { Cascader } from './Cascader'
export { TimePicker } from './TimePicker'
export { Tooltip } from './Tooltip'
export { Avatar, AvatarGroup, AvatarImage, AvatarFallback } from './Avatar'
export { ImageUploader } from './ImageUploader'
export { Statistic } from './Statistic'
export { EmptyState } from './EmptyState'
export { Divider } from './Divider'
export { Space } from './Space'

// 高级组件 - 第三批
export { QRCode } from './QRCode'
export { FilterBar, FilterItem } from './FilterBar'
export { KanbanBoard } from './KanbanBoard'
export { GanttChart } from './GanttChart'

// 性能优化组件
export { VirtualTable, type VirtualTableColumn, type VirtualTableProps } from './VirtualTable'

// 通用组件
export { Timeline } from './Timeline'
export { default as LabelResumeTimeline } from './LabelResumeTimeline'
export type { LabelResumeEntry, LabelResumeTimelineProps } from './LabelResumeTimeline'
export { List } from './List'

// 数字输入框
export { NumberInput } from './NumberInput'

// 通用确认弹窗
export {
  DeleteConfirmModal,
  DeleteWarningModalLegacy1,
  DeleteWarningModalLegacy2,
} from './DeleteConfirmModal'
