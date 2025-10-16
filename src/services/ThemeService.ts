/**
 * 主题管理服务 - 单例模式
 */

import { Theme } from '../types';
import { StorageService } from './StorageService';
import { DEFAULT_THEME } from '../constants/defaults';
import { applyAttributeRecursively } from '../utils/dom';

export class ThemeService {
  private static instance: ThemeService;
  private storageService: StorageService;
  private currentTheme: Theme = DEFAULT_THEME;

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.initTheme();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * 初始化主题
   */
  private async initTheme(): Promise<void> {
    try {
      // 优先从Chrome存储读取
      const savedTheme = await this.storageService.getCurrentTheme();
      if (savedTheme) {
        this.currentTheme = savedTheme;
        return;
      }
      
      // 如果没有保存的主题，检测系统偏好
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.currentTheme = 'dark';
      }
    } catch (error) {
      console.error('初始化主题失败:', error);
    }
  }

  /**
   * 获取当前主题
   */
  public async getCurrentTheme(): Promise<Theme> {
    const savedTheme = await this.storageService.getCurrentTheme();
    if (savedTheme) {
      this.currentTheme = savedTheme;
      return savedTheme;
    }
    
    // 检测系统偏好
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return this.currentTheme;
  }

  /**
   * 应用主题到元素
   */
  public applyTheme(element: HTMLElement, theme: Theme, silent: boolean = false): void {
    if (!silent) {
      console.log('[主题服务] 应用主题:', theme);
    }
    element.setAttribute('data-theme', theme);
    applyAttributeRecursively(element, 'data-theme', theme);
  }

  /**
   * 设置主题监听器
   */
  public setupThemeListener(element: HTMLElement, logPrefix: string = '[主题服务]'): void {
    // 检查是否已经设置过监听器，避免重复绑定
    if (element.dataset.themeListenerSet === 'true') {
      console.log(`${logPrefix} 已设置过主题监听器，跳过重复绑定`);
      return;
    }
    
    console.log(`${logPrefix} 设置主题监听器`);
    element.dataset.themeListenerSet = 'true';
    
    // 监听Chrome存储变化
    const storageChangeHandler = (changes: any) => {
      if (changes.currentTheme) {
        const newTheme = changes.currentTheme.newValue as Theme;
        if (newTheme && document.contains(element)) {
          console.log(`${logPrefix} 检测到主题变化:`, newTheme);
          this.applyTheme(element, newTheme, true); // silent模式，避免日志循环
        }
      }
    };
    this.storageService.onChanged(storageChangeHandler);

    // 监听localStorage变化（跨标签页同步）
    const localStorageHandler = (e: StorageEvent) => {
      if (e.key === 'currentTheme' && e.newValue && document.contains(element)) {
        console.log(`${logPrefix} 检测到localStorage主题变化:`, e.newValue);
        this.applyTheme(element, e.newValue as Theme, true); // silent模式
      }
    };
    window.addEventListener('storage', localStorageHandler);

    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = async (e: MediaQueryListEvent | MediaQueryList) => {
        try {
          if (!document.contains(element)) {
            return; // 元素已被移除，不处理
          }
          
          const userHasPreference = await this.storageService.getUserHasPreference();
          
          if (!userHasPreference) {
            const newTheme: Theme = ('matches' in e ? e.matches : false) ? 'dark' : 'light';
            console.log(`${logPrefix} 跟随系统主题变化为:`, newTheme);
            this.applyTheme(element, newTheme, true); // silent模式
          }
        } catch (error) {
          console.error(`${logPrefix} 处理系统主题变化失败:`, error);
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        // 兼容旧版API
        mediaQuery.addListener(handleSystemThemeChange as any);
      }
    }
  }
}

