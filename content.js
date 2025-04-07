/**
 * Google Hacking 助手 - 内容脚本
 * 在Google搜索页面动态插入Google Hacking语法，提供一键触发高级搜索语法功能
 */

// 全局变量存储设置和语法
let extensionEnabled = true;
let linkTargetPreference = '_self';
let activeButtons = []; // 存储从后台获取的活动语法

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
function init() {
  injectStyles(); // 注入样式表

  loadExtensionSettings(() => {
    const observer = new MutationObserver((mutations) => {
      if (!extensionEnabled) {
        removeButtons(); // 禁用时移除
        return; 
      }
      
      if (isGoogleSearchPage() && hasValidSiteQuery()) {
        const panelExists = !!document.querySelector('.ghacking-panel-container');
        if (!panelExists) {
            const rcntResult = document.evaluate('//*[@id="rcnt"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const rcnt = rcntResult.singleNodeValue;
            const centerCol = document.getElementById('center_col');

            if (rcnt && centerCol && centerCol.offsetParent !== null) {
                 insertButtons(); // 调用插入函数
            }
        }
      } else {
        removeButtons(); // 不满足条件时移除
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });

  // 监听来自后台的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'settingsUpdated') {
        if (message.setting.key === 'extensionEnabled') {
            const newState = message.setting.value;
            if (newState !== extensionEnabled) {
                extensionEnabled = newState;
                if (extensionEnabled) {
                    if (isGoogleSearchPage() && hasValidSiteQuery()) {
                        insertButtons(); 
                    }
                } else {
                    removeButtons();
                }
            }
        } else if (message.setting.key === 'linkTargetPreference') {
            linkTargetPreference = message.setting.value;
        } else if (message.setting.key === 'customButtons' || message.setting.key === 'defaultButtons' || message.setting.key === 'all') {
             insertButtons(); // 重新获取语法数据并插入
        }
        sendResponse({ status: "收到设置更新" });
    } else if (message.action === 'triggerSearch') {
        // 保持触发搜索的逻辑，如果需要可以清理日志
    }
  });
}

/**
 * 加载扩展设置 (启用状态, 链接打开方式)
 * @param {function} callback - 加载完成后的回调函数
 */
function loadExtensionSettings(callback) {
  chrome.storage.local.get([
    'extensionEnabled',
    'linkTargetPreference'
  ], (result) => {
    extensionEnabled = typeof result.extensionEnabled === 'undefined' ? true : result.extensionEnabled;
    linkTargetPreference = result.linkTargetPreference || '_self';

    if (typeof callback === 'function') {
        callback();
    }
  });
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
  return query && /site:[\w.-]+\.[a-zA-Z]{2,}/.test(query);
}

/**
 * 移除注入的语法按钮和面板
 */
function removeButtons() {
  const panel = document.querySelector('.ghacking-panel-container');
  if (panel) {
    panel.remove();
  }
}

/**
 * 核心函数：获取活动语法并在页面上插入或更新面板
 */
function insertButtons() {
  if (!isGoogleSearchPage() || !hasValidSiteQuery() || !extensionEnabled) {
    removeButtons();
    return;
  }

  chrome.runtime.sendMessage({ action: 'getActiveButtons' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('获取活动语法失败:', chrome.runtime.lastError.message);
        return;
    }
    if (response && response.success) {
      activeButtons = response.buttons || [];

      if (activeButtons.length === 0) {
        removeButtons();
        return;
      }

      let targetElement = document.getElementById('rhs');
      let insertionMethod = 'prepend';

      if (!targetElement || targetElement.offsetParent === null) {
        targetElement = document.getElementById('center_col');
        if (!targetElement) {
           const rcntResult = document.evaluate('//*[@id="rcnt"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
           targetElement = rcntResult.singleNodeValue;
        } else {
        }
         insertionMethod = 'prepend';
      } else {
      }
      
      if (!targetElement) {
        console.error('无法找到合适的插入点 (#rhs, #center_col 或 #rcnt)。无法插入侧边栏。');
        return;
      }

      createAndInsertPanel(targetElement, insertionMethod);

    } else {
      console.error('后台未能成功返回活动语法:', response ? response.message : '无响应');
      removeButtons();
    }
  });
}

/**
 * 创建或更新并插入面板到目标元素
 * @param {HTMLElement} targetElement 插入的目标DOM元素
 * @param {string} method 插入方法 ('prepend', 'append')
 */
function createAndInsertPanel(targetElement, method) {
  let panel = document.querySelector('.ghacking-panel-container');

  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'ghacking-panel-container';
    if (method === 'prepend') {
      targetElement.prepend(panel);
    } else {
      targetElement.append(panel);
    }
  } else {
    panel.innerHTML = '';
  }

  const title = document.createElement('div');
  title.className = 'ghacking-panel-title';
  title.textContent = 'Google Hacking 助手';
  panel.appendChild(title);

  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'ghacking-buttons-container';

  activeButtons.forEach(button => {
    const buttonElement = createButtonElement(button);
    buttonsContainer.appendChild(buttonElement);
  });
  panel.appendChild(buttonsContainer);

  const footer = document.createElement('div');
  footer.className = 'ghacking-panel-footer';
  const versionSpan = document.createElement('span');
  versionSpan.className = 'ghacking-panel-version';
  const manifest = chrome.runtime.getManifest();
  versionSpan.innerHTML = `版本: ${manifest.version} | <a href="https://github.com/Pa55w0rd/google-hacking-assistant" target="_blank">GitHub</a>`;
  footer.appendChild(versionSpan);
  panel.appendChild(footer);

  panel.style.display = 'block'; 
}

