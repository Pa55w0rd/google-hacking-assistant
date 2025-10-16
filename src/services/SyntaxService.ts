/**
 * 语法管理服务 - 单例模式
 */

import { SyntaxItem, SyntaxLibrary } from '../types/syntax';
import { SearchEngine } from '../types';
import { StorageService } from './StorageService';
import { BUILTIN_SYNTAX } from '../constants/syntax';

export class SyntaxService {
  private static instance: SyntaxService;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  public static getInstance(): SyntaxService {
    if (!SyntaxService.instance) {
      SyntaxService.instance = new SyntaxService();
    }
    return SyntaxService.instance;
  }

  /**
   * 获取语法库
   */
  public async getSyntaxLibrary(): Promise<SyntaxLibrary> {
    const library = await this.storageService.getSyntaxLibrary();
    return library || BUILTIN_SYNTAX;
  }

  /**
   * 获取内置语法
   */
  public getBuiltinSyntax(): SyntaxLibrary {
    return BUILTIN_SYNTAX;
  }

  /**
   * 过滤适用于指定搜索引擎的语法
   */
  public filterByEngine(library: SyntaxLibrary, engine: SearchEngine): SyntaxLibrary {
    return library.filter(syntax => {
      if (!syntax.enabled) {
        return false;
      }

      // 检查engineSettings
      if (syntax.engineSettings) {
        return syntax.engineSettings[engine];
      }

      // 回退到engines数组
      return syntax.engines.includes(engine) || syntax.engines.includes('all' as any);
    });
  }

  /**
   * 替换语法模板中的占位符
   */
  public replacePlaceholders(template: string, targetDomain: string): string {
    return template.replace(/{target_domain}/g, targetDomain);
  }

  /**
   * 保存语法库
   */
  public async saveSyntaxLibrary(library: SyntaxLibrary): Promise<boolean> {
    return this.storageService.set({ syntaxLibrary: library });
  }

  /**
   * 更新单个语法项
   */
  public async updateSyntaxItem(syntaxItem: SyntaxItem): Promise<boolean> {
    const library = await this.getSyntaxLibrary();
    const index = library.findIndex(item => item.id === syntaxItem.id);
    
    if (index !== -1) {
      library[index] = syntaxItem;
      return this.saveSyntaxLibrary(library);
    }
    
    return false;
  }

  /**
   * 添加自定义语法
   */
  public async addCustomSyntax(syntaxItem: Omit<SyntaxItem, 'builtin'>): Promise<boolean> {
    const library = await this.getSyntaxLibrary();
    const newItem: SyntaxItem = {
      ...syntaxItem,
      builtin: false
    };
    
    library.push(newItem);
    return this.saveSyntaxLibrary(library);
  }

  /**
   * 删除语法项
   */
  public async deleteSyntaxItem(id: string): Promise<boolean> {
    const library = await this.getSyntaxLibrary();
    const filtered = library.filter(item => item.id !== id);
    
    if (filtered.length < library.length) {
      return this.saveSyntaxLibrary(filtered);
    }
    
    return false;
  }
}

