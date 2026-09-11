/**
 * Patch Shapez bundle to unlock full game by default:
 * 1. _isLimitedVersion() returns false
 * 2. getLogoSprite() returns "logo.png" (clean full game logo)
 */

const fs = require("fs");
const path = require("path");

const bundlePath = path.resolve(__dirname, "../game/bundle.js");
let code = fs.readFileSync(bundlePath, "utf8");

const t1 = "function _isLimitedVersion(){return!Zi.a}";
const r1 = "function _isLimitedVersion(){return!1}";

const t2 = 'function getLogoSprite(){return o.a?"logo.png":"logo_demo.png"}';
const r2 = 'function getLogoSprite(){return"logo.png"}';

let patched = false;

if (code.includes(t1)) {
    code = code.replace(t1, r1);
    console.log("✔ Patched _isLimitedVersion -> return false (!1)");
    patched = true;
} else if (code.includes(r1)) {
    console.log("ℹ Already patched _isLimitedVersion");
} else {
    console.error("✖ Could not find _isLimitedVersion in bundle.js");
}

if (code.includes(t2)) {
    code = code.replace(t2, r2);
    console.log("✔ Patched getLogoSprite -> return 'logo.png'");
    patched = true;
} else if (code.includes(r2)) {
    console.log("ℹ Already patched getLogoSprite");
} else {
    console.error("✖ Could not find getLogoSprite in bundle.js");
}

if (patched) {
    fs.writeFileSync(bundlePath, code, "utf8");
    console.log("✔ Successfully updated game/bundle.js with full version unlock.");
}
