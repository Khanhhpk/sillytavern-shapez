/**
 * Shapez Side Game Extension for SillyTavern
 * Author: Khanhhpk
 * Description: Draggable, floating window to run Shapez automation factory inside SillyTavern.
 * Fully compatible with SillyTavern lifecycle and jQuery.
 */

(function ($) {
    "use strict";

    const EXT_ID = "sillytavern-shapez";
    const SETTINGS_KEY = "st_shapez_settings";

    // Default configuration
    const defaultSettings = {
        isOpen: false,
        isMinimized: false,
        isPinned: false,
        isMaximized: false,
        isMuted: false,
        opacity: 0.96,
        x: 120,
        y: 80,
        width: 820,
        height: 560,
        fabX: null,
        fabY: null,
        gamePath: "/scripts/extensions/third-party/sillytavern-shapez/game/index.html"
    };

    let settings = Object.assign({}, defaultSettings);

    // DOM Elements
    let windowEl = null;
    let headerEl = null;
    let bodyEl = null;
    let frameEl = null;
    let shieldEl = null;
    let fabEl = null;
    let topbarBtnEl = null;

    // Window dragging & resizing state
    let isDragging = false;
    let isResizing = false;
    let resizeDir = "";
    let dragStartX = 0, dragStartY = 0;
    let initialX = 0, initialY = 0;
    let initialWidth = 0, initialHeight = 0;
    let preMaximizedRect = null;

    // Floating Action Bubble (FAB) dragging state
    let isFabDragging = false;
    let fabStartX = 0, fabStartY = 0;
    let fabInitialLeft = 0, fabInitialTop = 0;
    let fabHasMoved = false;

    /**
     * Load settings from localStorage
     */
    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                settings = Object.assign({}, defaultSettings, parsed);
            }
        } catch (e) {
            console.warn(`[${EXT_ID}] Failed to load settings:`, e);
        }
    }

    /**
     * Save settings to localStorage
     */
    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn(`[${EXT_ID}] Failed to save settings:`, e);
        }
    }

    // Determine extension base directory URL
    const SCRIPT_BASE_URL = (() => {
        if (document.currentScript && document.currentScript.src) {
            return document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf("/"));
        }
        const scripts = document.getElementsByTagName("script");
        for (let i = scripts.length - 1; i >= 0; i--) {
            const src = scripts[i].src || "";
            if (src.includes("index.js") || src.includes(EXT_ID)) {
                return src.substring(0, src.lastIndexOf("/"));
            }
        }
        return "";
    })();

    /**
     * Resolve the proper game index URL depending on SillyTavern environment
     */
    function getGameUrl() {
        if (SCRIPT_BASE_URL) {
            return `${SCRIPT_BASE_URL}/game/index.html`;
        }
        return "./game/index.html";
    }

    /**
     * Create floating window DOM structure
     */
    function createWindowDOM() {
        if (document.getElementById("st-shapez-window")) return;

        // Main Window
        windowEl = document.createElement("div");
        windowEl.id = "st-shapez-window";
        windowEl.className = "st-shapez-hidden";
        windowEl.style.left = `${Math.max(10, Math.min(window.innerWidth - 400, settings.x))}px`;
        windowEl.style.top = `${Math.max(10, Math.min(window.innerHeight - 300, settings.y))}px`;
        windowEl.style.width = `${Math.max(380, Math.min(window.innerWidth - 20, settings.width))}px`;
        windowEl.style.height = `${Math.max(260, Math.min(window.innerHeight - 20, settings.height))}px`;
        windowEl.style.opacity = settings.opacity;
        if (settings.isPinned) {
            windowEl.classList.add("st-shapez-pinned");
        }

        // Header
        headerEl = document.createElement("div");
        headerEl.className = "st-shapez-header";
        headerEl.innerHTML = `
            <div class="st-shapez-title-group">
                <span class="st-shapez-logo-icon">🔷</span>
                <span class="st-shapez-title">Shapez Factory</span>
                <span class="st-shapez-badge">v1.0</span>
            </div>
            <div class="st-shapez-controls">
                <div class="st-shapez-opacity-dropdown">
                    <button class="st-shapez-btn" id="st-shapez-btn-opacity" title="Độ trong suốt (Opacity)">👁️</button>
                    <div class="st-shapez-opacity-menu" id="st-shapez-opacity-menu">
                        <div class="st-shapez-opacity-item ${settings.opacity === 1.0 ? "selected" : ""}" data-op="1.0">100% Solid</div>
                        <div class="st-shapez-opacity-item ${settings.opacity === 0.85 ? "selected" : ""}" data-op="0.85">85% Clean</div>
                        <div class="st-shapez-opacity-item ${settings.opacity === 0.65 ? "selected" : ""}" data-op="0.65">65% Ghost</div>
                        <div class="st-shapez-opacity-item ${settings.opacity === 0.45 ? "selected" : ""}" data-op="0.45">45% Faint</div>
                    </div>
                </div>
                <button class="st-shapez-btn ${settings.isMuted ? "active" : ""}" id="st-shapez-btn-mute" title="Bật/Tắt âm thanh (Mute)">${settings.isMuted ? "🔇" : "🔊"}</button>
                <button class="st-shapez-btn ${settings.isPinned ? "active" : ""}" id="st-shapez-btn-pin" title="Ghim trên cùng (Always on Top)">📌</button>
                <button class="st-shapez-btn" id="st-shapez-btn-min" title="Thu nhỏ vào bóng nổi (Minimize)">➖</button>
                <button class="st-shapez-btn" id="st-shapez-btn-max" title="Phóng to toàn màn hình (Maximize)">🗖</button>
                <button class="st-shapez-btn close" id="st-shapez-btn-close" title="Đóng cửa sổ (Close)">✕</button>
            </div>
        `;

        // Body with iframe & shield
        bodyEl = document.createElement("div");
        bodyEl.className = "st-shapez-body";

        frameEl = document.createElement("iframe");
        frameEl.id = "st-shapez-frame";
        frameEl.setAttribute("allow", "autoplay");
        frameEl.setAttribute("allowfullscreen", "true");

        // When iframe finishes loading, sync mute settings
        frameEl.addEventListener("load", () => {
            applyAudioMuteState();
        });

        shieldEl = document.createElement("div");
        shieldEl.className = "st-shapez-shield";

        // Resizing handles
        const resizeHandleSE = document.createElement("div");
        resizeHandleSE.className = "st-shapez-resize-handle st-shapez-resize-se";
        resizeHandleSE.dataset.dir = "se";

        const resizeHandleS = document.createElement("div");
        resizeHandleS.className = "st-shapez-resize-handle st-shapez-resize-s";
        resizeHandleS.dataset.dir = "s";

        const resizeHandleE = document.createElement("div");
        resizeHandleE.className = "st-shapez-resize-handle st-shapez-resize-e";
        resizeHandleE.dataset.dir = "e";

        bodyEl.appendChild(frameEl);
        bodyEl.appendChild(shieldEl);
        bodyEl.appendChild(resizeHandleSE);
        bodyEl.appendChild(resizeHandleS);
        bodyEl.appendChild(resizeHandleE);

        windowEl.appendChild(headerEl);
        windowEl.appendChild(bodyEl);
        document.body.appendChild(windowEl);

        createFloatingActionBubble();
        setupEventListeners();
    }

    /**
     * Create draggable Floating Action Bubble (bóng nổi mở game)
     */
    function createFloatingActionBubble() {
        if (document.getElementById("st-shapez-fab")) return;

        fabEl = document.createElement("div");
        fabEl.id = "st-shapez-fab";
        fabEl.className = "st-shapez-fab";
        fabEl.title = "Shapez Automation Factory (Kéo để di chuyển, click để mở/đóng)";
        fabEl.innerHTML = `
            <div class="st-shapez-fab-icon">🔷</div>
            <span class="st-shapez-fab-pulse"></span>
            <div class="st-shapez-fab-tooltip">Shapez Factory</div>
        `;

        // Restore saved FAB coordinates or default to bottom-right
        if (settings.fabX !== null && settings.fabY !== null) {
            const clampedX = Math.max(10, Math.min(window.innerWidth - 65, settings.fabX));
            const clampedY = Math.max(10, Math.min(window.innerHeight - 65, settings.fabY));
            fabEl.style.left = `${clampedX}px`;
            fabEl.style.top = `${clampedY}px`;
            fabEl.style.right = "auto";
            fabEl.style.bottom = "auto";
        } else {
            fabEl.style.bottom = "24px";
            fabEl.style.right = "24px";
        }

        document.body.appendChild(fabEl);
        setupFabEvents();
    }

    /**
     * Setup Floating Action Bubble events (Draggable + Click to toggle)
     */
    function setupFabEvents() {
        if (!fabEl) return;

        fabEl.addEventListener("mousedown", onFabMouseDown);
        fabEl.addEventListener("touchstart", onFabMouseDown, { passive: false });

        window.addEventListener("mousemove", onFabMouseMove);
        window.addEventListener("touchmove", onFabMouseMove, { passive: false });

        window.addEventListener("mouseup", onFabMouseUp);
        window.addEventListener("touchend", onFabMouseUp);
    }

    function onFabMouseDown(e) {
        isFabDragging = true;
        fabHasMoved = false;

        const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

        fabStartX = clientX;
        fabStartY = clientY;

        const rect = fabEl.getBoundingClientRect();
        fabInitialLeft = rect.left;
        fabInitialTop = rect.top;

        if (e.cancelable && e.type.startsWith("touch")) {
            e.preventDefault();
        }
    }

    function onFabMouseMove(e) {
        if (!isFabDragging) return;

        const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - fabStartX;
        const deltaY = clientY - fabStartY;

        if (Math.hypot(deltaX, deltaY) > 5) {
            fabHasMoved = true;
            fabEl.classList.add("dragging");
        }

        if (fabHasMoved) {
            let newX = fabInitialLeft + deltaX;
            let newY = fabInitialTop + deltaY;

            // Constrain inside viewport
            newX = Math.max(8, Math.min(window.innerWidth - 60, newX));
            newY = Math.max(8, Math.min(window.innerHeight - 60, newY));

            fabEl.style.left = `${newX}px`;
            fabEl.style.top = `${newY}px`;
            fabEl.style.right = "auto";
            fabEl.style.bottom = "auto";

            if (e.cancelable) e.preventDefault();
        }
    }

    function onFabMouseUp() {
        if (!isFabDragging) return;

        isFabDragging = false;
        fabEl.classList.remove("dragging");

        if (fabHasMoved) {
            const rect = fabEl.getBoundingClientRect();
            settings.fabX = Math.round(rect.left);
            settings.fabY = Math.round(rect.top);
            saveSettings();
        } else {
            // Pure click without significant movement
            toggleWindow();
        }
    }

    /**
     * Wire events for dragging, resizing, and window controls
     */
    function setupEventListeners() {
        // Dragging Logic
        headerEl.addEventListener("mousedown", onDragStart);
        headerEl.addEventListener("touchstart", onDragStart, { passive: false });

        // Resizing Logic
        windowEl.querySelectorAll(".st-shapez-resize-handle").forEach(handle => {
            handle.addEventListener("mousedown", onResizeStart);
            handle.addEventListener("touchstart", onResizeStart, { passive: false });
        });

        // Global Mouse Move & Up
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", onMouseMove, { passive: false });
        window.addEventListener("touchend", onMouseUp);

        // Header Buttons
        const closeBtn = document.getElementById("st-shapez-btn-close");
        const minBtn = document.getElementById("st-shapez-btn-min");
        const maxBtn = document.getElementById("st-shapez-btn-max");
        const pinBtn = document.getElementById("st-shapez-btn-pin");
        const muteBtn = document.getElementById("st-shapez-btn-mute");
        const opacityBtn = document.getElementById("st-shapez-btn-opacity");
        const opacityMenu = document.getElementById("st-shapez-opacity-menu");

        closeBtn.addEventListener("click", closeWindow);
        minBtn.addEventListener("click", minimizeWindow);
        maxBtn.addEventListener("click", toggleMaximize);
        pinBtn.addEventListener("click", togglePin);
        muteBtn.addEventListener("click", toggleMute);

        // Opacity dropdown
        opacityBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            opacityMenu.classList.toggle("open");
        });

        opacityMenu.querySelectorAll(".st-shapez-opacity-item").forEach(item => {
            item.addEventListener("click", (e) => {
                const op = parseFloat(e.target.dataset.op);
                setOpacity(op);
                opacityMenu.querySelectorAll(".st-shapez-opacity-item").forEach(i => i.classList.remove("selected"));
                e.target.classList.add("selected");
                opacityMenu.classList.remove("open");
            });
        });

        document.addEventListener("click", () => {
            if (opacityMenu) opacityMenu.classList.remove("open");
        });

        // Window focus
        windowEl.addEventListener("mousedown", () => {
            bringToFront();
        });

        // Window resize listener to keep within viewport
        window.addEventListener("resize", () => {
            if (settings.isMaximized) {
                windowEl.style.width = "calc(100vw - 16px)";
                windowEl.style.height = "calc(100vh - 16px)";
            } else {
                const curLeft = parseInt(windowEl.style.left) || 0;
                const curTop = parseInt(windowEl.style.top) || 0;
                if (curLeft + 100 > window.innerWidth) {
                    windowEl.style.left = `${Math.max(10, window.innerWidth - windowEl.offsetWidth - 10)}px`;
                }
                if (curTop + 60 > window.innerHeight) {
                    windowEl.style.top = `${Math.max(10, window.innerHeight - windowEl.offsetHeight - 10)}px`;
                }
            }
        });
    }

    /**
     * Dragging Handlers
     */
    function onDragStart(e) {
        if (e.target.closest(".st-shapez-controls")) return;
        if (settings.isMaximized) return;

        isDragging = true;
        shieldEl.classList.add("active");
        windowEl.classList.add("st-shapez-active");
        bringToFront();

        const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

        dragStartX = clientX;
        dragStartY = clientY;
        initialX = windowEl.offsetLeft;
        initialY = windowEl.offsetTop;

        if (e.cancelable) e.preventDefault();
    }

    /**
     * Resizing Handlers
     */
    function onResizeStart(e) {
        if (settings.isMaximized) return;

        isResizing = true;
        resizeDir = e.target.dataset.dir || "se";
        shieldEl.classList.add("active");
        windowEl.classList.add("st-shapez-active");
        bringToFront();

        const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

        dragStartX = clientX;
        dragStartY = clientY;
        initialWidth = windowEl.offsetWidth;
        initialHeight = windowEl.offsetHeight;

        if (e.cancelable) e.preventDefault();
    }

    function onMouseMove(e) {
        if (!isDragging && !isResizing) return;

        const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;

        if (isDragging) {
            let newX = initialX + deltaX;
            let newY = initialY + deltaY;

            // Constrain within viewport
            newX = Math.max(0, Math.min(window.innerWidth - 100, newX));
            newY = Math.max(0, Math.min(window.innerHeight - 60, newY));

            windowEl.style.left = `${newX}px`;
            windowEl.style.top = `${newY}px`;
            settings.x = newX;
            settings.y = newY;
        } else if (isResizing) {
            if (resizeDir.includes("e")) {
                const newWidth = Math.max(380, Math.min(window.innerWidth - windowEl.offsetLeft - 10, initialWidth + deltaX));
                windowEl.style.width = `${newWidth}px`;
                settings.width = newWidth;
            }
            if (resizeDir.includes("s")) {
                const newHeight = Math.max(260, Math.min(window.innerHeight - windowEl.offsetTop - 10, initialHeight + deltaY));
                windowEl.style.height = `${newHeight}px`;
                settings.height = newHeight;
            }
        }

        if (e.cancelable) e.preventDefault();
    }

    function onMouseUp() {
        if (isDragging || isResizing) {
            isDragging = false;
            isResizing = false;
            shieldEl.classList.remove("active");
            windowEl.classList.remove("st-shapez-active");
            saveSettings();
        }
    }

    /**
     * Window Controls
     */
    function openWindow() {
        if (!frameEl.src || frameEl.src === "about:blank" || frameEl.src.endsWith("about:blank")) {
            frameEl.src = getGameUrl();
        }
        windowEl.classList.remove("st-shapez-hidden");
        settings.isOpen = true;
        settings.isMinimized = false;

        if (fabEl) {
            fabEl.classList.add("active");
            fabEl.classList.remove("minimized");
        }
        if (topbarBtnEl) topbarBtnEl.classList.add("active");

        bringToFront();
        saveSettings();
    }

    function closeWindow() {
        windowEl.classList.add("st-shapez-hidden");
        settings.isOpen = false;
        settings.isMinimized = false;

        if (fabEl) {
            fabEl.classList.remove("active");
            fabEl.classList.remove("minimized");
        }
        if (topbarBtnEl) topbarBtnEl.classList.remove("active");

        saveSettings();
    }

    function minimizeWindow() {
        windowEl.classList.add("st-shapez-hidden");
        settings.isMinimized = true;

        if (fabEl) {
            fabEl.classList.remove("active");
            fabEl.classList.add("minimized");
        }
        if (topbarBtnEl) topbarBtnEl.classList.remove("active");

        saveSettings();
    }

    function restoreWindow() {
        openWindow();
    }

    function toggleWindow() {
        if (settings.isOpen && !settings.isMinimized) {
            closeWindow();
        } else if (settings.isMinimized) {
            restoreWindow();
        } else {
            openWindow();
        }
    }

    function toggleMaximize() {
        const maxBtn = document.getElementById("st-shapez-btn-max");
        if (!settings.isMaximized) {
            preMaximizedRect = {
                x: windowEl.offsetLeft,
                y: windowEl.offsetTop,
                w: windowEl.offsetWidth,
                h: windowEl.offsetHeight
            };
            windowEl.style.left = "8px";
            windowEl.style.top = "8px";
            windowEl.style.width = "calc(100vw - 16px)";
            windowEl.style.height = "calc(100vh - 16px)";
            settings.isMaximized = true;
            if (maxBtn) {
                maxBtn.innerText = "🗗";
                maxBtn.title = "Khôi phục kích thước (Restore)";
            }
        } else {
            if (preMaximizedRect) {
                windowEl.style.left = `${preMaximizedRect.x}px`;
                windowEl.style.top = `${preMaximizedRect.y}px`;
                windowEl.style.width = `${preMaximizedRect.w}px`;
                windowEl.style.height = `${preMaximizedRect.h}px`;
            }
            settings.isMaximized = false;
            if (maxBtn) {
                maxBtn.innerText = "🗖";
                maxBtn.title = "Phóng to toàn màn hình (Maximize)";
            }
        }
        saveSettings();
    }

    function togglePin() {
        settings.isPinned = !settings.isPinned;
        const pinBtn = document.getElementById("st-shapez-btn-pin");
        if (pinBtn) pinBtn.classList.toggle("active", settings.isPinned);
        windowEl.classList.toggle("st-shapez-pinned", settings.isPinned);
        bringToFront();
        saveSettings();
    }

    function applyAudioMuteState() {
        try {
            if (frameEl && frameEl.contentWindow) {
                frameEl.contentWindow.postMessage({ type: "SHAPEZ_MUTE", muted: settings.isMuted }, "*");
                if (frameEl.contentWindow.Howler) {
                    frameEl.contentWindow.Howler.mute(settings.isMuted);
                }
                const audioElements = frameEl.contentDocument?.querySelectorAll("audio");
                if (audioElements) {
                    audioElements.forEach(a => { a.muted = settings.isMuted; });
                }
            }
        } catch (_e) {
            // Ignore cross-origin security errors if isolated
        }
    }

    function toggleMute() {
        settings.isMuted = !settings.isMuted;
        const muteBtn = document.getElementById("st-shapez-btn-mute");
        if (muteBtn) {
            muteBtn.innerText = settings.isMuted ? "🔇" : "🔊";
            muteBtn.classList.toggle("active", settings.isMuted);
        }
        applyAudioMuteState();
        saveSettings();
    }

    function setOpacity(val) {
        settings.opacity = Math.max(0.2, Math.min(1.0, val));
        windowEl.style.opacity = settings.opacity;
        saveSettings();
    }

    function bringToFront() {
        const baseZ = settings.isPinned ? 100050 : 99999;
        windowEl.style.zIndex = baseZ;
    }

    /**
     * Inject Top Bar button into SillyTavern UI (if topbar exists)
     */
    function injectTopBarButton() {
        if (document.getElementById("st-shapez-topbar-btn")) return;

        const containers = [
            document.getElementById("top-bar"),
            document.getElementById("chat-top-bar"),
            document.querySelector(".header-right"),
            document.getElementById("extensions_menu")
        ];

        const target = containers.find(el => el !== null);
        if (!target) return;

        topbarBtnEl = document.createElement("div");
        topbarBtnEl.id = "st-shapez-topbar-btn";
        topbarBtnEl.className = "st-shapez-topbar-button";
        topbarBtnEl.title = "Shapez Automation Factory (Side Game)";
        topbarBtnEl.innerHTML = `<span>🔷</span>`;
        topbarBtnEl.addEventListener("click", toggleWindow);
        target.appendChild(topbarBtnEl);
    }

    /**
     * Extension Initialization
     */
    function init() {
        console.log(`[${EXT_ID}] Initializing Shapez Extension with Floating Action Bubble...`);
        loadSettings();
        createWindowDOM();
        injectTopBarButton();

        // Restore saved state
        if (settings.isOpen) {
            if (settings.isMinimized) {
                minimizeWindow();
            } else {
                openWindow();
            }
        }

        // Listen for SillyTavern generation & lifecycle events
        try {
            if (window.eventSource && window.event_types) {
                window.eventSource.on(window.event_types.GENERATE_BEFORE_COMBINE_PROMPTS, () => {
                    if (fabEl) fabEl.classList.add("ai-active");
                });
                window.eventSource.on(window.event_types.CHARACTER_MESSAGE_RENDERED, () => {
                    if (fabEl) fabEl.classList.remove("ai-active");
                });
            }
        } catch (_e) {
            // Ignore if eventSource not ready
        }

        console.log(`[${EXT_ID}] Shapez Extension loaded successfully. jQuery available: ${Boolean($)}`);
    }

    // Support both SillyTavern jQuery and standard DOM ready
    if ($ && typeof $(document).ready === "function") {
        $(document).ready(init);
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})(typeof window !== "undefined" && typeof window.jQuery !== "undefined" ? window.jQuery : (typeof window !== "undefined" ? window.$ : null));
