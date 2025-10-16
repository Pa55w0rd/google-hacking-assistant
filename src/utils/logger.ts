/**
 * 日志服务 - 统一管理日志输出
 * 生产环境默认关闭日志，开发环境开启
 */

export class Logger {
  // 默认开启调试模式，可通过setDebugMode动态控制
  private static DEBUG: boolean = true;
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * 启用/禁用调试日志
   */
  public static setDebugMode(enabled: boolean): void {
    Logger.DEBUG = enabled;
  }

  /**
   * 调试日志
   */
  public debug(message: string, ...args: any[]): void {
    if (Logger.DEBUG) {
      console.log(`[${this.prefix}][DEBUG]`, message, ...args);
    }
  }

  /**
   * 信息日志
   */
  public info(message: string, ...args: any[]): void {
    if (Logger.DEBUG) {
      console.log(`[${this.prefix}][INFO]`, message, ...args);
    }
  }

  /**
   * 警告日志
   */
  public warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}][WARN]`, message, ...args);
  }

  /**
   * 错误日志（始终输出）
   */
  public error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}][ERROR]`, message, ...args);
  }
}

