# Logo 图片文件说明

此目录需要包含以下 logo 图片文件：

1. **logo_black.png** - 黑色/深色 logo（用于浅色主题）
   - 在 TopSearchBar 下方的 logo-container 中使用
   - 在浅色主题下显示

2. **logo_white.png** - 白色/浅色 logo（用于深色主题）
   - 在 TopSearchBar 下方的 logo-container 中使用
   - 在 Footer 中使用
   - 在深色主题下显示

3. **logo-icon-white.png** - 网站图标（favicon）
   - 在 index.html 中作为网站图标使用

## 使用位置

- `frontend/src/components/Layout.jsx` - TopSearchBar 下方的 logo
- `frontend/src/components/Footer.jsx` - Footer 中的 logo
- `frontend/src/components/Navbar.jsx` - 移动端导航栏中的 logo
- `frontend/index.html` - 网站图标

## 建议尺寸

- logo_black.png 和 logo_white.png: 建议高度 100px，宽度自适应
- logo-icon-white.png: 建议 32x32 或 64x64 像素

请将相应的 logo 图片文件放置在此目录中。

