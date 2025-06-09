document.querySelectorAll('.container > div > a').forEach(tab => {
  tab.addEventListener('click', function(e) {
    e.preventDefault();
    
    // 移除所有选项卡的激活状态
    document.querySelectorAll('.container > div > a').forEach(t => {
      t.classList.remove('tab-active');
    });
    
    // 隐藏所有内容区域
    document.querySelectorAll('section').forEach(section => {
      section.classList.add('hidden');
    });
    
    // 激活当前选项卡
    this.classList.add('tab-active');
    
    // 显示对应的内容区域
    const target = this.getAttribute('href').substring(1);
    document.getElementById(target).classList.remove('hidden');
  });
});

// 开关切换
document.querySelectorAll('.toggle-switch').forEach(toggle => {
  toggle.addEventListener('click', function() {
    this.classList.toggle('active');
    
    // 获取切换的设置名称
    let settingName = '';
    if (this.id === 'toggleSidebar') {
      settingName = '侧边栏显示';
    } else if (this.id === 'toggleGoogle') {
      settingName = 'Google搜索支持';
    } else if (this.id === 'toggleBaidu') {
      settingName = '百度搜索支持';
    } else if (this.id === 'toggleBing') {
      settingName = 'Bing搜索支持';
    } else if (this.dataset.id) {
      // 这是语法项的开关
      const syntaxName = this.closest('.syntax-item').querySelector('.font-medium').textContent;
      settingName = `语法 "${syntaxName}"`;
    }
    
    const isActive = this.classList.contains('active');
    showNotification(`${settingName}已${isActive ? '启用' : '禁用'}`, isActive ? 'success' : 'info');
  });
});

