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
  const searchTerm = this.value.toLowerCase();
  const syntaxItems = document.querySelectorAll('.syntax-item');
  let visibleCount = 0;
  
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
  
  document.querySelector('#searchResult .font-semibold').textContent = visibleCount;
});

// 导出配置
function exportConfig() {
  chrome.storage.local.get(['searchHackingSettings', 'syntaxLibrary'], function(result) {
    // 获取当前配置
    const config = {
      settings: result.searchHackingSettings || {},
      syntaxLibrary: result.syntaxLibrary || []
    };
    
    // 创建并下载配置文件
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'search-hacking-config.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    // 显示成功消息
    showNotification('配置已成功导出', 'success');
  });
}

// 验证语法结构
function validateSyntax(syntax) {
  // 检查必要字段是否存在
  const requiredFields = ['id', 'name', 'template', 'risk', 'engines'];
  for (const field of requiredFields) {
    if (!syntax.hasOwnProperty(field)) {
      return false;
    }
  }
  
  // 验证risk字段值
  const validRisks = ['info', 'low', 'medium', 'high'];
  if (!validRisks.includes(syntax.risk)) {
    return false;
  }
  
  // 验证engines是否为数组
  if (!Array.isArray(syntax.engines)) {
    return false;
  }
  
  return true;
}

// 导入配置
function importConfig(fileContent) {
  try {
    const config = JSON.parse(fileContent);
    
    if (!config.settings || !config.syntaxLibrary) {
      showNotification('导入失败：配置文件格式不正确', 'error');
      return;
    }
    
    // 验证语法库结构
    let invalidSyntaxCount = 0;
    const validatedSyntaxLibrary = [];
    
    for (const syntax of config.syntaxLibrary) {
      if (validateSyntax(syntax)) {
        // 确保syntax和template字段一致
        if (!syntax.syntax) {
          syntax.syntax = syntax.template;
        }
        validatedSyntaxLibrary.push(syntax);
      } else {
        invalidSyntaxCount++;
      }
    }
    
    if (invalidSyntaxCount > 0) {
      console.warn(`导入过程中跳过了 ${invalidSyntaxCount} 条无效语法`);
    }
    
    // 保存基本设置
    chrome.storage.local.set({searchHackingSettings: config.settings}, function() {
      console.log('基本设置已导入:', config.settings);
      // 应用设置到UI
      applySettings(config.settings);
      
      // 广播设置变更消息，实现实时同步
      chrome.runtime.sendMessage({
        action: 'settingsChanged',
        settings: config.settings
      });
    });
    
    // 保存语法库
    chrome.storage.local.set({syntaxLibrary: validatedSyntaxLibrary}, function() {
      console.log('语法库已导入，共', validatedSyntaxLibrary.length, '条语法');
      // 更新语法列表
      updateSyntaxLists();
      
      // 广播语法变更消息，实现实时同步
      chrome.runtime.sendMessage({
        action: 'syntaxChanged',
        syntaxLibrary: validatedSyntaxLibrary
      });
      
      if (invalidSyntaxCount > 0) {
        showNotification(`配置已导入，但跳过了 ${invalidSyntaxCount} 条无效语法`, 'warning');
      } else {
        showNotification('配置已成功导入', 'success');
      }
    });
    
  } catch (error) {
    showNotification('导入失败：无效的配置文件', 'error');
    console.error('配置导入错误:', error);
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
      
      openSyntaxModal('edit', {
        id: syntaxId,
        name: syntaxName,
        syntax: syntaxCode,
        risk: riskLevel,
        engines: supportedEngines,
        enabled: isActive
      });
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
    openSyntaxModal('add');
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

// 添加表单提交事件处理
function setupSyntaxFormSubmit() {
  const form = document.getElementById('syntaxForm');
  
  // 移除旧的事件监听器
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  newForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 获取表单数据
    const syntaxId = document.getElementById('syntaxId').value;
    const syntaxName = document.getElementById('syntaxName').value;
    const syntaxTemplate = document.getElementById('syntaxContent').value;
    const riskLevel = document.querySelector('input[name="riskLevel"]:checked').value;
    const googleEnabled = document.getElementById('engineGoogle').checked;
    const baiduEnabled = document.getElementById('engineBaidu').checked;
    const isEnabled = document.querySelector('input[name="syntaxStatus"]:checked').value === 'enabled';
    
    // 表单验证
    if (!syntaxName || !syntaxTemplate) {
      showFormError('请填写所有必填字段');
      return false;
    }
    
    if (!syntaxTemplate.includes('{target_domain}')) {
      showFormError('语法模板必须包含 {target_domain} 占位符');
      return false;
    }
    
    if (!googleEnabled && !baiduEnabled) {
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
            
            const modal = document.getElementById('syntaxFormModal');
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
            
            const modal = document.getElementById('syntaxFormModal');
            modal.classList.remove('show');
            updateSyntaxLists();
          });
        }
      }
    });
  });
}

