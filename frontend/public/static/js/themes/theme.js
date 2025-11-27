// 主题变化事件名称常量
const THEME_CHANGE_EVENT = 'themeChange';

// 辅助函数：设置主题
function setTheme(theme, dispatchEvent = true) {
    console.log('Setting theme to:', theme);
    
    // 保存主题设置到localStorage
    localStorage.setItem('theme', theme);
    
    // 设置主题属性
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.body.setAttribute('data-bs-theme', theme);
    
    // 更新 HTML 元素类（Tailwind dark mode 需要）
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    // 更新 body 类（现有 CSS 需要）
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    
    // 更新图标
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = `bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`;
    }

    // 更新 Logo
    const logoLight = document.querySelector('.logo-light');
    const logoDark = document.querySelector('.logo-dark');
    if (logoLight && logoDark) {
        if (theme === 'dark') {
            logoLight.style.display = 'none';
            logoDark.style.display = 'inline-block';
        } else {
            logoLight.style.display = 'inline-block';
            logoDark.style.display = 'none';
        }
    }

    // 触发主题变化事件
    if (dispatchEvent) {
        const event = new CustomEvent(THEME_CHANGE_EVENT, { 
            detail: { theme: theme }
        });
        document.dispatchEvent(event);
    }
}

// 主题切换函数
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// 立即初始化主题（避免闪烁）
(function initThemeImmediately() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    document.body.setAttribute('data-bs-theme', savedTheme);
    
    // 设置 Tailwind dark mode 类
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    document.body.classList.add(`${savedTheme}-theme`);
})();

// 页面加载时完整初始化主题
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme, false);
});

// 导出主题相关方法供其他模块使用
window.themeUtils = {
    toggleTheme,
    setTheme,
    getCurrentTheme: () => document.documentElement.getAttribute('data-bs-theme') || 'light',
    onThemeChange: (callback) => {
        document.addEventListener(THEME_CHANGE_EVENT, (e) => callback(e.detail.theme));
    }
};

// 调试信息
console.log('Theme.js loaded, themeUtils available:', !!window.themeUtils);