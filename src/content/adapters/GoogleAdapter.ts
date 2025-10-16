/**
 * Google搜索引擎适配器
 */

import { SearchEngine } from '../../types';
import { SidebarManager } from '../../core/SidebarManager';
import { GOOGLE_SELECTORS } from '../../constants/selectors';

export class GoogleAdapter extends SidebarManager {
  getSearchEngine(): SearchEngine {
    return 'google';
  }

  extractTargetDomain(): string {
    const url = new URL(window.location.href);
    const query = url.searchParams.get('q') || '';
    
    const siteMatch = query.match(/site:([^\s]+)/i);
    return siteMatch ? siteMatch[1].replace(/^https?:\/\//, '') : '';
  }

  isSearchPage(): boolean {
    const hostname = location.hostname;
    const isGoogle = hostname.includes('google.com') || 
                     hostname.includes('google.') ||
                     hostname === 'www.google' ||
                     hostname.endsWith('.google');
    
    if (!isGoogle) {
      return false;
    }
    
    const url = new URL(window.location.href);
    return url.pathname === '/search' || url.pathname === '/';
  }

  buildSearchUrl(query: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  getUrlSelectors(): string[] {
    return GOOGLE_SELECTORS.SEARCH_RESULTS;
  }

  getExcludedContainers(): string[] {
    return GOOGLE_SELECTORS.EXCLUDED_CONTAINERS;
  }

  injectToPage(sidebar: HTMLElement): void {
    const rcnt = document.querySelector(GOOGLE_SELECTORS.MAIN_CONTAINER);
    const centerCol = document.querySelector(GOOGLE_SELECTORS.CENTER_COL);
    const main = document.querySelector(GOOGLE_SELECTORS.MAIN);
    
    const searchResults = centerCol || main || (rcnt ? rcnt.querySelector('div') : null);
    
    if (!searchResults) {
      console.error('[Google] 无法找到搜索结果容器');
      this.fallbackInject(sidebar);
      return;
    }
    
    // 查找或创建右侧栏
    let rightColumn = document.querySelector(GOOGLE_SELECTORS.RIGHT_COLUMN) as HTMLElement;
    
    if (!rightColumn) {
      rightColumn = document.createElement('div');
      rightColumn.id = 'rhs';
      rightColumn.style.marginLeft = '20px';
      rightColumn.style.maxWidth = '320px';
      rightColumn.style.minWidth = '320px';
      
      const parentContainer = rcnt || searchResults.parentElement;
      if (parentContainer) {
        parentContainer.appendChild(rightColumn);
      }
    }
    
    if (rightColumn) {
      rightColumn.insertBefore(sidebar, rightColumn.firstChild);
    } else {
      this.fallbackInject(sidebar);
    }
  }

}

