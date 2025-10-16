/**
 * 默认配置常量
 */

import { AppSettings } from '../types/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  sidebarEnabled: true,
  googleEnabled: true,
  baiduEnabled: true,
  bingEnabled: true,
  openInNewTab: true,
  urlClickAction: 'copy',
  urlBlacklist: []  // 默认空数组，用户可根据需要自行添加
};

export const DEFAULT_THEME = 'light';

export const EXTENSION_NAME = 'Search Hacking 助手';

