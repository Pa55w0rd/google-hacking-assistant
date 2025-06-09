// 防止重复声明ThemeManager类
if (typeof window.ThemeManager !== 'undefined') {
  console.log('ThemeManager已存在，跳过重复声明');
} else {
  // 主题管理器
  class ThemeManager {
    constructor() {
      this.currentTheme = 'light';
      this.storageKey = 'searchHackingTheme';
      this.isFirstTime = false;
      this.init();
    }

    // 初始化主题管理器
    async init() {
      await this.loadTheme();
      this.addEventListeners();
    }

    // 加载主题
    async loadTheme() {
      try {
        let savedTheme = null;
        let userHasPreference = false;

        // 优先从Chrome存储读取
        if (chrome && chrome.storage && chrome.storage.local) {
          try {
            const result = await new Promise((resolve) => {
              chrome.storage.local.get(['currentTheme', 'userHasPreference'], resolve);
            });
            savedTheme = result.currentTheme;
            userHasPreference = result.userHasPreference;
            console.log('从Chrome存储读取主题:', savedTheme, '用户偏好:', userHasPreference);
          } catch (error) {
            console.warn('Chrome存储读取失败，回退到localStorage:', error);
          }
        }

        // 如果Chrome存储失败，回退到localStorage
        if (!savedTheme) {
          savedTheme = localStorage.getItem('currentTheme');
          userHasPreference = localStorage.getItem('userHasPreference') === 'true';
          console.log('从localStorage读取主题:', savedTheme, '用户偏好:', userHasPreference);
        }

        // 如果有保存的主题，使用它
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          this.setTheme(savedTheme);
          return;
        }

        // 如果是首次安装或没有用户偏好，检测系统主题
        if (!userHasPreference) {
          const systemTheme = this.detectSystemTheme();
          console.log('首次安装，检测到系统主题:', systemTheme);
          this.setTheme(systemTheme);
          
          // 标记为首次安装完成
          if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ 
              isFirstInstall: false,
              userHasPreference: true 
            });
          } else {
            localStorage.setItem('isFirstInstall', 'false');
            localStorage.setItem('userHasPreference', 'true');
          }
        } else {
          // 有用户偏好但没有有效主题，使用默认浅色主题
          this.setTheme('light');
        }
      } catch (error) {
        console.error('加载主题失败:', error);
        // 出错时使用默认主题
        this.setTheme('light');
      }
    }

    // 检测系统主题偏好
    detectSystemTheme() {
      try {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        } else {
          return 'light';
        }
      } catch (error) {
        console.error('系统主题检测失败:', error);
        return 'light'; // 默认返回浅色主题
      }
    }

    // 设置主题
    setTheme(theme) {
      console.log('设置主题为:', theme);
      this.currentTheme = theme;
      
      // 应用主题到DOM
      document.documentElement.setAttribute('data-theme', theme);
      
      // 保存主题设置
      this.saveTheme(theme);
      
      // 立即更新按钮状态
      this.updateToggleButtons();
      
      // 触发主题变更事件
      this.dispatchThemeChangeEvent(theme);
    }

    // 切换主题
    toggleTheme() {
      const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
      
      // 只在options页面显示通知
      if (window.location.pathname.includes('options.html') && typeof showNotification === 'function') {
        const icon = newTheme === 'dark' ? '🌙' : '☀️';
        const text = newTheme === 'dark' ? '已切换到深色模式' : '已切换到浅色模式';
        showNotification(`${icon} ${text}`, 'success');
      }
    }

    // 保存主题设置
    saveTheme(theme) {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ 
            currentTheme: theme,
            userHasPreference: true,
            lastThemeChange: Date.now() // 添加时间戳用于同步
          });
        } else {
          localStorage.setItem('currentTheme', theme);
          localStorage.setItem('userHasPreference', 'true');
          localStorage.setItem('lastThemeChange', Date.now().toString());
        }
      } catch (error) {
        console.error('保存主题设置失败:', error);
        // 回退到localStorage
        localStorage.setItem('currentTheme', theme);
        localStorage.setItem('userHasPreference', 'true');
        localStorage.setItem('lastThemeChange', Date.now().toString());
      }
    }

    // 更新主题切换按钮状态
    updateToggleButtons() {
      const toggleButtons = document.querySelectorAll('.theme-toggle');
      console.log('更新主题切换按钮状态，当前主题:', this.currentTheme, '找到按钮数量:', toggleButtons.length);
      
      toggleButtons.forEach(button => {
        if (this.currentTheme === 'dark') {
          button.classList.add('dark');
          button.setAttribute('aria-label', '切换到浅色模式');
          button.setAttribute('title', '切换到浅色模式');
          // 更新按钮文本内容
          const buttonText = button.querySelector('span:not(.moon-icon)');
          if (buttonText) {
            buttonText.textContent = '切换到浅色模式';
          } else {
            // 如果没有文本span，创建一个
            const textSpan = document.createElement('span');
            textSpan.textContent = '切换到浅色模式';
            textSpan.style.display = 'none'; // 隐藏文本，只用于屏幕阅读器
            button.appendChild(textSpan);
          }
        } else {
          button.classList.remove('dark');
          button.setAttribute('aria-label', '切换到深色模式');
          button.setAttribute('title', '切换到深色模式');
          // 更新按钮文本内容
          const buttonText = button.querySelector('span:not(.moon-icon)');
          if (buttonText) {
            buttonText.textContent = '切换到深色模式';
          } else {
            // 如果没有文本span，创建一个
            const textSpan = document.createElement('span');
            textSpan.textContent = '切换到深色模式';
            textSpan.style.display = 'none'; // 隐藏文本，只用于屏幕阅读器
            button.appendChild(textSpan);
          }
        }
      });
    }

    // 添加事件监听器
    addEventListeners() {
      // 监听系统主题变化
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // 使用现代API
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', (e) => {
            this.handleSystemThemeChange(e);
          });
        } else {
          // 兼容旧版本
          mediaQuery.addListener((e) => {
            this.handleSystemThemeChange(e);
          });
        }
      }

      // 监听Chrome存储变化（跨页面同步）
      if (chrome && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local' && changes.currentTheme) {
            const newTheme = changes.currentTheme.newValue;
            if (newTheme && newTheme !== this.currentTheme) {
              console.log('检测到其他页面的主题变化:', newTheme);
              this.currentTheme = newTheme;
              document.documentElement.setAttribute('data-theme', newTheme);
              this.updateToggleButtons();
              this.dispatchThemeChangeEvent(newTheme);
            }
          }
        });
      }

      // 监听localStorage变化（跨标签页同步）
      window.addEventListener('storage', (e) => {
        if (e.key === 'currentTheme' && e.newValue && e.newValue !== this.currentTheme) {
          console.log('检测到localStorage主题变化:', e.newValue);
          this.currentTheme = e.newValue;
          document.documentElement.setAttribute('data-theme', e.newValue);
          this.updateToggleButtons();
          this.dispatchThemeChangeEvent(e.newValue);
        }
      });

      // 为主题切换按钮添加点击事件 - 使用更可靠的方式
      const bindThemeToggleEvents = () => {
        const toggleButtons = document.querySelectorAll('.theme-toggle');
        console.log('绑定主题切换按钮事件，找到按钮数量:', toggleButtons.length);
        
        toggleButtons.forEach(button => {
          // 移除可能存在的旧事件监听器
          button.removeEventListener('click', this.handleThemeToggleClick);
          // 添加新的事件监听器
          button.addEventListener('click', this.handleThemeToggleClick.bind(this));
        });
      };

      // 立即绑定现有按钮
      bindThemeToggleEvents();

      // 使用MutationObserver监听DOM变化，自动绑定新添加的按钮
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList && node.classList.contains('theme-toggle')) {
                  console.log('检测到新的主题切换按钮，绑定事件');
                  node.addEventListener('click', this.handleThemeToggleClick.bind(this));
                }
                // 检查子元素
                const childButtons = node.querySelectorAll && node.querySelectorAll('.theme-toggle');
                if (childButtons && childButtons.length > 0) {
                  console.log('检测到新的主题切换按钮（子元素），绑定事件');
                  childButtons.forEach(btn => {
                    btn.addEventListener('click', this.handleThemeToggleClick.bind(this));
                  });
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 监听键盘快捷键 (Ctrl/Cmd + Shift + D)
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          this.toggleTheme();
        }
      });

      // DOM加载完成后更新按钮状态
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.updateToggleButtons();
          bindThemeToggleEvents();
        });
      } else {
        this.updateToggleButtons();
      }
    }

    // 主题切换按钮点击处理函数
    handleThemeToggleClick(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('主题切换按钮被点击');
      this.toggleTheme();
    }

    // 处理系统主题变化
    async handleSystemThemeChange(e) {
      try {
        // 检查用户是否有手动设置的主题偏好
        const hasUserPreference = await this.hasUserPreference();
        
        if (!hasUserPreference) {
          // 用户没有手动设置过主题，跟随系统变化
          this.setTheme(e.matches ? 'dark' : 'light');
          console.log('Search Hacking Assistant: 跟随系统主题变化为', e.matches ? '深色' : '浅色', '模式');
        }
      } catch (error) {
        console.error('处理系统主题变化失败:', error);
      }
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
    async hasUserPreference() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], resolve);
          });
          return !!result[this.storageKey];
        } else {
          return !!localStorage.getItem(this.storageKey);
        }
      } catch (error) {
        console.error('检查用户偏好失败:', error);
        return false;
      }
    }

    // 获取详细的主题信息
    async getThemeInfo() {
      const systemPreference = this.detectSystemTheme();
      const hasUserPreference = await this.hasUserPreference();
      
      return {
        currentTheme: this.currentTheme,
        systemPreference: systemPreference,
        hasUserPreference: hasUserPreference,
        isFirstTime: this.isFirstTime,
        supportsSystemDetection: !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)'))
      };
    }
  }

  // 将ThemeManager类添加到window对象，防止重复声明
  window.ThemeManager = ThemeManager;

  // 创建全局主题管理器实例（只在不存在时创建）
  if (!window.themeManager) {
    window.themeManager = new ThemeManager();
  }

  // 为了兼容性，也提供一些全局函数
  window.toggleTheme = () => window.themeManager.toggleTheme();
  window.setTheme = (theme) => window.themeManager.setTheme(theme);
  window.getCurrentTheme = () => window.themeManager.getCurrentTheme();
  window.isDarkMode = () => window.themeManager.isDarkMode();

  // 导出主题管理器类（如果支持模块）
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
  }
} 