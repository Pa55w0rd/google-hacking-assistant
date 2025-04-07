/**
 * Google Hacking 助手 - 弹出页面脚本
 * 提供打开选项页面的入口和控制侧边栏显示
 */

// DOMContentLoaded 监听器
document.addEventListener('DOMContentLoaded', function() {
  const toggleSidebar = document.getElementById('toggleSidebar');
  const openOptionsButton = document.getElementById('openOptions');
  const githubLink = document.getElementById('githubLink');

  if (!toggleSidebar) {
      console.error("无法找到侧边栏开关元素 #toggleSidebar");
      return;
  }
  
  // 加载并设置初始开关状态
  chrome.storage.local.get('extensionEnabled', function(result) {
    if (chrome.runtime.lastError) {
        console.error("加载扩展状态失败:", chrome.runtime.lastError);
        toggleSidebar.checked = true; // 默认启用
        toggleSidebar.disabled = true;
        return;
    }
    toggleSidebar.checked = result.extensionEnabled !== false;
  });

  // 设置开关事件监听器 - 直接修改 storage
  toggleSidebar.addEventListener('change', function() {
    const isEnabled = this.checked;
    chrome.storage.local.set({ extensionEnabled: isEnabled }, function() {
       if (chrome.runtime.lastError) {
           console.error("保存扩展状态失败:", chrome.runtime.lastError);
           // 可以在此处向用户显示错误提示，并恢复开关状态
           toggleSidebar.checked = !isEnabled;
           return;
       }
       console.log('扩展状态已保存:', isEnabled); // 确认保存成功
       // 不再需要手动发送消息
    });
  });

  // 设置打开选项页面的按钮
  if (openOptionsButton) {
    openOptionsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  } else {
      console.error("无法找到打开选项按钮 #openOptions");
  }

  // 设置GitHub链接
  if (githubLink) {
    try {
        const manifest = chrome.runtime.getManifest();
        if (manifest.homepage_url) {
             githubLink.href = manifest.homepage_url;
        } else {
             console.warn("Manifest 中未找到 homepage_url");
             githubLink.href = '#';
        }
    } catch (e) {
        console.error("无法读取 manifest 获取 homepage_url:", e);
        githubLink.href = '#';
    }
  } else {
      console.warn("无法找到 GitHub 链接元素 #githubLink");
  }

  // 监听 storage 变化，更新 Popup UI (可选但推荐，用于其他地方修改时的同步)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.extensionEnabled) {
      const newValue = changes.extensionEnabled.newValue;
      console.log('Storage change detected in popup: extensionEnabled', newValue);
      if (toggleSidebar.checked !== newValue) {
        toggleSidebar.checked = newValue;
      }
    }
  });

}); 