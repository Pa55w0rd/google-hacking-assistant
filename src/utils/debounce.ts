/**
 * 防抖和节流工具
 */

export type DebounceTimers = Record<string, number>;

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @param timers 定时器存储对象
 * @param id 定时器ID
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  timers: DebounceTimers,
  id: string
): (...args: Parameters<T>) => void {
  return function (...args: Parameters<T>): void {
    // 清除之前的定时器
    if (timers[id]) {
      clearTimeout(timers[id]);
    }
    
    // 设置新的定时器
    timers[id] = window.setTimeout(() => {
      fn(...args);
      delete timers[id];
    }, delay);
  };
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return function (...args: Parameters<T>): void {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

