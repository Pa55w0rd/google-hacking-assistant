/**
 * 默认内置语法列表
 */
const BUILTIN_SYNTAX = [
  // === 通用语法（所有引擎都支持且效果好） ===
  {
    id: "universal_docs",
    name: "文档文件",
    template: "site:{target_domain} filetype:pdf OR filetype:doc OR filetype:docx OR filetype:ppt OR filetype:pptx", 
    enabled: true,
    risk: "info",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  {
    id: "universal_config",
    name: "配置文件",
    template: "site:{target_domain} filetype:xml OR filetype:conf OR filetype:cfg OR filetype:ini OR filetype:env", 
    enabled: true,
    risk: "high",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  {
    id: "universal_backup",
    name: "备份文件",
    template: "site:{target_domain} filetype:sql OR filetype:bak OR filetype:backup OR filetype:old",
    enabled: true,
    risk: "high",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  {
    id: "universal_login",
    name: "登录页面",
    template: "site:{target_domain} inurl:login OR inurl:admin OR inurl:signin", 
    enabled: true,
    risk: "low",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  
  // === Google 特色语法 ===
  {
    id: "google_directory",
    name: "目录列表",
    template: "site:{target_domain} intitle:\"index of\" OR \"parent directory\"",
    enabled: true,
    risk: "medium",
    engines: ["google"],
    engineSettings: {
      google: true,
      baidu: false,
      bing: false
    },
    builtin: true
  },
  {
    id: "google_errors",
    name: "错误信息",
    template: "site:{target_domain} \"fatal error\" OR \"syntax error\" OR \"warning:\" OR \"mysql error\"",
    enabled: true,
    risk: "high",
    engines: ["google"],
    engineSettings: {
      google: true,
      baidu: false,
      bing: false
    },
    builtin: true
  },
  {
    id: "google_phpinfo",
    name: "PHP信息",
    template: "site:{target_domain} intitle:phpinfo OR inurl:phpinfo.php",
    enabled: true,
    risk: "high",
    engines: ["google"],
    engineSettings: {
      google: true,
      baidu: false,
      bing: false
    },
    builtin: true
  },
  
  // === 百度特色语法 ===
  {
    id: "baidu_chinese",
    name: "中文敏感信息",
    template: "site:{target_domain} \"密码\" OR \"账号\" OR \"用户名\" OR \"管理员\" OR \"后台\"",
    enabled: true,
    risk: "medium",
    engines: ["baidu"],
    engineSettings: {
      google: false,
      baidu: true,
      bing: false
    },
    builtin: true
  },
  {
    id: "baidu_logs",
    name: "日志文件",
    template: "site:{target_domain} filetype:log OR inurl:log",
    enabled: true,
    risk: "medium",
    engines: ["baidu"],
    engineSettings: {
      google: false,
      baidu: true,
      bing: false
    },
    builtin: true
  },
  
  // === Bing 特色语法 ===
  {
    id: "bing_contains",
    name: "文档内容搜索",
    template: "site:{target_domain} contains:password OR contains:confidential OR contains:secret",
    enabled: true,
    risk: "high",
    engines: ["bing"],
    engineSettings: {
      google: false,
      baidu: false,
      bing: true
    },
    builtin: true
  },
  {
    id: "bing_api",
    name: "API文档",
    template: "site:{target_domain} inurl:api OR inurl:swagger OR \"api documentation\"",
    enabled: true,
    risk: "medium",
    engines: ["bing"],
    engineSettings: {
      google: false,
      baidu: false,
      bing: true
    },
    builtin: true
  }
];

/**
 * 默认设置
 */
const DEFAULT_SETTINGS = {
  sidebarEnabled: true,
  googleEnabled: true,
  baiduEnabled: false,
  bingEnabled: false,
  urlBlacklist: [
    "example.com",
    "*.gov",
    "/.*\\.edu$/"
  ]
};

/**
 * 插件安装或更新时的初始化
 */
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    console.log('Search Hacking 助手已安装');
    
    // 存储默认设置
    chrome.storage.local.set({
      searchHackingSettings: DEFAULT_SETTINGS,
      syntaxLibrary: BUILTIN_SYNTAX
    }, function() {
      console.log('默认设置和语法库已初始化');
    });
    
    // 打开设置页面
    chrome.tabs.create({url: 'options.html'});
  } else if (details.reason === 'update') {
    // 更新内置语法
    updateBuiltinSyntax();
    console.log('Search Hacking 助手已更新');
  }
});

/**
 * 更新内置语法，保留用户自定义语法
 */
function updateBuiltinSyntax() {
  chrome.storage.local.get('syntaxLibrary', function(result) {
    if (result.syntaxLibrary) {
      // 筛选出用户自定义语法
      const customSyntax = result.syntaxLibrary.filter(syntax => !syntax.builtin);
      
      // 合并用户自定义语法和最新的内置语法
      const newSyntaxLibrary = [...customSyntax, ...BUILTIN_SYNTAX];
      
      // 更新语法库
      chrome.storage.local.set({syntaxLibrary: newSyntaxLibrary}, function() {
        console.log('语法库已更新，内置语法: ' + BUILTIN_SYNTAX.length + '，自定义语法: ' + customSyntax.length);
      });
    } else {
      // 如果没有现有语法库，直接使用内置语法
      chrome.storage.local.set({syntaxLibrary: BUILTIN_SYNTAX});
    }
  });
}

/**
 * 广播消息到所有标签页和扩展页面
 * @param {Object} message 要广播的消息
 * @param {Tab} senderTab 发送消息的标签页（排除自身）
 */
function broadcastMessage(message, senderTab) {
  // 广播消息到所有打开的标签页
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      // 排除消息发送者标签页
      if (!senderTab || tab.id !== senderTab.id) {
        chrome.tabs.sendMessage(tab.id, message, function() {
          if (chrome.runtime.lastError) {
            console.log('发送消息到标签页失败:', chrome.runtime.lastError.message);
          }
        });
      }
    });
  });
  
  // 广播到所有其他打开的扩展页面
  chrome.runtime.sendMessage(message, function() {
    if (chrome.runtime.lastError) {
      console.log('发送消息到扩展页面失败:', chrome.runtime.lastError.message);
    }
  });
}

