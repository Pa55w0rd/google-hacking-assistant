/**
 * 语法相关类型定义
 */

import { SearchEngine, RiskLevel } from './index';

// 引擎设置
export interface EngineSettings {
  google: boolean;
  baidu: boolean;
  bing: boolean;
}

// 语法项
export interface SyntaxItem {
  id: string;
  name: string;
  template: string;
  enabled: boolean;
  risk: RiskLevel;
  engines: SearchEngine[];
  engineSettings?: EngineSettings;
  builtin: boolean;
}

// 语法库
export type SyntaxLibrary = SyntaxItem[];

