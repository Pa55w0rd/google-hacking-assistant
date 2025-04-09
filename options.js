/**
 * Google Hacking 助手 - 选项页面脚本
 * 处理扩展的设置选项和语法管理
 */

// 文本映射 (只保留 JS 中 getText() 实际使用的键)
const texts = {
    generalSettings: "基本设置",
    buttonManagement: "语法管理",
    about: "关于",
    settingsSaved: "设置已保存！",
    builtInButtons: "内置语法",
    defaultButtonsDescription: "管理预定义的常用 Google Hacking 语法。",
    customButtons: "自定义语法",
    customButtonsDescription: "添加、编辑或删除您自己的 Google Hacking 语法。",
    noCustomButtons: "暂无自定义语法",
    addNewButton: "+ 添加新语法",
    formTitleAdd: "添加新语法",
    formTitleEdit: "编辑语法",
    riskLevel: "风险等级",
    riskInfo: "信息",
    riskMedium: "中危",
    riskHigh: "高危",
    riskDefault: "低危",
    saveButton: "保存语法",
    cancelButton: "取消",
    editButton: "编辑",
    deleteButton: "删除",
    confirmDelete: "确定要删除这个自定义语法吗？",
    deleteSuccess: "自定义语法已删除",
    deleteFailed: "删除失败！",
    requiredFields: "名称和搜索语法不能为空！",
    customButtonAdded: "自定义语法已添加",
    customButtonUpdated: "自定义语法已更新",
    errorRenderingDefault: "渲染内置语法时出错",
    errorLoadingDefault: "无法加载内置语法",
    warningSkippedButtons: "部分语法数据异常，已跳过显示。",
    errorToggleFailed: "切换状态失败",
    clearSuccess: "已清除所有自定义语法",
    clearFailed: "清除语法失败",
    clearing: "清除中...",
    saving: "保存中...",
    nameExistsError: "语法名称已存在，请使用不同的名称！",
    confirmDeleteAll: "确定要删除所有自定义语法吗？此操作不可恢复。",
    linkTargetPref: "链接打开方式",
    confirmYes: "确定",
    confirmNo: "取消",
    version: "版本:",
    lastUpdated: "最后更新:",
    aboutTitle: "Google Hacking 助手",
    clearAllCustomButtons: "清除所有自定义语法",
    productIntro: "产品简介",
    projectInfo: "项目信息",
    disclaimer: "免责声明：",
    disclaimerText: " 本扩展仅供安全研究和合法渗透测试使用。请勿用于未授权的安全测试或非法活动。使用者需承担因使用本扩展而产生的所有法律责任。",
    saveFailed: "保存失败",
    loadingError: "加载数据失败"
};

/**
 * 获取本地化文本
 * @param {string} key 文本键
 * @returns {string} 本地化文本
 */
function getText(key) {
  return texts[key] || key;
}

/**
 * 根据风险等级返回对应文本
 * @param {string} level 风险等级 ('high', 'medium', 'info', 'default')
 * @returns {string} 风险等级文本
 */
function getRiskLevelText(level) {
    switch(level) {
        case 'high': return getText('riskHigh');
        case 'medium': return getText('riskMedium');
        case 'info': return getText('riskInfo');
        default: return getText('riskDefault');
    }
}

/**
 * 显示顶部浮窗提示 (现在是底部 Snackbar 风格)
 * @param {string} message 提示消息
 * @param {string} type 提示类型 'success'|'error'|'warning'
 */
function showStatusToast(message, type = 'success') {
  const toast = document.getElementById('saveSuccessToast');
  if (!toast) {
    console.error('Toast element not found');
      return;
  }

  // 设置消息和样式
  toast.textContent = message;
  
  // 移除之前的类型类
  toast.classList.remove('success', 'error', 'warning');
  
  // 根据类型添加对应的类并设置背景色 (背景色是为了后备，主要靠类控制)
  toast.classList.add(type);
  
  // 显示 Toast 并触发动画
  toast.classList.add('show');
  
  // 3秒后自动隐藏并移除 show 类
  setTimeout(() => {
    toast.classList.remove('show');
    // 可以在动画结束后再完全隐藏，但对于 Snackbar 通常移除 show 就够了
    // setTimeout(() => { toast.style.display = 'none'; }, 300); // 匹配动画时间
  }, 3000);
}

/**
 * 检查语法名称是否重复
 * @param {string} name 待检查的名称
 * @param {string} currentId 当前语法ID（编辑模式时使用, null 或 undefined 表示添加模式）
 * @returns {boolean} 是否重复
 */
function checkDuplicateButtonName(name, currentId = null) {
  if (!allButtonsData || !allButtonsData.defaultButtons || !allButtonsData.customButtons) {
    console.error("检查重复名称时语法数据尚未加载:", allButtonsData);
    showStatusToast("无法检查重复名称：语法数据未加载", "error");
    return true; // 假设重复以阻止保存
  }
  const lowerCaseName = name.toLowerCase();

  // 检查内置语法 (名称)
  const defaultDuplicate = allButtonsData.defaultButtons.some(button =>
    button.name.toLowerCase() === lowerCaseName
  );

  if (defaultDuplicate) return true;

  // 检查自定义语法（排除当前编辑的语法）
  const customDuplicate = allButtonsData.customButtons.some(button =>
    button.name.toLowerCase() === lowerCaseName && button.id !== currentId
  );

  return customDuplicate;
}