/**
 * 检查URL是否匹配黑名单规则
 * @param {string} url - 要检查的URL
 * @param {Array<string>} blacklist - 黑名单规则数组
 * @returns {boolean} - 是否匹配黑名单规则
 */
function isUrlBlacklisted(url, blacklist) {
  if (!blacklist || !Array.isArray(blacklist) || blacklist.length === 0) {
    return false;
  }

  // 尝试提取域名
  let domain = "";
  try {
    // 如果URL没有协议前缀，添加一个临时的前缀以便创建URL对象
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    domain = urlObj.hostname;
  } catch (e) {
    // 如果URL解析失败，直接使用原始URL
    domain = url;
  }

  // 检查每一个规则
  for (const rule of blacklist) {
    try {
      // 处理正则表达式规则
      if (rule.startsWith('/') && rule.endsWith('/')) {
        const regexPattern = rule.slice(1, -1);
        const regex = new RegExp(regexPattern, 'i');
        if (regex.test(url) || regex.test(domain)) {
          return true;
        }
      }
      // 处理通配符规则
      else if (rule.includes('*')) {
        const escapedRule = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                               .replace(/\*/g, '.*');
        const wildcardRegex = new RegExp(`^${escapedRule}$`, 'i');
        if (wildcardRegex.test(url) || wildcardRegex.test(domain)) {
          return true;
        }
      }
      // 处理普通域名匹配
      else if (domain.includes(rule) || url.includes(rule)) {
        return true;
      }
    } catch (e) {
      console.error('黑名单规则匹配出错:', rule, e);
    }
  }

  return false;
}

