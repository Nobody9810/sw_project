import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['antd', '@ant-design/icons'],
  },
  server: {
    port: 5173,
    proxy: {
      // 代理后端的静态文件（unfold 管理界面需要）
      // 注意：这些路径需要放在前面，以确保优先级
      '/static/django_ckeditor_5': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/static/unfold': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/static/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/comment': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/interactions': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // CKEditor5 上传接口代理
      '/ckeditor5': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 注意：前端的静态文件在 public/static/ 目录中，不需要代理
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 生产环境优化配置
    // 使用 esbuild 进行压缩（更快，无需额外安装，压缩率稍低但足够好）
    minify: 'esbuild',
    // 代码分割优化
    rollupOptions: {
      output: {
        // 手动代码分割，优化加载性能
        manualChunks: {
          // 将 React 相关库单独打包
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将 UI 库单独打包
          'ui-vendor': ['antd', '@ant-design/icons', 'lucide-react'],
          // 将其他第三方库打包
          'utils-vendor': ['axios', 'react-share'],
        },
        // 优化 chunk 文件名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name]-[hash][extname]`
          }
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[ext]/[name]-[hash][extname]`
        },
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 生成 source map（生产环境可以关闭以提高安全性）
    sourcemap: false,
    // 提高构建性能
    chunkSizeWarningLimit: 1000, // 调整 chunk 大小警告阈值
    // 启用压缩
    reportCompressedSize: true,
  },
})

