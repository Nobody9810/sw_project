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
    assetsDir: 'assets'
  }
})

