// 主题管理器
class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.storageKey = 'searchHackingTheme';
    this.init();
  }

  // 初始化主题管理器
  init() {
    this.loadTheme();
    this.detectSystemTheme();
    this.addEventListeners();
  }

  // 从存储中加载主题设置
  loadTheme() {
    // 优先从Chrome存储中获取
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([this.storageKey], (result) => {
        const savedTheme = result[this.storageKey];
        if (savedTheme) {
          this.setTheme(savedTheme);
        } else {
          // 如果没有保存的主题，检测系统偏好
          this.detectSystemTheme();
        }
      });
    } else {
      // 回退到localStorage
      const savedTheme = localStorage.getItem(this.storageKey);
      if (savedTheme) {
        this.setTheme(savedTheme);
      } else {
        this.detectSystemTheme();
      }
    }
  }

  // 检测系统主题偏好
  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  // 设置主题
  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    
    // 更新主题切换按钮状态
    this.updateToggleButtons();
    
    // 保存主题设置
    this.saveTheme(theme);
    
    // 触发主题变更事件
    this.dispatchThemeChangeEvent(theme);
  }

  // 切换主题
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  // 保存主题设置
  saveTheme(theme) {
    // 优先保存到Chrome存储
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [this.storageKey]: theme });
    } else {
      // 回退到localStorage
      localStorage.setItem(this.storageKey, theme);
    }
  }

  // 更新主题切换按钮状态
  updateToggleButtons() {
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    toggleButtons.forEach(button => {
      if (this.currentTheme === 'dark') {
        button.classList.add('dark');
        button.setAttribute('aria-label', '切换到浅色模式');
        button.setAttribute('title', '切换到浅色模式');
      } else {
        button.classList.remove('dark');
        button.setAttribute('aria-label', '切换到深色模式');
        button.setAttribute('title', '切换到深色模式');
      }
    });
  }

  // 添加事件监听器
  addEventListeners() {
    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener((e) => {
        // 只有在用户没有手动设置主题时才自动切换
        chrome.storage.local.get([this.storageKey], (result) => {
          if (!result[this.storageKey]) {
            this.setTheme(e.matches ? 'dark' : 'light');
          }
        });
      });
    }

    // 为主题切换按钮添加点击事件
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('theme-toggle') || e.target.closest('.theme-toggle')) {
        e.preventDefault();
        this.toggleTheme();
      }
    });

    // 监听键盘快捷键 (Ctrl/Cmd + Shift + D)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  // 触发主题变更事件
  dispatchThemeChangeEvent(theme) {
    const event = new CustomEvent('themeChanged', {
      detail: { theme: theme }
    });
    document.dispatchEvent(event);
  }

  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme;
  }

  // 检查是否为深色模式
  isDarkMode() {
    return this.currentTheme === 'dark';
  }

  // 强制设置主题（不保存到存储）
  forceTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleButtons();
  }

  // 重置主题为系统默认
  resetToSystemTheme() {
    // 清除保存的主题设置
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove([this.storageKey]);
    } else {
      localStorage.removeItem(this.storageKey);
    }
    
    // 重新检测系统主题
    this.detectSystemTheme();
  }

  // 获取主题统计信息
  getThemeStats() {
    return {
      currentTheme: this.currentTheme,
      systemPreference: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      hasUserPreference: this.hasUserPreference()
    };
  }

  // 检查用户是否有主题偏好设置
  hasUserPreference() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([this.storageKey], (result) => {
          resolve(!!result[this.storageKey]);
        });
      });
    } else {
      return !!localStorage.getItem(this.storageKey);
    }
  }
}

// 创建全局主题管理器实例
window.themeManager = new ThemeManager();

// 为了兼容性，也提供一些全局函数
window.toggleTheme = () => window.themeManager.toggleTheme();
window.setTheme = (theme) => window.themeManager.setTheme(theme);
window.getCurrentTheme = () => window.themeManager.getCurrentTheme();
window.isDarkMode = () => window.themeManager.isDarkMode();

// 导出主题管理器类（如果支持模块）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
} 