/**
 * 侧边栏管理器抽象基类
 * 包含所有搜索引擎共用的逻辑，子类只需实现差异化部分
 */

import { SearchEngine } from '../types';
import { SyntaxItem } from '../types/syntax';
import { StorageService } from '../services/StorageService';
import { ThemeService } from '../services/ThemeService';
import { SyntaxService } from '../services/SyntaxService';
import { UrlExtractorService } from '../services/UrlExtractorService';
import { MessageService } from '../services/MessageService';
import { SidebarRenderer } from '../ui/SidebarRenderer';
import { UrlPanelRenderer } from '../ui/UrlPanelRenderer';
import { debounce, DebounceTimers } from '../utils/debounce';
import { removeElementWithAnimation, showElementWithAnimation } from '../utils/dom';

export interface SidebarState {
  lastProcessedUrl: string;
  injectionInProgress: boolean;
  lastInjectionTime: number;
  debounceTimers: DebounceTimers;
  observerPaused: boolean;
}

export abstract class SidebarManager {
  protected storageService: StorageService;
  protected themeService: ThemeService;
  protected syntaxService: SyntaxService;
  protected urlExtractorService: UrlExtractorService;
  protected messageService: MessageService;
  protected sidebarRenderer: SidebarRenderer;
  protected urlPanelRenderer: UrlPanelRenderer;
  
  protected state: SidebarState = {
    lastProcessedUrl: '',
    injectionInProgress: false,
    lastInjectionTime: 0,
    debounceTimers: {},
    observerPaused: false
  };
  
  protected observers: MutationObserver[] = [];

  constructor() {
    this.storageService = StorageService.getInstance();
    this.themeService = ThemeService.getInstance();
    this.syntaxService = SyntaxService.getInstance();
    this.urlExtractorService = UrlExtractorService.getInstance();
    this.messageService = MessageService.getInstance();
    this.sidebarRenderer = new SidebarRenderer();
    this.urlPanelRenderer = new UrlPanelRenderer();
  }

  // ========== 抽象方法：由子类实现 ==========

  /**
   * 获取搜索引擎类型
   */
  abstract getSearchEngine(): SearchEngine;

  /**
   * 提取目标域名
   */
  abstract extractTargetDomain(): string;

  /**
   * 检查是否是搜索页面
   */
  abstract isSearchPage(): boolean;

  /**
   * 将侧边栏注入到页面
   */
  abstract injectToPage(sidebar: HTMLElement): void;

  /**
   * 获取URL提取选择器
   */
  abstract getUrlSelectors(): string[];

  /**
   * 获取排除容器选择器
   */
  abstract getExcludedContainers(): string[];

  // ========== 通用方法：所有子类共享 ==========

  /**
   * 计算用于对比的 URL 签名
   * 对搜索页面使用引擎特定的查询与分页参数，避免仅用基础路径导致误判
   */
  protected computeUrlSignature(): string {
    const href = window.location.href.split('#')[0];
    const url = new URL(href);
    const pathname = url.pathname;
    const params = url.searchParams;
    const engine = this.getSearchEngine();

    let query = '';
    let page = '';

    if (engine === 'baidu') {
      query = params.get('wd') || params.get('word') || '';
      page = params.get('pn') || '0';
    } else if (engine === 'google') {
      query = params.get('q') || '';
      page = params.get('start') || '0';
    } else if (engine === 'bing') {
      query = params.get('q') || '';
      page = params.get('first') || '1';
    } else {
      // 兜底：尽量包含查询字符串，防止误判
      query = params.get('q') || params.toString();
    }

    return `${pathname}|q=${query}|p=${page}`;
  }