// 语法搜索功能
document.getElementById('syntaxSearch').addEventListener('input', function() {
  const searchTerm = this.value.toLowerCase().trim();
  const syntaxItems = document.querySelectorAll('.syntax-item');
  const searchResultElement = document.getElementById('searchResult');
  let visibleCount = 0;
  
  if (searchTerm === '') {
    // 没有搜索内容时，显示所有语法并隐藏搜索结果计数
    syntaxItems.forEach(item => {
      item.style.display = 'flex';
    });
    searchResultElement.style.display = 'none';
  } else {
    // 有搜索内容时，过滤语法并显示匹配数量
    syntaxItems.forEach(item => {
      const syntaxName = item.querySelector('.font-medium').textContent.toLowerCase();
      const syntaxCode = item.querySelector('.text-gray-500.text-sm').textContent.toLowerCase();
      
      if (syntaxName.includes(searchTerm) || syntaxCode.includes(searchTerm)) {
        item.style.display = 'flex';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    // 显示搜索结果计数
    searchResultElement.style.display = 'block';
    document.querySelector('#searchResult .font-semibold').textContent = visibleCount;
  }
});

// 导出配置
function exportConfig() {
  chrome.storage.local.get(['searchHackingSettings', 'syntaxLibrary', 'currentTheme', 'userHasPreference'], function(result) {
    // 获取manifest信息
    const manifest = chrome.runtime.getManifest();
    
    // 获取当前配置
    const config = {
      version: manifest.version, // 从manifest获取版本信息
      exportDate: new Date().toISOString(), // 添加导出时间
      settings: result.searchHackingSettings || {},
      syntaxLibrary: result.syntaxLibrary || [],
      themeSettings: {
        currentTheme: result.currentTheme || 'light',
        userHasPreference: result.userHasPreference || false
      }
    };
    
    // 验证和清理语法库数据
    config.syntaxLibrary = config.syntaxLibrary.map(syntax => {
      // 确保所有必要字段都存在
      const cleanedSyntax = {
        id: syntax.id,
        name: syntax.name,
        template: syntax.template || syntax.syntax,
        syntax: syntax.syntax || syntax.template, // 保持兼容性
        risk: syntax.risk || 'info',
        engines: Array.isArray(syntax.engines) ? syntax.engines : ['google'],
        enabled: syntax.enabled !== false,
        builtin: syntax.builtin || false
      };
      
      // 如果是内置语法且有engineSettings，也导出
      if (syntax.builtin && syntax.engineSettings) {
        cleanedSyntax.engineSettings = syntax.engineSettings;
      }
      
      return cleanedSyntax;
    });
    
    // 创建并下载配置文件
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    // 生成带时间戳的文件名
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const exportFileDefaultName = `search-hacking-config-${timestamp}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    // 显示成功消息
    showNotification(`配置已成功导出为 ${exportFileDefaultName}`, 'success');
    console.log('导出的配置:', config);
  });
}

// 验证语法结构
function validateSyntax(syntax) {
  // 检查基本类型
  if (!syntax || typeof syntax !== 'object') {
    return false;
  }
  
  // 检查必要字段是否存在
  const requiredFields = ['id', 'name'];
  for (const field of requiredFields) {
    if (!syntax.hasOwnProperty(field) || !syntax[field]) {
      console.warn(`语法验证失败: 缺少必要字段 ${field}`, syntax);
      return false;
    }
  }
  
  // 检查template或syntax字段（至少有一个）
  if (!syntax.template && !syntax.syntax) {
    console.warn('语法验证失败: 缺少template或syntax字段', syntax);
    return false;
  }
  
  // 验证risk字段值
  const validRisks = ['info', 'low', 'medium', 'high'];
  if (syntax.risk && !validRisks.includes(syntax.risk)) {
    console.warn(`语法验证失败: 无效的risk值 ${syntax.risk}`, syntax);
    return false;
  }
  
  // 验证engines是否为数组
  if (syntax.engines && !Array.isArray(syntax.engines)) {
    console.warn('语法验证失败: engines不是数组', syntax);
    return false;
  }
  
  // 验证engines数组中的值
  if (syntax.engines) {
    const validEngines = ['google', 'baidu', 'bing', 'all'];
    for (const engine of syntax.engines) {
      if (!validEngines.includes(engine)) {
        console.warn(`语法验证失败: 无效的引擎 ${engine}`, syntax);
        return false;
      }
    }
  }
  
  // 验证engineSettings（如果存在）
  if (syntax.engineSettings) {
    if (typeof syntax.engineSettings !== 'object') {
      console.warn('语法验证失败: engineSettings不是对象', syntax);
      return false;
    }
    
    const validEngineKeys = ['google', 'baidu', 'bing'];
    for (const key of Object.keys(syntax.engineSettings)) {
      if (!validEngineKeys.includes(key)) {
        console.warn(`语法验证失败: 无效的engineSettings键 ${key}`, syntax);
        return false;
      }
      
      if (typeof syntax.engineSettings[key] !== 'boolean') {
        console.warn(`语法验证失败: engineSettings.${key}不是布尔值`, syntax);
        return false;
      }
    }
  }
  
  // 验证enabled字段（如果存在）
  if (syntax.hasOwnProperty('enabled') && typeof syntax.enabled !== 'boolean') {
    console.warn('语法验证失败: enabled不是布尔值', syntax);
    return false;
  }
  
  // 验证builtin字段（如果存在）
  if (syntax.hasOwnProperty('builtin') && typeof syntax.builtin !== 'boolean') {
    console.warn('语法验证失败: builtin不是布尔值', syntax);
    return false;
  }
  
  return true;
}

// 导入配置
function importConfig(fileContent) {
  try {
    const config = JSON.parse(fileContent);
    
    // 检查基本结构
    if (!config.settings && !config.syntaxLibrary) {
      showNotification('导入失败：配置文件格式不正确', 'error');
      return;
    }
    
    // 版本兼容性检查
    const configVersion = config.version || '1.0.0';
    console.log(`导入配置文件版本: ${configVersion}`);
    
    // 分析导入内容
    const importedBuiltinSyntax = [];
    const importedCustomSyntax = [];
    
    if (Array.isArray(config.syntaxLibrary)) {
      for (const syntax of config.syntaxLibrary) {
        if (validateSyntax(syntax)) {
          if (syntax.builtin) {
            importedBuiltinSyntax.push(syntax);
          } else {
            importedCustomSyntax.push(syntax);
          }
        }
      }
    }
    
    // 显示导入确认对话框
    showImportConfirmDialog(config, importedBuiltinSyntax, importedCustomSyntax);
    
  } catch (error) {
    showNotification('导入失败：无效的配置文件格式', 'error');
    console.error('配置导入错误:', error);
  }
}

// 显示导入确认对话框
function showImportConfirmDialog(config, importedBuiltinSyntax, importedCustomSyntax) {
  // 填充导入概览信息
  const importOverview = document.getElementById('importOverview');
  const themeInfo = config.themeSettings ? 
    `${config.themeSettings.currentTheme === 'dark' ? '深色模式' : '浅色模式'}` : 
    '不包含';
  
  importOverview.innerHTML = `
    <div>• 基本设置：${config.settings ? '包含' : '不包含'}</div>
    <div>• 主题设置：${themeInfo}</div>
    <div>• 内置语法：${importedBuiltinSyntax.length} 条（仅更新开关状态）</div>
    <div>• 自定义语法：${importedCustomSyntax.length} 条</div>
    ${config.exportDate ? `<div>• 导出时间：${new Date(config.exportDate).toLocaleString('zh-CN')}</div>` : ''}
  `;
  
  // 更新内置语法信息
  const builtinSyntaxInfo = document.getElementById('builtinSyntaxInfo');
  builtinSyntaxInfo.innerHTML = `• 发现 <span class="font-medium">${importedBuiltinSyntax.length}</span> 条内置语法，将更新其开关状态`;
  
  // 更新自定义语法信息
  const customSyntaxInfo = document.getElementById('customSyntaxInfo');
  if (importedCustomSyntax.length > 0) {
    customSyntaxInfo.innerHTML = `检测到 <strong>${importedCustomSyntax.length}</strong> 条自定义语法，请选择处理方式。`;
  } else {
    customSyntaxInfo.innerHTML = '未检测到自定义语法。';
  }
  
  // 显示模态框
  const modal = document.getElementById('importConfirmModal');
  modal.classList.add('show');
  
  // 绑定确认按钮事件（移除之前的事件监听器）
  const confirmBtn = document.getElementById('confirmImportBtn');
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', function() {
    const customSyntaxMode = document.querySelector('input[name="customSyntaxMode"]:checked')?.value || 'append';
    executeImport(config, importedBuiltinSyntax, importedCustomSyntax, customSyntaxMode);
    closeModal('importConfirmModal');
  });
  
  // 绑定取消按钮事件
  const cancelBtns = modal.querySelectorAll('[data-action="close"]');
  cancelBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', function() {
      closeModal('importConfirmModal');
      showNotification('已取消导入操作', 'info');
    });
  });
  
  // 点击背景关闭
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal('importConfirmModal');
      showNotification('已取消导入操作', 'info');
    }
  });
}

// 执行导入操作
function executeImport(config, importedBuiltinSyntax, importedCustomSyntax, customSyntaxMode) {
  // 获取当前语法库
  chrome.storage.local.get(['syntaxLibrary', 'searchHackingSettings'], function(result) {
    const currentSyntaxLibrary = result.syntaxLibrary || [];
    const currentSettings = result.searchHackingSettings || {};
    
    // 处理基本设置
    let mergedSettings = currentSettings;
    if (config.settings) {
      const defaultSettings = {
        sidebarEnabled: true,
        googleEnabled: true,
        baiduEnabled: false,
        bingEnabled: false,
        urlBlacklist: []
      };
      mergedSettings = { ...defaultSettings, ...currentSettings, ...config.settings };
    }
    
    // 处理主题设置
    if (config.themeSettings) {
      const themeData = {
        currentTheme: config.themeSettings.currentTheme || 'light',
        userHasPreference: config.themeSettings.userHasPreference !== false
      };
      
      // 保存主题设置
      chrome.storage.local.set(themeData, function() {
        console.log('主题设置已导入:', themeData);
        
        // 如果有主题管理器，立即应用主题
        if (window.themeManager) {
          window.themeManager.setTheme(themeData.currentTheme);
        } else {
          // 直接设置主题属性
          document.documentElement.setAttribute('data-theme', themeData.currentTheme);
        }
      });
    }
    
    // 分离当前的内置语法和自定义语法
    const currentBuiltinSyntax = currentSyntaxLibrary.filter(s => s.builtin);
    const currentCustomSyntax = currentSyntaxLibrary.filter(s => !s.builtin);
    
    // 处理内置语法：只更新开关状态，不修改内容
    const updatedBuiltinSyntax = currentBuiltinSyntax.map(currentSyntax => {
      const importedSyntax = importedBuiltinSyntax.find(s => s.id === currentSyntax.id);
      if (importedSyntax) {
        // 只更新开关状态和引擎设置
        return {
          ...currentSyntax,
          enabled: importedSyntax.enabled,
          engineSettings: importedSyntax.engineSettings || currentSyntax.engineSettings
        };
      }
      return currentSyntax;
    });
    
    // 处理自定义语法
    let finalCustomSyntax = [];
    let importStats = {
      builtinUpdated: 0,
      customAdded: 0,
      customReplaced: 0,
      customSkipped: 0,
      themeImported: !!config.themeSettings
    };
    
    if (customSyntaxMode === 'append') {
      // 追加模式：保留现有，添加新的
      finalCustomSyntax = [...currentCustomSyntax];
      
      for (const importedSyntax of importedCustomSyntax) {
        const existingIndex = finalCustomSyntax.findIndex(s => s.id === importedSyntax.id);
        if (existingIndex === -1) {
          // 新语法，直接添加
          finalCustomSyntax.push({
            ...importedSyntax,
            builtin: false
          });
          importStats.customAdded++;
        } else {
          // 重复ID，跳过
          importStats.customSkipped++;
        }
      }
    } else {
      // 覆盖模式：替换所有自定义语法
      finalCustomSyntax = importedCustomSyntax.map(syntax => ({
        ...syntax,
        builtin: false
      }));
      importStats.customReplaced = finalCustomSyntax.length;
    }
    
    // 统计内置语法更新数量
    importStats.builtinUpdated = importedBuiltinSyntax.length;
    
    // 合并最终的语法库
    const finalSyntaxLibrary = [...updatedBuiltinSyntax, ...finalCustomSyntax];
    
    // 保存设置
    chrome.storage.local.set({searchHackingSettings: mergedSettings}, function() {
      console.log('基本设置已导入:', mergedSettings);
      
      // 广播设置变更消息
      chrome.runtime.sendMessage({
        action: 'settingsChanged',
        settings: mergedSettings
      });
    });
    
    // 保存语法库
    chrome.storage.local.set({syntaxLibrary: finalSyntaxLibrary}, function() {
      console.log('语法库已导入，共', finalSyntaxLibrary.length, '条语法');
      
      // 更新语法列表
      updateSyntaxLists();
      
      // 广播语法变更消息，实现实时同步
      chrome.runtime.sendMessage({
        action: 'syntaxChanged',
        syntaxLibrary: finalSyntaxLibrary
      });
      
      // 显示详细的导入结果
      showImportResults(importStats, config);
    });
  });
}

// 显示导入结果
function showImportResults(stats, config) {
  const messages = [];
  
  if (stats.builtinUpdated > 0) {
    messages.push(`内置语法：${stats.builtinUpdated} 条状态已更新`);
  }
  
  if (stats.customAdded > 0) {
    messages.push(`自定义语法：新增 ${stats.customAdded} 条`);
  }
  
  if (stats.customReplaced > 0) {
    messages.push(`自定义语法：替换为 ${stats.customReplaced} 条`);
  }
  
  if (stats.customSkipped > 0) {
    messages.push(`跳过重复语法：${stats.customSkipped} 条`);
  }
  
  if (stats.themeImported) {
    const themeName = config.themeSettings.currentTheme === 'dark' ? '深色模式' : '浅色模式';
    messages.push(`主题设置：已切换到${themeName}`);
  }
  
  const resultMessage = messages.length > 0 ? messages.join('，') : '配置已导入';
  
  // 根据结果类型选择通知类型
  let notificationType = 'success';
  if (stats.customSkipped > 0 && stats.customAdded === 0 && stats.customReplaced === 0) {
    notificationType = 'warning';
  }
  
  showNotification(`导入完成！${resultMessage}`, notificationType);
  
  // 如果有导出时间，显示额外信息
  if (config.exportDate) {
    const exportDate = new Date(config.exportDate).toLocaleString('zh-CN');
    console.log(`导入的配置导出时间: ${exportDate}`);
  }
}

// 添加编辑和删除语法的通知
document.querySelectorAll('.syntax-item button').forEach(button => {
  button.addEventListener('click', function() {
    const syntaxName = this.closest('.syntax-item').querySelector('.font-medium').textContent;
    const isEdit = this.innerHTML.includes('编辑');
    
    if (isEdit) {
      // 编辑操作 - 使用模态窗口
      const syntaxItem = this.closest('.syntax-item');
      const syntaxCode = syntaxItem.querySelector('.text-gray-500.text-sm').textContent;
      const syntaxId = syntaxItem.querySelector('.toggle-switch').dataset.id;
      const isActive = syntaxItem.querySelector('.toggle-switch').classList.contains('active');
      
      // 获取风险级别
      let riskLevel = 'info';
      const riskBadge = syntaxItem.querySelector('.badge-info, .badge-low, .badge-medium, .badge-high');
      if (riskBadge) {
        if (riskBadge.classList.contains('badge-low')) riskLevel = 'low';
        if (riskBadge.classList.contains('badge-medium')) riskLevel = 'medium';
        if (riskBadge.classList.contains('badge-high')) riskLevel = 'high';
      }
      
      // 获取搜索引擎支持
      const engineBadges = syntaxItem.querySelectorAll('.bg-blue-100');
      const supportedEngines = Array.from(engineBadges).map(badge => badge.textContent.trim());
      
      openSyntaxFormModal(syntaxId);
    } else {
      // 删除操作 - 使用模态窗口
      document.getElementById('syntaxToDelete').textContent = syntaxName;
      openModal('deleteSyntaxModal', () => {
        // 删除成功后的回调
        showNotification(`语法 "${syntaxName}" 已删除`, 'success');
      });
    }
  });
});

// 添加新语法按钮
const addSyntaxButton = document.querySelector('.glass-card .btn-effect:first-child');
if (addSyntaxButton) {
  addSyntaxButton.addEventListener('click', function() {
    openSyntaxFormModal();
  });
}

// 清除所有自定义语法按钮
const clearAllButton = document.querySelector('.glass-card .btn-effect:last-child');
if (clearAllButton) {
  clearAllButton.addEventListener('click', function() {
    openModal('clearAllSyntaxModal', () => {
      showNotification('所有自定义语法已清除', 'success');
    });
  });
}

// 重置设置按钮
const resetButton = document.querySelector('.glass-card .bg-red-600');
if (resetButton) {
  resetButton.addEventListener('click', function() {
    openModal('resetModal', () => {
      // 请求background.js重置设置
      chrome.runtime.sendMessage({ action: 'resetSettings' }, (response) => {
        if (response && response.success) {
          console.log('设置已成功重置');
          
          // 重新加载页面以应用新设置
          location.reload();
        } else {
          console.error('重置设置失败');
          showNotification('重置设置失败，请刷新页面重试', 'error');
        }
      });
    });
  });
}

// 模态窗口相关功能
function openModal(modalId, confirmCallback) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // 显示模态窗口
  modal.classList.add('show');
  
  // 设置确认按钮回调
  const confirmBtn = modal.querySelector('[data-action$="-settings"], [data-action$="-syntax"]');
  if (confirmBtn) {
    // 移除旧的事件监听器（如果有）
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // 添加新的事件监听器
    newConfirmBtn.addEventListener('click', function() {
      if (typeof confirmCallback === 'function') {
        confirmCallback();
      }
      closeModal(modalId);
    });
  }
  
  // 设置关闭按钮事件
  const closeButtons = modal.querySelectorAll('[data-action="close"]');
  closeButtons.forEach(btn => {
    // 移除旧的事件监听器
    const newCloseBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newCloseBtn, btn);
    
    // 添加新的事件监听器
    newCloseBtn.addEventListener('click', function() {
      showNotification('已取消操作', 'info');
      closeModal(modalId);
    });
  });
  
  // 点击背景关闭模态窗口
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      showNotification('已取消操作', 'info');
      closeModal(modalId);
    }
  });
  
  // ESC键关闭模态窗口
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      showNotification('已取消操作', 'info');
      closeModal(modalId);
    }
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  modal.classList.remove('show');
}

// 打开语法表单模态窗口
function openSyntaxFormModal(syntaxId = null) {
  const modal = document.getElementById('syntaxFormModal');
  const title = document.getElementById('syntaxFormTitle');
  const submitBtnIcon = document.getElementById('syntaxBtnIcon');
  const submitBtnText = document.getElementById('syntaxBtnText');
  
  // 清除之前的表单错误
  hideFormError();

  // 重置表单
  document.getElementById('syntaxForm').reset();
  document.getElementById('syntaxId').value = '';

  if (syntaxId) {
    // 编辑模式
    title.textContent = '编辑自定义语法';
    submitBtnIcon.className = 'fas fa-save mr-2';
    submitBtnText.textContent = '保存更改';
    
    // 加载语法数据
    chrome.storage.local.get(['syntaxLibrary'], (result) => {
      if (result.syntaxLibrary) {
        const syntax = result.syntaxLibrary.find(s => s.id === syntaxId);
        if (syntax) {
          document.getElementById('syntaxId').value = syntax.id;
          document.getElementById('syntaxName').value = syntax.name;
          document.getElementById('syntaxContent').value = syntax.template || syntax.syntax;
          document.querySelector(`input[name="riskLevel"][value="${syntax.risk}"]`).checked = true;
          document.getElementById('engineGoogle').checked = syntax.engines.includes('google');
          document.getElementById('engineBaidu').checked = syntax.engines.includes('baidu');
          document.getElementById('engineBing').checked = syntax.engines.includes('bing');
          document.querySelector(`input[name="syntaxStatus"][value="${syntax.enabled ? 'enabled' : 'disabled'}"]`).checked = true;
        }
      }
    });
  } else {
    // 添加模式
    title.textContent = '添加自定义语法';
    submitBtnIcon.className = 'fas fa-plus mr-2';
    submitBtnText.textContent = '添加语法';
  }

  modal.classList.add('show');
  
  // 先重新绑定表单提交事件
  const form = document.getElementById('syntaxForm');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  // 重新绑定表单提交事件
  newForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 获取表单数据（使用新表单中的元素）
    const syntaxId = newForm.querySelector('#syntaxId').value;
    const syntaxName = newForm.querySelector('#syntaxName').value;
    const syntaxTemplate = newForm.querySelector('#syntaxContent').value;
    const riskLevel = newForm.querySelector('input[name="riskLevel"]:checked').value;
    const googleEnabled = newForm.querySelector('#engineGoogle').checked;
    const baiduEnabled = newForm.querySelector('#engineBaidu').checked;
    const bingEnabled = newForm.querySelector('#engineBing').checked;
    const isEnabled = newForm.querySelector('input[name="syntaxStatus"]:checked').value === 'enabled';
    
    // 表单验证
    if (!syntaxName || !syntaxTemplate) {
      showFormError('请填写所有必填字段');
      return false;
    }
    
    if (!syntaxTemplate.includes('{target_domain}')) {
      showFormError('语法模板必须包含 {target_domain} 占位符');
      return false;
    }
    
    if (!googleEnabled && !baiduEnabled && !bingEnabled) {
      showFormError('请至少选择一个搜索引擎');
      return false;
    }
    
    // 获取当前语法库并检查名称是否重复
    chrome.storage.local.get(['syntaxLibrary'], (result) => {
      if (result.syntaxLibrary) {
        const syntaxLibrary = result.syntaxLibrary;
        
        // 检查名称是否重复
        const nameExists = syntaxLibrary.some(s => 
          s.name === syntaxName && (!syntaxId || s.id !== syntaxId)
        );
        
        if (nameExists) {
          showFormError('语法名称已存在，请使用其他名称');
          return;
        }
        
        // 创建或更新语法对象
        const syntaxData = {
          id: syntaxId || 'custom_' + Date.now(),
          name: syntaxName,
          template: syntaxTemplate,
          syntax: syntaxTemplate,
          risk: riskLevel,
          engines: [],
          enabled: isEnabled,
          builtin: false // 标记为自定义语法
        };
        
        if (googleEnabled) syntaxData.engines.push('google');
        if (baiduEnabled) syntaxData.engines.push('baidu');
        if (bingEnabled) syntaxData.engines.push('bing');
        
        // 更新语法库
        if (syntaxId) {
          // 编辑现有语法
          const updatedLibrary = syntaxLibrary.map(s => 
            s.id === syntaxId ? syntaxData : s
          );
          
          chrome.storage.local.set({syntaxLibrary: updatedLibrary}, () => {
            console.log('语法已更新:', syntaxData);
            showNotification(`语法 "${syntaxName}" 已更新`, 'success');
            
            // 广播语法变更消息，确保实时同步到侧边栏
            chrome.runtime.sendMessage({
              action: 'syntaxChanged',
              syntaxLibrary: updatedLibrary
            });
            
            modal.classList.remove('show');
            updateSyntaxLists();
          });
        } else {
          // 添加新语法
          syntaxLibrary.push(syntaxData);
          
          chrome.storage.local.set({syntaxLibrary: syntaxLibrary}, () => {
            console.log('新语法已添加:', syntaxData);
            showNotification(`语法 "${syntaxName}" 已添加`, 'success');
            
            // 广播语法变更消息，确保实时同步到侧边栏
            chrome.runtime.sendMessage({
              action: 'syntaxChanged',
              syntaxLibrary: syntaxLibrary
            });
            
            modal.classList.remove('show');
            updateSyntaxLists();
          });
        }
      }
    });
  });
  
  // 重新绑定取消按钮（在模态窗口级别，不在表单内）
  const cancelBtns = modal.querySelectorAll('[data-action="close"]');
  cancelBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showNotification('已取消操作', 'info');
      closeModal('syntaxFormModal');
    });
  });
  
  // 重新绑定测试按钮（在新表单中）
  const testSyntaxBtn = newForm.querySelector('#testSyntaxBtn');
  if (testSyntaxBtn) {
    const newTestBtn = testSyntaxBtn.cloneNode(true);
    testSyntaxBtn.parentNode.replaceChild(newTestBtn, testSyntaxBtn);
    
    newTestBtn.addEventListener('click', function() {
      const syntax = newForm.querySelector('#syntaxContent').value.trim();
      if (!syntax) {
        showFormError('请先输入搜索语法');
        return;
      }
      
      // 获取选中的搜索引擎（使用新表单中的元素）
      const isGoogleSelected = newForm.querySelector('#engineGoogle').checked;
      const isBaiduSelected = newForm.querySelector('#engineBaidu').checked;
      const isBingSelected = newForm.querySelector('#engineBing').checked;
      
      if (!isGoogleSelected && !isBaiduSelected && !isBingSelected) {
        showFormError('请至少选择一个搜索引擎');
        return;
      }
      
      // 使用pa55w0rd.online作为测试域名
      const testDomain = 'pa55w0rd.online';
      const testSyntax = syntax.replace(/{target_domain}/g, testDomain);
      
      try {
        // 跟踪是否至少成功打开了一个窗口
        let openedWindow = false;
        
        // 根据选择的搜索引擎打开对应页面
        if (isGoogleSelected) {
          const googleWindow = window.open(`https://www.google.com/search?q=${encodeURIComponent(testSyntax)}`, '_blank');
          openedWindow = openedWindow || (googleWindow !== null);
        }
        
        if (isBaiduSelected) {
          const baiduWindow = window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(testSyntax)}`, '_blank');
          openedWindow = openedWindow || (baiduWindow !== null);
        }
        
        if (isBingSelected) {
          const bingWindow = window.open(`https://www.bing.com/search?q=${encodeURIComponent(testSyntax)}`, '_blank');
          openedWindow = openedWindow || (bingWindow !== null);
        }
        
        // 检查是否成功打开窗口
        if (!openedWindow) {
          showFormError('无法打开测试窗口，浏览器可能阻止了弹出窗口。请检查浏览器设置允许弹出窗口，或按住Ctrl键再点击测试按钮。');
          return;
        }
        
        // 显示测试通知
        showNotification(`正在使用 ${testDomain} 测试语法`, 'info');
      } catch (error) {
        console.error('测试语法时出错:', error);
        showFormError(`测试语法时出错: ${error.message}。请检查浏览器设置是否允许弹出窗口。`);
      }
    });
  }
  
  // 如果是编辑模式，需要重新填充数据（因为表单被克隆了）
  if (syntaxId) {
    chrome.storage.local.get(['syntaxLibrary'], (result) => {
      if (result.syntaxLibrary) {
        const syntax = result.syntaxLibrary.find(s => s.id === syntaxId);
        if (syntax) {
          newForm.querySelector('#syntaxId').value = syntax.id;
          newForm.querySelector('#syntaxName').value = syntax.name;
          newForm.querySelector('#syntaxContent').value = syntax.template || syntax.syntax;
          newForm.querySelector(`input[name="riskLevel"][value="${syntax.risk}"]`).checked = true;
          newForm.querySelector('#engineGoogle').checked = syntax.engines.includes('google');
          newForm.querySelector('#engineBaidu').checked = syntax.engines.includes('baidu');
          newForm.querySelector('#engineBing').checked = syntax.engines.includes('bing');
          newForm.querySelector(`input[name="syntaxStatus"][value="${syntax.enabled ? 'enabled' : 'disabled'}"]`).checked = true;
        }
      }
    });
  }
}

