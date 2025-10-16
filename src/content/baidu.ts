/**
 * 百度搜索内容脚本入口
 */

import { SidebarFactory } from '../core/SidebarFactory';
import { Logger } from '../utils/logger';
import { runWhenIdle, waitForElement } from '../utils/dom-ready';
import { BAIDU_SELECTORS } from '../constants/selectors';

const logger = new Logger('百度内容脚本');

// 防止重复注入
if (!window.hackingSidebarInjected) {
  window.hackingSidebarInjected = true;
  
  logger.info('初始化');
  
  // 创建侧边栏管理器
  const sidebarManager = SidebarFactory.create('baidu');
  
  if (sidebarManager) {
    // 初始化函数
    const initialize = async () => {
      logger.info('开始初始化侧边栏');
      
      // 等待关键DOM元素出现（内容区域）
      const mainContainer = await waitForElement(
        `${BAIDU_SELECTORS.CONTENT_RIGHT}, ${BAIDU_SELECTORS.CONTAINER}`,
        5000
      );
      
      if (mainContainer) {
        // 在浏览器空闲时初始化侧边栏
        runWhenIdle(() => {
          sidebarManager.init(true);
        }, 1000);
      } else {
        logger.warn('关键DOM元素未找到，延迟初始化');
        // 兜底方案
        runWhenIdle(() => {
          sidebarManager.init(true);
        }, 500);
      }
      
      // 设置观察器
      sidebarManager.setupObservers();
    };
    
    // 根据DOM加载状态决定何时初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  } else {
    logger.error('创建侧边栏管理器失败');
  }
}

// 声明全局变量
declare global {
  interface Window {
    hackingSidebarInjected?: boolean;
  }
}

