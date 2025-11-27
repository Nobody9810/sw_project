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
      // 注意：移除了 /static 代理，因为静态文件现在在 public/static/ 目录中
      // 如果需要从后端获取某些静态文件，可以使用更具体的路径，例如：
      // '/static/admin': {
      //   target: 'http://localhost:8000',
      //   changeOrigin: true,
      // }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