// 显示通知消息
function showNotification(message, type = 'info') {
  // 检查是否已有通知，有则移除
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 创建新通知
  const notification = document.createElement('div');
  notification.className = 'notification fixed p-4 rounded-lg shadow-lg z-50 flex items-center transition-opacity duration-300';
  
  // 根据类型设置样式
  if (type === 'success') {
    notification.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200');
    notification.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-2"></i> ${message}`;
  } else if (type === 'error') {
    notification.classList.add('bg-red-50', 'text-red-800', 'border', 'border-red-200');
    notification.innerHTML = `<i class="fas fa-exclamation-circle text-red-500 mr-2"></i> ${message}`;
  } else {
    notification.classList.add('bg-blue-50', 'text-blue-800', 'border', 'border-blue-200');
    notification.innerHTML = `<i class="fas fa-info-circle text-blue-500 mr-2"></i> ${message}`;
  }
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 显示通知
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.classList.add('opacity-0');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 在表单内显示错误信息
function showFormError(message) {
  const errorDiv = document.getElementById('formError');
  const errorMessage = document.getElementById('formErrorMessage');
  
  // 设置错误消息
  errorMessage.textContent = message;
  
  // 设置错误样式
  errorDiv.className = 'mb-4 rounded-lg p-4 border text-sm flex items-center bg-red-50 text-red-800 border-red-200';
  
  // 显示错误区域
  errorDiv.classList.remove('hidden');
  
  // 滚动表单容器到顶部
  const formContainer = document.querySelector('.syntax-modal-container > .p-6');
  if (formContainer) {
    formContainer.scrollTop = 0;
  }
  
  // 聚焦到相应字段
  if (message.includes('请填写所有必填字段')) {
    // 检查哪个字段为空并聚焦
    const nameField = document.getElementById('syntaxName');
    const contentField = document.getElementById('syntaxContent');
    
    if (!nameField.value.trim()) {
      nameField.focus();
    } else if (!contentField.value.trim()) {
      contentField.focus();
    }
  } else if (message.includes('{target_domain}')) {
    // 语法格式错误时聚焦到语法输入框
    const contentField = document.getElementById('syntaxContent');
    contentField.focus();
  } else {
    // 其他错误情况聚焦到第一个字段
    const firstInput = document.getElementById('syntaxName');
    if (firstInput) {
      firstInput.focus();
    }
  }
}

// 隐藏表单错误
function hideFormError() {
  const errorDiv = document.getElementById('formError');
  errorDiv.classList.add('hidden');
}

// 从 Chrome 存储中获取语法数据
function getSyntaxData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['syntaxLibrary'], (result) => {
      if (result.syntaxLibrary) {
        resolve(result.syntaxLibrary);
      } else {
        // 如果存储中没有数据，从 background.js 获取内置语法
        chrome.runtime.sendMessage({ action: 'getBuiltinSyntax' }, (response) => {
          if (response && response.builtinSyntax) {
            // 初始化所有内置语法为启用状态
            const syntaxLibrary = response.builtinSyntax.map(syntax => ({
              ...syntax,
              enabled: true,
              syntax: syntax.template // 使用 template 作为搜索语法
            }));
            // 保存到存储中
            chrome.storage.local.set({ syntaxLibrary }, () => {
              resolve(syntaxLibrary);
            });
          } else {
            resolve([]);
          }
        });
      }
    });
  });
}

