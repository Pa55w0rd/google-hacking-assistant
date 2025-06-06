/**
 * Search Hacking 助手 - Google搜索结果侧边栏注入脚本
 */

// 国际化工具函数
function getMessage(key, substitutions = null) {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const message = chrome.i18n.getMessage(key, substitutions);
      if (message) return message;
    }
    
    // 如果没有国际化文件，返回默认的中文文本
    const defaultMessages = {
      'sidebarTitle': 'Search Hacking 助手',
      'extractUrlBtn': '提取URL',
      'urlPanelTitle': '提取的URL',
      'copyAllUrlsBtn': '复制全部',
      'customSyntaxDivider': '自定义语法',
      'settingsBtn': '设置',
      'githubBtn': 'GitHub',
      'loading': '加载中...'
    };
    
    return defaultMessages[key] || key;
  } catch (error) {
    console.warn('Failed to get i18n message for key:', key, error);
    return key;
  }
}

// 主题管理功能
const ThemeManager = {
  // 获取当前主题
  async getCurrentTheme() {
    try {
      // 优先从Chrome存储读取
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get(['currentTheme'], resolve);
        });
        if (result.currentTheme) {
          return result.currentTheme;
        }
      }
      
      // 回退到localStorage
      const savedTheme = localStorage.getItem('currentTheme');
      if (savedTheme) {
        return savedTheme;
      }
      
      // 如果没有保存的主题，检测系统偏好
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch (error) {
      console.warn('获取主题失败，使用默认主题:', error);
      return 'light';
    }
  },

  // 应用主题到侧边栏
  applyThemeToSidebar(sidebar, theme) {
    if (!sidebar) return;
    
    console.log('[侧边栏] 应用主题:', theme);
    
    // 设置主题属性
    sidebar.setAttribute('data-theme', theme);
    
    // 确保侧边栏及其子元素都应用主题
    const applyThemeRecursively = (element) => {
      element.setAttribute('data-theme', theme);
      Array.from(element.children).forEach(child => {
        applyThemeRecursively(child);
      });
    };
    
    applyThemeRecursively(sidebar);
  },

  // 监听主题变化
  setupThemeListener(sidebar) {
    console.log('[侧边栏] 设置主题监听器');
    
    // 监听Chrome存储变化（与主题管理器同步）
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.currentTheme) {
          const newTheme = changes.currentTheme.newValue;
          if (newTheme) {
            console.log('[侧边栏] 检测到主题变化:', newTheme);
            this.applyThemeToSidebar(sidebar, newTheme);
          }
        }
      });
    }

    // 监听localStorage变化（跨标签页同步）
    window.addEventListener('storage', (e) => {
      if (e.key === 'currentTheme' && e.newValue) {
        console.log('[侧边栏] 检测到localStorage主题变化:', e.newValue);
        this.applyThemeToSidebar(sidebar, e.newValue);
      }
    });

    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = async (e) => {
        // 只有在用户没有手动设置主题时才自动切换
        const savedTheme = await this.getCurrentTheme();
        const userHasPreference = chrome && chrome.storage ? 
          await new Promise(resolve => chrome.storage.local.get(['userHasPreference'], resolve)).then(r => r.userHasPreference) :
          localStorage.getItem('userHasPreference') === 'true';
          
        if (!userHasPreference) {
          const newTheme = e.matches ? 'dark' : 'light';
          console.log('[侧边栏] 系统主题变化，应用新主题:', newTheme);
          this.applyThemeToSidebar(sidebar, newTheme);
        }
      };
      
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }
  }
};

