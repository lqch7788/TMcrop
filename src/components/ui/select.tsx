import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

// Radix Select 不允许 SelectItem 的 value 为空字符串
// 当 value=""时自动映射为 sentinel 值，onValueChange 时反向映射
const ALL_SENTINEL = '__all__';

/** options 模式支持的选项形态（兼容 Antd 风格的 {value,label} 与裸值数组） */
type SelectOption =
  | string
  | number
  | { value: string | number; label: React.ReactNode; disabled?: boolean };

const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
    onChange?: (e: { target: { value: string } } | any) => void;  // 兼容 onChange（HTML 风格 — 2026-06-30 tsc 兼容）
    options?: SelectOption[];                                       // Antd 风格选项数组（2026-09-21 起真正生效）
    placeholder?: string;                                           // options 模式下的占位文案
    triggerClassName?: string;                                      // options 模式下 Trigger 的附加样式
  }
>(({ value, onValueChange, onChange, options, placeholder, triggerClassName, children, ...props }, _ref) => {
  // sentinel ↔ 空串 的双向映射
  const toSentinel = (val: string) => (val === '' ? ALL_SENTINEL : val);
  const fromSentinel = (val: string) => (val === ALL_SENTINEL ? '' : val);

  const handleValueChange = onValueChange
    ? (val: string) => {
        const mapped = fromSentinel(val);
        onValueChange(mapped);
        // 也调用 onChange（HTML 风格 onChange(e) — 兼容旧 API）
        if (onChange) onChange({ target: { value: mapped } });
      }
    : onChange
    ? (val: string) => onChange({ target: { value: fromSentinel(val) } })
    : undefined;

  // 未传 options：保持原有用法（Trigger/Content/Item 由调用方作为 children 提供）
  // 注：Radix 的 Select.Root 是 React.FC（非 forwardRef），不接受 ref，
  //     传 ref 会触发 TS2322 且在运行期被忽略，故不再向下传递。
  if (!options) {
    return (
      <SelectPrimitive.Root
        value={toSentinel(value as string)}
        onValueChange={handleValueChange}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    );
  }

  // 传了 options：自动渲染完整的 Trigger + Content + Item
  // 2026-09-21 修复：此前 options 被解构后直接丢弃，Root 又是自闭合无 children，
  //   导致 <Select options={...}/> 渲染成一个空白下拉（无文案、无选项），
  //   全站 44 处受影响（含创建问题弹窗的温室/作物/严重程度三个必填下拉）。
  const normalized = options.map((opt) => {
    if (opt !== null && typeof opt === 'object') {
      return {
        value: String(opt.value ?? ''),
        label: opt.label,
        disabled: opt.disabled,
      };
    }
    return { value: String(opt ?? ''), label: String(opt ?? ''), disabled: false };
  });

  // options 模式下统一字符串化 value，避免 number 与 Item 的 string value 匹配不上
  const mappedValue =
    value === undefined || value === null
      ? undefined
      : String(value) === ''
      ? ALL_SENTINEL
      : String(value);

  return (
    <SelectPrimitive.Root
      value={mappedValue}
      onValueChange={handleValueChange}
      {...props}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder ?? '请选择'} />
      </SelectTrigger>
      <SelectContent>
        {normalized.map((opt, index) => (
          <SelectItem
            key={`${opt.value}-${index}`}
            value={toSentinel(opt.value)}
            disabled={opt.disabled}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  );
});
Select.displayName = 'Select';

const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, value, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    value={value === '' ? ALL_SENTINEL : value}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-blue-50 focus:text-blue-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
}