// 重置所有设置
function resetAllSettings() {
  console.log('开始重置所有设置');
  
  // 请求background.js重置设置
  chrome.runtime.sendMessage({ action: 'resetSettings' }, (response) => {
    if (response && response.success) {
      // 重新获取设置并应用
      chrome.storage.local.get(['searchHackingSettings'], (result) => {
        if (result.searchHackingSettings) {
          console.log('已重置基本设置:', result.searchHackingSettings);
          applySettings(result.searchHackingSettings);
        }
      });
      
      // 重置语法库
      updateSyntaxLists();
      showNotification('所有设置已重置为默认值', 'success');
    } else {
      // 如果background.js没有处理重置操作，使用以下默认值
      chrome.runtime.sendMessage({ action: 'getBuiltinSyntax' }, (response) => {
        if (response && response.builtinSyntax) {
          console.log('获取到内置语法:', response.builtinSyntax.length, '条');
          
          // 重置所有内置语法为启用状态
          const syntaxLibrary = response.builtinSyntax.map(syntax => ({
            ...syntax,
            enabled: true,
            syntax: syntax.template // 使用 template 作为搜索语法
          }));
          
          // 保存到存储中
          chrome.storage.local.set({ syntaxLibrary }, () => {
            console.log('语法库已重置');
            // 更新显示
            updateSyntaxLists();
            showNotification('所有设置已重置为默认值', 'success');
          });
        }
      });
    }
  });
}

