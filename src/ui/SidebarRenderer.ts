/**
 * 侧边栏UI渲染器
 */

import { SyntaxItem } from '../types/syntax';
import { createElement } from '../utils/dom';
import { getMessage } from '../utils/i18n';

export class SidebarRenderer {
  /**
   * 创建侧边栏容器
   */
  public createSidebar(): HTMLElement {
    const sidebar = createElement('div', {
      className: 'hacking-sidebar glass-morph'
    });
    
    sidebar.style.opacity = '0';
    sidebar.style.transform = 'translateX(20px)';
    sidebar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    return sidebar;
  }

  /**
   * 创建侧边栏头部
   */
  public createHeader(): HTMLElement {
    const linkIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>';
    
    const header = createElement('div', {
      className: 'sidebar-header',
      innerHTML: `
        <div class="sidebar-header-title">${getMessage('sidebarTitle')}</div>
        <div class="sidebar-header-actions">
          <select id="syntaxSortOrder" class="sort-select" title="排序方式">
            <option value="default">默认顺序</option>
            <option value="risk">风险等级</option>
          </select>
          <button id="extractUrlBtn" class="sidebar-button blue-button">
            ${linkIcon} ${getMessage('extractUrlBtn')}
          </button>
        </div>
      `
    });
    
    return header;
  }

  /**
   * 创建URL提取面板
   */
  public createUrlPanel(): HTMLElement {
    const chevronUpIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>';
    
    const panel = createElement('div', {
      id: 'urlExtractorPanel',
      className: 'url-panel',
      innerHTML: `
        <div class="url-panel-header">
          <div class="url-panel-title">${getMessage('urlPanelTitle')} <span id="urlCount" class="url-count">(0)</span></div>
          <div class="url-panel-actions">
            <button id="copyAllUrlsBtn" class="sidebar-button blue-button">
              ${getMessage('copyAllUrlsBtn')}
            </button>
            <button id="collapseUrlPanelBtn" class="sidebar-button gray-button">
              ${chevronUpIcon}
            </button>
          </div>
        </div>
        <div id="urlList" class="url-list"></div>
      `
    });
    
    panel.style.display = 'none';
    return panel;
  }

  /**
   * 创建语法按钮容器
   */
  public createSyntaxContainer(syntaxItems: SyntaxItem[], sortOrder: string = 'default'): HTMLElement {
    const container = createElement('div', {
      className: 'syntax-container'
    });
    container.id = 'syntaxContainer';
    container.dataset.sortOrder = sortOrder;
    
    // 区分内置和自定义语法
    const builtinItems = syntaxItems.filter(item => item.builtin);
    const customItems = syntaxItems.filter(item => !item.builtin);
    
    // 排序函数：按风险等级排序
    const sortByRisk = (items: SyntaxItem[]) => {
      const riskOrder = { high: 0, medium: 1, low: 2, info: 3 };
      return items.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);
    };
    
    // 根据排序方式处理内置语法
    let sortedBuiltin = [...builtinItems];
    if (sortOrder === 'risk') {
      sortedBuiltin = sortByRisk(sortedBuiltin);
    }
    
    // 添加内置语法按钮
    sortedBuiltin.forEach(syntax => {
      container.appendChild(this.createSyntaxButton(syntax));
    });
    
    // 如果有自定义语法，添加分隔线
    if (customItems.length > 0) {
      const divider = createElement('div', {
        className: 'syntax-divider',
        textContent: getMessage('customSyntaxDivider')
      });
      container.appendChild(divider);
      
      // 根据排序方式处理自定义语法
      let sortedCustom = [...customItems];
      if (sortOrder === 'risk') {
        sortedCustom = sortByRisk(sortedCustom);
      }
      
      // 添加自定义语法按钮
      sortedCustom.forEach(syntax => {
        container.appendChild(this.createSyntaxButton(syntax));
      });
    }
    
    return container;
  }

  /**
   * 创建单个语法按钮
   */
  public createSyntaxButton(syntax: SyntaxItem): HTMLElement {
    // 风险等级配置
    const riskConfig = {
      info: { label: 'info', color: '#007AFF' },
      low: { label: 'low', color: '#34C759' },
      medium: { label: 'medium', color: '#FF9500' },
      high: { label: 'high', color: '#FF3B30' }
    };
    
    const risk = riskConfig[syntax.risk];
    
    const button = createElement('div', {
      className: `syntax-btn risk-${syntax.risk}`,
      innerHTML: `
        <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${syntax.name}</span>
        <span style="margin-left: 8px; flex-shrink: 0; color: ${risk.color};">${risk.label}</span>
      `
    });
    
    button.dataset.syntaxId = syntax.id;
    button.dataset.template = syntax.template;
    
    return button;
  }

  /**
   * 创建侧边栏底部
   */
  public createFooter(): HTMLElement {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    const homepage = manifest.homepage_url || '#';
    
    const settingsIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/></svg>';
    const githubIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
    
    const footer = createElement('div', {
      className: 'sidebar-footer',
      innerHTML: `
        <div class="sidebar-footer-links">
          <a href="#" class="sidebar-footer-link settings-link">
            ${settingsIcon} ${getMessage('settingsBtn')}
          </a>
          <a href="${homepage}" class="sidebar-footer-link" target="_blank">
            ${githubIcon} ${getMessage('githubBtn')}
          </a>
        </div>
        <div class="sidebar-footer-version">v${version}</div>
      `
    });
    
    return footer;
  }

}