// 防止重复注入
if (!window.hackingSidebarInjected) {
  window.hackingSidebarInjected = true;
  
  // 保存状态
  const state = {
    lastProcessedUrl: '',
    injectionInProgress: false,
    lastInjectionTime: 0,
    debounceTimers: {},
    observerPaused: false
  };
  
  // 防抖函数
  function debounce(fn, delay, id) {
    return function(...args) {
      // 清除之前的定时器
      if (state.debounceTimers[id]) {
        clearTimeout(state.debounceTimers[id]);
      }
      
      // 设置新的定时器
      state.debounceTimers[id] = setTimeout(() => {
        fn.apply(this, args);
        delete state.debounceTimers[id];
      }, delay);
    };
  }
  
  // 主函数 - 添加防抖和状态检查
  async function initHackingSidebar(forceCheck = false) {
    // 防止重复执行
    if (state.injectionInProgress) return;
    state.injectionInProgress = true;
    
    try {
      console.log('[侧边栏] 开始检查是否需要注入侧边栏', window.location.href);
      
      // 防抖处理 (至少间隔500ms)
      const now = Date.now();
      if (!forceCheck && now - state.lastInjectionTime < 500) {
        state.injectionInProgress = false;
        console.log('[侧边栏] 注入频率过高，本次注入被跳过');
        return;
      }

      // 检查URL是否发生实质性变化
      const currentUrl = window.location.href.split('#')[0]; // 忽略hash部分
      const currentUrlBase = currentUrl.split('?')[0]; // 忽略参数部分
      
      if (!forceCheck && currentUrlBase === state.lastProcessedUrl) {
        state.injectionInProgress = false;
        console.log('[侧边栏] URL未发生实质性变化，本次注入被跳过');
        return;
      }

      // 更新状态
      state.lastProcessedUrl = currentUrlBase;
      state.lastInjectionTime = now;

      // 平滑移除现有侧边栏
      await removeExistingSidebarWithAnimation();

      // 检查设置和条件
      const shouldInject = await checkInjectionConditions();
      if (!shouldInject) {
        state.injectionInProgress = false;
        console.log('[侧边栏] 不满足注入条件，本次注入被跳过');
        return;
      }

      // 暂停观察器避免循环触发
      pauseObservers();
      
      console.log('[侧边栏] 满足所有条件，开始执行注入');
      
      // 执行注入
      await proceedWithInjection();
      
      // 恢复观察器
      resumeObservers();
    } finally {
      // 确保状态被重置
      state.injectionInProgress = false;
    }
  }
  
  // 暂停所有观察器
  function pauseObservers() {
    state.observerPaused = true;
  }
  
  // 恢复所有观察器
  function resumeObservers() {
    setTimeout(() => {
      state.observerPaused = false;
    }, 1000); // 给DOM有足够时间稳定
  }
  
  // 带动画效果移除侧边栏
  function removeExistingSidebarWithAnimation() {
    return new Promise(resolve => {
      const existingSidebar = document.querySelector('.hacking-sidebar');
      if (!existingSidebar) {
        resolve();
        return;
      }
      
      // 添加过渡样式
      existingSidebar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      existingSidebar.style.opacity = '0';
      existingSidebar.style.transform = 'translateX(20px)';
      
      // 等待动画完成后移除
      setTimeout(() => {
        existingSidebar.remove();
        resolve();
      }, 300);
    });
  }

  // 检查注入条件
  async function checkInjectionConditions() {
    // 获取设置
    const settings = await getSafeStorageData('searchHackingSettings');

    console.log('[侧边栏] 检查注入条件，设置:', settings);

    // 检查基本设置
    if (settings.sidebarEnabled === false || settings.googleEnabled === false) {
      console.log('[侧边栏] 侧边栏已禁用或Google搜索支持已禁用');
      return false;
    }

    // 检查是否是Google搜索页面
    const isGoogleSearch = 
      location.hostname.includes('google.com') || 
      location.hostname.includes('google.') ||  // 支持任何Google国别域名，如google.it, google.fr等
      location.hostname === 'www.google' ||  // 部分环境下google.com会被解析为www.google
      location.hostname.endsWith('.google'); // 处理可能的子域名情况
    
    if (!isGoogleSearch) {
      console.log('[侧边栏] 不是Google搜索页面，当前域名:', location.hostname);
      return false;
    }

    // 确认是搜索结果页面
    const url = new URL(window.location.href);
    const isSearchPage = url.pathname === '/search' || url.pathname === '/';
    
    if (!isSearchPage) {
      console.log('[侧边栏] 不是搜索结果页面，当前路径:', url.pathname);
      return false;
    }

    // 检查site参数
    const params = new URLSearchParams(url.search);
    const query = params.get('q') || '';
    const hasSiteParam = query.toLowerCase().includes('site:');
    
    console.log('[侧边栏] 搜索查询:', query, '包含site参数:', hasSiteParam);
    
    return hasSiteParam;
  }

  // 侧边栏注入流程
  async function proceedWithInjection() {
    // 安全地发送消息到扩展的辅助函数
    async function safeSendMessage(message) {
      return new Promise((resolve) => {
        try {
          // 检查chrome API是否可用
          if (typeof chrome === 'undefined' || !chrome.runtime) {
            console.warn('Chrome API不可用，无法发送消息');
            resolve(null);
            return;
          }
          
          // 检查扩展是否有效
          if (chrome.runtime.lastError || !chrome.runtime.id) {
            console.warn('扩展上下文已失效，无法发送消息');
            resolve(null);
            return;
          }
          
          // 尝试发送消息
          chrome.runtime.sendMessage(message, function(response) {
            if (chrome.runtime.lastError) {
              console.error('发送消息出错:', chrome.runtime.lastError);
              resolve(null);
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          console.error('发送消息时出错:', error);
          resolve(null);
        }
      });
    }
    
    // 提取页面中的所有URL
    async function extractUrlsFromPage() {
      try {
        console.log('[URL提取] 开始从页面提取URL');
        
        // 使用Set去重，保存规范化后的URL
        const urlSet = new Set();
        const excludeDomains = ['google.com', 'gstatic.com', 'googleusercontent.com'];
        
        // 获取黑名单设置
        const settings = await getSafeStorageData('searchHackingSettings');
        
        console.log('[URL黑名单] 获取到设置:', settings);
        
        // 确保黑名单是数组
        const blacklist = Array.isArray(settings.urlBlacklist) ? settings.urlBlacklist : [];
        console.log(`[URL黑名单] 黑名单规则数量: ${blacklist.length}`);
        if (blacklist.length > 0) {
          console.log('[URL黑名单] 黑名单规则内容:', blacklist);
        }
        
        // 编译正则表达式黑名单（提前编译以提高性能）
        const regexBlacklist = blacklist
          .filter(rule => rule.startsWith('/') && rule.endsWith('/'))
          .map(rule => {
            try {
              return new RegExp(rule.slice(1, -1), 'i');
            } catch (e) {
              console.error('无效的正则表达式规则:', rule, e);
              return null;
            }
          })
          .filter(Boolean); // 移除无效的正则
        
        console.log(`[URL黑名单] 正则黑名单规则数量: ${regexBlacklist.length}`);
        
        // 普通域名黑名单
        const domainBlacklist = blacklist
          .filter(rule => !rule.startsWith('/') || !rule.endsWith('/'));
        
        console.log(`[URL黑名单] 域名黑名单规则数量: ${domainBlacklist.length}`);
        
        // 预处理域名黑名单规则，转换通配符
        const processedDomainRules = domainBlacklist.map(rule => {
          // 处理以*.开头的域名规则
          if (rule.startsWith('*.')) {
            const domainPart = rule.substring(2); // 去掉*.
            console.log(`[URL黑名单] 通配符域名规则 "${rule}" 将匹配所有 "${domainPart}" 的子域名`);
            return {
              original: rule,
              type: 'wildcard',
              domain: domainPart
            };
          } else {
            return {
              original: rule,
              type: 'normal',
              domain: rule
            };
          }
        });
        
        console.log(`[URL黑名单] 处理后的域名规则:`, processedDomainRules);
        
        // 辅助函数：检查URL是否应该被排除
        const shouldExcludeUrl = (url) => {
          if (!url || !url.startsWith('http')) return true;
          
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            let isBlacklisted = false;
            let blacklistReason = '';
            
            // 排除插件自身的GitHub链接及Google产品页面
            if (url.includes('github.com/Pa55w0rd/google-hacking-assistant') ||
                url.includes('google.cn/intl/zh-CN/about/products') ||
                url.includes('google.com/intl/') ||
                url.match(/\/\/[^\/]+google\.com\/products\/?/) ||
                // 添加对所有Google域名下的产品页面和intl路径的过滤
                url.match(/\/\/[^\/]+google\.[^\/]+\/intl\//) ||
                url.match(/\/\/[^\/]+google\.[^\/]+\/about\/products/) ||
                url.includes('/products') && url.match(/\/\/[^\/]+google\.[^\/]+\//)) {
              console.log(`[URL黑名单] 过滤URL: ${url}, 原因: Google产品页面或固定链接`);
              return true;
            }
            
            // 检查内置排除域名
            for (const domain of excludeDomains) {
              if (hostname.includes(domain)) {
                console.log(`[URL黑名单] 过滤URL: ${url}, 原因: 内置黑名单: ${domain}`);
                return true;
              }
            }
            
            // 检查特殊内置规则
            if (url.includes('chrome-extension://') || 
                url.startsWith('javascript:') || 
                url.includes('webcache.googleusercontent.com') ||
                url.includes('translate.google.com')) {
              console.log(`[URL黑名单] 过滤URL: ${url}, 原因: 特殊协议或服务过滤`);
              return true;
            }
            
            // 检查域名黑名单
            for (const rule of processedDomainRules) {
              let isDomainMatch = false;
              
              if (rule.type === 'wildcard') {
                // 通配符规则: *.example.com 匹配 a.example.com, sub.example.com 等
                isDomainMatch = hostname.endsWith('.' + rule.domain) || hostname === rule.domain;
                console.log(`[URL黑名单调试] 检查URL主机名: ${hostname} 与通配符域名规则: ${rule.original}, 匹配结果: ${isDomainMatch}`);
              } else {
                // 普通规则
                isDomainMatch = 
                  hostname === rule.domain || // 完全匹配
                  hostname.endsWith('.' + rule.domain) || // 子域名匹配
                  hostname.includes(rule.domain); // 包含匹配(原方式)
                
                console.log(`[URL黑名单调试] 检查URL主机名: ${hostname} 与域名规则: ${rule.original}, 匹配结果: ${isDomainMatch}`);
              }
              
              if (isDomainMatch) {
                console.log(`[URL黑名单] 过滤URL: ${url}, 原因: 命中域名黑名单: "${rule.original}"`);
                return true;
              }
            }
            
            // 检查正则表达式黑名单
            for (const regex of regexBlacklist) {
              const isRegexMatch = regex.test(url);
              console.log(`[URL黑名单调试] 检查URL: ${url} 与正则规则: ${regex.toString()}, 匹配结果: ${isRegexMatch}`);
              
              if (isRegexMatch) {
                console.log(`[URL黑名单] 过滤URL: ${url}, 原因: 命中正则黑名单: ${regex.toString()}`);
                return true;
              }
            }
            
            return false;
          } catch (e) {
            // URL解析错误，默认排除
            console.error('[URL黑名单] URL解析错误:', e, url);
            return true;
          }
        };
        
        // 规范化URL，类似于百度侧边栏逻辑
        const normalizeUrl = (url) => {
          try {
            const urlObj = new URL(url);
            // 移除URL中的google重定向、utm参数等
            if (urlObj.searchParams.has('url')) {
              const redirectUrl = urlObj.searchParams.get('url');
              if (redirectUrl.startsWith('http')) {
                return redirectUrl; // 返回重定向URL
              }
            }
            
            // 移除Google的其他参数
            const paramsToRemove = ['ved', 'usg', 'ei', 'sa', 'source', 'cd', 'rct', 'cad', 'uact', 'aqs', 'sourceid', 'sxsrf'];
            paramsToRemove.forEach(param => {
              urlObj.searchParams.delete(param);
            });
            
            // 返回规范化的URL
            return urlObj.toString();
          } catch (e) {
            console.error('[URL提取] 规范化URL出错:', e, url);
            return url;
          }
        };
        
        // 添加URL到集合，类似百度侧边栏
        const addUrlToSet = (url) => {
          // 先检查是否应该排除
          if (shouldExcludeUrl(url)) return;
          
          // 规范化URL
          const normalizedUrl = normalizeUrl(url);
          
          // 再次检查规范化后的URL是否应该排除
          if (shouldExcludeUrl(normalizedUrl)) return;
          
          // 添加到URL集合
          urlSet.add(normalizedUrl);
          console.log(`[URL提取] 添加URL: ${normalizedUrl}`);
        };
        
        // 专注于提取搜索结果链接
        console.log('[URL提取] 开始检索Google搜索结果');
        
        // 1. 主要搜索结果链接 - 这是最准确的选择器组合
        const mainSelectors = [
          '.g a[href^="http"]', // 最基本的选择器：所有g类下的链接
          '.yuRUbf > a[href]', // 标准搜索结果链接
          '.tF2Cxc > a[href]', // 另一种标准结果链接
          '.Z26q7c > a[href]', // 新版搜索结果链接
          'div[data-snf] a[href^="http"]', // 基于data属性的搜索结果
          '.g h3.LC20lb', // 带标题的结果(向上查找父链接)
          '[data-header-feature] a[href^="http"]', // 特性头部的链接
          '.rc a[href^="http"]', // 旧版搜索结果容器中的链接
          '.jtfYYd a[href^="http"]', // 另一种搜索结果容器中的链接
          '.kCrYT > a[href]' // 移动版搜索结果
        ];
        
        // 记录找到的链接数量
        let foundLinks = 0;
        
        // 排除的容器选择器，不应从其中提取链接
        const excludedContainers = [
          'footer',
          '.bj9MHd',
          '.SzZmKb',
          '.ikrT4e',
          '.o3j99',
          '#footcnt',
          '#botstuff',
          '.hacking-sidebar',
          '[aria-label="Footer"]'
        ];
        
        // 检查元素是否在排除容器内
        const isInExcludedContainer = (element) => {
          for (const selector of excludedContainers) {
            if (element.closest(selector)) {
              return true;
            }
          }
          return false;
        };
        
        // 使用组合选择器提取链接
        for (const selector of mainSelectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`[URL提取] 选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          elements.forEach((element, index) => {
            // 检查是否在排除容器内
            if (isInExcludedContainer(element)) {
              console.log(`[URL提取] 跳过位于排除容器内的元素: ${index+1}`);
              return;
            }
            
            let link;
            // 如果元素是链接，直接使用
            if (element.tagName === 'A' && element.hasAttribute('href')) {
              link = element;
              console.log(`[URL提取] 直接使用链接元素: ${link.href.substring(0, 100)}...`);
            } 
            // 如果是标题元素，向上查找最近的链接
            else {
              link = element.closest('a[href]');
              if (link) {
                console.log(`[URL提取] 从标题元素找到父链接: ${link.href.substring(0, 100)}...`);
              }
            }
            
            if (link && link.href) {
              addUrlToSet(link.href);
              foundLinks++;
            }
          });
        }
        
        console.log(`[URL提取] 第一阶段共找到 ${foundLinks} 个链接`);
        
        // 2. 如果找到的链接不足，尝试从cite元素获取
        if (foundLinks < 5) {
          console.log('[URL提取] 链接不足，尝试从cite元素获取');
          
          const citeElements = document.querySelectorAll('.g cite');
          citeElements.forEach(cite => {
            if (isInExcludedContainer(cite)) return;
            
            const citeText = cite.textContent.trim();
            if (citeText) {
              // 尝试构建有效URL
              let citeUrl = citeText;
              if (!citeUrl.startsWith('http')) {
                citeUrl = 'http://' + citeUrl;
              }
              
              try {
                // 验证是否为有效URL
                new URL(citeUrl);
                addUrlToSet(citeUrl);
                foundLinks++;
              } catch (e) {
                console.log(`[URL提取] 无效的cite URL: ${citeUrl}`);
              }
            }
          });
        }
        
        console.log(`[URL提取] 第二阶段共找到 ${foundLinks} 个链接`);
        
        // 3. 最后尝试从基本链接选择器获取，但排除已知的干扰项
        if (foundLinks < 3) {
          console.log('[URL提取] 链接严重不足，尝试最直接的选择器');
          
          // 直接输出主要搜索结果容器信息，帮助调试
          const mainContainer = document.getElementById('search');
          if (mainContainer) {
            console.log('[URL提取] 找到搜索结果主容器 #search');
            const mainLinks = mainContainer.querySelectorAll('a[href^="http"]');
            console.log(`[URL提取] 主容器中共有 ${mainLinks.length} 个链接`);
            
            // 尝试识别所有可能的结果容器类名
            const divsWithLinks = new Map();
            mainContainer.querySelectorAll('div').forEach(div => {
              if (div.querySelectorAll('a[href^="http"]').length > 0) {
                const className = div.className || '无类名';
                if (!divsWithLinks.has(className)) {
                  divsWithLinks.set(className, 0);
                }
                divsWithLinks.set(className, divsWithLinks.get(className) + 1);
              }
            });
            console.log('[URL提取] 所有包含链接的div类名统计:', Object.fromEntries(divsWithLinks));
          }
          
          // 直接使用更简单的选择器
          const directSelectors = [
            '#search a[href^="http"]',
            '#rso a[href^="http"]',
            '#main a[href^="http"]',
            'div[data-hveid] a[href^="http"]',
            '.g a[href^="http"]'
          ];
          
          for (const selector of directSelectors) {
            const links = document.querySelectorAll(selector);
            console.log(`[URL提取] 直接选择器 "${selector}" 找到 ${links.length} 个链接`);
            
            links.forEach(link => {
              if (isInExcludedContainer(link)) return;
              
              // 排除导航链接、翻页链接等
              if (link.textContent.trim().length < 3) return; // 忽略文本过短的链接
              if (link.querySelector('img:only-child')) return; // 忽略只有图片的链接
              
              addUrlToSet(link.href);
              foundLinks++;
            });
            
            if (urlSet.size >= 5) break; // 找到足够的URL就停止
          }
        }
        
        console.log(`[URL提取] 最终共找到 ${foundLinks} 个链接，去重后 ${urlSet.size} 个`);
        
        // 转换为数组并排序
        const urlArray = Array.from(urlSet);
        return urlArray;
      } catch (error) {
        console.error('[URL提取] 提取过程中出错:', error);
        return []; // 出错时返回空数组
      }
    }
    
    // 创建语法按钮
    function createSyntaxButton(syntax) {
      const button = document.createElement('div');
      button.className = `syntax-btn risk-${syntax.risk}`;
      
      button.innerHTML = `
        <span>${syntax.name}</span>
        <div class="text-xs text-gray-500">${syntax.risk}</div>
      `;
      
      button.addEventListener('click', async () => {
        const targetDomain = extractTargetDomain();
        if (targetDomain) {
          const searchQuery = syntax.template.replace('{target_domain}', targetDomain);
          
          // 采用异步方式获取设置，确保设置已加载
          const settings = await getSafeStorageData('searchHackingSettings');
          
          // 明确检查openInNewTab设置，默认为true
          const openInNewTab = settings.openInNewTab !== false;
          console.log('语法按钮点击 - 打开方式:', openInNewTab ? '新标签页' : '当前页面');
          
          if (openInNewTab) {
            // 使用window.open在新标签页中打开
            window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
          } else {
            // 在当前页面打开
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
          }
        } else {
          alert('无法确定目标域名，请确保URL中包含 site: 参数');
        }
      });
      
      return button;
    }
    
    // 创建侧边栏
    function createSidebar(syntaxLibrary) {
      const sidebarContainer = document.createElement('div');
      sidebarContainer.className = 'hacking-sidebar glass-morph';
      
      // 准备动画效果
      sidebarContainer.style.opacity = '0';
      sidebarContainer.style.transform = 'translateX(20px)';
      sidebarContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      // 侧边栏标题
      const headerElement = document.createElement('div');
      headerElement.className = 'sidebar-header';
      headerElement.innerHTML = `
        <div class="sidebar-header-title">${getMessage('sidebarTitle')}</div>
        <div class="sidebar-header-actions">
          <button id="extractUrlBtn" class="sidebar-button blue-button">
            <i class="fas fa-link"></i> ${getMessage('extractUrlBtn')}
          </button>
        </div>
      `;
      sidebarContainer.appendChild(headerElement);
      
      // URL提取面板（默认隐藏）
      const urlPanel = document.createElement('div');
      urlPanel.id = 'urlExtractorPanel';
      urlPanel.className = 'url-panel';
      urlPanel.style.display = 'none';
      urlPanel.innerHTML = `
        <div class="url-panel-header">
          <div class="url-panel-title">${getMessage('urlPanelTitle')} <span id="urlCount" class="url-count">(0)</span></div>
          <div class="url-panel-actions">
            <button id="copyAllUrlsBtn" class="sidebar-button blue-button">
              ${getMessage('copyAllUrlsBtn')}
            </button>
            <button id="collapseUrlPanelBtn" class="sidebar-button gray-button">
              <i class="fas fa-chevron-up"></i>
            </button>
          </div>
        </div>
        <div id="urlList" class="url-list"></div>
      `;
      sidebarContainer.appendChild(urlPanel);
      
      // 语法按钮容器
      const syntaxContainer = document.createElement('div');
      syntaxContainer.className = 'syntax-container';
      
      // 区分内置和自定义语法
      const builtinSyntaxItems = [];
      const customSyntaxItems = [];
      
      syntaxLibrary.forEach(syntax => {
        // 检查语法是否启用以及是否支持Google搜索引擎
        const isEnabledForGoogle = syntax.enabled && (
          (syntax.engineSettings && syntax.engineSettings.google) || 
          (!syntax.engineSettings && (syntax.engines.includes('google') || syntax.engines.includes('all')))
        );
        
        if (isEnabledForGoogle) {
          if (syntax.builtin) {
            builtinSyntaxItems.push(syntax);
          } else {
            customSyntaxItems.push(syntax);
          }
        }
      });
      
      // 先添加内置语法
      builtinSyntaxItems.forEach(syntax => {
        syntaxContainer.appendChild(createSyntaxButton(syntax));
      });
      
      // 如果有自定义语法，添加一个分隔标签
      if (customSyntaxItems.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'syntax-divider';
        divider.textContent = getMessage('customSyntaxDivider');
        syntaxContainer.appendChild(divider);
        
        // 添加自定义语法
        customSyntaxItems.forEach(syntax => {
          syntaxContainer.appendChild(createSyntaxButton(syntax));
        });
      }
      
      sidebarContainer.appendChild(syntaxContainer);
      
      // 添加底部
      const footerElement = document.createElement('div');
      footerElement.className = 'sidebar-footer';
      footerElement.innerHTML = `
        <div class="sidebar-footer-links">
          <a href="chrome-extension://${chrome.runtime.id}/options.html" class="sidebar-footer-link" target="_blank">
            <i class="fas fa-cog"></i> ${getMessage('settingsBtn')}
          </a>
          <a href="#" class="sidebar-footer-link" target="_blank" id="sidebarGithubLink">
            <i class="fab fa-github"></i> ${getMessage('githubBtn')}
          </a>
        </div>
        <div class="sidebar-footer-version" id="sidebarVersion">${getMessage('loading')}</div>
      `;
      sidebarContainer.appendChild(footerElement);
      
      // 动态设置版本号和GitHub链接
      const manifest = chrome.runtime.getManifest();
      const versionElement = footerElement.querySelector('#sidebarVersion');
      const githubLinkElement = footerElement.querySelector('#sidebarGithubLink');
      
      if (versionElement) {
        versionElement.textContent = `v${manifest.version}`;
      }
      
      if (githubLinkElement && manifest.homepage_url) {
        githubLinkElement.href = manifest.homepage_url;
      }
      
      return sidebarContainer;
    }
    
    // 注入Font Awesome图标库（如果尚未加载）
    function injectFontAwesome() {
      if (document.querySelector('link[href*="font-awesome"]')) {
        return; // 已经加载了Font Awesome
      }
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
    
    // 获取当前页面域名
    function extractTargetDomain() {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      const query = params.get('q') || '';
      
      // 尝试从查询中提取site:xxx.com
      const siteMatch = query.match(/site:([^\s]+)/i);
      
      if (siteMatch) {
        return siteMatch[1];
      }
      
      return '';
    }
    
    // 注入侧边栏到页面
    function injectSidebar(syntaxLibrary) {
      // 检查是否已经存在侧边栏
      if (document.querySelector('.hacking-sidebar')) {
        console.log('[侧边栏] 侧边栏已存在，跳过注入');
        return;
      }
      
      console.log('[侧边栏] 开始注入侧边栏到页面');
      
      // 注入Font Awesome
      injectFontAwesome();
      
      // 创建侧边栏元素
      const sidebar = createSidebar(syntaxLibrary);
      
      // 应用主题到侧边栏
      (async () => {
        try {
          const currentTheme = await ThemeManager.getCurrentTheme();
          ThemeManager.applyThemeToSidebar(sidebar, currentTheme);
          ThemeManager.setupThemeListener(sidebar);
          console.log('[侧边栏] 已应用主题:', currentTheme);
        } catch (error) {
          console.warn('[侧边栏] 应用主题失败:', error);
        }
      })();
      
      // 查找Google搜索结果布局容器
      // 针对 google.com 和其他区域 Google 搜索页面进行特殊处理
      const rcnt = document.querySelector('#rcnt');
      const centerCol = document.querySelector('#center_col');
      const main = document.querySelector('#main');
      const rhs = document.querySelector('#rhs'); // Google右侧栏
      
      console.log('[侧边栏] 容器检测 - rcnt:', !!rcnt, 'centerCol:', !!centerCol, 'main:', !!main, 'rhs:', !!rhs);
      
      // 使用层级组合选择器定位目标元素
      const googleSearchResults = centerCol || main || (rcnt ? rcnt.querySelector('div') : null);
      
      // 更多详细的搜索结果布局检测
      if (!googleSearchResults) {
        console.log('[侧边栏] 无法找到标准搜索结果容器，尝试查找替代容器');
        
        // 尝试查找所有可能的结果容器选择器
        const possibleContainers = [
          '.main', // 可能的主容器
          '#search', // 搜索结果区
          '.srg', // 搜索结果组
          '.RzSX7d', // 新的结果容器类
          'div[data-hveid]', // 带有数据属性的结果容器
          '#res', // 旧版结果容器
          '#search-results' // 通用搜索结果选择器
        ];
        
        let alternativeContainer = null;
        for (const selector of possibleContainers) {
          const element = document.querySelector(selector);
          if (element) {
            console.log(`[侧边栏] 找到替代容器: ${selector}`);
            alternativeContainer = element;
            break;
          }
        }
        
        if (!alternativeContainer) {
          console.error('[侧边栏] 无法找到任何可用的搜索结果容器，尝试强制注入到页面');
          
          // 强制注入到页面上
          const mainContent = document.querySelector('body > div') || document.body;
          const forceContainer = document.createElement('div');
          forceContainer.className = 'search-hacking-force-container';
          forceContainer.style.display = 'flex';
          forceContainer.style.justifyContent = 'space-between';
          forceContainer.style.width = '100%';
          forceContainer.style.maxWidth = '1200px';
          forceContainer.style.margin = '10px auto';
          forceContainer.style.padding = '0 16px';
          
          const sidebarWrapper = document.createElement('div');
          sidebarWrapper.style.width = '320px';
          sidebarWrapper.appendChild(sidebar);
          
          mainContent.insertBefore(forceContainer, mainContent.firstChild);
          forceContainer.appendChild(sidebarWrapper);
          
          console.log('[侧边栏] 已强制注入到页面顶部');
          
          // 绑定事件处理程序
          bindSidebarEvents(sidebar);
          
          // 淡入效果
          setTimeout(() => {
            sidebar.style.opacity = '1';
            sidebar.style.transform = 'translateX(0)';
          }, 50);
          
          return;
        } else {
          // 使用找到的替代容器
          const forceContainer = document.createElement('div');
          forceContainer.className = 'search-hacking-alt-container';
          forceContainer.style.display = 'flex';
          forceContainer.style.width = '100%';
          forceContainer.style.margin = '10px 0';
          
          const sidebarWrapper = document.createElement('div');
          sidebarWrapper.style.width = '320px';
          sidebarWrapper.style.minWidth = '320px';
          sidebarWrapper.style.marginLeft = '20px';
          sidebarWrapper.appendChild(sidebar);
          
          alternativeContainer.parentNode.insertBefore(forceContainer, alternativeContainer.nextSibling);
          forceContainer.appendChild(sidebarWrapper);
          
          console.log('[侧边栏] 已注入到替代容器之后');
          
          // 绑定事件处理程序
          bindSidebarEvents(sidebar);
          
          // 淡入效果
          setTimeout(() => {
            sidebar.style.opacity = '1';
            sidebar.style.transform = 'translateX(0)';
          }, 50);
          
          return;
        }
      }
      
      // 查找右侧栏或创建一个新的
      let rightColumn = document.querySelector('#rhs');
      
      // 如果没有找到右侧栏，则创建一个
      if (!rightColumn) {
        // 获取父容器
        let parentContainer = null;
        
        // 尝试查找 Google 搜索结果的各种可能父容器
        if (rcnt) {
          parentContainer = rcnt;
        } else if (googleSearchResults.parentElement) {
          parentContainer = googleSearchResults.parentElement;
        } else {
          // 创建一个新的container并插入到body
          parentContainer = document.createElement('div');
          parentContainer.style.display = 'flex';
          parentContainer.style.width = '100%';
          parentContainer.style.justifyContent = 'center';
          document.body.insertBefore(parentContainer, document.body.firstChild);
        }
        
        if (!parentContainer) {
          console.error('无法找到父容器');
          return;
        }
        
        // 创建右侧栏
        rightColumn = document.createElement('div');
        rightColumn.id = 'rhs';
        rightColumn.style.marginLeft = '20px';
        rightColumn.style.maxWidth = '320px';
        rightColumn.style.minWidth = '320px';
        
        // 创建容器包裹搜索结果和右侧栏
        const wrapperContainer = document.createElement('div');
        wrapperContainer.style.display = 'flex';
        wrapperContainer.style.width = '100%';
        wrapperContainer.className = 'search-hacking-wrapper';
        
        // 移动搜索结果到新容器
        if (rcnt && rcnt.contains(googleSearchResults)) {
          // 对于标准布局，不克隆而是直接添加右侧栏
          wrapperContainer.appendChild(rightColumn);
          // 将包装容器添加到rcnt中的正确位置
          if (googleSearchResults.nextSibling) {
            parentContainer.insertBefore(wrapperContainer, googleSearchResults.nextSibling);
          } else {
            parentContainer.appendChild(wrapperContainer);
          }
        } else {
          // 对于非标准布局，直接在搜索结果旁边添加侧边栏
          try {
            // 创建简单的右侧栏，不干扰搜索结果
            parentContainer.appendChild(rightColumn);
          } catch (e) {
            console.error('添加右侧栏时出错:', e);
            // 如果出错，尝试最简单的注入方式
            parentContainer.appendChild(rightColumn);
          }
        }
      }
      
      // 插入侧边栏到右侧栏
      try {
        rightColumn.insertBefore(sidebar, rightColumn.firstChild);
        
        // 淡入效果
        setTimeout(() => {
          sidebar.style.opacity = '1';
          sidebar.style.transform = 'translateX(0)';
        }, 50);
      } catch (e) {
        console.error('插入侧边栏时出错:', e);
        // 如果插入失败，尝试直接添加到body
        const standaloneContainer = document.createElement('div');
        standaloneContainer.style.position = 'fixed';
        standaloneContainer.style.top = '80px';
        standaloneContainer.style.right = '20px';
        standaloneContainer.style.zIndex = '9999';
        standaloneContainer.appendChild(sidebar);
        document.body.appendChild(standaloneContainer);
        
        // 淡入效果
        setTimeout(() => {
          sidebar.style.opacity = '1';
          sidebar.style.transform = 'translateX(0)';
        }, 50);
      }
      
      // 绑定事件处理程序
      bindSidebarEvents(sidebar);
    }
    
    // 绑定侧边栏事件
    function bindSidebarEvents(sidebar) {
      // URL提取功能
      const extractUrlBtn = sidebar.querySelector('#extractUrlBtn');
      const urlPanel = sidebar.querySelector('#urlExtractorPanel');
      const urlList = sidebar.querySelector('#urlList');
      const urlCount = sidebar.querySelector('#urlCount');
      
      if (extractUrlBtn && urlPanel && urlList) {
        extractUrlBtn.addEventListener('click', () => {
          // 切换URL面板显示状态
          const isVisible = urlPanel.style.display !== 'none';
          urlPanel.style.display = isVisible ? 'none' : 'block';
          
          // 如果显示，则提取URL
          if (!isVisible) {
            // 显示加载状态
            urlList.innerHTML = '<div class="url-item">正在提取URL...</div>';
            if (urlCount) {
              urlCount.textContent = '(...)';
            }
            
            // 使用setTimeout允许UI更新，然后进行可能耗时的URL提取
            setTimeout(async () => {
              try {
                console.log('[URL提取] 开始提取URL过程');
                // 确保使用await等待异步结果
                const urls = await extractUrlsFromPage();
                urlList.innerHTML = '';
                
                // 确保urls是数组
                if (!Array.isArray(urls)) {
                  console.error('[URL提取] 提取失败: 结果不是数组', urls);
                  urlList.innerHTML = '<div class="url-item">提取URL时出错 - 结果类型错误</div>';
                  if (urlCount) {
                    urlCount.textContent = '(0)';
                  }
                  return;
                }
                
                // 更新URL计数
                if (urlCount) {
                  urlCount.textContent = `(${urls.length})`;
                }
                
                if (urls.length === 0) {
                  // 添加提取状态信息，帮助用户理解
                  const debugInfo = document.createElement('div');
                  debugInfo.className = 'url-debug-info';
                  debugInfo.innerHTML = `
                    <div class="debug-icon"><i class="fas fa-exclamation-circle"></i></div>
                    <div class="debug-content">
                      <div class="debug-title">无法提取URL</div>
                      <div class="debug-tips">
                        <p>${getMessage('urlExtractionErrorTips')}</p>
                      </div>
                      
                    </div>
                  `;
                  
                  // 添加重试按钮事件
                  const refreshBtn = debugInfo.querySelector('.refresh-btn');
                  if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => {
                      extractUrlBtn.click();
                    });
                  }
                  
                  urlList.appendChild(debugInfo);
                } else {
                  console.log('[URL提取] 显示提取到的URL:', urls);
                  urls.forEach(url => {
                    const urlItem = document.createElement('div');
                    urlItem.className = 'url-item';
                    
                    // 简化URL项显示，参考百度侧边栏
                    urlItem.textContent = url;
                    urlItem.title = url;
                    
                    // URL项点击整体处理（默认为复制）
                    urlItem.addEventListener('click', async (e) => {
                      // 异步方式获取设置，确保数据最新
                      const settings = await getSafeStorageData('searchHackingSettings');
                      
                      // 获取URL点击动作配置
                      const urlClickAction = settings.urlClickAction || 'copy';
                      
                      if (urlClickAction === 'open') {
                        // 检查打开方式
                        const openInNewTab = settings.openInNewTab !== false;
                        
                        if (openInNewTab) {
                          window.open(url, '_blank');
                        } else {
                          window.location.href = url;
                        }
                      } else {
                        // 默认为复制
                        try {
                          await navigator.clipboard.writeText(url);
                          // 显示复制成功的临时提示
                          urlItem.style.backgroundColor = '#e6f4ea';
                          urlItem.style.borderLeft = '3px solid #34a853';
                          urlItem.innerHTML = `<div class="copy-success"><i class="fas fa-check"></i> ${getMessage('copySuccess')}: ${url}</div>`;
                          setTimeout(() => {
                            urlItem.style.backgroundColor = '';
                            urlItem.style.borderLeft = '';
                            urlItem.textContent = url;
                          }, 1200);
                        } catch (err) {
                          console.error('复制失败:', err);
                          // 显示错误
                          urlItem.style.backgroundColor = '#fce8e6';
                          urlItem.style.borderLeft = '3px solid #ea4335';
                          urlItem.innerHTML = `<div class="copy-error"><i class="fas fa-times"></i> ${getMessage('copyError')}: ${url}</div>`;
                          setTimeout(() => {
                            urlItem.style.backgroundColor = '';
                            urlItem.style.borderLeft = '';
                            urlItem.textContent = url;
                          }, 1200);
                        }
                      }
                    });
                    
                    urlList.appendChild(urlItem);
                  });
                }
              } catch (error) {
                console.error('[URL提取] 提取URL过程中出错:', error);
                urlList.innerHTML = '';
                
                // 创建更友好的错误提示
                const errorInfo = document.createElement('div');
                errorInfo.className = 'url-debug-info error';
                errorInfo.innerHTML = `
                  <div class="debug-icon"><i class="fas fa-times-circle"></i></div>
                  <div class="debug-content">
                    <div class="debug-title">提取过程中出错</div>
                    <div class="debug-tips">
                      <p>${getMessage('urlExtractionErrorTips')}</p>
                    </div>
                    <div class="debug-action">
                      <button class="refresh-btn"><i class="fas fa-sync-alt"></i> ${getMessage('refreshBtn')}</button>
                    </div>
                  </div>
                `;
                
                // 添加重试按钮事件
                const refreshBtn = errorInfo.querySelector('.refresh-btn');
                if (refreshBtn) {
                  refreshBtn.addEventListener('click', () => {
                    extractUrlBtn.click();
                  });
                }
                
                urlList.appendChild(errorInfo);
                if (urlCount) {
                  urlCount.textContent = '(0)';
                }
              }
            }, 100);
          }
        });
      }
      
      // 收起URL面板
      const collapseUrlPanelBtn = sidebar.querySelector('#collapseUrlPanelBtn');
      if (collapseUrlPanelBtn && urlPanel) {
        collapseUrlPanelBtn.addEventListener('click', () => {
          urlPanel.style.display = 'none';
        });
      }
      
      // 复制所有URL
      const copyAllUrlsBtn = sidebar.querySelector('#copyAllUrlsBtn');
      if (copyAllUrlsBtn) {
        copyAllUrlsBtn.addEventListener('click', async () => {
          try {
            // 确保使用await等待异步结果
            const urls = await extractUrlsFromPage();
            
            // 确保urls是数组
            if (!Array.isArray(urls)) {
              console.error('提取URL失败: 结果不是数组', urls);
              copyAllUrlsBtn.textContent = '出错了';
              copyAllUrlsBtn.style.backgroundColor = '#fce8e6';
              copyAllUrlsBtn.style.borderColor = '#ea4335';
              copyAllUrlsBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> 出错了';
              setTimeout(() => {
                copyAllUrlsBtn.textContent = '复制全部';
                copyAllUrlsBtn.style.backgroundColor = '';
                copyAllUrlsBtn.style.borderColor = '';
              }, 1500);
              return;
            }
            
            if (urls.length > 0) {
              navigator.clipboard.writeText(urls.join('\n'))
                .then(() => {
                  // 显示复制成功的临时提示
                  copyAllUrlsBtn.textContent = '已复制';
                  copyAllUrlsBtn.style.backgroundColor = '#e6f4ea';
                  copyAllUrlsBtn.style.borderColor = '#34a853';
                  copyAllUrlsBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
                  setTimeout(() => {
                    copyAllUrlsBtn.textContent = '复制全部';
                    copyAllUrlsBtn.style.backgroundColor = '';
                    copyAllUrlsBtn.style.borderColor = '';
                  }, 1500);
                })
                .catch(err => {
                  console.error('复制失败:', err);
                  // 显示错误提示
                  copyAllUrlsBtn.textContent = '复制失败';
                  copyAllUrlsBtn.style.backgroundColor = '#fce8e6';
                  copyAllUrlsBtn.style.borderColor = '#ea4335';
                  copyAllUrlsBtn.innerHTML = '<i class="fas fa-times"></i> 复制失败';
                  setTimeout(() => {
                    copyAllUrlsBtn.textContent = '复制全部';
                    copyAllUrlsBtn.style.backgroundColor = '';
                    copyAllUrlsBtn.style.borderColor = '';
                  }, 1500);
                });
            } else {
              // 没有URL可复制
              copyAllUrlsBtn.textContent = '无URL';
              copyAllUrlsBtn.style.backgroundColor = '#f8f9fa';
              copyAllUrlsBtn.style.borderColor = '#dadce0';
              copyAllUrlsBtn.innerHTML = '<i class="fas fa-info-circle"></i> 无URL';
              setTimeout(() => {
                copyAllUrlsBtn.textContent = '复制全部';
                copyAllUrlsBtn.style.backgroundColor = '';
                copyAllUrlsBtn.style.borderColor = '';
              }, 1500);
            }
          } catch (error) {
            console.error('复制全部URL时出错:', error);
            copyAllUrlsBtn.textContent = '出错了';
            copyAllUrlsBtn.style.backgroundColor = '#fce8e6';
            copyAllUrlsBtn.style.borderColor = '#ea4335';
            copyAllUrlsBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> 出错了';
            setTimeout(() => {
              copyAllUrlsBtn.textContent = '复制全部';
              copyAllUrlsBtn.style.backgroundColor = '';
              copyAllUrlsBtn.style.borderColor = '';
            }, 1500);
          }
        });
      }
    }
    
    // 获取语法库并注入侧边栏
    return new Promise(resolve => {
      safeSendMessage({action: 'getSyntaxLibrary'}).then(response => {
        if (response && response.syntaxLibrary) {
          // 注入侧边栏
          injectSidebar(response.syntaxLibrary);
          resolve();
        } else {
          console.error('无法获取语法库，尝试使用内置语法');
          // 使用一个简单的内置语法库作为备份
          const fallbackSyntax = [
            {
              id: "fallback_simple",
              name: "文档文件",
              template: "site:{target_domain} filetype:pdf OR filetype:doc",
              enabled: true,
              risk: "info",
              engines: ["google", "baidu", "bing"],
              builtin: true
            }
          ];
          
          // 注入侧边栏
          injectSidebar(fallbackSyntax);
          resolve();
        }
      }).catch(error => {
        console.error('获取语法库出错:', error);
        // 出错时使用备用语法
        const fallbackSyntax = [
          {
            id: "fallback_dir_list",
            name: "目录列表漏洞",
            template: "site:{target_domain} intitle:\"index of\" OR \"parent directory\"",
            enabled: true,
            risk: "medium",
            engines: ["google", "baidu", "bing"],
            builtin: true
          }
        ];
        injectSidebar(fallbackSyntax);
        resolve();
      });
    });
  }
  
  // 初始化
  function initialize() {
    console.log('[侧边栏] 初始化Search Hacking侧边栏');
    
    // 第一次注入
    setTimeout(() => {
      console.log('[侧边栏] 尝试首次注入侧边栏');
      initHackingSidebar(true);
    }, 1000); // 延长首次注入的等待时间，确保DOM完全加载
    
    // 监听URL变化（Google使用pushState/replaceState进行页面切换）
    let lastUrl = location.href;
    const urlChangeHandler = debounce(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        console.log('[侧边栏] 检测到URL变化，重新注入侧边栏');
        lastUrl = currentUrl;
        initHackingSidebar(true);
      }
    }, 500, 'urlChange');
    
    const urlChangeObserver = new MutationObserver(() => {
      if (state.observerPaused) return;
      urlChangeHandler();
    });
    
    // 配置URL变化观察器
    urlChangeObserver.observe(document, { subtree: true, childList: true });
    
    // 添加Google搜索结果观察器，以便处理动态加载的内容
    const domChangeHandler = debounce(() => {
      const sidebar = document.querySelector('.hacking-sidebar');
      if (!sidebar && !state.injectionInProgress) {
        console.log('[侧边栏] 检测到DOM变化且侧边栏不存在，重新注入');
        initHackingSidebar(true);
      }
    }, 800, 'domChange');
    
    const searchResultsObserver = new MutationObserver((mutations) => {
      if (state.observerPaused) return;
      
      // 只检查有意义的变化
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && 
        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
      );
      
      if (hasRelevantChanges) {
        domChangeHandler();
      }
    });
    
    // 在页面加载后设置观察器
    setTimeout(() => {
      const container = document.querySelector('#rcnt') || document.querySelector('#main') || document.body;
      console.log('[侧边栏] 设置DOM变化观察器，观察容器:', container);
      searchResultsObserver.observe(container, { childList: true, subtree: true });
      
      // 如果侧边栏还没有注入，再次尝试注入
      if (!document.querySelector('.hacking-sidebar')) {
        console.log('[侧边栏] 初始化观察器后再次尝试注入侧边栏');
        initHackingSidebar(true);
      }
    }, 2000);
    
    // 监听设置变更消息
    try {
      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        try {
          if (request.action === 'settingsChanged' || request.action === 'syntaxChanged') {
            // 使用防抖处理设置变更
            debounce(() => {
              initHackingSidebar(true);
              sendResponse({success: true, message: '设置已应用'});
            }, 300, 'settingsChange')();
            
            return true; // 表示将异步发送响应
          }
        } catch (error) {
          console.error('处理消息监听器出错:', error);
          // 尝试发送错误响应
          try {
            sendResponse({success: false, message: '处理消息时出错'});
          } catch (e) {
            // 忽略进一步的错误
          }
        }
      });
    } catch (error) {
      console.error('注册消息监听器时出错:', error);
    }
    
    // 监听存储变化
    try {
      chrome.storage.onChanged.addListener(function(changes, namespace) {
        try {
          if (namespace === 'local' && changes.searchHackingSettings) {
            // 使用防抖处理设置变更
            debounce(() => initHackingSidebar(true), 300, 'storageChange')();
          }
        } catch (error) {
          console.error('处理存储变化时出错:', error);
        }
      });
    } catch (error) {
      console.error('注册存储变化监听器时出错:', error);
    }
    
    // 监听页面点击事件，可能触发Google搜索
    document.addEventListener('click', function(event) {
      // 检测搜索相关点击
      if (event.target.closest('button[type="submit"]') || 
          event.target.closest('a.g') || 
          event.target.closest('.g a')) {
        // 使用防抖处理点击事件
        debounce(() => initHackingSidebar(true), 800, 'clickSearch')();
      }
    });
  }
  
  // 在DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
} 

// 安全地访问Chrome存储API的辅助函数
async function getSafeStorageData(key) {
  return new Promise(resolve => {
    try {
      // 首先检查chrome API是否可用
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime) {
        console.warn('Chrome API不可用，返回默认设置');
        resolve({}); // 返回空对象作为默认值
        return;
      }
      
      // 检查扩展是否有效
      if (chrome.runtime.lastError || !chrome.runtime.id) {
        console.warn('扩展上下文已失效，返回默认设置');
        resolve({});
        return;
      }
      
      // 尝试获取存储数据
      chrome.storage.local.get(key, result => {
        if (chrome.runtime.lastError) {
          console.error('获取存储数据出错:', chrome.runtime.lastError);
          resolve({}); // 出错时返回空对象
        } else {
          resolve(result[key] || {});
        }
      });
    } catch (error) {
      console.error('访问Chrome存储API时出错:', error);
      resolve({}); // 任何错误都返回空对象
    }
  });
} 