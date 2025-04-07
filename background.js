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
  { id: 'default_docs', name: "公开文档", syntax: "site:{target_domain} ext:doc | ext:docx | ext:odt | ext:pdf | ext:rtf | ext:sxw | ext:psw | ext:ppt | ext:pptx | ext:pps | ext:csv", riskLevel: "medium" },
  // 2. 目录列表 (Directory Listing)
  { id: 'default_dir_list', name: "目录列表漏洞", syntax: "site:{target_domain} intitle:index.of | \"parent directory\"", riskLevel: "medium" },
  // 3. 配置文件 (Configuration Files)
  { id: 'default_config_files', name: "配置文件暴露", syntax: "site:{target_domain} ext:xml | ext:conf | ext:cnf | ext:reg | ext:inf | ext:rdp | ext:cfg | ext:txt | ext:ora | ext:ini | ext:env | ext:yml | ext:yaml | ext:json", riskLevel: "high" },
  // 4. 数据库文件 (Database Files)
  { id: 'default_db_files', name: "数据库文件暴露", syntax: "site:{target_domain} ext:sql | ext:dbf | ext:mdb | ext:db", riskLevel: "high" },
  // 5. 日志文件 (Log Files)
  { id: 'default_log_files', name: "日志文件暴露", syntax: "site:{target_domain} ext:log | inurl:log.txt", riskLevel: "medium" },
  // 6. 备份和旧文件 (Backup Files)
  { id: 'default_backup_files', name: "备份和旧文件", syntax: "site:{target_domain} ext:bak | ext:bkf | ext:bkp | ext:old | ext:backup | ext:tmp | ext:temp | ext:swp", riskLevel: "medium" },
  // 7. 登录页面 (Login Pages)
  { id: 'default_login_pages', name: "登录页面", syntax: "site:{target_domain} inurl:login | inurl:signin | intitle:\"Login\" | intitle:\"Sign in\"", riskLevel: "info" },
  // 8. 管理后台入口 (Admin Panels)
  { id: 'default_admin_panels', name: "管理后台入口", syntax: "site:{target_domain} inurl:admin | inurl:cpanel | inurl:dashboard | intitle:\"Admin Login\" | intitle:\"Control Panel\"", riskLevel: "info" },
  // 9. SQL 错误 (SQL Errors)
  { id: 'default_sql_errors', name: "SQL 错误", syntax: "site:{target_domain} intext:\"sql syntax near\" | intext:\"syntax error has occurred\" | intext:\"incorrect syntax near\" | intext:\"unexpected end of SQL command\" | intext:\"Warning: mysql_connect()\" | intext:\"Warning: mysql_query()\" | intext:\"Warning: pg_connect()\"", riskLevel: "high" },
  // 10. PHP 错误/警告 (PHP Errors)
  { id: 'default_php_errors', name: "PHP错误/警告", syntax: "site:{target_domain} \"PHP Parse error\" | \"PHP Warning\" | \"PHP Error\"", riskLevel: "medium" },
  // 11. phpinfo()
  { id: 'default_phpinfo', name: "phpinfo() 暴露", syntax: "site:{target_domain} ext:php intitle:phpinfo \"published by the PHP Group\"", riskLevel: "high" },
  // 12. 搜索 GitHub/GitLab (Search Code Repos)
  { id: 'default_git_search', name: "搜索 GitHub/GitLab", syntax: "site:github.com | site:gitlab.com {target_domain}", riskLevel: "info" },
  // 13. 查找子域名 (Find Subdomains)
  { id: 'default_subdomains', name: "查找子域名", syntax: "site:*.{target_domain} -site:www.{target_domain}", riskLevel: "info" },
  // 14. API/密钥/敏感信息 (Secrets)
  { id: 'default_secrets', name: "API/密钥/敏感词", syntax: "site:{target_domain} \"api key\" | \"apikey\" | \"secret\" | \"password\" | \"token\" | \"auth_token\" | \"private key\" | \"client_secret\"", riskLevel: "high" },
  // 15. Git 文件暴露 (Git Exposure)
  { id: 'default_git_expose', name: "Git 文件暴露", syntax: "site:{target_domain} inurl:.git | ext:git | inurl:.gitignore | inurl:.gitconfig", riskLevel: "high" },
  // 16. WordPress 文件 (WordPress Files)
  { id: 'default_wp_files', name: "WordPress 文件", syntax: "site:{target_domain} inurl:wp-content | inurl:wp-admin | inurl:wp-includes", riskLevel: "medium" }
];

