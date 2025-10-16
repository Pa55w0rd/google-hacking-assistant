/**
 * 后台服务Worker
 */

import { BUILTIN_SYNTAX } from '../constants/syntax';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { StorageService } from '../services/StorageService';
import { MessageService, Message } from '../services/MessageService';
import { SyntaxLibrary } from '../types/syntax';

const storageService = StorageService.getInstance();
const messageService = MessageService.getInstance();

/**
 * 插件安装或更新时的初始化
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Search Hacking 助手已安装');
    
    // 存储默认设置
    storageService.set({
      searchHackingSettings: DEFAULT_SETTINGS,
      syntaxLibrary: BUILTIN_SYNTAX
    }).then(() => {
      console.log('默认设置和语法库已初始化');
    });
    
    // 打开设置页面
    chrome.tabs.create({ url: 'options.html' });
  } else if (details.reason === 'update') {
    // 更新内置语法
    updateBuiltinSyntax();
    console.log('Search Hacking 助手已更新');
  }
});

/**
 * 更新内置语法，保留用户自定义语法
 */
async function updateBuiltinSyntax(): Promise<void> {
  const existingLibrary = await storageService.getSyntaxLibrary();
  
  if (existingLibrary) {
    // 筛选出用户自定义语法
    const customSyntax = existingLibrary.filter(syntax => !syntax.builtin);
    
    // 合并用户自定义语法和最新的内置语法
    const newSyntaxLibrary: SyntaxLibrary = [...customSyntax, ...BUILTIN_SYNTAX];
    
    // 更新语法库
    await storageService.set({ syntaxLibrary: newSyntaxLibrary });
    console.log('语法库已更新，内置: ' + BUILTIN_SYNTAX.length + '，自定义: ' + customSyntax.length);
  } else {
    // 如果没有现有语法库，直接使用内置语法
    await storageService.set({ syntaxLibrary: BUILTIN_SYNTAX });
  }
}

/**
 * 监听消息
 */
messageService.onMessage((request: Message, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  // 打开选项页
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
  
  // 获取内置语法
  if (request.action === 'getBuiltinSyntax') {
    sendResponse({ builtinSyntax: BUILTIN_SYNTAX });
    return true;
  }
  
  // 获取当前域名
  if (request.action === 'getCurrentDomain') {
    if (sender.tab && sender.tab.url) {
      const url = new URL(sender.tab.url);
      const domain = url.hostname;
      sendResponse({ domain: domain });
    } else {
      sendResponse({ domain: null });
    }
    return true;
  }
  
  // 获取设置
  if (request.action === 'getSettings') {
    storageService.getSettings().then((settings) => {
      sendResponse({ settings: settings || {} });
    });
    return true;
  }
  
  // 获取语法库
  if (request.action === 'getSyntaxLibrary') {
    storageService.getSyntaxLibrary().then((library) => {
      sendResponse({ syntaxLibrary: library || [] });
    });
    return true;
  }
  
  // 重置设置
  if (request.action === 'resetSettings') {
    const resetSyntaxLibrary = BUILTIN_SYNTAX.map(syntax => ({
      ...syntax,
      enabled: true
    }));
    
    storageService.set({
      searchHackingSettings: DEFAULT_SETTINGS,
      syntaxLibrary: resetSyntaxLibrary
    }).then(() => {
      console.log('所有设置已重置为默认值');
      sendResponse({ success: true });
    });
    
    return true;
  }
  
  // 处理设置变更消息，实现实时同步
  if (request.action === 'settingsChanged') {
    messageService.broadcastToTabs(request, sender.tab?.id);
    return true;
  }
  
  // 处理语法变更消息，实现实时同步
  if (request.action === 'syntaxChanged') {
    messageService.broadcastToTabs(request, sender.tab?.id);
    return true;
  }
  
  return false;
});