// 添加/编辑语法模态窗口功能
function openSyntaxModal(mode, syntaxData = null) {
  const modal = document.getElementById('syntaxFormModal');
  const form = document.getElementById('syntaxForm');
  const titleElement = document.getElementById('syntaxFormTitle');
  const btnTextElement = document.getElementById('syntaxBtnText');
  const btnIconElement = document.getElementById('syntaxBtnIcon');
  
  // 重置表单
  form.reset();
  
  // 清除任何现有的表单错误
  hideFormError();
  
  // 设置模式（添加/编辑）
  if (mode === 'edit' && syntaxData) {
    titleElement.textContent = '编辑自定义语法';
    btnTextElement.textContent = '保存修改';
    btnIconElement.className = 'fas fa-save mr-2';
    
    // 填充表单数据
    document.getElementById('syntaxId').value = syntaxData.id;
    document.getElementById('syntaxName').value = syntaxData.name;
    document.getElementById('syntaxContent').value = syntaxData.syntax || syntaxData.template;
    
    // 设置风险等级
    const riskRadio = document.querySelector(`input[name="riskLevel"][value="${syntaxData.risk}"]`);
    if (riskRadio) riskRadio.checked = true;
    
    // 设置搜索引擎支持
    document.getElementById('engineGoogle').checked = syntaxData.engines.includes('google');
    document.getElementById('engineBaidu').checked = syntaxData.engines.includes('baidu');
    
    // 设置语法状态
    if (syntaxData.status) {
      document.querySelector(`input[name="syntaxStatus"][value="${syntaxData.status}"]`).checked = true;
    } else {
      // 兼容旧数据，根据enabled属性设置
      const statusValue = syntaxData.enabled ? 'enabled' : 'disabled';
      document.querySelector(`input[name="syntaxStatus"][value="${statusValue}"]`).checked = true;
    }
    
    showNotification('正在编辑语法', 'info');
  } else {
    // 添加模式
    titleElement.textContent = '添加自定义语法';
    btnTextElement.textContent = '添加语法';
    btnIconElement.className = 'fas fa-plus mr-2';
    document.getElementById('syntaxId').value = '';
    
    showNotification('正在添加新语法', 'info');
  }
  
  // 显示模态窗口
  modal.classList.add('show');
  
  // 关闭按钮事件 - 确保清除所有旧事件监听器并重新添加
  const closeButtons = modal.querySelectorAll('[data-action="close"], #cancelSyntaxBtn');
  closeButtons.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showNotification('已取消操作', 'info');
      closeModal('syntaxFormModal');
    });
  });
  
  // 点击背景关闭模态窗口
  const modalClickHandler = function(e) {
    if (e.target === modal) {
      showNotification('已取消操作', 'info');
      closeModal('syntaxFormModal');
    }
  };
  
  // 移除旧的点击事件监听器并添加新的
  modal.removeEventListener('click', modalClickHandler);
  modal.addEventListener('click', modalClickHandler);
  
  // 添加测试语法按钮事件监听
  const testSyntaxBtn = document.getElementById('testSyntaxBtn');
  testSyntaxBtn.addEventListener('click', function() {
    const syntax = document.getElementById('syntaxContent').value.trim();
    if (!syntax) {
      showFormError('请先输入搜索语法');
      return;
    }
    
    // 获取选中的搜索引擎
    const isGoogleSelected = document.getElementById('engineGoogle').checked;
    const isBaiduSelected = document.getElementById('engineBaidu').checked;
    
    if (!isGoogleSelected && !isBaiduSelected) {
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
  
  // 设置表单提交
  setupSyntaxFormSubmit();
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
  
  const engineBadges = syntax.engines.map(engine => 
    `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mr-2">${engine}</span>`
  ).join('');

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
    <div class="syntax-item bg-white rounded-lg border p-4 transition-all duration-200 flex justify-between items-center">
      <div class="flex items-center">
        <div class="toggle-switch ${syntax.enabled ? 'active' : ''} mr-4" data-id="${syntax.id}"></div>
        <div>
          <div class="font-medium text-gray-800 ${!syntax.enabled ? 'opacity-60' : ''}">${syntax.name}</div>
          <div class="text-gray-500 text-sm ${!syntax.enabled ? 'opacity-60' : ''}">${syntax.syntax || syntax.template}</div>
          <div class="flex mt-1">
            <span class="${risk.class} text-xs px-2 py-0.5 rounded mr-2">${risk.text}</span>
            ${engineBadges}
          </div>
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

// 打开语法表单模态窗口
function openSyntaxFormModal(syntaxId = null) {
  const modal = document.getElementById('syntaxFormModal');
  const title = document.getElementById('syntaxFormTitle');
  const submitBtn = document.getElementById('saveSyntaxBtn');
  const submitBtnIcon = document.getElementById('syntaxBtnIcon');
  const submitBtnText = document.getElementById('syntaxBtnText');
  
  // 清除之前的表单错误
  hideFormError();

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
          document.querySelector(`input[name="syntaxStatus"][value="${syntax.enabled ? 'enabled' : 'disabled'}"]`).checked = true;
        }
      }
    });
  } else {
    // 添加模式
    title.textContent = '添加自定义语法';
    submitBtnIcon.className = 'fas fa-plus mr-2';
    submitBtnText.textContent = '添加语法';
    
    // 重置表单
    document.getElementById('syntaxForm').reset();
    document.getElementById('syntaxId').value = '';
  }

  modal.classList.add('show');
  
  // 移除旧的事件监听器
  const form = document.getElementById('syntaxForm');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  // 添加测试语法按钮事件监听
  const testSyntaxBtn = document.getElementById('testSyntaxBtn');
  testSyntaxBtn.addEventListener('click', function() {
    const syntax = document.getElementById('syntaxContent').value.trim();
    if (!syntax) {
      showFormError('请先输入搜索语法');
      return;
    }
    
    // 获取选中的搜索引擎
    const isGoogleSelected = document.getElementById('engineGoogle').checked;
    const isBaiduSelected = document.getElementById('engineBaidu').checked;
    
    if (!isGoogleSelected && !isBaiduSelected) {
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
  
  // 添加表单提交事件处理
  setupSyntaxFormSubmit();
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
      
      chrome.storage.local.set({ syntaxLibrary }, () => {
        // 广播语法变更消息，实现实时同步
        chrome.runtime.sendMessage({
          action: 'syntaxChanged',
          syntaxLibrary: syntaxLibrary
        });
        
        // 通知用户状态已更新
        showNotification(`语法状态已${enabled ? '启用' : '禁用'}`, 'success');
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
    baiduEnabled: document.getElementById('toggleBaidu').classList.contains('active')
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
  
  // URL黑名单
  const urlBlacklist = document.getElementById('urlBlacklist');
  if (urlBlacklist) {
    // 确保urlBlacklist存在，如果不存在则使用空数组
    const blacklistArray = Array.isArray(settings.urlBlacklist) ? settings.urlBlacklist : [];
    urlBlacklist.value = blacklistArray.join('\n');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM加载完成，开始初始化设置');
  
  // 添加消息监听器，用于接收设置变更消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('接收到消息:', request);
    
    if (request.action === 'settingsChanged') {
      console.log('接收到设置变更:', request.settings);
      // 应用新的设置到UI
      applySettings(request.settings);
    }
    
    if (request.action === 'syntaxChanged') {
      console.log('接收到语法变更:', request.syntaxLibrary);
      // 更新语法列表
      updateSyntaxLists();
    }
    
    // 返回true表示异步处理消息
    return true;
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
  document.querySelector('.bg-blue-600').addEventListener('click', function() {
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
