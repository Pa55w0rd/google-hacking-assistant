# Search Hacking Assistant <img src="hacker-icon.svg" alt="Hacker Icon" width="40" align="center" />

<div align="center">

![Logo](images/icon128.png)

**Professional Search Engine Hacking Syntax Tool**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://github.com/Pa55w0rd/google-hacking-assistant)
[![Version](https://img.shields.io/badge/version-2.3.0-green?style=flat-square)](https://github.com/Pa55w0rd/google-hacking-assistant/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=flat-square&logo=github)](https://github.com/Pa55w0rd/google-hacking-assistant)

**English | [中文](README.md)**

[Features](#-features) • [Installation](#-installation) • [Usage Guide](#-usage-guide) • [Contributing](#-contributing)

</div>

## 🔍 Product Overview

**One-Click Search Engine Hacking Tool for Efficient Security Research**

Automatically injects a sidebar on Google, Baidu, and Bing search result pages. Provides predefined and custom Hacking syntax buttons. Auto-detects `site:` queries, one-click advanced search execution, build your own toolkit easily.

> **🎯 Core Advantages**: 11+ Built-in Syntax | Custom Syntax Support | Batch URL Extraction | Multi-Engine Support | Zero Tracking & Zero Config

## ✨ Core Features

### 🚀 One-Click Search
- **Smart Sidebar** - Auto-detects `site:` queries, fixed right-side display
- **11+ Built-in Syntax** - Covers documents, configs, backups, logins, and more
- **Custom Syntax** - Add, edit, independent toggle, build your own toolkit
- **Multi-Engine** - Supports Google, Baidu, Bing global versions

### 📋 Batch URL Extraction
- **One-Click Extract** - Quickly extract all URLs from search results
- **Smart Filtering** - Blacklist support (domain/wildcard/regex)
- **Batch Copy** - Single or batch copy for further analysis

### 🔒 Security & Privacy
- **Local Storage** - Data stored only in browser locally
- **Zero Tracking** - No user data or search history collection
- **Open Source** - Completely open source, auditable code

## ⚠️ Usage Tips

**Search Engine Syntax Differences**: Advanced search syntax varies across Google, Baidu, and Bing. Adjust syntax based on target engine. Built-in syntax optimized for compatibility.

**Disclaimer**: For authorized security research and penetration testing only. Users must comply with local laws and regulations.

## 🚀 Installation

1. **Clone & Build**:
   ```bash
   git clone https://github.com/Pa55w0rd/google-hacking-assistant.git
   cd google-hacking-assistant
   npm install
   npm run build
   ```

2. **Load Extension**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

## 📖 Usage Guide

### Quick Start

1. **Execute Search**: Enter `site:example.com` in search engine
2. **View Sidebar**: Syntax buttons display automatically on the right
3. **One-Click Execute**: Click syntax button to run advanced search

### Core Features

#### 🎯 Syntax Search
- **Use Built-in Syntax**: Click syntax buttons in sidebar directly
- **Custom Syntax**: Create personalized syntax in settings using `{target_domain}` placeholder
  - Example: `site:{target_domain} filetype:pdf`
  - Result: Auto-replaces to `site:example.com filetype:pdf`

#### 📋 URL Extraction
- Click "Extract URLs" button in sidebar
- Auto-extracts all links from search results
- Supports single/batch copy

#### ⚙️ Personalization
- **Syntax Management**: Enable/disable built-in syntax, add custom syntax
- **Engine Selection**: Choose supported search engines for each syntax (Google/Baidu/Bing)
- **URL Blacklist**: Filter unwanted domains (domain/wildcard/regex support)
- **Real-time Effect**: All settings take effect immediately without page refresh

### Learning Resources

Recommended: [Google Hacking Database (GHDB)](https://www.exploit-db.com/google-hacking-database) for more syntax inspiration

## 📸 Screenshots

**1. Popup Window**

![Extension Popup](images/screenshot-popup.png)

*Popup window when clicking browser toolbar icon, for quick sidebar toggle and settings access.*

**2. Options Page - General Settings**

![Extension Options Page - General Settings](images/screenshot-options-general.png)

![Extension Options Page - General Settings](images/screenshot-options-general-1.png)

*Options page - General settings, configure sidebar toggle, URL extraction blacklist, import/export configuration, reset.*

**3. Options Page - Syntax Management**

![Extension Options Page - Syntax Management](images/screenshot-options-buttons.png)

![Extension Options Page - Syntax Management](images/screenshot-options-buttons-1.png)

![Extension Options Page - Syntax Management](images/screenshot-options-buttons-2.png)

*Options page - Syntax management, manage built-in and custom hacking syntax, select supported search engines.*

**4. Google Search Sidebar**

![Hacking Assistant Sidebar on Search Results Page](images/screenshot-sidebar.png)

*Extension sidebar appears on the right side of Google search results page, providing one-click hacking functionality.*

**5. Baidu Search Sidebar**

![Hacking Assistant on Baidu Search Results Page](images/screenshot-baidu-sidebar.png)

*Extension sidebar on Baidu search results page, providing the same hacking functionality.*

**6. URL Extraction Feature**

![URL Extraction Feature Interface](images/screenshot-url-extractor.png)

*One-click extraction of all URLs from search results, supporting single or batch copy.*

## 🤝 Contributing

We welcome all forms of contributions!

### Reporting Issues
- Report bugs through [GitHub Issues](https://github.com/Pa55w0rd/google-hacking-assistant/issues)
- Provide detailed reproduction steps and environment information

### Feature Suggestions
- Propose new feature suggestions in Issues
- Describe the use cases and expected effects of the feature

### Code Contributions
Fork → Create Branch → Commit Changes → Create Pull Request

## 📄 License & Disclaimer

**MIT License** | For authorized security research and penetration testing only. Users must comply with local laws and regulations

## 📞 Contact Us

- **GitHub**: [@Pa55w0rd](https://github.com/Pa55w0rd)
- **Issues**: [Project Issues Page](https://github.com/Pa55w0rd/google-hacking-assistant/issues)

---
## 📜 Changelog

### v2.3.0

✨ **Feature Enhancements**: Added custom syntax validation (duplicate name check, format validation), syntax filtering and search functionality

🎨 **UI Improvements**: Fixed radio buttons, risk level colors, icon alignment and multiple UI issues

⚡ **Performance Boost**: Optimized Content Script initialization, added Logger service, fixed memory leaks

🧹 **Resource Optimization**: Font Awesome localization, cleaned up unused files

### v2.2

🌙 **Dark Mode**: New dark mode feature with automatic system theme detection and manual toggle

⚙️ **Configuration Enhancement**: Enhanced import/export functionality with theme settings and custom syntax management

### v2.0

🏗️ **TypeScript Refactor**: Complete TypeScript refactor with modular design, 66.5% code reduction

🛡️ **Stability Enhancement**: Optimized extension context management, resolved Baidu page flickering issues

🔒 **URL Blacklist**: Supports domain, wildcard, and regex matching modes

<details>
<summary>View Historical Versions</summary>

### v1.4
- Added URL extraction functionality
- Updated extension name to "Search Hacking Assistant"

### v1.3
- Added Baidu search support

### v1.2
- Added GHDB recommended resources

### v1.1
- Compatible with site: protocol prefix

</details>

---

<div align="center">

**If this project helps you, please give it a ⭐**

</div> 