/**
 * Google Hacking 助手 - 弹出页面脚本
 * 提供打开选项页面的入口和控制侧边栏显示
 */

// --- 移除整个第一个 DOMContentLoaded 监听器 ---
/*
document.addEventListener('DOMContentLoaded', () => {
  // 设置标题
  document.querySelector('h1').textContent = "Google Hacking 助手";
  
  // 设置开关标签
  document.querySelector('.setting-label').textContent = "侧边栏显示";
  
  // 加载设置
  loadSettings();
  
  // 绑定事件
  bindEvents();
});
*/

// --- 语言和国际化代码 (这些也未被使用，可以考虑移除) ---
/*
const popup_i18n = {
    zh: {
        popupTitle: "Google Hacking 助手",
        toggleLabel: "侧边栏显示",
        popupDescription: "管理您的 Google Hacking 按钮和设置。",
        openOptions: "打开详细设置"
    },
    en: {
        popupTitle: "Google Hacking Helper",
        toggleLabel: "Show Sidebar",
        popupDescription: "Manage your Google Hacking buttons and settings.",
        openOptions: "Open Settings"
    }
};

let currentPopupLanguage = 'en'; // 默认语言

function getPopupText(key) {
    return popup_i18n[currentPopupLanguage]?.[key] || popup_i18n['en'][key] || key;
}

function updatePopupUITexts() {
    console.log("Popup 更新 UI 文本，语言:", currentPopupLanguage);
    document.getElementById('popupTitle').textContent = getPopupText('popupTitle');
    document.getElementById('toggleLabel').textContent = getPopupText('toggleLabel');
    document.getElementById('popupDescription').textContent = getPopupText('popupDescription');
    document.getElementById('openOptions').textContent = getPopupText('openOptions');
}
*/

// 监听来自options页面的设置更新消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsUpdated' && message.setting.key === 'extensionEnabled') {
    const toggleSidebar = document.getElementById('toggleSidebar');
    if (toggleSidebar) {
      toggleSidebar.checked = message.setting.value;
    }
    // 可以选择性地发送响应，但通常popup间的简单状态同步不需要
    // sendResponse({status: "Popup received update"}); 
  }
});

// DOMContentLoaded 监听器
document.addEventListener('DOMContentLoaded', function() {
  // 设置静态文本 (如果 HTML 中没有)
  const popupTitle = document.querySelector('h1');
  if (popupTitle && !popupTitle.textContent) {
      popupTitle.textContent = "Google Hacking 助手";
  }
  const toggleLabel = document.querySelector('.setting-label');
  if (toggleLabel && !toggleLabel.textContent) {
      toggleLabel.textContent = "启用侧边栏";
  }

  // 获取开关元素
  const toggleSidebar = document.getElementById('toggleSidebar');
  if (!toggleSidebar) {
      console.error("无法找到侧边栏开关元素 #toggleSidebar"); // 保留错误
      return;
  }
  
  // 加载并设置初始开关状态
  chrome.storage.local.get(['extensionEnabled'], function(result) {
    if (chrome.runtime.lastError) {
        console.error("加载扩展状态失败:", chrome.runtime.lastError); // 保留错误
        // 可以考虑设置一个默认值或显示错误状态
        toggleSidebar.checked = true; // 默认启用
        toggleSidebar.disabled = true; // 出错时禁用开关?
        return;
    }
    // console.log('加载扩展状态:', result); // 移除日志
    toggleSidebar.checked = result.extensionEnabled !== false; // 默认为 true
    // console.log('设置开关状态为:', toggleSidebar.checked); // 移除日志
  });

  // 设置开关事件监听器
  toggleSidebar.addEventListener('change', function() {
    const isEnabled = this.checked;
    // console.log('开关状态改变为:', isEnabled); // 移除日志
    
    // 保存设置
    chrome.storage.local.set({ extensionEnabled: isEnabled }, function() {
       if (chrome.runtime.lastError) {
           console.error("保存扩展状态失败:", chrome.runtime.lastError); // 保留错误
           // 可以在此处向用户显示错误提示
           return;
       }
       
       // 通知所有 Google 搜索内容脚本 (简化通知逻辑)
       chrome.tabs.query({ url: "*://*.google.com/search?*" }, function(tabs) {
           if (chrome.runtime.lastError) {
               console.error("查询 Google 搜索标签页失败:", chrome.runtime.lastError); // 保留错误
               return;
           }
           tabs.forEach(tab => {
               chrome.tabs.sendMessage(tab.id, { 
                   action: 'settingsUpdated',
                   setting: { key: 'extensionEnabled', value: isEnabled }
               }, (response) => {
                   if (chrome.runtime.lastError) {
                       // 忽略错误 (标签页可能关闭或脚本未注入)
                       // console.warn(`发送消息到标签页 ${tab.id} 失败:`, chrome.runtime.lastError.message);
                   }
               });
           });
       });

       // 通知选项页面 (如果打开了)
       chrome.runtime.sendMessage({ 
         action: 'settingsUpdated',
         setting: { key: 'extensionEnabled', value: isEnabled }
       }, (response) => {
           if (chrome.runtime.lastError) {
               // 忽略错误，选项页可能未打开
           }
       });
    });
  });

  // 设置打开选项页面的按钮
  const openOptionsButton = document.getElementById('openOptions');
  if (openOptionsButton) {
    openOptionsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  } else {
      console.error("无法找到打开选项按钮 #openOptions"); // 保留错误
  }

  // 设置GitHub链接
  const githubLink = document.getElementById('githubLink');
  if (githubLink) {
    try {
        const manifest = chrome.runtime.getManifest();
        if (manifest.homepage_url) {
             githubLink.href = manifest.homepage_url;
        } else {
             console.warn("Manifest 中未找到 homepage_url"); // 保留警告
             githubLink.href = '#'; // 提供一个无效链接作为后备
        }
    } catch (e) {
        console.error("无法读取 manifest 获取 homepage_url:", e); // 保留错误
        githubLink.href = '#';
    }
  } else {
      console.warn("无法找到 GitHub 链接元素 #githubLink"); // 保留警告
  }
}); 