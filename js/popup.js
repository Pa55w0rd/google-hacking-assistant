// 默认设置
const defaultSettings = {
  sidebarEnabled: true,
  googleEnabled: true,
  baiduEnabled: false,
  bingEnabled: false
};

// 保存设置到Chrome存储
function saveSettings() {
  const settings = {
    sidebarEnabled: document.getElementById('sidebarToggle').classList.contains('active'),
    googleEnabled: document.getElementById('googleToggle').classList.contains('active'),
    baiduEnabled: document.getElementById('baiduToggle').classList.contains('active'),
    bingEnabled: document.getElementById('bingToggle').classList.contains('active')
  };
  
  chrome.storage.local.set({searchHackingSettings: settings}, function() {
    console.log('设置已保存');
    
    // 广播设置变更消息，实现实时同步
    chrome.runtime.sendMessage({
      action: 'settingsChanged',
      settings: settings
    });
  });
}

// 应用设置到UI
function applySettings(settings) {
  // 侧边栏开关
  document.getElementById('sidebarToggle').classList.toggle('active', settings.sidebarEnabled !== false);
  
  // Google开关
  document.getElementById('googleToggle').classList.toggle('active', settings.googleEnabled !== false);
  
  // 百度开关
  document.getElementById('baiduToggle').classList.toggle('active', settings.baiduEnabled !== false);
  
  // Bing开关
  document.getElementById('bingToggle').classList.toggle('active', settings.bingEnabled !== false);
}

// 加载设置
function loadSettings() {
  chrome.storage.local.get('searchHackingSettings', function(result) {
    const settings = result.searchHackingSettings || defaultSettings;
    applySettings(settings);
  });
}

// 加载清单信息
function loadManifestInfo() {
  const manifest = chrome.runtime.getManifest();
  
  // 更新HTML中的版本号
  const versionElement = document.querySelector('.version-text');
  if (versionElement) {
    versionElement.textContent = manifest.version;
  }
  
  // 设置GitHub链接
  const githubLink = manifest.homepage_url;
  const githubElement = document.querySelector('#githubLink');
  if (githubElement && githubLink) {
    githubElement.href = githubLink;
  }
  
  // 设置反馈链接
  const feedbackLink = `${githubLink}/issues/new`;
  const feedbackElement = document.querySelector('#feedbackLink');
  if (feedbackElement) {
    feedbackElement.href = feedbackLink;
  }
}

// 切换开关状态并保存
function toggleSetting(elementId) {
  document.getElementById(elementId).addEventListener('click', function() {
    this.classList.toggle('active');
    saveSettings();
  });
}

// 监听来自options页面的设置变更消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('收到消息:', request);
  
  if (request.action === 'settingsChanged') {
    console.log('接收到设置变更:', request.settings);
    // 应用新的设置到UI
    applySettings(request.settings);
  }
  
  // 返回true表示异步处理消息
  return true;
});

// 监听存储变更事件，作为备用同步机制
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.searchHackingSettings) {
    console.log('存储中的设置已变更:', changes.searchHackingSettings.newValue);
    // 应用新的设置到UI
    applySettings(changes.searchHackingSettings.newValue);
  }
});

// 事件监听器
document.addEventListener('DOMContentLoaded', function() {
  // 初始化主题管理器
  if (typeof window.themeManager !== 'undefined') {
    try {
      window.themeManager.init();
      console.log('弹出窗口主题管理器初始化完成');
    } catch (error) {
      console.warn('弹出窗口主题管理器初始化失败:', error);
    }
  }
  
  // 加载设置和清单信息
  loadSettings();
  loadManifestInfo();
  
  // 绑定开关事件
  toggleSetting('sidebarToggle');
  toggleSetting('googleToggle');
  toggleSetting('baiduToggle');
  toggleSetting('bingToggle');
  
  // 打开设置页面
  document.getElementById('openOptions').addEventListener('click', function() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
}); 