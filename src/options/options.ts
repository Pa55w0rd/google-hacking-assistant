/**
 * 选项页面脚本
 */

import { StorageService } from '../services/StorageService';
import { SyntaxService } from '../services/SyntaxService';
import { MessageService } from '../services/MessageService';
import { ThemeService } from '../services/ThemeService';
import { SyntaxItem } from '../types/syntax';
import { AppSettings } from '../types/settings';
import { SearchEngine } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaults';

class OptionsManager {
  private storageService: StorageService;
  private syntaxService: SyntaxService;
  private messageService: MessageService;
  private themeService: ThemeService;

  constructor() {
    this.storageService = StorageService.getInstance();
    this.syntaxService = SyntaxService.getInstance();
    this.messageService = MessageService.getInstance();
    this.themeService = ThemeService.getInstance();
  }

  /**
   * 初始化选项页面
   */
  private initScrollFeatures(): void {
    // 使用延迟确保DOM已完全加载
    setTimeout(() => {
      const mainContent = document.querySelector('.main-content');
      const scrollProgress = document.getElementById('scrollProgress');
      const backToTop = document.getElementById('backToTop');
      
      console.log('Scroll features init:', { mainContent, scrollProgress, backToTop });
      
      if (!mainContent || !scrollProgress || !backToTop) {
        console.warn('Scroll elements not found');
        return;
      }
      
      // 滚动进度条
      mainContent.addEventListener('scroll', () => {
        const scrollTop = mainContent.scrollTop;
        const scrollHeight = mainContent.scrollHeight - mainContent.clientHeight;
        const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        scrollProgress.style.height = scrollPercent + '%';
        
        // 显示/隐藏回到顶部按钮
        if (scrollTop > 300) {
          backToTop.classList.add('show');
        } else {
          backToTop.classList.remove('show');
        }
      });
      
      // 回到顶部按钮点击事件
      backToTop.addEventListener('click', () => {
        mainContent.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
      
      console.log('Scroll features initialized successfully');
    }, 100);
  }

  public async init(): Promise<void> {
    // 应用主题
    const theme = await this.themeService.getCurrentTheme();
    document.body.setAttribute('data-theme', theme);
    
    // 初始化滚动功能
    this.initScrollFeatures();
    
    // 设置主题图标
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    // 设置版本号
    this.setVersionInfo();
    
    // 加载设置
    await this.loadSettings();
    
    // 加载语法库
    await this.loadSyntaxLibrary();
    
    // 绑定事件
    this.bindEvents();
    
    // 监听设置变化（实现跨页面同步）
    this.setupStorageListener();
    
    console.log('[选项页面] 初始化完成');
  }

  /**
   * 设置版本信息
   */
  private setVersionInfo(): void {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    
    // 顶部版本号
    const versionText = document.getElementById('versionText');
    if (versionText) {
      versionText.textContent = version;
    }
    
    // 关于页面版本号
    const aboutVersionText = document.getElementById('aboutVersionText');
    if (aboutVersionText) {
      aboutVersionText.textContent = version;
    }
    
    // GitHub链接
    const githubLink = document.getElementById('githubLink');
    const aboutGithubLink = document.getElementById('aboutGithubLink');
    if (manifest.homepage_url) {
      if (githubLink) {
        (githubLink as HTMLAnchorElement).href = manifest.homepage_url;
      }
      if (aboutGithubLink) {
        (aboutGithubLink as HTMLAnchorElement).href = manifest.homepage_url;
      }
    }
  }

  /**
   * 监听存储变化，实现跨页面同步
   */
  private setupStorageListener(): void {
    this.storageService.onChanged((changes) => {
      if (changes.searchHackingSettings) {
        const newSettings = changes.searchHackingSettings.newValue;
        if (newSettings) {
          console.log('[选项页面] 检测到设置变化，更新UI');
          this.updateToggleStates(newSettings);
        }
      }
    });
  }

  /**
   * 更新开关状态
   */
  private updateToggleStates(settings: AppSettings): void {
    // 侧边栏开关
    const sidebarToggle = document.getElementById('toggleSidebar');
    if (sidebarToggle) {
      if (settings.sidebarEnabled) {
        sidebarToggle.classList.add('active');
      } else {
        sidebarToggle.classList.remove('active');
      }
    }
    
    // Google开关
    const googleToggle = document.getElementById('toggleGoogle');
    if (googleToggle) {
      if (settings.googleEnabled !== false) {
        googleToggle.classList.add('active');
      } else {
        googleToggle.classList.remove('active');
      }
    }
    
    // 百度开关
    const baiduToggle = document.getElementById('toggleBaidu');
    if (baiduToggle) {
      if (settings.baiduEnabled) {
        baiduToggle.classList.add('active');
      } else {
        baiduToggle.classList.remove('active');
      }
    }
    
    // Bing开关
    const bingToggle = document.getElementById('toggleBing');
    if (bingToggle) {
      if (settings.bingEnabled) {
        bingToggle.classList.add('active');
      } else {
        bingToggle.classList.remove('active');
      }
    }
    
    // 新标签页打开
    const newTabToggle = document.getElementById('toggleNewTab');
    if (newTabToggle) {
      if (settings.openInNewTab !== false) {
        newTabToggle.classList.add('active');
      } else {
        newTabToggle.classList.remove('active');
      }
    }
    
    // URL点击动作
    const urlClickAction = settings.urlClickAction || 'copy';
    const copyRadio = document.getElementById('urlActionCopy') as HTMLInputElement;
    const openRadio = document.getElementById('urlActionOpen') as HTMLInputElement;
    
    if (copyRadio && openRadio) {
      if (urlClickAction === 'copy') {
        copyRadio.checked = true;
      } else {
        openRadio.checked = true;
      }
    }
    
    // URL黑名单
    const blacklistTextarea = document.getElementById('urlBlacklist') as HTMLTextAreaElement;
    if (blacklistTextarea && settings.urlBlacklist) {
      blacklistTextarea.value = settings.urlBlacklist.join('\n');
    }
  }

  /**
   * 加载设置
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.storageService.getSettings() || DEFAULT_SETTINGS;
    
    // 侧边栏开关
    const sidebarToggle = document.getElementById('toggleSidebar');
    if (sidebarToggle) {
      if (settings.sidebarEnabled) {
        sidebarToggle.classList.add('active');
      } else {
        sidebarToggle.classList.remove('active');
      }
    }
    
    // Google开关
    const googleToggle = document.getElementById('toggleGoogle');
    if (googleToggle) {
      if (settings.googleEnabled !== false) {
        googleToggle.classList.add('active');
      } else {
        googleToggle.classList.remove('active');
      }
    }
    
    // 百度开关
    const baiduToggle = document.getElementById('toggleBaidu');
    if (baiduToggle) {
      if (settings.baiduEnabled) {
        baiduToggle.classList.add('active');
      } else {
        baiduToggle.classList.remove('active');
      }
    }
    
    // Bing开关
    const bingToggle = document.getElementById('toggleBing');
    if (bingToggle) {
      if (settings.bingEnabled) {
        bingToggle.classList.add('active');
      } else {
        bingToggle.classList.remove('active');
      }
    }
    
    // 新标签页打开
    const newTabToggle = document.getElementById('toggleNewTab');
    if (newTabToggle && settings.openInNewTab !== false) {
      newTabToggle.classList.add('active');
    }
    
    // URL点击动作
    const urlClickAction = settings.urlClickAction || 'copy';
    const copyRadio = document.getElementById('urlActionCopy') as HTMLInputElement;
    const openRadio = document.getElementById('urlActionOpen') as HTMLInputElement;
    
    if (copyRadio && openRadio) {
      if (urlClickAction === 'copy') {
        copyRadio.checked = true;
      } else {
        openRadio.checked = true;
      }
    }
    
    // URL黑名单
    const blacklistTextarea = document.getElementById('urlBlacklist') as HTMLTextAreaElement;
    if (blacklistTextarea && settings.urlBlacklist) {
      blacklistTextarea.value = settings.urlBlacklist.join('\n');
    }
    } catch (error) {
      console.error('加载设置失败:', error);
      this.showNotification('加载设置失败', 'error');
    }
  }

  /**
   * 保存设置
   */
  private async saveSettings(showNotif: boolean = false): Promise<void> {
    try {
      const settings: AppSettings = {
        sidebarEnabled: document.getElementById('toggleSidebar')?.classList.contains('active') ?? true,
        googleEnabled: document.getElementById('toggleGoogle')?.classList.contains('active') ?? true,
        baiduEnabled: document.getElementById('toggleBaidu')?.classList.contains('active') ?? false,
        bingEnabled: document.getElementById('toggleBing')?.classList.contains('active') ?? false,
        openInNewTab: document.getElementById('toggleNewTab')?.classList.contains('active') ?? true,
        urlClickAction: (document.getElementById('urlActionCopy') as HTMLInputElement)?.checked ? 'copy' : 'open',
        urlBlacklist: ((document.getElementById('urlBlacklist') as HTMLTextAreaElement)?.value || '')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
      };
      
      await this.storageService.set({ searchHackingSettings: settings });
      
      // 广播设置变更
      this.messageService.broadcastToTabs({
        action: 'settingsChanged',
        settings
      });
      
      if (showNotif) {
        this.showNotification('设置已保存', 'success');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showNotification('保存设置失败，请重试', 'error');
    }
  }

  /**
   * 加载语法库
   */
  private async loadSyntaxLibrary(): Promise<void> {
    const library = await this.syntaxService.getSyntaxLibrary();
    
    const builtinContainer = document.getElementById('builtinSyntaxList');
    const customContainer = document.getElementById('customSyntaxList');
    
    if (!builtinContainer || !customContainer) {
      return;
    }
    
    // 清空容器
    builtinContainer.innerHTML = '';
    customContainer.innerHTML = '';
    
    // 分类语法
    const builtinSyntax = library.filter(item => item.builtin);
    const customSyntax = library.filter(item => !item.builtin);
    
    // 渲染内置语法
    builtinSyntax.forEach(syntax => {
      builtinContainer.appendChild(this.createSyntaxItem(syntax));
    });
    
    // 渲染自定义语法
    customSyntax.forEach(syntax => {
      customContainer.appendChild(this.createSyntaxItem(syntax));
    });
    
    // 更新计数
    this.updateSyntaxCount(library);
  }

  /**
   * 创建语法项元素
   */
  private createSyntaxItem(syntax: SyntaxItem): HTMLElement {
    const item = document.createElement('div');
    item.className = 'syntax-item';
    item.dataset.id = syntax.id;
    
    // 风险等级配置
    const riskConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      info: { label: '信息', color: '#1976d2', bgColor: '#e3f2fd' },
      low: { label: '低风险', color: '#388e3c', bgColor: '#e8f5e9' },
      medium: { label: '中风险', color: '#f57c00', bgColor: '#fff3e0' },
      high: { label: '高风险', color: '#d32f2f', bgColor: '#ffebee' }
    };
    
    const risk = riskConfig[syntax.risk] || riskConfig.info;
    
    item.innerHTML = `
      <div class="syntax-item-header">
        <div class="syntax-item-title">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="syntax-name">${syntax.name}</span>
            <span class="risk-badge risk-badge-${syntax.risk}" style="background: ${risk.bgColor}; color: ${risk.color}">
              ${risk.label}
            </span>
          </div>
        </div>
        <div class="syntax-item-actions">
          <div class="toggle-switch ${syntax.enabled ? 'active' : ''}" data-id="${syntax.id}"></div>
          ${!syntax.builtin ? `
            <button class="icon-btn edit-btn" data-id="${syntax.id}" title="编辑">
              <i class="fas fa-edit"></i>
            </button>
            <button class="icon-btn delete-btn" data-id="${syntax.id}" title="删除">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </div>
      <div class="syntax-item-body">
        <div class="syntax-template">${syntax.template}</div>
        <div class="syntax-engines">
          ${syntax.engineSettings?.google ? '<span class="engine-badge engine-badge-google"><i class="fab fa-google"></i> Google</span>' : ''}
          ${syntax.engineSettings?.baidu ? '<span class="engine-badge engine-badge-baidu"><i class="fas fa-search"></i> 百度</span>' : ''}
          ${syntax.engineSettings?.bing ? '<span class="engine-badge engine-badge-bing"><i class="fab fa-microsoft"></i> Bing</span>' : ''}
        </div>
      </div>
    `;
    
    // 绑定开关事件
    const toggle = item.querySelector('.toggle-switch');
    toggle?.addEventListener('click', async () => {
      toggle.classList.toggle('active');
      syntax.enabled = toggle.classList.contains('active');
      await this.syntaxService.updateSyntaxItem(syntax);
      
      // 广播语法变更
      this.messageService.broadcastToTabs({
        action: 'syntaxChanged'
      });
      
      this.showNotification(
        `语法 "${syntax.name}" 已${syntax.enabled ? '启用' : '禁用'}`,
        syntax.enabled ? 'success' : 'info'
      );
    });
    
    // 绑定编辑和删除事件（仅自定义语法）
    if (!syntax.builtin) {
      const editBtn = item.querySelector('.edit-btn');
      editBtn?.addEventListener('click', () => this.editSyntax(syntax));
      
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn?.addEventListener('click', () => this.deleteSyntax(syntax));
    }
    
    return item;
  }

  /**
   * 更新语法计数
   */
  private updateSyntaxCount(library: SyntaxItem[]): void {
    const totalCount = document.getElementById('totalSyntaxCount');
    const enabledCount = document.getElementById('enabledSyntaxCount');
    const builtinCount = document.getElementById('builtinSyntaxCount');
    const customCount = document.getElementById('customSyntaxCount');
    
    const builtin = library.filter(item => item.builtin);
    const custom = library.filter(item => !item.builtin);
    const enabled = library.filter(item => item.enabled);
    
    if (totalCount) {
      totalCount.textContent = library.length.toString();
    }
    
    if (enabledCount) {
      enabledCount.textContent = enabled.length.toString();
    }
    
    if (builtinCount) {
      builtinCount.textContent = `${builtin.length}个语法`;
    }
    
    if (customCount) {
      customCount.textContent = `${custom.length}个语法`;
    }
  }

  /**
   * 编辑语法
   */
  private editSyntax(syntax: SyntaxItem): void {
    // 打开编辑对话框
    const dialog = document.getElementById('syntaxFormModal');
    if (dialog) {
      // 更新标题
      const title = document.getElementById('syntaxFormTitle');
      if (title) title.textContent = '编辑自定义语法';
      
      // 更新按钮
      const btnIcon = document.getElementById('syntaxBtnIcon');
      const btnText = document.getElementById('syntaxBtnText');
      if (btnIcon) btnIcon.className = 'fas fa-save mr-2';
      if (btnText) btnText.textContent = '保存修改';
      
      // 填充表单
      (document.getElementById('syntaxId') as HTMLInputElement).value = syntax.id;
      (document.getElementById('syntaxName') as HTMLInputElement).value = syntax.name;
      (document.getElementById('syntaxContent') as HTMLTextAreaElement).value = syntax.template;
      
      // 设置风险等级
      (document.querySelector(`input[name="riskLevel"][value="${syntax.risk}"]`) as HTMLInputElement).checked = true;
      
      // 设置搜索引擎
      (document.getElementById('engineGoogle') as HTMLInputElement).checked = syntax.engineSettings?.google ?? true;
      (document.getElementById('engineBaidu') as HTMLInputElement).checked = syntax.engineSettings?.baidu ?? false;
      (document.getElementById('engineBing') as HTMLInputElement).checked = syntax.engineSettings?.bing ?? false;
      
      // 设置语法状态
      const status = syntax.enabled ? 'enabled' : 'disabled';
      (document.querySelector(`input[name="syntaxStatus"][value="${status}"]`) as HTMLInputElement).checked = true;
      
      dialog.style.display = 'flex';
      setTimeout(() => dialog.classList.add('show'), 10);
    }
  }

  /**
   * 删除语法
   */
  private deleteSyntax(syntax: SyntaxItem): void {
    // 设置要删除的语法名称
    const syntaxNameSpan = document.getElementById('syntaxToDelete');
    if (syntaxNameSpan) {
      syntaxNameSpan.textContent = syntax.name;
    }
    
    // 显示删除确认模态窗口
    this.showModal('deleteSyntaxModal');
    
    // 绑定确认删除按钮（每次重新绑定以确保引用最新的syntax）
    const confirmBtn = document.querySelector('[data-action="delete-syntax"]');
    const newConfirmBtn = confirmBtn?.cloneNode(true);
    if (confirmBtn && newConfirmBtn && confirmBtn.parentNode) {
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      newConfirmBtn.addEventListener('click', async () => {
        this.hideModal('deleteSyntaxModal');
        await this.syntaxService.deleteSyntaxItem(syntax.id);
        await this.loadSyntaxLibrary();
        
        // 广播语法变更
        this.messageService.broadcastToTabs({
          action: 'syntaxChanged'
        });
        
        this.showNotification('语法已删除', 'success');
      });
    }
  }

  /**
   * 显示模态窗口
   */
  private showModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
    }
  }

  /**
   * 隐藏模态窗口
   */
  private hideModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab((tab as HTMLAnchorElement).getAttribute('href')?.substring(1) || '');
      });
    });
    
    // 设置开关
    document.querySelectorAll('#general .toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        const isActive = toggle.classList.contains('active');
        
        // 根据开关ID显示不同的通知
        const toggleId = toggle.id;
        let message = '设置已保存';
        
        if (toggleId === 'toggleSidebar') {
          message = `侧边栏已${isActive ? '启用' : '禁用'}`;
        } else if (toggleId === 'toggleGoogle') {
          message = `Google搜索支持已${isActive ? '启用' : '禁用'}`;
        } else if (toggleId === 'toggleBaidu') {
          message = `百度搜索支持已${isActive ? '启用' : '禁用'}`;
        } else if (toggleId === 'toggleBing') {
          message = `Bing搜索支持已${isActive ? '启用' : '禁用'}`;
        } else if (toggleId === 'toggleNewTab') {
          message = `新标签页打开已${isActive ? '启用' : '禁用'}`;
        }
        
        this.saveSettings();
        this.showNotification(message, isActive ? 'success' : 'info');
      });
    });
    
    // URL动作单选框
    document.querySelectorAll('input[name="urlClickAction"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const action = (document.getElementById('urlActionCopy') as HTMLInputElement)?.checked ? '复制' : '打开';
        this.saveSettings();
        this.showNotification(`URL点击动作已设置为：${action}`, 'success');
      });
    });
    
    // URL黑名单
    const blacklistTextarea = document.getElementById('urlBlacklist') as HTMLTextAreaElement;
    blacklistTextarea?.addEventListener('blur', () => {
      this.saveSettings(true);
    });
    
    // 语法搜索
    const searchInput = document.getElementById('syntaxSearch') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchSyntax((e.target as HTMLInputElement).value);
    });
    
    // 过滤条件
    const filterBuiltin = document.getElementById('filterBuiltin') as HTMLInputElement;
    const filterCustom = document.getElementById('filterCustom') as HTMLInputElement;
    filterBuiltin?.addEventListener('change', () => this.applyFilters());
    filterCustom?.addEventListener('change', () => this.applyFilters());
    
    // 添加自定义语法按钮
    const addBtn = document.getElementById('addCustomSyntax');
    addBtn?.addEventListener('click', () => this.showAddSyntaxDialog());
    
    // 清除所有自定义语法按钮 - 显示确认模态窗口
    const clearAllBtn = document.getElementById('clearAllSyntaxBtn');
    clearAllBtn?.addEventListener('click', () => this.showModal('clearAllSyntaxModal'));
    
    // 语法对话框按钮
    const closeSyntaxDialogBtns = document.querySelectorAll('[data-action="close"]');
    closeSyntaxDialogBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeSyntaxDialog());
    });
    
    const cancelSyntaxDialog = document.getElementById('cancelSyntaxDialog');
    cancelSyntaxDialog?.addEventListener('click', () => this.closeSyntaxDialog());
    
    const saveSyntax = document.getElementById('saveSyntax');
    saveSyntax?.addEventListener('click', () => this.saveSyntax());
    
    // 测试语法按钮
    const testSyntaxBtn = document.getElementById('testSyntaxBtn');
    testSyntaxBtn?.addEventListener('click', () => this.testSyntax());
    
    // 导出配置
    const exportBtn = document.getElementById('exportConfig');
    exportBtn?.addEventListener('click', () => this.exportConfig());
    
    // 导入配置 - label标签已经通过for属性关联了input，不需要手动绑定点击事件
    const importInput = document.getElementById('importConfigInput') as HTMLInputElement;
    importInput?.addEventListener('change', (e) => this.importConfig(e));
    
    // 重置设置 - 显示确认模态窗口
    const resetBtn = document.getElementById('resetSettings');
    resetBtn?.addEventListener('click', () => this.showModal('resetModal'));
    
    // 绑定所有模态窗口的关闭按钮
    document.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = (e.target as HTMLElement).closest('.modal-overlay');
        if (modal) {
          this.hideModal(modal.id);
        }
      });
    });
    
    // 重置设置确认
    document.querySelector('[data-action="reset-settings"]')?.addEventListener('click', async () => {
      this.hideModal('resetModal');
      await this.resetSettings();
    });
    
    // 清除所有自定义语法确认
    document.querySelector('[data-action="clear-all-syntax"]')?.addEventListener('click', async () => {
      this.hideModal('clearAllSyntaxModal');
      await this.clearAllCustomSyntax();
    });
    
    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    themeToggle?.addEventListener('click', () => this.toggleTheme());
    
    // 关注更新按钮 - 显示Star项目弹窗
    const starProjectLink = document.getElementById('starProjectLink');
    starProjectLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal('starProjectModal');
    });
    
    // Star项目确认按钮
    const confirmStarBtn = document.getElementById('confirmStarBtn');
    confirmStarBtn?.addEventListener('click', () => {
      const manifest = chrome.runtime.getManifest();
      if (manifest.homepage_url) {
        window.open(manifest.homepage_url, '_blank');
      }
      this.hideModal('starProjectModal');
    });
  }

  /**
   * 切换标签页
   */
  private switchTab(tabId: string): void {
    // 移除所有激活状态
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.classList.remove('tab-active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    
    // 激活当前标签
    const activeTab = document.querySelector(`a[href="#${tabId}"]`);
    activeTab?.classList.add('tab-active');
    
    const activeContent = document.getElementById(tabId);
    activeContent?.classList.remove('hidden');
  }

  /**
   * 应用过滤条件
   */
  private applyFilters(): void {
    const filterBuiltin = (document.getElementById('filterBuiltin') as HTMLInputElement)?.checked ?? true;
    const filterCustom = (document.getElementById('filterCustom') as HTMLInputElement)?.checked ?? true;
    
    const builtinContainer = document.getElementById('builtinSyntaxList');
    const customContainer = document.getElementById('customSyntaxList');
    
    // 控制容器显示/隐藏
    const builtinSection = builtinContainer?.closest('.glass-card') as HTMLElement;
    const customSection = customContainer?.closest('.glass-card') as HTMLElement;
    
    if (builtinSection) {
      builtinSection.style.display = filterBuiltin ? 'block' : 'none';
    }
    
    if (customSection) {
      customSection.style.display = filterCustom ? 'block' : 'none';
    }
    
    // 重新应用搜索（如果有搜索关键字）
    const searchInput = document.getElementById('syntaxSearch') as HTMLInputElement;
    if (searchInput?.value.trim()) {
      this.searchSyntax(searchInput.value);
    }
  }

  /**
   * 搜索语法
   */
  private searchSyntax(keyword: string): void {
    const filterBuiltin = (document.getElementById('filterBuiltin') as HTMLInputElement)?.checked ?? true;
    const filterCustom = (document.getElementById('filterCustom') as HTMLInputElement)?.checked ?? true;
    
    const builtinItems = document.querySelectorAll('#builtinSyntaxList .syntax-item');
    const customItems = document.querySelectorAll('#customSyntaxList .syntax-item');
    const searchResult = document.getElementById('searchResult');
    let visibleCount = 0;
    
    if (!keyword.trim()) {
      // 没有搜索关键字时，根据过滤条件显示/隐藏
      builtinItems.forEach(item => {
        (item as HTMLElement).style.display = filterBuiltin ? 'block' : 'none';
      });
      customItems.forEach(item => {
        (item as HTMLElement).style.display = filterCustom ? 'block' : 'none';
      });
      if (searchResult) {
        searchResult.style.display = 'none';
      }
      return;
    }
    
    const lowerKeyword = keyword.toLowerCase();
    
    // 搜索内置语法
    if (filterBuiltin) {
      builtinItems.forEach(item => {
        const name = item.querySelector('.syntax-name')?.textContent?.toLowerCase() || '';
        const template = item.querySelector('.syntax-template')?.textContent?.toLowerCase() || '';
        
        if (name.includes(lowerKeyword) || template.includes(lowerKeyword)) {
          (item as HTMLElement).style.display = 'block';
          visibleCount++;
        } else {
          (item as HTMLElement).style.display = 'none';
        }
      });
    } else {
      builtinItems.forEach(item => {
        (item as HTMLElement).style.display = 'none';
      });
    }
    
    // 搜索自定义语法
    if (filterCustom) {
      customItems.forEach(item => {
        const name = item.querySelector('.syntax-name')?.textContent?.toLowerCase() || '';
        const template = item.querySelector('.syntax-template')?.textContent?.toLowerCase() || '';
        
        if (name.includes(lowerKeyword) || template.includes(lowerKeyword)) {
          (item as HTMLElement).style.display = 'block';
          visibleCount++;
        } else {
          (item as HTMLElement).style.display = 'none';
        }
      });
    } else {
      customItems.forEach(item => {
        (item as HTMLElement).style.display = 'none';
      });
    }
    
    if (searchResult) {
      searchResult.style.display = 'block';
      const countSpan = searchResult.querySelector('.font-semibold');
      if (countSpan) {
        countSpan.textContent = visibleCount.toString();
      }
    }
  }

  /**
   * 显示添加语法对话框
   */
  private showAddSyntaxDialog(): void {
    const dialog = document.getElementById('syntaxFormModal');
    if (dialog) {
      // 更新标题
      const title = document.getElementById('syntaxFormTitle');
      if (title) title.textContent = '添加自定义语法';
      
      // 更新按钮
      const btnIcon = document.getElementById('syntaxBtnIcon');
      const btnText = document.getElementById('syntaxBtnText');
      if (btnIcon) btnIcon.className = 'fas fa-plus mr-2';
      if (btnText) btnText.textContent = '添加语法';
      
      // 清空表单
      (document.getElementById('syntaxId') as HTMLInputElement).value = '';
      (document.getElementById('syntaxName') as HTMLInputElement).value = '';
      (document.getElementById('syntaxContent') as HTMLTextAreaElement).value = '';
      
      // 重置风险等级
      (document.querySelector('input[name="riskLevel"][value="info"]') as HTMLInputElement).checked = true;
      
      // 重置搜索引擎
      (document.getElementById('engineGoogle') as HTMLInputElement).checked = true;
      (document.getElementById('engineBaidu') as HTMLInputElement).checked = false;
      (document.getElementById('engineBing') as HTMLInputElement).checked = false;
      
      // 重置语法状态
      (document.querySelector('input[name="syntaxStatus"][value="enabled"]') as HTMLInputElement).checked = true;
      
      dialog.style.display = 'flex';
      setTimeout(() => dialog.classList.add('show'), 10);
    }
  }

  /**
   * 关闭语法对话框
   */
  private closeSyntaxDialog(): void {
    const dialog = document.getElementById('syntaxFormModal');
    if (dialog) {
      dialog.classList.remove('show');
      setTimeout(() => {
        dialog.style.display = 'none';
      }, 300);
    }
  }

  /**
   * 保存语法
   */
  private async saveSyntax(): Promise<void> {
    const syntaxId = (document.getElementById('syntaxId') as HTMLInputElement)?.value || '';
    const nameInput = document.getElementById('syntaxName') as HTMLInputElement;
    const templateInput = document.getElementById('syntaxContent') as HTMLTextAreaElement;
    
    const name = nameInput?.value?.trim() || '';
    const template = templateInput?.value?.trim() || '';
    
    // 获取风险等级（单选按钮）
    const riskInput = document.querySelector('input[name="riskLevel"]:checked') as HTMLInputElement;
    const risk = (riskInput?.value || 'info') as 'info' | 'low' | 'medium' | 'high';
    
    // 获取搜索引擎
    const engineGoogle = (document.getElementById('engineGoogle') as HTMLInputElement)?.checked || false;
    const engineBaidu = (document.getElementById('engineBaidu') as HTMLInputElement)?.checked || false;
    const engineBing = (document.getElementById('engineBing') as HTMLInputElement)?.checked || false;
    
    // 获取语法状态
    const statusInput = document.querySelector('input[name="syntaxStatus"]:checked') as HTMLInputElement;
    const enabled = statusInput?.value === 'enabled';
    
    // 验证表单
    if (!name) {
      this.showNotification('请填写语法名称', 'error');
      return;
    }
    
    // 检查语法名称是否重复
    const library = await this.syntaxService.getSyntaxLibrary();
    const duplicateName = library.find(item => 
      item.name === name && item.id !== syntaxId
    );
    if (duplicateName) {
      this.showNotification(`语法名称"${name}"已存在，请使用其他名称`, 'error');
      return;
    }
    
    if (!template) {
      this.showNotification('请填写搜索语法', 'error');
      return;
    }
    
    // 检查搜索语法是否包含 site:{target_domain}
    if (!template.includes('site:{target_domain}')) {
      this.showNotification('搜索语法必须包含 site:{target_domain} 占位符', 'error');
      return;
    }
    
    if (!engineGoogle && !engineBaidu && !engineBing) {
      this.showNotification('至少选择一个搜索引擎', 'error');
      return;
    }
    
    // 构建engines数组
    const engines: SearchEngine[] = [];
    if (engineGoogle) engines.push('google');
    if (engineBaidu) engines.push('baidu');
    if (engineBing) engines.push('bing');
    
    const syntaxItem: SyntaxItem = {
      id: syntaxId || `custom_${Date.now()}`,
      name,
      template,
      risk,
      enabled,
      builtin: false,
      engines,
      engineSettings: {
        google: engineGoogle,
        baidu: engineBaidu,
        bing: engineBing
      }
    };
    
    if (syntaxId) {
      // 更新现有语法
      await this.syntaxService.updateSyntaxItem(syntaxItem);
      this.showNotification('语法已更新', 'success');
    } else {
      // 添加新语法
      await this.syntaxService.addCustomSyntax(syntaxItem);
      this.showNotification('语法已添加', 'success');
    }
    
    // 重新加载语法库
    await this.loadSyntaxLibrary();
    
    // 广播语法变更
    this.messageService.broadcastToTabs({
      action: 'syntaxChanged'
    });
    
    // 关闭对话框
    this.closeSyntaxDialog();
  }

  /**
   * 清除所有自定义语法
   */
  private async clearAllCustomSyntax(): Promise<void> {
    const library = await this.syntaxService.getSyntaxLibrary();
    const customSyntax = library.filter(item => !item.builtin);
    
    if (customSyntax.length === 0) {
      this.showNotification('没有自定义语法需要清除', 'info');
      return;
    }
    
    for (const syntax of customSyntax) {
      await this.syntaxService.deleteSyntaxItem(syntax.id);
    }
    
    // 重新加载语法库
    await this.loadSyntaxLibrary();
    
    // 广播语法变更
    this.messageService.broadcastToTabs({
      action: 'syntaxChanged'
    });
    
    this.showNotification(`已清除 ${customSyntax.length} 个自定义语法`, 'success');
  }

  /**
   * 测试语法
   */
  private testSyntax(): void {
    const template = (document.getElementById('syntaxContent') as HTMLTextAreaElement).value.trim();
    
    if (!template) {
      this.showNotification('请先填写搜索语法', 'error');
      return;
    }
    
    // 获取选中的搜索引擎
    const engineGoogle = (document.getElementById('engineGoogle') as HTMLInputElement)?.checked || false;
    const engineBaidu = (document.getElementById('engineBaidu') as HTMLInputElement)?.checked || false;
    const engineBing = (document.getElementById('engineBing') as HTMLInputElement)?.checked || false;
    
    if (!engineGoogle && !engineBaidu && !engineBing) {
      this.showNotification('请至少选择一个搜索引擎', 'error');
      return;
    }
    
    // 使用示例域名替换占位符
    const testQuery = template.replace(/{target_domain}/g, 'pa55w0rd.online');
    
    let openedCount = 0;
    
    // 为每个启用的搜索引擎打开测试标签页
    if (engineGoogle) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(testQuery)}`;
      window.open(searchUrl, '_blank');
      openedCount++;
    }
    
    if (engineBaidu) {
      const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(testQuery)}`;
      window.open(searchUrl, '_blank');
      openedCount++;
    }
    
    if (engineBing) {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(testQuery)}`;
      window.open(searchUrl, '_blank');
      openedCount++;
    }
    
    this.showNotification(`已在 ${openedCount} 个搜索引擎中打开测试`, 'success');
  }

