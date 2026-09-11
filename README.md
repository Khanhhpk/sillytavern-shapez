# 🔷 Shapez Side Game - SillyTavern Extension

Play the open-source factory building and automation game **[shapez](https://github.com/tobspr-games/shapez.io)** directly inside **SillyTavern** in a floating, draggable, and resizable window!

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![SillyTavern](https://img.shields.io/badge/SillyTavern-Extension-purple.svg)

---

## ✨ Features

- 🏭 **Full Factory Automation Gameplay**: Build, extract, split, rotate, color, and assemble shapes into complex configurations right while chatting with your favorite AI characters.
- 🪟 **Floating Draggable & Resizable Window**:
  - Drag anywhere across the screen.
  - Smooth corner and edge resizing with minimum bounded limits.
  - Seamless pointer-event shields so the game iframe never traps your cursor during movement.
- 👁️ **Ghost / Transparent Opacity Modes**: Toggle between 100%, 85%, 65%, and 45% transparency so you can keep an eye on your assembly lines while simultaneously reading roleplay chats.
- ➖ **Dock & Minimize Mode**: Shrink into a discreet, glowing circular badge at the bottom corner of your screen. Click or drag to instantly restore.
- 🗖 **Instant Fullscreen / Maximize**: Expand the factory to full viewport dimensions whenever you need room for massive layouts.
- 🔇 **Sound & Audio Toggle**: Quick-mute toggle in the header.
- 📌 **Always on Top (Pin)**: Keep the game floating over all chat elements and modals.
- 💾 **State Persistence**: Remembers your window size, coordinates, opacity, and open/minimized state across page reloads. Game progress is saved automatically in browser storage.
- 🤖 **AI Streaming Companion**: Pulsates gently while waiting for long LLM responses, making it the perfect idle side-activity.

---

## 🚀 Installation in SillyTavern

### Option 1: Install via SillyTavern Extensions Manager
1. Open **SillyTavern**.
2. Click on the **Extensions** (puzzle piece) icon in the top navigation bar.
3. Select **Install Extension**.
4. Paste this repository URL:
   ```text
   https://github.com/Khanhhpk/sillytavern-shapez.git
   ```
5. Click **Save / Install**, then reload SillyTavern.

### Option 2: Manual Clone
In your terminal, navigate to your SillyTavern directory:
```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/Khanhhpk/sillytavern-shapez.git
```
Reload SillyTavern in your browser.

---

## 🎮 How to Play

1. Click the **🔷 Shapez** icon in the SillyTavern top bar to launch the floating window.
2. Build extractors on shape deposits, connect conveyor belts, and route them to the central Hub.
3. Combine shapes using Cutters, Rotators, Stackers, and Painters.
4. Unlock new technologies and upgrade production speeds!

---

## 📜 Credits & License

- **Shapez** game engine and original assets by [Tobias Springer (tobspr Games)](https://github.com/tobspr-games/shapez.io) under the **GNU General Public License v3.0 (GPL-3.0)**.
- Extension integration and floating window UI for SillyTavern by **Khanhhpk**.

