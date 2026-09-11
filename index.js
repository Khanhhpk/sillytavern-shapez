/**
 * Shapez Side Game Extension for SillyTavern
 * Author: Khanhhpk
 * Description: Draggable, floating window to run Shapez automation factory inside SillyTavern.
 */

(function () {
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
        gamePath: "/scripts/extensions/third-party/sillytavern-shapez/game/index.html"
    };

    let settings = Object.assign({}, defaultSettings);

    // DOM Elements
    let windowEl = null;
    let headerEl = null;
    let bodyEl = null;
    let frameEl = null;
    let shieldEl = null;
    let dockBadgeEl = null;
    let topbarBtnEl = null;

    // Window dragging & resizing state
    let isDragging = false;
    let isResizing = false;
    let resizeDir = "";
    let dragStartX = 0, dragStartY = 0;
    let initialX = 0, initialY = 0;
    let initialWidth = 0, initialHeight = 0;
    let preMaximizedRect = null;

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

    /**
     * Resolve the proper game index URL depending on SillyTavern environment
     */
    function getGameUrl() {
        // Check current script URL to discover relative path
        const currentScript = document.currentScript;
        if (currentScript && currentScript.src) {
            const baseUrl = currentScript.src.substring(0, currentScript.src.lastIndexOf("/"));
            return `${baseUrl}/game/index.html`;
        }
        return settings.gamePath;
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
                    <button class="st-shapez-btn" id="st-shapez-btn-opacity" title="Window Opacity">👁️</button>
                    <div class="st-shapez-opacity-menu" id="st-shapez-opacity-menu">
                        <div class="st-shapez-opacity-item" data-op="1.0">100% Solid</div>
                        <div class="st-shapez-opacity-item" data-op="0.85">85% Clean</div>
                        <div class="st-shapez-opacity-item" data-op="0.65">65% Ghost</div>
                        <div class="st-shapez-opacity-item" data-op="0.45">45% Faint</div>
                    </div>
                </div>
                <button class="st-shapez-btn" id="st-shapez-btn-mute" title="Toggle Sound">🔊</button>
                <button class="st-shapez-btn ${settings.isPinned ? "active" : ""}" id="st-shapez-btn-pin" title="Pin on Top">📌</button>
                <button class="st-shapez-btn" id="st-shapez-btn-min" title="Minimize to Dock">➖</button>
                <button class="st-shapez-btn" id="st-shapez-btn-max" title="Maximize">🗖</button>
                <button class="st-shapez-btn close" id="st-shapez-btn-close" title="Close Window">✕</button>
            </div>
        `;

        // Body with iframe & shield
        bodyEl = document.createElement("div");
        bodyEl.className = "st-shapez-body";

        frameEl = document.createElement("iframe");
        frameEl.id = "st-shapez-frame";
        frameEl.setAttribute("allow", "autoplay");
        frameEl.setAttribute("allowfullscreen", "true");

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

        // Minimized Dock Badge
        dockBadgeEl = document.createElement("div");
        dockBadgeEl.id = "st-shapez-dock-badge";
        dockBadgeEl.className = "st-shapez-hidden";
        dockBadgeEl.innerHTML = `
            <span class="st-shapez-dock-icon">⚙️</span>
            <span class="st-shapez-dock-label">Shapez</span>
            <span class="st-shapez-dock-pulse"></span>
        `;
        document.body.appendChild(dockBadgeEl);

        setupEventListeners();
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
                opacityMenu.classList.remove("open");
            });
        });

        document.addEventListener("click", () => {
            opacityMenu.classList.remove("open");
        });

        // Dock badge click restores window
        dockBadgeEl.addEventListener("click", restoreWindow);

        // Window focus
        windowEl.addEventListener("mousedown", () => {
            bringToFront();
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
        if (!frameEl.src || frameEl.src === "about:blank") {
            frameEl.src = getGameUrl();
        }
        windowEl.classList.remove("st-shapez-hidden");
        dockBadgeEl.classList.add("st-shapez-hidden");
        settings.isOpen = true;
        settings.isMinimized = false;
        if (topbarBtnEl) topbarBtnEl.classList.add("active");
        bringToFront();
        saveSettings();
    }

    function closeWindow() {
        windowEl.classList.add("st-shapez-hidden");
        dockBadgeEl.classList.add("st-shapez-hidden");
        settings.isOpen = false;
        settings.isMinimized = false;
        if (topbarBtnEl) topbarBtnEl.classList.remove("active");
        saveSettings();
    }

    function minimizeWindow() {
        windowEl.classList.add("st-shapez-hidden");
        dockBadgeEl.classList.remove("st-shapez-hidden");
        settings.isMinimized = true;
        saveSettings();
    }

    function restoreWindow() {
        openWindow();
    }

    function toggleWindow() {
        if (settings.isOpen && !settings.isMinimized) {
            closeWindow();
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
            if (maxBtn) maxBtn.innerText = "🗗";
        } else {
            if (preMaximizedRect) {
                windowEl.style.left = `${preMaximizedRect.x}px`;
                windowEl.style.top = `${preMaximizedRect.y}px`;
                windowEl.style.width = `${preMaximizedRect.w}px`;
                windowEl.style.height = `${preMaximizedRect.h}px`;
            }
            settings.isMaximized = false;
            if (maxBtn) maxBtn.innerText = "🗖";
        }
        saveSettings();
    }

    function togglePin() {
        settings.isPinned = !settings.isPinned;
        const pinBtn = document.getElementById("st-shapez-btn-pin");
        if (pinBtn) pinBtn.classList.toggle("active", settings.isPinned);
        bringToFront();
        saveSettings();
    }

    function toggleMute() {
        settings.isMuted = !settings.isMuted;
        const muteBtn = document.getElementById("st-shapez-btn-mute");
        if (muteBtn) {
            muteBtn.innerText = settings.isMuted ? "🔇" : "🔊";
            muteBtn.classList.toggle("active", settings.isMuted);
        }
        // Send postMessage to game iframe if supported
        try {
            if (frameEl && frameEl.contentWindow) {
                frameEl.contentWindow.postMessage({ type: "SHAPEZ_MUTE", muted: settings.isMuted }, "*");
            }
        } catch (e) {
            console.warn(`[${EXT_ID}] postMessage error:`, e);
        }
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
     * Inject Top Bar button into SillyTavern UI
     */
    function injectTopBarButton() {
        if (document.getElementById("st-shapez-topbar-btn")) return;

        // Try standard SillyTavern top bar containers
        const containers = [
            document.getElementById("top-bar"),
            document.getElementById("chat-top-bar"),
            document.querySelector(".header-right"),
            document.getElementById("extensions_menu")
        ];

        const target = containers.find(el => el !== null);

        topbarBtnEl = document.createElement("div");
        topbarBtnEl.id = "st-shapez-topbar-btn";
        topbarBtnEl.className = "st-shapez-topbar-button";
        topbarBtnEl.title = "Shapez Automation Factory (Side Game)";
        topbarBtnEl.innerHTML = `<span>🔷</span>`;
        topbarBtnEl.addEventListener("click", toggleWindow);

        if (target) {
            target.appendChild(topbarBtnEl);
        } else {
            // Fallback: append a discreet persistent launcher button on bottom left
            topbarBtnEl.style.position = "fixed";
            topbarBtnEl.style.top = "10px";
            topbarBtnEl.style.right = "80px";
            topbarBtnEl.style.zIndex = "99990";
            topbarBtnEl.style.background = "rgba(20, 22, 34, 0.85)";
            topbarBtnEl.style.borderRadius = "8px";
            topbarBtnEl.style.padding = "4px 8px";
            topbarBtnEl.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
            document.body.appendChild(topbarBtnEl);
        }
    }

    /**
     * Extension Initialization
     */
    function init() {
        console.log(`[${EXT_ID}] Initializing Shapez Extension...`);
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

        // Listen for SillyTavern generation events if available
        try {
            if (window.eventSource && window.event_types) {
                window.eventSource.on(window.event_types.GENERATE_BEFORE_COMBINE_PROMPTS, () => {
                    if (dockBadgeEl && settings.isMinimized) {
                        dockBadgeEl.style.borderColor = "#10b981";
                    }
                });
            }
        } catch (e) {
            // Ignore if eventSource not ready
        }

        console.log(`[${EXT_ID}] Shapez Extension loaded successfully.`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
