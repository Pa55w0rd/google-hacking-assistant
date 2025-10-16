/**
 * DOM选择器常量
 */

// Google搜索页面选择器
export const GOOGLE_SELECTORS = {
  MAIN_CONTAINER: '#rcnt',
  CENTER_COL: '#center_col',
  MAIN: '#main',
  RIGHT_COLUMN: '#rhs',
  SEARCH_RESULTS: [
    '.g a[href^="http"]',
    '.yuRUbf > a[href]',
    '.tF2Cxc > a[href]',
    '.Z26q7c > a[href]',
    'div[data-snf] a[href^="http"]',
    '.g h3.LC20lb',
    '[data-header-feature] a[href^="http"]',
    '.rc a[href^="http"]',
    '.jtfYYd a[href^="http"]',
    '.kCrYT > a[href]'
  ],
  EXCLUDED_CONTAINERS: [
    'footer',
    '.bj9MHd',
    '.SzZmKb',
    '.ikrT4e',
    '.o3j99',
    '#footcnt',
    '#botstuff',
    '.hacking-sidebar',
    '[aria-label="Footer"]'
  ]
};

// 百度搜索页面选择器
export const BAIDU_SELECTORS = {
  CONTAINER: '#container',
  WRAPPER: '#wrapper',
  CONTENT_RIGHT: '#content_right',
  RESULTS: '#content_left',
  SEARCH_RESULTS: [
    '.result.c-container a[href^="http"]',
    '.c-container a[href^="http"]',
    'div[mu] a[href^="http"]',
    '.result h3 a',
    'article h3 a',
    'div.c-container > h3 > a',
    '.result.c-container > .c-container a[href^="http"]'
  ],
  EXCLUDED_CONTAINERS: [
    'footer',
    '#bottom_layer',
    '.page-ft',
    '.hacking-sidebar',
    '.c-tools',
    '.c-tip-con',
    '.c-recommend'
  ]
};

// Bing搜索页面选择器
export const BING_SELECTORS = {
  MAIN_CONTAINER: '#b_content',
  RIGHT_RAIL: '#b_context',
  RESULTS_CONTAINER: '#b_results',
  SEARCH_RESULTS: [
    '.b_algo h2 a[href^="http"]',
    'li.b_algo a[href^="http"]',
    '.b_title a[href^="http"]',
    '.b_algo > h2 > a',
    'li.b_algo div.b_title a'
  ],
  EXCLUDED_CONTAINERS: [
    'footer',
    '.b_footer',
    '.hacking-sidebar',
    '#b_context',
    '.b_ad'
  ]
};

// 通用侧边栏选择器
export const SIDEBAR_SELECTORS = {
  SIDEBAR: '.hacking-sidebar',
  EXTRACT_URL_BTN: '#extractUrlBtn',
  URL_PANEL: '#urlExtractorPanel',
  URL_LIST: '#urlList',
  URL_COUNT: '#urlCount',
  COLLAPSE_BTN: '#collapseUrlPanelBtn',
  COPY_ALL_BTN: '#copyAllUrlsBtn'
};

