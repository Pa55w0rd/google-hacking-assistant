/**
 * URL面板渲染器
 */

import { createElement } from '../utils/dom';
import { getMessage } from '../utils/i18n';

export class UrlPanelRenderer {
  /**
   * 渲染URL列表
   */
  public renderUrlList(urls: string[], urlListElement: HTMLElement): void {
    urlListElement.innerHTML = '';
    
    if (urls.length === 0) {
      this.renderEmptyState(urlListElement);
      return;
    }
    
    urls.forEach(url => {
      const urlItem = this.createUrlItem(url);
      urlListElement.appendChild(urlItem);
    });
  }

  /**
   * 创建单个URL项
   */
  private createUrlItem(url: string): HTMLElement {
    const urlItem = createElement('div', {
      className: 'url-item',
      textContent: url
    });
    
    urlItem.title = url;
    urlItem.dataset.url = url;
    
    return urlItem;
  }

  /**
   * 渲染空状态
   */
  private renderEmptyState(container: HTMLElement): void {
    const emptyState = createElement('div', {
      className: 'url-debug-info',
      innerHTML: `
        <div class="debug-icon"><i class="fas fa-exclamation-circle"></i></div>
        <div class="debug-content">
          <div class="debug-title">无法提取URL</div>
          <div class="debug-tips">
            <p>${getMessage('urlExtractionErrorTips')}</p>
          </div>
        </div>
      `
    });
    
    container.appendChild(emptyState);
  }

  /**
   * 渲染加载状态
   */
  public renderLoadingState(container: HTMLElement): void {
    container.innerHTML = '<div class="url-item">正在提取URL...</div>';
  }

  /**
   * 更新URL计数
   */
  public updateUrlCount(count: number, countElement: HTMLElement): void {
    countElement.textContent = `(${count})`;
  }

  /**
   * 显示复制成功反馈
   */
  public showCopySuccess(element: HTMLElement, url: string): void {
    element.style.backgroundColor = '#e6f4ea';
    element.style.borderLeft = '3px solid #34a853';
    element.innerHTML = `<div class="copy-success"><i class="fas fa-check"></i> ${getMessage('copySuccess')}: ${url}</div>`;
    
    setTimeout(() => {
      element.style.backgroundColor = '';
      element.style.borderLeft = '';
      element.textContent = url;
    }, 1200);
  }

  /**
   * 显示复制失败反馈
   */
  public showCopyError(element: HTMLElement, url: string): void {
    element.style.backgroundColor = '#fce8e6';
    element.style.borderLeft = '3px solid #ea4335';
    element.innerHTML = `<div class="copy-error"><i class="fas fa-times"></i> ${getMessage('copyError')}: ${url}</div>`;
    
    setTimeout(() => {
      element.style.backgroundColor = '';
      element.style.borderLeft = '';
      element.textContent = url;
    }, 1200);
  }
}

