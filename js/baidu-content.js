/**
 * Search Hacking 助手 - 百度搜索结果侧边栏注入脚本
 */

// 防止重复注入
if (!window.hackingSidebarInjected) {
  window.hackingSidebarInjected = true;
  
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
        console.error('获取主题失败:', error);
        return 'light';
      }
    },

    // 应用主题到侧边栏
    applyThemeToSidebar(sidebar, theme) {
      if (!sidebar) return;
      
      console.log('[百度侧边栏] 应用主题:', theme);
      
      // 递归应用主题到所有子元素
      const applyThemeRecursively = (element) => {
        if (element.nodeType === Node.ELEMENT_NODE) {
          element.setAttribute('data-theme', theme);
          Array.from(element.children).forEach(applyThemeRecursively);
        }
      };
      
      sidebar.setAttribute('data-theme', theme);
      applyThemeRecursively(sidebar);
    },

    // 设置主题监听器
    setupThemeListener(sidebar) {
      if (!sidebar) return;
      
      console.log('[百度侧边栏] 设置主题监听器');
      
      // 监听Chrome存储变化
      if (chrome && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local' && changes.currentTheme) {
            const newTheme = changes.currentTheme.newValue;
            if (newTheme) {
              console.log('[百度侧边栏] 检测到主题变化:', newTheme);
              this.applyThemeToSidebar(sidebar, newTheme);
            }
          }
        });
      }

      // 监听localStorage变化（跨标签页同步）
      window.addEventListener('storage', (e) => {
        if (e.key === 'currentTheme' && e.newValue) {
          console.log('[百度侧边栏] 检测到localStorage主题变化:', e.newValue);
          this.applyThemeToSidebar(sidebar, e.newValue);
        }
      });

      // 监听系统主题变化
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = async (e) => {
          try {
            // 检查用户是否有手动设置的主题偏好
            let userHasPreference = false;
            if (chrome && chrome.storage && chrome.storage.local) {
              const result = await new Promise((resolve) => {
                chrome.storage.local.get(['userHasPreference'], resolve);
              });
              userHasPreference = result.userHasPreference;
            } else {
              userHasPreference = localStorage.getItem('userHasPreference') === 'true';
            }
            
            if (!userHasPreference) {
              // 用户没有手动设置过主题，跟随系统变化
              const newTheme = e.matches ? 'dark' : 'light';
              console.log('[百度侧边栏] 跟随系统主题变化为:', newTheme);
              this.applyThemeToSidebar(sidebar, newTheme);
            }
          } catch (error) {
            console.error('[百度侧边栏] 处理系统主题变化失败:', error);
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
  
  // 全局状态管理
  const state = {
    lastProcessedUrl: '',
    injectionInProgress: false,
    lastInjectionTime: 0,
    debounceTimers: {},
    observerPaused: false,
    sidebarExists: false,
    contextInvalidated: false,
    recoveryAttempts: 0
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
      // 检查侧边栏是否已存在且非强制刷新模式
      const existingSidebar = document.querySelector('.hacking-sidebar');
      if (!forceCheck && existingSidebar) {
        state.sidebarExists = true;
        state.injectionInProgress = false;
        return;
      }
      
      // 防抖处理 (至少间隔800ms)
      const now = Date.now();
      if (!forceCheck && now - state.lastInjectionTime < 800) {
        state.injectionInProgress = false;
        return;
      }
      
      // 检查URL是否发生变化
      const currentUrl = window.location.href;
      const currentUrlBase = currentUrl.split('#')[0]; // 忽略URL hash部分
      
      if (!forceCheck && currentUrlBase === state.lastProcessedUrl) {
        state.injectionInProgress = false;
        return;
      }
      
      // 更新状态
      state.lastProcessedUrl = currentUrlBase;
      state.lastInjectionTime = now;
      
      // 平滑移除现有侧边栏
      if (existingSidebar) {
        await removeExistingSidebarWithAnimation();
      }
      
      // 检查设置和条件
      const shouldInject = await checkInjectionConditions();
      if (!shouldInject) {
        state.injectionInProgress = false;
        return;
      }
      
      // 暂停观察器避免循环触发
      pauseObservers();
      
      // 执行注入
      await proceedWithInjection();
      state.sidebarExists = true;
      
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
    }, 2000); // 给DOM有更多时间稳定（从1000ms增加到2000ms）
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
    try {
      // 获取设置
      const settings = await getSafeStorageData('searchHackingSettings');
      
      console.log('[URL黑名单] 获取到设置:', settings);
      
      // 检查基本设置
      if (settings.sidebarEnabled === false || settings.baiduEnabled === false) {
        return false;
      }
      
      // 检查site参数
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      const query = params.get('wd') || params.get('word') || '';
      return query.includes('site:');
    } catch (error) {
      console.error('检查注入条件时出错:', error);
      return false; // 出错时默认不注入
    }
  }
  
  // 安全地访问Chrome存储API的辅助函数
  async function getSafeStorageData(key) {
    return new Promise(resolve => {
      try {
        // 首先检查chrome API是否可用
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime) {
          console.warn('Chrome API不可用，返回默认设置');
          state.contextInvalidated = true;
          resolve({}); // 返回空对象作为默认值
          return;
        }
        
        // 检查扩展是否有效
        if (chrome.runtime.lastError || !chrome.runtime.id) {
          console.warn('扩展上下文已失效，返回默认设置');
          state.contextInvalidated = true;
          
          // 限制恢复尝试次数，避免无限循环
          if (state.recoveryAttempts < 3) {
            state.recoveryAttempts++;
            try {
              // 尝试通过重新加载或刷新恢复扩展上下文
              setTimeout(() => {
                console.log(`尝试恢复扩展上下文...(尝试 ${state.recoveryAttempts}/3)`);
                if (chrome && chrome.runtime && chrome.runtime.id) {
                  console.log('扩展上下文已恢复');
                  state.contextInvalidated = false;
                  state.recoveryAttempts = 0;
                  // 只有在成功恢复后才重新初始化侧边栏
                  initHackingSidebar(true);
                }
              }, 1500); // 延长恢复等待时间
            } catch (e) {
              console.error('尝试恢复扩展上下文失败:', e);
            }
          }
          
          resolve({}); // 返回空对象作为默认值
          return;
        }
        
        // 扩展上下文有效，重置状态
        if (state.contextInvalidated) {
          state.contextInvalidated = false;
          state.recoveryAttempts = 0;
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
  
  // 安全地发送消息到扩展的辅助函数
  async function safeSendMessage(message) {
    return new Promise((resolve) => {
      try {
        // 检查chrome API是否可用
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.warn('Chrome API不可用，无法发送消息');
          state.contextInvalidated = true;
          resolve(null);
          return;
        }
        
        // 检查扩展是否有效
        if (chrome.runtime.lastError || !chrome.runtime.id) {
          console.warn('扩展上下文已失效，无法发送消息');
          state.contextInvalidated = true;
          
          // 尝试使用fallback机制
          if (message.action === 'getSyntaxLibrary') {
            console.log('尝试使用内置语法库作为回退');
            const fallbackSyntax = getFallbackSyntaxLibrary();
            resolve({ syntaxLibrary: fallbackSyntax });
            return;
          }
          
          resolve(null);
          return;
        }
        
        // 扩展上下文有效，重置状态
        if (state.contextInvalidated) {
          state.contextInvalidated = false;
          state.recoveryAttempts = 0;
        }
        
        // 尝试发送消息
        chrome.runtime.sendMessage(message, function(response) {
          if (chrome.runtime.lastError) {
            console.error('发送消息出错:', chrome.runtime.lastError);
            
            // 尝试使用fallback机制
            if (message.action === 'getSyntaxLibrary') {
              console.log('发送消息失败，使用内置语法库作为回退');
              const fallbackSyntax = getFallbackSyntaxLibrary();
              resolve({ syntaxLibrary: fallbackSyntax });
              return;
            }
            
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        console.error('发送消息时出错:', error);
        
        // 尝试使用fallback机制
        if (message.action === 'getSyntaxLibrary') {
          console.log('发送消息异常，使用内置语法库作为回退');
          const fallbackSyntax = getFallbackSyntaxLibrary();
          resolve({ syntaxLibrary: fallbackSyntax });
          return;
        }
        
        resolve(null);
      }
    });
  }
  
  // 获取内置语法库的函数
  function getFallbackSyntaxLibrary() {
    // 提供一个较为完整的内置语法库，确保基本功能可用
    return [
      {
        id: "docs_fallback",
        name: "文档文件",
        template: "site:{target_domain} filetype:pdf OR filetype:doc OR filetype:docx",
        enabled: true,
        risk: "info",
        engines: ["google", "baidu", "bing"],
        builtin: true
      },
      {
        id: "config_files",
        name: "配置文件",
        template: "site:{target_domain} filetype:xml OR filetype:conf OR filetype:ini",
        enabled: true,
        risk: "high",
        engines: ["google", "baidu", "bing"],
        builtin: true
      },
      {
        id: "backup_files",
        name: "备份文件",
        template: "site:{target_domain} filetype:bak OR filetype:sql OR filetype:backup",
        enabled: true,
        risk: "high",
        engines: ["google", "baidu", "bing"],
        builtin: true
      },
      {
        id: "chinese_sensitive",
        name: "中文敏感信息 (百度)",
        template: "site:{target_domain} \"密码\" OR \"账号\" OR \"管理员\"",
        enabled: true,
        risk: "medium",
        engines: ["baidu"],
        builtin: true
      }
    ];
  }
  
  // 侧边栏注入流程
  async function proceedWithInjection() {
    // 提取页面中的所有URL
    async function extractUrlsFromPage() {
      try {
        // 获取黑名单规则
        // 获取设置和黑名单
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
        
        // URL集合（去重）
        const urlSet = new Set();
        
        // 从搜索结果中提取URL
        const resultContainers = document.querySelectorAll('.result, .c-container, .result-op');
        
        resultContainers.forEach(container => {
          try {
            // 首先尝试从 mu 或 data-mu 属性中提取URL
            let targetUrl = '';
            if (container.hasAttribute('mu')) {
              targetUrl = container.getAttribute('mu');
            } else if (container.hasAttribute('data-mu')) {
              targetUrl = container.getAttribute('data-mu');
            } else if (container.dataset && container.dataset.mu) {
              targetUrl = container.dataset.mu;
            }
            
            // 如果没有从 mu 属性获取到，尝试从 data-click 获取
            if (!targetUrl) {
              try {
                const dataClick = container.hasAttribute('data-click') ? 
                  JSON.parse(container.getAttribute('data-click') || '{}') : null;
                
                if (dataClick && dataClick.url) {
                  targetUrl = dataClick.url;
                }
              } catch (e) {
                // JSON解析错误，忽略
              }
            }
            
            // 如果仍然没有URL，尝试从链接中获取
            if (!targetUrl) {
              const titleLink = container.querySelector('.t > a, .c-title a, h3 > a');
              if (titleLink && titleLink.href) {
                targetUrl = titleLink.href;
              }
            }
            
            // 如果仍找不到URL，尝试从显示的URL文本中获取
            if (!targetUrl) {
              const urlElement = container.querySelector('.c-showurl, .c-color-gray, [aria-label="来源"]');
              if (urlElement && urlElement.textContent) {
                const urlText = urlElement.textContent.trim();
                if (urlText.match(/^https?:\/\//) || urlText.match(/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+/)) {
                  targetUrl = urlText.startsWith('http') ? urlText : `http://${urlText}`;
                }
              }
            }
            
            // 验证和处理URL
            if (targetUrl && targetUrl.match(/^https?:\/\//)) {
              try {
                // 规范化URL
                const urlObj = new URL(targetUrl);
                const hostname = urlObj.hostname;
                
                // 检查是否在黑名单中
                let isBlacklisted = false;
                let blacklistReason = '';
                
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
                    isBlacklisted = true;
                    blacklistReason = `命中域名黑名单: "${rule.original}"`;
                    console.log(`[URL黑名单] 过滤URL: ${targetUrl}, 原因: ${blacklistReason}`);
                    break;
                  }
                }
                
                // 检查正则表达式黑名单
                if (!isBlacklisted) {
                  for (const regex of regexBlacklist) {
                    const isRegexMatch = regex.test(targetUrl);
                    console.log(`[URL黑名单调试] 检查URL: ${targetUrl} 与正则规则: ${regex.toString()}, 匹配结果: ${isRegexMatch}`);
                    
                    if (isRegexMatch) {
                      isBlacklisted = true;
                      blacklistReason = `命中正则黑名单: ${regex.toString()}`;
                      console.log(`[URL黑名单] 过滤URL: ${targetUrl}, 原因: ${blacklistReason}`);
                      break;
                    }
                  }
                }
                
                // 过滤掉百度自己的域名和黑名单域名
                if (!isBlacklisted && 
                    !hostname.includes('baidu.com') && 
                    !hostname.includes('bdimg.com') && 
                    !hostname.includes('bdstatic.com') && 
                    !hostname.includes('chrome-extension://')) {
                  
                  // 规范化URL（只保留主要部分）
                  const normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
                  urlSet.add(normalizedUrl);
                } else if (!isBlacklisted) {
                  // 内置域名黑名单过滤
                  let builtinReason = '';
                  if (hostname.includes('baidu.com')) builtinReason = '内置黑名单: baidu.com';
                  else if (hostname.includes('bdimg.com')) builtinReason = '内置黑名单: bdimg.com';
                  else if (hostname.includes('bdstatic.com')) builtinReason = '内置黑名单: bdstatic.com';
                  else if (hostname.includes('chrome-extension://')) builtinReason = '内置黑名单: chrome-extension';
                  
                  console.log(`[URL黑名单] 过滤URL: ${targetUrl}, 原因: ${builtinReason}`);
                }
              } catch (e) {
                // URL解析错误，尝试添加原始URL
                console.error('URL解析错误:', e);
              }
            }
          } catch (e) {
            console.error('提取URL时出错:', e);
          }
        });
        
        // 返回去重后的URL数组
        const urlArray = Array.from(urlSet);
        console.log(`[URL黑名单] 过滤后的URL数量: ${urlArray.length}`);
        return urlArray;
      } catch (error) {
        console.error('提取URL过程中出错:', error);
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
            window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`, '_blank');
          } else {
            // 在当前页面打开
            window.location.href = `https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`;
          }
        } else {
          alert('无法确定目标域名，请确保URL中包含 site: 参数');
        }
      });
      
      return button;
    }
    
    // 获取当前页面域名
    function extractTargetDomain() {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      const query = params.get('wd') || params.get('word') || '';
      
      // 从查询中提取site:xxx.com
      const siteMatch = query.match(/site:([^\s]+)/i);
      return siteMatch ? siteMatch[1] : '';
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
      
      // 1. 更新语法排序逻辑：内置语法在上，自定义语法在下
      // 区分内置和自定义语法
      const builtinSyntaxItems = [];
      const customSyntaxItems = [];
      
      syntaxLibrary.forEach(syntax => {
        // 检查语法是否启用以及是否支持百度搜索引擎
        const isEnabledForBaidu = syntax.enabled && (
          (syntax.engineSettings && syntax.engineSettings.baidu) || 
          (!syntax.engineSettings && (syntax.engines.includes('baidu') || syntax.engines.includes('all')))
        );
        
        if (isEnabledForBaidu) {
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
    
    // 插入Font Awesome
    function injectFontAwesome() {
      if (document.querySelector('link[href*="font-awesome"]')) {
        return; // 已经加载了Font Awesome
      }
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
    
    // 清理百度右侧栏的干扰内容
    function cleanBaiduSidebar() {
      // 需要移除的内容选择器
      const selectorToRemove = [
        // AI相关
        '[class*="result-op"][tpl*="ai_"]',
        '[class*="result-op"][tpl*="recommend_list"]',
        // 相关搜索
        '.cr-content', 
        '.c-group-wrapper',
        // 热搜榜单
        '[class*="result-op"][tpl*="hot_rank"]',
        // 深度合作和广告
        '#content_right > [id*="300"]',
        '#content_right > [class*="ad-"]',
        '#content_right > [class*="ec-"]',
        '.xiala-container',
        '[data-curtain]'
      ];
      
      // 移除干扰内容
      selectorToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          console.log('移除干扰内容:', el);
          el.remove();
        });
      });
    }
    
    // 注入侧边栏到百度搜索页面
    function injectSidebar(syntaxLibrary) {
      // 检查是否已经存在侧边栏
      if (document.querySelector('.hacking-sidebar')) {
        return;
      }
      
      // 先清理百度原有的干扰内容
      cleanBaiduSidebar();
      
      // 添加Font Awesome
      injectFontAwesome();
      
      // 创建侧边栏元素
      const sidebar = createSidebar(syntaxLibrary);
      
      // 应用主题到侧边栏
      (async () => {
        try {
          const currentTheme = await ThemeManager.getCurrentTheme();
          ThemeManager.applyThemeToSidebar(sidebar, currentTheme);
          ThemeManager.setupThemeListener(sidebar);
          console.log('[百度侧边栏] 已应用主题:', currentTheme);
        } catch (error) {
          console.warn('[百度侧边栏] 应用主题失败:', error);
        }
      })();
      
      // 查找百度搜索结果布局容器
      const contentRight = document.querySelector('#content_right');
      const contentLeft = document.querySelector('#content_left');
      const container = document.querySelector('#container');
      
      // 百度搜索页面注入策略
      if (contentRight) {
        // 再次清理contentRight中的内容
        Array.from(contentRight.children).forEach(child => {
          if (!child.classList.contains('hacking-sidebar')) {
            child.remove();
          }
        });
        
        // 标准注入：在右侧栏顶部插入
        contentRight.insertBefore(sidebar, contentRight.firstChild);
      } else if (contentLeft && container) {
        // 如果没有右侧栏，创建一个并插入到布局中
        
        const newContentRight = document.createElement('div');
        newContentRight.id = 'content_right';
        newContentRight.style.width = '340px';
        newContentRight.style.marginLeft = '20px';
        newContentRight.appendChild(sidebar);
        
        // 创建一个flex容器来包含左侧和右侧内容
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.width = '100%';
        wrapper.style.maxWidth = '1250px';
        wrapper.style.margin = '0 auto';
        
        // 将左侧内容移动到flex容器中
        if (contentLeft.parentNode) {
          const parent = contentLeft.parentNode;
          parent.insertBefore(wrapper, contentLeft);
          wrapper.appendChild(contentLeft);
          wrapper.appendChild(newContentRight);
        }
      } else {
        // 如果找不到合适的注入点，使用固定定位
        
        const standaloneContainer = document.createElement('div');
        standaloneContainer.style.position = 'fixed';
        standaloneContainer.style.top = '80px';
        standaloneContainer.style.right = '20px';
        standaloneContainer.style.zIndex = '9999';
        standaloneContainer.appendChild(sidebar);
        document.body.appendChild(standaloneContainer);
      }
      
      // 绑定事件处理程序
      bindSidebarEvents(sidebar);
      
      // 淡入效果
      setTimeout(() => {
        sidebar.style.opacity = '1';
        sidebar.style.transform = 'translateX(0)';
      }, 50);
      
      // 设置侧边栏存在标志
      state.sidebarExists = true;
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
                // 使用await直接获取结果
                const urls = await extractUrlsFromPage();
                urlList.innerHTML = '';
                
                // 更新URL计数
                if (urlCount) {
                  urlCount.textContent = `(${urls.length})`;
                }
                
                if (urls.length === 0) {
                  // 创建更友好的错误提示
                  const debugInfo = document.createElement('div');
                  debugInfo.className = 'url-debug-info';
                  debugInfo.innerHTML = `
                    <div class="debug-icon"><i class="fas fa-exclamation-circle"></i></div>
                    <div class="debug-content">
                      <div class="debug-title">无法提取URL</div>
                      <div class="debug-tips">
                        <p>可能的原因：</p>
                        <ul>
                          <li><i class="fas fa-search"></i> 当前页面不是百度搜索结果</li>
                          <li><i class="fas fa-code"></i> 缺少"site:"搜索语法</li>
                          <li><i class="fas fa-ban"></i> 目标域名在黑名单中</li>
                          <li><i class="fas fa-exclamation-triangle"></i> 页面结构已更改</li>
                        </ul>
                      </div>
                    </div>
                  `;
                  urlList.appendChild(debugInfo);
                } else {
                  urls.forEach(url => {
                    const urlItem = document.createElement('div');
                    urlItem.className = 'url-item';
                    urlItem.textContent = url;
                    urlItem.title = url;
                    
                    // 打开按钮点击处理
                    const openBtn = urlItem.querySelector('.url-action-open');
                    openBtn && openBtn.addEventListener('click', async (e) => {
                      e.stopPropagation(); // 阻止冒泡到URL项
                      
                      // 获取设置
                      const settings = await getSafeStorageData('searchHackingSettings');
                      
                      // 默认在新标签页打开
                      const openInNewTab = settings.openInNewTab !== false;
                      
                      if (openInNewTab) {
                        window.open(url, '_blank');
                      } else {
                        window.location.href = url;
                      }
                    });
                    
                    // URL项点击整体处理（默认为复制）
                    urlItem.addEventListener('click', async () => {
                      // 异步方式获取设置，确保数据最新
                      const settings = await getSafeStorageData('searchHackingSettings');
                      
                      // 获取URL点击动作配置
                      const urlClickAction = settings.urlClickAction || 'copy';
                      console.log('URL点击 - 动作:', urlClickAction);
                      
                      if (urlClickAction === 'open') {
                        // 检查打开方式
                        const openInNewTab = settings.openInNewTab !== false;
                        console.log('URL打开方式:', openInNewTab ? '新标签页' : '当前页面');
                        
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
                          urlItem.innerHTML = `<div class="copy-success"><i class="fas fa-check"></i> 已复制：${url}</div>`;
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
                          urlItem.innerHTML = `<div class="copy-error"><i class="fas fa-times"></i> 复制失败：${url}</div>`;
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
                console.error('提取URL过程中出错:', error);
                urlList.innerHTML = '';
                
                // 创建更友好的错误提示
                const errorInfo = document.createElement('div');
                errorInfo.className = 'url-debug-info error';
                errorInfo.innerHTML = `
                  <div class="debug-icon"><i class="fas fa-times-circle"></i></div>
                  <div class="debug-content">
                    <div class="debug-title">提取过程中出错</div>
                    <div class="debug-tips">
                      <p>提取URL时遇到了技术问题，请尝试：</p>
                      <ul>
                        <li><i class="fas fa-sync-alt"></i> 刷新页面后重试</li>
                        <li><i class="fas fa-globe"></i> 尝试使用其他浏览器</li>
                        <li><i class="fas fa-cog"></i> 检查扩展是否最新版本</li>
                      </ul>
                    </div>
                  </div>
                `;
                
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
            // 使用await直接获取结果
            const urls = await extractUrlsFromPage();
            
            if (urls.length > 0) {
              try {
                await navigator.clipboard.writeText(urls.join('\n'));
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
              } catch (err) {
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
              }
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
          injectSidebar(response.syntaxLibrary);
          resolve();
        } else {
          console.error('无法获取语法库，尝试使用内置语法');
          // 使用一个简单的内置语法库作为备份
          const fallbackSyntax = getFallbackSyntaxLibrary();
          injectSidebar(fallbackSyntax);
          resolve();
        }
      }).catch(error => {
        console.error('获取语法库出错:', error);
        // 出错时使用备用语法
        const fallbackSyntax = getFallbackSyntaxLibrary();
        injectSidebar(fallbackSyntax);
        resolve();
      });
    });
  }
  
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
  
  // 初始化
  function initialize() {
    // 检测扩展状态并显示提示
    try {
      const extensionStatus = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id 
        ? '正常' : '已失效';
      console.log(`[初始化] 扩展状态: ${extensionStatus}`);
      
      if (extensionStatus === '已失效') {
        state.contextInvalidated = true;
        console.log('[初始化] 扩展上下文已失效，将使用内置功能和默认设置');
        // 在页面上显示一个小提示
        const statusTip = document.createElement('div');
        statusTip.style.position = 'fixed';
        statusTip.style.bottom = '10px';
        statusTip.style.right = '10px';
        statusTip.style.background = 'rgba(255, 236, 236, 0.9)';
        statusTip.style.color = '#d93025';
        statusTip.style.padding = '8px 12px';
        statusTip.style.borderRadius = '4px';
        statusTip.style.fontSize = '12px';
        statusTip.style.zIndex = '9999';
        statusTip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        statusTip.textContent = 'Search Hacking助手: 扩展上下文已失效，使用内置功能';
        document.body.appendChild(statusTip);
        
        // 5秒后自动隐藏
        setTimeout(() => {
          statusTip.style.opacity = '0';
          statusTip.style.transition = 'opacity 0.5s ease';
          setTimeout(() => statusTip.remove(), 500);
        }, 5000);
      }
    } catch (e) {
      console.error('[初始化] 检测扩展状态出错:', e);
    }
  
    // 第一次注入 - 延迟增加到1000ms，给页面更多加载时间
    setTimeout(() => initHackingSidebar(true), 1000);
    
    // 监听URL变化（百度使用pushState进行页面切换）
    let lastUrl = location.href;
    const urlChangeHandler = debounce(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        // 网址变化是重要的触发点，应该强制刷新
        initHackingSidebar(true);
      }
    }, 800, 'urlChange'); // 增加防抖时间
    
    const urlChangeObserver = new MutationObserver(() => {
      if (state.observerPaused) return;
      urlChangeHandler();
    });
    
    // 只监听document.title和特定元素变化，减少不必要的触发
    urlChangeObserver.observe(document.querySelector('title'), { childList: true });
    urlChangeObserver.observe(document.querySelector('head'), { childList: true, subtree: false });
    
    // 监听DOM变化以检测百度的分页导航，更精确地只关注搜索结果区域
    const domChangeHandler = debounce(() => {
      // 只有在侧边栏不存在且没有注入进行中时才触发
      if (!document.querySelector('.hacking-sidebar') && !state.injectionInProgress && !state.sidebarExists) {
        initHackingSidebar(true);
      }
    }, 1000, 'domChange'); // 增加防抖时间
    
    const domObserver = new MutationObserver((mutations) => {
      if (state.observerPaused) return;
      
      // 只检查有意义的变化，添加更严格的过滤条件
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && 
        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) &&
        // 过滤掉微小变动，只关注重要的DOM变更
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && 
          (node.classList?.contains('result') || 
           node.classList?.contains('c-container') ||
           node.id === 'content_right' ||
           node.id === 'content_left')
        )
      );
      
      if (hasRelevantChanges) {
        domChangeHandler();
      }
    });
    
    // 更精确地观察百度搜索结果区域的变化
    setTimeout(() => {
      const container = document.querySelector('#container');
      const contentLeft = document.querySelector('#content_left');
      
      if (container) {
        domObserver.observe(container, { childList: true, subtree: false });
      }
      
      if (contentLeft) {
        domObserver.observe(contentLeft, { childList: true, subtree: false });
      }
      
      // 如果找不到特定容器，退回到body但降低监视深度
      if (!container && !contentLeft) {
        domObserver.observe(document.body, { childList: true, subtree: false });
      }
    }, 1500); // 增加延迟，确保页面完全加载
    
    // 监听设置变更消息
    try {
      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        try {
          if (request.action === 'settingsChanged' || request.action === 'syntaxChanged') {
            // 使用防抖处理设置变更
            debounce(() => {
              initHackingSidebar(true);
            }, 500, 'settingsChange')(); // 增加防抖时间
            
            // 立即发送响应，不需要异步
            sendResponse({success: true, message: '设置已应用'});
            return false; // 同步响应
          }
          
          // 对于未处理的消息，不返回true
          return false;
        } catch (error) {
          console.error('处理消息监听器出错:', error);
          // 发送错误响应
          sendResponse({success: false, message: '处理消息时出错'});
          return false;
        }
      });
    } catch (error) {
      console.log('注册消息监听器出错 (可能扩展上下文已失效):', error);
    }
    
    // 监听存储变化
    try {
      chrome.storage.onChanged.addListener(function(changes, namespace) {
        try {
          if (namespace === 'local' && changes.searchHackingSettings) {
            // 使用防抖处理设置变更
            debounce(() => initHackingSidebar(true), 500, 'storageChange')(); // 增加防抖时间
          }
        } catch (error) {
          console.error('处理存储变化时出错:', error);
        }
      });
    } catch (error) {
      console.log('注册存储变化监听器出错 (可能扩展上下文已失效):', error);
    }
    
    // 监听页面点击事件，可能触发百度搜索
    document.addEventListener('click', function(event) {
      // 检测搜索相关点击
      if (event.target.closest('.s_btn') || 
          event.target.closest('.t>a') || 
          event.target.closest('input[type="submit"]')) {
        // 使用防抖处理点击事件，延长时间避免过早触发
        debounce(() => initHackingSidebar(true), 1200, 'clickSearch')(); // 增加防抖时间
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