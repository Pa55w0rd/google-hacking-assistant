/**
 * 国际化工具
 */

import { I18nKey } from '../types';

// 默认中文消息
const DEFAULT_MESSAGES: Record<I18nKey, string> = {
  sidebarTitle: 'Search Hacking 助手',
  extractUrlBtn: '提取URL',
  urlPanelTitle: '提取的URL',
  copyAllUrlsBtn: '复制全部',
  customSyntaxDivider: '自定义语法',
  settingsBtn: '设置',
  githubBtn: 'GitHub',
  loading: '加载中...',
  copySuccess: '已复制',
  copyError: '复制失败',
  urlExtractionErrorTips: '无法提取URL，请刷新页面重试',
  refreshBtn: '刷新'
};

/**
 * 获取国际化消息
 */
export function getMessage(key: I18nKey, substitutions?: string | string[]): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const message = chrome.i18n.getMessage(key, substitutions);
      if (message) {
        return message;
      }
    }
    
    return DEFAULT_MESSAGES[key] || key;
  } catch (error) {
    console.warn('Failed to get i18n message for key:', key, error);
    return DEFAULT_MESSAGES[key] || key;
  }
}