/**
 * 在扩展安装或更新时初始化默认语法
 */
chrome.runtime.onInstalled.addListener(details => {
  console.log(`Extension ${details.reason} event.`); // 保留此日志以跟踪安装/更新
  initializeDefaultButtons();
  // 可在此处添加其他初始化逻辑，如设置默认首选项
  chrome.storage.local.get(['linkTargetPreference'], result => {
      if (result.linkTargetPreference === undefined) {
          chrome.storage.local.set({ linkTargetPreference: '_self' });
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

// 监听来自内容脚本和选项页面的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('收到消息:', message); // 移除常规日志
  
  // 处理获取所有语法数据的请求 (用于 options.js)
  if (message.action === 'getAllButtonsData') {
    // console.log('处理获取所有语法数据请求'); // 移除
    chrome.storage.local.get(['defaultButtons', 'customButtons'], function(result) {
      // console.log('从存储中获取的语法数据:', result); // 移除
      if (chrome.runtime.lastError) {
         console.error("获取所有语法数据失败:", chrome.runtime.lastError);
         sendResponse({ success: false, message: '获取存储数据失败', data: { defaultButtons: [], customButtons: [] } });
         return;
       }
      sendResponse({
        success: true,
        data: {
          defaultButtons: result.defaultButtons || [],
          customButtons: result.customButtons || []
        }
      });
    });
    return true; // 异步
  }
  
  // 处理切换内置语法状态的请求
  if (message.action === 'toggleDefaultButton') {
    // console.log('处理切换内置语法状态请求:', message); // 移除
    chrome.storage.local.get(['defaultButtons'], function(result) {
      if (chrome.runtime.lastError) {
        console.error('获取内置语法数据失败:', chrome.runtime.lastError);
        sendResponse({ success: false, message: chrome.runtime.lastError.message });
        return;
      }
      let defaultButtons = result.defaultButtons || [];
      const buttonIndex = defaultButtons.findIndex(b => b.id === message.buttonId);
      if (buttonIndex === -1) {
        console.error('未找到要切换的内置语法:', message.buttonId); // 保留错误
        sendResponse({ success: false, message: '未找到要切换的语法' });
        return;
      }
      defaultButtons[buttonIndex].enabled = message.isEnabled;
      chrome.storage.local.set({ defaultButtons }, function() {
        if (chrome.runtime.lastError) {
          console.error('保存内置语法状态失败:', chrome.runtime.lastError); // 保留错误
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
          return;
        }
        // 通知内容脚本语法列表已更新
        notifyContentScriptsSettingsUpdated({ key: 'defaultButtons', value: defaultButtons });
        sendResponse({ success: true });
      });
    });
    return true; // 异步
  }
  
  // 处理添加自定义语法的请求
  if (message.action === 'addCustomButton') {
    // console.log('[addCustomButton] 处理添加自定义语法请求:', message); // 移除
    chrome.storage.local.get(['customButtons'], function(result) {
       if (chrome.runtime.lastError) {
           console.error("获取自定义语法数据失败:", chrome.runtime.lastError);
           sendResponse({ success: false, message: chrome.runtime.lastError.message });
           return;
       }
      let customButtons = result.customButtons || [];
      const newButton = {
        ...message.button,
        id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        isCustom: true
      };
      // console.log('[addCustomButton] 准备添加的新语法数据:', newButton); // 移除
      customButtons.push(newButton);
      chrome.storage.local.set({ customButtons }, function() {
        if (chrome.runtime.lastError) {
          console.error('[addCustomButton] 保存自定义语法失败:', chrome.runtime.lastError); // 保留错误
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
          return;
        }
        // console.log('[addCustomButton] 自定义语法保存成功。'); // 移除
        // 通知内容脚本语法列表已更新
        notifyContentScriptsSettingsUpdated({ key: 'customButtons', value: customButtons });
        sendResponse({ success: true });
      });
    });
    return true; // 异步
  }
  
  // 处理更新自定义语法的请求
  if (message.action === 'updateCustomButton') {
    // console.log('[updateCustomButton] 处理更新自定义语法请求:', message); // 移除
    chrome.storage.local.get(['customButtons'], function(result) {
        if (chrome.runtime.lastError) {
           console.error("获取自定义语法数据失败:", chrome.runtime.lastError);
           sendResponse({ success: false, message: chrome.runtime.lastError.message });
           return;
       }
      let customButtons = result.customButtons || [];
      const buttonIndex = customButtons.findIndex(b => b.id === message.button.id);
      if (buttonIndex === -1) {
        console.error('未找到要更新的自定义语法:', message.button.id); // 保留错误
        sendResponse({ success: false, message: '未找到要更新的语法' });
        return;
      }
      const originalButton = customButtons[buttonIndex];
      customButtons[buttonIndex] = { ...originalButton, ...message.button, isCustom: true };
      const updatedButton = customButtons[buttonIndex];
      // console.log(`[updateCustomButton] 准备更新语法 ID: ${updatedButton.id}，数据:`, updatedButton); // 移除
      chrome.storage.local.set({ customButtons }, function() {
        if (chrome.runtime.lastError) {
          console.error('[updateCustomButton] 保存自定义语法失败:', chrome.runtime.lastError); // 保留错误
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
          return;
        }
        // console.log('[updateCustomButton] 自定义语法更新成功。'); // 移除
        // 通知内容脚本语法列表已更新
        notifyContentScriptsSettingsUpdated({ key: 'customButtons', value: customButtons });
        sendResponse({ success: true });
      });
    });
    return true; // 异步
  }
  
  // 处理删除自定义语法的请求
  if (message.action === 'deleteCustomButton') {
    // console.log('处理删除自定义语法请求:', message); // 移除
    chrome.storage.local.get(['customButtons'], function(result) {
        if (chrome.runtime.lastError) {
           console.error("获取自定义语法数据失败:", chrome.runtime.lastError);
           sendResponse({ success: false, message: chrome.runtime.lastError.message });
           return;
       }
      let customButtons = result.customButtons || [];
      customButtons = customButtons.filter(b => b.id !== message.buttonId);
      chrome.storage.local.set({ customButtons }, function() {
        if (chrome.runtime.lastError) {
          console.error('删除自定义语法失败:', chrome.runtime.lastError); // 保留错误
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
          return;
        }
        // 通知内容脚本语法列表已更新
        notifyContentScriptsSettingsUpdated({ key: 'customButtons', value: customButtons });
        sendResponse({ success: true });
      });
    });
    return true; // 异步
  }
  
  // 处理清除所有自定义语法的请求
  if (message.action === 'clearAllCustomButtons') {
    // console.log('处理清除所有自定义语法请求'); // 移除
    chrome.storage.local.set({ customButtons: [] }, function() {
      if (chrome.runtime.lastError) {
        console.error('清除自定义语法失败:', chrome.runtime.lastError); // 保留错误
        sendResponse({ success: false, message: chrome.runtime.lastError.message });
        return;
      }
      // 通知内容脚本语法列表已更新
      notifyContentScriptsSettingsUpdated({ key: 'customButtons', value: [] });
      sendResponse({ success: true });
    });
    return true; // 异步
  }
  
  // 处理获取活动语法列表的请求 (用于 content.js)
  if (message.action === 'getActiveButtons') {
    // console.log('处理获取活动语法列表请求'); // 移除
    chrome.storage.local.get(['defaultButtons', 'customButtons'], function(result) {
        if (chrome.runtime.lastError) {
            console.error('获取语法数据失败 (getActiveButtons):', chrome.runtime.lastError); // 保留错误
            sendResponse({ success: false, message: '获取语法数据失败: ' + chrome.runtime.lastError.message, buttons: [] });
            return;
        }
        const defaultButtons = result.defaultButtons || [];
        const customButtons = result.customButtons || [];
        const enabledDefaultButtons = defaultButtons.filter(button => button.enabled !== false);
        const enabledCustomButtons = customButtons.filter(button => button.enabled !== false);
        const activeButtons = [...enabledDefaultButtons, ...enabledCustomButtons];
        // console.log('发送活动语法列表:', activeButtons); // 移除
        sendResponse({ success: true, buttons: activeButtons });
    });
    return true; // 异步
  }
  
  // 处理设置更新通知 (来自 popup.js 或 options.js)
  if (message.action === 'settingsUpdated') {
    // console.log('处理设置更新通知:', message); // 移除
    // 将设置更新转发给所有内容脚本
    notifyContentScriptsSettingsUpdated(message.setting);
    // 不需要回复
    return; // 同步返回或省略
  }
  
  // 处理设置保存通知 (已废弃?)
  /*
  if (message.action === 'settingsSaved') {
    console.log('处理设置保存通知');
    notifyContentScriptsSettingsUpdated({ key: 'all', value: 'settingsSaved' });
    return;
  }
  */
  
  // 未知消息动作
  // console.warn('未知消息动作:', message.action); // 移除警告
  // 对于未处理的消息，可以选择不回复或回复失败
  // sendResponse({ success: false, message: '未知的消息动作' }); 
  // return true; // 如果需要异步检查，则返回 true
});

/**
 * 通知所有相关内容脚本设置已更新
 * @param {object} setting - 更新的设置 { key: string, value: any }
 */
function notifyContentScriptsSettingsUpdated(setting) {
    chrome.tabs.query({ url: "*://*.google.com/search?*" }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("查询 Google 搜索标签页失败:", chrome.runtime.lastError); // 保留错误
        return;
      }
      // console.log(`准备向 ${tabs.length} 个标签页发送设置更新:`, setting.key); // 移除
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated', setting }, (response) => {
          if (chrome.runtime.lastError) {
            // 忽略错误，标签页可能已关闭或内容脚本未注入
            // console.warn(`发送消息到标签页 ${tab.id} 失败:`, chrome.runtime.lastError.message); 
          } else {
            // console.log(`设置更新消息已发送到标签页: ${tab.id}, 响应:`, response); // 移除
          }
        });
      });
    });
}