// 渲染语法项
function renderSyntaxItem(syntax, isCustom = false) {
  const riskLevels = {
    info: { class: 'badge-info', text: '信息' },
    low: { class: 'badge-low', text: '低风险' },
    medium: { class: 'badge-medium', text: '中风险' },
    high: { class: 'badge-high', text: '高风险' }
  };

  const risk = riskLevels[syntax.risk] || riskLevels.info;
  
  // 为所有语法显示搜索引擎开关
  let engineSection = '';
  
  if (syntax.builtin) {
    // 内置语法：使用engineSettings
    const engineSettings = syntax.engineSettings || {
      google: syntax.engines.includes('google'),
      baidu: syntax.engines.includes('baidu'),
      bing: syntax.engines.includes('bing')
    };
    
    engineSection = `
      <div class="flex items-center mt-2 space-x-3">
        <span class="text-xs text-gray-600 mr-2">搜索引擎:</span>
        <label class="inline-flex items-center cursor-pointer">
          <div class="engine-toggle ${engineSettings.google ? 'active' : ''}" data-syntax-id="${syntax.id}" data-engine="google"></div>
          <span class="ml-1 text-xs text-gray-700">Google</span>
        </label>
        <label class="inline-flex items-center cursor-pointer">
          <div class="engine-toggle ${engineSettings.baidu ? 'active' : ''}" data-syntax-id="${syntax.id}" data-engine="baidu"></div>
          <span class="ml-1 text-xs text-gray-700">百度</span>
        </label>
        <label class="inline-flex items-center cursor-pointer">
          <div class="engine-toggle ${engineSettings.bing ? 'active' : ''}" data-syntax-id="${syntax.id}" data-engine="bing"></div>
          <span class="ml-1 text-xs text-gray-700">Bing</span>
        </label>
      </div>
    `;
  } else {
    // 自定义语法：使用engines数组
    const engineSettings = {
      google: syntax.engines.includes('google'),
      baidu: syntax.engines.includes('baidu'),
      bing: syntax.engines.includes('bing')
    };
    
    engineSection = `
      <div class="flex items-center mt-2 space-x-3">
        <span class="text-xs text-gray-600 mr-2">搜索引擎:</span>
        <label class="inline-flex items-center cursor-pointer">
          <div class="engine-toggle ${engineSettings.google ? 'active' : ''}" data-syntax-id="${syntax.id}" data-engine="google"></div>
          <span class="ml-1 text-xs text-gray-700">Google</span>
        </label>
        <label class="inline-flex items-center cursor-pointer">
          <div class="engine-toggle ${engineSettings.baidu ? 'active' : ''}" data-syntax-id="${syntax.id}" data-engine="baidu"></div>
          <span class="ml-1 text-xs text-gray-700">百度</span>
        </label>
        <label class="inline-flex items-center cursor-pointer">
          <div class="engine-toggle ${engineSettings.bing ? 'active' : ''}" data-syntax-id="${syntax.id}" data-engine="bing"></div>
          <span class="ml-1 text-xs text-gray-700">Bing</span>
        </label>
      </div>
    `;
  }

  const editDeleteButtons = isCustom ? `
    <div class="flex">
      <button class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2.5 rounded mr-2 transition-colors duration-200 edit-syntax" data-id="${syntax.id}">
        <i class="fas fa-edit mr-1"></i> 编辑
      </button>
      <button class="bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2.5 rounded transition-colors duration-200 delete-syntax" data-id="${syntax.id}">
        <i class="fas fa-trash-alt mr-1"></i> 删除
      </button>
    </div>
  ` : '';

  return `
    <div class="syntax-item bg-white rounded-lg border p-4 transition-all duration-200 flex justify-between items-start">
      <div class="flex items-start">
        <div class="toggle-switch ${syntax.enabled ? 'active' : ''} mr-4 mt-1" data-id="${syntax.id}"></div>
        <div class="flex-1">
          <div class="font-medium text-gray-800 ${!syntax.enabled ? 'opacity-60' : ''}">${syntax.name}</div>
          <div class="text-gray-500 text-sm ${!syntax.enabled ? 'opacity-60' : ''} mb-1">${syntax.syntax || syntax.template}</div>
          <div class="flex items-center">
            <span class="${risk.class} text-xs px-2 py-0.5 rounded mr-2">${risk.text}</span>
          </div>
          ${engineSection}
        </div>
      </div>
      ${editDeleteButtons}
    </div>
  `;
}

