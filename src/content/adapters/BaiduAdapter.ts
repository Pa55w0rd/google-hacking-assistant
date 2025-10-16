/**
 * 百度搜索引擎适配器
 */

import { SearchEngine } from '../../types';
import { SidebarManager } from '../../core/SidebarManager';
import { BAIDU_SELECTORS } from '../../constants/selectors';

export class BaiduAdapter extends SidebarManager {
  getSearchEngine(): SearchEngine {
    return 'baidu';
  }

  extractTargetDomain(): string {
    const url = new URL(window.location.href);
    const query = url.searchParams.get('wd') || url.searchParams.get('word') || '';
    
    const siteMatch = query.match(/site:([^\s]+)/i);
    return siteMatch ? siteMatch[1].replace(/^https?:\/\//, '') : '';
  }

  isSearchPage(): boolean {
    const hostname = location.hostname;
    if (!hostname.includes('baidu.com')) {
      return false;
    }
    
    const pathname = location.pathname;
    return pathname === '/s' || pathname === '/baidu' || pathname.includes('/s');
  }

  buildSearchUrl(query: string): string {
    return `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
  }

  getUrlSelectors(): string[] {
    return BAIDU_SELECTORS.SEARCH_RESULTS;
  }

  getExcludedContainers(): string[] {
    return BAIDU_SELECTORS.EXCLUDED_CONTAINERS;
  }

  /**
   * 百度不需要特殊的观察器处理
   * 百度的翻页和搜索都会完全重新加载页面，由父类的URL观察器处理即可
   */
  public setupObservers(): void {
    // 只调用父类的观察器设置
    super.setupObservers();
    console.log('[百度侧边栏] 使用默认观察器');
  }

  injectToPage(sidebar: HTMLElement): void {
    const container = document.querySelector(BAIDU_SELECTORS.CONTAINER);
    const wrapper = document.querySelector(BAIDU_SELECTORS.WRAPPER);
    
    if (!container && !wrapper) {
      console.error('[百度] 无法找到容器');
      this.fallbackInject(sidebar);
      return;
    }
    
    // 查找或创建右侧栏
    let rightColumn = document.querySelector(BAIDU_SELECTORS.CONTENT_RIGHT) as HTMLElement;
    
    if (!rightColumn) {
      rightColumn = document.createElement('div');
      rightColumn.id = 'content_right';
      rightColumn.style.float = 'right';
      rightColumn.style.width = '320px';
      rightColumn.style.marginLeft = '20px';
      
      const targetContainer = container || wrapper;
      if (targetContainer) {
        targetContainer.appendChild(rightColumn);
      }
    }
    
    if (rightColumn) {
      rightColumn.insertBefore(sidebar, rightColumn.firstChild);
    } else {
      this.fallbackInject(sidebar);
    }
  }

}

