/**
 * 全局类型定义
 */

// 搜索引擎类型
export type SearchEngine = 'google' | 'baidu' | 'bing';

// 风险等级
export type RiskLevel = 'info' | 'low' | 'medium' | 'high';

// 主题类型
export type Theme = 'light' | 'dark';

// 国际化消息键
export type I18nKey = 
  | 'sidebarTitle'
  | 'extractUrlBtn'
  | 'urlPanelTitle'
  | 'copyAllUrlsBtn'
  | 'customSyntaxDivider'
  | 'settingsBtn'
  | 'githubBtn'
  | 'loading'
  | 'copySuccess'
  | 'copyError'
  | 'urlExtractionErrorTips'
  | 'refreshBtn';

// URL点击动作类型
export type UrlClickAction = 'copy' | 'open';

// 消息动作类型
export type MessageAction = 
  | 'openOptions'
  | 'getBuiltinSyntax'
  | 'getCurrentDomain'
  | 'getSettings'
  | 'getSyntaxLibrary'
  | 'resetSettings'
  | 'settingsChanged'
  | 'syntaxChanged'
  | 'filterUrls';

