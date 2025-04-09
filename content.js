/**
 * Google Hacking 助手 - 内容脚本
 * 在Google搜索页面动态插入Google Hacking语法，提供一键触发高级搜索语法功能
 */

// 全局变量存储设置和语法
let extensionEnabled = true;
let linkTargetPreference = '_self';
let activeButtons = []; // 存储从后台获取的活动语法
let panelExistsOnPage = false; // 新增：跟踪面板是否已插入

/**
 * 注入 CSS 样式
 */
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* 面板容器 */
        .ghacking-panel-container {
             /* Mimic Sider Style */
             background-color: transparent;
             border: 1px solid #e0e0e0;
             padding: 16px;
            border-radius: 8px;
             width: 280px;
             z-index: 1000;
             position: fixed;
             right: 20px;
             top: 80px;
             margin-bottom: 16px;
             max-height: 80vh;
             overflow-y: auto;
             display: block;
        }
        
        /* 标题区域 */
          .ghacking-panel-title {
             padding: 0 0 10px 0;
            font-size: 14px;
            font-weight: 500;
             color: #202124;
             border-bottom: 1px solid #ebebeb;
             margin-bottom: 12px;
        }
        
        /* 语法容器 */
        .ghacking-buttons-container {
             display: flex;
             flex-wrap: wrap;
             overflow-x: hidden;
           overflow-y: auto;
           gap: 8px;
             margin-bottom: 12px;
        }

        /* 单个语法 */
        .ghacking-button {
             padding: 6px 10px;
             background-color: #f8f9fa;
             color: #3c4043;
             border: 1px solid #dadce0;
             border-radius: 4px;
            cursor: pointer;
             font-size: 12px;
             transition: background-color 0.2s ease, border-color 0.2s ease;
            text-align: center;
            min-width: 80px;
             white-space: nowrap;
             overflow: hidden;
             text-overflow: ellipsis;
             flex-shrink: 0;
             max-width: 230px;
        }
        .ghacking-button:hover {
             background-color: #f1f3f4;
             border-color: #bdc1c6;
         }
         /* 不同风险等级 */
         .ghacking-button-high { background-color: #fce8e6; color: #c5221f; border-color: #f7c4c1; }
         .ghacking-button-high:hover { background-color: #f9bdbb; border-color: #ea8685; }
         .ghacking-button-medium { background-color: #feefc3; color: #a95f00; border-color: #fdd663; }
         .ghacking-button-medium:hover { background-color: #fce499; border-color: #fcc934; }
         .ghacking-button-info { background-color: #e6f4ea; color: #188038; border-color: #b7e1c1; }
         .ghacking-button-info:hover { background-color: #a8dab5; border-color: #81c995; }
         .ghacking-button-default { background-color: #f8f9fa; color: #3c4043; border-color: #dadce0; }
         .ghacking-button-default:hover { background-color: #f1f3f4; border-color: #bdc1c6; }

        /* 底部链接区域 */
         .ghacking-panel-footer {
             padding-top: 12px;
             border-top: 1px solid #ebebeb;
             margin-top: 12px;
             font-size: 12px;
             text-align: center;
         }
         .ghacking-panel-version {
             color: #5f6368;
         }
         .ghacking-panel-version a {
             color: #1a73e8;
             text-decoration: none;
         }
         .ghacking-panel-version a:hover {
             text-decoration: underline;
         }

         /* Alert Styles */
         .ghacking-alert {
             position: fixed;
             top: 20px;
             left: 50%;
             transform: translateX(-50%);
             background-color: #fff;
             padding: 15px 25px;
             border: 1px solid #ccc;
             box-shadow: 0 2px 10px rgba(0,0,0,0.2);
             z-index: 10000;
             border-radius: 5px;
             display: flex;
             align-items: center;
             gap: 15px;
             font-family: 'Roboto', sans-serif;
         }
         .ghacking-alert-content {
             color: #333;
         }
         .ghacking-alert-button {
             padding: 5px 10px;
             border: 1px solid #ccc;
             background-color: #f0f0f0;
             cursor: pointer;
             border-radius: 3px;
         }
         .ghacking-alert-button:hover {
             background-color: #e0e0e0;
         }
    `;
    document.head.appendChild(style);
}

/**
 * 主函数 - 初始化内容脚本逻辑
 */
async function init() {
  injectStyles(); // 注入样式表

  // 首次加载设置
  await loadExtensionSettings();

  // 初始化 MutationObserver - 主要用于检测面板是否被意外移除
  const observer = new MutationObserver((mutations) => {
    // 如果扩展启用且页面符合条件，但面板不在页面上，则尝试重新插入
    if (extensionEnabled && isGoogleSearchPage() && hasValidSiteQuery() && !document.querySelector('.ghacking-panel-container')) {
        if (panelExistsOnPage) { // 只有当面板之前存在过才记录是重新插入
             console.log("Panel removed by page mutation, re-inserting...");
        }
        // 尝试重新加载数据并插入。这里不直接插入，而是走标准流程
        // 以确保数据是最新的。
        loadActiveButtonsAndUpdatePanel(); 
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 监听 storage 变化 - 这是数据更新的主要来源
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
      console.log("Storage change detected in content script:", Object.keys(changes));
      let needsPanelUpdate = false;
      
      if (changes.extensionEnabled) {
        const newState = changes.extensionEnabled.newValue;
        console.log("Extension enabled state changed to:", newState);
        if (newState !== extensionEnabled) {
            extensionEnabled = newState;
            if (!extensionEnabled) {
              removePanel(); // 禁用时立即移除
            } else {
              // 启用时，检查是否需要显示面板（可能页面已加载完成）
              ensurePanelExistsIfNeeded(); 
            }
        } // 如果状态没变，则不需要更新
      }
      
      if (changes.linkTargetPreference) {
        linkTargetPreference = changes.linkTargetPreference.newValue;
        console.log("Link target preference changed to:", linkTargetPreference);
        // 链接目标改变不影响面板显示，无需更新
      }
      
      // 只有当按钮列表变化，并且扩展是启用状态时，才标记需要更新面板
      if (changes.defaultButtons || changes.customButtons) {
        console.log("Button list changed in storage.");
        if (extensionEnabled) {
             needsPanelUpdate = true;
        }
      }

      // 如果标记了需要更新面板 (由于按钮列表变化且扩展启用)
      if (needsPanelUpdate) {
          console.log("Reloading active buttons and updating panel due to storage change.");
          await loadActiveButtonsAndUpdatePanel(); // 异步加载并更新
      }
    }
  });

  // 初始检查页面状态并决定是否显示面板
  ensurePanelExistsIfNeeded();
}

/**
 * 加载扩展设置 (启用状态, 链接打开方式)
 */
async function loadExtensionSettings() {
  try {
    const result = await chrome.storage.local.get([
      'extensionEnabled',
      'linkTargetPreference'
    ]);
    extensionEnabled = typeof result.extensionEnabled === 'undefined' ? true : result.extensionEnabled;
    linkTargetPreference = result.linkTargetPreference || '_self';
    console.log("Initial settings loaded:", { extensionEnabled, linkTargetPreference });
  } catch (error) {
      console.error("加载扩展设置失败:", error);
      // 设置默认值以防出错
      extensionEnabled = true;
      linkTargetPreference = '_self';
  }
}

/**
 * 加载活动语法并更新面板 - 关键函数
 * 应该只在需要更新面板内容时调用 (初始化, 按钮存储变化, 启用扩展)
 */
async function loadActiveButtonsAndUpdatePanel() {
    // 仅在扩展启用且页面符合条件时才真正执行加载和更新
    if (!extensionEnabled || !isGoogleSearchPage() || !hasValidSiteQuery()) {
        console.log("Conditions not met for loading/updating panel, ensuring it's removed.");
        removePanel();
        return;
    }

    console.log("Requesting active buttons from background...");
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveButtons' });
        if (response && response.success && response.data) {
            // TODO: 可以增加检查，如果 activeButtons 数据与上次相同，则不更新 DOM
            // let oldButtonJson = JSON.stringify(activeButtons);
            // let newButtonJson = JSON.stringify(response.data);
            // if(oldButtonJson === newButtonJson && panelExistsOnPage) {
            //     console.log("Active buttons data hasn't changed, skipping DOM update.");
            //     return;
            // }
            
            activeButtons = response.data;
            console.log("Active buttons loaded:", activeButtons.length);
            insertOrUpdatePanel(); // 调用插入或更新面板的函数
            
        } else {
            console.error('加载活动语法失败:', response);
            activeButtons = []; // 清空语法
            removePanel(); // 加载失败则移除面板
        }
    } catch (error) {
        console.error("请求活动语法时出错:", error);
        activeButtons = [];
        removePanel();
    }
}

/**
 * 检查页面条件，如果满足条件且面板不存在，则触发加载和插入流程
 */
function ensurePanelExistsIfNeeded() {
  if (extensionEnabled && isGoogleSearchPage() && hasValidSiteQuery()) {
    // 条件满足
    if (!document.querySelector('.ghacking-panel-container')) {
        console.log("Conditions met and panel not found, initiating panel insertion.");
        loadActiveButtonsAndUpdatePanel(); // 触发加载和插入
    } else {
        // 面板已存在，正常情况不需要做什么，除非需要强制刷新
        console.log("Conditions met and panel already exists.");
        panelExistsOnPage = true; // 确保状态正确
    }
  } else {
    // 条件不满足，确保移除面板
    console.log("Conditions not met for panel, ensuring removal.");
    removePanel();
  }
}

/**
 * 检查当前是否为Google搜索结果页面
 * @returns {boolean} 是否为Google搜索结果页面
 */
function isGoogleSearchPage() {
  return window.location.hostname.includes('google.') && window.location.pathname.includes('/search');
}

/**
 * 检查URL查询参数中是否包含有效的site:查询
 * @returns {boolean} 是否包含有效的site:查询
 */
function hasValidSiteQuery() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q');
  // 修正正则：确保转义正确
  return query && /site:(?:https?:\/\/)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/.test(query);
}

/**
 * 从当前URL的查询参数中提取 target_domain
 * @returns {string | null} 提取到的域名，或 null
 */
function getTargetDomain() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q');
  if (query) {
    // 修正正则：确保转义正确
    const match = query.match(/site:(?:https?:\/\/)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * 移除注入的面板
 */
function removePanel() {
  const panel = document.querySelector('.ghacking-panel-container');
  if (panel) {
    console.log("Removing Hacking Panel");
    panel.remove();
    panelExistsOnPage = false; // 更新状态
  }
}

/**
 * 核心函数：在页面上插入或更新面板
 */
function insertOrUpdatePanel() {
  if (!activeButtons || activeButtons.length === 0) {
    console.log("No active buttons to display, removing panel if exists.");
    removePanel();
    return;
  }

  let panel = document.querySelector('.ghacking-panel-container');
  let buttonsContainer;

  if (!panel) {
    console.log("Creating and inserting Hacking Panel to body.");
    // --- 创建面板 --- 
    panel = document.createElement('div');
    panel.className = 'ghacking-panel-container';
    // CSS 已设置 position:fixed, right, top，直接添加到 body
    document.body.appendChild(panel);

    // --- 创建标题 --- 
    const title = document.createElement('div');
    title.className = 'ghacking-panel-title';
    title.textContent = 'Google Hacking 助手';
    panel.appendChild(title);

    // --- 创建按钮容器 --- 
    buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'ghacking-buttons-container';
    panel.appendChild(buttonsContainer);

    // --- 创建底部信息 --- 
    const footer = document.createElement('div');
    footer.className = 'ghacking-panel-footer';
    const versionSpan = document.createElement('span');
    versionSpan.className = 'ghacking-panel-version';
    try {
        const manifest = chrome.runtime.getManifest();
        const githubUrl = manifest.homepage_url || '#';
        versionSpan.innerHTML = `版本: ${manifest.version} | <a href="${githubUrl}" target="_blank">GitHub</a>`;
    } catch(e) {
        console.error("获取 Manifest 失败:", e);
        versionSpan.textContent = '无法加载版本信息';
    }
    footer.appendChild(versionSpan);
    panel.appendChild(footer);
    
  } else {
    console.log("Updating existing Hacking Panel.");
    // 面板已存在，获取按钮容器并清空
    buttonsContainer = panel.querySelector('.ghacking-buttons-container');
    buttonsContainer.innerHTML = ''; // 清空现有按钮
  }

  // --- 填充按钮 --- 
  activeButtons.forEach(button => {
      const buttonElement = createButtonElement(button);
      buttonsContainer.appendChild(buttonElement);
  });

  // 在函数末尾更新面板存在状态
  panelExistsOnPage = true;
}

/**
 * 创建单个语法按钮元素
 * @param {object} button 按钮数据
 * @returns {HTMLElement} 按钮元素
 */
function createButtonElement(button) {
  const buttonElement = document.createElement('button');
  buttonElement.className = `ghacking-button ghacking-button-${button.riskLevel || 'default'}`;
  buttonElement.textContent = button.name;
  buttonElement.title = button.syntax; // 鼠标悬停显示完整语法
  buttonElement.dataset.syntax = button.syntax; // 存储语法供点击事件使用
  buttonElement.addEventListener('click', () => executeHackingSearch(button));
  return buttonElement;
}

/**
 * 执行 Google Hacking 搜索
 * @param {object} button 被点击的按钮数据
 */
async function executeHackingSearch(button) {
  const targetDomain = getTargetDomain();
  if (!targetDomain) {
    console.error("无法从当前URL提取目标域名。");
    showAlert('错误：无法从当前URL提取目标域名');
    return;
  }

  // 替换占位符
  const finalSyntax = button.syntax.replace(/\{target_domain\}/g, targetDomain);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(finalSyntax)}`;

  console.log(`执行搜索: ${finalSyntax}`);

  // 根据用户偏好打开链接
  if (linkTargetPreference === '_blank') {
    window.open(searchUrl, '_blank');
  } else {
    window.location.href = searchUrl;
  }
}

/**
 * 显示简单的 alert 提示 (可以改进为更友好的 UI)
 * @param {string} message 
 */
function showAlert(message) {
  // 可以替换为更美观的提示框实现
  alert(message);
}

// 启动脚本
init(); 