/**
 * 过滤URL列表，移除黑名单中的URL
 * @param {Array<string>} urls - URL列表
 * @param {Array<string>} blacklist - 黑名单规则数组
 * @returns {Array<string>} - 过滤后的URL列表
 */
function filterBlacklistedUrls(urls, blacklist) {
  if (!blacklist || !Array.isArray(blacklist) || blacklist.length === 0) {
    return urls;
  }
  
  return urls.filter(url => !isUrlBlacklisted(url, blacklist));
}

/**
 * 监听来自内容脚本和选项页面的消息
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('收到消息:', request);
  
  // 获取内置语法
  if (request.action === 'getBuiltinSyntax') {
    sendResponse({builtinSyntax: BUILTIN_SYNTAX});
    return true;
  }
  
  // 获取当前域名
  if (request.action === 'getCurrentDomain') {
    if (sender.tab && sender.tab.url) {
      const url = new URL(sender.tab.url);
      const domain = url.hostname;
      sendResponse({domain: domain});
    } else {
      sendResponse({domain: null});
    }
    return true;
  }
  
  // 获取设置
  if (request.action === 'getSettings') {
    chrome.storage.local.get('searchHackingSettings', function(result) {
      sendResponse({settings: result.searchHackingSettings || {}});
    });
    return true;
  }
  
  // 获取语法库
  if (request.action === 'getSyntaxLibrary') {
    chrome.storage.local.get('syntaxLibrary', function(result) {
      sendResponse({syntaxLibrary: result.syntaxLibrary || []});
    });
    return true;
  }
  
  // 重置设置
  if (request.action === 'resetSettings') {
    // 重置所有内置语法为启用状态
    const resetSyntaxLibrary = BUILTIN_SYNTAX.map(syntax => ({
      ...syntax,
      enabled: true
    }));
    
    // 存储默认设置和重置的语法库
    chrome.storage.local.set({
      searchHackingSettings: DEFAULT_SETTINGS,
      syntaxLibrary: resetSyntaxLibrary
    }, function() {
      console.log('所有设置已重置为默认值');
      sendResponse({success: true});
    });
    
    return true;
  }
  
  // 处理设置变更消息，实现实时同步
  if (request.action === 'settingsChanged') {
    broadcastMessage(request, sender.tab);
    return true;
  }
  
  // 处理语法变更消息，实现实时同步
  if (request.action === 'syntaxChanged') {
    broadcastMessage(request, sender.tab);
    return true;
  }
  
  // 过滤URL列表
  if (request.action === 'filterUrls') {
    chrome.storage.local.get('searchHackingSettings', function(result) {
      const settings = result.searchHackingSettings || {};
      const blacklist = settings.urlBlacklist || [];
      const filteredUrls = filterBlacklistedUrls(request.urls, blacklist);
      
      sendResponse({
        filteredUrls: filteredUrls,
        totalUrls: request.urls.length,
        filteredCount: request.urls.length - filteredUrls.length
      });
    });
    return true;
  }
});

/**
 * 检查URL是否为Google搜索页面
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 是否为Google搜索页面
 */
function isGoogleSearchUrl(url) {
  return url.includes('google.com/search') || 
         url.includes('google.com.hk/search') || 
         url.includes('google.cn/search') ||
         url.includes('google.co.jp/search') ||
         url.includes('google.co.uk/search') ||
         /google\.[a-z.]+\/search/.test(url);
}

/**
 * 检查URL是否为百度搜索页面
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 是否为百度搜索页面
 */
function isBaiduSearchUrl(url) {
  return url.includes('baidu.com/s') || 
         url.includes('baidu.com/baidu') ||
         /baidu\.com\/.*\?(wd|word)=/.test(url);
}

/**
 * 检查URL是否为Bing搜索页面
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 是否为Bing搜索页面
 */
