import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'
/// <reference types="vitest" />

const isProd = process.env.BUILD_MODE === 'prod'
export default defineConfig({
  base: './',
  server: {
    port: 5188,
    strictPort: false,
    // 自动打开浏览器
    open: true,
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    // HMR配置优化
    hmr: {
      // HMR连接超时时间
      timeout: 5000,
      // HMR失败时自动刷新页面
      overlay: true,
    },
    // 启用热模块替换的降级处理
    watch: {
      usePolling: false,
    },
  },
  plugins: [
    react({
      // React插件配置优化
      include: '**/*.tsx',
      babel: {
        plugins: [],
      },
    }),
    sourceIdentifierPlugin({
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 构建优化
  build: {
    // 启用源码映射便于调试
    sourcemap: false,
    // 生产环境压缩代码
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // 按需分割代码，优化首屏加载
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          'vendor-charts': ['recharts'],
          'vendor-office': ['xlsx', 'file-saver', 'docx'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
  // Vitest 测试配置
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/virtual:.*',
      ],
    },
    setupFiles: [],
  },
})
