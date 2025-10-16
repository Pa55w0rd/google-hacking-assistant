/**
 * DOM就绪工具 - 提供更可靠的DOM就绪检测
 */

/**
 * 等待DOM元素出现
 * @param selector - CSS选择器
 * @param timeout - 超时时间（毫秒），默认5000ms
 * @returns Promise<Element | null>
 */
export function waitForElement(
  selector: string,
  timeout: number = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    // 先检查元素是否已经存在
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    // 设置超时
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    // 创建MutationObserver监听DOM变化
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(element);
      }
    });

    // 开始观察
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * 等待DOM空闲时执行回调
 * @param callback - 回调函数
 * @param maxDelay - 最大延迟（毫秒），默认3000ms
 */
export function runWhenIdle(callback: () => void, maxDelay: number = 3000): void {
  // 优先使用requestIdleCallback
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: maxDelay });
  } else {
    // 降级为setTimeout
    setTimeout(callback, Math.min(500, maxDelay));
  }
}

/**
 * 智能等待：结合多个元素检查和空闲检测
 * @param selectors - 要等待的选择器数组
 * @param timeout - 超时时间（毫秒），默认5000ms
 * @returns Promise<boolean>
 */
export async function waitForDomReady(
  selectors: string[],
  timeout: number = 5000
): Promise<boolean> {
  try {
    // 等待至少一个选择器匹配
    const promises = selectors.map(selector => waitForElement(selector, timeout));
    const results = await Promise.race([
      Promise.all(promises),
      new Promise<null[]>(resolve => 
        setTimeout(() => resolve(Array(selectors.length).fill(null)), timeout)
      )
    ]);

    // 检查是否至少有一个元素找到
    return results.some(element => element !== null);
  } catch (error) {
    console.error('[DOM就绪] 等待DOM就绪时出错:', error);
    return false;
  }
}