// 更新语法列表
async function updateSyntaxLists() {
  const syntaxData = await getSyntaxData();
  const builtinSyntax = syntaxData.filter(s => s.builtin);
  const customSyntax = syntaxData.filter(s => !s.builtin);

  // 更新内置语法列表
  document.getElementById('builtinSyntaxCount').textContent = `${builtinSyntax.length}个语法`;
  document.getElementById('builtinSyntaxList').innerHTML = builtinSyntax
    .map(syntax => renderSyntaxItem(syntax))
    .join('');

  // 更新自定义语法列表
  document.getElementById('customSyntaxCount').textContent = `${customSyntax.length}个语法`;
  document.getElementById('customSyntaxList').innerHTML = customSyntax
    .map(syntax => renderSyntaxItem(syntax, true))
    .join('');

  // 添加事件监听器
  addEventListeners();
}

// 添加事件监听器
function addEventListeners() {
  // 设置相关的事件监听器
  addSettingsEventListeners();
  
  // 语法相关的事件监听器
  addSyntaxEventListeners();
}

// 打开删除确认模态窗口
function openDeleteModal(syntaxId, syntaxName) {
  const modal = document.getElementById('deleteSyntaxModal');
  document.getElementById('syntaxToDelete').textContent = syntaxName;
  
  modal.classList.add('show');
  
  // 添加确认删除事件监听器
  const confirmBtn = modal.querySelector('[data-action="delete-syntax"]');
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  // 添加取消按钮事件监听器
  const cancelBtns = modal.querySelectorAll('[data-action="close"], #cancelDeleteBtn');
  cancelBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', function() {
      showNotification('已取消删除操作', 'info');
      closeModal('deleteSyntaxModal');
    });
  });
  
  newConfirmBtn.onclick = () => {
    // 获取当前语法库并删除指定语法
    chrome.storage.local.get(['syntaxLibrary'], (result) => {
      if (result.syntaxLibrary) {
        const syntaxLibrary = result.syntaxLibrary.filter(syntax => syntax.id !== syntaxId);
        
        chrome.storage.local.set({syntaxLibrary: syntaxLibrary}, () => {
          console.log('语法已删除:', syntaxId);
          modal.classList.remove('show');
          showNotification(`语法 "${syntaxName}" 已删除`, 'success');
          
          // 广播语法变更消息，实现实时同步
          chrome.runtime.sendMessage({
            action: 'syntaxChanged',
            syntaxLibrary: syntaxLibrary
          });
          
          updateSyntaxLists();
        });
      }
    });
  };
}

// 清除所有自定义语法
function clearAllCustomSyntax() {
  chrome.storage.local.get(['syntaxLibrary'], (result) => {
    if (result.syntaxLibrary) {
      // 只保留内置语法
      const builtinSyntaxOnly = result.syntaxLibrary.filter(syntax => syntax.builtin);
      
      chrome.storage.local.set({syntaxLibrary: builtinSyntaxOnly}, () => {
        console.log('所有自定义语法已清除');
        showNotification('所有自定义语法已清除', 'success');
        
        // 广播语法变更消息，实现实时同步
        chrome.runtime.sendMessage({
          action: 'syntaxChanged',
          syntaxLibrary: builtinSyntaxOnly
        });
        
        updateSyntaxLists();
      });
    }
  });
}

// 更新语法状态
function updateSyntaxStatus(syntaxId, enabled) {
  chrome.storage.local.get(['syntaxLibrary'], (result) => {
    if (result.syntaxLibrary) {
      const syntaxLibrary = result.syntaxLibrary.map(syntax => {
        if (syntax.id === syntaxId) {
          return { ...syntax, enabled };
        }
        return syntax;
      });
      
      // 找到被修改的语法信息
      const modifiedSyntax = syntaxLibrary.find(syntax => syntax.id === syntaxId);
      
      chrome.storage.local.set({ syntaxLibrary }, () => {
        // 广播语法变更消息，实现实时同步
        chrome.runtime.sendMessage({
          action: 'syntaxChanged',
          syntaxLibrary: syntaxLibrary
        });
        
        // 根据语法类型显示不同的通知
        if (modifiedSyntax) {
          const syntaxType = modifiedSyntax.builtin ? '内置语法' : '自定义语法';
          const statusText = enabled ? '已开启' : '已关闭';
          const statusIcon = enabled ? '✅' : '❌';
          
          // 显示详细通知
          showNotification(
            `${statusIcon} ${syntaxType} "${modifiedSyntax.name}" ${statusText}`, 
            enabled ? 'success' : 'info'
          );
        } else {
          // 备用通知（如果找不到语法信息）
          showNotification(`语法状态已${enabled ? '启用' : '禁用'}`, 'success');
        }
      });
    }
  });
}