  /**
   * 导出配置
   */
  private async exportConfig(): Promise<void> {
    const settings = await this.storageService.getSettings();
    const library = await this.syntaxService.getSyntaxLibrary();
    const theme = await this.storageService.getCurrentTheme();
    const userHasPreference = await this.storageService.getUserHasPreference();
    
    const config = {
      version: chrome.runtime.getManifest().version,
      exportDate: new Date().toISOString(),
      settings,
      syntaxLibrary: library,
      themeSettings: {
        currentTheme: theme || 'light',
        userHasPreference: userHasPreference || false
      }
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-hacking-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('配置已导出', 'success');
  }

  /**
   * 导入配置
   */
  private async importConfig(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    // 立即重置文件输入，防止重复触发
    input.value = '';
    
    if (!file) {
      return;
    }
    
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      // 填充导入预览信息
      await this.fillImportPreview(config);
      
      // 显示导入确认模态窗口
      this.showModal('importConfirmModal');
      
      // 绑定确认导入按钮
      const confirmBtn = document.querySelector('[data-action="confirm-import"]');
      const newConfirmBtn = confirmBtn?.cloneNode(true);
      if (confirmBtn && newConfirmBtn && confirmBtn.parentNode) {
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', async () => {
          this.hideModal('importConfirmModal');
          
          try {
            // 获取自定义语法处理模式
            const modeInput = document.querySelector('input[name="customSyntaxMode"]:checked') as HTMLInputElement;
            const customMode = modeInput?.value || 'append';
            
            // 导入设置
            if (config.settings) {
              await this.storageService.set({ searchHackingSettings: config.settings });
            }
            
            // 导入语法库 - 根据模式处理
            if (config.syntaxLibrary) {
              await this.importSyntaxLibrary(config.syntaxLibrary, customMode);
            }
            
            // 导入主题设置
            if (config.themeSettings) {
              await this.storageService.set({
                currentTheme: config.themeSettings.currentTheme,
                userHasPreference: config.themeSettings.userHasPreference
              });
            }
            
            // 重新加载页面
            await this.init();
            
            this.showNotification('配置已导入', 'success');
          } catch (importError) {
            console.error('导入配置时出错:', importError);
            this.showNotification('导入配置时出错', 'error');
          }
        });
      }
    } catch (error) {
      console.error('导入配置失败:', error);
      this.showNotification('导入配置失败，请检查文件格式', 'error');
    }
  }

  /**
   * 填充导入预览信息
   */
  private async fillImportPreview(config: any): Promise<void> {
    const overviewEl = document.getElementById('importOverview');
    const builtinInfoEl = document.getElementById('builtinSyntaxInfo');
    const customInfoEl = document.getElementById('customSyntaxInfo');
    
    if (!overviewEl) return;
    
    // 解析配置信息
    const hasSettings = !!config.settings;
    const hasTheme = !!config.themeSettings;
    const syntaxLibrary = config.syntaxLibrary || [];
    const builtinSyntax = syntaxLibrary.filter((s: any) => s.builtin);
    const customSyntax = syntaxLibrary.filter((s: any) => !s.builtin);
    
    // 获取当前语法库信息
    const currentLibrary = await this.syntaxService.getSyntaxLibrary();
    const currentCustom = currentLibrary.filter(s => !s.builtin);
    
    // 填充概览
    overviewEl.innerHTML = `
      <p>• 配置文件版本：${config.version || '未知'}</p>
      <p>• 导出时间：${config.exportDate ? new Date(config.exportDate).toLocaleString('zh-CN') : '未知'}</p>
      <p>• 包含基本设置：${hasSettings ? '✓ 是' : '✗ 否'}</p>
      <p>• 包含主题设置：${hasTheme ? '✓ 是' : '✗ 否'}</p>
      <p>• 总语法数量：${syntaxLibrary.length} 条</p>
    `;
    
    // 填充内置语法信息
    if (builtinInfoEl) {
      const builtinCount = builtinSyntax.length;
      builtinInfoEl.innerHTML = `• 发现 <span class="font-medium">${builtinCount}</span> 条内置语法配置，将更新其开关状态`;
    }
    
    // 填充自定义语法信息
    if (customInfoEl) {
      customInfoEl.innerHTML = `
        <p>• 当前自定义语法：<span class="font-medium">${currentCustom.length}</span> 条</p>
        <p>• 导入自定义语法：<span class="font-medium">${customSyntax.length}</span> 条</p>
        <p class="mt-2 text-orange-800">
          <strong>追加模式：</strong>最终将有 ${Math.max(currentCustom.length, customSyntax.length)} 到 ${currentCustom.length + customSyntax.length} 条自定义语法<br>
          <strong>覆盖模式：</strong>最终将有 ${customSyntax.length} 条自定义语法
        </p>
      `;
    }
  }

  /**
   * 导入语法库
   */
  private async importSyntaxLibrary(importedLibrary: any[], mode: string): Promise<void> {
    const currentLibrary = await this.syntaxService.getSyntaxLibrary();
    
    // 分离内置和自定义语法
    const currentBuiltin = currentLibrary.filter(item => item.builtin);
    const currentCustom = currentLibrary.filter(item => !item.builtin);
    const importedBuiltin = importedLibrary.filter((item: any) => item.builtin);
    const importedCustom = importedLibrary.filter((item: any) => !item.builtin);
    
    // 更新内置语法的状态（保留原有语法，只更新开关状态）
    const builtinMap = new Map();
    currentBuiltin.forEach(item => builtinMap.set(item.id, item));
    
    importedBuiltin.forEach((imported: any) => {
      const existing = builtinMap.get(imported.id);
      if (existing) {
        // 只更新启用状态和引擎设置
        existing.enabled = imported.enabled ?? existing.enabled;
        existing.engineSettings = imported.engineSettings ?? existing.engineSettings;
        existing.engines = imported.engines ?? existing.engines;
      }
    });
    
    // 处理自定义语法
    let finalCustom: any[] = [];
    
    if (mode === 'append') {
      // 追加模式：合并，相同ID跳过
      const customMap = new Map();
      currentCustom.forEach(item => customMap.set(item.id, item));
      importedCustom.forEach((item: any) => {
        if (!customMap.has(item.id)) {
          customMap.set(item.id, item);
        }
      });
      finalCustom = Array.from(customMap.values());
    } else {
      // 覆盖模式：使用导入的语法
      finalCustom = importedCustom;
    }
    
    // 合并最终语法库
    const mergedLibrary = [...Array.from(builtinMap.values()), ...finalCustom];
    await this.storageService.set({ syntaxLibrary: mergedLibrary });
  }

  /**
   * 重置设置
   */
  private async resetSettings(): Promise<void> {
    const response = await this.messageService.sendMessage({
      action: 'resetSettings'
    });
    
    if (response?.success) {
      await this.init();
      this.showNotification('设置已重置', 'success');
    }
  }

  /**
   * 切换主题
   */
  private async toggleTheme(): Promise<void> {
    const currentTheme = await this.themeService.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    await this.storageService.set({
      currentTheme: newTheme,
      userHasPreference: true
    });
    
    document.body.setAttribute('data-theme', newTheme);
    
    // 更新主题切换按钮图标
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    
    this.showNotification(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`, 'success');
  }

  /**
   * 显示通知
   */
  private showNotification(message: string, type: 'success' | 'info' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translate(-50%, -30px)';
      notification.style.transition = 'all 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// 初始化
const optionsManager = new OptionsManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => optionsManager.init());
} else {
  optionsManager.init();
}