  /**
   * 初始化侧边栏
   */
  public async init(forceCheck: boolean = false): Promise<void> {
    // 防止重复执行
    if (this.state.injectionInProgress) {
      return;
    }
    
    this.state.injectionInProgress = true;
    
    try {
      // 防抖处理
      const now = Date.now();
      if (!forceCheck && now - this.state.lastInjectionTime < 500) {
        console.log('[侧边栏] 注入频率过高，跳过');
        return;
      }
      
      // 检查URL变化（基于签名）
      const currentSignature = this.computeUrlSignature();
      if (!forceCheck && currentSignature === this.state.lastProcessedUrl) {
        // URL签名未变化，跳过
        return;
      }
      
      console.log('[侧边栏] 开始检查是否需要注入', window.location.href);
      
      // 检查注入条件
      const shouldInject = await this.checkInjectionConditions();
      const existingSidebar = document.querySelector('.hacking-sidebar');
      
      // 如果不需要注入，移除现有侧边栏
      if (!shouldInject) {
        if (existingSidebar) {
          console.log('[侧边栏] 不满足注入条件，移除现有侧边栏');
          await this.removeSidebar();
        }
        this.state.lastProcessedUrl = currentSignature;
        return;
      }
      
      // 如果已经存在侧边栏且条件满足，不需要重新注入
      if (existingSidebar && !forceCheck) {
        console.log('[侧边栏] 侧边栏已存在，跳过重复注入');
        this.state.lastProcessedUrl = currentSignature;
        this.state.lastInjectionTime = now;
        return;
      }
      
      // 更新状态
      this.state.lastProcessedUrl = currentSignature;
      this.state.lastInjectionTime = now;
      
      // 移除现有侧边栏
      if (existingSidebar) {
        await this.removeSidebar();
      }
      
      // 暂停观察器
      this.pauseObservers();
      
      // 执行注入
      await this.performInjection();
      
      // 恢复观察器
      this.resumeObservers();
    } finally {
      this.state.injectionInProgress = false;
    }
  }

  /**
   * 检查注入条件
   */
  protected async checkInjectionConditions(): Promise<boolean> {
    const settings = await this.storageService.getSettings();
    
    if (!settings || settings.sidebarEnabled === false) {
      return false;
    }
    
    const engine = this.getSearchEngine();
    const engineKey = `${engine}Enabled` as keyof typeof settings;
    
    if (settings[engineKey] === false) {
      return false;
    }
    
    if (!this.isSearchPage()) {
      return false;
    }
    
    // 检查site参数
    const url = new URL(window.location.href);
    const query = url.searchParams.get('q') || url.searchParams.get('wd') || '';
    return query.toLowerCase().includes('site:');
  }

  /**
   * 执行注入
   */
  protected async performInjection(): Promise<void> {
    // 获取语法库
    const allSyntax = await this.syntaxService.getSyntaxLibrary();
    const engineSyntax = this.syntaxService.filterByEngine(
      allSyntax,
      this.getSearchEngine()
    );
    
    // 创建侧边栏
    const sidebar = this.createSidebar(engineSyntax);
    
    // 应用主题
    const theme = await this.themeService.getCurrentTheme();
    this.themeService.applyTheme(sidebar, theme);
    this.themeService.setupThemeListener(sidebar, `[${this.getSearchEngine()}侧边栏]`);
    
    // 注入到页面
    this.injectToPage(sidebar);
    
    // 绑定事件
    this.bindEvents(sidebar);
    
    // 显示动画
    showElementWithAnimation(sidebar);
  }

  /**
   * 创建侧边栏
   */
  protected createSidebar(syntaxItems: SyntaxItem[]): HTMLElement {
    const sidebar = this.sidebarRenderer.createSidebar();
    
    // 添加头部
    sidebar.appendChild(this.sidebarRenderer.createHeader());
    
    // 添加URL面板
    sidebar.appendChild(this.sidebarRenderer.createUrlPanel());
    
    // 添加语法容器
    sidebar.appendChild(this.sidebarRenderer.createSyntaxContainer(syntaxItems));
    
    // 添加底部
    sidebar.appendChild(this.sidebarRenderer.createFooter());
    
    return sidebar;
  }

  /**
   * 绑定事件
   */
  protected bindEvents(sidebar: HTMLElement): void {
    this.bindSyntaxButtonEvents(sidebar);
    this.bindUrlPanelEvents(sidebar);
    this.bindSortChangeEvent(sidebar);
    this.bindFooterEvents(sidebar);
  }

