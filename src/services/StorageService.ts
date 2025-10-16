/**
 * Chrome Storage服务 - 单例模式
 */

import { AppSettings, ChromeStorageData } from '../types/settings';
import { SyntaxLibrary } from '../types/syntax';

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * 安全地获取Chrome Storage数据
   */
  public async get<K extends keyof ChromeStorageData>(
    key: K
  ): Promise<ChromeStorageData[K] | undefined> {
    return new Promise((resolve) => {
      try {
        // 检查chrome API是否可用
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime) {
          console.warn('Chrome API不可用');
          resolve(undefined);
          return;
        }
        
        // 检查扩展是否有效
        if (chrome.runtime.lastError || !chrome.runtime.id) {
          console.warn('扩展上下文已失效');
          resolve(undefined);
          return;
        }
        
        // 获取存储数据
        chrome.storage.local.get(key, (result) => {
          if (chrome.runtime.lastError) {
            console.error('获取存储数据出错:', chrome.runtime.lastError);
            resolve(undefined);
          } else {
            resolve(result[key]);
          }
        });
      } catch (error) {
        console.error('访问Chrome存储API时出错:', error);
        resolve(undefined);
      }
    });
  }

  /**
   * 获取应用设置
   */
  public async getSettings(): Promise<AppSettings | undefined> {
    return this.get('searchHackingSettings');
  }

  /**
   * 获取语法库
   */
  public async getSyntaxLibrary(): Promise<SyntaxLibrary | undefined> {
    return this.get('syntaxLibrary');
  }

  /**
   * 获取主题设置
   */
  public async getCurrentTheme(): Promise<'light' | 'dark' | undefined> {
    return this.get('currentTheme');
  }

  /**
   * 获取用户主题偏好设置
   */
  public async getUserHasPreference(): Promise<boolean | undefined> {
    return this.get('userHasPreference');
  }

  /**
   * 保存数据到Chrome Storage
   */
  public async set(data: Partial<ChromeStorageData>): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.storage) {
          resolve(false);
          return;
        }
        
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            console.error('保存数据出错:', chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.error('保存数据时出错:', error);
        resolve(false);
      }
    });
  }

  /**
   * 监听存储变化
   */
  public onChanged(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
  ): void {
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
          callback(changes);
        }
      });
    }
  }
}