// 保存设置
function saveSettings() {
  // 从UI获取当前设置
  const settings = {
    sidebarEnabled: document.getElementById('toggleSidebar').classList.contains('active'),
    googleEnabled: document.getElementById('toggleGoogle').classList.contains('active'),
    baiduEnabled: document.getElementById('toggleBaidu').classList.contains('active'),
    bingEnabled: document.getElementById('toggleBing').classList.contains('active')
  };
  
  // 获取URL黑名单
  const urlBlacklistElement = document.getElementById('urlBlacklist');
  if (urlBlacklistElement) {
    const blacklistText = urlBlacklistElement.value;
    
    // 将文本分割成数组，并过滤掉空行
    const blacklistArray = blacklistText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    settings.urlBlacklist = blacklistArray;
  }
  
  // 保存到存储
  chrome.storage.local.set({searchHackingSettings: settings}, () => {
    console.log('设置已保存:', settings);
    
    // 广播设置变更消息，实现实时同步
    chrome.runtime.sendMessage({
      action: 'settingsChanged',
      settings: settings
    });
  });
}

// 添加设置变更事件监听器
function addSettingsEventListeners() {
  // 切换开关
  document.querySelectorAll('.toggle-switch').forEach(switchEl => {
    switchEl.addEventListener('click', async (e) => {
      const syntaxId = e.currentTarget.dataset.id;
      
      if (syntaxId) {
        // 语法开关
        const isActive = e.currentTarget.classList.contains('active');
        updateSyntaxStatus(syntaxId, !isActive);
        
        // 更新UI
        e.currentTarget.classList.toggle('active');
        const syntaxItem = e.currentTarget.closest('.syntax-item');
        syntaxItem.querySelector('.font-medium').classList.toggle('opacity-60');
        syntaxItem.querySelector('.text-sm').classList.toggle('opacity-60');
      } else {
        // 设置开关
        e.currentTarget.classList.toggle('active');
        
        // 保存设置
        saveSettings();
      }
    });
  });
  
  // 保存黑名单按钮
  const saveBlacklistBtn = document.getElementById('saveBlacklist');
  if (saveBlacklistBtn) {
    // 移除已有的事件监听器以避免重复绑定
    const newBtn = saveBlacklistBtn.cloneNode(true);
    saveBlacklistBtn.parentNode.replaceChild(newBtn, saveBlacklistBtn);
    
    // 添加新的事件监听器
    newBtn.addEventListener('click', function() {
      // 验证黑名单规则格式
      const urlBlacklistElement = document.getElementById('urlBlacklist');
      if (!urlBlacklistElement) return;
      
      const blacklistText = urlBlacklistElement.value || '';
      
      // 尝试验证每条规则
      let hasInvalidRule = false;
      const blacklistRules = blacklistText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      for (const rule of blacklistRules) {
        if (rule.startsWith('/') && rule.endsWith('/')) {
          try {
            const regexPattern = rule.slice(1, -1);
            new RegExp(regexPattern, 'i');
          } catch (e) {
            showNotification(`规则格式错误: "${rule}" 不是有效的正则表达式`, 'error');
            hasInvalidRule = true;
            break;
          }
        }
      }
      
      if (!hasInvalidRule) {
        saveSettings();
        showNotification('URL黑名单规则已保存', 'success');
      }
    });
  }
}

// 添加语法相关事件监听器
function addSyntaxEventListeners() {
  // 编辑按钮
  document.querySelectorAll('.edit-syntax').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const syntaxId = e.currentTarget.dataset.id;
      openSyntaxFormModal(syntaxId);
    });
  });
  
  // 删除按钮
  document.querySelectorAll('.delete-syntax').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const syntaxId = e.currentTarget.dataset.id;
      const syntaxName = e.currentTarget.closest('.syntax-item').querySelector('.font-medium').textContent;
      openDeleteModal(syntaxId, syntaxName);
    });
  });
  
  // 搜索引擎开关
  document.querySelectorAll('.engine-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const syntaxId = e.currentTarget.dataset.syntaxId;
      const engine = e.currentTarget.dataset.engine;
      const isActive = e.currentTarget.classList.contains('active');
      
      // 切换状态
      e.currentTarget.classList.toggle('active');
      
      // 获取语法信息用于通知
      chrome.storage.local.get(['syntaxLibrary'], (result) => {
        if (result.syntaxLibrary) {
          const syntax = result.syntaxLibrary.find(s => s.id === syntaxId);
          
          // 更新语法库中的引擎设置
          updateSyntaxEngineSettings(syntaxId, engine, !isActive);
          
          // 显示详细通知
          const engineNames = {
            google: 'Google',
            baidu: '百度',
            bing: 'Bing'
          };
          
          if (syntax) {
            const syntaxType = syntax.builtin ? '内置语法' : '自定义语法';
            const statusText = !isActive ? '已启用' : '已禁用';
            const statusIcon = !isActive ? '🔍' : '🚫';
            
            showNotification(
              `${statusIcon} ${syntaxType} "${syntax.name}" 在 ${engineNames[engine]} 搜索引擎${statusText}`, 
              !isActive ? 'success' : 'info'
            );
          } else {
            // 备用通知
            showNotification(`${engineNames[engine]}搜索引擎已${!isActive ? '启用' : '禁用'}`, 'success');
          }
        }
      });
    });
  });
}

// 更新语法的搜索引擎设置
function updateSyntaxEngineSettings(syntaxId, engine, enabled) {
  chrome.storage.local.get(['syntaxLibrary'], (result) => {
    if (result.syntaxLibrary) {
      const syntaxLibrary = result.syntaxLibrary.map(syntax => {
        if (syntax.id === syntaxId) {
          if (syntax.builtin) {
            // 内置语法：使用engineSettings
            if (!syntax.engineSettings) {
              syntax.engineSettings = {
                google: syntax.engines.includes('google'),
                baidu: syntax.engines.includes('baidu'),
                bing: syntax.engines.includes('bing')
              };
            }
            
            // 更新指定引擎的设置
            syntax.engineSettings[engine] = enabled;
            
            // 更新engines数组以保持兼容性
            const enabledEngines = [];
            if (syntax.engineSettings.google) enabledEngines.push('google');
            if (syntax.engineSettings.baidu) enabledEngines.push('baidu');
            if (syntax.engineSettings.bing) enabledEngines.push('bing');
            syntax.engines = enabledEngines;
          } else {
            // 自定义语法：直接更新engines数组
            const currentEngines = [...syntax.engines];
            
            if (enabled) {
              // 启用引擎：如果不在数组中则添加
              if (!currentEngines.includes(engine)) {
                currentEngines.push(engine);
              }
            } else {
              // 禁用引擎：从数组中移除
              const index = currentEngines.indexOf(engine);
              if (index > -1) {
                currentEngines.splice(index, 1);
              }
            }
            
            syntax.engines = currentEngines;
          }
          
          return syntax;
        }
        return syntax;
      });
      
      chrome.storage.local.set({ syntaxLibrary }, () => {
        console.log(`语法 ${syntaxId} 的 ${engine} 引擎设置已更新为: ${enabled}`);
        
        // 广播语法变更消息，实现实时同步
        chrome.runtime.sendMessage({
          action: 'syntaxChanged',
          syntaxLibrary: syntaxLibrary
        });
      });
    }
  });
}

