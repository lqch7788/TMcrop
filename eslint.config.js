import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'temp_backup/**',
      'node_modules/**',
      'server/node_modules/**',
      'server/src/db/**',
      'server/coverage/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
      // 禁用这些风格检查（不影响功能）
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-case-declarations': 'off',
      'no-empty': 'warn',
      // 禁用 prefer-const 检查（解构赋值常用 let）
      'prefer-const': 'off',
      // UI 库导入统一性 — 强制走 barrel 文件 @/components/ui，禁止直接导入底层组件路径
      // 例外：src/components/ui/** 内部允许互相 import（通过下面 files 覆盖关闭此规则）
      'no-restricted-imports': ['warn', {
        patterns: [
          '**/components/ui/*',
          '**/ui/button', '**/ui/Modal', '**/ui/UnifiedModal', '**/ui/Dialog', '**/ui/dialog',
          '**/ui/Drawer', '**/ui/Sheet', '**/ui/table', '**/ui/input', '**/ui/select',
          '**/ui/checkbox', '**/ui/card', '**/ui/badge', '**/ui/Toast', '**/ui/Notification',
          '**/ui/popover', '**/ui/dropdown-menu', '**/ui/DatePicker', '**/ui/DateRangePicker',
          '**/ui/TextArea', '**/ui/tabs', '**/ui/Tooltip', '**/ui/Avatar', '**/ui/Tree',
          '**/ui/TreeSelect', '**/ui/Cascader', '**/ui/TimePicker', '**/ui/FilterBar',
          '**/ui/Pagination', '**/ui/Skeleton', '**/ui/Progress', '**/ui/Statistic',
          '**/ui/EmptyState', '**/ui/Calendar', '**/ui/Steps', '**/ui/Breadcrumb',
          '**/ui/Alert', '**/ui/Divider', '**/ui/Space', '**/ui/QRCode', '**/ui/ImageUploader',
          '**/ui/KanbanBoard', '**/ui/GanttChart', '**/ui/VirtualTable', '**/ui/Timeline',
          '**/ui/LabelResumeTimeline', '**/ui/List', '**/ui/NumberInput', '**/ui/label',
          '**/ui/DetailModal',
        ],
      }],
    },
  },
  {
    // UI 库自身内部互相 import 不受 no-restricted-imports 限制
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
)
