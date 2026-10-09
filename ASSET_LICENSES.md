# 素材来源与许可说明

## 动态 Emoji 素材

- **指定来源**：[Noto Emoji Animation](https://googlefonts.github.io/noto-emoji-animation/)（Google Fonts 官方动画 Emoji 项目）
- **素材形式**：512px 动画 WebP，由 Google Fonts 的 Noto Emoji 服务提供（`https://fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/512.webp`）
- **许可证**：
  - Noto Emoji 图像资源：**Apache License 2.0**
  - Noto Emoji 字体：**SIL Open Font License 1.1**
  - 依据 Noto Emoji 官方仓库（googlefonts/noto-emoji）README 的许可声明："Tools and most image resources are under the Apache license, version 2.0；Emoji fonts are under the SIL Open Font License, version 1.1"
- **核实方式**：开发时直接访问了上述站点与 Google Fonts 资源地址，确认资源可下载、格式为动画 WebP、许可如上。

## 本地素材清单（public/emoji/）

| 文件 | Codepoint | 用途 | 回退静态 Emoji |
|---|---|---|---|
| anim_1fa99.webp | U+1FA99 | 月末收租、金币 | 🪙 |
| anim_1f4b8.webp | U+1F4B8 | 收入 | 💸 |
| anim_1f389.webp | U+1F389 | 庆祝、胜利 | 🎉 |
| anim_1f38a.webp | U+1F38A | 彩纸 | 🎊 |
| anim_1f3e0.webp | U+1F3E0 | 买房成功 | 🏠 |
| anim_2728.webp | U+2728 | 翻新完成 | ✨ |
| anim_1f44b.webp | U+1F44B | 租客入住 | 👋 |
| anim_1f604.webp | U+1F604 | 开心 | 😄 |
| anim_1f60a.webp | U+1F60A | 满意度 | 😊 |
| anim_1f4a1.webp | U+1F4A1 | 点亮/灯泡 | 💡 |
| anim_1f331.webp | U+1F331 | 社区升级 | 🌱 |
| anim_2b50.webp | U+2B50 | 达标月份 | ⭐ |
| anim_1f31f.webp | U+1F31F | 成就/里程碑 | 🌟 |
| anim_1f91d.webp | U+1F91D | 故事/握手 | 🤝 |

合计 14 个文件，约 4.7MB。素材清单见 `src/data/emojiManifest.ts`。

## 降级方案

`AnimatedEmoji` 组件（`src/components/AnimatedEmoji.tsx`）的行为：

1. 优先加载本地动画 WebP；
2. 素材加载失败（`onError`）时自动降级为**静态 Emoji + CSS 动画**，功能完整不受影响；
3. 支持 `once` / `loop` / `hover` 三种播放模式；
4. 尊重用户「减少动态效果」设置与系统 `prefers-reduced-motion`；
5. 同屏循环动画最多 6 个，离开视口时暂停循环；
6. 提供可访问标签（`role="img"` + `aria-label`）。

## 其他素材

- **建筑与社区场景**：SVG/CSS 手工绘制（`src/components/CommunityScene.tsx`），无外部素材。
- **音效**：WebAudio API 实时合成（`src/components/SoundManager.ts`），无音频文件。
- **字体**：系统字体栈（PingFang SC / Microsoft YaHei / Noto Sans SC），无外部字体文件。
