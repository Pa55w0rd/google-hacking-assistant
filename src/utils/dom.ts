/**
 * DOM操作工具函数
 */

/**
 * 检查元素是否在指定容器内
 */
export function isInContainer(element: Element, selectors: string[]): boolean {
  for (const selector of selectors) {
    if (element.closest(selector)) {
      return true;
    }
  }
  return false;
}

/**
 * 带动画效果地移除元素
 */
export function removeElementWithAnimation(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    element.style.opacity = '0';
    element.style.transform = 'translateX(20px)';
    
    setTimeout(() => {
      element.remove();
      resolve();
    }, 300);
  });
}

/**
 * 带动画效果地显示元素
 */
export function showElementWithAnimation(element: HTMLElement): void {
  element.style.opacity = '0';
  element.style.transform = 'translateX(20px)';
  element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  setTimeout(() => {
    element.style.opacity = '1';
    element.style.transform = 'translateX(0)';
  }, 50);
}

/**
 * 递归应用属性到元素及其子元素
 */
export function applyAttributeRecursively(
  element: Element,
  attribute: string,
  value: string
): void {
  if (element.nodeType === Node.ELEMENT_NODE) {
    element.setAttribute(attribute, value);
    Array.from(element.children).forEach(child => {
      applyAttributeRecursively(child, attribute, value);
    });
  }
}

/**
 * 创建元素并设置属性
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    className?: string;
    id?: string;
    innerHTML?: string;
    textContent?: string;
    attributes?: Record<string, string>;
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  if (options) {
    if (options.className) {
      element.className = options.className;
    }
    if (options.id) {
      element.id = options.id;
    }
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
  }
  
  return element;
}

