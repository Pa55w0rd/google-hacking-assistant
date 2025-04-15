/**
 * Google Hacking 助手 - 后台服务
 * 管理用户配置的存储与同步
 */

// 后台服务 Service Worker

/**
 * 默认内置语法列表
 * 注意：存储中的语法会包含 enabled 状态
 */
const RAW_DEFAULT_BUTTONS = [
  // 1. 文档文件 (Documents)
  { id: 'default_docs', name: "公开文档", syntax: "site:{target_domain} ext:doc | ext:docx | ext:odt | ext:pdf | ext:rtf | ext:sxw | ext:psw | ext:ppt | ext:pptx | ext:pps | ext:csv", riskLevel: "medium", supportedEngines: ['google', 'baidu'] },
  // 2. 目录列表 (Directory Listing)
  { id: 'default_dir_list', name: "目录列表漏洞", syntax: "site:{target_domain} intitle:index.of | \"parent directory\"", riskLevel: "medium", supportedEngines: ['google', 'baidu'] },
  // 3. 配置文件 (Configuration Files)
  { id: 'default_config_files', name: "配置文件暴露", syntax: "site:{target_domain} ext:xml | ext:conf | ext:cnf | ext:reg | ext:inf | ext:rdp | ext:cfg | ext:txt | ext:ora | ext:ini | ext:env | ext:yml | ext:yaml | ext:json", riskLevel: "high", supportedEngines: ['google', 'baidu'] },
  // 4. 数据库文件 (Database Files)
  { id: 'default_db_files', name: "数据库文件暴露", syntax: "site:{target_domain} ext:sql | ext:dbf | ext:mdb | ext:db", riskLevel: "high", supportedEngines: ['google', 'baidu'] },
  // 5. 日志文件 (Log Files)
  { id: 'default_log_files', name: "日志文件暴露", syntax: "site:{target_domain} ext:log | inurl:log.txt", riskLevel: "medium", supportedEngines: ['google', 'baidu'] },
  // 6. 备份和旧文件 (Backup Files)
  { id: 'default_backup_files', name: "备份和旧文件", syntax: "site:{target_domain} ext:bak | ext:bkf | ext:bkp | ext:old | ext:backup | ext:tmp | ext:temp | ext:swp", riskLevel: "medium", supportedEngines: ['google', 'baidu'] },
  // 7. 登录页面 (Login Pages)
  { id: 'default_login_pages', name: "登录页面", syntax: "site:{target_domain} inurl:login | inurl:signin | intitle:\"Login\" | intitle:\"Sign in\"", riskLevel: "info", supportedEngines: ['google', 'baidu'] },
  // 8. 管理后台入口 (Admin Panels)
  { id: 'default_admin_panels', name: "管理后台入口", syntax: "site:{target_domain} inurl:admin | inurl:cpanel | inurl:dashboard | intitle:\"Admin Login\" | intitle:\"Control Panel\"", riskLevel: "info", supportedEngines: ['google', 'baidu'] },
  // 9. SQL 错误 (SQL Errors)
  { id: 'default_sql_errors', name: "SQL 错误", syntax: "site:{target_domain} intext:\"sql syntax near\" | intext:\"syntax error has occurred\" | intext:\"incorrect syntax near\" | intext:\"unexpected end of SQL command\" | intext:\"Warning: mysql_connect()\" | intext:\"Warning: mysql_query()\" | intext:\"Warning: pg_connect()\"", riskLevel: "high", supportedEngines: ['google', 'baidu'] },
  // 10. PHP 错误/警告 (PHP Errors)
  { id: 'default_php_errors', name: "PHP错误/警告", syntax: "site:{target_domain} \"PHP Parse error\" | \"PHP Warning\" | \"PHP Error\"", riskLevel: "medium", supportedEngines: ['google', 'baidu'] },
  // 11. phpinfo()
  { id: 'default_phpinfo', name: "phpinfo() 暴露", syntax: "site:{target_domain} ext:php intitle:phpinfo \"published by the PHP Group\"", riskLevel: "high", supportedEngines: ['google', 'baidu'] },
  // 12. Git 文件暴露 (Git Exposure)
  { id: 'default_git_expose', name: "Git 文件暴露", syntax: "site:{target_domain} inurl:.git | ext:git | inurl:.gitignore | inurl:.gitconfig", riskLevel: "high", supportedEngines: ['google', 'baidu'] },
  // 13. WordPress 文件 (WordPress Files)
  { id: 'default_wp_files', name: "WordPress 文件", syntax: "site:{target_domain} inurl:wp-content | inurl:wp-admin | inurl:wp-includes", riskLevel: "medium", supportedEngines: ['google', 'baidu'] }
];

