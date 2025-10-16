/**
 * 消息通信服务 - 单例模式
 */

import { MessageAction } from '../types';

export interface Message {
  action: MessageAction;
  [key: string]: any;
}

export interface MessageResponse {
  [key: string]: any;
}

export class MessageService {
  private static instance: MessageService;

  private constructor() {}

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * 安全地发送消息到扩展
   */
  public async sendMessage(message: Message): Promise<MessageResponse | null> {
    return new Promise((resolve) => {
      try {
        // 检查chrome API是否可用
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.warn('Chrome API不可用，无法发送消息');
          resolve(null);
          return;
        }
        
        // 检查扩展是否有效
        if (chrome.runtime.lastError || !chrome.runtime.id) {
          console.warn('扩展上下文已失效，无法发送消息');
          resolve(null);
          return;
        }
        
        // 尝试发送消息
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息出错:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        console.error('发送消息时出错:', error);
        resolve(null);
      }
    });
  }

  /**
   * 监听消息
   */
  public onMessage(
    callback: (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => boolean | void
  ): void {
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(callback);
    }
  }

  /**
   * 广播消息到所有标签页
   */
  public async broadcastToTabs(message: Message, excludeTabId?: number): Promise<void> {
    try {
      if (!chrome.tabs) {
        return;
      }

      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.id && (!excludeTabId || tab.id !== excludeTabId)) {
          chrome.tabs.sendMessage(tab.id, message, () => {
            if (chrome.runtime.lastError) {
              // 忽略无法发送到的标签页
              console.log('无法发送消息到标签页:', tab.id);
            }
          });
        }
      }
    } catch (error) {
      console.error('广播消息失败:', error);
    }
  }
}

