/**
 * 设置相关类型定义
 */

import { UrlClickAction } from './index';

// 应用设置
export interface AppSettings {
  sidebarEnabled: boolean;
  googleEnabled: boolean;
  baiduEnabled: boolean;
  bingEnabled: boolean;
  openInNewTab: boolean;
  urlClickAction: UrlClickAction;
  urlBlacklist: string[];
}

// 主题设置
export interface ThemeSettings {
  currentTheme: 'light' | 'dark';
  userHasPreference: boolean;
}

// Chrome存储数据结构
export interface ChromeStorageData {
  searchHackingSettings?: AppSettings;
  syntaxLibrary?: import('./syntax').SyntaxLibrary;
  currentTheme?: 'light' | 'dark';
  userHasPreference?: boolean;
}

