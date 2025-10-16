/**
 * 弹出窗口脚本
 */

import { StorageService } from '../services/StorageService';
import { MessageService } from '../services/MessageService';
import { ThemeService } from '../services/ThemeService';

const storageService = StorageService.getInstance();
const messageService = MessageService.getInstance();
const themeService = ThemeService.getInstance();

/**
 * 初始化弹出窗口
 */
async function initPopup(): Promise<void> {
  // 应用主题
  const theme = await themeService.getCurrentTheme();
  document.body.setAttribute('data-theme', theme);
  
  // 加载设置
  let currentSettings = await storageService.getSettings();
  
  if (!currentSettings) {
    console.error('无法加载设置');
    return;
  }
  
  // 设置所有开关状态
  updateToggleStates(currentSettings);
  
  // 监听设置变化（实现跨页面同步）
  setupStorageListener(currentSettings);
  
  // 获取开关元素
  const sidebarToggle = document.getElementById('toggleSidebar') as HTMLElement;
  const googleToggle = document.getElementById('googleToggle') as HTMLElement;
  const baiduToggle = document.getElementById('baiduToggle') as HTMLElement;
  const bingToggle = document.getElementById('bingToggle') as HTMLElement;
  
  // 绑定侧边栏开关事件
  sidebarToggle?.addEventListener('click', async () => {
    const isActive = sidebarToggle.classList.toggle('active');
    
    currentSettings = {
      ...currentSettings,
      sidebarEnabled: isActive
    } as any;
    
    await storageService.set({ searchHackingSettings: currentSettings });
    
    // 广播设置变更
    messageService.broadcastToTabs({
      action: 'settingsChanged',
      settings: currentSettings
    });
    
    showNotification(
      `侧边栏已${isActive ? '启用' : '禁用'}`,
      isActive ? 'success' : 'info'
    );
  });
  
  // 绑定Google开关事件
  googleToggle?.addEventListener('click', async () => {
    const isActive = googleToggle.classList.toggle('active');
    
    currentSettings = {
      ...currentSettings,
      googleEnabled: isActive
    } as any;
    
    await storageService.set({ searchHackingSettings: currentSettings });
    messageService.broadcastToTabs({
      action: 'settingsChanged',
      settings: currentSettings
    });
    
    showNotification(
      `Google搜索已${isActive ? '启用' : '禁用'}`,
      isActive ? 'success' : 'info'
    );
  });
  
  // 绑定百度开关事件
  baiduToggle?.addEventListener('click', async () => {
    const isActive = baiduToggle.classList.toggle('active');
    
    currentSettings = {
      ...currentSettings,
      baiduEnabled: isActive
    } as any;
    
    await storageService.set({ searchHackingSettings: currentSettings });
    messageService.broadcastToTabs({
      action: 'settingsChanged',
      settings: currentSettings
    });
    
    showNotification(
      `百度搜索已${isActive ? '启用' : '禁用'}`,
      isActive ? 'success' : 'info'
    );
  });
  
  // 绑定Bing开关事件
  bingToggle?.addEventListener('click', async () => {
    const isActive = bingToggle.classList.toggle('active');
    
    currentSettings = {
      ...currentSettings,
      bingEnabled: isActive
    } as any;
    
    await storageService.set({ searchHackingSettings: currentSettings });
    messageService.broadcastToTabs({
      action: 'settingsChanged',
      settings: currentSettings
    });
    
    showNotification(
      `Bing搜索已${isActive ? '启用' : '禁用'}`,
      isActive ? 'success' : 'info'
    );
  });
  
  // 打开设置页面按钮
  const openSettingsBtn = document.getElementById('openSettings');
  openSettingsBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'options.html' });
  });
  
  // 设置版本号和链接
  const manifest = chrome.runtime.getManifest();
  const versionElement = document.querySelector('.version-text');
  if (versionElement) {
    versionElement.textContent = manifest.version;
  }
  
  const githubLink = document.getElementById('githubLink') as HTMLAnchorElement;
  if (githubLink && manifest.homepage_url) {
    githubLink.href = manifest.homepage_url;
  }
  
  const feedbackLink = document.getElementById('feedbackLink') as HTMLAnchorElement;
  if (feedbackLink && manifest.homepage_url) {
    feedbackLink.href = `${manifest.homepage_url}/issues/new`;
  }
}

/**
 * 更新开关状态
 */
function updateToggleStates(settings: any): void {
  const sidebarToggle = document.getElementById('toggleSidebar') as HTMLElement;
  const googleToggle = document.getElementById('googleToggle') as HTMLElement;
  const baiduToggle = document.getElementById('baiduToggle') as HTMLElement;
  const bingToggle = document.getElementById('bingToggle') as HTMLElement;
  
  if (sidebarToggle) {
    if (settings.sidebarEnabled) {
      sidebarToggle.classList.add('active');
    } else {
      sidebarToggle.classList.remove('active');
    }
  }
  
  if (googleToggle) {
    if (settings.googleEnabled) {
      googleToggle.classList.add('active');
    } else {
      googleToggle.classList.remove('active');
    }
  }
  
  if (baiduToggle) {
    if (settings.baiduEnabled) {
      baiduToggle.classList.add('active');
    } else {
      baiduToggle.classList.remove('active');
    }
  }
  
  if (bingToggle) {
    if (settings.bingEnabled) {
      bingToggle.classList.add('active');
    } else {
      bingToggle.classList.remove('active');
    }
  }
}

/**
 * 监听存储变化，实现跨页面同步
 */
function setupStorageListener(currentSettings: any): void {
  storageService.onChanged((changes) => {
    if (changes.searchHackingSettings) {
      const newSettings = changes.searchHackingSettings.newValue;
      if (newSettings) {
        console.log('[弹出窗口] 检测到设置变化，更新UI');
        // 更新局部状态变量
        Object.assign(currentSettings, newSettings);
        updateToggleStates(currentSettings);
      }
    }
  });
}

/**
 * 显示通知
 */
function showNotification(message: string, type: 'success' | 'info' | 'error'): void {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 2秒后移除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translate(-50%, -30px)';
    notification.style.transition = 'all 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}