// --- 新的或修改后的函数 ---

// 获取所有语法数据（用于选项页）
async function getAllButtonsData(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['defaultButtons', 'customButtons']);
    // 确保 defaultButtons 存在，如果不存在（可能发生在旧版本升级），则初始化
    let defaultButtons = result.defaultButtons;
    if (!defaultButtons || defaultButtons.length === 0) {
        console.warn('存储中未找到 defaultButtons，重新初始化');
        defaultButtons = RAW_DEFAULT_BUTTONS.map(btn => ({ ...btn, enabled: true }));
        await chrome.storage.local.set({ defaultButtons }); 
    }
    sendResponse({ success: true, data: { 
        defaultButtons: defaultButtons || [], 
        customButtons: result.customButtons || [] 
    }}); 
  } catch (error) {
    console.error('获取所有语法数据失败:', error);
    sendResponse({ success: false, message: error.message });
  }
}

// 获取当前活动的语法（用于内容脚本）
async function getActiveButtons(sendResponse) {
   try {
    const result = await chrome.storage.local.get(['defaultButtons', 'customButtons']);
    const activeButtons = [];
    // 添加启用的默认语法
    if (result.defaultButtons) {
        result.defaultButtons.forEach(btn => {
            if (btn.enabled) {
                activeButtons.push(btn);
            }
        });
    }
    // 添加所有自定义语法
    if (result.customButtons) {
        activeButtons.push(...result.customButtons);
    }
    sendResponse({ success: true, buttons: activeButtons });
  } catch (error) {
    console.error('获取活动语法失败:', error);
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateUniqueId() {
  // 使用时间戳和随机数组合生成唯一ID
  return 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 清除所有自定义语法
 * @param {Function} sendResponse 响应函数
 */
async function clearAllCustomButtons(sendResponse) {
  try {
    // 将customButtons设置为空数组
    await chrome.storage.local.set({ customButtons: [] });
    console.log('已清除所有自定义语法');
    sendResponse({ success: true });
  } catch (error) {
    console.error('清除自定义语法失败:', error);
    sendResponse({ success: false, message: error.message });
  }
} 