  /**
   * 绑定排序切换事件
   */
  protected bindSortChangeEvent(sidebar: HTMLElement): void {
    const sortSelect = sidebar.querySelector('#syntaxSortOrder') as HTMLSelectElement;
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', async () => {
      const sortOrder = sortSelect.value;
      
      // 获取语法库
      const allSyntax = await this.syntaxService.getSyntaxLibrary();
      const engineSyntax = this.syntaxService.filterByEngine(
        allSyntax,
        this.getSearchEngine()
      );
      
      // 重新创建语法容器
      const oldContainer = sidebar.querySelector('#syntaxContainer');
      if (oldContainer) {
        const newContainer = this.sidebarRenderer.createSyntaxContainer(engineSyntax, sortOrder);
        oldContainer.parentNode?.replaceChild(newContainer, oldContainer);
        
        // 重新绑定语法按钮事件
        this.bindSyntaxButtonEvents(sidebar);
      }
    });
  }

  /**
   * 绑定语法按钮事件
   */
  protected bindSyntaxButtonEvents(sidebar: HTMLElement): void {
    const buttons = sidebar.querySelectorAll('.syntax-btn');
    
    buttons.forEach(button => {
      button.addEventListener('click', async () => {
        const template = (button as HTMLElement).dataset.template;
        if (!template) return;
        
        const targetDomain = this.extractTargetDomain();
        if (!targetDomain) {
          alert('无法确定目标域名');
          return;
        }
        
        const searchQuery = this.syntaxService.replacePlaceholders(template, targetDomain);
        const settings = await this.storageService.getSettings();
        const openInNewTab = settings?.openInNewTab !== false;
        
        const searchUrl = this.buildSearchUrl(searchQuery);
        
        if (openInNewTab) {
          window.open(searchUrl, '_blank');
        } else {
          window.location.href = searchUrl;
        }
      });
    });
  }

  /**
   * 构建搜索URL
   */
  protected abstract buildSearchUrl(query: string): string;

  /**
   * 备用注入方式 - 固定定位到页面右侧
   */
  protected fallbackInject(sidebar: HTMLElement): void {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '80px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.appendChild(sidebar);
    document.body.appendChild(container);
  }

  /**
   * 绑定URL面板事件
   */
  protected bindUrlPanelEvents(sidebar: HTMLElement): void {
    const extractBtn = sidebar.querySelector('#extractUrlBtn');
    const urlPanel = sidebar.querySelector('#urlExtractorPanel') as HTMLElement;
    const urlList = sidebar.querySelector('#urlList') as HTMLElement;
    const urlCount = sidebar.querySelector('#urlCount') as HTMLElement;
    const collapseBtn = sidebar.querySelector('#collapseUrlPanelBtn');
    const copyAllBtn = sidebar.querySelector('#copyAllUrlsBtn');
    
    // 提取URL按钮
    extractBtn?.addEventListener('click', async () => {
      const isVisible = urlPanel.style.display !== 'none';
      urlPanel.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        this.urlPanelRenderer.renderLoadingState(urlList);
        this.urlPanelRenderer.updateUrlCount(0, urlCount);
        
        setTimeout(async () => {
          const urls = await this.urlExtractorService.extractUrls(
            this.getUrlSelectors(),
            this.getExcludedContainers()
          );
          
          this.urlPanelRenderer.renderUrlList(urls, urlList);
          this.urlPanelRenderer.updateUrlCount(urls.length, urlCount);
          
          // 绑定URL项点击事件
          this.bindUrlItemEvents(urlList);
        }, 100);
      }
    });
    
    // 收起按钮
    collapseBtn?.addEventListener('click', () => {
      urlPanel.style.display = 'none';
    });
    
    // 复制全部按钮
    copyAllBtn?.addEventListener('click', async () => {
      const urls = await this.urlExtractorService.extractUrls(
        this.getUrlSelectors(),
        this.getExcludedContainers()
      );
      
      if (urls.length > 0) {
        try {
          await navigator.clipboard.writeText(urls.join('\n'));
          this.showButtonFeedback(copyAllBtn as HTMLElement, 'success', '已复制');
        } catch (err) {
          this.showButtonFeedback(copyAllBtn as HTMLElement, 'error', '复制失败');
        }
      }
    });
  }

  /**
   * 绑定URL项事件
   */
  protected bindUrlItemEvents(urlList: HTMLElement): void {
    const urlItems = urlList.querySelectorAll('.url-item');
    
    urlItems.forEach(item => {
      item.addEventListener('click', async () => {
        const url = (item as HTMLElement).dataset.url;
        if (!url) return;
        
        const settings = await this.storageService.getSettings();
        const action = settings?.urlClickAction || 'copy';
        
        if (action === 'open') {
          const openInNewTab = settings?.openInNewTab !== false;
          if (openInNewTab) {
            window.open(url, '_blank');
          } else {
            window.location.href = url;
          }
        } else {
          try {
            await navigator.clipboard.writeText(url);
            this.urlPanelRenderer.showCopySuccess(item as HTMLElement, url);
          } catch (err) {
            this.urlPanelRenderer.showCopyError(item as HTMLElement, url);
          }
        }
      });
    });
  }

  /**
   * 绑定底部事件
   */
  protected bindFooterEvents(sidebar: HTMLElement): void {
    const settingsLink = sidebar.querySelector('.settings-link');
    console.log('[侧边栏] 查找设置链接:', settingsLink);
    
    if (settingsLink) {
      console.log('[侧边栏] 绑定设置按钮点击事件');
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[侧边栏] 设置按钮被点击，发送消息打开选项页');
        // content script 不能直接调用 chrome.runtime.openOptionsPage
        // 需要通过 message 让 background 来打开
        chrome.runtime.sendMessage({ action: 'openOptions' });
      });
    } else {
      console.warn('[侧边栏] 未找到设置链接元素');
    }
  }

  /**
   * 显示按钮反馈
   */
  protected showButtonFeedback(
    button: HTMLElement,
    type: 'success' | 'error',
    text: string
  ): void {
    const originalText = button.textContent;
    const originalBg = button.style.backgroundColor;
    const originalBorder = button.style.borderColor;
    
    button.style.backgroundColor = type === 'success' ? '#e6f4ea' : '#fce8e6';
    button.style.borderColor = type === 'success' ? '#34a853' : '#ea4335';
    button.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'times'}"></i> ${text}`;
    
    setTimeout(() => {
      button.textContent = originalText || '';
      button.style.backgroundColor = originalBg;
      button.style.borderColor = originalBorder;
    }, 1500);
  }

  /**
   * 移除侧边栏
   */
  protected async removeSidebar(): Promise<void> {
    const existing = document.querySelector('.hacking-sidebar') as HTMLElement;
    if (existing) {
      await removeElementWithAnimation(existing);
    }
  }

  /**
   * 暂停观察器
   */
  protected pauseObservers(): void {
    this.state.observerPaused = true;
  }

  /**
   * 恢复观察器
   */
  protected resumeObservers(): void {
    setTimeout(() => {
      this.state.observerPaused = false;
    }, 1000);
  }

  /**
   * 设置观察器
   */
  public setupObservers(): void {
    // URL变化观察器
    const urlChangeHandler = debounce(
      () => {
        if (!this.state.observerPaused) {
          const currentSignature = this.computeUrlSignature();
          const lastSignature = this.state.lastProcessedUrl;

          if (currentSignature !== lastSignature) {
            console.log('[侧边栏] 检测到URL变化');
            this.init(false);
          }
        }
      },
      800,
      this.state.debounceTimers,
      'urlChange'
    );
    
    const urlObserver = new MutationObserver(() => {
      urlChangeHandler();
    });
    
    urlObserver.observe(document, { subtree: true, childList: true });
    this.observers.push(urlObserver);
    
    // 监听消息
    this.messageService.onMessage((request) => {
      if (request.action === 'settingsChanged' || request.action === 'syntaxChanged') {
        console.log('[侧边栏] 收到设置变更消息');
        debounce(
          () => this.init(true),
          500,
          this.state.debounceTimers,
          'settingsChange'
        )();
      }
      return false;
    });
    
    // 监听存储变化
    this.storageService.onChanged((changes) => {
      if (changes.searchHackingSettings || changes.syntaxLibrary) {
        console.log('[侧边栏] 检测到存储变化');
        debounce(
          () => this.init(true),
          500,
          this.state.debounceTimers,
          'storageChange'
        )();
      }
    });
  }

  /**
   * 销毁
   */
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    Object.keys(this.state.debounceTimers).forEach(key => {
      clearTimeout(this.state.debounceTimers[key]);
    });
  }
}