/**
 * 在扩展安装或更新时初始化默认语法
 */
chrome.runtime.onInstalled.addListener(details => {
  console.log(`Extension ${details.reason} event.`); // 保留此日志以跟踪安装/更新
  initializeDefaultButtons();
  // 初始化默认设置
  chrome.storage.local.get(['linkTargetPreference', 'extensionEnabled'], result => {
      const defaults = {};
      if (result.linkTargetPreference === undefined) {
          defaults.linkTargetPreference = '_self';
      }
      if (result.extensionEnabled === undefined) {
          defaults.extensionEnabled = true; // 默认启用
      }
      if (Object.keys(defaults).length > 0) {
          chrome.storage.local.set(defaults, () => {
              if (chrome.runtime.lastError) {
                  console.error("初始化默认设置失败:", chrome.runtime.lastError);
              }
          });
      }
  });
});

/**
 * 初始化存储中的默认语法列表
 */
function initializeDefaultButtons() {
  chrome.storage.local.get('defaultButtons', (result) => {
    if (chrome.runtime.lastError) {
      console.error("读取默认语法失败:", chrome.runtime.lastError);
      return;
    }
    // 仅当存储中不存在或为空时才初始化
    if (!result.defaultButtons || result.defaultButtons.length === 0) {
      console.log("初始化默认语法列表到存储..."); // 保留初始化日志
      // 为每个原始默认语法添加 enabled: true 状态
      const initialDefaultButtons = RAW_DEFAULT_BUTTONS.map(button => ({ ...button, enabled: true }));
      chrome.storage.local.set({ defaultButtons: initialDefaultButtons }, () => {
        if (chrome.runtime.lastError) {
          console.error("保存初始默认语法失败:", chrome.runtime.lastError);
        }
      });
    } else {
      // 可选：检查现有默认语法与 RAW_DEFAULT_BUTTONS 是否有差异，并进行更新合并
      console.log("存储中已存在默认语法。"); // 保留此日志
    }
  });
}

// --- 监听消息 ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAllButtonsData') {
    getAllButtonsData(sendResponse);
    return true; // 异步
  }

  if (message.action === 'toggleDefaultButton') {
    toggleDefaultButton(message.buttonId, message.isEnabled, sendResponse);
    return true; // 异步
  }

  if (message.action === 'addCustomButton') {
    addCustomButton(message.button, sendResponse);
    return true; // 异步
  }

  if (message.action === 'updateCustomButton') {
    updateCustomButton(message.button, sendResponse);
    return true; // 异步
  }

  if (message.action === 'deleteCustomButton') {
    deleteCustomButton(message.buttonId, sendResponse);
    return true; // 异步
  }

  if (message.action === 'clearAllCustomButtons') {
    clearAllCustomButtons(sendResponse);
    return true; // 异步
  }
  
  // 处理来自 Popup 或 Options 页面的简单设置更新（现在主要通过 storage.onChanged）
  // 可以保留这个作为备用或特定场景，但目前不再依赖它进行实时同步
  if (message.action === 'settingsUpdated') {
    console.log('后台收到 settingsUpdated 消息 (可能来自旧逻辑或特定场景):', message.setting);
    // 如果有需要，可以在这里处理特定设置，但主要更新应由 storage.onChanged 触发
    // 例如，如果某个设置需要在后台立即响应，可以在这里添加逻辑
    sendResponse({status: "Background received update"});
  }

  // 处理来自内容脚本的请求
  if (message.action === 'getActiveButtons') {
    getActiveButtons(sendResponse);
    return true; // 异步
  }
});