// 全局变量
let allButtonsData = { defaultButtons: [], customButtons: [] };
let linkTargetPreference = '_self'; // 新增：存储链接打开偏好

// --- DOMContentLoaded 事件监听器 ---
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOMContentLoaded 事件触发");

  // --- 获取 DOM 元素 ---
  const linkTargetRadios = document.querySelectorAll('input[name="linkTarget"]');
  const saveSuccessToast = document.getElementById('saveSuccessToast');
  if (!saveSuccessToast) {
      console.error("未能找到 ID 为 'saveSuccessToast' 的元素！");
  }

  const defaultButtonList = document.getElementById('defaultButtonList');
  const customButtonList = document.getElementById('customButtonList');
  const showAddFormButton = document.getElementById('showAddFormButton');
  const clearAllCustomButtons = document.getElementById('clearAllCustomButtons');
  const buttonForm = document.getElementById('buttonForm');
  const formTitle = document.getElementById('formTitle');
  const buttonIdInput = document.getElementById('buttonId');
  const buttonNameInput = document.getElementById('buttonName');
  const buttonSyntaxInput = document.getElementById('buttonSyntax');
  const riskLevelSelect = document.getElementById('riskLevel');
  const buttonEnabledInput = document.getElementById('buttonEnabled');
  const saveButton = document.getElementById('saveButton');
  const cancelButton = document.getElementById('cancelButton');
  const menuButtons = document.querySelectorAll('#optionsMenu button');
  const contentSections = document.querySelectorAll('#optionsContent .content-section');

  if (!defaultButtonList || !customButtonList || !buttonForm) {
      console.error("未能找到必要的列表或表单元素！");
  }

  /**
   * 更新页面上的所有本地化文本
   */
  function updateUITexts() {
    try {
      // 更新菜单项
      document.querySelector('#optionsMenu button[data-section="generalSettings"]').textContent = getText('generalSettings');
      document.querySelector('#optionsMenu button[data-section="buttonManagement"]').textContent = getText('buttonManagement');
      document.querySelector('#optionsMenu button[data-section="about"]').textContent = getText('about');
      
      // 更新语法管理页面标题和描述
      const buttonManagementTitle = document.querySelector('#buttonManagement h2');
      if (buttonManagementTitle) buttonManagementTitle.textContent = getText('语法管理');
      
      // 更新内置语法和自定义语法区域标题
      const defaultButtonsTitle = document.querySelector('#buttonManagement .setting-item:first-child label');
      if (defaultButtonsTitle) defaultButtonsTitle.textContent = getText('builtInButtons');
      
      const customButtonsTitle = document.querySelector('#buttonManagement .setting-item:last-child label');
      if (customButtonsTitle) customButtonsTitle.textContent = getText('customButtons');
      
      // 更新语法描述
      const defaultButtonsDesc = document.querySelector('#buttonManagement .setting-item:first-child .description');
      if (defaultButtonsDesc) defaultButtonsDesc.textContent = getText('defaultButtonsDescription');
      
      const customButtonsDesc = document.querySelector('#buttonManagement .setting-item:last-child .description');
      if (customButtonsDesc) customButtonsDesc.textContent = getText('customButtonsDescription');
      
      // 更新添加和清除语法文本
      const addButton = document.getElementById('showAddFormButton');
      if (addButton) addButton.textContent = getText('addNewButton');
      
      const clearButton = document.getElementById('clearAllCustomButtons');
      if (clearButton) clearButton.textContent = getText('clearAllCustomButtons');
      
      // 更新内置语法名称
      const defaultButtons = document.querySelectorAll('.default-button-toggle');
      defaultButtons.forEach(button => {
        const buttonItem = button.closest('.button-item');
        if (buttonItem) {
          const nameSpan = buttonItem.querySelector('.button-name');
          if (nameSpan) {
            const buttonId = button.dataset.id;
            const buttonData = allButtonsData.defaultButtons.find(b => b.id === buttonId);
            if (buttonData) {
              nameSpan.textContent = buttonData.name;
            }
          }
        }
      });
      
      // 更新关于页面
      const aboutTitle = document.querySelector('#about h2');
      if (aboutTitle) aboutTitle.textContent = getText('aboutTitle');
      
      const productIntroTitle = document.querySelector('.about-section h4');
      if (productIntroTitle) productIntroTitle.textContent = getText('productIntro');
      
      const projectInfoTitle = document.querySelector('.about-section:nth-child(2) h4');
      if (projectInfoTitle) projectInfoTitle.textContent = getText('projectInfo');
      
      const versionLabel = document.querySelector('.about-info span:first-child');
      if (versionLabel) versionLabel.textContent = getText('version');
      
      const lastUpdatedLabel = document.querySelector('.about-info span:nth-child(3)');
      if (lastUpdatedLabel) lastUpdatedLabel.textContent = getText('lastUpdated');
      
      // 更新关于页面免责声明
      const disclaimerTitle = document.querySelector('.warning strong');
      if (disclaimerTitle) disclaimerTitle.textContent = getText('disclaimer');
      
      const disclaimerWarningDiv = document.querySelector('.warning');
      if (disclaimerWarningDiv) {
          // 先移除 strong 标签之后的所有现有文本节点，防止重复添加
          let currentNode = disclaimerTitle ? disclaimerTitle.nextSibling : disclaimerWarningDiv.firstChild;
          while (currentNode) {
              const nextNode = currentNode.nextSibling;
              if (currentNode.nodeType === Node.TEXT_NODE) {
                  disclaimerWarningDiv.removeChild(currentNode);
              }
              currentNode = nextNode;
          }
          // 添加新的文本节点
          const disclaimerTextNode = document.createTextNode(getText('disclaimerText'));
          disclaimerWarningDiv.appendChild(disclaimerTextNode);
      }
      
      // 新增：更新基本设置区域的文本（如果需要）
      const linkTargetLabel = document.querySelector('#generalSettings .setting-item label');
      if (linkTargetLabel) linkTargetLabel.textContent = getText('linkTargetPref');
      
      console.log("UI 文本更新完成。");
    } catch (error) {
      console.error("更新 UI 文本时出错:", error);
    }
  }

  // --- 加载和保存基本设置 ---
  function loadGeneralSettings() {
    console.log("加载基本设置...");
    chrome.storage.local.get(['linkTargetPreference'], function(result) {
       if (chrome.runtime.lastError) {
           console.error("加载基本设置失败:", chrome.runtime.lastError);
           showStatusToast(getText('loadingError') + ": " + chrome.runtime.lastError.message, "error");
           linkTargetRadios.forEach(radio => { radio.checked = radio.value === '_self'; });
           return;
       }

       console.log("已加载基本设置:", result);

       // 设置链接打开方式
      linkTargetPreference = result.linkTargetPreference || '_self'; // 更新全局变量
       linkTargetRadios.forEach(radio => {
           radio.checked = radio.value === linkTargetPreference;
       });
       
       // 完成加载后更新 UI 文本
       updateUITexts();
    });
  }

  // --- 菜单切换逻辑 ---
  function setActiveSection(sectionId) {
    console.log("切换到区域:", sectionId);
    // 移除所有语法的 active 类
    menuButtons.forEach(button => button.classList.remove('active'));
    // 隐藏所有内容区域
    contentSections.forEach(section => section.classList.remove('active'));

    // 为目标语法和内容区域添加 active 类
    const activeButton = document.querySelector(`#optionsMenu button[data-section="${sectionId}"]`);
    const activeSection = document.getElementById(sectionId);

    if (activeButton) {
      activeButton.classList.add('active');
    }
    if (activeSection) {
      activeSection.classList.add('active');
    } else {
        console.warn(`未能找到 ID 为 '${sectionId}' 的内容区域.`);
    }
  }

  /**
   * 更新"关于"区域的内容 (包括版本号和 GitHub 链接)
   */
  async function populateAboutSection() { // 改为 async 函数以使用 await
      const aboutVersionSpan = document.getElementById('aboutVersion');
      const menuVersionDiv = document.getElementById('optionsMenuVersion');
      const githubLink = document.getElementById('githubLinkOptions'); // 使用新的 ID
      const disclaimerWarning = document.querySelector('#about .warning');
      const lastUpdatedSpan = document.getElementById('lastUpdated'); // 获取最后更新元素

      // 获取 Manifest 信息 (同步)
      let version = 'N/A';
      let homepageUrl = '#';
      try {
          const manifest = chrome.runtime.getManifest();
          version = manifest.version || 'N/A';
          homepageUrl = manifest.homepage_url || '#';
      } catch (e) {
          console.error("填充关于信息时读取 Manifest 失败:", e);
      }

      // 更新版本和 GitHub 链接
      if (aboutVersionSpan) aboutVersionSpan.textContent = version;
      if (menuVersionDiv) menuVersionDiv.textContent = `v${version}`;
      if (githubLink) githubLink.href = homepageUrl;
      
      // 获取并设置最后更新时间 (异步)
      if (lastUpdatedSpan) {
          try {
              const response = await fetch(chrome.runtime.getURL('update_info.json'));
              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              const updateInfo = await response.json();
              const lastUpdatedISO = updateInfo.last_updated;

              if (lastUpdatedISO) {
                  try {
                      const date = new Date(lastUpdatedISO);
                      if (!isNaN(date.getTime())) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          lastUpdatedSpan.textContent = `${year}-${month}-${day}`;
                      } else {
                          console.warn("update_info.json 中的 last_updated 格式无效:", lastUpdatedISO);
                          lastUpdatedSpan.textContent = 'N/A';
                      }
                  } catch (dateError) {
                      console.error("解析 update_info.json 中的 last_updated 出错:", dateError);
                      lastUpdatedSpan.textContent = 'N/A';
                  }
              } else {
                  console.warn("update_info.json 中未找到 last_updated 字段。");
                  lastUpdatedSpan.textContent = 'N/A';
              }
          } catch (fetchError) {
              console.error("获取或解析 update_info.json 失败:", fetchError);
              lastUpdatedSpan.textContent = 'N/A';
          }
      }

      // 设置免责声明文本 (同步)
      if (disclaimerWarning) {
         const strongTag = disclaimerWarning.querySelector('strong');
         if (strongTag) {
             strongTag.textContent = getText('disclaimer');
             // 在 strong 标签后添加文本节点
             const textNode = document.createTextNode(getText('disclaimerText'));
             // 清除旧文本（如果存在）
             while (strongTag.nextSibling) {
                 disclaimerWarning.removeChild(strongTag.nextSibling);
             }
             disclaimerWarning.appendChild(textNode);
         } else {
             // 如果没有 strong 标签，直接设置全部文本（容错）
             disclaimerWarning.textContent = `${getText('disclaimer')} ${getText('disclaimerText')}`;
         }
      }
      
      // 初始化时需要调用这个异步函数
      await populateAboutSection(); // 初始填充关于信息
      loadGeneralSettings();
      loadAllButtons();
  }

  // --- 加载和渲染语法列表 ---
  function loadAllButtons() {
    console.log('开始加载所有语法数据...');

    chrome.runtime.sendMessage({ action: 'getAllButtonsData' }, (response) => {
      if (chrome.runtime.lastError) {
          console.error("获取语法数据时发生运行时错误:", chrome.runtime.lastError);
          showStatusToast(getText('loadingError') + ": " + chrome.runtime.lastError.message, "error");
          
          // 直接渲染空列表或显示错误信息
          allButtonsData = { defaultButtons: [], customButtons: [] };
          renderButtonLists(); 
          return;
      }

      console.log('语法数据加载响应:', response);
      if (response && response.success && response.data) {
        // 更新全局变量
        allButtonsData = {
            defaultButtons: response.data.defaultButtons || [],
            customButtons: response.data.customButtons || []
        };
        console.log('加载到的语法数据 (default/custom):', allButtonsData.defaultButtons.length, '/', allButtonsData.customButtons.length);
        renderButtonLists(); // 渲染列表
      } else {
        console.error('加载语法数据失败或响应格式错误:', response);
        showStatusToast(getText('loadingError') + (response?.message ? `: ${response.message}` : ", 请检查后台脚本。" ), "error");
        // 直接渲染空列表或显示错误信息
        allButtonsData = { defaultButtons: [], customButtons: [] };
        renderButtonLists(); 
      }
    });
  }

  /**
   * 渲染内置和自定义语法列表
   */
  function renderButtonLists() {
    console.log('开始渲染语法列表...');
    if (!allButtonsData) {
        console.error("无法渲染语法列表：allButtonsData 未定义。");
        return;
    }
    console.log('当前语法数据 (default/custom):',
        allButtonsData.defaultButtons ? allButtonsData.defaultButtons.length : 'N/A', '/',
        allButtonsData.customButtons ? allButtonsData.customButtons.length : 'N/A');

    // --- 渲染内置语法 ---
    defaultButtonList.innerHTML = ''; // 清空现有列表
    if (allButtonsData.defaultButtons && Array.isArray(allButtonsData.defaultButtons) && allButtonsData.defaultButtons.length > 0) {
      try {
        allButtonsData.defaultButtons.forEach((button, index) => {
           if (!button || !button.id || !button.name || !button.syntax) {
               console.warn(`跳过不完整的内置语法 #${index}:`, button);
               return; // 跳过无效数据
           }
        defaultButtonList.appendChild(createDefaultButtonElement(button));
      });
      } catch (error) {
        console.error('渲染内置语法列表时出错:', error);
        defaultButtonList.innerHTML = `<p style="padding: 10px; text-align: center; color: #DB4437;">${getText('errorRenderingDefault')}</p>`;
      }
    } else {
      console.warn("没有内置语法数据可供渲染。");
      defaultButtonList.innerHTML = `<p style="padding: 10px; text-align: center; color: #5f6368;">${getText('errorLoadingDefault')}</p>`;
    }

    // --- 渲染自定义语法 ---
    customButtonList.innerHTML = ''; // 清空现有列表
    if (allButtonsData.customButtons && Array.isArray(allButtonsData.customButtons) && allButtonsData.customButtons.length > 0) {
        let hasErrors = false;
        allButtonsData.customButtons.forEach((button, index) => {
          try {
            console.log(`尝试渲染自定义语法 #${index}:`, button);
            // 增强验证
            if (!button || typeof button !== 'object' || !button.id || typeof button.id !== 'string' || !button.name || typeof button.name !== 'string' || !button.syntax || typeof button.syntax !== 'string') {
              console.warn(`跳过格式不正确或不完整的自定义语法 #${index}:`, button);
              hasErrors = true;
              return; // 跳过这个语法
            }
        customButtonList.appendChild(createCustomButtonElement(button));
          } catch (error) {
            console.error(`渲染自定义语法 #${index} (ID: ${button?.id}, Name: ${button?.name}) 时出错:`, error);
            hasErrors = true;
          }
        });

        if (hasErrors) {
          const warningMsg = document.createElement('p');
          warningMsg.style.cssText = 'padding: 10px; text-align: center; color: #F4B400; font-size: 12px; margin-top: 10px;';
          warningMsg.textContent = getText('warningSkippedButtons');
          customButtonList.appendChild(warningMsg);
        }
    } else {
      console.log("没有自定义语法数据可供渲染。");
      customButtonList.innerHTML = `<p style="padding: 10px; text-align: center; color: #5f6368;">${getText('noCustomButtons')}</p>`;
    }

    // 渲染完成后，更新所有 UI 文本
    updateUITexts();

    console.log('语法列表渲染完成。');
  }

  /**
   * 创建内置语法元素
   * @param {object} button 语法数据对象
   * @returns {HTMLElement} 创建的语法项元素
   */
  function createDefaultButtonElement(button) {
    const item = document.createElement('div');
    item.className = 'button-item';
    item.innerHTML = `
      <div class="button-info">
        <span class="button-name" title="${button.syntax}">${button.name}</span>
        <span class="risk-level risk-${button.riskLevel || 'default'}">${getRiskLevelText(button.riskLevel)}</span>
        <div class="button-syntax" title="${button.syntax}">${button.syntax}</div>
      </div>
      <div class="button-actions">
        <label class="switch">
          <input type="checkbox" class="default-button-toggle" data-id="${button.id}" ${button.enabled !== false ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </div>
    `;

    // 添加开关事件监听
    const toggle = item.querySelector('.default-button-toggle');
    if (toggle) {
        toggle.addEventListener('change', handleDefaultButtonToggle);
    }

    return item;
  }
  
  /**
   * 创建自定义语法元素 (包含编辑和删除)
   * @param {object} button 语法数据对象
   * @returns {HTMLElement} 创建的语法项元素
   */
  function createCustomButtonElement(button) {
    const item = document.createElement('div');
    item.className = 'button-item';
    // 检查语法是否已启用（默认为 true）
    const isEnabled = button.enabled !== false;
    item.innerHTML = `
      <div class="button-info">
        <span class="button-name" title="${button.syntax}">${button.name}</span>
         <span class="risk-level risk-${button.riskLevel || 'default'}">${getRiskLevelText(button.riskLevel)}</span>
        <div class="button-syntax" title="${button.syntax}">${button.syntax}</div>
      </div>
      <div class="button-actions">
        <!-- 添加开关 -->
        <label class="switch" title="${isEnabled ? '点击禁用' : '点击启用'}">
          <input type="checkbox" class="custom-button-toggle" data-id="${button.id}" ${isEnabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
        <button class="edit-btn md-button action-button icon-only" data-id="${button.id}" title="${getText('editButton')}">
          <span class="material-icons-outlined">edit</span>
        </button>
        <button class="delete-btn md-button action-button delete-btn icon-only" data-id="${button.id}" title="${getText('deleteButton')}">
           <span class="material-icons-outlined">delete</span>
        </button>
      </div>
    `;

    // --- 添加事件监听 --- 
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    const toggleSwitch = item.querySelector('.custom-button-toggle'); // 获取开关

    if (editBtn) {
        editBtn.addEventListener('click', handleEditButtonClick);
    }
     if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteButtonClick);
    }
    // 为开关添加事件监听
    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', handleCustomButtonToggle);
    }

    return item;
  }

  // --- 语法操作处理 ---

  /**
   * 处理内置语法切换事件
   */
  function handleDefaultButtonToggle(event) {
    const buttonId = event.target.dataset.id;
    const isEnabled = event.target.checked;
    console.log(`切换内置语法 ${buttonId} 状态为: ${isEnabled}`);

    chrome.runtime.sendMessage({ action: 'toggleDefaultButton', buttonId, isEnabled }, (response) => {
      if (chrome.runtime.lastError) {
          console.error(`切换内置语法 ${buttonId} 时发生运行时错误:`, chrome.runtime.lastError);
          showStatusToast(`${getText('errorToggleFailed')}: ${chrome.runtime.lastError.message}`, 'error');
          event.target.checked = !isEnabled; // 恢复 UI
          return;
      }

      if (response && response.success) {
        console.log(`内置语法 ${buttonId} 状态更新成功。`);
        // 更新本地数据模型 (全局 allButtonsData)
        const buttonIndex = allButtonsData.defaultButtons.findIndex(b => b.id === buttonId);
        if(buttonIndex > -1) {
            allButtonsData.defaultButtons[buttonIndex].enabled = isEnabled;
            console.log("本地数据模型已更新。");
      } else {
            console.warn(`未能找到 ID 为 ${buttonId} 的内置语法来更新本地模型或显示名称。`);
        }
        showStatusToast(`"${allButtonsData.defaultButtons[buttonIndex].name}"已${isEnabled ? '启用' : '禁用'}`, 'success');
      } else {
        console.error(`切换内置语法 ${buttonId} 状态失败:`, response);
        showStatusToast(response?.message || getText('errorToggleFailed'), 'error');
        event.target.checked = !isEnabled; // 恢复 UI 状态
      }
    });
  }

  /**
   * 处理自定义语法编辑语法点击事件
   */
  function handleEditButtonClick(event) {
    // 使用 closest 确保获取到语法元素，即使点击的是内部图标
    const buttonElement = event.target.closest('.edit-btn');
    if (!buttonElement) {
        console.error("无法找到编辑语法元素。");
        return;
    }
    const buttonId = buttonElement.dataset.id;
    console.log(`请求编辑语法 ID: ${buttonId}`);
    const buttonToEdit = allButtonsData.customButtons.find(b => b.id === buttonId);
    if (buttonToEdit) {
      console.log("找到待编辑语法:", buttonToEdit);
      showButtonForm(getText('formTitleEdit'), buttonToEdit); // 使用本地化标题
    } else {
        console.error(`未能找到 ID 为 ${buttonId} 的自定义语法进行编辑。`);
        showStatusToast("无法编辑：找不到语法数据。", "error");
    }
  }

  /**
   * 创建并显示自定义确认对话框 (居中模态)
   * @param {string} message 确认信息
   * @param {Function} onConfirm 确认回调
   * @param {Function} onCancel 取消回调
   */
  function showCustomConfirm(message, onConfirm, onCancel = null) {
    // 移除可能存在的旧对话框和遮罩
    const existingOverlay = document.getElementById('dialogOverlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.id = 'dialogOverlay';
    overlay.className = 'dialog-overlay';

    // 创建对话框元素
    const dialog = document.createElement('div');
    dialog.className = 'custom-confirm-dialog';
    
    // 设置对话框内容
    dialog.innerHTML = `
      <div class="confirm-content">
        <p>${message}</p>
        <div class="confirm-buttons">
          <button id="confirmNo" class="md-button secondary-btn">${getText('confirmNo') || '取消'}</button>
          <button id="confirmYes" class="md-button primary-btn">${getText('confirmYes') || '确定'}</button>
        </div>
      </div>
    `;
    
    // 将对话框添加到遮罩层
    overlay.appendChild(dialog);
    
    // 将遮罩层附加到文档
    document.body.appendChild(overlay);
    
    // 强制重绘以应用初始状态 (opacity: 0)
    overlay.offsetHeight; 
    
    // 添加 show 类以触发渐入动画
    overlay.classList.add('show');
    
    // 获取对话框中的语法
    const yesButton = dialog.querySelector('#confirmYes');
    const noButton = dialog.querySelector('#confirmNo');
    
    // 移除对话框和遮罩的函数
    const removeDialog = () => {
        overlay.classList.remove('show');
        // 等待动画结束后移除元素
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 200); // 匹配 CSS 过渡时间
        // 移除事件监听器
        document.removeEventListener('keydown', handleEscKey);
        overlay.removeEventListener('click', handleClickOutside);
    };
    
    // 添加确认语法事件
    yesButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止触发 overlay 的点击事件
      if (onConfirm) onConfirm();
      removeDialog();
    });
    
    // 添加取消语法事件
    noButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onCancel) onCancel();
      removeDialog();
    });
    
    // 点击遮罩层本身关闭对话框 (如果需要)
    const handleClickOutside = (event) => {
        if (event.target === overlay) { // 只有点击遮罩层本身才关闭
        if (onCancel) onCancel();
            removeDialog();
      }
    };
    overlay.addEventListener('click', handleClickOutside);
    
    // ESC键关闭对话框
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (onCancel) onCancel();
        removeDialog();
      }
    };
    document.addEventListener('keydown', handleEscKey);
  }

  /**
   * 处理自定义语法删除语法点击事件
   */
  function handleDeleteButtonClick(event) {
    const buttonId = event.target.closest('.delete-btn').dataset.id;
    console.log(`请求删除语法 ID: ${buttonId}`);
    
    // 使用自定义确认对话框代替默认confirm
    showCustomConfirm(
      getText('confirmDelete'),
      () => {
        // 用户点击确认
        console.log("用户确认删除。");
      chrome.runtime.sendMessage({ action: 'deleteCustomButton', buttonId }, (response) => {
          if (chrome.runtime.lastError) {
            console.error(`删除语法 ${buttonId} 时发生运行时错误:`, chrome.runtime.lastError);
            showStatusToast(`${getText('deleteFailed')}: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }

          console.log('删除语法响应:', response);
        if (response && response.success) {
            console.log(`语法 ${buttonId} 删除成功。`);
            showStatusToast(getText('deleteSuccess'), 'success');
            loadAllButtons(); // 重新加载列表以反映删除
        } else {
            console.error(`删除自定义语法 ${buttonId} 失败:`, response);
            showStatusToast(response?.message || getText('deleteFailed'), 'error');
        }
      });
    },
    () => {
      // 用户点击取消
      console.log("用户取消删除。");
    }
  );
}

/**
 * 处理自定义语法启用/禁用开关变化的事件
 */
  function handleCustomButtonToggle(event) {
    const switchInput = event.target;
    const buttonId = switchInput.dataset.id;
    const isEnabled = switchInput.checked;
    console.log(`切换自定义语法 ${buttonId} 状态为: ${isEnabled}`);

    // 更新本地数据模型
    const buttonIndex = allButtonsData.customButtons.findIndex(b => b.id === buttonId);
    if (buttonIndex === -1) {
        console.error(`无法在本地数据中找到要切换的自定义语法: ${buttonId}`);
        showStatusToast('切换状态失败：未找到语法数据', 'error');
        // 还原开关状态
        switchInput.checked = !isEnabled;
        return;
    }
    allButtonsData.customButtons[buttonIndex].enabled = isEnabled;
    console.log("本地数据模型已更新。");

    // 发送消息到后台脚本以更新存储
    chrome.runtime.sendMessage({
        action: 'updateCustomButton',
        button: allButtonsData.customButtons[buttonIndex] // 发送整个更新后的按钮对象
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('发送更新自定义语法状态消息失败:', chrome.runtime.lastError);
            showStatusToast('保存切换状态失败', 'error');
            // 还原本地数据和开关状态
            allButtonsData.customButtons[buttonIndex].enabled = !isEnabled;
            switchInput.checked = !isEnabled;
            return;
        }

        if (response && response.success) {
            console.log(`自定义语法 ${buttonId} 状态保存成功。`);
            showStatusToast(`"${allButtonsData.customButtons[buttonIndex].name}"已${isEnabled ? '启用' : '禁用'}`, 'success');
            // 更新开关 title
            switchInput.closest('.switch').title = isEnabled ? '点击禁用' : '点击启用';
        } else {
            console.error('保存自定义语法状态失败:', response?.message);
            showStatusToast('保存切换状态失败: ' + (response?.message || '未知错误'), 'error');
            // 还原本地数据和开关状态
            allButtonsData.customButtons[buttonIndex].enabled = !isEnabled;
            switchInput.checked = !isEnabled;
        }
    });
  }

  // --- 表单处理 ---

  /**
   * 显示语法编辑/添加表单
   * @param {string} title 表单标题 (已本地化)
   * @param {object | null} buttonData 要编辑的语法数据，null 表示添加
   */
  function showButtonForm(title, buttonData = null) {
    console.log(`显示表单: ${title}`, buttonData ? `编辑 ID: ${buttonData.id}` : "添加模式");
    formTitle.textContent = title; // 设置标题
    if (buttonData) { // 编辑模式
      buttonIdInput.value = buttonData.id || ''; // 确保有 ID
      buttonNameInput.value = buttonData.name || '';
      buttonSyntaxInput.value = buttonData.syntax || '';
      riskLevelSelect.value = buttonData.riskLevel || 'info'; // 默认 info
      buttonEnabledInput.checked = buttonData.enabled !== false; // 设置开关状态
    } else { // 添加模式
      buttonIdInput.value = ''; // 清空ID
      buttonNameInput.value = ''; // 清空字段
      buttonSyntaxInput.value = '';
      riskLevelSelect.value = 'info'; // 新语法默认风险等级为 info
      buttonEnabledInput.checked = true; // 新语法默认启用
    }
    buttonForm.style.display = 'block'; // 显示表单
    showAddFormButton.style.display = 'none'; // 隐藏"添加新语法"语法
    buttonNameInput.focus(); // 将焦点设置到名称输入框
  }

  /**
   * 隐藏语法编辑/添加表单
   */
  function hideButtonForm() {
    console.log("隐藏表单。");
    buttonForm.style.display = 'none'; // 隐藏表单
    showAddFormButton.style.display = 'block'; // 重新显示"添加新语法"语法
    // 清空表单（可选，防止下次打开时残留数据）
    buttonIdInput.value = '';
    buttonNameInput.value = '';
    buttonSyntaxInput.value = '';
    riskLevelSelect.value = 'info';
    buttonEnabledInput.checked = true; // 重置启用开关为选中
    formTitle.textContent = getText('formTitleAdd'); // 重置标题为添加
  }

  /**
   * 处理保存语法（添加或编辑）点击事件
   */
  function handleSaveButtonClick() {
    const buttonId = buttonIdInput.value;
    const buttonName = buttonNameInput.value.trim();
    const buttonSyntax = buttonSyntaxInput.value.trim();
    const riskLevel = riskLevelSelect.value;
    const isEnabled = buttonEnabledInput.checked; // 获取开关状态

    if (!buttonName || !buttonSyntax) {
      showStatusToast("语法名称和搜索语法不能为空！", "error");
      return;
    }

    // 检查名称是否重复
    if (checkDuplicateButtonName(buttonName, buttonId || null)) {
        showStatusToast("语法名称与现有内置或自定义语法重复！", "error");
      return;
    }

    const buttonData = {
      name: buttonName,
      syntax: buttonSyntax,
      riskLevel: riskLevel,
      isCustom: true, // 标记为自定义
      enabled: isEnabled // 添加 enabled 状态
    };

    const isEdit = !!buttonId;
    if (isEdit) {
      buttonData.id = buttonId;
      console.log("准备更新自定义语法:", buttonData);
      // 发送更新消息到后台
      chrome.runtime.sendMessage({ action: 'updateCustomButton', button: buttonData }, handleSaveResponse);
      } else {
      // 添加新语法时，enabled 状态已从表单获取
      console.log("准备添加新自定义语法:", buttonData);
      // 发送添加消息到后台
      chrome.runtime.sendMessage({ action: 'addCustomButton', button: buttonData }, handleSaveResponse);
    }
  }

   /**
   * 处理清除所有自定义语法的操作
   */
  function handleClearAllCustomButtons() {
    console.log("请求清除所有自定义语法。");
    
    // 使用自定义确认对话框
    showCustomConfirm(
      getText('confirmDeleteAll'),
      () => {
        // 用户点击确认
        console.log("用户确认清除。");
        // 显示清除中提示
        showStatusToast(getText('clearing'), 'warning');

        // 1. 尝试通过消息机制操作
        chrome.runtime.sendMessage({ action: 'clearAllCustomButtons' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("清除所有语法时发生运行时错误:", chrome.runtime.lastError);
            showStatusToast(`${getText('clearFailed')}: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }

          console.log("清除所有语法响应:", response);
          if (response && response.success) {
            // 成功清除
            console.log("通过消息机制成功清除所有语法。");
            showStatusToast(getText('clearSuccess'), 'success');
            loadAllButtons(); // 重新加载语法列表
          } else {
            console.error('通过消息机制清除自定义语法失败:', response);
            showStatusToast(response?.message || getText('clearFailed'), 'error');
          }
        });
      }
    );
  }

  // --- 事件监听器设置 ---
  console.log("设置事件监听器...");

  // 链接目标单选按钮
  linkTargetRadios.forEach(radio => {
      radio.addEventListener('change', function() {
          if (this.checked) {
              const newValue = this.value;
              linkTargetPreference = newValue; // 更新全局变量
              // 保存到 storage
              chrome.storage.local.set({ linkTargetPreference: newValue }, function() {
                 if (chrome.runtime.lastError) {
                     console.error("保存链接打开方式失败:", chrome.runtime.lastError);
                     showStatusToast("保存链接打开方式失败", "error");
                     // 可以在这里恢复之前的选中状态
                     const previousValue = newValue === '_self' ? '_blank' : '_self';
                     linkTargetRadios.forEach(r => r.checked = r.value === previousValue);
                     linkTargetPreference = previousValue;
                 } else {
                     showStatusToast("链接打开方式已保存", "success");
                     // 不再需要手动发送消息
                 }
              });
          }
      });
  });

  // 菜单语法
  menuButtons.forEach(button => {
    button.addEventListener('click', () => {
      const sectionId = button.dataset.section;
      if (sectionId) {
        setActiveSection(sectionId);
      } else {
          console.warn("菜单语法缺少 data-section 属性:", button);
      }
    });
  });

  // 语法管理相关语法
  showAddFormButton.addEventListener('click', () => showButtonForm(getText('formTitleAdd')));
  saveButton.addEventListener('click', handleSaveButtonClick);
  cancelButton.addEventListener('click', hideButtonForm);
  clearAllCustomButtons.addEventListener('click', handleClearAllCustomButtons);

  // 监听 storage 变化，主要用于同步 Popup 或其他地方的修改
  chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
          console.log("Storage change detected in options:", changes);
          if (changes.linkTargetPreference) {
              const newValue = changes.linkTargetPreference.newValue;
              if (linkTargetPreference !== newValue) {
                  console.log("Updating linkTargetPreference from storage change:", newValue);
                  linkTargetPreference = newValue;
                  linkTargetRadios.forEach(radio => {
                      radio.checked = radio.value === newValue;
                  });
              }
          }
          // 如果其他设置项需要在选项页实时同步，也可以在这里添加逻辑
          if (changes.defaultButtons || changes.customButtons) {
              // 语法列表发生变化，重新加载并渲染
              console.log("Button list changed externally, reloading...");
              loadAllButtons();
          }
          if (changes.extensionEnabled) {
              // 如果需要在选项页显示或响应"启用侧边栏"状态，可以在此处理
              console.log("Extension enabled state changed externally:", changes.extensionEnabled.newValue);
          }
      }
  });

  // --- 初始化 ---
  console.log("开始初始化...");
  setActiveSection('about'); // 默认显示"关于"
  populateAboutSection(); // 初始填充关于信息
  loadGeneralSettings();
  loadAllButtons();
  updateUITexts();
  console.log("初始化完成。");

  /**
   * 处理后台脚本保存/更新响应的回调函数
   */
  function handleSaveResponse(response) {
    const isEdit = !!buttonIdInput.value;
    if (chrome.runtime.lastError) {
      console.error(`保存/更新语法时发生运行时错误:`, chrome.runtime.lastError);
      showStatusToast(getText('saveFailed') + ': ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    if (response && response.success) {
      const successMsg = isEdit ? getText('customButtonUpdated') : getText('customButtonAdded');
      showStatusToast(successMsg, 'success');
      hideButtonForm();
      loadAllButtons();
    } else {
      console.error(`${isEdit ? '更新' : '添加'} 失败:`, response);
      showStatusToast(response?.message || getText('saveFailed'), 'error');
    }
  }
}); // End of DOMContentLoaded

console.log("options.js 脚本已加载。");