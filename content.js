/**
 * Google Hacking 助手 - 内容脚本
 * 在Google和百度搜索页面动态插入Hacking语法，提供一键触发高级搜索语法功能
 */

// 全局变量存储设置和语法
let extensionEnabled = true;
let linkTargetPreference = '_self';
let activeButtons = []; // 存储从后台获取的活动语法
let panelExistsOnPage = false; // 新增：跟踪面板是否已插入
let currentSearchEngine = ''; // 新增：当前搜索引擎类型 ('google' 或 'baidu')
let extractedUrls = []; // 新增：存储从搜索结果中提取的URL

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
             display: flex;
             justify-content: space-between;
             align-items: center;
        }
        
        /* 操作按钮 */
        .ghacking-action-button {
            font-size: 12px;
            padding: 4px 8px;
            background-color: #f0f0f0;
            border: 1px solid #dadce0;
            border-radius: 4px;
            cursor: pointer;
            color: #5f6368;
            display: flex;
            align-items: center;
            transition: all 0.2s ease;
            margin-left: 4px;
        }
        
        .ghacking-action-button:hover {
            background-color: #e8e8e8;
            color: #202124;
        }
        
        /* 移除复制域名按钮样式 */
        
        .ghacking-extract-urls::before {
            content: "🔗";
            margin-right: 4px;
            font-size: 12px;
        }
        
        .ghacking-copy-success {
            background-color: #e6f4ea !important;
            color: #188038 !important;
            border-color: #b7e1c1 !important;
        }
        
        /* 按钮容器 */
        .ghacking-action-buttons {
            display: flex;
        }
        
        /* URL提取面板 */
        .ghacking-url-panel {
            margin-top: 10px;
            border-top: 1px solid #ebebeb;
            padding-top: 10px;
            display: none;
        }
        
        .ghacking-url-panel.active {
            display: block;
        }
        
        .ghacking-url-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 500;
        }
        
        .ghacking-url-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #ebebeb;
            border-radius: 4px;
            padding: 8px;
            background-color: #f8f9fa;
            font-size: 12px;
        }
        
        .ghacking-url-item {
            margin-bottom: 6px;
            padding-bottom: 6px;
            border-bottom: 1px dashed #ebebeb;
            word-break: break-all;
            cursor: pointer;
            transition: background-color 0.2s;
            padding: 4px;
        }
        
        .ghacking-url-item:hover {
            background-color: #e8f0fe;
        }
        
        .ghacking-url-item:last-child {
            margin-bottom: 0;
            border-bottom: none;
        }
        
        .ghacking-url-actions {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
        }
        
        .ghacking-copy-all-urls {
            font-size: 12px;
            padding: 4px 8px;
            background-color: #f0f0f0;
            border: 1px solid #dadce0;
            border-radius: 4px;
            cursor: pointer;
            color: #5f6368;
        }
        
        .ghacking-copy-all-urls:hover {
            background-color: #e8e8e8;
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

  // 检测当前搜索引擎
  if (isGoogleSearchPage()) {
    currentSearchEngine = 'google';
  } else if (isBaiduSearchPage()) {
    currentSearchEngine = 'baidu';
  } else {
    currentSearchEngine = '';
  }

  // 首次加载设置
  await loadExtensionSettings();

  // 初始化 MutationObserver - 主要用于检测面板是否被意外移除
  const observer = new MutationObserver((mutations) => {
    // 如果扩展启用且页面符合条件，但面板不在页面上，则尝试重新插入
    if (extensionEnabled && isSearchPage() && hasValidSiteQuery() && !document.querySelector('.ghacking-panel-container')) {
        // 尝试重新加载数据并插入
        loadActiveButtonsAndUpdatePanel(); 
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 监听 storage 变化 - 这是数据更新的主要来源
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
      let needsPanelUpdate = false;
      
      if (changes.extensionEnabled) {
        const newState = changes.extensionEnabled.newValue;
        if (newState !== extensionEnabled) {
            extensionEnabled = newState;
            if (!extensionEnabled) {
              removePanel(); // 禁用时立即移除
            } else {
              // 启用时，检查是否需要显示面板（可能页面已加载完成）
              ensurePanelExistsIfNeeded(); 
            }
        }
      }
      
      if (changes.linkTargetPreference) {
        linkTargetPreference = changes.linkTargetPreference.newValue;
      }
      
      // 只有当按钮列表变化，并且扩展是启用状态时，才标记需要更新面板
      if ((changes.defaultButtons || changes.customButtons) && extensionEnabled) {
        needsPanelUpdate = true;
      }

      // 如果标记了需要更新面板 (由于按钮列表变化且扩展启用)
      if (needsPanelUpdate) {
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
    if (!extensionEnabled || !isSearchPage() || !hasValidSiteQuery()) {
        removePanel();
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveButtons' });
        if (response && response.success && response.data) {
            const allButtons = response.data;
            
            // 根据当前搜索引擎筛选支持的按钮
            activeButtons = allButtons.filter(button => {
                // 检查按钮是否支持当前搜索引擎
                const supportedEngines = button.supportedEngines || ['google']; // 默认只支持Google
                return supportedEngines.includes(currentSearchEngine);
            });
            
            // 更新面板
            insertOrUpdatePanel();
        } else {
            console.error("Failed to get active buttons:", response?.error || "Unknown error");
            removePanel();
        }
    } catch (error) {
        console.error("Error loading active buttons:", error);
        removePanel();
    }
}

/**
 * 确保面板在需要时存在
 */
function ensurePanelExistsIfNeeded() {
  if (extensionEnabled && isSearchPage() && hasValidSiteQuery()) {
    loadActiveButtonsAndUpdatePanel();
  } else {
    removePanel();
  }
}

/**
 * 检查当前是否为搜索结果页面（Google或百度）
 * @returns {boolean} 是否为搜索结果页面
 */
function isSearchPage() {
  return isGoogleSearchPage() || isBaiduSearchPage();
}

/**
 * 检查当前是否为Google搜索结果页面
 * @returns {boolean} 是否为Google搜索结果页面
 */
function isGoogleSearchPage() {
  return window.location.hostname.includes('google.') && window.location.pathname.includes('/search');
}

/**
 * 检查当前是否为百度搜索结果页面
 * @returns {boolean} 是否为百度搜索结果页面
 */
function isBaiduSearchPage() {
  return window.location.hostname.includes('baidu.com') && window.location.pathname.includes('/s');
}

/**
 * 检查URL查询参数中是否包含有效的site:查询
 * @returns {boolean} 是否包含有效的site:查询
 */
function hasValidSiteQuery() {
  if (currentSearchEngine === 'google') {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    // 修正正则：确保转义正确
    return query && /site:(?:https?:\/\/)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/.test(query);
  } else if (currentSearchEngine === 'baidu') {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('wd');
    // 百度的site语法
    return query && /site:(?:https?:\/\/)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/.test(query);
  }
  return false;
}

/**
 * 从当前URL的查询参数中提取 target_domain
 * @returns {string | null} 提取到的域名，或 null
 */
function getTargetDomain() {
  if (currentSearchEngine === 'google') {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      const match = query.match(/site:(?:https?:\/\/)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } else if (currentSearchEngine === 'baidu') {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('wd');
    if (query) {
      const match = query.match(/site:(?:https?:\/\/)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
      if (match && match[1]) {
        return match[1];
      }
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
    panel.remove();
    panelExistsOnPage = false; // 更新状态
  }
}

/**
 * 核心函数：在页面上插入或更新面板
 */
function insertOrUpdatePanel() {
  if (!activeButtons || activeButtons.length === 0) {
    removePanel();
    return;
  }

  let panel = document.querySelector('.ghacking-panel-container');
  let buttonsContainer;

  if (!panel) {
    // --- 创建面板 --- 
    panel = document.createElement('div');
    panel.className = 'ghacking-panel-container';
    // CSS 已设置 position:fixed, right, top，直接添加到 body
    document.body.appendChild(panel);

    // --- 创建标题 --- 
    const title = document.createElement('div');
    title.className = 'ghacking-panel-title';
    
    // 创建标题文本
    const titleText = document.createElement('span');
    titleText.textContent = currentSearchEngine === 'google' ? 'Google Hacking 助手' : '百度 Hacking 助手';
    
    // 创建按钮容器
    const actionButtons = document.createElement('div');
    actionButtons.className = 'ghacking-action-buttons';
    
    // 创建提取URL按钮
    const extractUrlsButton = document.createElement('button');
    extractUrlsButton.className = 'ghacking-action-button ghacking-extract-urls';
    extractUrlsButton.textContent = '提取URL';
    extractUrlsButton.title = '从搜索结果中提取URL';
    extractUrlsButton.addEventListener('click', extractUrlsFromSearchResults);
    
    // 只添加提取URL按钮到按钮容器
    actionButtons.appendChild(extractUrlsButton);
    
    // 添加到标题区域
    title.appendChild(titleText);
    title.appendChild(actionButtons);
    panel.appendChild(title);

    // --- 创建URL提取面板 ---
    const urlPanel = document.createElement('div');
    urlPanel.className = 'ghacking-url-panel';
    
    // 创建URL面板标题
    const urlPanelTitle = document.createElement('div');
    urlPanelTitle.className = 'ghacking-url-title';
    
    const urlTitleText = document.createElement('span');
    urlTitleText.textContent = '提取的URL';
    
    const urlCount = document.createElement('span');
    urlCount.className = 'ghacking-url-count';
    urlCount.textContent = '(0)';
    
    urlPanelTitle.appendChild(urlTitleText);
    urlPanelTitle.appendChild(urlCount);
    
    // 创建URL列表容器
    const urlList = document.createElement('div');
    urlList.className = 'ghacking-url-list';
    
    // 创建URL操作按钮
    const urlActions = document.createElement('div');
    urlActions.className = 'ghacking-url-actions';
    
    const copyAllButton = document.createElement('button');
    copyAllButton.className = 'ghacking-copy-all-urls';
    copyAllButton.textContent = '复制全部URL';
    copyAllButton.addEventListener('click', copyAllExtractedUrls);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'ghacking-copy-all-urls';
    closeButton.textContent = '关闭';
    closeButton.addEventListener('click', () => {
      urlPanel.classList.remove('active');
    });
    
    urlActions.appendChild(copyAllButton);
    urlActions.appendChild(closeButton);
    
    // 组装URL面板
    urlPanel.appendChild(urlPanelTitle);
    urlPanel.appendChild(urlList);
    urlPanel.appendChild(urlActions);
    
    panel.appendChild(urlPanel);

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
 * 执行 Hacking 搜索
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
  
  // 根据不同的搜索引擎构建搜索URL
  let searchUrl;
  
  if (currentSearchEngine === 'google') {
    searchUrl = `https://www.google.com/search?q=${encodeURIComponent(finalSyntax)}`;
  } else if (currentSearchEngine === 'baidu') {
    searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(finalSyntax)}`;
  } else {
    console.error("不支持的搜索引擎");
    showAlert('错误：不支持的搜索引擎');
    return;
  }

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

/**
 * 从搜索结果中提取URL
 * 处理点击提取URL按钮的事件
 */
function extractUrlsFromSearchResults() {
  // 添加提取中的视觉反馈
  const extractUrlsButton = document.querySelector('.ghacking-extract-urls');
  let originalText = '提取URL';
  let originalBg = '';
  
  if (extractUrlsButton) {
    originalText = extractUrlsButton.textContent;
    originalBg = extractUrlsButton.style.backgroundColor;
    
    extractUrlsButton.textContent = '提取中...';
    extractUrlsButton.style.backgroundColor = '#f1f3f4';
    extractUrlsButton.style.color = '#5f6368';
    extractUrlsButton.style.borderColor = '#dadce0';
    extractUrlsButton.disabled = true;
    extractUrlsButton.style.cursor = 'default';
  }

  // 清空之前提取的URL
  extractedUrls = [];
  
  // 根据不同的搜索引擎选择不同的选择器
  let resultLinks;
  
  if (currentSearchEngine === 'google') {
    // Google搜索结果链接选择器
    resultLinks = document.querySelectorAll('#search a[href^="http"]:not([href^="https://www.google.com"]):not([href^="https://webcache.googleusercontent.com"]):not([href^="https://translate.google.com"])');
  } else if (currentSearchEngine === 'baidu') {
    try {
      // 收集所有可能包含链接的元素
      let allLinks = [];
      
      // 1. 标准链接选择器
      allLinks = [...allLinks, ...Array.from(document.querySelectorAll('#content_left a[href^="http"]:not([href^="http://www.baidu.com"]):not([href^="https://www.baidu.com"])'))];
      
      // 2. 带有data-click属性的链接
      allLinks = [...allLinks, ...Array.from(document.querySelectorAll('#content_left a[data-click]:not([data-click*="rsv_snapshot"])'))];
      
      // 3. c-container中的data-url属性
      const dataUrlElements = Array.from(document.querySelectorAll('#content_left .c-container[data-url]'));
      const dataUrls = dataUrlElements.map(element => {
        const dataUrl = element.getAttribute('data-url');
        return dataUrl && dataUrl.trim() !== '' ? { href: dataUrl } : null;
      }).filter(item => item !== null);
      allLinks = [...allLinks, ...dataUrls];
      
      // 4. 使用XPath获取特定位置的元素
      try {
        const xpathResult = document.evaluate('//*[@id="content_left"]/div[contains(@class, "c-container")]/div/div[1]/div[3]/div[1]/div[2]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          const element = xpathResult.snapshotItem(i);
          // 尝试获取data-url属性
          const dataUrl = element.getAttribute('data-url');
          if (dataUrl && dataUrl.trim() !== '') {
            allLinks.push({ href: dataUrl });
          }
          
          // 同时检查其中的<a>标签
          const linkElements = element.querySelectorAll('a[href^="http"]');
          if (linkElements && linkElements.length > 0) {
            allLinks = [...allLinks, ...Array.from(linkElements)];
          }
        }
      } catch (e) {
        console.error('XPath提取错误:', e);
      }
      
      // 5. 搜索包含链接的特定属性
      const possibleLinkAttributes = ['mu', 'data-url', 'data-landurl', 'data-link'];
      possibleLinkAttributes.forEach(attr => {
        const elements = document.querySelectorAll(`[${attr}^="http"]`);
        if (elements && elements.length > 0) {
          elements.forEach(element => {
            const url = element.getAttribute(attr);
            if (url && url.trim() !== '') {
              allLinks.push({ href: url });
            }
          });
        }
      });
      
      // 赋值给resultLinks
      resultLinks = allLinks;
    } catch (e) {
      console.error('百度链接提取错误:', e);
      resultLinks = document.querySelectorAll('#content_left a[href^="http"]:not([href^="http://www.baidu.com"]):not([href^="https://www.baidu.com"])');
    }
  } else {
    console.error("不支持的搜索引擎");
    showAlert('错误：不支持的搜索引擎');
    
    // 失败时恢复按钮状态
    if (extractUrlsButton) {
      extractUrlsButton.textContent = originalText;
      extractUrlsButton.style.backgroundColor = originalBg;
      extractUrlsButton.style.color = '';
      extractUrlsButton.style.borderColor = '';
      extractUrlsButton.disabled = false;
      extractUrlsButton.style.cursor = 'pointer';
    }
    return;
  }
  
  // 处理找到的链接
  if (resultLinks && resultLinks.length > 0) {
    let uniqueUrls = new Set(); // 使用Set去重
    let filteredCount = 0; // 记录被过滤的URL数量
    
    resultLinks.forEach(link => {
      if (!link || !link.href) return;
      
      let url = link.href;
      
      // 各种过滤条件
      // 1. 过滤掉以@开头的URL
      if (url.startsWith('@')) {
        filteredCount++;
        return;
      }
      
      // 2. 过滤百度内部域名
      const baiduInternalDomains = [
        'zhanzhang.baidu.com', 'top.baidu.com', 'tieba.baidu.com', 
        'map.baidu.com', 'image.baidu.com', 'hao123.com', 
        'pan.baidu.com', 'baike.baidu.com', 'wenku.baidu.com', 
        'fanyi.baidu.com', 'zhidao.baidu.com', 'music.baidu.com', 
        'v.baidu.com'
      ];
      
      try {
        const urlObj = new URL(url);
        
        // 检查是否为百度内部域名
        if (baiduInternalDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain))) {
          filteredCount++;
          return;
        }
        
        // 检查格式明显有问题的URL
        if (urlObj.hostname === '' || url.includes('javascript:')) {
          filteredCount++;
          return;
        }
        
        // 去除URL中的无关参数
        if (currentSearchEngine === 'google') {
          urlObj.searchParams.delete('ved');
          urlObj.searchParams.delete('usg');
          urlObj.searchParams.delete('ei');
          urlObj.searchParams.delete('sa');
        } else if (currentSearchEngine === 'baidu') {
          // 百度的一些特定参数
          if (urlObj.hostname === 'www.baidu.com') {
            return; // 跳过百度自己的链接
          }
          
          // 处理百度跳转链接
          if (urlObj.pathname.startsWith('/link') || urlObj.hostname.includes('baidu.com')) {
            const realUrl = urlObj.searchParams.get('url');
            if (realUrl) {
              url = decodeURIComponent(realUrl);
              try {
                // 确保是有效的URL
                new URL(url);
              } catch (e) {
                filteredCount++;
                return; // 如果不是有效URL则跳过
              }
            }
          }
        }
        url = urlObj.toString();
      } catch (e) {
        console.error('URL解析错误:', e);
        filteredCount++;
        return; // 跳过无效URL
      }
      
      if (url && !uniqueUrls.has(url)) {
        uniqueUrls.add(url);
      }
    });
    
    // 将Set转为数组
    extractedUrls = Array.from(uniqueUrls);
    
    // 显示提取的URL
    displayExtractedUrls();
    
    // 成功提取后显示视觉反馈
    if (extractUrlsButton) {
      extractUrlsButton.textContent = '提取成功!';
      extractUrlsButton.style.backgroundColor = '#e6f4ea';
      extractUrlsButton.style.color = '#188038';
      extractUrlsButton.style.borderColor = '#b7e1c1';
      extractUrlsButton.disabled = false;
      extractUrlsButton.style.cursor = 'pointer';
      
      // 2秒后恢复原始状态
      setTimeout(() => {
        extractUrlsButton.textContent = originalText;
        extractUrlsButton.style.backgroundColor = originalBg;
        extractUrlsButton.style.color = '';
        extractUrlsButton.style.borderColor = '';
      }, 2000);
    }
  } else {
    console.log("未找到搜索结果链接");
    showAlert('未找到搜索结果链接');
    
    // 失败时恢复按钮状态
    if (extractUrlsButton) {
      extractUrlsButton.textContent = originalText;
      extractUrlsButton.style.backgroundColor = originalBg;
      extractUrlsButton.style.color = '';
      extractUrlsButton.style.borderColor = '';
      extractUrlsButton.disabled = false;
      extractUrlsButton.style.cursor = 'pointer';
    }
  }
}

/**
 * 显示提取的URL列表
 */
function displayExtractedUrls() {
  const urlPanel = document.querySelector('.ghacking-url-panel');
  const urlList = document.querySelector('.ghacking-url-list');
  const urlCount = document.querySelector('.ghacking-url-count');
  
  if (!urlPanel || !urlList || !urlCount) {
    console.error("URL面板元素未找到");
    return;
  }
  
  // 清空URL列表
  urlList.innerHTML = '';
  
  // 更新URL计数
  urlCount.textContent = `(${extractedUrls.length})`;
  
  // 如果没有提取到URL
  if (extractedUrls.length === 0) {
    const noUrlMsg = document.createElement('div');
    noUrlMsg.textContent = '未找到URL';
    noUrlMsg.style.padding = '8px';
    noUrlMsg.style.color = '#5f6368';
    urlList.appendChild(noUrlMsg);
    
    // 添加简洁的帮助提示
    const helpMsg = document.createElement('div');
    helpMsg.textContent = '搜索结果页面可能结构变化，或所有URL均被过滤';
    helpMsg.style.padding = '8px';
    helpMsg.style.marginTop = '8px';
    helpMsg.style.fontSize = '11px';
    helpMsg.style.color = '#5f6368';
    helpMsg.style.borderTop = '1px dashed #ebebeb';
    urlList.appendChild(helpMsg);
  } else {
    // 添加URL列表项
    extractedUrls.forEach((url, index) => {
      const urlItem = document.createElement('div');
      urlItem.className = 'ghacking-url-item';
      urlItem.textContent = url;
      urlItem.title = '点击复制此URL';
      urlItem.dataset.url = url;
      
      // 添加点击事件复制单个URL
      urlItem.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        copyTextToClipboard(url, () => {
          // 点击复制成功的视觉反馈
          const originalBg = e.target.style.backgroundColor;
          e.target.style.backgroundColor = '#e6f4ea';
          setTimeout(() => {
            e.target.style.backgroundColor = originalBg;
          }, 1000);
        });
      });
      
      urlList.appendChild(urlItem);
    });
  }
  
  // 显示URL面板
  urlPanel.classList.add('active');
}

/**
 * 复制所有提取的URL到剪贴板
 */
function copyAllExtractedUrls() {
  if (extractedUrls.length === 0) {
    showAlert('没有可复制的URL');
    return;
  }
  
  const allUrls = extractedUrls.join('\n');
  copyTextToClipboard(allUrls, () => {
    const copyAllButton = document.querySelector('.ghacking-copy-all-urls');
    if (copyAllButton) {
      const originalText = copyAllButton.textContent;
      const originalBg = copyAllButton.style.backgroundColor;
      
      copyAllButton.textContent = '复制成功!';
      copyAllButton.style.backgroundColor = '#e6f4ea';
      copyAllButton.style.color = '#188038';
      copyAllButton.style.borderColor = '#b7e1c1';
      
      setTimeout(() => {
        copyAllButton.textContent = originalText;
        copyAllButton.style.backgroundColor = originalBg;
        copyAllButton.style.color = '';
        copyAllButton.style.borderColor = '';
      }, 2000);
    }
  });
}

/**
 * 通用函数：复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @param {Function} successCallback - 复制成功后的回调函数
 */
function copyTextToClipboard(text, successCallback) {
  if (!text) {
    console.error("没有要复制的文本");
    return;
  }
  
  try {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof successCallback === 'function') {
        successCallback();
      }
    }).catch(err => {
      console.error('复制失败:', err);
      showAlert('复制失败: ' + err.message);
    });
  } catch (error) {
    console.error('复制功能不可用:', error);
    showAlert('复制功能不可用，请检查浏览器权限');
  }
}

// 启动脚本
init(); 