// --- 语法和设置管理函数 ---

async function getAllButtonsData(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['defaultButtons', 'customButtons']);
    sendResponse({ success: true, data: { defaultButtons: result.defaultButtons || [], customButtons: result.customButtons || [] } });
  } catch (error) {
    console.error("获取所有语法数据失败:", error);
    sendResponse({ success: false, message: '获取存储数据失败', data: { defaultButtons: [], customButtons: [] } });
  }
}

async function toggleDefaultButton(buttonId, isEnabled, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['defaultButtons']);
    let defaultButtons = result.defaultButtons || [];
    const buttonIndex = defaultButtons.findIndex(b => b.id === buttonId);
    if (buttonIndex === -1) {
      throw new Error('未找到要切换的内置语法');
    }
    defaultButtons[buttonIndex].enabled = isEnabled;
    await chrome.storage.local.set({ defaultButtons });
    // 不需要手动通知，content script 会监听 storage 变化
    sendResponse({ success: true });
  } catch (error) {
    console.error('切换内置语法状态失败:', error);
    sendResponse({ success: false, message: error.message });
  }
}

async function addCustomButton(buttonData, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['customButtons']);
    let customButtons = result.customButtons || [];
    const newButton = {
      ...buttonData,
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      isCustom: true
    };
    customButtons.push(newButton);
    await chrome.storage.local.set({ customButtons });
    sendResponse({ success: true });
  } catch (error) {
    console.error('添加自定义语法失败:', error);
    sendResponse({ success: false, message: error.message });
  }
}

async function updateCustomButton(buttonData, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['customButtons']);
    let customButtons = result.customButtons || [];
    const buttonIndex = customButtons.findIndex(b => b.id === buttonData.id);
    if (buttonIndex === -1) {
      throw new Error('未找到要更新的自定义语法');
    }
    customButtons[buttonIndex] = { ...customButtons[buttonIndex], ...buttonData, isCustom: true };
    await chrome.storage.local.set({ customButtons });
    sendResponse({ success: true });
  } catch (error) {
    console.error('更新自定义语法失败:', error);
    sendResponse({ success: false, message: error.message });
  }
}

async function deleteCustomButton(buttonId, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['customButtons']);
    let customButtons = result.customButtons || [];
    customButtons = customButtons.filter(b => b.id !== buttonId);
    await chrome.storage.local.set({ customButtons });
    sendResponse({ success: true });
  } catch (error) {
    console.error('删除自定义语法失败:', error);
    sendResponse({ success: false, message: error.message });
  }
}

async function clearAllCustomButtons(sendResponse) {
  try {
    await chrome.storage.local.set({ customButtons: [] });
    sendResponse({ success: true });
  } catch (error) {
    console.error('清除自定义语法失败:', error);
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * 获取所有启用的语法 (供内容脚本使用)
 */
async function getActiveButtons(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['defaultButtons', 'customButtons']);
    const defaultButtons = result.defaultButtons || [];
    const customButtons = result.customButtons || [];
    
    const activeDefault = defaultButtons.filter(b => b.enabled !== false);
    const activeCustom = customButtons.filter(b => b.enabled !== false);
    
    const activeButtons = [...activeDefault, ...activeCustom];
    sendResponse({ success: true, data: activeButtons });
  } catch (error) {
    console.error('获取活动语法失败:', error);
    sendResponse({ success: false, message: error.message });
  }
} 