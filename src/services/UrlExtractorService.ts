/**
 * URL提取服务 - 单例模式
 */

import { StorageService } from './StorageService';
import { Logger } from '../utils/logger';

export class UrlExtractorService {
  private static instance: UrlExtractorService;
  private storageService: StorageService;
  private logger: Logger;
  
  // 默认排除的域名
  private readonly EXCLUDE_DOMAINS = [
    'google.com',
    'gstatic.com',
    'googleusercontent.com',
    'baidu.com',
    'bdstatic.com',
    'bdimg.com',
    'bing.com',
    'bingapis.com',
    'microsoft.com'
  ];

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.logger = new Logger('URL提取');
  }

  public static getInstance(): UrlExtractorService {
    if (!UrlExtractorService.instance) {
      UrlExtractorService.instance = new UrlExtractorService();
    }
    return UrlExtractorService.instance;
  }

  /**
   * 从页面提取URL
   */
  public async extractUrls(
    selectors: string[],
    excludedContainers: string[]
  ): Promise<string[]> {
    try {
      this.logger.info('开始提取URL');
      
      const urlSet = new Set<string>();
      const settings = await this.storageService.getSettings();
      const blacklist = settings?.urlBlacklist || [];
      
      this.logger.debug(`黑名单规则数量: ${blacklist.length}`);
      
      // 编译黑名单规则
      const { regexRules, domainRules } = this.compileBlacklist(blacklist);
      
      // 提取URL
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        this.logger.debug(`选择器 "${selector}" 找到 ${elements.length} 个元素`);
        
        elements.forEach((element) => {
          if (this.isInExcludedContainer(element, excludedContainers)) {
            return;
          }
          
          const link = this.getLinkFromElement(element);
          if (link && link.href) {
            const url = this.normalizeUrl(link.href);
            // 如果normalizeUrl返回空字符串，表示应该跳过这个URL
            if (!url) {
              return;
            }
            this.logger.debug(`检查URL: ${url}`);
            if (!this.shouldExcludeUrl(url, regexRules, domainRules)) {
              this.logger.debug(`✓ 添加URL: ${url}`);
              urlSet.add(url);
            }
          }
        });
      }
      
      this.logger.info(`共提取到 ${urlSet.size} 个URL`);
      return Array.from(urlSet);
    } catch (error) {
      this.logger.error('提取过程中出错:', error);
      return [];
    }
  }

  /**
   * 编译黑名单规则
   */
  private compileBlacklist(blacklist: string[]): {
    regexRules: RegExp[];
    domainRules: Array<{ type: 'wildcard' | 'normal'; domain: string }>;
  } {
    const regexRules: RegExp[] = [];
    const domainRules: Array<{ type: 'wildcard' | 'normal'; domain: string }> = [];
    
    for (const rule of blacklist) {
      // 正则表达式规则
      if (rule.startsWith('/') && rule.endsWith('/')) {
        try {
          regexRules.push(new RegExp(rule.slice(1, -1), 'i'));
        } catch (e) {
          console.error('无效的正则表达式规则:', rule, e);
        }
      }
      // 通配符域名规则
      else if (rule.startsWith('*.')) {
        domainRules.push({
          type: 'wildcard',
          domain: rule.substring(2)
        });
      }
      // 普通域名规则
      else {
        domainRules.push({
          type: 'normal',
          domain: rule
        });
      }
    }
    
    return { regexRules, domainRules };
  }

  /**
   * 检查URL是否应该被排除
   */
  private shouldExcludeUrl(
    url: string,
    regexRules: RegExp[],
    domainRules: Array<{ type: 'wildcard' | 'normal'; domain: string }>
  ): boolean {
    if (!url || !url.startsWith('http')) {
      return true;
    }
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // 检查内置排除域名（精确匹配或子域名匹配）
      for (const domain of this.EXCLUDE_DOMAINS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          this.logger.debug(`排除内置域名: ${hostname} 匹配 ${domain}`);
          return true;
        }
      }
      
      // 检查特殊协议
      if (url.startsWith('javascript:') || 
          url.includes('chrome-extension://') ||
          url.includes('webcache.googleusercontent.com') ||
          url.includes('translate.google.com')) {
        this.logger.debug(`排除特殊协议: ${url}`);
        return true;
      }
      
      // 检查域名黑名单
      for (const rule of domainRules) {
        if (rule.type === 'wildcard') {
          if (hostname.endsWith('.' + rule.domain) || hostname === rule.domain) {
            this.logger.debug(`排除通配符域名: ${hostname} 匹配 ${rule.domain}`);
            return true;
          }
        } else {
          if (hostname === rule.domain || hostname.endsWith('.' + rule.domain)) {
            this.logger.debug(`排除普通域名: ${hostname} 匹配 ${rule.domain}`);
            return true;
          }
        }
      }
      
      // 检查正则黑名单
      for (const regex of regexRules) {
        if (regex.test(url)) {
          return true;
        }
      }
      
      return false;
    } catch (e) {
      this.logger.error('URL解析错误:', e, url);
      return true;
    }
  }

  /**
   * 规范化URL
   */
  private normalizeUrl(url: string): string {
    try {
      // 百度跳转链接处理
      if (url.includes('baidu.com/link?url=')) {
        this.logger.debug('检测到百度跳转链接，跳过:', url);
        return ''; // 返回空字符串表示跳过
      }
      
      // 百度另一种跳转格式
      if (url.includes('www.baidu.com/') && url.includes('/link?')) {
        this.logger.debug('检测到百度跳转链接，跳过:', url);
        return '';
      }
      
      const urlObj = new URL(url);
      
      // Bing跳转链接处理
      if (urlObj.hostname.includes('bing.com') && urlObj.pathname.includes('/ck/a')) {
        const targetUrl = urlObj.searchParams.get('u');
        if (targetUrl) {
          // Bing的u参数是base64编码的
          try {
            let decoded = atob(targetUrl.replace(/^a1/, ''));
            // 如果解码后的URL不是以协议开头，添加https://
            if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
              decoded = 'https://' + decoded;
            }
            this.logger.debug('Bing跳转链接解码:', url, '→', decoded);
            return decoded;
          } catch (e) {
            this.logger.debug('Bing链接解码失败，跳过:', url);
            return '';
          }
        }
      }
      
      // 处理通用重定向URL参数
      if (urlObj.searchParams.has('url')) {
        const redirectUrl = urlObj.searchParams.get('url');
        if (redirectUrl && redirectUrl.startsWith('http')) {
          this.logger.debug('检测到重定向URL:', redirectUrl);
          return redirectUrl;
        }
      }
      
      // 移除跟踪参数
      const paramsToRemove = ['ved', 'usg', 'ei', 'sa', 'source', 'cd', 'rct', 'cad', 'uact', 'aqs', 'sourceid', 'sxsrf'];
      paramsToRemove.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch (e) {
      this.logger.error('规范化URL出错:', e, url);
      return '';
    }
  }

  /**
   * 检查元素是否在排除容器内
   */
  private isInExcludedContainer(element: Element, excludedContainers: string[]): boolean {
    for (const selector of excludedContainers) {
      if (element.closest(selector)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 从元素获取链接
   */
  private getLinkFromElement(element: Element): HTMLAnchorElement | null {
    // 百度特殊处理：优先从mu属性获取真实URL
    if (element.hasAttribute('mu')) {
      const realUrl = element.getAttribute('mu');
      if (realUrl && realUrl.startsWith('http')) {
        const a = document.createElement('a');
        a.href = realUrl;
        this.logger.debug('百度mu属性获取真实URL:', realUrl);
        return a;
      }
    }
    
    // 检查父元素的mu属性
    const parentWithMu = element.closest('[mu]');
    if (parentWithMu) {
      const realUrl = parentWithMu.getAttribute('mu');
      if (realUrl && realUrl.startsWith('http')) {
        const a = document.createElement('a');
        a.href = realUrl;
        this.logger.debug('百度父元素mu属性获取真实URL:', realUrl);
        return a;
      }
    }
    
    if (element.tagName === 'A' && element.hasAttribute('href')) {
      return element as HTMLAnchorElement;
    }
    
    // 对于cite元素（Bing），直接从文本内容获取URL
    if (element.tagName === 'CITE') {
      const textContent = element.textContent?.trim();
      if (textContent && textContent.startsWith('http')) {
        const a = document.createElement('a');
        a.href = textContent;
        return a;
      }
    }
    
    return element.closest('a[href]') as HTMLAnchorElement | null;
  }
}

