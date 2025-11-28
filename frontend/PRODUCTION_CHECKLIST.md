# 生产环境部署检查清单

确保本地优化效果在生产环境保持一致。

## 📋 构建前检查

### 1. 环境变量配置
- [ ] 检查 `.env.production` 文件是否存在
- [ ] 确认 `VITE_API_BASE_URL` 配置正确（生产环境应使用相对路径 `/api`）
- [ ] 确认没有开发环境的调试代码残留

### 2. 代码检查
- [ ] 确认所有 `console.log` 已移除（构建时会自动移除）
- [ ] 确认没有 `process.env.NODE_ENV === 'development'` 的调试代码
- [ ] 确认所有懒加载组件已正确使用 `React.lazy()`

## 🔨 构建步骤

### 1. 清理旧构建
```bash
cd frontend
rm -rf dist node_modules/.vite
```

### 2. 安装依赖（确保使用最新版本）
```bash
npm ci  # 使用 ci 而不是 install，确保依赖版本一致
```

### 3. 生产环境构建
```bash
# 设置生产环境变量
export NODE_ENV=production

# 构建
npm run build
```

### 4. 验证构建结果
```bash
# 检查构建输出
ls -la dist/
ls -la dist/assets/

# 检查文件大小（应该看到代码分割后的多个文件）
du -sh dist/assets/js/*

# 检查是否有 source map（生产环境应该没有）
find dist -name "*.map" | wc -l  # 应该返回 0
```

## ✅ 构建后验证

### 1. 文件检查
- [ ] `dist/index.html` 存在
- [ ] `dist/assets/` 目录包含 JS、CSS 文件
- [ ] 文件已压缩（文件大小应该比开发环境小很多）
- [ ] 没有 `.map` 文件（生产环境）

### 2. 性能检查
- [ ] 主 bundle 大小 < 500KB（gzipped）
- [ ] 代码已分割成多个 chunk
- [ ] CSS 已提取并压缩

### 3. 功能测试（使用 `npm run preview`）
```bash
# 本地预览生产构建
npm run preview

# 访问 http://localhost:4173 测试
```

测试项：
- [ ] 页面正常加载
- [ ] 路由跳转正常
- [ ] API 请求正常
- [ ] 侧边栏加载正常（使用缓存）
- [ ] PDF 缩略图正常显示
- [ ] 分享按钮正常显示

## 🚀 部署检查

### 1. Nginx 配置
- [ ] 静态文件缓存配置正确
- [ ] Gzip 压缩已启用
- [ ] 正确的 MIME 类型配置

### 2. 服务器检查
- [ ] 文件权限正确（nginx 用户可读）
- [ ] 磁盘空间充足
- [ ] 服务器资源充足（内存、CPU）

### 3. 性能监控
部署后检查：
- [ ] 首次加载时间 < 3秒
- [ ] 页面切换流畅
- [ ] 侧边栏缓存生效
- [ ] 没有控制台错误

## 🔍 性能对比

### 本地开发环境
- 开发服务器：Vite dev server
- 热更新：启用
- 代码分割：部分启用
- 压缩：未启用

### 生产环境（构建后）
- 静态文件：Nginx 直接提供
- 代码分割：完全启用
- 压缩：启用（terser + gzip）
- 缓存：浏览器缓存 + sessionStorage

## 📊 预期性能指标

### 首次加载
- HTML: < 50KB
- JS (主 bundle): < 200KB (gzipped)
- CSS: < 50KB (gzipped)
- 总加载时间: < 2秒（良好网络）

### 后续加载（使用缓存）
- 侧边栏：< 100ms（从 sessionStorage）
- 页面切换：< 500ms
- PDF 缩略图：< 1秒（首次），< 100ms（缓存）

## 🐛 常见问题

### 问题1：生产环境加载慢
**检查：**
- Nginx gzip 是否启用
- 静态文件缓存是否正确
- 服务器资源是否充足

### 问题2：功能不正常
**检查：**
- API 基础 URL 是否正确
- CORS 配置是否正确
- 浏览器控制台错误

### 问题3：缓存不生效
**检查：**
- sessionStorage 是否可用
- 缓存逻辑是否正确
- 浏览器是否禁用 localStorage/sessionStorage

## 📝 部署命令总结

```bash
# 1. 进入前端目录
cd frontend

# 2. 清理
rm -rf dist node_modules/.vite

# 3. 安装依赖
npm ci

# 4. 构建
NODE_ENV=production npm run build

# 5. 验证
npm run preview

# 6. 部署（将 dist 目录内容复制到服务器）
# scp -r dist/* user@server:/var/www/sw_project/frontend/dist/
```

## ✅ 最终检查清单

部署前最后确认：
- [ ] 构建成功无错误
- [ ] 预览测试通过
- [ ] 文件已上传到服务器
- [ ] Nginx 配置已更新
- [ ] 服务已重启
- [ ] 生产环境测试通过