/**
 * 创建单个语法按钮元素
 * @param {object} button 语法对象
 * @returns {HTMLElement} 按钮元素
 */
function createButtonElement(button) {
  const buttonElement = document.createElement('button');
  buttonElement.className = 'ghacking-button';
  buttonElement.textContent = button.name;
  buttonElement.title = button.syntax;

  const riskLevelClass = `ghacking-button-${button.riskLevel || 'default'}`.toLowerCase();
  buttonElement.classList.add(riskLevelClass);

  buttonElement.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    executeHackingSearch(button);
  });
  return buttonElement;
}

/**
 * 模拟真实点击，尝试解决某些情况下 window.open 被阻止的问题
 * @param {HTMLElement} element 要模拟点击的元素
 */
function simulateRealClick(element) {
    const mouseEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    element.dispatchEvent(mouseEvent);
}

/**
 * 执行 Google Hacking 搜索
 * @param {object} button 被点击的语法对象
 */
async function executeHackingSearch(button) {
  const params = new URLSearchParams(window.location.search);
  let query = params.get('q') || '';

  const targetDomainMatch = query.match(/site:([\w.-]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?)/i);
  let targetDomain = '';
  if (targetDomainMatch && targetDomainMatch[1]) {
    targetDomain = targetDomainMatch[1];
  } else {
    console.error('未能从当前查询中提取有效的 site: 域名。无法执行 Hacking 搜索。');
    showAlert('请先在Google搜索框中输入包含 site:domain.com 的查询');
    return;
  }

  const hackingSyntax = button.syntax.replace(/\{target_domain\}/g, targetDomain);

  const newSearchURL = `https://www.google.com/search?q=${encodeURIComponent(hackingSyntax)}`;

  if (linkTargetPreference === '_blank') {
    const newTab = window.open(newSearchURL, '_blank');
    
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') { 
      console.warn('window.open 可能被阻止，尝试模拟点击...');
      const link = document.createElement('a');
      link.href = newSearchURL;
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      simulateRealClick(link); 
      setTimeout(() => link.remove(), 100); 
    }
  } else {
    window.location.href = newSearchURL;
  }
}

/**
 * 显示一个简单的提示信息
 * @param {string} message 要显示的消息
 */
function showAlert(message) {
  let alertBox = document.querySelector('.ghacking-alert');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.className = 'ghacking-alert';
    
    const content = document.createElement('span');
    content.className = 'ghacking-alert-content';
    alertBox.appendChild(content);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'ghacking-alert-button';
    closeButton.textContent = '关闭';
    closeButton.onclick = () => alertBox.remove();
    alertBox.appendChild(closeButton);
    
    document.body.appendChild(alertBox);
  }
  
  alertBox.querySelector('.ghacking-alert-content').textContent = message;

  setTimeout(() => {
    if (alertBox && alertBox.parentNode) {
      alertBox.remove();
    }
  }, 5000);
}

// 脚本入口
init(); 