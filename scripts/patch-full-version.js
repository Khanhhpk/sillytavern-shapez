/**
 * Patch Shapez bundle to unlock full game by default:
 * 1. _isLimitedVersion() returns false
 * 2. getLogoSprite() returns "logo.png" (clean full game logo)
 * 3. WEB_STEAM_SSO_AUTHENTICATED (Zi.a / o) set to true -> unlocks all 26+ levels (Ra), removes demo settings hints
 * 4. Fullscreen setting enabled (_ref11 returns true)
 * 5. Fullscreen platform support enabled (_getSupportsFullscreen returns true, _setFullscreen uses Fullscreen API)
 */

const fs = require("fs");
const path = require("path");

const bundlePath = path.resolve(__dirname, "../game/bundle.js");
let code = fs.readFileSync(bundlePath, "utf8");

let patched = false;

// 1. Limitation manager
const t1 = "function _isLimitedVersion(){return!Zi.a}";
const r1 = "function _isLimitedVersion(){return!1}";
if (code.includes(t1)) {
    code = code.replace(t1, r1);
    console.log("✔ Patched _isLimitedVersion -> return false (!1)");
    patched = true;
} else if (code.includes(r1)) {
    console.log("ℹ Already patched _isLimitedVersion");
}

// 2. Logo sprite
const t2 = 'function getLogoSprite(){return o.a?"logo.png":"logo_demo.png"}';
const r2 = 'function getLogoSprite(){return"logo.png"}';
if (code.includes(t2)) {
    code = code.replace(t2, r2);
    console.log("✔ Patched getLogoSprite -> return 'logo.png'");
    patched = true;
} else if (code.includes(r2)) {
    console.log("ℹ Already patched getLogoSprite");
}

// 3. Steam SSO Authenticated state (Zi.a) -> true
// In steam_sso module: var i=r(2),n=r(3),o=!1;
const t3 = 'r.d(t,"b",(function(){return authorizeViaSSOToken})),r(29),r(11);var i=r(2),n=r(3),o=!1;';
const r3 = 'r.d(t,"b",(function(){return authorizeViaSSOToken})),r(29),r(11);var i=r(2),n=r(3),o=!0;';
if (code.includes(t3)) {
    code = code.replace(t3, r3);
    console.log("✔ Patched WEB_STEAM_SSO_AUTHENTICATED (Zi.a) -> true (!0) [Unlocks all 26+ levels & removes demo hints]");
    patched = true;
} else if (code.includes(r3)) {
    console.log("ℹ Already patched WEB_STEAM_SSO_AUTHENTICATED");
}

// 4. Fullscreen setting enabled in settings menu
// In application_settings: function _ref10(e,t){...}function _ref11(e){return!1}
const t4 = "function _ref11(e){return!1}function _ref12(e,t){return null}";
const r4 = "function _ref11(e){return!0}function _ref12(e,t){return null}";
if (code.includes(t4)) {
    code = code.replace(t4, r4);
    console.log("✔ Patched fullscreen setting enabledCb (_ref11) -> return true (!0)");
    patched = true;
} else if (code.includes(r4)) {
    console.log("ℹ Already patched fullscreen setting enabledCb");
}

// 5. Fullscreen platform implementation
const t5 = "function _getSupportsFullscree(){return!1}function _setFullscreen(e){window.assert(!1,\"abstract method called\")}";
const r5 = "function _getSupportsFullscree(){return!0}function _setFullscreen(e){try{e?(document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()):(document.exitFullscreen&&document.exitFullscreen())}catch(_){}}";
if (code.includes(t5)) {
    code = code.replace(t5, r5);
    console.log("✔ Patched platform wrapper fullscreen support and implementation");
    patched = true;
} else if (code.includes(r5)) {
    console.log("ℹ Already patched platform wrapper fullscreen");
}

// 6. Disable Unstable Beta Version HUD banner overlay
const t6 = 'function beta_overlay_createElements(e){this.element=Object(v.z)(e,"ingame_HUD_BetaOverlay",[],"<h2>UNSTABLE BETA VERSION</h2><span>Unfinalized & potential buggy content!</span>")}';
const r6 = "function beta_overlay_createElements(e){}";
if (code.includes(t6)) {
    code = code.replace(t6, r6);
    console.log("✔ Patched HUDBetaOverlay -> removed 'UNSTABLE BETA VERSION' HUD banner");
    patched = true;
} else if (code.includes(r6)) {
    console.log("ℹ Already patched HUDBetaOverlay");
}

if (patched) {
    fs.writeFileSync(bundlePath, code, "utf8");
    console.log("✔ Successfully updated game/bundle.js with full version unlock.");
}

