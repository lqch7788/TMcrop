#!/usr/bin/env node
/**
 * P0: 批量修复 UI 库底层路径导入
 *
 * 把所有 `from '@/components/ui/<xxx>'` 或 `from '../ui/<xxx>'` 等底层路径
 * 改为 `from '@/components/ui'` 统一桶导入
 *
 * 例外：
 * - src/components/ui/** 内部互相 import 不动（避免循环导入）
 * - import 路径目标在 ui/index.ts 中未导出的，跳过（如未来新增的组件）
 *
 * 不删除任何文件，不修改业务逻辑，仅替换 import 行。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/TMcrop/yuanxingtu/V1.1/src';

// 1. 递归扫描所有 .ts/.tsx 文件（纯 Node.js 实现，跨平台）
function walk(dir, list = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name).replace(/\\/g, '/');
    // 跳过 ui 目录（UI 库内部允许互相 import）
    if (full.endsWith('/components/ui') || full.includes('/components/ui/')) continue;
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      walk(full, list);
    } else if (/\.(ts|tsx)$/.test(name)) {
      list.push(full);
    }
  }
  return list;
}

function listCandidateFiles() {
  return walk(ROOT);
}

// 2. UI 库的合法 named exports 集合（从 index.ts 反推）
const VALID_EXPORTS = new Set([
  // basic
  'Button', 'buttonVariants',
  'Card', 'CardHeader', 'CardTitle', 'CardContent',
  'Badge',
  'Table', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell',
  'Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter',
  'Input', 'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue',
  'Checkbox', 'Label',
  'Popover', 'PopoverContent', 'PopoverTrigger',
  'DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuSeparator', 'DropdownMenuTrigger',
  // toast / modal
  'ToastContainer', 'useToast',
  'Modal', 'FormField',
  'UnifiedModal',
  // 高级 1
  'DatePicker', 'DateRangePicker',
  'Drawer', 'DrawerHeader', 'DrawerTitle', 'DrawerDescription', 'DrawerContent', 'DrawerFooter', 'DrawerClose',
  'Sheet', 'SheetHeader', 'SheetTitle', 'SheetDescription', 'SheetContent', 'SheetFooter', 'SheetClose',
  'Alert', 'AlertTitle', 'AlertDescription',
  'NotificationProvider', 'useNotification',
  'Breadcrumb', 'BreadcrumbList', 'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbPage', 'BreadcrumbSeparator',
  'Steps', 'StepsStep',
  'Pagination',
  'Skeleton', 'TableSkeleton', 'CardSkeleton', 'ListSkeleton',
  'Progress', 'TextArea',
  'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent',
  // 高级 2
  'Calendar', 'Tree', 'TreeSelect', 'Cascader', 'TimePicker', 'Tooltip',
  'Avatar', 'AvatarGroup', 'AvatarImage', 'AvatarFallback',
  'ImageUploader', 'Statistic', 'EmptyState', 'Divider', 'Space',
  // 高级 3
  'QRCode', 'FilterBar', 'FilterItem', 'KanbanBoard', 'GanttChart',
  // 性能
  'VirtualTable',
  // 通用
  'Timeline', 'LabelResumeTimeline', 'List',
  'NumberInput',
]);

// 3. 替换逻辑：匹配 import 行
// 形如:  import { A, B } from '@/components/ui/xxx';
// 或:    import { A } from '../ui/xxx';
// 或:    import { A, B as C } from '@/components/ui/xxx';
// 不动: import 默认导入 + type-only import 也一并处理（保持 type 前缀）
const IMPORT_RE = /^(?<lead>\s*import\s+(?:type\s+)?\{\s*)(?<names>[^}]+)(?<mid>\s*\}\s+from\s+['"])(?<path>(?:@\/components\/ui|(?:\.{1,2}\/){1,3}ui)\/[^'"]+)(?<tail>['"];?\s*)$/gm;

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;
const skipped = [];

const files = listCandidateFiles();
console.log(`扫描候选文件: ${files.length}`);

for (const file of files) {
  const filePath = file.replace(/^\.\//, '');
  // 排除 UI 库内部
  if (filePath.includes('/components/ui/') || filePath.includes('\\components\\ui\\')) {
    continue;
  }
  totalFiles++;
  let src;
  try {
    src = readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }
  let fileReplacements = 0;
  const newSrc = src.replace(IMPORT_RE, (match, ...args) => {
    const groups = args[args.length - 1];
    const { lead, names, mid, path, tail } = groups;
    // 解析 names，全部必须在 VALID_EXPORTS 中（含 alias 时检查原名）
    const items = names.split(',').map(s => s.trim()).filter(Boolean);
    const allValid = items.every(item => {
      // 处理 "X as Y"
      const original = item.split(/\s+as\s+/)[0].trim();
      return VALID_EXPORTS.has(original);
    });
    if (!allValid) {
      skipped.push(`${filePath}: ${path} (含未导出的名称: ${items.join(',')})`);
      return match;
    }
    fileReplacements++;
    return `${lead}${names}${mid}@/components/ui${tail}`;
  });

  if (fileReplacements > 0) {
    writeFileSync(filePath, newSrc, 'utf8');
    modifiedFiles++;
    totalReplacements += fileReplacements;
  }
}

console.log(`\n=== 完成 ===`);
console.log(`扫描业务文件: ${totalFiles}`);
console.log(`修改文件数: ${modifiedFiles}`);
console.log(`替换 import 行数: ${totalReplacements}`);
console.log(`跳过文件数: ${skipped.length}`);
if (skipped.length > 0 && skipped.length <= 20) {
  console.log('\n跳过详情:');
  skipped.forEach(s => console.log('  - ' + s));
} else if (skipped.length > 20) {
  console.log(`\n跳过示例 (前 10):`);
  skipped.slice(0, 10).forEach(s => console.log('  - ' + s));
}