function isBingSearchUrl(url) {
  return url.includes('bing.com/search') || 
         url.includes('bing.cn/search') ||
         /bing\.[a-z.]+\/search/.test(url);
}

/**
 * 检查URL是否包含site:参数
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 是否包含site:参数
 */
function hasSiteParameter(url) {
  return url.toLowerCase().includes('site%3A') || 
         url.toLowerCase().includes('site:');
}

/**
 * 注入脚本和样式到页面
 * @param {number} tabId - 标签页ID
 * @param {string} searchEngine - 搜索引擎类型 ('google', 'baidu', 'bing')
 */
function injectScriptsAndStyles(tabId, searchEngine) {
  // 根据搜索引擎类型选择不同的内容脚本
  let scriptFile, cssFile;
  
  switch (searchEngine) {
    case 'google':
      scriptFile = 'js/content.js';
      cssFile = 'css/content.css';
      break;
    case 'baidu':
      scriptFile = 'js/baidu-content.js';
      cssFile = 'css/baidu-content.css';
      break;
    case 'bing':
      scriptFile = 'js/bing-content.js';
      cssFile = 'css/bing-content.css';
      break;
    default:
      console.error('未知的搜索引擎类型:', searchEngine);
      return;
  }
  
  // 注入脚本
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    files: [scriptFile]
  }).then(() => {
    console.log(`${searchEngine}内容脚本注入成功`);
    
    // 注入样式
    return chrome.scripting.insertCSS({
      target: {tabId: tabId},
      files: [cssFile]
    });
  }).then(() => {
    console.log(`${searchEngine}样式注入成功`);
  }).catch(err => {
    console.error(`${searchEngine}脚本或样式注入失败:`, err);
  });
}

/**
 * 监听标签页更新，检测搜索引擎页面
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('页面加载完成:', tab.url);
    
    // 检查是否是Google、百度或Bing搜索结果页面
    const isGoogleSearch = isGoogleSearchUrl(tab.url);
    const isBaiduSearch = isBaiduSearchUrl(tab.url);
    const isBingSearch = isBingSearchUrl(tab.url);
    
    if (isGoogleSearch || isBaiduSearch || isBingSearch) {
      let searchEngine = '';
      if (isGoogleSearch) searchEngine = 'Google';
      else if (isBaiduSearch) searchEngine = 'Baidu';
      else if (isBingSearch) searchEngine = 'Bing';
      
      console.log('检测到搜索引擎页面:', searchEngine);
      
      // 检查URL中是否包含site:参数或启用测试模式直接注入
      const hasSiteParam = hasSiteParameter(tab.url);
      
      // 强制注入开关，为true时忽略site:参数检测
      const forceInject = true;
      
      if (hasSiteParam || forceInject) {
        if (!hasSiteParam) {
          console.log('测试模式：即使没有site:参数也注入侧边栏');
        } else {
          console.log('检测到site:参数，准备注入侧边栏');
        }
        
        // 获取设置
        chrome.storage.local.get('searchHackingSettings', function(result) {
          const settings = result.searchHackingSettings || {};
          
          // 在测试模式下或设置允许时注入
          if (forceInject || settings.sidebarEnabled !== false) {
            if (forceInject || 
                (isGoogleSearch && settings.googleEnabled !== false) || 
                (isBaiduSearch && settings.baiduEnabled !== false) ||
                (isBingSearch && settings.bingEnabled !== false)) {
              
              console.log('注入侧边栏到标签页:', tabId, searchEngine);
              
              // 注入侧边栏 - 添加延迟确保页面已完全加载
              setTimeout(() => {
                let engineType = '';
                if (isGoogleSearch) engineType = 'google';
                else if (isBaiduSearch) engineType = 'baidu';
                else if (isBingSearch) engineType = 'bing';
                
                injectScriptsAndStyles(tabId, engineType);
              }, 500);
            }
          }
        });
      } else {
        console.log('未检测到site:参数，跳过侧边栏注入');
      }
    }
  }
}); 