// 应用设置到UI元素
function applySettings(settings) {
  console.log('应用设置到UI:', settings);
  
  // 侧边栏开关
  const toggleSidebar = document.getElementById('toggleSidebar');
  if (toggleSidebar) {
    toggleSidebar.classList.toggle('active', settings.sidebarEnabled !== false);
  }
  
  // Google搜索支持
  const toggleGoogle = document.getElementById('toggleGoogle');
  if (toggleGoogle) {
    toggleGoogle.classList.toggle('active', settings.googleEnabled !== false);
  }
  
  // 百度搜索支持
  const toggleBaidu = document.getElementById('toggleBaidu');
  if (toggleBaidu) {
    toggleBaidu.classList.toggle('active', settings.baiduEnabled === true);
  }
  
  // Bing搜索支持
  const toggleBing = document.getElementById('toggleBing');
  if (toggleBing) {
    toggleBing.classList.toggle('active', settings.bingEnabled === true);
  }
  
  // URL黑名单
  const urlBlacklist = document.getElementById('urlBlacklist');
  if (urlBlacklist) {
    // 确保urlBlacklist存在，如果不存在则使用空数组
    const blacklistArray = Array.isArray(settings.urlBlacklist) ? settings.urlBlacklist : [];
    urlBlacklist.value = blacklistArray.join('\n');
  }
}

// 加载清单信息
function loadManifestInfo() {
  const manifest = chrome.runtime.getManifest();
  
  // 更新版本号
  const versionElements = document.querySelectorAll('#versionText, #aboutVersionText');
  versionElements.forEach(element => {
    if (element) {
      element.textContent = manifest.version;
    }
  });
  
  // 设置GitHub链接
  const githubLink = manifest.homepage_url;
  const githubElements = document.querySelectorAll('#githubLink, #aboutGithubLink');
  githubElements.forEach(element => {
    if (element && githubLink) {
      element.href = githubLink;
    }
  });
  
  // 设置Star项目链接
  const starProjectLink = document.getElementById('starProjectLink');
  if (starProjectLink && githubLink) {
    // 添加点击事件，显示Star引导模态窗口
    starProjectLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // 显示Star项目模态窗口
      const starModal = document.getElementById('starProjectModal');
      if (starModal) {
        starModal.classList.add('show');
        
        // 设置确认按钮的点击事件
        const confirmStarBtn = document.getElementById('confirmStarBtn');
        if (confirmStarBtn) {
          confirmStarBtn.onclick = function() {
            // 关闭模态窗口
            starModal.classList.remove('show');
            
            // 显示跳转提示
            showNotification('正在跳转到GitHub仓库，请点击Star按钮支持项目 ⭐', 'success');
            
            // 跳转到GitHub仓库
            setTimeout(() => {
              window.open(githubLink, '_blank');
            }, 800);
          };
        }
      }
    });
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM加载完成，开始初始化设置');
  
  // 初始化主题管理器
  if (typeof window.themeManager !== 'undefined') {
    try {
      await window.themeManager.init();
      console.log('主题管理器初始化完成');
    } catch (error) {
      console.warn('主题管理器初始化失败:', error);
    }
  }
  
  // 加载manifest信息
  loadManifestInfo();
  
  // 添加消息监听器，用于接收设置变更消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('接收到消息:', request);
    
    if (request.action === 'settingsChanged') {
      console.log('接收到设置变更:', request.settings);
      // 应用新的设置到UI
      applySettings(request.settings);
      // 同步操作，不需要异步响应
      return false;
    }
    
    if (request.action === 'syntaxChanged') {
      console.log('接收到语法变更:', request.syntaxLibrary);
      // 更新语法列表
      updateSyntaxLists();
      // 同步操作，不需要异步响应
      return false;
    }
    
    // 对于未处理的消息，不返回true
    return false;
  });
  
  // 监听存储变更事件，作为备用同步机制
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
      if (changes.searchHackingSettings) {
        console.log('存储中的设置已变更:', changes.searchHackingSettings.newValue);
        // 应用新的设置到UI
        applySettings(changes.searchHackingSettings.newValue);
      }
      
      if (changes.syntaxLibrary) {
        console.log('存储中的语法库已变更');
        // 更新语法列表
        updateSyntaxLists();
      }
    }
  });
  
  // 初始化设置
  chrome.storage.local.get(['searchHackingSettings'], (result) => {
    if (result.searchHackingSettings) {
      console.log('获取到的设置:', result.searchHackingSettings);
      // 应用设置到UI
      applySettings(result.searchHackingSettings);
    } else {
      // 如果没有设置，请求background.js初始化
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response && response.settings) {
          console.log('从background获取的设置:', response.settings);
          // 应用设置到UI
          applySettings(response.settings);
        }
      });
    }
  });
  
  // 加载语法列表
  updateSyntaxLists();

  // 添加语法按钮
  document.getElementById('addSyntaxBtn').addEventListener('click', () => {
    openSyntaxFormModal();
  });

  // 清除所有自定义语法按钮
  document.getElementById('clearAllSyntaxBtn').addEventListener('click', () => {
    document.getElementById('clearAllSyntaxModal').classList.add('show');
    
    // 添加确认清除事件
    const confirmBtn = document.getElementById('clearAllSyntaxModal').querySelector('[data-action="clear-all-syntax"]');
    confirmBtn.onclick = () => {
      clearAllCustomSyntax();
      document.getElementById('clearAllSyntaxModal').classList.remove('show');
    };
  });
  
  // 重置设置按钮
  const resetButton = document.querySelector('.glass-card .bg-red-600');
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      openModal('resetModal', () => {
        // 请求background.js重置设置
        chrome.runtime.sendMessage({ action: 'resetSettings' }, (response) => {
          if (response && response.success) {
            console.log('设置已成功重置');
            
            // 重新加载页面以应用新设置
            location.reload();
          } else {
            console.error('重置设置失败');
            showNotification('重置设置失败，请刷新页面重试', 'error');
          }
        });
      });
    });
  }

  // 模态窗口关闭按钮
  document.querySelectorAll('[data-action="close"]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('show');
    });
  });

  // 添加所有事件监听器
  addEventListeners();

  // 导出配置按钮
  document.getElementById('exportConfigBtn').addEventListener('click', function() {
    exportConfig();
  });
  
  // 导入配置文件
  document.getElementById('import-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      importConfig(e.target.result);
      // 重置文件选择器
      document.getElementById('import-file').value = '';
    };
    
    reader.readAsText(file);
  });
});
