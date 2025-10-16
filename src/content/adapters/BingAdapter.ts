/**
 * Bing搜索引擎适配器
 */

import { SearchEngine } from '../../types';
import { SidebarManager } from '../../core/SidebarManager';
import { BING_SELECTORS } from '../../constants/selectors';

export class BingAdapter extends SidebarManager {
  private contentObserver: MutationObserver | null = null;

  getSearchEngine(): SearchEngine {
    return 'bing';
  }

  extractTargetDomain(): string {
    const url = new URL(window.location.href);
    const query = url.searchParams.get('q') || '';
    
    const siteMatch = query.match(/site:([^\s]+)/i);
    return siteMatch ? siteMatch[1].replace(/^https?:\/\//, '') : '';
  }

  isSearchPage(): boolean {
    const hostname = location.hostname;
    const isBing = hostname.includes('bing.com') || 
                   hostname.includes('bing.cn') ||
                   hostname.includes('bing.');
    
    if (!isBing) {
      return false;
    }
    
    const pathname = location.pathname;
    return pathname === '/search' || pathname.includes('/search');
  }

  buildSearchUrl(query: string): string {
    return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  }

  getUrlSelectors(): string[] {
    return BING_SELECTORS.SEARCH_RESULTS;
  }

  getExcludedContainers(): string[] {
    return BING_SELECTORS.EXCLUDED_CONTAINERS;
  }

  /**
   * Bing特殊处理：监听搜索结果容器的变化
   */
  public setupObservers(): void {
    // 调用父类的观察器设置
    super.setupObservers();
    
    // Bing特有：监听搜索结果容器的变化
    const setupContentObserver = () => {
      const resultsContainer = document.querySelector(BING_SELECTORS.RESULTS_CONTAINER);
      const mainContainer = document.querySelector(BING_SELECTORS.MAIN_CONTAINER);
      const targetNode = resultsContainer || mainContainer;
      
      if (!targetNode) {
        console.log('[Bing侧边栏] 未找到内容容器，稍后重试');
        setTimeout(setupContentObserver, 1000);
        return;
      }
      
      if (this.contentObserver) {
        this.contentObserver.disconnect();
      }
      
      this.contentObserver = new MutationObserver((mutations) => {
        // 检测是否是搜索结果更新
        const hasResultsChange = mutations.some(mutation => {
          if (mutation.type === 'childList') {
            // 检查是否有新的搜索结果节点
            const hasResults = Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                return element.classList.contains('b_algo') || 
                       element.querySelector('.b_algo');
              }
              return false;
            });
            return hasResults;
          }
          return false;
        });
        
        if (hasResultsChange) {
          console.log('[Bing侧边栏] 检测到搜索结果更新，重新检查侧边栏');
          setTimeout(() => {
            this.init(true);
          }, 500);
        }
      });
      
      this.contentObserver.observe(targetNode, {
        childList: true,
        subtree: true
      });
      
      console.log('[Bing侧边栏] 内容变化观察器已设置');
    };
    
    setupContentObserver();
  }

  injectToPage(sidebar: HTMLElement): void {
    const mainContainer = document.querySelector(BING_SELECTORS.MAIN_CONTAINER);
    
    if (!mainContainer) {
      console.error('[Bing] 无法找到主容器');
      this.fallbackInject(sidebar);
      return;
    }
    
    // 查找或创建右侧栏
    let rightRail = document.querySelector(BING_SELECTORS.RIGHT_RAIL) as HTMLElement;
    
    if (!rightRail) {
      rightRail = document.createElement('div');
      rightRail.id = 'b_context';
      rightRail.style.float = 'right';
      rightRail.style.width = '320px';
      rightRail.style.marginLeft = '20px';
      
      mainContainer.appendChild(rightRail);
    }
    
    if (rightRail) {
      rightRail.insertBefore(sidebar, rightRail.firstChild);
    } else {
      this.fallbackInject(sidebar);
    }
  }

  /**
   * 清理Bing特有的观察器
   */
  public destroy(): void {
    // 清理内容观察器
    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }
    // 调用父类destroy方法
    super.destroy();
  }
}

