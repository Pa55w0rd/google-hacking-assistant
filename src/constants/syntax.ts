/**
 * 内置语法库
 */

import { SyntaxLibrary } from '../types/syntax';

export const BUILTIN_SYNTAX: SyntaxLibrary = [
  // === 通用语法（所有引擎都支持且效果好） ===
  {
    id: "universal_docs",
    name: "文档文件",
    template: "site:{target_domain} filetype:pdf OR filetype:doc OR filetype:docx OR filetype:ppt OR filetype:pptx", 
    enabled: true,
    risk: "info",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  {
    id: "universal_config",
    name: "配置文件",
    template: "site:{target_domain} filetype:xml OR filetype:conf OR filetype:cfg OR filetype:ini OR filetype:env", 
    enabled: true,
    risk: "high",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  {
    id: "universal_backup",
    name: "备份文件",
    template: "site:{target_domain} filetype:sql OR filetype:bak OR filetype:backup OR filetype:old",
    enabled: true,
    risk: "high",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  {
    id: "universal_login",
    name: "登录页面",
    template: "site:{target_domain} inurl:login OR inurl:admin OR inurl:signin", 
    enabled: true,
    risk: "low",
    engines: ["google", "baidu", "bing"],
    engineSettings: {
      google: true,
      baidu: true,
      bing: true
    },
    builtin: true
  },
  
  // === Google 特色语法 ===
  {
    id: "google_directory",
    name: "目录列表",
    template: "site:{target_domain} intitle:\"index of\" OR \"parent directory\"",
    enabled: true,
    risk: "medium",
    engines: ["google"],
    engineSettings: {
      google: true,
      baidu: false,
      bing: false
    },
    builtin: true
  },
  {
    id: "google_errors",
    name: "错误信息",
    template: "site:{target_domain} \"fatal error\" OR \"syntax error\" OR \"warning:\" OR \"mysql error\"",
    enabled: true,
    risk: "high",
    engines: ["google"],
    engineSettings: {
      google: true,
      baidu: false,
      bing: false
    },
    builtin: true
  },
  {
    id: "google_phpinfo",
    name: "PHP信息",
    template: "site:{target_domain} intitle:phpinfo OR inurl:phpinfo.php",
    enabled: true,
    risk: "high",
    engines: ["google"],
    engineSettings: {
      google: true,
      baidu: false,
      bing: false
    },
    builtin: true
  },
  
  // === 百度特色语法 ===
  {
    id: "baidu_chinese",
    name: "中文敏感信息",
    template: "site:{target_domain} \"密码\" OR \"账号\" OR \"用户名\" OR \"管理员\" OR \"后台\"",
    enabled: true,
    risk: "medium",
    engines: ["baidu"],
    engineSettings: {
      google: false,
      baidu: true,
      bing: false
    },
    builtin: true
  },
  {
    id: "baidu_logs",
    name: "日志文件",
    template: "site:{target_domain} filetype:log OR inurl:log",
    enabled: true,
    risk: "medium",
    engines: ["baidu"],
    engineSettings: {
      google: false,
      baidu: true,
      bing: false
    },
    builtin: true
  },
  
  // === Bing 特色语法 ===
  {
    id: "bing_contains",
    name: "文档内容搜索",
    template: "site:{target_domain} contains:password OR contains:confidential OR contains:secret",
    enabled: true,
    risk: "high",
    engines: ["bing"],
    engineSettings: {
      google: false,
      baidu: false,
      bing: true
    },
    builtin: true
  },
  {
    id: "bing_api",
    name: "API文档",
    template: "site:{target_domain} inurl:api OR inurl:swagger OR \"api documentation\"",
    enabled: true,
    risk: "medium",
    engines: ["bing"],
    engineSettings: {
      google: false,
      baidu: false,
      bing: true
    },
    builtin: true
  }
];

