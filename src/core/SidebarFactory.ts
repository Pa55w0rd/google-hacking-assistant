/**
 * 侧边栏工厂
 * 根据搜索引擎类型创建对应的侧边栏管理器
 */

import { SearchEngine } from '../types';
import { SidebarManager } from './SidebarManager';
import { GoogleAdapter } from '../content/adapters/GoogleAdapter';
import { BaiduAdapter } from '../content/adapters/BaiduAdapter';
import { BingAdapter } from '../content/adapters/BingAdapter';

export class SidebarFactory {
  /**
   * 检测当前页面是哪个搜索引擎
   */
  public static detectSearchEngine(): SearchEngine | null {
    const hostname = location.hostname;
    
    if (hostname.includes('google.com') || 
        hostname.includes('google.') ||
        hostname === 'www.google' ||
        hostname.endsWith('.google')) {
      return 'google';
    }
    
    if (hostname.includes('baidu.com')) {
      return 'baidu';
    }
    
    if (hostname.includes('bing.com') || 
        hostname.includes('bing.cn') ||
        hostname.includes('bing.')) {
      return 'bing';
    }
    
    return null;
  }

  /**
   * 创建侧边栏管理器
   */
  public static create(engine?: SearchEngine): SidebarManager | null {
    const targetEngine = engine || this.detectSearchEngine();
    
    if (!targetEngine) {
      console.warn('[工厂] 无法检测搜索引擎类型');
      return null;
    }
    
    console.log('[工厂] 创建侧边栏管理器:', targetEngine);
    
    switch (targetEngine) {
      case 'google':
        return new GoogleAdapter();
      case 'baidu':
        return new BaiduAdapter();
      case 'bing':
        return new BingAdapter();
      default:
        console.error('[工厂] 未知的搜索引擎:', targetEngine);
        return null;
    }
  }
}

