# Footer 抖动问题排查指南

## 1. 使用浏览器开发者工具检查

### 步骤1：打开开发者工具
- 按 `F12` 或 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- 切换到 **Elements** 或 **检查器** 标签

### 步骤2：检查 Footer 元素
1. 找到 `<footer id="footer">` 元素
2. 在右侧样式面板中，检查：
   - `position` 应该是 `relative`
   - `flex-shrink` 应该是 `0`
   - `flex-grow` 应该是 `0`
   - `min-height` 应该是 `200px`
   - `transform` 应该是 `translateZ(0)`

### 步骤3：检查被覆盖的样式
- 查看样式面板中被划掉的样式（灰色），这些是被覆盖的
- 检查是否有其他CSS规则覆盖了我们的样式
- 注意 `!important` 标记的样式

### 步骤4：检查 Layout 容器
1. 找到 `#root > div`（Layout容器）
2. 检查：
   - `display` 应该是 `flex`
   - `flex-direction` 应该是 `column`
   - `min-height` 应该是 `100vh`

3. 找到 `<main>` 元素
   - `min-height` 应该是 `calc(100vh - 400px)`
   - `flex` 应该是 `1 0 auto`

## 2. 检查渲染时机

### 步骤1：使用 Performance 面板
1. 打开 **Performance** 或 **性能** 标签
2. 点击录制按钮
3. 刷新页面或切换路由
4. 停止录制
5. 查看：
   - 是否有大量的重排（reflow）和重绘（repaint）
   - Footer 元素何时被渲染
   - 布局何时发生变化

### 步骤2：使用 React DevTools
1. 安装 React DevTools 浏览器扩展
2. 打开 React DevTools
3. 找到 `Footer` 组件
4. 检查：
   - 组件何时挂载
   - 是否有不必要的重新渲染
   - Props 是否变化

## 3. 检查 CSS 加载顺序

### 步骤1：查看 Network 面板
1. 打开 **Network** 或 **网络** 标签
2. 刷新页面
3. 筛选 CSS 文件
4. 检查：
   - `footer.css` 何时加载
   - `App.css` 何时加载
   - `index.css` 何时加载
   - 是否有CSS文件加载失败

### 步骤2：检查样式优先级
在 Console 中运行：
```javascript
// 检查footer的所有样式
const footer = document.getElementById('footer');
console.log('Computed styles:', window.getComputedStyle(footer));
console.log('Position:', window.getComputedStyle(footer).position);
console.log('Flex shrink:', window.getComputedStyle(footer).flexShrink);
console.log('Min height:', window.getComputedStyle(footer).minHeight);
```

## 4. 检查 JavaScript 干扰

### 步骤1：检查是否有脚本操作 Footer
在 Console 中运行：
```javascript
// 监听footer的样式变化
const footer = document.getElementById('footer');
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
      console.log('Footer style changed:', footer.style.cssText);
      console.trace('Stack trace:');
    }
  });
});
observer.observe(footer, { attributes: true, attributeFilter: ['style'] });
```

### 步骤2：检查事件监听器
在 Console 中运行：
```javascript
// 检查是否有scroll事件影响布局
let scrollCount = 0;
const originalScrollTo = window.scrollTo;
window.scrollTo = function(...args) {
  scrollCount++;
  console.log(`scrollTo called ${scrollCount} times:`, args);
  console.trace();
  return originalScrollTo.apply(this, args);
};
```

## 5. 检查布局计算

### 步骤1：检查页面高度
在 Console 中运行：
```javascript
// 检查各个元素的高度
console.log('Window height:', window.innerHeight);
console.log('Document height:', document.documentElement.scrollHeight);
console.log('Body height:', document.body.scrollHeight);
console.log('Root height:', document.getElementById('root').offsetHeight);
console.log('Layout height:', document.querySelector('#root > div').offsetHeight);
console.log('Main height:', document.querySelector('main').offsetHeight);
console.log('Footer height:', document.getElementById('footer').offsetHeight);
console.log('Footer offsetTop:', document.getElementById('footer').offsetTop);
```

### 步骤2：检查 Flex 布局
在 Console 中运行：
```javascript
const layout = document.querySelector('#root > div');
const main = document.querySelector('main');
const footer = document.getElementById('footer');

console.log('Layout flex:', window.getComputedStyle(layout).display);
console.log('Main flex:', window.getComputedStyle(main).flex);
console.log('Footer flex-shrink:', window.getComputedStyle(footer).flexShrink);
console.log('Footer flex-grow:', window.getComputedStyle(footer).flexGrow);
```

## 6. 实时监控

### 添加调试代码
在 `Footer.jsx` 中添加：
```javascript
useEffect(() => {
  const footer = document.getElementById('footer');
  const checkLayout = () => {
    const rect = footer.getBoundingClientRect();
    console.log('Footer position:', {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      windowHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight
    });
  };
  
  checkLayout();
  window.addEventListener('resize', checkLayout);
  const interval = setInterval(checkLayout, 100);
  
  return () => {
    window.removeEventListener('resize', checkLayout);
    clearInterval(interval);
  };
}, []);
```

## 7. 常见问题检查清单

- [ ] CSS文件是否正确加载？
- [ ] 是否有其他CSS覆盖了footer样式？
- [ ] React组件是否在正确的时机渲染？
- [ ] 是否有JavaScript在操作footer的样式？
- [ ] 浏览器缓存是否已清除？（Ctrl+Shift+R 硬刷新）
- [ ] 是否有浏览器扩展干扰？（尝试无痕模式）
- [ ] 是否在移动设备上测试？（可能是响应式问题）

## 8. 快速测试

在 Console 中运行以下代码，强制设置footer样式：
```javascript
const footer = document.getElementById('footer');
footer.style.cssText = `
  position: relative !important;
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
  width: 100% !important;
  min-height: 200px !important;
  transform: translateZ(0) !important;
  backface-visibility: hidden !important;
`;
```

如果这样设置后footer不再抖动，说明是CSS优先级或加载顺序的问题。

