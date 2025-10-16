# Search Hacking 助手 <img src="hacker-icon.svg" alt="Hacker Icon" width="40" align="center" />

<div align="center">

![Logo](images/icon128.png)

**专业的搜索引擎Hacking语法工具**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://github.com/Pa55w0rd/google-hacking-assistant)
[![Version](https://img.shields.io/badge/version-2.3.0-green?style=flat-square)](https://github.com/Pa55w0rd/google-hacking-assistant/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=flat-square&logo=github)](https://github.com/Pa55w0rd/google-hacking-assistant)

**[English](README_EN.md) | 中文**

[功能特色](#-功能特色) • [安装使用](#-安装使用) • [使用指南](#-使用指南) • [开发指南](#-开发指南) • [贡献指南](#-贡献指南)

</div>

## 🔍 产品简介

**一键式搜索引擎Hacking工具，让安全研究更高效**

在 Google、百度、Bing 搜索结果页自动注入侧边栏，提供预定义和自定义的 Hacking 语法按钮。支持 `site:` 查询自动检测，一键执行高级搜索，轻松打造专属工具集。

> **🎯 核心优势**：11+ 内置语法 | 自定义语法支持 | URL批量提取 | 多引擎支持 | 零追踪零配置

## ✨ 核心功能

### 🚀 一键式搜索
- **智能侧边栏** - 自动检测 `site:` 查询，固定右侧显示
- **11+ 内置语法** - 覆盖文档、配置、备份、登录等常见场景
- **自定义语法** - 支持添加、编辑、独立开关，打造专属工具集
- **多引擎支持** - 支持 Google、百度、Bing 全球版本

### 📋 URL批量提取
- **一键提取** - 快速提取搜索结果中所有URL
- **智能过滤** - 支持黑名单（域名/通配符/正则表达式）
- **批量复制** - 单个或批量复制，方便进一步分析

### 🔒 安全隐私
- **本地存储** - 数据仅存储在浏览器本地
- **零追踪** - 不收集任何用户数据或搜索历史
- **开源透明** - 完全开源，代码可审计

## ⚠️ 使用提示

**搜索引擎语法差异**：Google、百度、Bing 的高级搜索语法存在差异，建议根据目标引擎调整语法。内置语法已优化兼容性。

**免责声明**：仅用于合法授权的安全研究和渗透测试，用户需遵守当地法律法规。

## 🚀 安装使用

### 从源代码安装

1.  **克隆代码**：
    ```bash
    git clone https://github.com/Pa55w0rd/google-hacking-assistant.git
    cd google-hacking-assistant
    ```

2.  **安装依赖**：
    ```bash
    npm install
    ```

3.  **构建项目**：
    ```bash
    npm run build
    ```

4.  **加载扩展**：
    - 打开Chrome浏览器，进入 `chrome://extensions/`
    - 开启右上角的"开发者模式"
    - 点击"加载已解压的扩展程序"
    - 选择项目的 `dist/` 目录

5.  安装完成！你应该能在浏览器工具栏看到扩展图标。

## 📖 使用指南

### 快速开始

1. **执行搜索**：在搜索引擎中输入 `site:example.com`
2. **查看侧边栏**：右侧自动显示语法按钮
3. **一键执行**：点击语法按钮，自动执行高级搜索

### 核心功能使用

#### 🎯 语法搜索
- **使用内置语法**：直接点击侧边栏中的语法按钮
- **自定义语法**：在设置页创建个性化语法，使用 `{target_domain}` 占位符
  - 示例：`site:{target_domain} filetype:pdf`
  - 效果：自动替换为 `site:example.com filetype:pdf`

#### 📋 URL提取
- 点击侧边栏"提取URL"按钮
- 自动提取搜索结果中的所有链接
- 支持单个/批量复制

#### ⚙️ 个性化配置
- **语法管理**：启用/禁用内置语法，添加自定义语法
- **引擎选择**：为每个语法选择支持的搜索引擎（Google/百度/Bing）
- **URL黑名单**：过滤不需要的域名（支持域名/通配符/正则表达式）
- **实时生效**：所有设置无需刷新页面立即生效

### 学习资源

推荐查阅 [Google Hacking Database (GHDB)](https://www.exploit-db.com/google-hacking-database) 获取更多语法灵感

## 📸 截图预览

**1. 弹出窗口**

![扩展弹出窗口](images/screenshot-popup.png)

*点击浏览器工具栏图标弹出的窗口，可快速开关侧边栏和进入设置。*

**2. 选项页面 - 基本设置**

![扩展选项页面 - 基本设置](images/screenshot-options-general.png)

![扩展选项页面 - 基本设置](images/screenshot-options-general-1.png)


*选项页面 - 基本设置，可配置侧边栏的开关、URL提取黑名单、导入导出配置、重置。*

**3. 选项页面 - 语法管理**

![扩展选项页面 - 语法管理](images/screenshot-options-buttons.png)

![扩展选项页面 - 语法管理](images/screenshot-options-buttons-1.png)

![扩展选项页面 - 语法管理](images/screenshot-options-buttons-2.png)



*选项页面 - 语法管理，可管理内置和自定义的 Hacking 语法，选择支持的搜索引擎。*

**4. Google 搜索侧边栏**

![Hacking 助手侧边栏在搜索结果页](images/screenshot-sidebar.png)

*扩展侧边栏出现在 Google 搜索结果页面右侧，提供一键 Hacking 功能。*

**5. 百度搜索侧边栏**

![Hacking 助手在百度搜索结果页](images/screenshot-baidu-sidebar.png)

*扩展侧边栏在百度搜索结果页面，提供相同的 Hacking 功能。*

**6. URL 提取功能**

![URL 提取功能界面](images/screenshot-url-extractor.png)

*从搜索结果中一键提取所有 URL，支持单个或批量复制。*


## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 报告问题
- 通过 [GitHub Issues](https://github.com/Pa55w0rd/google-hacking-assistant/issues) 报告Bug
- 提供详细的复现步骤和环境信息

### 功能建议
- 在Issues中提出新功能建议
- 描述功能的使用场景和预期效果

### 代码贡献
Fork → 创建分支 → 提交更改 → 创建Pull Request

## 📄 许可证 & 免责声明

**MIT License** | 仅供合法授权的安全研究和渗透测试使用，用户需遵守当地法律法规

## 📞 联系我们

- **GitHub**: [@Pa55w0rd](https://github.com/Pa55w0rd)
- **Issues**: [项目Issues页面](https://github.com/Pa55w0rd/google-hacking-assistant/issues)

---
## 📜 更新日志

### v2.3.0

✨ **功能增强**：新增自定义语法验证（名称重复检查、格式验证）、语法过滤和搜索功能

🎨 **UI优化**：修复单选框、风险等级颜色、图标对齐等多项UI问题

⚡ **性能提升**：优化Content Script初始化、新增Logger服务、修复内存泄漏

🧹 **资源优化**：Font Awesome本地化、清理无用文件

### v2.2

🌙 **深色模式**：全新的深色模式功能，支持系统主题自动检测和手动切换

⚙️ **配置优化**：增强的导入导出功能，支持主题设置和自定义语法管理

### v2.0

🏗️ **TypeScript重构**：完整的TypeScript重构，采用模块化设计，代码量减少66.5%

🛡️ **稳定性增强**：优化扩展上下文管理，解决百度页面闪烁问题

🔒 **URL黑名单**：支持域名、通配符和正则表达式三种匹配模式

<details>
<summary>查看历史版本</summary>

### v1.4
- 新增URL提取功能
- 更新扩展名称为"Search Hacking 助手"

### v1.3
- 新增百度搜索支持

### v1.2
- 添加GHDB推荐资源

### v1.1
- 兼容site:协议前缀

</details>

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐**

</div>
