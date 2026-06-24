# PCBox

Electron 桌面端 TVBox 播放器，配合 TV-K（Android TV盒子应用）使用。

## 功能特性

- 🎬 支持 HLS (m3u8)、MP4 等多种视频格式
- 📱 通过 WebSocket 与 TV-K 配对，获取视频源
- 🔍 多源聚合搜索
- 📺 历史记录同步
- 🌙 亮色/暗色/跟随系统主题
- ⌨️ 视频播放快捷键（空格播放/暂停、方向键快进快退、音量调节等）
- 🖥️ 窗口全屏 / 系统全屏
- 📌 系统托盘支持

## TV-K 下载

TV-K 是配套的 Android TV 盒子应用，用于解析视频源并推送到 PCBox 播放。

**蓝奏云下载：** https://wwblv.lanzoul.com/b0139erm1e  
**密码：** 2i4s

## 使用教程

### 1. 启动 PCBox

打开打包后的应用，或通过 `pnpm dev` 启动开发版本。

### 2. 连接 TV-K

1. 确保 PC 和 Android 盒子在同一局域网
2. PCBox 启动后会自动开启 WebSocket 服务（默认端口 9898）
3. 在 Android 盒子上打开 TV-K 应用
4. 进入 TV-K 设置 → FreeBox 配对
5. 输入 PC 的 IP 地址和端口号，点击连接

### 3. 浏览与播放

1. 连接成功后，左侧会显示可用的视频源
2. 点击视频源加载首页内容
3. 点击视频封面查看详情
4. 选择集数开始播放

### 4. 搜索功能

1. 点击左侧 Search 图标
2. 输入关键词搜索
3. 可选择搜索的视频源

### 5. 快捷键

| 按键 | 功能 |
|------|------|
| 空格 | 播放/暂停 |
| ← → | 快退/快进 5 秒 |
| ↑ ↓ | 音量 +/- 10% |
| F / F11 | 窗口全屏 |
| Ctrl+F | 系统全屏 |
| M | 静音 |
| E | 显示/隐藏集数面板 |
| 0-9 | 跳转到 0%-90% |

### 6. 设置

点击左侧 Settings 图标可配置：

- **主题**：深色 / 浅色 / 跟随系统
- **菜单栏**：显示/隐藏 Electron 菜单栏
- **WebSocket 服务**：启动/停止/修改端口

## 开发

### 环境要求

- Node.js 18+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm dev
```

### 构建打包

```bash
# 构建
pnpm build

# 打包（输出到 release/ 目录）
pnpm pack
```

## 致谢

本项目参考了以下开源项目：

- [FreeBox](https://github.com/kknifer7/FreeBox) - 感谢 kknifer7 提供的 FreeBox 项目
- [TV-K](https://github.com/kknifer7/TV-K) - 感谢 kknifer7 提供的 TV-K 项目

## 技术栈

- Electron
- React 18
- TypeScript
- Vite
- Zustand（状态管理）
- video.js（视频播放）
- WebSocket（设备通信）

## 许可证

[MIT License](LICENSE)
